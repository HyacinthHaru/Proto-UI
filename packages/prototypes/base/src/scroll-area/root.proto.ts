import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import {
  EMPTY_SCROLL_METRICS,
  SCROLL_AREA_CONTEXT,
  SCROLL_AREA_FAMILY,
  type ScrollAreaContextValue,
} from './shared';
import type {
  ScrollAreaRootAsHookContract,
  ScrollAreaRootExposes,
  ScrollAreaRootProps,
} from './types';

function setupScrollAreaRoot(def: DefHandle<ScrollAreaRootProps, ScrollAreaRootExposes>): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'root' });
  const initial: ScrollAreaContextValue = {
    metrics: { ...EMPTY_SCROLL_METRICS },
    metricsVersion: 0,
    requestScrollTop: null,
    requestScrollLeft: null,
    requestVersion: 0,
    requestReason: null,
  };
  def.context.provide(SCROLL_AREA_CONTEXT, initial);
}

export const asScrollAreaRoot = defineAsHook<
  ScrollAreaRootProps,
  ScrollAreaRootExposes,
  ScrollAreaRootAsHookContract
>({
  name: 'as-scroll-area-root',
  setup: setupScrollAreaRoot,
});

const scrollAreaRoot = definePrototype({
  name: 'base-scroll-area-root',
  setup: setupScrollAreaRoot,
});

export default scrollAreaRoot;
