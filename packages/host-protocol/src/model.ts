import {
  HOST_PROTOCOL_VERSION,
  WireBoundaryError,
  assertWireValue,
  type CommitId,
  type DefaultActionRequest,
  type EventRegistration,
  type EventScope,
  type FocusTargetRef,
  type HostDiagnostic,
  type InputSample,
  type InstanceId,
  type LeaseId,
  type ProjectionAck,
  type ProjectionTransaction,
  type SampleId,
  type SemanticObjectId,
  type SessionId,
  type SlotRef,
  type ViewEpoch,
} from './wire';

/**
 * Deterministic model of the host side of the protocol. It exists to make
 * identity, stale rejection, retained logical state, pruning, idempotent
 * lease release, sample identity, default-action windows and terminal
 * disposal observable without a Rust process, a transport, or GPUI.
 */

export type SessionPhase = 'open' | 'disposed';

export type LeaseRecord = {
  readonly leaseId: LeaseId;
  readonly scope: EventScope;
  readonly type: string;
  readonly viewEpoch: ViewEpoch;
  readonly commitId: CommitId;
  readonly active: boolean;
  readonly released: boolean;
};

export type RetainedLogicalState = {
  readonly instanceId: InstanceId | null;
  readonly focusTargets: readonly FocusTargetRef[];
  readonly semanticObjectId: SemanticObjectId | null;
  readonly slots: readonly SlotRef[];
};

export type HostSessionSnapshot = {
  readonly sessionId: SessionId;
  readonly phase: SessionPhase;
  readonly currentEpoch: ViewEpoch | null;
  readonly currentCommit: CommitId | null;
  readonly activeEpoch: ViewEpoch | null;
  readonly leases: readonly LeaseRecord[];
  readonly retained: RetainedLogicalState;
  readonly diagnostics: readonly HostDiagnostic[];
};

export type ActivationResult = {
  readonly status: 'activated' | 'already-active' | 'stale' | 'not-installed' | 'disposed';
};

export type ReleaseResult = {
  readonly released: readonly LeaseId[];
  readonly alreadyReleased: readonly LeaseId[];
  readonly unknown: readonly LeaseId[];
};

export type DeliveryResult =
  | { readonly status: 'delivered'; readonly leaseIds: readonly LeaseId[] }
  | {
      readonly status: 'rejected';
      readonly reason:
        | 'stale-epoch'
        | 'inactive-epoch'
        | 'no-active-lease'
        | 'duplicate-sample'
        | 'disposed';
    };

export type DefaultActionResult = {
  readonly status: 'applied' | 'late-prevention' | 'duplicate' | 'unknown-sample' | 'disposed';
};

export type DisposeResult = {
  readonly status: 'disposed' | 'already-disposed';
  readonly releasedLeaseIds: readonly LeaseId[];
};

export type InstallOptions = {
  /** Deterministic allocation-failure injection for transactional evidence. */
  readonly failAllocation?: (registration: EventRegistration) => boolean;
};

export type HostSessionModel = {
  readonly sessionId: SessionId;
  installProjection(transaction: ProjectionTransaction, options?: InstallOptions): ProjectionAck;
  activate(viewEpoch: ViewEpoch): ActivationResult;
  releaseLeases(leaseIds: readonly LeaseId[]): ReleaseResult;
  deliver(sample: InputSample): DeliveryResult;
  requestDefaultActionPrevention(
    request: DefaultActionRequest,
    options: { readonly withinWindow: boolean }
  ): DefaultActionResult;
  dispose(): DisposeResult;
  snapshot(): HostSessionSnapshot;
};

type MutableLease = {
  leaseId: LeaseId;
  scope: EventScope;
  type: string;
  viewEpoch: ViewEpoch;
  commitId: CommitId;
  active: boolean;
  released: boolean;
};

type DeliveredSample = {
  viewEpoch: ViewEpoch;
  decided: boolean;
};

const PROTO_SURFACE = 'proto-surface';

export function createHostSessionModel(sessionId: SessionId): HostSessionModel {
  let phase: SessionPhase = 'open';
  let currentEpoch: ViewEpoch | null = null;
  let currentCommit: CommitId | null = null;
  let activeEpoch: ViewEpoch | null = null;
  let instanceId: InstanceId | null = null;
  let focusTargets: readonly FocusTargetRef[] = [];
  let semanticObjectId: SemanticObjectId | null = null;
  let slots: readonly SlotRef[] = [];

  const leases = new Map<LeaseId, MutableLease>();
  const seenLeaseIds = new Set<LeaseId>();
  const samples = new Map<SampleId, DeliveredSample>();
  const diagnostics: HostDiagnostic[] = [];

  const diagnose = (code: string, message: string, data?: HostDiagnostic['data']) => {
    const diagnostic: HostDiagnostic =
      data === undefined ? { code, message } : { code, message, data };
    diagnostics.push(diagnostic);
    return diagnostic;
  };

  const ack = (
    transaction: ProjectionTransaction,
    status: ProjectionAck['status'],
    ackDiagnostics: readonly HostDiagnostic[],
    readySurfaces: readonly string[] = []
  ): ProjectionAck => ({
    sessionId,
    viewEpoch: transaction.viewEpoch,
    commitId: transaction.commitId,
    status,
    readySurfaces,
    diagnostics: ackDiagnostics,
  });

  const liveLeases = () => [...leases.values()].filter((lease) => !lease.released);

  const pruneBefore = (viewEpoch: ViewEpoch, commitId: CommitId) => {
    for (const lease of liveLeases()) {
      const older =
        lease.viewEpoch < viewEpoch || (lease.viewEpoch === viewEpoch && lease.commitId < commitId);
      if (!older) continue;
      lease.active = false;
      lease.released = true;
    }
  };

  const isStale = (viewEpoch: ViewEpoch, commitId: CommitId) =>
    currentEpoch !== null &&
    currentCommit !== null &&
    (viewEpoch < currentEpoch || (viewEpoch === currentEpoch && commitId <= currentCommit));

  return {
    sessionId,

    installProjection(transaction, options = {}) {
      if (phase === 'disposed') {
        return ack(transaction, 'failed', [
          diagnose('session-disposed', 'projection arrived after terminal disposal'),
        ]);
      }
      try {
        assertWireValue(transaction);
      } catch (error) {
        if (!(error instanceof WireBoundaryError)) throw error;
        return ack(transaction, 'failed', [
          diagnose('wire-boundary', error.message, { path: error.path }),
        ]);
      }
      if (transaction.protocolVersion !== HOST_PROTOCOL_VERSION) {
        return ack(transaction, 'unsupported', [
          diagnose('protocol-version', 'unsupported protocol version', {
            requested: transaction.protocolVersion,
            supported: HOST_PROTOCOL_VERSION,
          }),
        ]);
      }
      if (transaction.sessionId !== sessionId) {
        return ack(transaction, 'failed', [
          diagnose('session-mismatch', 'projection belongs to another session', {
            requested: transaction.sessionId,
          }),
        ]);
      }
      if (instanceId !== null && transaction.instanceId !== instanceId) {
        return ack(transaction, 'failed', [
          diagnose('instance-mismatch', 'one session owns exactly one logical instance', {
            requested: transaction.instanceId,
            owned: instanceId,
          }),
        ]);
      }
      if (isStale(transaction.viewEpoch, transaction.commitId)) {
        return ack(transaction, 'superseded', [
          diagnose('stale-projection', 'projection is older than the current epoch or commit', {
            currentEpoch,
            currentCommit,
          }),
        ]);
      }

      // Validate the complete plan before touching any host resource.
      const planIds = new Set<LeaseId>();
      for (const registration of transaction.events.registrations) {
        if (planIds.has(registration.leaseId)) {
          return ack(transaction, 'failed', [
            diagnose('duplicate-lease', 'a plan cannot register one lease id twice', {
              leaseId: registration.leaseId,
            }),
          ]);
        }
        planIds.add(registration.leaseId);
        if (seenLeaseIds.has(registration.leaseId)) {
          return ack(transaction, 'failed', [
            diagnose('lease-reuse', 'lease ids are never reused within a session', {
              leaseId: registration.leaseId,
            }),
          ]);
        }
      }
      for (const registration of transaction.events.registrations) {
        if (options.failAllocation?.(registration)) {
          return ack(transaction, 'failed', [
            diagnose(
              'allocation-failed',
              'host could not allocate a lease; nothing was installed',
              {
                leaseId: registration.leaseId,
              }
            ),
          ]);
        }
      }

      // Apply: prune superseded records, then install the new plan inactive.
      pruneBefore(transaction.viewEpoch, transaction.commitId);
      currentEpoch = transaction.viewEpoch;
      currentCommit = transaction.commitId;
      activeEpoch = null;
      instanceId = transaction.instanceId;
      focusTargets = [...transaction.focus.targets];
      slots = [...transaction.slots.slots];
      if (transaction.a11y) semanticObjectId = transaction.a11y.semanticObjectId;
      for (const registration of transaction.events.registrations) {
        seenLeaseIds.add(registration.leaseId);
        leases.set(registration.leaseId, {
          leaseId: registration.leaseId,
          scope: registration.scope,
          type: registration.type,
          viewEpoch: transaction.viewEpoch,
          commitId: transaction.commitId,
          active: false,
          released: false,
        });
      }
      return ack(transaction, 'applied', [], [PROTO_SURFACE, ...slots]);
    },

    activate(viewEpoch) {
      if (phase === 'disposed') return { status: 'disposed' };
      if (currentEpoch === null || viewEpoch > currentEpoch) return { status: 'not-installed' };
      if (viewEpoch < currentEpoch) return { status: 'stale' };
      const currentLeases = liveLeases().filter((lease) => lease.commitId === currentCommit);
      if (activeEpoch === viewEpoch && currentLeases.every((lease) => lease.active)) {
        return { status: 'already-active' };
      }
      for (const lease of currentLeases) lease.active = true;
      activeEpoch = viewEpoch;
      return { status: 'activated' };
    },

    releaseLeases(leaseIds) {
      const released: LeaseId[] = [];
      const alreadyReleased: LeaseId[] = [];
      const unknown: LeaseId[] = [];
      for (const leaseId of leaseIds) {
        const lease = leases.get(leaseId);
        if (!lease) {
          unknown.push(leaseId);
          continue;
        }
        if (lease.released) {
          alreadyReleased.push(leaseId);
          continue;
        }
        lease.active = false;
        lease.released = true;
        released.push(leaseId);
      }
      return { released, alreadyReleased, unknown };
    },

    deliver(sample) {
      if (phase === 'disposed') return { status: 'rejected', reason: 'disposed' };
      if (currentEpoch === null || sample.viewEpoch < currentEpoch) {
        diagnose('stale-sample', 'input sample carries a retired view epoch', {
          sampleId: sample.sampleId,
          viewEpoch: sample.viewEpoch,
        });
        return { status: 'rejected', reason: 'stale-epoch' };
      }
      if (sample.viewEpoch !== currentEpoch || activeEpoch !== currentEpoch) {
        return { status: 'rejected', reason: 'inactive-epoch' };
      }
      if (samples.has(sample.sampleId)) {
        return { status: 'rejected', reason: 'duplicate-sample' };
      }
      const targets = sample.leaseIds.filter((leaseId) => {
        const lease = leases.get(leaseId);
        return (
          lease !== undefined &&
          lease.active &&
          !lease.released &&
          lease.viewEpoch === sample.viewEpoch &&
          lease.type === sample.type
        );
      });
      if (targets.length === 0) return { status: 'rejected', reason: 'no-active-lease' };
      samples.set(sample.sampleId, { viewEpoch: sample.viewEpoch, decided: false });
      return { status: 'delivered', leaseIds: targets };
    },

    requestDefaultActionPrevention(request, options) {
      if (phase === 'disposed') return { status: 'disposed' };
      const sample = request.sessionId === sessionId ? samples.get(request.sampleId) : undefined;
      if (!sample) return { status: 'unknown-sample' };
      if (sample.decided) return { status: 'duplicate' };
      sample.decided = true;
      if (options.withinWindow) return { status: 'applied' };
      diagnose('late-prevention', 'default action already ran before the guest decision arrived', {
        sampleId: request.sampleId,
      });
      return { status: 'late-prevention' };
    },

    dispose() {
      if (phase === 'disposed') return { status: 'already-disposed', releasedLeaseIds: [] };
      const releasedLeaseIds = liveLeases().map((lease) => lease.leaseId);
      for (const lease of liveLeases()) {
        lease.active = false;
        lease.released = true;
      }
      samples.clear();
      activeEpoch = null;
      phase = 'disposed';
      return { status: 'disposed', releasedLeaseIds };
    },

    snapshot() {
      return {
        sessionId,
        phase,
        currentEpoch,
        currentCommit,
        activeEpoch,
        leases: [...leases.values()].map((lease) => ({ ...lease })),
        retained: {
          instanceId,
          focusTargets: [...focusTargets],
          semanticObjectId,
          slots: [...slots],
        },
        diagnostics: [...diagnostics],
      };
    },
  };
}
