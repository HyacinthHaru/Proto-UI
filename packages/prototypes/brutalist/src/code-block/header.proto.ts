import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockHeader } from '@proto.ui/prototypes-base/code-block';
import type { BrutalistCodeBlockHeaderExposes, BrutalistCodeBlockHeaderProps } from './types';

const header = definePrototype<BrutalistCodeBlockHeaderProps, BrutalistCodeBlockHeaderExposes>({
  name: 'brutalist-code-block-header',
  setup(def) {
    asCodeBlockHeader();
    def.feedback.style.use(
      tw(
        'flex items-center justify-between px-3 py-2 text-xs font-mono font-bold bg-canary border-b-2 border-ink text-canary-foreground gap-2'
      )
    );
  },
});

export default header;
