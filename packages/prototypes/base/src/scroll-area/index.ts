import scrollAreaRoot from './root.proto';

export type {
  ScrollAreaCornerAsHookContract,
  ScrollAreaCornerExposes,
  ScrollAreaCornerProps,
  ScrollAreaCornerStateHandles,
  ScrollAreaRootAsHookContract,
  ScrollAreaRootExposes,
  ScrollAreaRootProps,
  ScrollAreaRootStateHandles,
  ScrollAreaScrollbarAsHookContract,
  ScrollAreaScrollbarExposes,
  ScrollAreaScrollbarProps,
  ScrollAreaScrollbarStateHandles,
  ScrollAreaThumbAsHookContract,
  ScrollAreaThumbExposes,
  ScrollAreaThumbProps,
  ScrollAreaThumbStateHandles,
  ScrollAreaViewportAsHookContract,
  ScrollAreaViewportExposes,
  ScrollAreaViewportProps,
  ScrollAreaViewportStateHandles,
} from './types';

export {
  EMPTY_SCROLL_METRICS,
  SCROLL_AREA_CONTEXT,
  SCROLL_AREA_FAMILY,
  publishScrollMetrics,
  requestScrollPosition,
} from './shared';
export type { ScrollAreaContextValue, ScrollAreaMetrics } from './shared';

export { asScrollAreaRoot, default as scrollAreaRoot } from './root.proto';
export { asScrollAreaViewport, default as scrollAreaViewport } from './viewport.proto';
export { asScrollAreaScrollbar, default as scrollAreaScrollbar } from './scrollbar.proto';
export { asScrollAreaThumb, default as scrollAreaThumb } from './thumb.proto';
export { asScrollAreaCorner, default as scrollAreaCorner } from './corner.proto';

export default scrollAreaRoot;
