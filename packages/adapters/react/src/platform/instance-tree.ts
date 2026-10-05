import {
  createInstanceTreeMarkers,
  releaseWebTriggerSurface,
  type LogicalInstanceToken,
} from '@proto.ui/adapter-base';

export const {
  PROTO_INSTANCE: __REACT_PROTO_INSTANCE,
  createLogicalInstance,
  bindLogicalParent,
  markProtoInstance,
  unbindProtoInstance,
  setProtoParent,
  clearProtoParentProjection,
  getProtoParent,
  getPrototypeByInstance,
  getLogicalParent,
  getLogicalRoot,
  getLogicalPrototype,
  mergeLogicalTriggerGroup,
  getLogicalTriggerGroupAnchor,
  setLogicalEventRouteOwner,
  getLogicalEventRouteOwner,
  getLogicalEventRouteSurfaceForTarget,
  resolveLogicalTriggerEventRouteForTarget,
  getLogicalTriggerSurfaceOwner,
  getLogicalTriggerSurfaceRoot,
  subscribeLogicalTriggerSurface,
  getLogicalEventTarget,
  bindLogicalEventTarget,
  unbindLogicalEventTarget,
} = createInstanceTreeMarkers('@proto.ui/adapter-react/__proto_instance', {
  releaseTriggerSurface: releaseWebTriggerSurface,
});

type NativeFocusReadiness = {
  isReady(): boolean;
  subscribe(listener: () => void): () => void;
};
type NativeFocusReadinessSlot = {
  source: NativeFocusReadiness | null;
  listeners: Set<() => void>;
};

const nativeFocusReadiness = new WeakMap<LogicalInstanceToken, NativeFocusReadinessSlot>();

function readinessSlot(instance: LogicalInstanceToken): NativeFocusReadinessSlot {
  let slot = nativeFocusReadiness.get(instance);
  if (!slot) {
    slot = { source: null, listeners: new Set() };
    nativeFocusReadiness.set(instance, slot);
  }
  return slot;
}

export function registerNativeFocusReadiness(
  instance: LogicalInstanceToken,
  source: NativeFocusReadiness
): () => void {
  const slot = readinessSlot(instance);
  slot.source = source;
  for (const listener of Array.from(slot.listeners)) listener();
  return () => {
    if (slot.source !== source) return;
    slot.source = null;
    for (const listener of Array.from(slot.listeners)) listener();
  };
}

export function isNativeFocusTargetReady(target: HTMLElement): boolean {
  const owner = getLogicalEventRouteSurfaceForTarget(target);
  return (
    !!owner &&
    getLogicalRoot(owner) === target &&
    nativeFocusReadiness.get(owner)?.source?.isReady() === true
  );
}

// Entry can resolve an ordinary descendant rather than the owner's Root.
// Reuse the same private readiness registry as native Trigger acquisition;
// event-route ownership identifies the view that must observe native focus.
export function isFocusTargetOwnerReady(target: HTMLElement): boolean {
  const owner = getLogicalEventRouteSurfaceForTarget(target);
  return !!owner && nativeFocusReadiness.get(owner)?.source?.isReady() === true;
}

export function subscribeFocusTargetOwnerReady(
  target: HTMLElement,
  listener: () => void
): () => void {
  const owner = getLogicalEventRouteSurfaceForTarget(target);
  if (!owner) return () => {};
  const slot = readinessSlot(owner);
  let disposed = false;
  let releaseReady: (() => void) | undefined;
  const bindReady = () => {
    releaseReady?.();
    const source = slot.source;
    const ready = () => {
      if (!disposed && slot.source === source && source?.isReady()) listener();
    };
    releaseReady = source?.subscribe(ready);
  };
  const sourceChanged = () => {
    if (disposed) return;
    bindReady();
    // Unregistration alone is not readiness. Preserve retained entry until a
    // current view can accept it, then let Focus re-resolve the current target.
    if (slot.source?.isReady()) listener();
  };
  slot.listeners.add(sourceChanged);
  bindReady();
  return () => {
    if (disposed) return;
    disposed = true;
    slot.listeners.delete(sourceChanged);
    releaseReady?.();
  };
}

export function subscribeFocusSurfaceReady(
  instance: LogicalInstanceToken,
  listener: () => void
): () => void {
  let disposed = false;
  let owner: LogicalInstanceToken | undefined;
  let releaseReady: (() => void) | undefined;
  let releaseSource: (() => void) | undefined;
  const bindOwner = () => {
    const nextOwner = getLogicalTriggerSurfaceOwner(instance);
    if (owner === nextOwner) return;
    releaseReady?.();
    releaseSource?.();
    releaseReady = undefined;
    releaseSource = undefined;
    owner = nextOwner;
    if (owner === instance) return;
    const slot = readinessSlot(owner);
    const bindReady = () => {
      releaseReady?.();
      releaseReady = slot.source?.subscribe(listener);
    };
    const sourceChanged = () => {
      // A source-change snapshot can outlive this owner binding or subscription.
      if (disposed || owner !== nextOwner) return;
      bindReady();
      listener();
    };
    slot.listeners.add(sourceChanged);
    releaseSource = () => slot.listeners.delete(sourceChanged);
    bindReady();
  };
  bindOwner();
  const releaseSurface = subscribeLogicalTriggerSurface(instance, () => {
    if (disposed) return;
    bindOwner();
    listener();
  });
  return () => {
    if (disposed) return;
    disposed = true;
    releaseSurface();
    releaseReady?.();
    releaseSource?.();
  };
}
