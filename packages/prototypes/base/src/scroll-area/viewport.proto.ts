import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { SCROLL_AREA_FAMILY } from './shared';
import type {
  ScrollAreaViewportAsHookContract,
  ScrollAreaViewportExposes,
  ScrollAreaViewportProps,
} from './types';

function setupScrollAreaViewport(
  def: DefHandle<ScrollAreaViewportProps, ScrollAreaViewportExposes>
): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'viewport' });
}

/*
 * P-BASE-SCROLL-AREA-VIEWPORT-NO-BEHAVIOR: absence of event, state, and focus syntax is the implementation.
 */

export const asScrollAreaViewport = defineAsHook<
  ScrollAreaViewportProps,
  ScrollAreaViewportExposes,
  ScrollAreaViewportAsHookContract
>({
  name: 'as-scroll-area-viewport',
  setup: setupScrollAreaViewport,
});

const scrollAreaViewport = definePrototype({
  name: 'base-scroll-area-viewport',
  setup: setupScrollAreaViewport,
});

export default scrollAreaViewport;
