import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { SCROLL_AREA_FAMILY } from './shared';
import type {
  ScrollAreaCornerAsHookContract,
  ScrollAreaCornerExposes,
  ScrollAreaCornerProps,
} from './types';

function setupScrollAreaCorner(
  def: DefHandle<ScrollAreaCornerProps, ScrollAreaCornerExposes>
): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'corner' });
}

/*
 * P-BASE-SCROLL-AREA-CORNER-NO-BEHAVIOR: absence of event, state, and focus syntax is the implementation.
 */

export const asScrollAreaCorner = defineAsHook<
  ScrollAreaCornerProps,
  ScrollAreaCornerExposes,
  ScrollAreaCornerAsHookContract
>({
  name: 'as-scroll-area-corner',
  setup: setupScrollAreaCorner,
});

const scrollAreaCorner = definePrototype({
  name: 'base-scroll-area-corner',
  setup: setupScrollAreaCorner,
});

export default scrollAreaCorner;
