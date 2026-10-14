import { afterEach, describe, expect, it } from 'vitest';
import {
  createAnatomyFamily,
  type AnatomyFamily,
  type AnatomyPartView,
  type MaterialContactLink,
} from '@proto.ui/core';
import { CapsVault, SYS_CAP, type SystemCaps } from '@proto.ui/module-base';
import type { AnatomyPort } from '@proto.ui/module-anatomy';
import { createMaterialContactModule } from '../src/create';
import {
  MATERIAL_CONTACT_HOST_CAP,
  type MaterialContactHost,
  type MaterialContactHostBinding,
  type MaterialContactView,
  type MaterialInputContact,
  type MaterialInputReadLease,
  type MaterialInputRegistration,
} from '../src/caps';

const cleanup: (() => void)[] = [];
afterEach(() => {
  for (const dispose of cleanup.splice(0)) dispose();
});
const family = () =>
  createAnatomyFamily('contact-fixture', {
    roles: {
      root: { cardinality: { min: 1, max: 1 } },
      track: { cardinality: { min: 0, max: 1 } },
      thumb: { cardinality: { min: 0, max: '*' } },
    },
  });
const slot = {
  version: 2 as const,
  shape: { kind: 'rounded-rect' as const, geometry: 'style' as const },
  source: { kind: 'in-app-backdrop' as const },
  fallback: { fill: 'style' as const, foreground: 'style' as const },
};
type Member = {
  instance: object;
  part: AnatomyPartView;
  family: AnatomyFamily;
  role: string;
  module: ReturnType<typeof createMaterialContactModule>;
  vault: CapsVault;
  watchers: Set<() => void>;
  alive(): boolean;
  domain(): object;
  setDomain(next: object): void;
  setMaterial(next: boolean): void;
  mount(epoch?: number): void;
  detach(epoch?: number): void;
  dispose(): void;
};

function world() {
  const doc = {},
    domain = {},
    f = family();
  const views = new Map<object, MaterialContactView>(),
    inputs = new Map<object, ReturnType<typeof source>>();
  const hostListeners = new Set<() => void>();
  const records: Array<{
    binding: MaterialContactHostBinding;
    samples: MaterialInputContact[];
    cleared: number;
    disposed: number;
  }> = [];
  let attachHook: ((binding: MaterialContactHostBinding) => void) | null = null;
  let disposeHook: (() => void) | null = null;
  let clearHook: (() => void) | null = null;
  const host: MaterialContactHost = {
    readView: (instance) => views.get(instance) ?? null,
    readInput: (instance) => inputs.get(instance)?.lease ?? null,
    isCurrentInput: (lease) => [...inputs.values()].some((input) => input.lease === lease),
    subscribe: (callback) => {
      hostListeners.add(callback);
      return () => {
        hostListeners.delete(callback);
      };
    },
    attach(binding) {
      const record = { binding, samples: [] as MaterialInputContact[], cleared: 0, disposed: 0 };
      records.push(record);
      attachHook?.(binding);
      return {
        contact: (sample) => {
          record.samples.push(sample);
        },
        clear: () => {
          record.cleared++;
          clearHook?.();
        },
        dispose: () => {
          record.disposed++;
          disposeHook?.();
        },
      };
    },
  };
  function source(instance: object) {
    const view = views.get(instance)!;
    const registration: MaterialInputRegistration = Object.freeze({
      instance,
      target: view.target,
      document: view.document,
      viewIdentity: view.identity,
      viewEpoch: view.epoch,
      owner: {},
      ownerEpoch: 1,
    });
    let value: MaterialInputContact | null = null,
      revision = 0,
      session: object = {};
    const listeners = new Set<() => void>(),
      coordinateSpace = {};
    let subscribeHook: (() => void) | null = null;
    const lease: MaterialInputReadLease = {
      registration,
      current: () => value,
      subscribe(callback) {
        listeners.add(callback);
        subscribeHook?.();
        return () => {
          listeners.delete(callback);
        };
      },
    };
    const emit = (phase: MaterialInputContact['phase'], patch: Record<string, unknown> = {}) => {
      if (phase === 'pending') session = {};
      value = {
        owner: registration.owner,
        ownerEpoch: registration.ownerEpoch,
        document: registration.document,
        session,
        revision: ++revision,
        phase,
        ...(phase === 'cancelled'
          ? { reason: 'host-cancel' }
          : { coordinateSpace, down: { x: 10, y: 10 }, current: { x: 20, y: 10 } }),
        ...patch,
      } as MaterialInputContact;
      for (const fn of [...listeners]) fn();
      return value;
    };
    return {
      lease,
      listeners,
      emit,
      setValue: (next: MaterialInputContact | null) => {
        value = next;
      },
      notify: () => {
        for (const fn of [...listeners]) fn();
      },
      onSubscribe: (fn: (() => void) | null) => {
        subscribeHook = fn;
      },
    };
  }
  const members: Member[] = [];
  function member(
    role: string,
    options: {
      family?: AnatomyFamily;
      domain?: object;
      document?: object;
      withHost?: boolean;
      material?: boolean;
    } = {}
  ): Member {
    const instance = {},
      part = { role } as AnatomyPartView,
      currentFamily = options.family ?? f;
    let currentDomain = options.domain ?? domain,
      setup = true,
      alive = true,
      material = options.material ?? true;
    const watchers = new Set<() => void>();
    const view: MaterialContactView = {
      instance,
      target: {},
      document: options.document ?? doc,
      identity: {},
      epoch: 1,
      connected: true,
    };
    views.set(instance, view);
    const anatomy = {
      resolveSelfInstance: () => instance,
      resolveSelfRole: (query: AnatomyFamily) => (query === currentFamily && alive ? role : null),
      resolveDomainScope: (query: AnatomyFamily) =>
        query === currentFamily && alive ? currentDomain : null,
      isCurrentPart: (query: AnatomyFamily, candidate: AnatomyPartView) =>
        members.some(
          (m) =>
            m.family === query && m.alive() && m.part === candidate && m.domain() === currentDomain
        ),
      resolvePartInstance: (candidate: AnatomyPartView) =>
        members.find((m) => m.part === candidate)?.instance ?? null,
      resolvePartTarget: (candidate: AnatomyPartView) => {
        const found = members.find((m) => m.part === candidate);
        return found ? (views.get(found.instance)?.target ?? null) : null;
      },
      order: {
        partsOf: (query: AnatomyFamily, wanted: string) =>
          members
            .filter(
              (m) =>
                m.family === query && m.role === wanted && m.domain() === currentDomain && m.alive()
            )
            .map((m) => m.part),
      },
      subscribeOrder: (_f: unknown, callback: () => void) => {
        watchers.add(callback);
        return () => {
          watchers.delete(callback);
        };
      },
      subscribeTargets: (_f: unknown, callback: () => void) => {
        watchers.add(callback);
        return () => {
          watchers.delete(callback);
        };
      },
    } as unknown as AnatomyPort;
    const vault = new CapsVault();
    vault.attachBase([
      [
        SYS_CAP,
        {
          ensureSetup() {
            if (!setup) throw Error('setup only');
          },
          isDisposed: () => !alive,
        } as unknown as SystemCaps,
      ],
    ]);
    if (options.withHost !== false) vault.attach([[MATERIAL_CONTACT_HOST_CAP, host]]);
    const module = createMaterialContactModule({
      init: { prototypeName: 'contact-fixture', declarations: [] },
      caps: vault,
      deps: {
        requirePort: () => anatomy as never,
        tryPort: () =>
          ({
            exportMaterialFrame: () => ({ slot: material ? slot : null, candidates: [] }),
          }) as never,
        requireFacade: () => {
          throw Error('unused');
        },
        tryFacade: () => undefined,
      },
    });
    const item = {
      instance,
      part,
      family: currentFamily,
      role,
      module,
      vault,
      watchers,
      alive: () => alive,
      domain: () => currentDomain,
      setDomain: (next: object) => {
        currentDomain = next;
      },
      setMaterial: (next: boolean) => {
        material = next;
      },
      mount: (epoch = views.get(instance)!.epoch) => {
        setup = false;
        module.hooks.onMountPhase?.('mounted', epoch);
      },
      detach: (epoch = views.get(instance)!.epoch + 1) => {
        module.hooks.onMountPhase?.('detached', epoch);
      },
      dispose: () => {
        if (!alive) return;
        alive = false;
        module.hooks.dispose?.();
      },
    };
    members.push(item);
    return item;
  }
  const notifyHost = () => {
    for (const fn of [...hostListeners]) fn();
  };
  const topology = () => {
    for (const m of members) for (const fn of [...m.watchers]) fn();
  };
  const addInput = (m: ReturnType<typeof member>) => {
    const s = source(m.instance);
    inputs.set(m.instance, s);
    return s;
  };
  const link = (ownerRole = 'root', key = 'thumb', targetFamily = f): MaterialContactLink => ({
    family: targetFamily,
    key,
    ownerRole,
    paintRole: 'thumb',
  });
  const pair = (ownerRole = 'root') => {
    const owner = member(ownerRole),
      paint = member('thumb'),
      l = link(ownerRole);
    owner.module.facade.offer(l);
    paint.module.facade.receive({ source: 'part', link: l, placement: 'style-owned-translation' });
    const input = addInput(owner);
    owner.mount();
    paint.mount();
    return { owner, paint, input };
  };
  cleanup.push(() => {
    attachHook = disposeHook = clearHook = null;
    for (const m of members) m.dispose();
  });
  return {
    doc,
    domain,
    f,
    host,
    views,
    inputs,
    records,
    hostListeners,
    member,
    pair,
    addInput,
    link,
    topology,
    notifyHost,
    onAttach: (fn: typeof attachHook) => {
      attachHook = fn;
    },
    onClear: (fn: typeof clearHook) => {
      clearHook = fn;
    },
    onDispose: (fn: typeof disposeHook) => {
      disposeHook = fn;
    },
  };
}

describe('material contact declaration and fake-host association', () => {
  it.each(['root', 'track'])(
    'binds the declared %s owner without creating input or value operations',
    (ownerRole) => {
      const w = world(),
        p = w.pair(ownerRole);
      expect(w.records).toHaveLength(1);
      const r = w.records[0];
      expect(r.binding.owner.instance).toBe(p.owner.instance);
      expect(r.binding.paint.instance).toBe(p.paint.instance);
      expect(Object.keys(p.paint.module.facade)).toEqual(['offer', 'receive']);
      p.input.emit('pending');
      p.input.emit('active');
      p.input.emit('released');
      expect(r.samples.map((s) => s.phase)).toEqual(['pending', 'active', 'released']);
      expect(r.binding.isCurrent()).toBe(true);
    }
  );
  it('supports explicit self without requiring an anatomy role selector', () => {
    const w = world(),
      self = w.member('root');
    self.module.facade.receive({ source: 'self', placement: 'fixed' });
    const input = w.addInput(self);
    self.mount();
    input.emit('pending');
    expect(w.records[0].binding.owner.instance).toBe(self.instance);
    expect(w.records[0].binding.paint.instance).toBe(self.instance);
    expect(w.records[0].samples).toHaveLength(1);
  });
  it('is inert without a host, slot, owner or materialized target', () => {
    const w = world(),
      noHost = w.member('root', { withHost: false });
    noHost.module.facade.receive({ source: 'self', placement: 'fixed' });
    noHost.mount();
    expect(noHost.module.port?.getDiagnostic()).toBe('unsupported-material-contact-host');
    const owner = w.member('root'),
      paint = w.member('thumb', { material: false });
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    w.addInput(owner);
    owner.mount();
    paint.mount();
    expect(w.records).toHaveLength(0);
    paint.setMaterial(true);
    w.views.delete(paint.instance);
    w.topology();
    expect(w.records).toHaveLength(0);
  });
  it('does not fall back to the paint router when a delegated source is absent', () => {
    const w = world(),
      paint = w.member('thumb');
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    const ownInput = w.addInput(paint);
    paint.mount();
    ownInput.emit('pending');
    expect(w.records).toHaveLength(0);
    expect(paint.module.port?.getDiagnostic()).toBe('contact-link-unavailable');
  });
  it.each(['domain', 'family', 'document'])('does not cross %s identities', (axis) => {
    const w = world(),
      owner = w.member('root'),
      otherFamily = family();
    const paint = w.member(
      'thumb',
      axis === 'domain'
        ? { domain: {} }
        : axis === 'family'
          ? { family: otherFamily }
          : { document: {} }
    );
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({
      source: 'part',
      link: w.link('root', 'thumb', axis === 'family' ? otherFamily : w.f),
      placement: 'fixed',
    });
    w.addInput(owner);
    owner.mount();
    paint.mount();
    expect(w.records).toHaveLength(0);
  });
  it.each(['offer', 'receive'])('fails closed for duplicate logical %s participants', (kind) => {
    const w = world(),
      p = w.pair();
    const extra = w.member(kind === 'offer' ? 'root' : 'thumb');
    if (kind === 'offer') extra.module.facade.offer(w.link());
    else extra.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    w.topology();
    expect(w.records[0].disposed).toBe(1);
    expect(p.paint.module.port?.getDiagnostic()).toBe('contact-link-ambiguous');
    extra.dispose();
    w.topology();
    expect(w.records).toHaveLength(2);
  });
  it('poisons duplicate receives on one setup handle rather than choosing last write', () => {
    const w = world(),
      paint = w.member('thumb');
    paint.module.facade.receive({ source: 'self', placement: 'fixed' });
    expect(() =>
      paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' })
    ).toThrow('duplicate');
    w.addInput(paint);
    paint.mount();
    expect(w.records).toHaveLength(0);
  });
  it('rejects getters and nonfresh extra fields without executing author code', () => {
    const w = world(),
      owner = w.member('root');
    let calls = 0;
    const evil = {
      ...w.link(),
      get ownerTarget() {
        calls++;
        return {};
      },
    };
    expect(() => owner.module.facade.offer(evil)).toThrow('unknown field');
    const getter = {
      ...w.link(),
      get key() {
        calls++;
        return 'thumb';
      },
    };
    expect(() => owner.module.facade.offer(getter)).toThrow('data properties');
    expect(calls).toBe(0);
    expect(() => owner.module.facade.offer({ ...w.link(), ownerRole: 'thumb' })).toThrow(
      'own claimed role'
    );
  });
  it('treats __proto__ as an exact ordinary match key', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb'),
      l = w.link('root', '__proto__');
    owner.module.facade.offer(l);
    paint.module.facade.receive({ source: 'part', link: l, placement: 'fixed' });
    const input = w.addInput(owner);
    owner.mount();
    paint.mount();
    input.emit('pending');
    expect(w.records[0].samples).toHaveLength(1);
  });
  it('enforces setup-only declarations', () => {
    const w = world(),
      owner = w.member('root');
    owner.mount();
    expect(() => owner.module.facade.offer(w.link())).toThrow('setup only');
  });
});

describe('material contact input lifetime fences', () => {
  it.each(['pending', 'active', 'released'] as const)(
    'does not inherit a late %s session',
    (phase) => {
      const w = world(),
        owner = w.member('root'),
        paint = w.member('thumb');
      owner.module.facade.offer(w.link());
      paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
      const input = w.addInput(owner);
      input.emit('pending');
      if (phase !== 'pending') input.emit(phase);
      owner.mount();
      paint.mount();
      input.emit('active');
      input.emit('released');
      expect(w.records[0].samples).toHaveLength(0);
      input.emit('pending');
      input.emit('active');
      expect(w.records[0].samples.map((s) => s.phase)).toEqual(['pending', 'active']);
    }
  );
  it('requires pending before active and never revives a cancelled session', () => {
    const w = world(),
      p = w.pair(),
      r = w.records[0];
    p.input.emit('active');
    expect(r.samples).toHaveLength(0);
    const pending = p.input.emit('pending');
    p.input.emit('cancelled');
    p.input.emit('active');
    p.input.emit('pending', { session: pending.session });
    expect(r.samples.map((s) => s.phase)).toEqual(['pending']);
    expect(r.cleared).toBe(1);
    p.input.emit('pending');
    expect(r.samples).toHaveLength(2);
  });
  it('rejects stale revisions and mismatched owner facts from the same reader object', () => {
    const w = world(),
      p = w.pair(),
      r = w.records[0];
    const down = p.input.emit('pending');
    p.input.emit('active');
    p.input.setValue(down);
    p.input.notify();
    expect(r.samples).toHaveLength(2);
    p.input.emit('active', { owner: {} });
    expect(r.disposed).toBe(1);
    p.input.emit('pending');
    w.notifyHost();
    expect(w.records).toHaveLength(1);
    expect(r.binding.isCurrent()).toBe(false);
  });
  it('rejects forged registrations even when the source was returned by the host', () => {
    const w = world(),
      p = w.pair();
    const forged = {
      ...p.input.lease,
      registration: { ...p.input.lease.registration, instance: p.paint.instance },
    };
    w.inputs.set(p.owner.instance, { ...p.input, lease: forged });
    w.notifyHost();
    expect(w.records[0].disposed).toBe(1);
    expect(w.records).toHaveLength(1);
  });
  it('rejects nonfinite raw input without exposing it to the paint lease', () => {
    const w = world(),
      p = w.pair();
    p.input.emit('pending', { current: { x: Infinity, y: 0 } });
    expect(w.records[0].samples).toHaveLength(0);
    expect(w.records[0].disposed).toBe(1);
  });
  it('clears old contact when a new session appears without a witnessed pending phase', () => {
    const w = world(),
      p = w.pair(),
      r = w.records[0];
    p.input.emit('pending');
    p.input.emit('active');
    const otherSession = {};
    p.input.emit('active', { session: otherSession });
    expect(r.cleared).toBe(1);
    expect(r.samples).toHaveLength(2);
    p.input.emit('pending', { session: otherSession });
    expect(r.samples).toHaveLength(2);
    p.input.emit('pending');
    expect(r.samples).toHaveLength(3);
  });
  it('rejects mutated registration and changing down coordinates within a session', () => {
    const w = world(),
      p = w.pair(),
      r = w.records[0];
    p.input.emit('pending');
    p.input.emit('active', { down: { x: 99, y: 10 } });
    expect(r.disposed).toBe(1);
    const next = w.addInput(p.owner);
    w.notifyHost();
    Object.defineProperty(next.lease, 'registration', {
      value: { ...next.lease.registration, owner: {} },
    });
    w.notifyHost();
    expect(w.records.at(-1)!.disposed).toBe(1);
    expect(p.paint.module.port?.getDiagnostic()).toBe('input-registration-mutated');
  });
  it('retires input replacement and ignores held contact in its successor', () => {
    const w = world(),
      p = w.pair(),
      old = p.input;
    old.emit('pending');
    const next = w.addInput(p.owner);
    next.emit('pending');
    next.emit('active');
    w.notifyHost();
    expect(w.records[0].disposed).toBe(1);
    expect(old.listeners.size).toBe(0);
    next.emit('released');
    expect(w.records[1].samples).toHaveLength(0);
    next.emit('pending');
    expect(w.records[1].samples).toHaveLength(1);
  });
  it('cancels same-DOM new epochs and does not inherit contact on remount', () => {
    const w = world(),
      p = w.pair(),
      original = w.views.get(p.paint.instance)!;
    p.input.emit('pending');
    p.paint.detach(2);
    w.views.set(p.paint.instance, { ...original, epoch: 3 });
    p.paint.mount(3);
    expect(w.records[0].disposed).toBe(1);
    expect(w.records[0].binding.isCurrent()).toBe(false);
    p.input.emit('active');
    expect(w.records[1].samples).toHaveLength(0);
    p.input.emit('pending');
    expect(w.records[1].samples).toHaveLength(1);
  });
  it('invalidates target replacement, cross-document adoption and domain movement', () => {
    const w = world(),
      p = w.pair();
    p.input.emit('pending');
    const view = w.views.get(p.paint.instance)!;
    w.views.set(p.paint.instance, { ...view, target: {}, identity: {} });
    w.topology();
    expect(w.records[0].disposed).toBe(1);
    w.views.set(p.paint.instance, { ...view, document: {} });
    w.notifyHost();
    expect(w.records.at(-1)!.disposed).toBe(1);
    w.views.set(p.paint.instance, view);
    p.paint.setDomain({});
    w.topology();
    expect(p.paint.module.port?.getDiagnostic()).toBe('contact-link-unavailable');
  });
  it('does not install a lease when attach synchronously disposes its receiver', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb');
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    w.addInput(owner);
    owner.mount();
    w.onAttach(() => paint.dispose());
    paint.mount();
    expect(w.records).toHaveLength(1);
    expect(w.records[0].disposed).toBe(1);
    expect(w.records[0].binding.isCurrent()).toBe(false);
  });
  it('cleans subscriptions and leases when subscribe synchronously replaces the paint target', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb');
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    const input = w.addInput(owner);
    owner.mount();
    let once = true;
    input.onSubscribe(() => {
      if (!once) return;
      once = false;
      const v = w.views.get(paint.instance)!;
      w.views.set(paint.instance, { ...v, target: {}, identity: {} });
      w.topology();
    });
    paint.mount();
    expect(w.records[0].disposed).toBe(1);
    expect(input.listeners.size).toBe(1);
    input.emit('pending');
    expect(w.records.at(-1)!.samples).toHaveLength(1);
  });
  it('cleans every owned observer on terminal disposal', () => {
    const w = world(),
      p = w.pair();
    p.input.emit('pending');
    p.owner.dispose();
    p.paint.dispose();
    expect(p.input.listeners.size).toBe(0);
    expect(w.hostListeners.size).toBe(0);
    expect(p.owner.watchers.size + p.paint.watchers.size).toBe(0);
    expect(w.records[0].disposed).toBe(1);
  });
});

describe('independent-review regressions', () => {
  it('never delivers an older sample after clear synchronously emits a newer session', () => {
    const w = world(),
      p = w.pair(),
      r = w.records[0];
    p.input.emit('pending');
    let once = true;
    w.onClear(() => {
      if (once) {
        once = false;
        p.input.emit('pending');
      }
    });
    p.input.emit('pending');
    expect(r.samples.map((s) => s.revision)).toEqual([1, 3]);
    p.input.emit('active');
    expect(r.samples.map((s) => s.revision)).toEqual([1, 3, 4]);
  });
  it('does not revive a retired session after a paint-only remount', () => {
    const w = world(),
      p = w.pair();
    const old = p.input.emit('pending');
    p.input.emit('cancelled');
    p.input.setValue(null);
    p.paint.detach(2);
    const view = w.views.get(p.paint.instance)!;
    w.views.set(p.paint.instance, { ...view, epoch: 3 });
    p.paint.mount(3);
    p.input.emit('pending', { session: old.session });
    expect(w.records[1].samples).toHaveLength(0);
  });
  it('keeps a mutated read lease rejected after the registration is restored', () => {
    const w = world(),
      p = w.pair();
    const registration = p.input.lease.registration;
    Object.defineProperty(p.input.lease, 'registration', {
      value: { ...registration, owner: {} },
      configurable: true,
    });
    w.notifyHost();
    Object.defineProperty(p.input.lease, 'registration', { value: registration });
    w.notifyHost();
    expect(w.records).toHaveLength(1);
  });
});

describe('additional reentrancy controls', () => {
  it('does not call attach if the final desired read synchronously disposes receiver', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb');
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    w.addInput(owner);
    owner.mount();
    const read = w.host.readInput;
    let reads = 0;
    w.host.readInput = (instance) => {
      const result = read(instance);
      if (++reads === 2) paint.dispose();
      return result;
    };
    paint.mount();
    expect(w.records).toHaveLength(0);
  });
  it('keeps synchronous successor mount from old lease dispose', () => {
    const w = world(),
      p = w.pair();
    let once = true;
    w.onDispose(() => {
      if (!once) return;
      once = false;
      const view = w.views.get(p.paint.instance)!;
      w.views.set(p.paint.instance, { ...view, epoch: 3 });
      p.paint.mount(3);
    });
    p.paint.detach(2);
    expect(w.records).toHaveLength(2);
    expect(w.records[0].disposed).toBe(1);
    expect(w.records[1].disposed).toBe(0);
    p.input.emit('pending');
    expect(w.records[1].samples).toHaveLength(1);
  });
  it('releases resources when subscribe disposes the receiver', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb');
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    const input = w.addInput(owner);
    owner.mount();
    input.onSubscribe(() => paint.dispose());
    paint.mount();
    expect(w.records).toHaveLength(1);
    expect(w.records[0].disposed).toBe(1);
    expect(input.listeners.size).toBe(0);
    expect(paint.watchers.size).toBe(0);
  });
  it('does not observe a pending event delivered synchronously during subscribe', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb');
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    const input = w.addInput(owner);
    owner.mount();
    input.onSubscribe(() => input.emit('pending'));
    paint.mount();
    input.emit('active');
    expect(w.records[0].samples).toHaveLength(0);
    input.emit('pending');
    expect(w.records[0].samples).toHaveLength(1);
  });
});

describe('final read freshness controls', () => {
  it('does not deliver stale pending after final guard synchronously delivers active', () => {
    const w = world(),
      p = w.pair(),
      r = w.records[0];
    const read = w.host.readInput;
    let reads = 0;
    w.host.readInput = (instance) => {
      const result = read(instance);
      if (++reads === 4) p.input.emit('active');
      return result;
    };
    p.input.emit('pending');
    expect(r.samples.map((s) => s.revision)).toEqual([2]);
  });
  it('does not deliver stale revision replay after a null-snapshot remount', () => {
    const w = world(),
      p = w.pair();
    const old = p.input.emit('pending');
    p.input.emit('active');
    p.input.setValue(null);
    p.paint.detach(2);
    const view = w.views.get(p.paint.instance)!;
    w.views.set(p.paint.instance, { ...view, epoch: 3 });
    p.paint.mount(3);
    p.input.setValue(old);
    p.input.notify();
    expect(w.records[1].samples).toHaveLength(0);
  });
});

describe('first-read quarantine', () => {
  it.each(['mismatched', 'malformed'])(
    'requires a fresh lease after initial %s registration is repaired in place',
    (kind) => {
      const w = world(),
        owner = w.member('root'),
        paint = w.member('thumb');
      owner.module.facade.offer(w.link());
      paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
      const input = w.addInput(owner),
        registration = input.lease.registration;
      Object.defineProperty(input.lease, 'registration', {
        value:
          kind === 'mismatched'
            ? { ...registration, instance: paint.instance }
            : { ...registration, ownerEpoch: Infinity },
        configurable: true,
      });
      owner.mount();
      paint.mount();
      expect(w.records).toHaveLength(0);
      Object.defineProperty(input.lease, 'registration', { value: registration });
      w.notifyHost();
      expect(w.records).toHaveLength(0);
      w.addInput(owner);
      w.notifyHost();
      expect(w.records).toHaveLength(1);
    }
  );
});

describe('cleanup and boundary controls', () => {
  it('attempts all cleanup even if input unsubscribe and paint dispose both throw', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb');
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    const input = w.addInput(owner),
      subscribe = input.lease.subscribe;
    input.lease.subscribe = (cb) => {
      const off = subscribe(cb);
      return () => {
        off();
        throw Error('off failed');
      };
    };
    owner.mount();
    paint.mount();
    w.onDispose(() => {
      throw Error('paint dispose failed');
    });
    expect(() => paint.dispose()).toThrow('off failed');
    expect(input.listeners.size).toBe(0);
    expect(w.records[0].disposed).toBe(1);
    expect(w.records[0].binding.isCurrent()).toBe(false);
    expect(paint.watchers.size).toBe(0);
    expect(w.hostListeners.size).toBe(1);
  });
  it('rejects different host-capability objects for the same domain', () => {
    const w = world(),
      owner = w.member('root'),
      paint = w.member('thumb');
    owner.module.facade.offer(w.link());
    paint.module.facade.receive({ source: 'part', link: w.link(), placement: 'fixed' });
    w.addInput(owner);
    owner.mount();
    paint.vault.attach([[MATERIAL_CONTACT_HOST_CAP, { ...w.host }]]);
    paint.mount();
    expect(w.records).toHaveLength(0);
  });
  it('preserves snapshot isolation of accepted coordinate data', () => {
    const w = world(),
      p = w.pair();
    const raw = p.input.emit('pending');
    if (raw.phase === 'cancelled') throw Error('bad fixture');
    (raw.current as { x: number; y: number }).x = 999;
    const sample = w.records[0].samples[0];
    expect(sample.phase).toBe('pending');
    if (sample.phase === 'cancelled') throw Error('bad fixture');
    expect(sample.current.x).toBe(20);
    expect(Object.isFrozen(sample.current)).toBe(true);
  });
});
