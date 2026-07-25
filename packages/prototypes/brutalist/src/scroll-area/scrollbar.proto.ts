import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaScrollbar } from '@proto.ui/prototypes-base';
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
    const state = asScrollAreaScrollbar().stateHandles;
    if (!state)
      throw new Error('[brutalist-scroll-area-scrollbar] Base orientation state is required.');
    const { orientation } = state;
    def.feedback.style.use(tw('flex select-none touch-none bg-lavender p-0.5'));
    def.rule({
      when: (w) => w.state(orientation).eq('vertical'),
      intent: (i) => i.feedback.style.use(tw('h-full w-4 border-l-2 border-foreground')),
    });
    def.rule({
      when: (w) => w.state(orientation).eq('horizontal'),
      intent: (i) => i.feedback.style.use(tw('h-4 w-full flex-col border-t-2 border-foreground')),
    });
    return (renderer) => [renderer.r.slot()];
  },
});
