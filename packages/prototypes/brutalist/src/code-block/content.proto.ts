import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockContent } from '@proto.ui/prototypes-base/code-block';
import type { BrutalistCodeBlockContentExposes, BrutalistCodeBlockContentProps } from './types';

export const BrutalistCodeBlockContent = definePrototype<
  BrutalistCodeBlockContentProps,
  BrutalistCodeBlockContentExposes
>({
  name: 'brutalist-code-block-content',
  setup(def) {
    asCodeBlockContent();
    def.feedback.style.use(
      tw('overflow-auto bg-background p-4 font-mono text-sm leading-relaxed text-foreground')
    );
    return (renderer) => [renderer.r.slot()];
  },
});

export default BrutalistCodeBlockContent;
