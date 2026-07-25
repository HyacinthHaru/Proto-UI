import { createInstanceTreeMarkers, releaseWebTriggerSurface } from '@proto.ui/adapter-base';

export const {
  PROTO_INSTANCE: __VUE_PROTO_INSTANCE,
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
  setLogicalEventRouteOwner,
  getLogicalEventRouteOwner,
  getLogicalEventRouteSurfaceForTarget,
  getLogicalTriggerSurfaceOwner,
  getLogicalTriggerSurfaceRoot,
  subscribeLogicalTriggerSurface,
  getLogicalEventTarget,
  bindLogicalEventTarget,
  unbindLogicalEventTarget,
} = createInstanceTreeMarkers('@proto.ui/adapter-vue/__proto_instance', {
  releaseTriggerSurface: releaseWebTriggerSurface,
});
