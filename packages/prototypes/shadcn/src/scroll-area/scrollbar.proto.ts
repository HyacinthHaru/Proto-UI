import { definePrototype, tw } from '@proto.ui/core';
import { asScrollAreaScrollbar } from '@proto.ui/prototypes-base/scroll-area';
import type { ShadcnScrollAreaScrollbarExposes, ShadcnScrollAreaScrollbarProps } from './types';

const SCROLLBAR_SURFACE_TOKENS = 'absolute flex touch-none select-none transition-colors';

const scrollAreaScrollbar = definePrototype<
  ShadcnScrollAreaScrollbarProps,
  ShadcnScrollAreaScrollbarExposes
>({
  name: 'shadcn-scroll-area-scrollbar',
  setup(def) {
    const state = asScrollAreaScrollbar().stateHandles;
    if (!state) {
      throw new Error(
        '[shadcn-scroll-area-scrollbar] asScrollAreaScrollbar must project Scrollbar state handles.'
      );
    }

    def.props.watch(['orientation'], (run) => run.update());

    def.feedback.style.use(tw(SCROLLBAR_SURFACE_TOKENS));
    def.rule({
      when: (when) => when.state(state.orientation).eq('vertical'),
      intent: (intent) =>
        intent.feedback.style.use(
          tw(
            'h-[calc(100%_-_var(--proto-ui-scroll-track-end-inset,0px))] w-2.5 top-0 right-0 border-2 border-transparent'
          )
        ),
    });
    def.rule({
      when: (when) => when.state(state.orientation).eq('horizontal'),
      intent: (intent) =>
        intent.feedback.style.use(
          tw(
            'w-[calc(100%_-_var(--proto-ui-scroll-track-end-inset,0px))] h-2.5 flex-col bottom-0 left-0 border-2 border-transparent'
          )
        ),
    });
    return (renderer) => [
      renderer.r.slot(),
      ...(renderer.read.props.get().orientation === 'horizontal'
        ? [
            renderer.el(
              'span',
              {
                style: tw(
                  'pointer-events-none absolute left-[calc(100%_+_2px)] top-[-2px] w-[var(--proto-ui-scroll-track-end-inset,0px)] h-[calc(100%_+_4px)] overflow-hidden'
                ),
              },
              renderer.el('span', {
                style: tw('absolute inset-0 bg-muted border-l-2 border-t-2 border-border'),
              })
            ),
          ]
        : []),
    ];
  },
});

export default scrollAreaScrollbar;
