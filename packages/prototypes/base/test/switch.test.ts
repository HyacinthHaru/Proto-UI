import { afterEach, describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import type { Prototype } from '@proto.ui/core';
import type { A11ySemanticObjectSnapshot } from '@proto.ui/core';
import { definePrototype } from '@proto.ui/core';
import type { RuntimeHost } from '@proto.ui/runtime';
import { executeWithHost } from '@proto.ui/runtime';
import {
  FOCUS_REQUEST_FOCUS_CAP,
  FOCUS_ROOT_TARGET_CAP,
  FOCUS_SET_FOCUSABLE_CAP,
  type FocusPort,
} from '@proto.ui/module-focus';
import { EVENT_GLOBAL_TARGET_CAP, EVENT_ROOT_TARGET_CAP } from '@proto.ui/module-event';
import { EXPOSE_EVENT_SINK_CAP } from '@proto.ui/module-expose-event';
import {
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
} from '@proto.ui/module-as-trigger';
import { A11Y_PROJECT_CAP } from '@proto.ui/module-a11y';
import { EXPOSE_STATE_SET_EXPOSES_CAP } from '@proto.ui/module-expose-state';
import {
  ANATOMY_GET_PROTO_CAP,
  ANATOMY_INSTANCE_TOKEN_CAP,
  ANATOMY_PARENT_CAP,
  ANATOMY_ROOT_TARGET_CAP,
} from '@proto.ui/module-anatomy';
import { CONTEXT_INSTANCE_TOKEN_CAP, CONTEXT_PARENT_CAP } from '@proto.ui/module-context';
import { SWITCH_FAMILY, asSwitchRoot, switchRoot, switchThumb } from '../src/switch';

AdaptToWebComponent(switchRoot as any);
AdaptToWebComponent(switchThumb as any);

function createSwitchHost(initialRaw: Record<string, unknown> = {}) {
  let raw = { ...initialRaw };
  const rootTarget = new EventTarget();
  const globalTarget = new EventTarget();
  const emitted: Array<{ key: string; payload: unknown }> = [];
  const a11ySnapshots: A11ySemanticObjectSnapshot[] = [];
  const focusRequests: unknown[] = [];
  const focusableFlags: boolean[] = [];
  let exposes: Record<string, any> | null = null;

  const host: RuntimeHost<any> = {
    prototypeName: 'base-as-switch-root-contract',
    getRawProps: () => raw,
    commit(_children, signal) {
      signal?.done();
    },
    schedule(task) {
      task();
    },
    onRuntimeReady(wiring) {
      wiring.attach('event', [
        [EVENT_ROOT_TARGET_CAP, () => rootTarget],
        [EVENT_GLOBAL_TARGET_CAP, () => globalTarget],
      ]);
      wiring.attach('expose-event', [
        [EXPOSE_EVENT_SINK_CAP, (key: string, payload: unknown) => emitted.push({ key, payload })],
      ]);
      wiring.attach('focus', [
        [FOCUS_ROOT_TARGET_CAP, () => rootTarget],
        [
          FOCUS_SET_FOCUSABLE_CAP,
          (_target: unknown, enabled: boolean) => focusableFlags.push(enabled),
        ],
        [
          FOCUS_REQUEST_FOCUS_CAP,
          (_target: unknown, options: unknown) => focusRequests.push(options),
        ],
      ]);
      wiring.attach('as-trigger', [
        [AS_TRIGGER_INSTANCE_CAP, rootTarget],
        [AS_TRIGGER_PARENT_CAP, () => null],
        [AS_TRIGGER_GET_PROTO_CAP, () => null],
      ]);
      wiring.attach('anatomy', [
        [ANATOMY_INSTANCE_TOKEN_CAP, rootTarget],
        [ANATOMY_PARENT_CAP, () => null],
        [ANATOMY_GET_PROTO_CAP, () => null],
        [ANATOMY_ROOT_TARGET_CAP, () => rootTarget],
      ]);
      wiring.attach('context', [
        [CONTEXT_INSTANCE_TOKEN_CAP, rootTarget],
        [CONTEXT_PARENT_CAP, () => null],
      ]);
      wiring.attach('a11y', [
        [
          A11Y_PROJECT_CAP,
          (snapshot: A11ySemanticObjectSnapshot) => {
            a11ySnapshots.push(snapshot);
          },
        ],
      ]);
      wiring.attach('expose-state', [
        [EXPOSE_STATE_SET_EXPOSES_CAP, (next: Record<string, unknown>) => (exposes = next)],
      ]);
    },
  };

  return {
    host,
    rootTarget,
    globalTarget,
    emitted,
    focusRequests,
    focusableFlags,
    setRawProps(next: Record<string, unknown>) {
      raw = { ...next };
    },
    getExposes() {
      return exposes;
    },
    getA11ySnapshot() {
      return a11ySnapshots.at(-1);
    },
  };
}

describe('prototypes/base: switch', () => {
  it('declares switch anatomy and keeps root authoring entries aligned', () => {
    // T-BASE-SWITCH-0001-CASE-ANATOMY-FAMILY
    // T-BASE-SWITCH-0001-CASE-AUTHORING-ENTRIES
    expect(SWITCH_FAMILY.debugName).toBe('base-switch');
    expect(SWITCH_FAMILY.decl.roles.root.cardinality).toEqual({ min: 1, max: 1 });
    expect(SWITCH_FAMILY.decl.roles.thumb.cardinality).toEqual({ min: 0, max: '*' });
    expect(SWITCH_FAMILY.decl.relations).toEqual([
      { kind: 'contains', parent: 'root', child: 'thumb' },
    ]);

    const AsHookRoot: Prototype<{
      checked?: boolean;
      defaultChecked?: boolean;
      disabled?: boolean;
    }> = definePrototype({
      name: 'x-base-as-switch-root-authoring-entry',
      setup() {
        asSwitchRoot();
        return (r) => r.el('button', 'switch');
      },
    });

    const asHookCtx = createSwitchHost({ defaultChecked: false, disabled: false });
    const directCtx = createSwitchHost({ defaultChecked: false, disabled: false });

    executeWithHost(AsHookRoot as any, asHookCtx.host as any);
    executeWithHost(switchRoot as any, directCtx.host as any);

    const asHookExposes = asHookCtx.getExposes() as any;
    const directExposes = directCtx.getExposes() as any;

    expect(Object.keys(directExposes).sort()).toEqual(Object.keys(asHookExposes).sort());
    expect(asHookExposes.click).toBeUndefined();
    expect(directExposes.click).toBeUndefined();
    expect(asHookCtx.getA11ySnapshot()).toMatchObject({
      role: 'switch',
      name: { kind: 'content' },
      states: { checked: false, disabled: false },
      actions: { activate: { event: 'checkedChange' } },
    });
  });

  it('switch-root owns checked state and emits checkedChange', async () => {
    // T-BASE-SWITCH-0001-CASE-UNCONTROLLED-CHECKED-CHANGE
    // T-BASE-SWITCH-0001-CASE-A11Y-AND-DEFERRED-SURFACES
    const root = document.createElement('base-switch-root') as any;
    const checkedChanges: Array<{ checked: boolean }> = [];
    root.addEventListener('checkedChange', (event: Event) => {
      checkedChanges.push((event as CustomEvent).detail);
    });
    document.body.appendChild(root);

    await Promise.resolve();
    await Promise.resolve();

    const exposes = root.getExposes() as any;
    expect(exposes.checked.get()).toBe(false);
    expect(exposes.click).toBeUndefined();
    expect(root.getAttribute('role')).toBe('switch');
    expect(root.getAttribute('aria-checked')).toBe('false');

    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(exposes.checked.get()).toBe(true);
    expect(checkedChanges).toEqual([{ checked: true }]);
    expect(root.getAttribute('aria-checked')).toBe('true');
    root.remove();
    await Promise.resolve();
  });

  it('controlled switch-root emits next checked without mutating checked', async () => {
    // T-BASE-SWITCH-0001-CASE-CONTROLLED-CHECKED
    const root = document.createElement('base-switch-root') as any;
    const checkedChanges: Array<{ checked: boolean }> = [];
    root.addEventListener('checkedChange', (event: Event) => {
      checkedChanges.push((event as CustomEvent).detail);
    });
    setElementProps(root, { checked: true });
    document.body.appendChild(root);

    await Promise.resolve();
    await Promise.resolve();

    const exposes = root.getExposes() as any;
    expect(exposes.checked.get()).toBe(true);

    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(exposes.checked.get()).toBe(true);
    expect(checkedChanges).toEqual([{ checked: false }]);

    setElementProps(root, { checked: false });
    await Promise.resolve();

    expect(exposes.checked.get()).toBe(false);
    expect(root.getAttribute('aria-checked')).toBe('false');

    root.remove();
    await Promise.resolve();
  });

  it('switch-thumb consumes switch context for repeatable indicator state', async () => {
    // T-BASE-SWITCH-0001-CASE-CONTEXT
    // T-BASE-SWITCH-THUMB-0001-CASE-INDICATOR-ROLE
    // T-BASE-SWITCH-THUMB-0001-CASE-CONTEXT-CONSUMPTION
    // T-BASE-SWITCH-THUMB-0001-CASE-NO-INTERACTION-SURFACES
    // T-BASE-SWITCH-THUMB-0001-CASE-AUTHORING-PRESENTATION-AND-DEFERRED-SURFACES
    const root = document.createElement('base-switch-root') as any;
    const firstThumb = document.createElement('base-switch-thumb') as any;
    const secondThumb = document.createElement('base-switch-thumb') as any;
    root.append(firstThumb, secondThumb);
    document.body.appendChild(root);

    await Promise.resolve();
    await Promise.resolve();

    const firstThumbExposes = firstThumb.getExposes();
    const secondThumbExposes = secondThumb.getExposes();

    expect(firstThumbExposes.isChecked()).toBe(false);
    expect(secondThumbExposes.isChecked()).toBe(false);
    expect(firstThumbExposes.checked.get()).toBe(false);
    expect((firstThumbExposes as any).disabled).toBeUndefined();
    expect(firstThumbExposes.checkedChange).toBeUndefined();
    expect(firstThumbExposes.focusSelf).toBeUndefined();
    expect(firstThumb.getAttribute('role')).toBeNull();

    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstThumbExposes.isChecked()).toBe(true);
    expect(secondThumbExposes.isChecked()).toBe(true);
    expect(firstThumbExposes.checked.get()).toBe(true);

    root.remove();
    await Promise.resolve();
  });

  it('disabled switch-root suppresses checked changes', async () => {
    // T-BASE-SWITCH-0001-CASE-DISABLED-GATING
    const root = document.createElement('base-switch-root') as any;
    const checkedChanges: Array<{ checked: boolean }> = [];
    root.addEventListener('checkedChange', (event: Event) => {
      checkedChanges.push((event as CustomEvent).detail);
    });
    setElementProps(root, { disabled: true });
    document.body.appendChild(root);

    await Promise.resolve();
    await Promise.resolve();

    const exposes = root.getExposes() as any;
    root.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(exposes.checked.get()).toBe(false);
    expect(checkedChanges).toEqual([]);
    root.remove();
    await Promise.resolve();
  });

  it('switch-root exposes focus and keyboard behavior through the root target', () => {
    // T-BASE-SWITCH-0001-CASE-INTERACTION-FOCUS-KEYBOARD
    const AsHookRoot: Prototype<{
      checked?: boolean;
      defaultChecked?: boolean;
      disabled?: boolean;
    }> = definePrototype({
      name: 'x-base-as-switch-root-focus-keyboard',
      setup() {
        asSwitchRoot();
        return (r) => r.el('button', 'switch');
      },
    });

    const ctx = createSwitchHost({ defaultChecked: false, disabled: false });
    const { controller, caps } = executeWithHost(AsHookRoot as any, ctx.host as any);
    const focusPort = caps.getPort<FocusPort>('focus');
    const exposes = ctx.getExposes() as any;

    ctx.rootTarget.dispatchEvent(new CustomEvent('pointer.enter'));
    expect(exposes.hovered.get()).toBe(true);

    ctx.globalTarget.dispatchEvent(new CustomEvent('key.down'));
    ctx.rootTarget.dispatchEvent(new CustomEvent('host:focus'));
    expect(exposes.focused.get()).toBe(true);
    expect(exposes.focusVisible.get()).toBe(true);
    expect(focusPort?.getFacts()).toMatchObject({
      focused: true,
      focusVisible: true,
      focusable: true,
    });

    ctx.rootTarget.dispatchEvent(new CustomEvent('pointer.down'));
    expect(exposes.pressed.get()).toBe(true);
    expect(exposes.focusVisible.get()).toBe(false);

    let prevented = false;
    ctx.globalTarget.dispatchEvent(
      new CustomEvent('key.down', {
        detail: {
          key: ' ',
          target: ctx.rootTarget,
          preventDefault: () => {
            prevented = true;
          },
        },
      })
    );
    expect(prevented).toBe(true);

    exposes.focusSelf({ reason: 'programmatic' });
    expect(ctx.focusRequests).toHaveLength(1);

    controller.applyRawProps({ disabled: true, defaultChecked: false } as any);
    expect(exposes.hovered.get()).toBe(false);
    expect(exposes.focused.get()).toBe(false);
    expect(exposes.focusVisible.get()).toBe(false);
    expect(exposes.pressed.get()).toBe(false);
    expect(focusPort?.getFocusableConfig().disabled).toBe(true);

    exposes.focusSelf({ reason: 'programmatic' });
    expect(ctx.focusRequests).toHaveLength(1);
  });
});

// T-AXIS-INPUT-DIRECTIONAL-0001-CASE-PREVIEW / CLICK / LIFETIME
// Actual WC runtime + synthetic host geometry/input; not native layout evidence.
describe('base Switch draft directional preview', () => {
  afterEach(async () => {
    document.body.replaceChildren();
    await Promise.resolve();
  });
  async function fixture(props: Record<string, unknown> = {}, thumbCount = 1) {
    const root = document.createElement('base-switch-root') as HTMLElement & { getExposes(): any };
    root.style.cssText = 'box-sizing:border-box;width:32px;height:20px;border:1px solid;padding:0';
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 32, height: 20 }) as DOMRect;
    const thumbs = Array.from({ length: thumbCount }, () => {
      const thumb = document.createElement('base-switch-thumb') as HTMLElement & {
        getExposes(): any;
      };
      thumb.style.cssText = 'width:16px;height:16px';
      thumb.getBoundingClientRect = () => ({ left: 1, top: 2, width: 16, height: 16 }) as DOMRect;
      root.append(thumb);
      return thumb;
    });
    setElementProps(root, { draggable: true, ...props });
    const changes: boolean[] = [];
    const progressAtRequest: number[] = [];
    root.addEventListener('checkedChange', (event) => {
      changes.push((event as CustomEvent).detail.checked);
      progressAtRequest.push(root.getExposes().percentage.get());
    });
    document.body.append(root);
    await Promise.resolve();
    await Promise.resolve();
    const send = (type: string, x = 9, y = 10, to: EventTarget = root, detail = 1) => {
      const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 31,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
        detail,
      });
      to.dispatchEvent(event);
      return event;
    };
    return { root, thumbs, changes, progressAtRequest, send, ex: root.getExposes() };
  }
  it('follows normalized Root progress, keeps Thumb eventless and requests only the released endpoint', async () => {
    const f = await fixture();
    f.send('pointerdown', 9, 10, f.thumbs[0]);
    f.send('pointermove', 16);
    expect(f.ex.dragging.get()).toBe(true);
    expect(f.ex.percentage.get()).toBe(50);
    expect(f.ex.checked.get()).toBe(false);
    expect(f.root.getAttribute('aria-checked')).toBe('false');
    expect(f.thumbs[0].getExposes().percentage.get()).toBe(50);
    expect(f.thumbs[0].getExposes().checked.get()).toBe(false);
    expect(f.thumbs[0].getExposes().focusSelf).toBeUndefined();
    expect(f.changes).toEqual([]);
    f.send('pointerleave', 16);
    expect(f.ex.pressed.get()).toBe(true);
    f.send('pointerup', 16);
    f.send('click', 16);
    expect(f.changes).toEqual([true]);
    expect(f.ex.checked.get()).toBe(true);
    expect(f.ex.percentage.get()).toBe(100);
    expect(f.ex.dragging.get()).toBe(false);
  });
  it.each([2, 15])(
    'preserves the grab anchor at x=%s rather than jumping to sample position',
    async (start) => {
      const f = await fixture();
      f.send('pointerdown', start);
      f.send('pointermove', start + 7);
      expect(f.ex.percentage.get()).toBe(50);
      f.send('pointerup', start + 7);
      f.send('click', start + 7);
      expect(f.changes).toEqual([true]);
    }
  );
  it('rolls controlled preview back before emitting a refused request', async () => {
    const f = await fixture({ checked: false });
    f.send('pointerdown');
    f.send('pointermove', 23);
    expect(f.ex.percentage.get()).toBe(100);
    expect(f.ex.checked.get()).toBe(false);
    f.send('pointerup', 23);
    f.send('click', 23);
    expect(f.changes).toEqual([true]);
    expect(f.progressAtRequest).toEqual([0]);
    expect(f.ex.percentage.get()).toBe(0);
    expect(f.ex.checked.get()).toBe(false);
  });
  it('makes no request when the released endpoint matches persistent truth', async () => {
    const f = await fixture();
    f.send('pointerdown');
    f.send('pointermove', 14);
    f.send('pointerup', 14);
    f.send('click', 14);
    expect(f.changes).toEqual([]);
    expect(f.ex.percentage.get()).toBe(0);
  });
  it('uses host-normalized RTL once and leaves keyboard activation on Root', async () => {
    const f = await fixture({ direction: 'rtl' });
    f.send('pointerdown', 23);
    f.send('pointermove', 16);
    f.send('pointerup', 16);
    f.send('click', 16);
    expect(f.changes).toEqual([true]);
    f.root.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(f.changes).toEqual([true, false]);
  });
  it.each(['disabled', 'direction', 'draggable', 'checked'])(
    'cancels preview on changed %s without a stale release request',
    async (key) => {
      const f = await fixture({ checked: false });
      f.send('pointerdown');
      f.send('pointermove', 16);
      expect(f.ex.percentage.get()).toBe(50);
      const patch =
        key === 'disabled'
          ? { disabled: true }
          : key === 'direction'
            ? { direction: 'rtl' }
            : key === 'draggable'
              ? { draggable: false }
              : { checked: true };
      setElementProps(f.root, { draggable: true, checked: false, ...patch });
      await Promise.resolve();
      expect(f.ex.dragging.get()).toBe(false);
      expect(f.ex.percentage.get()).toBe(key === 'checked' ? 100 : 0);
      f.send('pointerup', 23);
      f.send('click', 23);
      expect(f.changes).toEqual([]);
    }
  );
  it.each([0, 2])(
    'keeps ordinary tap available when travel geometry has %s thumbs',
    async (count) => {
      const f = await fixture({}, count);
      f.send('pointerdown');
      f.send('pointermove', 23);
      f.send('pointerup', 23);
      expect(f.ex.dragging.get()).toBe(false);
      expect(f.ex.percentage.get()).toBe(0);
      f.send('click', 23);
      expect(f.changes).toEqual([true]);
    }
  );
  it('keeps opt-out immediate tap semantics and ignores movement as an enhancement', async () => {
    const f = await fixture({ draggable: false });
    f.send('pointerdown');
    f.send('pointermove', 23);
    f.send('pointerup', 23);
    f.send('click', 23);
    expect(f.changes).toEqual([true]);
    expect(f.ex.dragging.get()).toBe(false);
  });
  it('does not restore pressed when a dragging observer disables synchronously', async () => {
    const f = await fixture({ checked: false });
    const off = f.ex.dragging.subscribe((event: any) => {
      if (event.type === 'next' && event.next === true)
        setElementProps(f.root, { checked: false, draggable: true, disabled: true });
    });
    f.send('pointerdown');
    f.send('pointermove', 16);
    await Promise.resolve();
    expect(f.ex.disabled.get()).toBe(true);
    expect(f.ex.dragging.get()).toBe(false);
    expect(f.ex.pressed.get()).toBe(false);
    expect(f.ex.percentage.get()).toBe(0);
    expect(f.changes).toEqual([]);
    off();
  });

  it.each(['draggable', 'direction', 'checked'])(
    'does not continue start after a dragging observer changes %s synchronously',
    async (key) => {
      const f = await fixture({ checked: false });
      const off = f.ex.dragging.subscribe((event: any) => {
        if (event.type !== 'next' || event.next !== true) return;
        const patch =
          key === 'draggable'
            ? { draggable: false }
            : key === 'direction'
              ? { direction: 'rtl' }
              : { checked: true };
        setElementProps(f.root, { checked: false, draggable: true, ...patch });
      });
      f.send('pointerdown');
      f.send('pointermove', 16);
      f.send('pointerup', 23);
      f.send('click', 23);
      expect(f.ex.dragging.get()).toBe(false);
      expect(f.ex.pressed.get()).toBe(false);
      expect(f.ex.percentage.get()).toBe(key === 'checked' ? 100 : 0);
      expect(f.changes).toEqual([]);
      off();
    }
  );
  it.each(['pointerup', 'pointercancel'])(
    'leaves an accepted drag intact after another contact sends %s',
    async (type) => {
      const f = await fixture({ checked: false });
      f.send('pointerdown');
      f.send('pointermove', 16);
      f.root.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 99,
          pointerType: 'touch',
          isPrimary: false,
          button: 0,
          clientX: 16,
          clientY: 10,
        })
      );
      expect(f.ex.dragging.get()).toBe(true);
      expect(f.ex.pressed.get()).toBe(true);
      expect(f.ex.percentage.get()).toBe(50);
      f.send('pointerup', 23);
      f.send('click', 23);
      expect(f.changes).toEqual([true]);
    }
  );
  it('does not let an old release clear a new session started by a dragging observer', async () => {
    const f = await fixture({ checked: false });
    const touch = (type: string, x = 9) =>
      f.root.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId: 32,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: 10,
          detail: 1,
        })
      );
    f.send('pointerdown');
    f.send('pointermove', 16);
    let replaced = false;
    const off = f.ex.dragging.subscribe((event: any) => {
      if (replaced || event.type !== 'next' || event.next !== false) return;
      replaced = true;
      touch('pointerdown');
      touch('pointermove', 16);
    });
    f.send('pointerup', 23);
    f.send('click', 23);
    expect(f.ex.dragging.get()).toBe(true);
    expect(f.ex.pressed.get()).toBe(true);
    expect(f.ex.percentage.get()).toBe(50);
    expect(f.changes).toEqual([]);
    touch('pointerup', 23);
    touch('click', 23);
    expect(f.changes).toEqual([true]);
    off();
  });
});
