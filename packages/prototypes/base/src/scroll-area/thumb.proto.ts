import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { SCROLL_AREA_FAMILY } from './shared';
import type {
  ScrollAreaThumbAsHookContract,
  ScrollAreaThumbExposes,
  ScrollAreaThumbProps,
} from './types';

function setupScrollAreaThumb(def: DefHandle<ScrollAreaThumbProps, ScrollAreaThumbExposes>): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'thumb' });
}

/*
 * P-BASE-SCROLL-AREA-THUMB-NO-BEHAVIOR: absence of event, state, and focus syntax is the implementation.
 */

export const asScrollAreaThumb = defineAsHook<
  ScrollAreaThumbProps,
  ScrollAreaThumbExposes,
  ScrollAreaThumbAsHookContract
>({
  name: 'as-scroll-area-thumb',
  setup: setupScrollAreaThumb,
});

const scrollAreaThumb = definePrototype({
  name: 'base-scroll-area-thumb',
  setup: setupScrollAreaThumb,
});

export default scrollAreaThumb;
