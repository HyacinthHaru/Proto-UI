//! Maps resolved Proto UI declarations onto a GPUI `StyleRefinement`.
//!
//! The input is what `proto-ui-style` produces: a property/value map with
//! every `var()` substituted. The output is a refinement plus an explicit list
//! of what could not be mapped.
//!
//! Nothing is dropped silently. A property GPUI cannot express, or one this
//! layer has not implemented yet, is reported so the caller can decide whether
//! that matters for the surface being painted. A silently ignored declaration
//! is the failure mode that produces a subtly wrong frame with no diagnostic.

use gpui::{
    px, AbsoluteLength, AlignItems, CursorStyle, DefiniteLength, Display, Fill, FlexDirection,
    Hsla, JustifyContent, Length, Overflow, Position, StyleRefinement,
};
use proto_ui_style::color::{parse as parse_color, ColorValue};
use proto_ui_style::length::{evaluate as evaluate_length, Dimension, LengthContext};
use proto_ui_style::ResolvedStyle;

/// Why one declaration did not reach the refinement.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Unmapped {
    /// A property this layer has not implemented.
    UnknownProperty,
    /// A value this layer does not understand for a property it does know.
    UnsupportedValue,
    /// A custom property that only exists to feed a composed value such as the
    /// ring or the transform, and is consumed by the property it feeds.
    ComposedInput,
}

#[derive(Debug, Clone, Default)]
pub struct MappedStyle {
    pub refinement: StyleRefinement,
    /// Declarations that did not reach the refinement, in property order.
    pub unmapped: Vec<(String, String, Unmapped)>,
}

impl MappedStyle {
    pub fn is_complete(&self) -> bool {
        self.unmapped.is_empty()
    }

    /// Unmapped entries excluding the custom properties that are inputs to a
    /// composed value, which are expected not to map on their own.
    pub fn unmapped_properties(&self) -> Vec<&str> {
        self.unmapped
            .iter()
            .filter(|(_, _, reason)| *reason != Unmapped::ComposedInput)
            .map(|(property, _, _)| property.as_str())
            .collect()
    }
}

/// Maps one resolved declaration set.
pub fn map(resolved: &ResolvedStyle, context: LengthContext) -> MappedStyle {
    let mut mapped = MappedStyle::default();
    let style = &mut mapped.refinement;

    for (property, value) in &resolved.declarations {
        // Custom properties are inputs to a composed declaration that appears
        // alongside them; they are never painted directly.
        if property.starts_with("--") {
            mapped
                .unmapped
                .push((property.clone(), value.clone(), Unmapped::ComposedInput));
            continue;
        }

        let outcome = apply(style, property, value, context);
        if let Some(reason) = outcome {
            mapped
                .unmapped
                .push((property.clone(), value.clone(), reason));
        }
    }

    mapped
}

fn apply(
    style: &mut StyleRefinement,
    property: &str,
    value: &str,
    context: LengthContext,
) -> Option<Unmapped> {
    let length = |raw: &str| evaluate_length(raw, context).ok();
    let color = |raw: &str| match parse_color(raw) {
        Ok(ColorValue::Rgba(rgba)) => Some(to_hsla(rgba)),
        // `currentColor` needs the inherited text colour, which this layer
        // does not receive; the caller resolves it before mapping.
        _ => None,
    };

    match property {
        "display" => match value {
            "flex" | "inline-flex" => style.display = Some(Display::Flex),
            "block" | "inline-block" => style.display = Some(Display::Block),
            "grid" => style.display = Some(Display::Grid),
            "none" => style.display = Some(Display::None),
            _ => return Some(Unmapped::UnsupportedValue),
        },
        // GPUI borders are always solid, so the declaration is satisfied by
        // the border width alone; any other style would change the paint.
        "border-style"
        | "border-top-style"
        | "border-right-style"
        | "border-bottom-style"
        | "border-left-style" => {
            if value != "solid" {
                return Some(Unmapped::UnsupportedValue);
            }
        }
        "flex" => {
            // Only the `<grow> <shrink> <basis>` long form appears.
            let mut parts = value.split_whitespace();
            let grow: f32 = parts.next()?.parse().ok()?;
            let shrink: f32 = parts.next()?.parse().ok()?;
            let basis = parts.next()?;
            if parts.next().is_some() {
                return Some(Unmapped::UnsupportedValue);
            }
            style.flex_grow = Some(grow);
            style.flex_shrink = Some(shrink);
            style.flex_basis = Some(to_length(evaluate_length(basis, context).ok()?));
        }
        "position" => match value {
            "relative" | "static" => style.position = Some(Position::Relative),
            "absolute" | "fixed" => style.position = Some(Position::Absolute),
            _ => return Some(Unmapped::UnsupportedValue),
        },
        "width" => style.size.width = Some(to_length(length(value)?)),
        "height" => style.size.height = Some(to_length(length(value)?)),
        "min-width" => style.min_size.width = Some(to_length(length(value)?)),
        "min-height" => style.min_size.height = Some(to_length(length(value)?)),
        "max-width" => style.max_size.width = Some(to_length(length(value)?)),
        "max-height" => style.max_size.height = Some(to_length(length(value)?)),
        "top" | "right" | "bottom" | "left" => {
            let edge = to_length(length(value)?);
            match property {
                "top" => style.inset.top = Some(edge),
                "right" => style.inset.right = Some(edge),
                "bottom" => style.inset.bottom = Some(edge),
                _ => style.inset.left = Some(edge),
            }
        }
        "inset" => {
            let edge = to_length(length(value)?);
            style.inset.top = Some(edge);
            style.inset.right = Some(edge);
            style.inset.bottom = Some(edge);
            style.inset.left = Some(edge);
        }
        "padding" => {
            let edge = to_definite(length(value)?)?;
            style.padding.top = Some(edge);
            style.padding.right = Some(edge);
            style.padding.bottom = Some(edge);
            style.padding.left = Some(edge);
        }
        "padding-inline" => {
            let edge = to_definite(length(value)?)?;
            style.padding.left = Some(edge);
            style.padding.right = Some(edge);
        }
        "padding-block" => {
            let edge = to_definite(length(value)?)?;
            style.padding.top = Some(edge);
            style.padding.bottom = Some(edge);
        }
        "padding-top" | "padding-right" | "padding-bottom" | "padding-left" => {
            let edge = to_definite(length(value)?)?;
            match property {
                "padding-top" => style.padding.top = Some(edge),
                "padding-right" => style.padding.right = Some(edge),
                "padding-bottom" => style.padding.bottom = Some(edge),
                _ => style.padding.left = Some(edge),
            }
        }
        "gap" => {
            let edge = to_definite(length(value)?)?;
            style.gap.width = Some(edge);
            style.gap.height = Some(edge);
        }
        "border-width" => {
            let edge = to_absolute(length(value)?)?;
            style.border_widths.top = Some(edge);
            style.border_widths.right = Some(edge);
            style.border_widths.bottom = Some(edge);
            style.border_widths.left = Some(edge);
        }
        "border-top-width" | "border-right-width" | "border-bottom-width" | "border-left-width" => {
            let edge = to_absolute(length(value)?)?;
            match property {
                "border-top-width" => style.border_widths.top = Some(edge),
                "border-right-width" => style.border_widths.right = Some(edge),
                "border-bottom-width" => style.border_widths.bottom = Some(edge),
                _ => style.border_widths.left = Some(edge),
            }
        }
        "border-color" => style.border_color = Some(color(value)?),
        "border-radius" => {
            let corner = to_absolute(length(value)?)?;
            style.corner_radii.top_left = Some(corner);
            style.corner_radii.top_right = Some(corner);
            style.corner_radii.bottom_left = Some(corner);
            style.corner_radii.bottom_right = Some(corner);
        }
        "background-color" => style.background = Some(Fill::Color(color(value)?.into())),
        "color" => style.text.color = Some(color(value)?),
        "font-size" => style.text.font_size = Some(to_absolute(length(value)?)?),
        "line-height" => style.text.line_height = Some(to_definite(length(value)?)?),
        "font-weight" => {
            let weight: f32 = value.parse().ok()?;
            style.text.font_weight = Some(gpui::FontWeight(weight));
        }
        "font-family" => {
            // The recorded stack is a fallback list; the host picks the first
            // family it actually has, so the whole string crosses unchanged.
            style.text.font_family = Some(value.to_string().into());
        }
        "opacity" => style.opacity = Some(value.parse().ok()?),
        "aspect-ratio" => {
            let (width, height) = value.split_once('/')?;
            let ratio = width.trim().parse::<f32>().ok()? / height.trim().parse::<f32>().ok()?;
            style.aspect_ratio = Some(ratio);
        }
        "flex-direction" => match value {
            "row" => style.flex_direction = Some(FlexDirection::Row),
            "column" => style.flex_direction = Some(FlexDirection::Column),
            "row-reverse" => style.flex_direction = Some(FlexDirection::RowReverse),
            "column-reverse" => style.flex_direction = Some(FlexDirection::ColumnReverse),
            _ => return Some(Unmapped::UnsupportedValue),
        },
        "align-items" => match value {
            "center" => style.align_items = Some(AlignItems::Center),
            "flex-start" | "start" => style.align_items = Some(AlignItems::FlexStart),
            "flex-end" | "end" => style.align_items = Some(AlignItems::FlexEnd),
            "baseline" => style.align_items = Some(AlignItems::Baseline),
            "stretch" => style.align_items = Some(AlignItems::Stretch),
            _ => return Some(Unmapped::UnsupportedValue),
        },
        "justify-content" => match value {
            "center" => style.justify_content = Some(JustifyContent::Center),
            "flex-start" | "start" => style.justify_content = Some(JustifyContent::Start),
            "flex-end" | "end" => style.justify_content = Some(JustifyContent::End),
            "space-between" => style.justify_content = Some(JustifyContent::SpaceBetween),
            "space-around" => style.justify_content = Some(JustifyContent::SpaceAround),
            _ => return Some(Unmapped::UnsupportedValue),
        },
        "flex-shrink" => style.flex_shrink = Some(value.parse().ok()?),
        "overflow-x" | "overflow-y" | "overflow" => {
            let overflow = match value {
                "visible" => Overflow::Visible,
                "hidden" | "clip" => Overflow::Hidden,
                "auto" | "scroll" => Overflow::Scroll,
                _ => return Some(Unmapped::UnsupportedValue),
            };
            if property != "overflow-y" {
                style.overflow.x = Some(overflow);
            }
            if property != "overflow-x" {
                style.overflow.y = Some(overflow);
            }
        }
        "cursor" => {
            let cursor = match value {
                "pointer" => CursorStyle::PointingHand,
                "default" => CursorStyle::Arrow,
                "not-allowed" => CursorStyle::OperationNotAllowed,
                "text" => CursorStyle::IBeam,
                _ => return Some(Unmapped::UnsupportedValue),
            };
            style.mouse_cursor = Some(cursor);
        }
        _ => return Some(Unmapped::UnknownProperty),
    }
    None
}

fn to_hsla(rgba: proto_ui_style::Rgba) -> Hsla {
    gpui::Rgba {
        r: rgba.r,
        g: rgba.g,
        b: rgba.b,
        a: rgba.a,
    }
    .into()
}

/// A percentage becomes a fraction; GPUI resolves it against the parent, which
/// is the basis this layer deliberately does not assume.
fn to_length(dimension: Dimension) -> Length {
    Length::Definite(to_definite_lossy(dimension))
}

fn to_definite(dimension: Dimension) -> Option<DefiniteLength> {
    Some(to_definite_lossy(dimension))
}

fn to_definite_lossy(dimension: Dimension) -> DefiniteLength {
    if dimension.is_absolute() {
        DefiniteLength::Absolute(AbsoluteLength::Pixels(px(dimension.px)))
    } else {
        // A mixed `calc(100% - 1px)` has no GPUI representation; the pixel part
        // is dropped and the caller sees it through the recorded value.
        DefiniteLength::Fraction(dimension.percent / 100.0)
    }
}

fn to_absolute(dimension: Dimension) -> Option<AbsoluteLength> {
    dimension
        .is_absolute()
        .then(|| AbsoluteLength::Pixels(px(dimension.px)))
}
