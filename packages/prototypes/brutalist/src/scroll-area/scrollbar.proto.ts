import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaScrollbar } from '@proto.ui/prototypes-base/scroll-area';
import type {
  BrutalistScrollAreaScrollbarExposes,
  BrutalistScrollAreaScrollbarProps,
} from './types';

export const BrutalistScrollAreaScrollbar = definePrototype<
  BrutalistScrollAreaScrollbarProps,
  BrutalistScrollAreaScrollbarExposes
>({
  name: 'brutalist-scroll-area-scrollbar',
  setup(def) {
    // Keep Base scrollbar semantics via as-hook; size from props for reliable CSS tokens.
    asScrollAreaScrollbar();
    def.feedback.style.use(tw('flex select-none touch-none bg-lavender p-0.5'));
    def.rule({
      when: (w) => w.prop('orientation').eq('vertical'),
      intent: (i) => i.feedback.style.use(tw('h-full w-4 border-l-2 border-foreground')),
    });
    def.rule({
      when: (w) => w.prop('orientation').eq('horizontal'),
      intent: (i) => i.feedback.style.use(tw('h-4 w-full flex-col border-t-2 border-foreground')),
    });
    return (renderer) => [renderer.r.slot()];
  },
});
