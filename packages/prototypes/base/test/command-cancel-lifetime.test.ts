import { describe, expect, it } from 'vitest';
import { createRuntimeSession } from '@proto.ui/runtime';
import type { Prototype } from '@proto.ui/core';
import {
  ANATOMY_INSTANCE_TOKEN_CAP,
  ANATOMY_PARENT_CAP,
  ANATOMY_GET_PROTO_CAP,
  ANATOMY_ROOT_TARGET_CAP,
} from '@proto.ui/module-anatomy';
import { CONTEXT_INSTANCE_TOKEN_CAP, CONTEXT_PARENT_CAP } from '@proto.ui/module-context';
import { EVENT_ROOT_TARGET_CAP, EVENT_GLOBAL_TARGET_CAP } from '@proto.ui/module-event';
import { EXPOSE_EVENT_SINK_CAP } from '@proto.ui/module-expose-event';
import { EXPOSES_RECORD_SINK_CAP } from '@proto.ui/module-expose-state';
import {
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
  AS_TRIGGER_GET_PROTO_CAP,
  AS_TRIGGER_GET_GROUP_EVENT_TARGET_CAP,
} from '@proto.ui/module-as-trigger';
import { createWebProtoEventRouter } from '../../../adapters/base/src/events/web-event-router';
import toggle from '../src/toggle';
import { accordionRoot, accordionItem, accordionTrigger } from '../src/accordion';
import { collapsibleRoot, collapsibleTrigger } from '../src/collapsible';
import { selectRoot, selectTrigger, selectItem } from '../src/select';
import { dropdownRoot, dropdownTrigger, dropdownItem } from '../src/dropdown';

// Real portable Runtime sessions, with the existing Web router used only for
// the native-source cases. Happy DOM input is not real-browser visual evidence.
function harness(nativeSource: boolean) {
  const parents = new Map<object, object | null>();
  const prototypes = new Map<object, Prototype<any, any>>();
  const globalTarget = new EventTarget();
  const actions: Array<{ key: string; payload: unknown }> = [];
  const cleanups: Array<() => Promise<void>> = [];
  function make(proto: Prototype<any, any>, parent: object | null = null, props = {}) {
    const identity = document.createElement('div');
    parents.set(identity, parent);
    prototypes.set(identity, proto);
    const router = nativeSource
      ? createWebProtoEventRouter({
          rootEl: identity,
          globalEl: globalTarget,
          isEnabled: () => true,
        })
      : null;
    const target = router?.rootTarget ?? new EventTarget();
    let exposes: any;
    const session = createRuntimeSession(proto, {
      prototypeName: proto.name,
      getRawProps: () => props,
      schedule: (fn) => fn(),
      commit: (_children, signal) => signal?.done(),
      onRuntimeReady(wiring) {
        wiring.attach('anatomy', [
          [ANATOMY_INSTANCE_TOKEN_CAP, identity],
          [ANATOMY_PARENT_CAP, (token: object) => parents.get(token) ?? null],
          [ANATOMY_GET_PROTO_CAP, (token: object) => prototypes.get(token)],
          [ANATOMY_ROOT_TARGET_CAP, (token: object) => token],
        ]);
        wiring.attach('context', [
          [CONTEXT_INSTANCE_TOKEN_CAP, identity],
          [CONTEXT_PARENT_CAP, (token: object) => parents.get(token) ?? null],
        ]);
        wiring.attach('event', [
          [EVENT_ROOT_TARGET_CAP, () => target],
          [EVENT_GLOBAL_TARGET_CAP, () => router?.globalTarget ?? globalTarget],
        ]);
        wiring.attach('as-trigger', [
          [AS_TRIGGER_INSTANCE_CAP, identity],
          [AS_TRIGGER_GET_GROUP_EVENT_TARGET_CAP, () => target],
          [AS_TRIGGER_PARENT_CAP, (token: object) => parents.get(token) ?? null],
          [AS_TRIGGER_GET_PROTO_CAP, (token: object) => prototypes.get(token)],
        ]);
        wiring.attach('expose-state', [[EXPOSES_RECORD_SINK_CAP, (next: any) => (exposes = next)]]);
        wiring.attach('expose-event', [
          [
            EXPOSE_EVENT_SINK_CAP,
            (key: string, payload: unknown) => actions.push({ key, payload }),
          ],
        ]);
      },
    });
    const part = {
      identity,
      session,
      router,
      get exposes() {
        return exposes;
      },
      emit(type: string) {
        target.dispatchEvent(new CustomEvent(type));
      },
      pointer(type: string) {
        if (nativeSource) {
          identity.dispatchEvent(
            new PointerEvent(type.replace('.', ''), {
              pointerId: 1,
              pointerType: 'mouse',
              isPrimary: true,
              button: 0,
              buttons: 1,
            })
          );
        } else target.dispatchEvent(new CustomEvent(type));
      },
      facts() {
        return { hovered: exposes.hovered.get(), pressed: exposes.pressed.get() };
      },
    };
    cleanups.push(async () => {
      await session.dispose();
      router?.dispose();
    });
    return part;
  }
  return {
    make,
    actions,
    blur() {
      globalTarget.dispatchEvent(new Event('blur'));
    },
    async dispose() {
      for (const cleanup of [...cleanups].reverse()) await cleanup();
    },
  };
}

const entries = [
  'toggle',
  'accordion',
  'collapsible',
  'select-trigger',
  'select-item',
  'dropdown-trigger',
  'dropdown-item',
] as const;
type Entry = (typeof entries)[number];

async function fixture(entry: Entry, nativeSource = false, controlled = false) {
  const h = harness(nativeSource);
  const create = async (proto: Prototype<any, any>, parent: object | null = null, props = {}) => {
    const part = h.make(proto, parent, props);
    await part.session.mount();
    return part;
  };
  try {
    if (entry === 'toggle') {
      const target = await create(
        toggle,
        null,
        controlled ? { active: true } : { defaultActive: true }
      );
      return {
        h,
        target,
        semantic: () => ({ active: target.exposes.active.get() }),
        action: 'activeChange',
      };
    }
    if (entry === 'accordion') {
      const root = await create(
        accordionRoot,
        null,
        controlled ? { openItems: ['alpha'] } : { defaultOpenItems: ['alpha'] }
      );
      const item = await create(accordionItem, root.identity, { value: 'alpha' });
      const target = await create(accordionTrigger, item.identity);
      return {
        h,
        target,
        semantic: () => ({
          openItems: root.exposes.getOpenItems(),
          expanded: target.exposes.expanded.get(),
        }),
        action: 'openChange',
      };
    }
    if (entry === 'collapsible') {
      const root = await create(
        collapsibleRoot,
        null,
        controlled ? { open: true } : { defaultOpen: true }
      );
      const target = await create(collapsibleTrigger, root.identity);
      return {
        h,
        target,
        semantic: () => ({
          open: root.exposes.open.get(),
          expanded: target.exposes.expanded.get(),
        }),
        action: 'openChange',
      };
    }
    const select = entry.startsWith('select');
    const root = await create(select ? selectRoot : dropdownRoot, null, {
      ...(controlled ? { open: true } : { defaultOpen: true }),
      ...(select ? (controlled ? { value: 'beta' } : { defaultValue: 'beta' }) : {}),
    });
    const trigger = entry.endsWith('trigger');
    const target = await create(
      select ? (trigger ? selectTrigger : selectItem) : trigger ? dropdownTrigger : dropdownItem,
      root.identity,
      trigger ? {} : { value: 'alpha', textValue: 'Alpha' }
    );
    const selected = select
      ? await create(selectItem, root.identity, { value: 'beta', textValue: 'Beta' })
      : null;
    return {
      h,
      target,
      semantic: () => ({
        open: root.exposes.open.get(),
        ...(selected
          ? { value: root.exposes.value.get(), selected: selected.exposes.selected.get() }
          : {}),
      }),
      action: trigger ? 'openChange' : 'select',
    };
  } catch (error) {
    await h.dispose();
    throw error;
  }
}

describe('Base command cancellation and retained view lifetime', () => {
  for (const controlled of [false, true]) {
    describe(controlled ? 'controlled facts' : 'uncontrolled facts', () => {
      for (const cancel of ['press.cancel', 'pointer.cancel', 'window.blur'] as const) {
        it.each(entries)(
          `%s clears transient interaction on ${cancel} without activation`,
          async (entry) => {
            const f = await fixture(entry, cancel === 'window.blur', controlled);
            try {
              for (const pressed of [true, false]) {
                f.target.pointer('pointer.enter');
                if (pressed) f.target.pointer('pointer.down');
                expect(f.target.facts()).toEqual({ hovered: true, pressed });
                const before = f.semantic();
                const actions = [...f.h.actions];
                if (cancel === 'window.blur') f.h.blur();
                else f.target.emit(cancel);
                expect(f.target.facts()).toEqual({ hovered: false, pressed: false });
                expect(f.semantic()).toEqual(before);
                expect(f.h.actions).toEqual(actions);
              }
              // Cancellation must not disable a fresh valid activation or double it.
              const count = f.h.actions.filter(({ key }) => key === f.action).length;
              f.target.pointer('pointer.down');
              f.target.emit('press.commit');
              expect(f.h.actions.filter(({ key }) => key === f.action)).toHaveLength(count + 1);
              expect(f.target.exposes.pressed.get()).toBe(false);
            } finally {
              await f.h.dispose();
            }
          }
        );
      }

      it.each(entries)(
        '%s clears an uncancelled hover/press on unmount and preserves owner facts on remount',
        async (entry) => {
          const f = await fixture(entry, false, controlled);
          try {
            for (const pressed of [true, false]) {
              f.target.pointer('pointer.enter');
              if (pressed) f.target.pointer('pointer.down');
              expect(f.target.facts()).toEqual({ hovered: true, pressed });
              const before = f.semantic();
              const handles = { ...f.target.exposes };
              const actions = [...f.h.actions];
              const epoch = f.target.session.mountEpoch;
              // No cancel/leave before unmount: that would mask missing cleanup.
              await f.target.session.unmount();
              expect(f.target.facts()).toEqual({ hovered: false, pressed: false });
              expect(f.semantic()).toEqual(before);
              f.target.emit('press.commit');
              expect(f.h.actions).toEqual(actions);
              await f.target.session.mount();
              expect(f.target.session.mountEpoch).toBe(epoch + 1);
              expect(f.target.facts()).toEqual({ hovered: false, pressed: false });
              expect(f.semantic()).toEqual(before);
              expect(f.h.actions).toEqual(actions);
              expect(f.target.exposes.hovered).toBe(handles.hovered);
              expect(f.target.exposes.pressed).toBe(handles.pressed);
              f.target.pointer('pointer.enter');
              expect(f.target.exposes.hovered.get()).toBe(true);
              f.target.pointer('pointer.leave');
              expect(f.target.facts()).toEqual({ hovered: false, pressed: false });
            }
          } finally {
            await f.h.dispose();
          }
        }
      );
    });
  }
});
