import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockRoot } from '@proto.ui/prototypes-base/code-block';
import type { BrutalistCodeBlockRootExposes, BrutalistCodeBlockRootProps } from './types';

const root = definePrototype<BrutalistCodeBlockRootProps, BrutalistCodeBlockRootExposes>({
  name: 'brutalist-code-block-root',
  setup(def) {
    asCodeBlockRoot();
    def.feedback.style.use(
      tw('flex flex-col overflow-hidden border-2 border-ink shadow-hard bg-canvas')
    );
  },
});

export default root;
