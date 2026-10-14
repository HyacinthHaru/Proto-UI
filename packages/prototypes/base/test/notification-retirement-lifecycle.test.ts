import { expect, it } from 'vitest';
import { definePrototype } from '@proto.ui/core';
import { createRuntimeSession } from '@proto.ui/runtime';
import {
  ANATOMY_INSTANCE_TOKEN_CAP,
  ANATOMY_PARENT_CAP,
  ANATOMY_GET_PROTO_CAP,
  ANATOMY_ROOT_TARGET_CAP,
} from '@proto.ui/module-anatomy';
import { CONTEXT_INSTANCE_TOKEN_CAP, CONTEXT_PARENT_CAP } from '@proto.ui/module-context';
import { EVENT_ROOT_TARGET_CAP, EVENT_GLOBAL_TARGET_CAP } from '@proto.ui/module-event';
import { EXPOSE_EVENT_SINK_CAP } from '@proto.ui/module-expose-event';
import {
  AS_TRIGGER_INSTANCE_CAP,
  AS_TRIGGER_PARENT_CAP,
  AS_TRIGGER_GET_PROTO_CAP,
} from '@proto.ui/module-as-trigger';
import { EXPOSES_RECORD_SINK_CAP } from '@proto.ui/module-expose-state';
import { fieldRoot, fieldControl, FIELD_CONTEXT } from '../src/field';
import { toggleGroupRoot, toggleGroupItem } from '../src/toggle-group';
import { TOGGLE_GROUP_CONTEXT } from '../src/toggle-group/shared';
import {
  TEXT_CONTROL_HOST_CAP,
  TEXT_CONTROL_RUN_IN_CALLBACK_CAP,
} from '@proto.ui/module-text-control';
import { numberFieldRoot } from '../src/number-field';
import { dataTableRoot, DATA_TABLE_CONTEXT } from '../src/data-table';
import { calendarRoot, CALENDAR_CONTEXT } from '../src/calendar';
import { toastRoot } from '../src/toast';
import { TOAST_CONTEXT } from '../src/toast/shared';
import { checkboxGroupRoot } from '../src/checkbox-group';
import { CHECKBOX_GROUP_FAMILY } from '../src/checkbox-group/shared';
import { carouselRoot, CAROUSEL_FAMILY } from '../src/carousel';
import { accordionRoot } from '../src/accordion';
import { ACCORDION_FAMILY } from '../src/accordion/shared';
import { contextMenuRoot } from '../src/context-menu';
import { treeRoot, TREE_FAMILY } from '../src/tree';
import { inputOtpRoot } from '../src/input-otp';
import { menubarRoot, menubarTrigger, MENUBAR_FAMILY } from '../src/menubar';
function runtimeHarness() {
  const parents = new Map<any, any>(),
    protos = new Map<any, any>();
  let actionCallback = (_name: string, _payload?: any) => {};
  const actions: string[] = [];
  function make(proto: any, parent: any = null, props: any = {}) {
    const listeners = new Map<string, Set<any>>();
    const target = {
      addEventListener(type: string, fn: any) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener(type: string, fn: any) {
        listeners.get(type)?.delete(fn);
      },
      dispatchEvent(event: Event) {
        for (const fn of [...(listeners.get(event.type) ?? [])]) fn(event);
        return true;
      },
    } as unknown as EventTarget;
    parents.set(target, parent);
    protos.set(target, proto);
    let exposes: any,
      connection: any,
      textValue = '';
    const session = createRuntimeSession(proto, {
      prototypeName: proto.name,
      getRawProps: () => props,
      schedule: (fn) => fn(),
      scheduleDelay: (ms, fn) => {
        const id = setTimeout(fn, ms);
        return { cancel: () => clearTimeout(id) };
      },
      commit: (_c, s) => s?.done(),
      onRuntimeReady(w) {
        if (proto === fieldControl)
          w.attach('text-control', [
            [
              TEXT_CONTROL_HOST_CAP,
              {
                attach(c: any) {
                  connection = c;
                  textValue = c.patch.value ?? c.patch.defaultValue ?? '';
                  return {
                    update(patch: any) {
                      if (typeof patch.value === 'string') textValue = patch.value;
                    },
                    snapshot: () => ({ value: textValue, composing: false }),
                    dispose() {},
                  };
                },
              },
            ],
            [
              TEXT_CONTROL_RUN_IN_CALLBACK_CAP,
              (fn: () => void) => session.invokeInCallbackScope(fn),
            ],
          ]);
        w.attach('anatomy', [
          [ANATOMY_INSTANCE_TOKEN_CAP, target],
          [ANATOMY_PARENT_CAP, (t: any) => parents.get(t) ?? null],
          [ANATOMY_GET_PROTO_CAP, (t: any) => protos.get(t)],
          [ANATOMY_ROOT_TARGET_CAP, (t: any) => t],
        ]);
        w.attach('context', [
          [CONTEXT_INSTANCE_TOKEN_CAP, target],
          [CONTEXT_PARENT_CAP, (t: any) => parents.get(t) ?? null],
        ]);
        w.attach('event', [
          [EVENT_ROOT_TARGET_CAP, () => target],
          [EVENT_GLOBAL_TARGET_CAP, () => target],
        ]);
        w.attach('as-trigger', [
          [AS_TRIGGER_INSTANCE_CAP, target],
          [AS_TRIGGER_PARENT_CAP, (t: any) => parents.get(t) ?? null],
          [AS_TRIGGER_GET_PROTO_CAP, (t: any) => protos.get(t)],
        ]);
        w.attach('expose-state', [
          [
            EXPOSES_RECORD_SINK_CAP,
            (x: any) => {
              exposes = x;
            },
          ],
        ]);
        w.attach('expose-event', [
          [
            EXPOSE_EVENT_SINK_CAP,
            (name: string, payload: any) => {
              actions.push(name);
              actionCallback(name, payload);
            },
          ],
        ]);
      },
    });
    return {
      session,
      target,
      input(value: string, composing = true) {
        textValue = value;
        connection.onEvent({
          type: 'input',
          value,
          composing,
          data: 'x',
          inputType: 'insertText',
        });
      },
      get exposes() {
        return exposes;
      },
    };
  }

  return {
    make,
    actions,
    setActionCallback(fn: (name: string, payload?: any) => void) {
      actionCallback = fn;
    },
  };
}

const cases = [
  {
    name: 'Number Field value request',
    proto: numberFieldRoot,
    state: 'value',
    request: (x: any) => x.requestValue(2),
    event: 'valueChange',
  },
  {
    name: 'Number Field commit',
    proto: numberFieldRoot,
    state: null,
    prepare: (x: any) => x.requestInput('2', true),
    request: (x: any) => x.commitValue(),
    event: 'valueCommit',
    callback: 'valueChange',
  },
  {
    name: 'Data Table sort',
    proto: dataTableRoot,
    context: DATA_TABLE_CONTEXT,
    request: (x: any) => x.requestSort('name'),
    event: 'sortChange',
  },
  {
    name: 'Calendar month',
    proto: calendarRoot,
    props: { defaultMonth: '2026-10' },
    state: 'month',
    request: (x: any) => x.requestMonth('2026-11'),
    event: 'monthChange',
  },
  {
    name: 'Calendar value',
    proto: calendarRoot,
    props: { defaultMonth: '2026-01', defaultValue: '2026-01-10' },
    state: 'value',
    request: (x: any) => x.requestValue('2026-02-10'),
    event: 'valueChange',
  },
  {
    name: 'Calendar value Context',
    proto: calendarRoot,
    props: { defaultMonth: '2026-01', defaultValue: '2026-01-10' },
    context: CALENDAR_CONTEXT,
    request: (x: any) => x.requestValue('2026-02-10'),
    event: 'valueChange',
  },
  {
    name: 'Calendar value month completion',
    proto: calendarRoot,
    props: { defaultMonth: '2026-01', defaultValue: '2026-01-10' },
    request: (x: any) => x.requestValue('2026-02-10'),
    event: 'valueChange',
    callback: 'monthChange',
  },
  {
    name: 'Toast open',
    proto: toastRoot,
    props: { defaultOpen: true, duration: 0 },
    state: 'open',
    request: (x: any) => x.close(),
    event: 'openChange',
  },
  {
    name: 'Checkbox Group aggregate',
    proto: checkboxGroupRoot,
    state: 'checked',
    request: (x: any) => x.requestToggle('one'),
    event: 'valueChange',
    family: CHECKBOX_GROUP_FAMILY,
    role: 'item',
    part: (def: any) => def.expose.method('__groupItem', () => ({ value: 'one', disabled: false })),
  },
  {
    name: 'Carousel index',
    proto: carouselRoot,
    state: 'index',
    request: (x: any) => x.requestIndex(1),
    event: 'indexChange',
    family: CAROUSEL_FAMILY,
    role: 'slide',
    count: 2,
  },
  {
    name: 'Accordion open count',
    proto: accordionRoot,
    state: 'openCount',
    request: (x: any) => x.requestOpen('one', true),
    event: 'openChange',
    family: ACCORDION_FAMILY,
    role: 'item',
    part: (def: any) => {
      def.expose.state('value', def.state.string('value', 'one'));
      def.expose.state('disabled', def.state.bool('disabled', false));
    },
  },
  {
    name: 'Context Menu open',
    proto: contextMenuRoot,
    state: 'open',
    request: (x: any) =>
      x.requestOpen({ open: true, reason: 'programmatic', focusReason: 'programmatic' }),
    event: 'openChange',
  },
  {
    name: 'Tree selection',
    proto: treeRoot,
    state: 'value',
    request: (x: any) => x.requestValue('one'),
    event: 'valueChange',
    family: TREE_FAMILY,
    role: 'item',
    part: (def: any) => def.expose.method('getNode', () => ({ key: 'one' })),
  },
  {
    name: 'OTP value',
    proto: inputOtpRoot,
    state: 'value',
    request: (x: any) => x.requestValue('123456'),
    event: 'valueChange',
  },
];
for (const test of cases)
  it.each(['normal', 'unmount', 'dispose', 'remount'] as const)(
    `${test.name} ends its old notification after %s`,
    async (operation) => {
      const { make, actions, setActionCallback } = runtimeHarness();
      const root = make(test.proto, null, test.props ?? {});
      const parts: any[] = [root];
      let armed = false,
        observed = 0;
      const retire = () => {
        if (!armed) return;
        observed++;
        armed = false;
        if (operation === 'normal') return;
        void root.session[operation === 'dispose' ? 'dispose' : 'unmount']();
        if (operation === 'remount') void root.session.mount();
      };
      if (test.family) {
        const part = definePrototype({
          name: 'notification-' + test.name,
          setup(def) {
            def.anatomy.claim(test.family, { role: test.role! });
            test.part?.(def);
          },
        });
        for (let i = 0; i < (test.count ?? 1); i++) parts.push(make(part, root.target));
      }
      if (test.context)
        parts.push(
          make(
            definePrototype({
              name: 'notification-observer',
              setup(def) {
                def.context.subscribe(test.context, retire);
              },
            }),
            root.target
          )
        );
      for (const part of parts) await part.session.mount();
      if (test.state)
        root.exposes[test.state].subscribe((e: any) => {
          if (e.type === 'next') retire();
        });
      if (test.callback)
        setActionCallback((name) => {
          if (name === test.callback) retire();
        });
      if (test.prepare) root.session.invokeInCallbackScope(() => test.prepare!(root.exposes));
      actions.length = 0;
      armed = true;
      try {
        expect(() =>
          root.session.invokeInCallbackScope(() => test.request(root.exposes))
        ).not.toThrow();
        expect(observed).toBe(1);
        expect(actions.filter((name) => name === test.event)).toHaveLength(
          operation === 'normal' ? 1 : 0
        );
      } finally {
        for (const part of [...parts].reverse()) await part.session.dispose();
      }
    }
  );

it.each(['normal', 'unmount', 'dispose', 'remount'] as const)(
  'Menubar Trigger stops old Content entry after %s',
  async (operation) => {
    const { make, actions, setActionCallback } = runtimeHarness();
    let focused = 0,
      retired = false;
    const contentProto = definePrototype({
      name: 'notification-menu-content',
      setup(def) {
        def.anatomy.claim(MENUBAR_FAMILY, { role: 'content' });
        def.expose.state('open', def.state.bool('open', true));
        def.expose.method('focusFirst', () => {
          focused++;
        });
      },
    });
    const root = make(menubarRoot),
      trigger = make(menubarTrigger, root.target, { value: 'file' }),
      content = make(contentProto, root.target);
    for (const part of [root, trigger, content]) await part.session.mount();
    setActionCallback((name) => {
      if (name !== 'valueChange' || operation === 'normal' || retired) return;
      retired = true;
      void trigger.session[operation === 'dispose' ? 'dispose' : 'unmount']();
      if (operation === 'remount') void trigger.session.mount();
    });
    try {
      expect(() => trigger.target.dispatchEvent(new Event('press.commit'))).not.toThrow();
      expect(actions).toEqual(['valueChange']);
      expect(retired).toBe(operation !== 'normal');
      expect(focused).toBe(operation === 'normal' ? 1 : 0);
    } finally {
      for (const part of [content, trigger, root]) await part.session.dispose();
    }
  }
);

it.each(['normal', 'unmount', 'dispose', 'remount'] as const)(
  'Field Control stops old input after %s',
  async (operation) => {
    const { make, actions } = runtimeHarness();
    const root = make(fieldRoot),
      control = make(fieldControl, root.target);
    await root.session.mount();
    await control.session.mount();
    let observed = 0;
    control.exposes.value.subscribe((e: any) => {
      if (e.type !== 'next' || observed) return;
      observed++;
      if (operation === 'normal') return;
      void control.session[operation === 'dispose' ? 'dispose' : 'unmount']();
      if (operation === 'remount') void control.session.mount();
    });
    actions.length = 0;
    try {
      expect(() => control.input('next')).not.toThrow();
      expect(observed).toBe(1);
      expect(actions).toEqual(operation === 'normal' ? ['valueChange'] : []);
      if (operation !== 'dispose')
        expect(control.exposes.composing.get()).toBe(operation === 'normal');
    } finally {
      await control.session.dispose();
      await root.session.dispose();
    }
  }
);

it.each(['normal', 'unmount', 'remount'] as const)(
  'Toast reconciles its retained open state before the next view: %s',
  async (operation) => {
    const { make, actions } = runtimeHarness();
    const root = make(toastRoot, null, { defaultOpen: true, duration: 0 });
    const reader = make(
      definePrototype({
        name: 'retained-toast-context',
        setup(def) {
          let current: any;
          def.context.subscribe(TOAST_CONTEXT);
          def.lifecycle.onCreated((run) => {
            current = run;
          });
          def.expose.method('read', () => current.context.read(TOAST_CONTEXT));
        },
      }),
      root.target
    );
    await root.session.mount();
    await reader.session.mount();
    let retired = false;
    root.exposes.open.subscribe((e: any) => {
      if (e.type !== 'next' || e.next !== false || retired || operation === 'normal') return;
      retired = true;
      void root.session.unmount();
      if (operation === 'remount') void root.session.mount();
    });
    actions.length = 0;
    try {
      root.session.invokeInCallbackScope(() => root.exposes.close());
      if (operation === 'unmount') await root.session.mount();
      expect(root.session.mountPhase).toBe('mounted');
      expect(root.exposes.open.get()).toBe(false);
      let context: any;
      reader.session.invokeInCallbackScope(() => {
        context = reader.exposes.read();
      });
      expect(context.open).toBe(false);
      expect(actions).not.toContain('beforeEnter');
    } finally {
      await reader.session.dispose();
      await root.session.dispose();
    }
  }
);

for (const test of cases.filter((test) =>
  ['Number Field value request', 'Data Table sort', 'Calendar month', 'OTP value'].includes(
    test.name
  )
))
  it.each(['normal', 'dispose'] as const)(
    `${test.name} preserves created-instance retirement: %s`,
    async (operation) => {
      const { make, actions } = runtimeHarness();
      const root = make(test.proto, null, test.props ?? {});
      let armed = false,
        observed = 0;
      const retire = () => {
        if (!armed) return;
        armed = false;
        observed++;
        if (operation === 'dispose') void root.session.dispose();
      };
      const observer = test.context
        ? make(
            definePrototype({
              name: 'created-request-observer',
              setup(def) {
                def.context.subscribe(test.context, retire);
              },
            }),
            root.target
          )
        : null;
      if (test.state)
        root.exposes[test.state].subscribe((e: any) => {
          if (e.type === 'next') retire();
        });
      armed = true;
      actions.length = 0;
      try {
        let accepted: unknown;
        expect(() => {
          accepted = root.session.invokeInCallbackScope(() => test.request(root.exposes));
        }).not.toThrow();
        expect(accepted).toBe(true);
        expect(observed).toBe(1);
        expect(actions.filter((name) => name === test.event)).toHaveLength(
          operation === 'normal' ? 1 : 0
        );
      } finally {
        if (observer) await observer.session.dispose();
        await root.session.dispose();
      }
    }
  );

for (const boundary of ['State', 'Context'] as const)
  it.each(['normal', 'dispose'] as const)(
    `Field Root stops pending publication through ${boundary} after %s`,
    async (operation) => {
      const { make, actions } = runtimeHarness();
      const root = make(fieldRoot, null, {
          externalValidation: true,
          validationMode: 'manual',
        }),
        control = make(fieldControl, root.target, { defaultValue: 'same' });
      const parts = [root, control];
      let armed = false,
        observed = 0,
        retirement: Promise<void> | undefined,
        stop: (() => void) | undefined;
      const retire = () => {
        if (!armed || observed) return;
        observed++;
        if (operation === 'dispose') retirement = root.session.dispose();
      };
      if (boundary === 'Context')
        parts.push(
          make(
            definePrototype({
              name: 'field-pending-context-observer',
              setup(def) {
                def.context.subscribe(FIELD_CONTEXT, (_run, next) => {
                  if (next.pending) retire();
                });
              },
            }),
            root.target
          )
        );
      try {
        for (const part of parts) await part.session.mount();
        if (boundary === 'State')
          stop = root.exposes.pending.subscribe((event: any) => {
            if (event.type === 'next' && event.next === true) retire();
          });
        actions.length = 0;
        armed = true;
        let request: string | null = null;
        expect(() =>
          root.session.invokeInCallbackScope(() => {
            request = root.exposes.validate();
          })
        ).not.toThrow();
        await retirement;
        expect(observed).toBe(1);
        expect(typeof request).toBe('string');
        expect(actions.filter((name) => name === 'validationRequest')).toHaveLength(
          operation === 'normal' ? 1 : 0
        );
        if (operation === 'normal') {
          expect(root.exposes.pending.get()).toBe(true);
          let accepted = false;
          root.session.invokeInCallbackScope(() => {
            accepted = root.exposes.resolveValidation(request, { invalid: false });
          });
          expect(accepted).toBe(true);
        } else {
          expect(root.session.instancePhase).toBe('disposed');
          expect(root.session.mountPhase).toBe('detached');
        }
      } finally {
        stop?.();
        await retirement;
        for (const part of [...parts].reverse()) await part.session.dispose();
      }
    }
  );

it.each(['normal', 'cancel', 'reset', 'dispose', 'newer'] as const)(
  'Field Root retires queued pending publication entered from dirty after %s',
  async (operation) => {
    const { make, actions, setActionCallback } = runtimeHarness();
    const root = make(fieldRoot, null, {
      externalValidation: true,
      validationMode: 'manual',
    });
    const control = make(fieldControl, root.target, { defaultValue: 'same' });
    let request: string | null = null,
      newer: string | null = null,
      observed = 0,
      retirement: Promise<void> | undefined;
    const stops: (() => void)[] = [];
    const emitted: string[] = [];
    setActionCallback((name, payload) => {
      if (name === 'validationRequest') emitted.push(payload.requestId);
    });
    try {
      await root.session.mount();
      await control.session.mount();
      stops.push(
        root.exposes.dirty.subscribe((event: any) => {
          if (event.type === 'next' && event.next === true && request === null)
            root.session.invokeInCallbackScope(() => {
              request = root.exposes.validate();
            });
        })
      );
      stops.push(
        root.exposes.pending.subscribe((event: any) => {
          if (event.type !== 'next' || event.next !== true || observed) return;
          observed++;
          root.session.invokeInCallbackScope(() => {
            if (operation === 'cancel') root.exposes.cancelValidation();
            else if (operation === 'reset') root.exposes.resetValidation();
            else if (operation === 'dispose') retirement = root.session.dispose();
            else if (operation === 'newer') newer = root.exposes.validate();
          });
        })
      );
      actions.length = 0;
      expect(() => control.input('changed', false)).not.toThrow();
      await retirement;
      expect(observed).toBe(1);
      expect(typeof request).toBe('string');
      expect(actions.filter((name) => name === 'validationRequest')).toHaveLength(
        operation === 'normal' || operation === 'newer' ? 1 : 0
      );
      expect(emitted).toEqual(
        operation === 'normal' ? [request] : operation === 'newer' ? [newer] : []
      );
      if (operation === 'normal' || operation === 'newer') {
        let accepted = false;
        root.session.invokeInCallbackScope(() => {
          accepted = root.exposes.resolveValidation(operation === 'newer' ? newer : request, {
            invalid: false,
          });
        });
        expect(accepted).toBe(true);
      }
    } finally {
      for (const stop of stops) stop();
      await retirement;
      await control.session.dispose();
      await root.session.dispose();
    }
  }
);

it.each(['normal', 'unmount', 'dispose', 'nested', 'remount'] as const)(
  'Toggle Group stops old Context publication after %s',
  async (operation) => {
    const { make, actions } = runtimeHarness();
    const root = make(toggleGroupRoot);
    const items = ['a', 'b'].map((value) => make(toggleGroupItem, root.target, { value }));
    let armed = false,
      observed = 0,
      nested: boolean | undefined;
    const transitions: Promise<void>[] = [];
    const phases: Array<{ mount: string; epoch: number }> = [];
    const request = (value: string) => {
      let accepted: boolean | undefined;
      root.session.invokeInCallbackScope(() => {
        accepted = root.exposes.requestToggle(value);
      });
      return accepted;
    };
    const observer = make(
      definePrototype({
        name: 'toggle-group-retirement-observer',
        setup(def) {
          def.context.subscribe(TOGGLE_GROUP_CONTEXT, (_run, next) => {
            if (!armed || observed || next.value.length !== 1 || next.value[0] !== 'a') return;
            observed++;
            if (operation === 'nested') nested = request('b');
            else if (operation === 'unmount' || operation === 'dispose')
              transitions.push(root.session[operation]());
            else if (operation === 'remount') {
              phases.push({ mount: root.session.mountPhase, epoch: root.session.mountEpoch });
              transitions.push(root.session.unmount());
              phases.push({ mount: root.session.mountPhase, epoch: root.session.mountEpoch });
              transitions.push(root.session.mount());
              phases.push({ mount: root.session.mountPhase, epoch: root.session.mountEpoch });
            }
          });
        },
      }),
      root.target
    );
    const parts = [root, ...items, observer];
    try {
      for (const part of parts) await part.session.mount();
      expect(root.exposes.getValue()).toEqual([]);
      expect(root.exposes.count.get()).toBe(2);
      const initialEpoch = root.session.mountEpoch;
      actions.length = 0;
      armed = true;
      let accepted: boolean | undefined;
      expect(() => {
        accepted = request('a');
      }).not.toThrow();
      await Promise.all(transitions);
      expect(observed).toBe(1);
      expect(accepted).toBe(true);
      const oldNotifications = actions.filter((name) => name === 'valueChange');
      if (operation === 'remount') {
        expect(phases).toEqual([
          { mount: 'mounted', epoch: initialEpoch },
          { mount: 'detached', epoch: initialEpoch },
          { mount: 'mounted', epoch: initialEpoch + 1 },
        ]);
        const beforeFresh = actions.length;
        expect(request('b')).toBe(true);
        expect(root.exposes.getValue()).toEqual(['b']);
        expect(actions.slice(beforeFresh).filter((name) => name === 'valueChange')).toHaveLength(1);
      }
      expect(oldNotifications).toHaveLength(
        operation === 'normal' ? 1 : operation === 'nested' ? 2 : 0
      );
      if (operation === 'nested') {
        expect(nested).toBe(true);
        expect(root.exposes.getValue()).toEqual(['b']);
      } else if (operation === 'normal') expect(root.exposes.getValue()).toEqual(['a']);
      else if (operation !== 'remount') {
        expect(root.session.mountPhase).toBe('detached');
        expect(root.session.instancePhase).toBe(operation === 'dispose' ? 'disposed' : 'alive');
      }
    } finally {
      await Promise.all(transitions);
      for (const part of [...parts].reverse()) await part.session.dispose();
    }
  }
);

it('Field Root retains newer validation entered during Context and pending publication', async () => {
  const { make, setActionCallback } = runtimeHarness();
  const root = make(fieldRoot, null, {
    externalValidation: true,
    validationMode: 'manual',
  });
  const control = make(fieldControl, root.target, { defaultValue: 'same' });
  let armed = false,
    contextCalls = 0,
    pendingCalls = 0,
    older: string | null = null,
    newer: string | null = null,
    stop: (() => void) | undefined;
  const emitted: string[] = [];
  setActionCallback((name, payload) => {
    if (name === 'validationRequest') emitted.push(payload.requestId);
  });
  const observer = make(
    definePrototype({
      name: 'field-context-nested-pending-observer',
      setup(def) {
        def.context.subscribe(FIELD_CONTEXT, (_run, next) => {
          if (!armed || contextCalls || !next.dirty) return;
          contextCalls++;
          root.session.invokeInCallbackScope(() => {
            older = root.exposes.validate();
          });
        });
      },
    }),
    root.target
  );
  const parts = [root, control, observer];
  try {
    for (const part of parts) await part.session.mount();
    stop = root.exposes.pending.subscribe((event: any) => {
      if (event.type !== 'next' || event.next !== true || pendingCalls) return;
      pendingCalls++;
      root.session.invokeInCallbackScope(() => {
        newer = root.exposes.validate();
      });
    });
    armed = true;
    expect(() => control.input('changed', false)).not.toThrow();
    const emittedAtReturn = [...emitted];
    const pendingBeforeResolve = root.exposes.pending.get();
    let oldAccepted = false,
      currentAccepted = false;
    root.session.invokeInCallbackScope(() => {
      oldAccepted = root.exposes.resolveValidation(older, { invalid: false });
      currentAccepted = root.exposes.resolveValidation(newer, { invalid: false });
    });
    expect(contextCalls).toBe(1);
    expect(pendingCalls).toBe(1);
    expect(typeof older).toBe('string');
    expect(typeof newer).toBe('string');
    expect(older).not.toBe(newer);
    expect(pendingBeforeResolve).toBe(true);
    expect(oldAccepted).toBe(false);
    expect(currentAccepted).toBe(true);
    expect(emittedAtReturn).toEqual([newer]);
  } finally {
    stop?.();
    for (const part of [...parts].reverse()) await part.session.dispose();
  }
});
