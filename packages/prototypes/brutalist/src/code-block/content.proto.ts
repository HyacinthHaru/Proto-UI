import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockContent } from '@proto.ui/prototypes-base/code-block';
import type { BrutalistCodeBlockContentExposes, BrutalistCodeBlockContentProps } from './types';

const content = definePrototype<BrutalistCodeBlockContentProps, BrutalistCodeBlockContentExposes>({
  name: 'brutalist-code-block-content',
  setup(def) {
    asCodeBlockContent();
    def.feedback.style.use(
      tw('overflow-auto p-4 text-sm font-mono leading-relaxed bg-canvas text-ink')
    );
  },
});

export default content;
