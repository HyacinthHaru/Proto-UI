import {
  snapshotMaterialSlot,
  type MaterialContactHandle,
  type MaterialContactLink,
  type MaterialContactPaintDeclaration,
  type MountPhase,
} from '@proto.ui/core';
import type { AnatomyPort } from '@proto.ui/module-anatomy';
import type { FeedbackPort } from '@proto.ui/module-feedback';
import {
  createModule,
  defineModule,
  ModuleBase,
  type ModuleFactoryArgs,
} from '@proto.ui/module-base';
import {
  MATERIAL_CONTACT_HOST_CAP,
  type MaterialContactHost,
  type MaterialContactView,
  type MaterialInputReadLease,
  type MaterialInputRegistration,
  type MaterialContactPaintLease,
} from './caps';
import { add, remove, notify, matches, type Entry } from './registry';
import {
  object,
  epoch,
  snapshotLink,
  snapshotPaint,
  snapshotView,
  snapshotRegistration,
  snapshotContact,
  sameView,
  sameRegistration,
} from './validation';

type InputLifetime = {
  registration: MaterialInputRegistration;
  revision: number;
  retiredSessions: WeakSet<object>;
  rejected: boolean;
};
type Desired = {
  host: MaterialContactHost;
  owner: MaterialContactView;
  paint: MaterialContactView;
  input: MaterialInputReadLease;
  registration: MaterialInputRegistration;
  lifetime: InputLifetime;
  ownerModule: MaterialContactModuleImpl;
};
type Connection = Desired & {
  identity: object;
  generation: number;
  lease: MaterialContactPaintLease | null;
  off: (() => void) | null;
  ready: boolean;
  delivery: number;
  session: object | null;
  phase: 'pending' | 'active' | null;
  basis: { coordinateSpace: object; x: number; y: number } | null;
};
export type MaterialContactPort = { getDiagnostic(): string | null };

class MaterialContactModuleImpl extends ModuleBase {
  private offered: MaterialContactLink | null = null;
  private received: MaterialContactPaintDeclaration | null = null;
  private entries: Entry[] = [];
  private offs: (() => void)[] = [];
  private hostOff: (() => void) | null = null;
  private subscribedHost: MaterialContactHost | null = null;
  private connection: Connection | null = null;
  private inputLifetimes = new WeakMap<MaterialInputReadLease, InputLifetime>();
  private rejectedInputs = new WeakMap<MaterialInputReadLease, string>();
  private viewEpoch = 0;
  private generation = 0;
  private disposed = false;
  private poisoned = false;
  private refreshing = false;
  private again = false;
  private diagnostic: string | null = null;
  constructor(
    caps: ModuleFactoryArgs['caps'],
    private anatomy: AnatomyPort,
    private feedback: FeedbackPort | undefined
  ) {
    super(caps);
  }

  readonly facade: MaterialContactHandle = {
    offer: (value) => {
      this.sys.ensureSetup('materialContact.offer');
      if (this.offered || this.poisoned) return this.conflict();
      const link = snapshotLink(value);
      this.checkRole(link, link.ownerRole);
      this.offered = link;
      this.observe(link);
      this.refresh();
    },
    receive: (value) => {
      this.sys.ensureSetup('materialContact.receive');
      if (this.received || this.poisoned) return this.conflict();
      const declaration = snapshotPaint(value);
      if (declaration.source === 'part')
        this.checkRole(declaration.link, declaration.link.paintRole);
      this.received = declaration;
      if (declaration.source === 'part') this.observe(declaration.link);
      this.refresh();
    },
  };
  readonly port: MaterialContactPort = { getDiagnostic: () => this.diagnostic };
  private conflict(): never {
    this.poisoned = true;
    this.refresh();
    throw Error('[MaterialContact] duplicate declaration');
  }
  private checkRole(link: MaterialContactLink, role: string) {
    if (this.anatomy.resolveSelfRole(link.family) !== role)
      throw Error('[MaterialContact] declaration must name its own claimed role');
  }
  private observe(link: MaterialContactLink) {
    this.offs.push(
      this.anatomy.subscribeOrder(link.family, () => this.refresh()),
      this.anatomy.subscribeTargets(link.family, () => this.refresh())
    );
  }
  private host() {
    return this.caps.has(MATERIAL_CONTACT_HOST_CAP)
      ? this.caps.get(MATERIAL_CONTACT_HOST_CAP)
      : null;
  }
  private logical(
    link: MaterialContactLink,
    role: string
  ): { instance: object; domain: object; target: unknown } | null {
    if (this.disposed || this.poisoned || this.anatomy.resolveSelfRole(link.family) !== role)
      return null;
    const instance = this.anatomy.resolveSelfInstance(),
      domain = this.anatomy.resolveDomainScope(link.family);
    if (!object(instance) || !object(domain)) return null;
    const parts = this.anatomy.order
      .partsOf(link.family, role, { missing: 'empty' })
      .filter(
        (part) =>
          this.anatomy.isCurrentPart(link.family, part) &&
          this.anatomy.resolvePartInstance(part) === instance
      );
    if (parts.length !== 1) return null;
    return { instance, domain, target: this.anatomy.resolvePartTarget(parts[0]) };
  }
  private syncEntries() {
    const desired: Array<{ kind: Entry['kind']; link: MaterialContactLink; domain: object }> = [];
    if (this.offered) {
      const logical = this.logical(this.offered, this.offered.ownerRole);
      if (logical) desired.push({ kind: 'offer', link: this.offered, domain: logical.domain });
    }
    if (this.received?.source === 'part') {
      const link = this.received.link,
        logical = this.logical(link, link.paintRole);
      if (logical) desired.push({ kind: 'receive', link, domain: logical.domain });
    }
    for (const entry of [...this.entries]) {
      if (
        desired.some(
          (d) => d.kind === entry.kind && d.link === entry.link && d.domain === entry.domain
        )
      )
        continue;
      this.entries.splice(this.entries.indexOf(entry), 1);
      remove(entry);
    }
    for (const d of desired) {
      if (this.disposed || this.poisoned) break;
      if (this.entries.some((e) => e.kind === d.kind && e.link === d.link && e.domain === d.domain))
        continue;
      const entry: Entry = {
        ...d,
        owner: this,
        current: () =>
          this.logical(d.link, d.kind === 'offer' ? d.link.ownerRole : d.link.paintRole)?.domain ===
          d.domain,
        changed: () => this.refresh(),
      };
      this.entries.push(entry);
      add(entry);
    }
  }
  private readView(
    host: MaterialContactHost,
    link?: MaterialContactLink,
    role?: string
  ): MaterialContactView | null {
    if (this.disposed || this.poisoned || this.mountPhase !== 'mounted' || this.host() !== host)
      return null;
    const logical = link && role ? this.logical(link, role) : null;
    if (link && !logical) return null;
    const instance = logical?.instance ?? this.anatomy.resolveSelfInstance();
    if (!object(instance)) return null;
    const raw = host.readView(instance);
    if (!raw) return null;
    const view = snapshotView(raw);
    if (
      !view.connected ||
      view.instance !== instance ||
      view.epoch !== this.viewEpoch ||
      (logical && logical.target !== view.target)
    )
      return null;
    return view;
  }
  private desired(): Desired | null {
    const declaration = this.received,
      host = this.host();
    if (this.disposed || this.poisoned || !declaration || !host || this.mountPhase !== 'mounted')
      return null;
    const slot = this.feedback?.exportMaterialFrame?.().slot;
    if (!slot) {
      this.diagnostic = 'material-slot-unavailable';
      return null;
    }
    snapshotMaterialSlot(slot);
    let ownerModule: MaterialContactModuleImpl = this;
    if (declaration.source === 'part') {
      const entry = this.entries.find((e) => e.kind === 'receive');
      if (!entry?.current()) {
        this.diagnostic = 'contact-domain-unavailable';
        return null;
      }
      const owners = matches(entry, 'offer'),
        paints = matches(entry, 'receive');
      if (owners.length !== 1 || paints.length !== 1 || paints[0] !== entry) {
        this.diagnostic =
          owners.length > 1 || paints.length > 1
            ? 'contact-link-ambiguous'
            : 'contact-link-unavailable';
        return null;
      }
      ownerModule = owners[0].owner as MaterialContactModuleImpl;
    }
    const link = declaration.source === 'part' ? declaration.link : undefined;
    const owner = ownerModule.readView(host, link, link?.ownerRole),
      paint = this.readView(host, link, link?.paintRole);
    if (!owner || !paint || owner.document !== paint.document) {
      this.diagnostic = 'contact-view-unavailable';
      return null;
    }
    const input = host.readInput(owner.instance);
    if (!input || !host.isCurrentInput(input)) {
      this.diagnostic = 'input-source-unavailable';
      return null;
    }
    const rejected = this.rejectedInputs.get(input);
    if (rejected) {
      this.diagnostic = rejected;
      return null;
    }
    let lifetime = this.inputLifetimes.get(input);
    let registration: MaterialInputRegistration;
    try {
      const descriptor = Object.getOwnPropertyDescriptor(input, 'registration');
      if (!descriptor || !('value' in descriptor))
        throw Error('[MaterialContact] input registration must be data');
      registration = snapshotRegistration(descriptor.value);
    } catch (error) {
      if (lifetime) lifetime.rejected = true;
      this.rejectedInputs.set(input, 'input-lifetime-rejected');
      throw error;
    }
    if (lifetime && !sameRegistration(lifetime.registration, registration)) {
      lifetime.rejected = true;
      this.rejectedInputs.set(input, 'input-registration-mutated');
      this.diagnostic = 'input-registration-mutated';
      return null;
    }
    if (
      registration.instance !== owner.instance ||
      registration.target !== owner.target ||
      registration.document !== owner.document ||
      registration.viewIdentity !== owner.identity ||
      registration.viewEpoch !== owner.epoch
    ) {
      this.rejectedInputs.set(input, 'input-owner-mismatch');
      this.diagnostic = 'input-owner-mismatch';
      return null;
    }
    if (lifetime?.rejected) {
      this.diagnostic = 'input-lifetime-rejected';
      return null;
    }
    if (!lifetime) {
      lifetime = { registration, revision: -1, retiredSessions: new WeakSet(), rejected: false };
      this.inputLifetimes.set(input, lifetime);
    }
    return { host, owner, paint, input, registration, lifetime, ownerModule };
  }
  private equal(a: Desired, b: Desired) {
    return (
      a.host === b.host &&
      a.input === b.input &&
      a.ownerModule === b.ownerModule &&
      sameView(a.owner, b.owner) &&
      sameView(a.paint, b.paint) &&
      sameRegistration(a.registration, b.registration)
    );
  }
  private current(connection: Connection): boolean {
    if (
      this.disposed ||
      this.connection !== connection ||
      this.generation !== connection.generation
    )
      return false;
    try {
      const desired = this.desired();
      return (
        !!desired &&
        this.equal(connection, desired) &&
        this.connection === connection &&
        this.generation === connection.generation
      );
    } catch {
      return false;
    }
  }
  private disconnect() {
    ++this.generation;
    const old = this.connection;
    this.connection = null;
    if (!old) return;
    old.ready = false;
    ++old.delivery;
    if (old.session) old.lifetime.retiredSessions.add(old.session);
    const off = old.off,
      lease = old.lease;
    old.off = null;
    old.lease = null;
    let hasFailure = false;
    let failure: unknown;
    for (const dispose of [off, lease && (() => lease.dispose())]) {
      try {
        dispose?.();
      } catch (error) {
        if (!hasFailure) {
          hasFailure = true;
          failure = error;
        }
      }
    }
    if (hasFailure) throw failure;
  }
  private receiveContact(connection: Connection) {
    const delivery = ++connection.delivery;
    const current = () =>
      connection.delivery === delivery &&
      this.current(connection) &&
      connection.delivery === delivery;
    if (!connection.ready || !current()) {
      this.refresh();
      return;
    }
    try {
      const raw = connection.input.current();
      if (!current()) {
        this.refresh();
        return;
      }
      if (!raw) {
        if (connection.session) connection.lifetime.retiredSessions.add(connection.session);
        connection.session = null;
        connection.phase = null;
        connection.basis = null;
        connection.lease?.clear();
        return;
      }
      const sample = snapshotContact(raw),
        registration = connection.registration;
      if (!current()) return;
      if (
        sample.owner !== registration.owner ||
        sample.ownerEpoch !== registration.ownerEpoch ||
        sample.document !== registration.document
      )
        throw Error('input-owner-mismatch');
      if (sample.revision <= connection.lifetime.revision) return;
      connection.lifetime.revision = sample.revision;
      if (sample.phase === 'pending') {
        if (connection.lifetime.retiredSessions.has(sample.session)) return;
        if (connection.session && connection.session !== sample.session) {
          connection.lifetime.retiredSessions.add(connection.session);
          connection.lease?.clear();
          if (!current()) return;
        }
        if (connection.session === sample.session && connection.phase === 'active')
          throw Error('input-phase-regressed');
        if (connection.session !== sample.session)
          connection.basis = {
            coordinateSpace: sample.coordinateSpace,
            x: sample.down.x,
            y: sample.down.y,
          };
        connection.session = sample.session;
        connection.phase = 'pending';
      } else {
        if (sample.session !== connection.session) {
          connection.lifetime.retiredSessions.add(sample.session);
          if (connection.session) {
            connection.lifetime.retiredSessions.add(connection.session);
            connection.session = null;
            connection.phase = null;
            connection.basis = null;
            connection.lease?.clear();
            if (!current()) return;
          }
          return;
        }
        if (connection.lifetime.retiredSessions.has(sample.session)) return;
        if (sample.phase === 'active') connection.phase = 'active';
        else {
          connection.lifetime.retiredSessions.add(sample.session);
          connection.session = null;
          connection.phase = null;
        }
      }
      if (
        sample.phase !== 'cancelled' &&
        (!connection.basis ||
          sample.coordinateSpace !== connection.basis.coordinateSpace ||
          sample.down.x !== connection.basis.x ||
          sample.down.y !== connection.basis.y)
      )
        throw Error('input-basis-changed');
      if (!current()) {
        this.refresh();
        return;
      }
      if (sample.phase === 'cancelled') connection.lease?.clear();
      else connection.lease?.contact(sample);
    } catch {
      if (this.connection !== connection || connection.delivery !== delivery) return;
      connection.lifetime.rejected = true;
      this.diagnostic = 'invalid-input-contact';
      this.disconnect();
    }
  }
  private connect(desired: Desired, generation: number) {
    if (this.disposed || this.poisoned || this.connection || this.generation !== generation) return;
    const connection: Connection = {
      ...desired,
      identity: {},
      generation: this.generation,
      lease: null,
      off: null,
      ready: false,
      delivery: 0,
      session: null,
      phase: null,
      basis: null,
    };
    this.connection = connection;
    const lease = desired.host.attach(
      Object.freeze({
        identity: connection.identity,
        owner: desired.owner,
        paint: desired.paint,
        input: desired.registration,
        placement: this.received!.placement,
        isCurrent: () => this.current(connection),
      })
    );
    if (!this.current(connection)) {
      lease.dispose();
      this.again = true;
      return;
    }
    connection.lease = lease;
    const off = desired.input.subscribe(() => {
      if (connection.ready) this.receiveContact(connection);
    });
    if (!this.current(connection)) {
      off();
      this.again = true;
      return;
    }
    connection.off = off;
    // A receiver never joins an already held/pending/released session. Even a
    // synchronous notification during subscribe belongs to this handshake fence.
    const raw = desired.input.current();
    if (raw) {
      const sample = snapshotContact(raw);
      if (
        sample.owner !== desired.registration.owner ||
        sample.ownerEpoch !== desired.registration.ownerEpoch ||
        sample.document !== desired.registration.document
      )
        throw Error('input-owner-mismatch');
      connection.lifetime.revision = Math.max(connection.lifetime.revision, sample.revision);
      connection.lifetime.retiredSessions.add(sample.session);
    }
    if (!this.current(connection)) {
      this.again = true;
      return;
    }
    connection.ready = true;
    this.diagnostic = null;
  }
  private refresh() {
    if (this.refreshing) {
      this.again = true;
      return;
    }
    this.refreshing = true;
    try {
      let passes = 0;
      do {
        this.again = false;
        this.syncEntries();
        const host = this.disposed || this.poisoned ? null : this.host();
        if (host !== this.subscribedHost) {
          const off = this.hostOff;
          this.hostOff = null;
          this.subscribedHost = host;
          off?.();
          if (host && !this.disposed && this.subscribedHost === host) {
            const nextOff = host.subscribe(() => this.refresh());
            if (this.disposed || this.subscribedHost !== host) nextOff();
            else this.hostOff = nextOff;
          }
        }
        if (this.poisoned) this.diagnostic = 'declaration-conflict';
        else if (!host) this.diagnostic = 'unsupported-material-contact-host';
        const desired = this.desired();
        if (!desired || !this.connection || !this.equal(this.connection, desired)) {
          this.disconnect();
          if (desired && !this.disposed && !this.poisoned) {
            const generation = this.generation;
            const fresh = this.desired();
            if (
              fresh &&
              !this.disposed &&
              !this.poisoned &&
              !this.again &&
              this.generation === generation &&
              this.equal(desired, fresh)
            )
              this.connect(fresh, generation);
          }
        }
        if (++passes > 8 && this.again) {
          this.disconnect();
          this.diagnostic = 'reentrant-host-invalidated';
          break;
        }
      } while (this.again);
    } catch {
      this.diagnostic = 'contact-handshake-rejected';
      this.disconnect();
    } finally {
      this.refreshing = false;
    }
  }
  override onMountPhase(phase: MountPhase, nextEpoch: number) {
    if (this.disposed) return;
    if (!epoch(nextEpoch)) throw TypeError('[MaterialContact] invalid view epoch');
    if (nextEpoch < this.viewEpoch) return;
    const changed = phase !== this.mountPhase || nextEpoch !== this.viewEpoch;
    super.onMountPhase(phase, nextEpoch);
    this.viewEpoch = nextEpoch;
    if (changed) this.disconnect();
    this.refresh();
    for (const entry of [...this.entries]) notify(entry);
  }
  protected override onCapsEpoch() {
    if (!this.disposed) {
      this.disconnect();
      this.refresh();
      for (const entry of [...this.entries]) notify(entry);
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    let hasFailure = false;
    let failure: unknown;
    const cleanups = [() => this.disconnect(), this.hostOff, ...this.offs.splice(0)];
    this.hostOff = null;
    this.subscribedHost = null;
    for (const entry of this.entries.splice(0)) cleanups.push(() => remove(entry));
    for (const cleanup of cleanups) {
      try {
        cleanup?.();
      } catch (error) {
        if (!hasFailure) {
          hasFailure = true;
          failure = error;
        }
      }
    }
    if (hasFailure) throw failure;
  }
}

export function createMaterialContactModule({ init, caps, deps }: ModuleFactoryArgs) {
  return createModule({
    name: 'material-contact',
    scope: 'instance',
    init,
    caps,
    deps,
    build: () => {
      const impl = new MaterialContactModuleImpl(
        caps,
        deps.requirePort<AnatomyPort>('anatomy'),
        deps.tryPort<FeedbackPort>('feedback')
      );
      return {
        facade: impl.facade,
        port: impl.port,
        hooks: {
          onMountPhase: (phase, epoch) => impl.onMountPhase(phase, epoch),
          dispose: () => impl.dispose(),
        },
      };
    },
  });
}
export const MaterialContactModuleDef = defineModule({
  name: 'material-contact',
  resourceOwnership: 'mixed',
  deps: ['anatomy'],
  optionalDeps: ['feedback'],
  create: createMaterialContactModule,
});
