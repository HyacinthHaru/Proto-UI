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
