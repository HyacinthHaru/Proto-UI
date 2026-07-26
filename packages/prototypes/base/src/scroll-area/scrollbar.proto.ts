import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { SCROLL_AREA_FAMILY } from './shared';
import type {
  ScrollAreaScrollbarAsHookContract,
  ScrollAreaScrollbarExposes,
  ScrollAreaScrollbarProps,
} from './types';

function setupScrollAreaScrollbar(
  def: DefHandle<ScrollAreaScrollbarProps, ScrollAreaScrollbarExposes>
): void {
  def.anatomy.claim(SCROLL_AREA_FAMILY, { role: 'scrollbar' });

  def.props.define({
    orientation: { type: 'enum', empty: 'fallback', options: ['horizontal', 'vertical'] },
  });
  def.props.setDefaults({ orientation: 'vertical' });

  const orientation = def.state.string('orientation', 'vertical');
  def.expose.state('orientation', orientation);

  def.lifecycle.onCreated((run) => {
    orientation.set(
      run.props.get().orientation ?? 'vertical',
      'reason: scroll-area scrollbar init orientation'
    );
  });

  def.props.watch(['orientation'], (_run, next) => {
    orientation.set(
      next.orientation ?? 'vertical',
      'reason: scroll-area scrollbar prop orientation'
    );
  });
}

export const asScrollAreaScrollbar = defineAsHook<
  ScrollAreaScrollbarProps,
  ScrollAreaScrollbarExposes,
  ScrollAreaScrollbarAsHookContract
>({
  name: 'as-scroll-area-scrollbar',
  setup: setupScrollAreaScrollbar,
});

const scrollAreaScrollbar = definePrototype({
  name: 'base-scroll-area-scrollbar',
  setup: setupScrollAreaScrollbar,
});

export default scrollAreaScrollbar;
