//! Renders Proto surfaces into GPUI and turns GPUI input into routed samples.
//!
//! This is the half of the input path that knows about GPUI. It answers the
//! two questions [`crate::input::InputRouter`] needs answered for every input:
//! which surfaces physically contain the target, innermost first, and which
//! instance owns it. The router decides the rest.
//!
//! # How the hit path is collected
//!
//! Every surface registers bubble-phase mouse listeners, which GPUI calls only
//! while that surface's hitbox is hovered and in front-to-back order, so they
//! append themselves to a collector innermost first. The host registers one
//! raw listener before any surface paints: GPUI runs it first in the capture
//! phase, where it clears the collector, and last in the bubble phase, where
//! it hands the collected path to the router.
//!
//! This means a GPUI element that stops propagation hides the input from every
//! surface outside it, and from the router. That is deliberate: it is what
//! `stopPropagation` does to a Web root element's bubble-phase listeners.
//!
//! # Key input
//!
//! A key press targets the focused surface and its ancestors. When no surface
//! is focused the host keeps focus on its own root, which plays the part
//! `document.body` plays in a browser: key presses still arrive, reach every
//! global lease, and reach no root lease.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

use gpui::prelude::*;
use gpui::{
    canvas, div, AnyElement, Context, DispatchPhase, ElementId, FocusHandle, KeyDownEvent,
    KeyUpEvent, MouseButton, MouseDownEvent, MouseExitEvent, MouseMoveEvent, MouseUpEvent,
    StyleRefinement, Window,
};
use proto_ui_host_protocol::wire::SessionId;

use crate::input::{
    HostInput, InputRouter, PointerPhase, RouteOwner, Routed, SessionRoute, SurfaceId, Target,
};
use crate::key::{from_key_down, from_key_up, PortableModifiers};

/// One surface to render.
#[derive(Clone)]
pub struct SurfaceNode {
    pub id: SurfaceId,
    /// The session rendering the instance this surface belongs to. A surface
    /// that is not a session's root belongs to the instance around it.
    pub session: SessionId,
    pub style: StyleRefinement,
    pub focus: Option<FocusHandle>,
    pub children: Vec<SurfaceNode>,
}

/// Input state shared by the host view and its listeners.
#[derive(Default)]
pub struct InputBridge {
    router: InputRouter,
    /// Surfaces whose listener saw the current mouse event, innermost first.
    collected: Vec<SurfaceId>,
    owner_of: HashMap<SurfaceId, SessionId>,
    parent_of: HashMap<SurfaceId, SurfaceId>,
    focusable: Vec<(FocusHandle, SurfaceId)>,
    /// The hit path of the primary button's press, for the click that may
    /// follow its release.
    pressed_primary: Option<Vec<SurfaceId>>,
    output: Vec<Routed>,
    /// GPUI keys that reached the host without a web spelling. Reported
    /// rather than dropped: a Prototype would never have seen them, and
    /// knowing which ones arrived is how the key table grows.
    unmapped_keys: Vec<String>,
}

impl InputBridge {
    pub fn new() -> Self {
        Self::default()
    }

    /// Adds or updates the session a surface tree renders.
    pub fn upsert_session(&mut self, route: SessionRoute) {
        self.router.upsert_session(route);
    }

    pub fn remove_session(&mut self, session_id: &str) {
        self.router.remove_session(session_id);
    }

    /// Takes every sample routed since the last call, in routing order.
    pub fn drain(&mut self) -> Vec<Routed> {
        std::mem::take(&mut self.output)
    }

    /// GPUI key names that arrived with no web spelling.
    pub fn unmapped_keys(&self) -> &[String] {
        &self.unmapped_keys
    }

    fn index(&mut self, surfaces: &[SurfaceNode]) {
        self.owner_of.clear();
        self.parent_of.clear();
        self.focusable.clear();
        let mut pending: Vec<(&SurfaceNode, Option<&SurfaceId>)> =
            surfaces.iter().map(|surface| (surface, None)).collect();
        while let Some((surface, parent)) = pending.pop() {
            self.owner_of
                .insert(surface.id.clone(), surface.session.clone());
            if let Some(parent) = parent {
                self.parent_of.insert(surface.id.clone(), parent.clone());
            }
            if let Some(focus) = &surface.focus {
                self.focusable.push((focus.clone(), surface.id.clone()));
            }
            pending.extend(
                surface
                    .children
                    .iter()
                    .map(|child| (child, Some(&surface.id))),
            );
        }
    }

    fn target(&self, physical: Vec<SurfaceId>) -> Target {
        let owner = physical
            .first()
            .and_then(|innermost| self.owner_of.get(innermost))
            .map_or(RouteOwner::Unowned, |session| {
                RouteOwner::Session(session.clone())
            });
        Target { physical, owner }
    }

    fn focused_target(&self, window: &Window) -> Target {
        let Some(focused) = self
            .focusable
            .iter()
            .find(|(handle, _)| handle.is_focused(window))
            .map(|(_, surface)| surface.clone())
        else {
            return Target::nowhere();
        };
        let mut physical = vec![focused];
        while let Some(parent) = physical.last().and_then(|last| self.parent_of.get(last)) {
            physical.push(parent.clone());
        }
        self.target(physical)
    }

    fn route(&mut self, input: HostInput) {
        let routed = self.router.route(&input);
        self.output.extend(routed);
    }

    fn mouse_down(&mut self, event: &MouseDownEvent) {
        let path = std::mem::take(&mut self.collected);
        let modifiers = PortableModifiers::from(event.modifiers);
        let target = self.target(path.clone());
        self.route(HostInput::Pointer {
            phase: PointerPhase::Down,
            target: target.clone(),
            modifiers,
        });
        match event.button {
            MouseButton::Left => self.pressed_primary = Some(path),
            // macOS and Linux raise the context menu on the secondary press.
            MouseButton::Right => self.route(HostInput::ContextMenu { target, modifiers }),
            _ => {}
        }
    }

    fn mouse_up(&mut self, event: &MouseUpEvent) {
        let path = std::mem::take(&mut self.collected);
        let modifiers = PortableModifiers::from(event.modifiers);
        self.route(HostInput::Pointer {
            phase: PointerPhase::Up,
            target: self.target(path.clone()),
            modifiers,
        });
        // A click belongs to the primary button, and lands on the innermost
        // surface that contained both the press and the release: the browser
        // fires `click` on the nearest common ancestor of the two targets.
        if event.button != MouseButton::Left {
            return;
        }
        let Some(pressed) = self.pressed_primary.take() else {
            return;
        };
        let common = common_ancestors(&pressed, &path);
        if common.is_empty() {
            return;
        }
        self.route(HostInput::Click {
            target: self.target(common),
            detail: event.click_count as u32,
            modifiers,
        });
    }

    fn mouse_move(&mut self, event: &MouseMoveEvent) {
        let path = std::mem::take(&mut self.collected);
        self.route(HostInput::Pointer {
            phase: PointerPhase::Move,
            target: self.target(path),
            modifiers: PortableModifiers::from(event.modifiers),
        });
    }

    fn mouse_exit(&mut self, event: &MouseExitEvent) {
        self.collected.clear();
        self.route(HostInput::PointerExit {
            modifiers: PortableModifiers::from(event.modifiers),
        });
    }

    fn key_down(&mut self, event: &KeyDownEvent, window: &Window) {
        let Some(fields) = from_key_down(event) else {
            self.unmapped_keys.push(event.keystroke.key.clone());
            return;
        };
        let target = self.focused_target(window);
        self.route(HostInput::KeyDown { target, fields });
    }

    fn key_up(&mut self, event: &KeyUpEvent, window: &Window) {
        let Some(fields) = from_key_up(event) else {
            self.unmapped_keys.push(event.keystroke.key.clone());
            return;
        };
        let target = self.focused_target(window);
        self.route(HostInput::KeyUp { target, fields });
    }
}

/// The surfaces two innermost-first paths share, innermost first.
fn common_ancestors(a: &[SurfaceId], b: &[SurfaceId]) -> Vec<SurfaceId> {
    let mut common: Vec<SurfaceId> = a
        .iter()
        .rev()
        .zip(b.iter().rev())
        .take_while(|(x, y)| x == y)
        .map(|(x, _)| x.clone())
        .collect();
    common.reverse();
    common
}

/// A GPUI view rendering a forest of surfaces and feeding their input to an
/// [`InputBridge`].
pub struct ProtoHostView {
    bridge: Rc<RefCell<InputBridge>>,
    surfaces: Vec<SurfaceNode>,
    focus: FocusHandle,
}

impl ProtoHostView {
    pub fn new(
        bridge: Rc<RefCell<InputBridge>>,
        surfaces: Vec<SurfaceNode>,
        cx: &mut Context<Self>,
    ) -> Self {
        Self {
            bridge,
            surfaces,
            focus: cx.focus_handle(),
        }
    }

    /// The host's own focus, held while no surface is focused.
    pub fn focus_handle(&self) -> &FocusHandle {
        &self.focus
    }

    pub fn set_surfaces(&mut self, surfaces: Vec<SurfaceNode>, cx: &mut Context<Self>) {
        self.surfaces = surfaces;
        cx.notify();
    }
}

impl Render for ProtoHostView {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        self.bridge.borrow_mut().index(&self.surfaces);
        let (down, up) = (self.bridge.clone(), self.bridge.clone());
        let mouse = self.bridge.clone();

        div()
            .id("proto-host")
            .track_focus(&self.focus)
            .relative()
            .size_full()
            // Capture phase: the host sees a key before any surface handles it.
            .capture_key_down(move |event, window, _| down.borrow_mut().key_down(event, window))
            .capture_key_up(move |event, window, _| up.borrow_mut().key_up(event, window))
            // Painted before every surface, so its listeners are registered
            // first: first in the capture phase, last in the bubble phase.
            .child(
                canvas(
                    |_, _, _| {},
                    move |_, _, window, _| register_mouse_listeners(&mouse, window),
                )
                .absolute()
                .size_full(),
            )
            .children(
                self.surfaces
                    .iter()
                    .map(|surface| render_surface(surface, &self.bridge)),
            )
    }
}

fn register_mouse_listeners(bridge: &Rc<RefCell<InputBridge>>, window: &mut Window) {
    fn listen<E: gpui::MouseEvent>(
        bridge: &Rc<RefCell<InputBridge>>,
        window: &mut Window,
        finish: fn(&mut InputBridge, &E),
    ) {
        let bridge = bridge.clone();
        window.on_mouse_event(move |event: &E, phase, _, _| {
            let mut bridge = bridge.borrow_mut();
            match phase {
                DispatchPhase::Capture => bridge.collected.clear(),
                DispatchPhase::Bubble => finish(&mut bridge, event),
            }
        });
    }
    listen::<MouseDownEvent>(bridge, window, InputBridge::mouse_down);
    listen::<MouseUpEvent>(bridge, window, InputBridge::mouse_up);
    listen::<MouseMoveEvent>(bridge, window, InputBridge::mouse_move);
    listen::<MouseExitEvent>(bridge, window, InputBridge::mouse_exit);
}

fn render_surface(surface: &SurfaceNode, bridge: &Rc<RefCell<InputBridge>>) -> AnyElement {
    let collector = || {
        let bridge = bridge.clone();
        let id = surface.id.clone();
        move || bridge.borrow_mut().collected.push(id.clone())
    };
    let (on_down, on_up, on_move) = (collector(), collector(), collector());

    let mut element = div().id(ElementId::Name(surface.id.clone().into()));
    *element.style() = surface.style.clone();
    if let Some(focus) = &surface.focus {
        element = element.track_focus(focus);
    }
    // Every button, in both directions. The fluent API offers a per-button
    // release only, so these go through the imperative one.
    let interactivity = element.interactivity();
    interactivity.on_any_mouse_down(move |_, _, _| on_down());
    interactivity.on_any_mouse_up(move |_, _, _| on_up());
    interactivity.on_mouse_move(move |_, _, _| on_move());
    element
        .children(
            surface
                .children
                .iter()
                .map(|child| render_surface(child, bridge)),
        )
        .into_any_element()
}
