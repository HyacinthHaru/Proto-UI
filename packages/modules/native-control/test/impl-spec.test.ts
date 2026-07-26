import { describe, expect, it } from 'vitest';
import { CapsVault } from '@proto.ui/module-base';
import { SYS_CAP, type SystemCaps } from '@proto.ui/module-base';
import {
  NATIVE_CONTROL_HOST_CAP,
  type NativeControlHost,
  type NativeControlHostConnection,
  type NativeControlHostLease,
} from '../src/caps';
import { createNativeControlModule } from '../src/create';
import { declareNativeControl } from '../src/declaration';

type TestSystemCaps = SystemCaps & {
  phase: 'setup' | 'callback';
  flushDeferred(): void;
};

function createSystemCaps(): TestSystemCaps {
  let phase: 'setup' | 'callback' = 'setup';
  const deferred: Array<() => void> = [];
  const run = { update() {} };
  return {
    execPhase: () => phase,
    domain: () => (phase === 'setup' ? 'setup' : 'runtime'),
    protoPhase: () => 'mounted',
    instancePhase: () => 'alive',
    mountPhase: () => 'mounted',
    isDisposed: () => false,
    ensureNotDisposed() {},
    ensureExecPhase(_op, expected) {
      const values = Array.isArray(expected) ? expected : [expected];
      if (!values.includes(phase)) throw new Error('illegal phase');
    },
    ensureSetup() {
      if (phase !== 'setup') throw new Error('illegal phase');
    },
    ensureRuntime() {
      if (phase === 'setup') throw new Error('illegal phase');
    },
    ensureCallback() {
      if (phase !== 'callback') throw new Error('illegal phase');
    },
    getCallbackCtx: () => (phase === 'callback' ? run : undefined),
    deferAfterCallback: (task) => deferred.push(task),
    set phase(value: 'setup' | 'callback') {
      phase = value;
    },
    flushDeferred() {
      for (const task of deferred.splice(0)) task();
    },
  } as TestSystemCaps;
}

describe('module-native-control', () => {
  it('leases a host target, retains uncontrolled edits, and restores controlled value', () => {
    const sys = createSystemCaps();
    const vault = new CapsVault();
    const connectionBox: { current: NativeControlHostConnection | null } = { current: null };
    vault.attachBase([[SYS_CAP, sys]]);
    let patchValue = '';
    let disposed = 0;
    let updateCount = 0;
    const lease: NativeControlHostLease = {
      update(patch) {
        updateCount += 1;
        patchValue = patch.value ?? '';
      },
      snapshot: () => ({ value: patchValue, composing: false }),
      dispose() {
        disposed += 1;
      },
    };
    const host: NativeControlHost = {
      attach(next: NativeControlHostConnection) {
        connectionBox.current = next;
        patchValue = next.patch.value ?? next.patch.defaultValue ?? '';
        return lease;
      },
    };
    vault.attach([[NATIVE_CONTROL_HOST_CAP, host]]);
    const declaration = declareNativeControl({ target: { namespace: 'web', localName: 'input' } });
    const module = createNativeControlModule({
      init: { prototypeName: 'x-control', declarations: [declaration] },
      caps: vault,
      deps: {
        requireFacade: () => {
          throw new Error('unused');
        },
        requirePort: () => {
          throw new Error('unused');
        },
        tryFacade: () => undefined,
        tryPort: () => undefined,
      },
    });
    const control = module.facade.declare();
    expect(() => module.facade.declare()).toThrow(/one native control/);
    module.hooks.onMountPhase?.('mounted', 1);
    sys.phase = 'callback';
    control.sync({ valueMode: 'uncontrolled', defaultValue: 'initial' });
    expect(patchValue).toBe('initial');
    const attached = connectionBox.current;
    if (!attached) throw new Error('native control host connection was not attached');
    const inputValues: string[] = [];
    sys.phase = 'setup';
    control.on('input', (_run, event) => inputValues.push(event.value));
    sys.phase = 'callback';
    attached.onEvent({ type: 'input', value: 'dirty', composing: false });
    expect(control.snapshot()?.value).toBe('dirty');
    expect(inputValues).toEqual(['dirty']);
    control.sync({ valueMode: 'uncontrolled', defaultValue: 'replacement' });
    expect(control.snapshot()?.value).toBe('dirty');
    control.sync({ valueMode: 'controlled', value: 'fixed' });
    const controlledUpdateCount = updateCount;
    patchValue = '編';
    attached.onEvent({ type: 'compositionstart', value: 'dirty', composing: true });
    attached.onEvent({ type: 'input', value: '編', composing: true });
    expect(patchValue).toBe('編');
    expect(updateCount).toBe(controlledUpdateCount);
    attached.onEvent({ type: 'compositionend', value: '編', composing: false });
    expect(patchValue).toBe('編');
    sys.flushDeferred();
    expect(patchValue).toBe('fixed');
    expect(updateCount).toBe(controlledUpdateCount + 1);
    patchValue = 'attempt';
    attached.onEvent({ type: 'change', value: 'attempt', composing: false });
    attached.onEvent({ type: 'input', value: 'attempt', composing: false });
    expect(patchValue).toBe('attempt');
    sys.flushDeferred();
    expect(patchValue).toBe('fixed');
    module.hooks.onMountPhase?.('detached', 1);
    expect(disposed).toBeGreaterThan(0);
    module.hooks.dispose?.();
    attached.onEvent({ type: 'input', value: 'ignored', composing: false });
    expect(inputValues).not.toContain('ignored');
  });

  it('requires a static declaration and tolerates a missing host capability until mount', () => {
    const sys = createSystemCaps();
    const vault = new CapsVault();
    vault.attachBase([[SYS_CAP, sys]]);
    const withoutDeclaration = createNativeControlModule({
      init: { prototypeName: 'x-missing-declaration', declarations: [] },
      caps: vault,
      deps: {
        requireFacade: () => {
          throw new Error('unused');
        },
        requirePort: () => {
          throw new Error('unused');
        },
        tryFacade: () => undefined,
        tryPort: () => undefined,
      },
    });
    expect(() => withoutDeclaration.facade.declare()).toThrow(/static native-control declaration/);

    const declaration = declareNativeControl({ target: { namespace: 'web', localName: 'input' } });
    const withoutHost = createNativeControlModule({
      init: { prototypeName: 'x-missing-host', declarations: [declaration] },
      caps: vault,
      deps: {
        requireFacade: () => {
          throw new Error('unused');
        },
        requirePort: () => {
          throw new Error('unused');
        },
        tryFacade: () => undefined,
        tryPort: () => undefined,
      },
    });
    const control = withoutHost.facade.declare();
    withoutHost.hooks.onMountPhase?.('mounted', 1);
    sys.phase = 'callback';
    expect(() =>
      control.sync({ valueMode: 'uncontrolled', defaultValue: 'retained' })
    ).not.toThrow();
    expect(control.snapshot()?.value).toBe('retained');
  });
});
