import { definePrototype, tw } from '@proto.ui/core';
import { asDialogClose } from '@proto.ui/prototypes-base/dialog';
import type { BrutalistDialogCloseExposes, BrutalistDialogCloseProps } from './types';

const dialogCloseIcon = definePrototype<BrutalistDialogCloseProps, BrutalistDialogCloseExposes>({
  name: 'brutalist-dialog-close-icon',
  setup(def) {
    const state = asDialogClose().stateHandles;
    if (!state) throw new Error('[brutalist-dialog-close-icon] command states are required.');
    const { disabled, hovered, focusVisible } = state;

    def.a11y.name('Close');
    def.feedback.style.use(
      tw(
        'absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-none border-2 border-black bg-canary text-foreground shadow-[3px_3px_0_0_#000] outline-none transition-none'
      )
    );
    def.rule({
      when: (w) => w.state(hovered).eq(true),
      intent: (i) => i.feedback.style.use(tw('bg-coral shadow-[4px_4px_0_0_#000]')),
    });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) => i.feedback.style.use(tw('ring-3 ring-ring/50')),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('pointer-events-none opacity-50')),
    });

    return (renderer) => [
      renderer.r.slot(),
      renderer.svg.root(
        {
          viewBox: '0 0 24 24',
          width: 16,
          height: 16,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        },
        [renderer.svg.path({ d: 'M18 6 6 18' }), renderer.svg.path({ d: 'm6 6 12 12' })]
      ),
    ];
  },
});

export default dialogCloseIcon;
