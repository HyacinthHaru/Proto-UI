import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockHeader } from '@proto.ui/prototypes-base/code-block';
import type { BrutalistCodeBlockHeaderExposes, BrutalistCodeBlockHeaderProps } from './types';

export const BrutalistCodeBlockHeader = definePrototype<
  BrutalistCodeBlockHeaderProps,
  BrutalistCodeBlockHeaderExposes
>({
  name: 'brutalist-code-block-header',
  setup(def) {
    asCodeBlockHeader();
    def.feedback.style.use(
      tw(
        'flex items-center justify-between gap-2 border-b-2 border-foreground bg-canary px-3 py-2 font-mono text-xs font-bold text-canary-foreground'
      )
    );
    return (renderer) => [renderer.r.slot()];
  },
});

export default BrutalistCodeBlockHeader;
