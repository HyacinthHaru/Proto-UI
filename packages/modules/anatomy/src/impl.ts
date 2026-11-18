import type {
  AnatomyCardinality,
  AnatomyClaimDecl,
  AnatomyFamily,
  AnatomyFamilyDecl,
  AnatomyQueryOptions,
  AnatomyPartView,
  Prototype,
  MountPhase,
  ProtoPhase,
  Unsubscribe,
  CapsVaultView,
} from '@proto.ui/core';
import { illegalPhase } from '@proto.ui/core';
import { ModuleBase } from '@proto.ui/module-base';
import type { ExposePort } from '@proto.ui/module-expose';

import {
  ANATOMY_GET_PROTO_CAP,
  ANATOMY_INSTANCE_TOKEN_CAP,
  ANATOMY_ORDER_OBSERVER_CAP,
  ANATOMY_PARENT_CAP,
  ANATOMY_ROOT_TARGET_CAP,
  type AnatomyInstanceToken,
  type AnatomyOrderObserver,
  type AnatomyParentGetter,
  type AnatomyPrototypeGetter,
  type AnatomyRootTarget,
  type AnatomyRootTargetGetter,
} from './caps';
import { ANATOMY_ERROR, anatomyError } from './error';
import type {
  AnatomyDiagnostic,
  AnatomyOrderCallbackDispatcher,
  AnatomyOrderChangeCb,
  AnatomyOrderCallbackCtx,
} from './types';

type HookTraceEntry = { name?: string };

type RoleState = {
  cardinality: AnatomyCardinality;
  requires: readonly { kind: 'hook'; name: string }[];
};

type NormalizedProfile = {
  name: string;
  roles: Record<string, RoleState>;
  relations: Array<{ kind: 'contains'; parent: string; child: string }>;
};

type NormalizedFamily = {
  roles: Record<string, RoleState>;
  relations: Array<{ kind: 'contains'; parent: string; child: string }>;
  profiles: Record<string, NormalizedProfile>;
};

type ClaimRecord = {
  readonly orderId: number;
  readonly instance: AnatomyInstanceToken;
  family: AnatomyFamily;
  readonly role: string;
  profile?: string;
  prototype: Prototype<any> | null;
  exposePort: ExposePort;
  getRootTarget: AnatomyRootTargetGetter;
  getParent: AnatomyParentGetter | null;
  invoke: AnatomyOrderCallbackDispatcher;
};

type OrderSignature = { value: string; claims: readonly number[] | null };
const MISSING_ORDER_SIGNATURE: OrderSignature = { value: 'missing-domain', claims: null };

// Share reads only within one synchronous notification. A parent-getter identity
// identifies one logical host tree; independent bridges must not share domains.
// Each recipient still resolves its own current root and reads current targets.
// No cached read survives a notification or an author callback.
type OrderComparisons = Map<
  AnatomyRootTarget,
  {
    compare: NonNullable<AnatomyRootTarget['compareDocumentPosition']>;
    positions: Map<AnatomyRootTarget, number>;
  }
>;
type DomainClaims = Map<AnatomyInstanceToken, ClaimRecord[]>;
type OrderSnapshot = {
  targets: readonly (AnatomyRootTarget | null)[];
  comparators: readonly AnatomyRootTarget['compareDocumentPosition'][];
  ordered: ClaimRecord[];
  signatureClaims?: readonly number[];
};
type OrderNotificationReads = {
  comparisons: OrderComparisons;
  domains: Map<AnatomyParentGetter, DomainClaims>;
  orders: Map<ClaimRecord[], OrderSnapshot>;
};

function readOrderInputs<Item, Value>(
  items: readonly Item[],
  read: (item: Item) => Value,
  previous?: readonly Value[]
): readonly Value[] {
  if (previous?.length !== items.length) return items.map(read);
  let next: Value[] | undefined;
  for (let index = 0; index < items.length; index++) {
    const value = read(items[index]!);
    if (!next && value !== previous[index]) next = previous.slice(0, index);
    next?.push(value);
  }
  return next ?? previous;
}

const CLAIM_BY_PART_VIEW = new WeakMap<AnatomyPartView, ClaimRecord>();

const ORDER_FOLLOWING = typeof Node !== 'undefined' ? Node.DOCUMENT_POSITION_FOLLOWING : 4;
const ORDER_PRECEDING = typeof Node !== 'undefined' ? Node.DOCUMENT_POSITION_PRECEDING : 2;

const CENTER = (() => {
  const families = new Map<AnatomyFamily, NormalizedFamily>();
  const claimsByInstance = new Map<AnatomyInstanceToken, Map<AnatomyFamily, ClaimRecord>>();
  // Reuse the instance registration order until a claim in that family changes.
  const claimsByFamily = new Map<AnatomyFamily, readonly ClaimRecord[]>();
  // A terminal owner can be disposed before its framework descendants. Keep
  // only its logical boundary (not its claim/exposes) while live claims still
  // traverse it, so those descendants cannot briefly join an outer domain.
  const retiredBoundaries = new Map<AnatomyFamily, Set<AnatomyInstanceToken>>();
  const pruneRetiredBoundaries = (family: AnatomyFamily) => {
    const retired = retiredBoundaries.get(family);
    if (!retired) return;
    const needed = new Set<AnatomyInstanceToken>();
    for (const [instance, claims] of claimsByInstance) {
      const claim = claims.get(family);
      if (!claim) continue;
      // Different renderer connections may carry independent logical trees.
      // A foreign disposer cannot interpret or retire this claim's ancestry.
      const getParent = claim.getParent;
      // No known logical bridge is uncertainty, not evidence that a retired
      // boundary is unused. Keep boundaries until this claim acquires caps.
      if (!getParent) return;
      let current = getParent(instance);
      const visited = new Set<AnatomyInstanceToken>();
      while (current && !visited.has(current)) {
        visited.add(current);
        if (retired.has(current)) needed.add(current);
        current = getParent(current);
      }
    }
    for (const instance of retired) if (!needed.has(instance)) retired.delete(instance);
    if (!retired.size) retiredBoundaries.delete(family);
  };

  const getClaim = (instance: AnatomyInstanceToken, family: AnatomyFamily) =>
    claimsByInstance.get(instance)?.get(family) ?? null;

  return {
    setFamily(family: AnatomyFamily, def: NormalizedFamily) {
      families.set(family, def);
    },
    getFamily(family: AnatomyFamily) {
      return families.get(family) ?? null;
    },
    setClaim(record: ClaimRecord) {
      const retired = retiredBoundaries.get(record.family);
      retired?.delete(record.instance);
      if (retired?.size === 0) retiredBoundaries.delete(record.family);
      let byFamily = claimsByInstance.get(record.instance);
      if (!byFamily) {
        byFamily = new Map();
        claimsByInstance.set(record.instance, byFamily);
      }
      byFamily.set(record.family, record);
      claimsByFamily.delete(record.family);
    },
    getClaim,
    isRetiredBoundary: (instance: AnatomyInstanceToken, family: AnatomyFamily) =>
      retiredBoundaries.get(family)?.has(instance) ?? false,
    pruneRetiredBoundaries,
    retireClaims(instance: AnatomyInstanceToken, families: readonly AnatomyFamily[]) {
      const byFamily = claimsByInstance.get(instance);
      if (!byFamily) return;
      for (const family of families) {
        if (!byFamily.has(family)) continue;
        let retired = retiredBoundaries.get(family);
        if (!retired) retiredBoundaries.set(family, (retired = new Set()));
        retired.add(instance);
        byFamily.delete(family);
        claimsByFamily.delete(family);
      }
      if (byFamily.size === 0) claimsByInstance.delete(instance);
      for (const family of families) pruneRetiredBoundaries(family);
    },
    listClaims(family: AnatomyFamily): readonly ClaimRecord[] {
      const cached = claimsByFamily.get(family);
      if (cached) return cached;
      const out: ClaimRecord[] = [];
      for (const byFamily of claimsByInstance.values()) {
        const claim = byFamily.get(family);
        if (claim) out.push(claim);
      }
      claimsByFamily.set(family, out);
      return out;
    },
  };
})();

function cloneCardinality(cardinality: AnatomyCardinality): AnatomyCardinality {
  return { min: cardinality.min, max: cardinality.max };
}

function normalizeCardinality(
  cardinality: Partial<AnatomyCardinality> | AnatomyCardinality
): AnatomyCardinality {
  const min = cardinality.min;
  const max = cardinality.max;
  if (typeof min !== 'number' || Number.isNaN(min) || min < 0) {
    throw anatomyError(ANATOMY_ERROR.FAMILY_INVALID, `[Anatomy] invalid cardinality.min`);
  }
  if (max !== '*' && (typeof max !== 'number' || Number.isNaN(max) || max < min)) {
    throw anatomyError(ANATOMY_ERROR.FAMILY_INVALID, `[Anatomy] invalid cardinality.max`);
  }
  return { min, max };
}

function compareCardinalityMax(a: number | '*', b: number | '*'): number {
  if (a === b) return 0;
  if (a === '*') return 1;
  if (b === '*') return -1;
  return a - b;
}

function exceedsCardinalityMax(count: number, max: number | '*'): boolean {
  return max !== '*' && count > max;
}

function normalizeRequires(
  requires?: readonly { kind: 'hook'; name: string }[]
): readonly { kind: 'hook'; name: string }[] {
  if (!requires) return [];
  for (const req of requires) {
    if (req?.kind !== 'hook' || typeof req.name !== 'string' || req.name.length === 0) {
      throw anatomyError(ANATOMY_ERROR.FAMILY_INVALID, `[Anatomy] invalid requirement`);
    }
  }
  return requires.slice();
}

function normalizeFamily(decl: AnatomyFamilyDecl): NormalizedFamily {
  const roles: Record<string, RoleState> = {};
  for (const [role, roleDecl] of Object.entries(decl.roles ?? {})) {
    roles[role] = {
      cardinality: normalizeCardinality(roleDecl.cardinality),
      requires: normalizeRequires(roleDecl.requires),
    };
  }

  const relations = (decl.relations ?? []).map((it) => ({
    kind: 'contains' as const,
    parent: it.parent,
    child: it.child,
  }));

  const profiles: Record<string, NormalizedProfile> = {};
  for (const [name, profileDecl] of Object.entries(decl.profiles ?? {})) {
    const nextRoles: Record<string, RoleState> = {};
    for (const [role, baseRole] of Object.entries(roles)) {
      const patch = profileDecl.roles?.[role];
      const nextCardinality = cloneCardinality(baseRole.cardinality);
      if (patch?.cardinality) {
        if (typeof patch.cardinality.min === 'number') nextCardinality.min = patch.cardinality.min;
        if (typeof patch.cardinality.max === 'number' || patch.cardinality.max === '*') {
          nextCardinality.max = patch.cardinality.max;
        }
      }
      if (
        nextCardinality.min < baseRole.cardinality.min ||
        compareCardinalityMax(nextCardinality.max, baseRole.cardinality.max) > 0
      ) {
        throw anatomyError(
          ANATOMY_ERROR.FAMILY_INVALID,
          `[Anatomy] profile '${name}' cannot relax family cardinality for role '${role}'`
        );
      }
      nextRoles[role] = {
        cardinality: normalizeCardinality(nextCardinality),
        requires: [...baseRole.requires, ...normalizeRequires(patch?.requires)],
      };
    }
    profiles[name] = {
      name,
      roles: nextRoles,
      relations: [...relations, ...((profileDecl.relations ?? []) as any)],
    };
  }

  return { roles, relations, profiles };
}

function getHookNames(proto: Prototype<any> | null): Set<string> {
  const trace = (proto as any)?.__asHooks as HookTraceEntry[] | undefined;
  const names = new Set<string>();
  if (!Array.isArray(trace)) return names;
  for (const entry of trace) {
    if (typeof entry?.name === 'string' && entry.name) names.add(entry.name);
  }
  return names;
}

type TargetListenerScope = { lastDomain: AnatomyInstanceToken | null };

export class AnatomyModuleImpl extends ModuleBase {
  private static nextInstanceOrder = 0;
  private static nextClaimOrderId = 0;
  private static readonly orderSubscribers = new Map<AnatomyFamily, AnatomyModuleImpl[]>();
  private static readonly targetSubscribers = new Map<AnatomyFamily, AnatomyModuleImpl[]>();
  private static readonly scopedTargetSubscriberCounts = new Map<AnatomyFamily, number>();
  private static readonly sharedOrderObservers = new Map<
    AnatomyFamily,
    Map<AnatomyInstanceToken, { off: Unsubscribe; listeners: Set<AnatomyModuleImpl> }>
  >();

  private readonly prototypeName: string;
  private readonly exposePort: ExposePort;
  private readonly instanceOrder = AnatomyModuleImpl.nextInstanceOrder++;
  private disposed = false;
  private claimFamilies = new Set<AnatomyFamily>();
  private claimedInstance: AnatomyInstanceToken | undefined;
  private orderDispatch: AnatomyOrderCallbackDispatcher = (fn) => fn(undefined);
  private orderListeners = new Map<AnatomyFamily, Set<AnatomyOrderChangeCb>>();
  private targetListeners = new Map<
    AnatomyFamily,
    Map<AnatomyOrderChangeCb, TargetListenerScope | null>
  >();
  private publishedTargetDomains = new Map<AnatomyFamily, AnatomyInstanceToken>();
  private observedOrderRoots = new Map<AnatomyFamily, AnatomyInstanceToken>();
  private orderVersionByFamily = new Map<AnatomyFamily, number>();
  private orderSignatureByFamily = new Map<AnatomyFamily, OrderSignature>();
  private objectIds = new WeakMap<object, number>();
  private primitiveIds = new Map<unknown, number>();
  private nextIdentityId = 1;

  constructor(caps: CapsVaultView, prototypeName: string, exposePort: ExposePort) {
    super(caps);
    this.prototypeName = prototypeName;
    this.exposePort = exposePort;
  }

  private ensureFamilyRegistered(family: AnatomyFamily): NormalizedFamily {
    const existing = CENTER.getFamily(family);
    if (existing) return existing;
    const normalized = normalizeFamily(family.decl);
    CENTER.setFamily(family, normalized);
    return normalized;
  }

  claim(family: AnatomyFamily, decl: AnatomyClaimDecl): void {
    this.ensureSetup('def.anatomy.claim');

    const familyDef = this.ensureFamilyRegistered(family);
    if (!familyDef.roles[decl.role]) {
      throw anatomyError(
        ANATOMY_ERROR.CLAIM_INVALID,
        `[Anatomy] unknown role '${decl.role}' in family '${family.debugName}'`
      );
    }
    if (decl.profile && decl.role !== 'root') {
      throw anatomyError(
        ANATOMY_ERROR.CLAIM_INVALID,
        `[Anatomy] only root claim may specify profile`
      );
    }
    if (decl.profile && !familyDef.profiles[decl.profile]) {
      throw anatomyError(
        ANATOMY_ERROR.CLAIM_INVALID,
        `[Anatomy] unknown profile '${decl.profile}' in family '${family.debugName}'`
      );
    }

    const instance = this.getSelfToken();
    if (CENTER.getClaim(instance, family)) {
      throw anatomyError(
        ANATOMY_ERROR.CLAIM_INVALID,
        `[Anatomy] duplicate claim for family '${family.debugName}'`
      );
    }

    CENTER.setClaim({
      orderId: AnatomyModuleImpl.nextClaimOrderId++,
      instance,
      family,
      role: decl.role,
      profile: decl.profile,
      prototype: this.getPrototypeGetter()(instance),
      exposePort: this.exposePort,
      getRootTarget: this.getRootTargetGetter(),
      getParent: this.caps.has(ANATOMY_PARENT_CAP) ? this.getParentGetter() : null,
      invoke: (fn) => this.orderDispatch(fn),
    });
    this.claimedInstance = instance;
    this.claimFamilies.add(family);
  }

  has(family: AnatomyFamily, role: string): boolean {
    this.ensureRuntime('run.anatomy.has');
    return (this.partsOf(family, role) ?? []).length > 0;
  }

  subscribeParts(
    family: AnatomyFamily,
    role: string,
    cb: (ctx: AnatomyOrderCallbackCtx, parts: readonly AnatomyPartView[]) => void
  ): Unsubscribe {
    this.ensureSetup('def.anatomy.subscribeParts');
    const readOrderedRole = () => {
      const domain = this.resolveCurrentDomain(family, false);
      return domain.rootInstance
        ? this.sortClaims(domain.claims.filter((claim) => claim.role === role))
        : null;
    };
    const signature = (claims: ClaimRecord[] | null) =>
      claims?.map((claim) => this.getIdentityId(claim.instance)).join('|') ?? 'missing-domain';
    let previousSignature = signature(readOrderedRole());
    const unsubscribe = this.subscribeOrder(family, (ctx) => {
      const claims = readOrderedRole();
      const nextSignature = signature(claims);
      if (nextSignature === previousSignature) return;
      previousSignature = nextSignature;
      cb(ctx, claims?.map((claim) => this.toPartView(claim)) ?? []);
    });
    return () => {
      this.ensureSetup('def.anatomy.subscribeParts.unsubscribe');
      unsubscribe();
    };
  }

  parts(family: AnatomyFamily, options?: AnatomyQueryOptions): readonly AnatomyPartView[] | null {
    this.ensureRuntime('run.anatomy.parts');
    if (options?.missing === 'null') return this.tryParts(family);
    if (options?.missing === 'empty') return this.tryParts(family) ?? [];
    const domain = this.resolveCurrentDomain(family);
    return domain.claims.map((claim) => this.toPartView(claim));
  }

  tryParts(family: AnatomyFamily): readonly AnatomyPartView[] | null {
    const domain = this.resolveCurrentDomain(family, false);
    if (!domain.rootInstance) return null;
    return domain.claims.map((claim) => this.toPartView(claim));
  }

  partsOf(
    family: AnatomyFamily,
    role: string,
    options?: AnatomyQueryOptions
  ): readonly AnatomyPartView[] | null {
    this.ensureRuntime('run.anatomy.partsOf');
    if (options?.missing === 'null') return this.tryOrderedPartsOf(family, role);
    if (options?.missing === 'empty') return this.tryOrderedPartsOf(family, role) ?? [];
    const domain = this.resolveCurrentDomain(family);
    return domain.claims
      .filter((claim) => claim.role === role)
      .map((claim) => this.toPartView(claim));
  }

  orderedParts(
    family: AnatomyFamily,
    options?: AnatomyQueryOptions
  ): readonly AnatomyPartView[] | null {
    this.ensureRuntime('run.anatomy.order.parts');
    if (options?.missing === 'null') return this.tryOrderedParts(family);
    if (options?.missing === 'empty') return this.tryOrderedParts(family) ?? [];
    return this.orderedPartsInternal(family);
  }

  tryOrderedParts(family: AnatomyFamily): readonly AnatomyPartView[] | null {
    const domain = this.resolveCurrentDomain(family, false);
    if (!domain.rootInstance) return null;
    return this.sortClaims(domain.claims).map((claim) => this.toPartView(claim));
  }

  orderVersion(family: AnatomyFamily, options?: AnatomyQueryOptions): number | null {
    this.ensureRuntime('run.anatomy.order.version');
    if (options?.missing === 'null') return this.tryOrderVersion(family);
    return this.getOrderVersion(family);
  }

  tryOrderVersion(family: AnatomyFamily): number | null {
    const domain = this.resolveCurrentDomain(family, false);
    if (!domain.rootInstance) return null;
    this.primeOrderSignature(family);
    return this.orderVersionByFamily.get(family) ?? 0;
  }

  orderedPartsOf(
    family: AnatomyFamily,
    role: string,
    options?: AnatomyQueryOptions
  ): readonly AnatomyPartView[] | null {
    this.ensureRuntime('run.anatomy.order.partsOf');
    if (options?.missing === 'null') return this.tryOrderedPartsOf(family, role);
    if (options?.missing === 'empty') return this.tryOrderedPartsOf(family, role) ?? [];
    return this.orderedPartsOfInternal(family, role);
  }

  tryOrderedPartsOf(family: AnatomyFamily, role: string): readonly AnatomyPartView[] | null {
    const domain = this.resolveCurrentDomain(family, false);
    if (!domain.rootInstance) return null;
    return this.sortClaims(domain.claims.filter((claim) => claim.role === role)).map((claim) =>
      this.toPartView(claim)
    );
  }

  indexOfSelf(family: AnatomyFamily, role: string, options?: AnatomyQueryOptions): number | null {
    this.ensureRuntime('run.anatomy.order.indexOfSelf');
    if (options?.missing === 'null') return this.tryIndexOfSelf(family, role);
    return this.indexOfSelfInternal(family, role);
  }

  tryIndexOfSelf(family: AnatomyFamily, role: string): number | null {
    const domain = this.resolveCurrentDomain(family, false);
    if (!domain.rootInstance) return null;
    const self = this.getSelfToken();
    const claims = this.sortClaims(domain.claims.filter((claim) => claim.role === role));
    return claims.findIndex((claim) => claim.instance === self);
  }

  prevOfSelf(
    family: AnatomyFamily,
    role: string,
    options?: AnatomyQueryOptions
  ): AnatomyPartView | null {
    this.ensureRuntime('run.anatomy.order.prevOfSelf');
    if (options?.missing === 'null') return this.tryPrevOfSelf(family, role);
    return this.prevOfSelfInternal(family, role);
  }

  tryPrevOfSelf(family: AnatomyFamily, role: string): AnatomyPartView | null {
    const domain = this.resolveCurrentDomain(family, false);
    if (!domain.rootInstance) return null;
    const self = this.getSelfToken();
    const claims = this.sortClaims(domain.claims.filter((claim) => claim.role === role));
    const index = claims.findIndex((claim) => claim.instance === self);
    if (index <= 0) return null;
    return this.toPartView(claims[index - 1]!);
  }

  nextOfSelf(
    family: AnatomyFamily,
    role: string,
    options?: AnatomyQueryOptions
  ): AnatomyPartView | null {
    this.ensureRuntime('run.anatomy.order.nextOfSelf');
    if (options?.missing === 'null') return this.tryNextOfSelf(family, role);
    return this.nextOfSelfInternal(family, role);
  }

  tryNextOfSelf(family: AnatomyFamily, role: string): AnatomyPartView | null {
    const domain = this.resolveCurrentDomain(family, false);
    if (!domain.rootInstance) return null;
    const self = this.getSelfToken();
    const claims = this.sortClaims(domain.claims.filter((claim) => claim.role === role));
    const index = claims.findIndex((claim) => claim.instance === self);
    if (index < 0 || index >= claims.length - 1) return null;
    return this.toPartView(claims[index + 1]!);
  }

  descendantsOf(
    family: AnatomyFamily,
    ancestor: AnatomyPartView,
    role: string
  ): readonly AnatomyPartView[] {
    this.ensureRuntime('run.anatomy.descendantsOf');
    return this.port.descendantsOf(family, ancestor, role);
  }

  readonly port = {
    syncStructure: (): void => {
      for (const family of this.claimFamilies) {
        CENTER.pruneRetiredBoundaries(family);
        AnatomyModuleImpl.notifyStructuralChange(family);
        this.notifyTargetChange(family);
      }
    },
    getDiagnostics: (): readonly AnatomyDiagnostic[] => {
      const out: AnatomyDiagnostic[] = [];
      for (const family of this.claimFamilies) {
        out.push(...this.computeDiagnostics(family));
      }
      return out;
    },
    isCurrentPart: (family: AnatomyFamily, part: AnatomyPartView): boolean => {
      const claim = CLAIM_BY_PART_VIEW.get(part);
      if (!claim || claim.family !== family) return false;
      return this.findCurrentPartRoot(family, claim) !== null;
    },
    resolvePartTarget: (part: AnatomyPartView): unknown | null => {
      const claim = CLAIM_BY_PART_VIEW.get(part);
      return claim?.getRootTarget(claim.instance) ?? null;
    },
    resolvePartInstance: (part: AnatomyPartView): unknown | null =>
      CLAIM_BY_PART_VIEW.get(part)?.instance ?? null,
    resolveSelfInstance: (): unknown => this.getSelfToken(),
    resolveSelfRole: (family: AnatomyFamily): string | null =>
      this.caps.has(ANATOMY_INSTANCE_TOKEN_CAP)
        ? (CENTER.getClaim(this.getSelfToken(), family)?.role ?? null)
        : null,
    resolveAncestorInstance: (
      family: AnatomyFamily,
      part: AnatomyPartView,
      role: string
    ): unknown | null => {
      const claim = CLAIM_BY_PART_VIEW.get(part);
      if (!claim || claim.family !== family) return null;
      const root = this.findCurrentPartRoot(family, claim);
      if (!root) return null;
      const getParent = this.getParentGetter();
      let current = getParent(claim.instance);
      while (current) {
        const ancestor = CENTER.getClaim(current, family);
        if (ancestor?.role === role) return current;
        if (current === root) return null;
        current = getParent(current);
      }
      return null;
    },
    resolveDomainScope: (family: AnatomyFamily): unknown | null =>
      this.caps.has(ANATOMY_INSTANCE_TOKEN_CAP)
        ? this.findDomainRoot(this.getSelfToken(), family)
        : null,
    descendantsOf: (
      family: AnatomyFamily,
      ancestor: AnatomyPartView,
      role: string
    ): readonly AnatomyPartView[] => {
      const ancestorClaim = CLAIM_BY_PART_VIEW.get(ancestor);
      if (!ancestorClaim || ancestorClaim.family !== family) return [];
      const domain = this.resolveCurrentDomain(family, false);
      if (!domain.rootInstance || !domain.claims.includes(ancestorClaim)) return [];
      const getParent = this.getParentGetter();
      return this.sortClaims(
        domain.claims.filter((claim) => {
          if (claim.role !== role) return false;
          let current = getParent(claim.instance);
          while (current) {
            if (current === ancestorClaim.instance) return true;
            if (current === domain.rootInstance) return false;
            current = getParent(current);
          }
          return false;
        })
      ).map((claim) => this.toPartView(claim));
    },
    parts: (family: AnatomyFamily, options?: AnatomyQueryOptions) => {
      if (options?.missing === 'null') return this.tryParts(family);
      if (options?.missing === 'empty') return this.tryParts(family) ?? [];
      const domain = this.resolveCurrentDomain(family);
      return domain.claims.map((claim) => this.toPartView(claim));
    },
    order: {
      version: (family: AnatomyFamily, options?: AnatomyQueryOptions) => {
        if (options?.missing === 'null') return this.tryOrderVersion(family);
        return this.getOrderVersion(family);
      },
      parts: (family: AnatomyFamily, options?: AnatomyQueryOptions) => {
        if (options?.missing === 'null') return this.tryOrderedParts(family);
        if (options?.missing === 'empty') return this.tryOrderedParts(family) ?? [];
        return this.orderedPartsInternal(family);
      },
      partsOf: (family: AnatomyFamily, role: string, options?: AnatomyQueryOptions) => {
        if (options?.missing === 'null') return this.tryOrderedPartsOf(family, role);
        if (options?.missing === 'empty') return this.tryOrderedPartsOf(family, role) ?? [];
        return this.orderedPartsOfInternal(family, role);
      },
      indexOfSelf: (family: AnatomyFamily, role: string, options?: AnatomyQueryOptions) => {
        if (options?.missing === 'null') return this.tryIndexOfSelf(family, role);
        return this.indexOfSelfInternal(family, role);
      },
      prevOfSelf: (family: AnatomyFamily, role: string, options?: AnatomyQueryOptions) => {
        if (options?.missing === 'null') return this.tryPrevOfSelf(family, role);
        return this.prevOfSelfInternal(family, role);
      },
      nextOfSelf: (family: AnatomyFamily, role: string, options?: AnatomyQueryOptions) => {
        if (options?.missing === 'null') return this.tryNextOfSelf(family, role);
        return this.nextOfSelfInternal(family, role);
      },
      tryVersion: (family: AnatomyFamily) => {
        const domain = this.resolveCurrentDomain(family, false);
        if (!domain.rootInstance) return null;
        this.primeOrderSignature(family);
        return this.orderVersionByFamily.get(family) ?? 0;
      },
      tryParts: (family: AnatomyFamily) => {
        const domain = this.resolveCurrentDomain(family, false);
        if (!domain.rootInstance) return null;
        return this.sortClaims(domain.claims).map((claim) => this.toPartView(claim));
      },
      tryPartsOf: (family: AnatomyFamily, role: string) => {
        const domain = this.resolveCurrentDomain(family, false);
        if (!domain.rootInstance) return null;
        return this.sortClaims(domain.claims.filter((claim) => claim.role === role)).map((claim) =>
          this.toPartView(claim)
        );
      },
      tryIndexOfSelf: (family: AnatomyFamily, role: string) => {
        const domain = this.resolveCurrentDomain(family, false);
        if (!domain.rootInstance) return null;
        const self = this.getSelfToken();
        const claims = this.sortClaims(domain.claims.filter((claim) => claim.role === role));
        return claims.findIndex((claim) => claim.instance === self);
      },
      tryPrevOfSelf: (family: AnatomyFamily, role: string) => {
        const domain = this.resolveCurrentDomain(family, false);
        if (!domain.rootInstance) return null;
        const self = this.getSelfToken();
        const claims = this.sortClaims(domain.claims.filter((claim) => claim.role === role));
        const index = claims.findIndex((claim) => claim.instance === self);
        if (index <= 0) return null;
        return this.toPartView(claims[index - 1]!);
      },
      tryNextOfSelf: (family: AnatomyFamily, role: string) => {
        const domain = this.resolveCurrentDomain(family, false);
        if (!domain.rootInstance) return null;
        const self = this.getSelfToken();
        const claims = this.sortClaims(domain.claims.filter((claim) => claim.role === role));
        const index = claims.findIndex((claim) => claim.instance === self);
        if (index < 0 || index >= claims.length - 1) return null;
        return this.toPartView(claims[index + 1]!);
      },
    },
    setOrderCallbackDispatcher: (dispatch: AnatomyOrderCallbackDispatcher) => {
      this.orderDispatch = dispatch;
    },
    subscribeOrder: (family: AnatomyFamily, cb: AnatomyOrderChangeCb) =>
      this.subscribeOrder(family, cb),
    subscribeTargets: (family: AnatomyFamily, cb: AnatomyOrderChangeCb, scope?: 'current-domain') =>
      this.subscribeTargets(family, cb, scope),
  };

  override onProtoPhase(phase: ProtoPhase): void {
    super.onProtoPhase(phase);
    if (phase === 'mounted') {
      this.port.syncStructure();
    }
    if (phase === 'unmounted') {
      for (const family of this.claimFamilies) this.notifyTargetChange(family);
      this.dispose();
    }
  }

  override onMountPhase(phase: MountPhase, epoch: number): void {
    super.onMountPhase(phase, epoch);
    if (phase === 'unmounting' || phase === 'detached') {
      for (const family of this.claimFamilies) this.notifyTargetChange(family, true);
      for (const family of Array.from(this.observedOrderRoots.keys())) {
        this.teardownOrderObserver(family);
      }
      return;
    }
    if (phase === 'mounted') {
      for (const family of this.orderListeners.keys()) this.ensureOrderObserver(family);
      for (const family of this.claimFamilies) this.notifyTargetChange(family, true);
    }
  }

  protected override onCapsEpoch(_epoch: number): void {
    if (this.disposed) return;
    // Keep the last valid logical getter through a view-capability gap.
    // A different token or parent bridge needs family-wide invalidation.
    const hasInstance = this.caps.has(ANATOMY_INSTANCE_TOKEN_CAP);
    const instance = hasInstance ? this.getSelfToken() : this.claimedInstance;
    const parent = this.caps.has(ANATOMY_PARENT_CAP) ? this.getParentGetter() : undefined;
    let retained: Set<AnatomyFamily> | undefined;
    if (instance !== undefined) {
      for (const family of this.claimFamilies) {
        const claim = CENTER.getClaim(instance, family);
        if (!claim) continue;
        if (
          instance === this.claimedInstance &&
          claim.getParent &&
          (parent === undefined || parent === claim.getParent) &&
          AnatomyModuleImpl.scopedTargetSubscriberCounts.has(family)
        )
          (retained ??= new Set()).add(family);
        if (hasInstance && parent) claim.getParent = parent;
      }
    }
    for (const family of this.claimFamilies) this.notifyTargetChange(family, retained?.has(family));
    if (this.mountPhase !== 'mounted') return;
    for (const family of Array.from(this.observedOrderRoots.keys())) {
      this.teardownOrderObserver(family);
    }
    for (const family of this.orderListeners.keys()) this.ensureOrderObserver(family);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const family of this.orderListeners.keys())
      this.removeSubscriber(AnatomyModuleImpl.orderSubscribers, family);
    for (const [family, listeners] of this.targetListeners) {
      this.removeSubscriber(AnatomyModuleImpl.targetSubscribers, family);
      for (const scope of listeners.values()) {
        if (scope) AnatomyModuleImpl.adjustScopedTargetCount(family, -1);
      }
    }
    this.publishedTargetDomains.clear();
    for (const family of this.observedOrderRoots.keys()) {
      this.teardownOrderObserver(family);
    }
    this.observedOrderRoots.clear();
    this.orderListeners.clear();
    this.targetListeners.clear();
    if (this.claimFamilies.size === 0) return;
    if (!this.caps.has(ANATOMY_INSTANCE_TOKEN_CAP)) return;

    const instance = this.caps.get(ANATOMY_INSTANCE_TOKEN_CAP) as AnatomyInstanceToken;
    const families = [...this.claimFamilies];
    this.claimFamilies.clear();
    // Revoke every family before the first callback can inspect another one.
    // Descendant modules retain their own claims until their own terminal path.
    CENTER.retireClaims(instance, families);
    for (const family of families) AnatomyModuleImpl.notifyStructuralChange(family);
  }

  private getOrderedClaimsOf(family: AnatomyFamily, role: string): ClaimRecord[] {
    const domain = this.resolveCurrentDomain(family);
    return this.sortClaims(domain.claims.filter((claim) => claim.role === role));
  }

  private orderedPartsInternal(family: AnatomyFamily): readonly AnatomyPartView[] {
    const domain = this.resolveCurrentDomain(family);
    return this.sortClaims(domain.claims).map((claim) => this.toPartView(claim));
  }

  private orderedPartsOfInternal(family: AnatomyFamily, role: string): readonly AnatomyPartView[] {
    return this.getOrderedClaimsOf(family, role).map((claim) => this.toPartView(claim));
  }

  private indexOfSelfInternal(family: AnatomyFamily, role: string): number {
    const self = this.getSelfToken();
    const claims = this.getOrderedClaimsOf(family, role);
    return claims.findIndex((claim) => claim.instance === self);
  }

  private prevOfSelfInternal(family: AnatomyFamily, role: string): AnatomyPartView | null {
    const self = this.getSelfToken();
    const claims = this.getOrderedClaimsOf(family, role);
    const index = claims.findIndex((claim) => claim.instance === self);
    if (index <= 0) return null;
    return this.toPartView(claims[index - 1]!);
  }

  private nextOfSelfInternal(family: AnatomyFamily, role: string): AnatomyPartView | null {
    const self = this.getSelfToken();
    const claims = this.getOrderedClaimsOf(family, role);
    const index = claims.findIndex((claim) => claim.instance === self);
    if (index < 0 || index >= claims.length - 1) return null;
    return this.toPartView(claims[index + 1]!);
  }

  private subscribeOrder(family: AnatomyFamily, cb: AnatomyOrderChangeCb): Unsubscribe {
    let set = this.orderListeners.get(family);
    if (!set) {
      set = new Set();
      this.orderListeners.set(family, set);
      this.addSubscriber(AnatomyModuleImpl.orderSubscribers, family);
    }
    set.add(cb);
    this.primeOrderSignature(family);
    this.ensureOrderObserver(family);
    return () => {
      const current = this.orderListeners.get(family);
      current?.delete(cb);
      if (!current || current.size > 0) return;
      this.orderListeners.delete(family);
      this.removeSubscriber(AnatomyModuleImpl.orderSubscribers, family);
      this.teardownOrderObserver(family);
    };
  }

  private static adjustScopedTargetCount(family: AnatomyFamily, change: number): void {
    const count = (this.scopedTargetSubscriberCounts.get(family) ?? 0) + change;
    if (count) this.scopedTargetSubscriberCounts.set(family, count);
    else this.scopedTargetSubscriberCounts.delete(family);
  }

  private subscribeTargets(
    family: AnatomyFamily,
    cb: AnatomyOrderChangeCb,
    scope?: 'current-domain'
  ): Unsubscribe {
    if (this.disposed) return () => {};
    let listeners = this.targetListeners.get(family);
    if (!listeners) {
      listeners = new Map();
      this.targetListeners.set(family, listeners);
      this.addSubscriber(AnatomyModuleImpl.targetSubscribers, family);
    }
    if (!listeners.has(cb)) {
      const scoped = scope === 'current-domain' ? { lastDomain: null } : null;
      listeners.set(cb, scoped);
      if (scoped) AnatomyModuleImpl.adjustScopedTargetCount(family, 1);
    }
    return () => {
      const current = this.targetListeners.get(family);
      if (!current) return;
      const scoped = current.get(cb);
      if (!current.delete(cb)) return;
      if (scoped) AnatomyModuleImpl.adjustScopedTargetCount(family, -1);
      if (!current.size) {
        this.targetListeners.delete(family);
        this.removeSubscriber(AnatomyModuleImpl.targetSubscribers, family);
      }
    };
  }

  // Family publication must not inspect every unrelated Runtime owner. Keep
  // only subscribed owners, ordered by creation rather than subscription time.
  // Resume by owner order if a callback moves or removes the current cursor.
  private static subscriberAfter(owners: readonly AnatomyModuleImpl[], order: number): number {
    let start = 0;
    let end = owners.length;
    while (start < end) {
      const middle = start + Math.floor((end - start) / 2);
      if (owners[middle]!.instanceOrder <= order) start = middle + 1;
      else end = middle;
    }
    return start;
  }

  private addSubscriber(
    index: Map<AnatomyFamily, AnatomyModuleImpl[]>,
    family: AnatomyFamily
  ): void {
    if (this.disposed) return;
    let owners = index.get(family);
    if (!owners) index.set(family, (owners = []));
    owners.splice(AnatomyModuleImpl.subscriberAfter(owners, this.instanceOrder), 0, this);
  }

  private removeSubscriber(
    index: Map<AnatomyFamily, AnatomyModuleImpl[]>,
    family: AnatomyFamily
  ): void {
    const owners = index.get(family);
    if (!owners) return;
    const position = AnatomyModuleImpl.subscriberAfter(owners, this.instanceOrder) - 1;
    if (owners[position] === this) owners.splice(position, 1);
    if (owners.length === 0) index.delete(family);
  }

  private static *subscribers(
    index: Map<AnatomyFamily, AnatomyModuleImpl[]>,
    family: AnatomyFamily
  ): Iterable<AnatomyModuleImpl> {
    let previous: AnatomyModuleImpl | undefined;
    let position = 0;
    let owners = index.get(family);
    while (owners) {
      if (previous && owners[position - 1] !== previous)
        position = this.subscriberAfter(owners, previous.instanceOrder);
      const next = owners[position];
      if (!next) return;
      previous = next;
      position++;
      yield next;
      // Subscriber mutations are in place until the list is emptied. A
      // callback can then create a new list for the same family.
      if (!owners.length) owners = index.get(family);
    }
  }

  private static notifyStructuralChange(family: AnatomyFamily): void {
    const reads: OrderNotificationReads = {
      comparisons: new Map(),
      domains: new Map(),
      orders: new Map(),
    };
    for (const impl of this.subscribers(this.orderSubscribers, family)) {
      impl.emitOrderChangeIfNeeded(family, reads);
    }
  }

  private readTargetDomain(family: AnatomyFamily): AnatomyInstanceToken | null {
    try {
      const hasInstance = this.caps.has(ANATOMY_INSTANCE_TOKEN_CAP);
      const hasParent = this.caps.has(ANATOMY_PARENT_CAP);
      if (hasInstance && hasParent) return this.findDomainRoot(this.getSelfToken(), family);
      const instance = this.claimedInstance;
      if (instance === undefined || (hasInstance && this.getSelfToken() !== instance)) return null;
      const retained = CENTER.getClaim(instance, family)?.getParent;
      if (!retained || (hasParent && this.getParentGetter() !== retained)) return null;
      return this.findDomainRoot(instance, family, retained);
    } catch {
      // A domain must be proven to narrow delivery; keep the original callback path.
      return null;
    }
  }

  private canSkipTargetListeners(
    family: AnatomyFamily,
    source: AnatomyInstanceToken,
    listeners: Map<AnatomyOrderChangeCb, TargetListenerScope | null>
  ): boolean {
    const last = listeners.values().next().value?.lastDomain;
    if (!last || last === source) return false;
    for (const scope of listeners.values()) {
      if (scope?.lastDomain !== last) return false;
    }
    return this.readTargetDomain(family) === last;
  }

  private notifyTargetChange(family: AnatomyFamily, mayNarrow = false): void {
    const current = AnatomyModuleImpl.scopedTargetSubscriberCounts.has(family)
      ? this.readTargetDomain(family)
      : null;
    let stableSource =
      mayNarrow && current === this.publishedTargetDomains.get(family) ? current : null;
    if (current) this.publishedTargetDomains.set(family, current);
    else this.publishedTargetDomains.delete(family);
    for (const impl of AnatomyModuleImpl.subscribers(AnatomyModuleImpl.targetSubscribers, family)) {
      const listeners = impl.targetListeners.get(family);
      if (!listeners?.size) continue;
      if (stableSource && impl.canSkipTargetListeners(family, stableSource, listeners)) continue;
      impl.orderDispatch((ctx) => {
        for (const [listener, scope] of listeners) {
          const domain = scope ? impl.readTargetDomain(family) : null;
          if (
            scope &&
            stableSource &&
            domain &&
            domain !== stableSource &&
            domain === scope.lastDomain
          )
            continue;
          listener(ctx);
          if (scope) scope.lastDomain = domain;
          // A callback may move the publisher while later recipients are still waiting.
          if (stableSource && this.readTargetDomain(family) !== stableSource) {
            stableSource = null;
            this.publishedTargetDomains.delete(family);
          }
        }
      });
    }
  }

  private ensureOrderObserver(family: AnatomyFamily): void {
    if (this.mountPhase !== 'mounted') return;
    if (this.observedOrderRoots.has(family)) return;
    if (!this.caps.has(ANATOMY_ORDER_OBSERVER_CAP)) return;

    const rootInstance = this.findDomainRoot(this.getSelfToken(), family);
    if (!rootInstance) return;
    const target = CENTER.getClaim(rootInstance, family)?.getRootTarget(rootInstance);
    if (!target) return;

    let byRoot = AnatomyModuleImpl.sharedOrderObservers.get(family);
    if (!byRoot) {
      byRoot = new Map();
      AnatomyModuleImpl.sharedOrderObservers.set(family, byRoot);
    }

    let entry = byRoot.get(rootInstance);
    if (!entry) {
      const observer = this.caps.get(ANATOMY_ORDER_OBSERVER_CAP) as AnatomyOrderObserver;
      const listeners = new Set<AnatomyModuleImpl>();
      const off = observer(target, () => {
        const reads: OrderNotificationReads = {
          comparisons: new Map(),
          domains: new Map(),
          orders: new Map(),
        };
        for (const impl of listeners) {
          impl.emitOrderChangeIfNeeded(family, reads);
        }
      });
      entry = { off, listeners };
      byRoot.set(rootInstance, entry);
    }

    entry.listeners.add(this);
    this.observedOrderRoots.set(family, rootInstance);
  }

  private teardownOrderObserver(family: AnatomyFamily): void {
    const rootInstance = this.observedOrderRoots.get(family);
    if (!rootInstance) return;
    this.observedOrderRoots.delete(family);

    const byRoot = AnatomyModuleImpl.sharedOrderObservers.get(family);
    const entry = byRoot?.get(rootInstance);
    if (!entry) return;

    entry.listeners.delete(this);
    if (entry.listeners.size > 0) return;

    entry.off();
    byRoot?.delete(rootInstance);
    if (byRoot && byRoot.size === 0) {
      AnatomyModuleImpl.sharedOrderObservers.delete(family);
    }
  }

  private primeOrderSignature(family: AnatomyFamily): void {
    if (this.orderSignatureByFamily.has(family)) return;
    const signature = this.computeOrderSignature(family);
    this.orderSignatureByFamily.set(family, signature);
    this.orderVersionByFamily.set(family, 0);
  }

  private getOrderVersion(family: AnatomyFamily): number {
    this.primeOrderSignature(family);
    return this.orderVersionByFamily.get(family) ?? 0;
  }

  private emitOrderChangeIfNeeded(family: AnatomyFamily, reads?: OrderNotificationReads): void {
    const prev = this.orderSignatureByFamily.get(family);
    const next = this.computeOrderSignature(family, prev, reads);
    if (prev === next) return;

    this.orderSignatureByFamily.set(family, next);
    if (prev?.value === next.value) return;
    const nextVersion = (this.orderVersionByFamily.get(family) ?? 0) + 1;
    this.orderVersionByFamily.set(family, nextVersion);

    const listeners = this.orderListeners.get(family);
    if (!listeners || listeners.size === 0) return;
    // Callback scopes may synchronously reparent, mount or retire claims and
    // move or replace host targets, including through a nested notification.
    // Later recipients must read the resulting structure and order afresh.
    reads?.comparisons.clear();
    reads?.domains.clear();
    reads?.orders.clear();
    try {
      this.orderDispatch((ctx) => {
        for (const listener of listeners) listener(ctx);
      });
    } finally {
      reads?.comparisons.clear();
      reads?.domains.clear();
      reads?.orders.clear();
    }
  }

  private computeOrderSignature(
    family: AnatomyFamily,
    previous?: OrderSignature,
    reads?: OrderNotificationReads
  ): OrderSignature {
    const domain = this.resolveCurrentDomain(family, false, reads?.domains);
    if (!domain.rootInstance) return MISSING_ORDER_SIGNATURE;
    const ordered = this.sortClaims(domain.claims, reads);
    const snapshot = reads?.orders.get(domain.claims);
    const claims = previous?.claims;
    const sharedClaims = snapshot?.signatureClaims;
    // Readers of the same sorted snapshot can retain the same numeric IDs.
    // A reader's signature still owns its own instance identity values.
    if (
      previous &&
      claims &&
      (claims === sharedClaims ||
        (claims.length === ordered.length &&
          ordered.every((claim, index) => claim.orderId === claims[index])))
    ) {
      if (snapshot) {
        snapshot.signatureClaims ??= claims;
        previous.claims = snapshot.signatureClaims;
      }
      return previous;
    }
    const currentClaims = sharedClaims ?? ordered.map((claim) => claim.orderId);
    if (snapshot) snapshot.signatureClaims = currentClaims;
    return {
      value: ordered
        .map((claim) => `${claim.role}:${this.getIdentityId(claim.instance)}`)
        .join('|'),
      claims: currentClaims,
    };
  }

  private getIdentityId(value: unknown): number {
    if (value && typeof value === 'object') {
      const obj = value as object;
      const existing = this.objectIds.get(obj);
      if (existing) return existing;
      const next = this.nextIdentityId++;
      this.objectIds.set(obj, next);
      return next;
    }

    if (this.primitiveIds.has(value)) {
      return this.primitiveIds.get(value)!;
    }
    const next = this.nextIdentityId++;
    this.primitiveIds.set(value, next);
    return next;
  }

  private sortClaims(claims: ClaimRecord[], reads?: OrderNotificationReads): ClaimRecord[] {
    if (claims.length < 2) return claims.slice();
    const cached = reads?.orders.get(claims);
    // Read all targets before their comparators. Unchanged inputs retain the
    // previous arrays and sorted order within this notification.
    const targets = readOrderInputs(
      claims,
      (claim) => claim.getRootTarget(claim.instance),
      cached?.targets
    );
    const comparators =
      reads &&
      readOrderInputs(targets, (target) => target?.compareDocumentPosition, cached?.comparators);
    if (cached && targets === cached.targets && comparators === cached.comparators)
      return cached.ordered;

    const ordered = claims
      .map((_, index) => index)
      .sort((left, right) => {
        const cmp = this.compareTargets(targets[left]!, targets[right]!, reads?.comparisons);
        return cmp || left - right;
      })
      .map((index) => claims[index]!);
    if (reads && comparators) reads.orders.set(claims, { targets, comparators, ordered });
    return ordered;
  }

  private compareTargets(
    aTarget: AnatomyRootTarget | null,
    bTarget: AnatomyRootTarget | null,
    comparisons?: OrderComparisons
  ): number {
    if (!aTarget || !bTarget || aTarget === bTarget) return 0;
    const compare = aTarget.compareDocumentPosition;
    if (typeof compare !== 'function') return 0;

    let entry = comparisons?.get(aTarget);
    if (entry?.compare !== compare) entry = undefined;
    const cached = entry?.positions.get(bTarget);
    if (cached !== undefined) return cached;

    const pos = compare.call(aTarget, bTarget);
    const result = pos & ORDER_FOLLOWING ? -1 : pos & ORDER_PRECEDING ? 1 : 0;
    if (comparisons) {
      if (!entry) comparisons.set(aTarget, (entry = { compare, positions: new Map() }));
      entry.positions.set(bTarget, result);
    }
    return result;
  }

  private computeDiagnostics(family: AnatomyFamily): AnatomyDiagnostic[] {
    const familyDef = CENTER.getFamily(family);
    if (!familyDef) return [];

    const domain = this.resolveCurrentDomain(family, false);
    const claims = domain.claims;
    const profileName = claims.find(
      (claim) => claim.role === 'root' && claim.instance === domain.rootInstance
    )?.profile;
    const diagnostics: AnatomyDiagnostic[] = [];
    const counts = new Map<string, number>();
    for (const claim of claims) counts.set(claim.role, (counts.get(claim.role) ?? 0) + 1);

    for (const [role, roleState] of Object.entries(familyDef.roles)) {
      const count = counts.get(role) ?? 0;
      if (count < roleState.cardinality.min) {
        diagnostics.push({
          level: 'error',
          scope: 'family',
          code: 'ANATOMY_FAMILY_MIN',
          message: `[Anatomy] role '${role}' is below family min in '${family.debugName}'`,
          family,
          role,
        });
      }
      if (exceedsCardinalityMax(count, roleState.cardinality.max)) {
        diagnostics.push({
          level: 'error',
          scope: 'family',
          code: 'ANATOMY_FAMILY_MAX',
          message: `[Anatomy] role '${role}' exceeds family max in '${family.debugName}'`,
          family,
          role,
        });
      }
    }

    for (const claim of claims) {
      const familyRole = familyDef.roles[claim.role];
      for (const req of familyRole?.requires ?? []) {
        if (!getHookNames(claim.prototype).has(req.name)) {
          diagnostics.push({
            level: 'error',
            scope: 'family',
            code: 'ANATOMY_FAMILY_HOOK_REQUIRED',
            message: `[Anatomy] role '${claim.role}' requires hook '${req.name}'`,
            family,
            role: claim.role,
          });
        }
      }
    }

    for (const relation of familyDef.relations) {
      for (const claim of claims.filter((it) => it.role === relation.child)) {
        if (!this.hasAncestorRole(claim.instance, family, relation.parent, domain.rootInstance)) {
          diagnostics.push({
            level: 'error',
            scope: 'family',
            code: 'ANATOMY_FAMILY_RELATION',
            message: `[Anatomy] role '${relation.child}' must be contained by '${relation.parent}'`,
            family,
            role: relation.child,
          });
        }
      }
    }

    if (!profileName) return diagnostics;
    const profile = familyDef.profiles[profileName];
    if (!profile) return diagnostics;

    for (const [role, roleState] of Object.entries(profile.roles)) {
      const count = counts.get(role) ?? 0;
      if (count < roleState.cardinality.min) {
        diagnostics.push({
          level: 'warning',
          scope: 'profile',
          code: 'ANATOMY_PROFILE_MIN',
          message: `[Anatomy] role '${role}' is below profile min in '${family.debugName}/${profileName}'`,
          family,
          role,
          profile: profileName,
        });
      }
      if (exceedsCardinalityMax(count, roleState.cardinality.max)) {
        diagnostics.push({
          level: 'warning',
          scope: 'profile',
          code: 'ANATOMY_PROFILE_MAX',
          message: `[Anatomy] role '${role}' exceeds profile max in '${family.debugName}/${profileName}'`,
          family,
          role,
          profile: profileName,
        });
      }
    }

    for (const claim of claims) {
      const profileRole = profile.roles[claim.role];
      const familyReqNames = new Set(
        (familyDef.roles[claim.role]?.requires ?? []).map((it) => it.name)
      );
      for (const req of profileRole?.requires ?? []) {
        if (familyReqNames.has(req.name)) continue;
        if (!getHookNames(claim.prototype).has(req.name)) {
          diagnostics.push({
            level: 'warning',
            scope: 'profile',
            code: 'ANATOMY_PROFILE_HOOK_REQUIRED',
            message: `[Anatomy] role '${claim.role}' is missing profile hook '${req.name}'`,
            family,
            role: claim.role,
            profile: profileName,
          });
        }
      }
    }

    for (const relation of profile.relations.slice(familyDef.relations.length)) {
      for (const claim of claims.filter((it) => it.role === relation.child)) {
        if (!this.hasAncestorRole(claim.instance, family, relation.parent, domain.rootInstance)) {
          diagnostics.push({
            level: 'warning',
            scope: 'profile',
            code: 'ANATOMY_PROFILE_RELATION',
            message: `[Anatomy] role '${relation.child}' should be contained by '${relation.parent}'`,
            family,
            role: relation.child,
            profile: profileName,
          });
        }
      }
    }

    return diagnostics;
  }

  private resolveCurrentDomain(
    family: AnatomyFamily,
    strict = true,
    domains?: Map<AnatomyParentGetter, DomainClaims>
  ): {
    rootInstance: AnatomyInstanceToken | null;
    claims: ClaimRecord[];
  } {
    const instance = this.getSelfToken();
    const getParent = this.getParentGetter();
    const rootInstance = this.findDomainRoot(instance, family, getParent);
    if (!rootInstance) {
      if (!strict) return { rootInstance: null, claims: [] };
      throw anatomyError(
        ANATOMY_ERROR.CLAIM_INVALID,
        `[Anatomy] current instance is not part of a valid domain for '${family.debugName}'`
      );
    }

    let claims: ClaimRecord[];
    if (domains) {
      let byRoot = domains.get(getParent);
      if (!byRoot) {
        byRoot = new Map();
        const roots = new Map<AnatomyInstanceToken, AnatomyInstanceToken | null>();
        const path: AnatomyInstanceToken[] = [];
        const parentWithinScan: AnatomyParentGetter = (instance) => {
          const known = roots.get(instance);
          if (known !== undefined) return known;
          path.push(instance);
          return getParent(instance);
        };
        // This cache belongs to this family notification only. Preserve the
        // registration order inside each root, including stable host fallback.
        for (const claim of CENTER.listClaims(family)) {
          const root = this.findDomainRoot(claim.instance, family, parentWithinScan);
          for (const instance of path) roots.set(instance, root);
          path.length = 0;
          if (!root) continue;
          let members = byRoot.get(root);
          if (!members) byRoot.set(root, (members = []));
          members.push(claim);
        }
        domains.set(getParent, byRoot);
      }
      claims = byRoot.get(rootInstance) ?? [];
    } else {
      // Public queries must observe mutations immediately, even inside callbacks.
      claims = CENTER.listClaims(family).filter(
        (claim) => this.findDomainRoot(claim.instance, family, getParent) === rootInstance
      );
    }
    return { rootInstance, claims };
  }

  private findCurrentPartRoot(
    family: AnatomyFamily,
    claim: ClaimRecord
  ): AnatomyInstanceToken | null {
    const instance = this.getSelfToken();
    const getParent = this.getParentGetter();
    const root = this.findDomainRoot(instance, family, getParent);
    return root &&
      CENTER.getClaim(claim.instance, family) === claim &&
      this.findDomainRoot(claim.instance, family, getParent) === root
      ? root
      : null;
  }

  private findDomainRoot(
    instance: AnatomyInstanceToken,
    family: AnatomyFamily,
    getParent = this.getParentGetter()
  ): AnatomyInstanceToken | null {
    let cur: AnatomyInstanceToken | null = instance;
    while (cur) {
      if (CENTER.isRetiredBoundary(cur, family)) return null;
      const claim = CENTER.getClaim(cur, family);
      if (claim?.role === 'root') return cur;
      cur = getParent(cur);
    }
    return null;
  }

  private hasAncestorRole(
    instance: AnatomyInstanceToken,
    family: AnatomyFamily,
    role: string,
    domainRoot: AnatomyInstanceToken | null
  ): boolean {
    const getParent = this.getParentGetter();
    let cur = getParent(instance);
    while (cur) {
      const claim = CENTER.getClaim(cur, family);
      if (claim?.role === role) return true;
      if (domainRoot && cur === domainRoot) break;
      cur = getParent(cur);
    }
    return false;
  }

  private toPartView(claim: ClaimRecord): AnatomyPartView {
    const part: AnatomyPartView = {
      role: claim.role,
      hasExpose: (key: string) => claim.exposePort.has(key),
      getExpose: (key: string) => {
        if (!claim.exposePort.has(key)) return null;
        const exposed = claim.exposePort.get(key) ?? null;
        if (typeof exposed !== 'function') return exposed;
        return (...args: unknown[]) => {
          let result: unknown;
          let failed = false;
          let thrown: unknown;
          claim.invoke(() => {
            try {
              result = exposed(...args);
            } catch (error) {
              failed = true;
              thrown = error;
            }
          });
          if (failed) throw thrown;
          return result;
        };
      },
      hasHook: (name: string) => getHookNames(claim.prototype).has(name),
    };
    CLAIM_BY_PART_VIEW.set(part, claim);
    return part;
  }

  private ensureSetup(op: string) {
    if (this.sys) {
      try {
        this.sys.ensureSetup(op);
        return;
      } catch (error) {
        throw anatomyError(ANATOMY_ERROR.PHASE, `[Anatomy] setup-only: ${op}`);
      }
    }
    if (this.protoPhase !== 'setup') {
      throw illegalPhase(op, this.protoPhase, { prototypeName: this.prototypeName });
    }
  }

  private ensureRuntime(op: string) {
    if (this.sys) {
      try {
        this.sys.ensureRuntime(op);
        return;
      } catch {
        throw anatomyError(ANATOMY_ERROR.PHASE, `[Anatomy] runtime-only: ${op}`);
      }
    }
    if (this.protoPhase === 'setup') {
      throw illegalPhase(op, this.protoPhase, { prototypeName: this.prototypeName });
    }
  }

  private ensureCallback(op: string) {
    if (this.sys) {
      try {
        this.sys.ensureCallback(op);
        return;
      } catch {
        throw anatomyError(ANATOMY_ERROR.PHASE, `[Anatomy] callback-only: ${op}`);
      }
    }
    if (this.protoPhase === 'setup') {
      throw illegalPhase(op, this.protoPhase, { prototypeName: this.prototypeName });
    }
  }

  private getSelfToken(): AnatomyInstanceToken {
    if (!this.caps.has(ANATOMY_INSTANCE_TOKEN_CAP)) {
      throw anatomyError(ANATOMY_ERROR.CAP, `[Anatomy] host caps missing: instance token`);
    }
    return this.caps.get(ANATOMY_INSTANCE_TOKEN_CAP) as AnatomyInstanceToken;
  }

  private getParentGetter(): AnatomyParentGetter {
    if (!this.caps.has(ANATOMY_PARENT_CAP)) {
      throw anatomyError(ANATOMY_ERROR.CAP, `[Anatomy] host caps missing: parent getter`);
    }
    return this.caps.get(ANATOMY_PARENT_CAP) as AnatomyParentGetter;
  }

  private getPrototypeGetter(): AnatomyPrototypeGetter {
    if (!this.caps.has(ANATOMY_GET_PROTO_CAP)) {
      throw anatomyError(ANATOMY_ERROR.CAP, `[Anatomy] host caps missing: prototype getter`);
    }
    return this.caps.get(ANATOMY_GET_PROTO_CAP) as AnatomyPrototypeGetter;
  }

  private getRootTargetGetter(): AnatomyRootTargetGetter {
    if (!this.caps.has(ANATOMY_ROOT_TARGET_CAP)) {
      return () => null;
    }
    return this.caps.get(ANATOMY_ROOT_TARGET_CAP) as AnatomyRootTargetGetter;
  }
}
