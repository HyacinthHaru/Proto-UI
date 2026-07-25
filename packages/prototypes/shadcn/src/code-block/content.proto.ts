import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockContent } from '@proto.ui/prototypes-base/code-block';
import type { ShadcnCodeBlockContentExposes, ShadcnCodeBlockContentProps } from './types';

const content = definePrototype<ShadcnCodeBlockContentProps, ShadcnCodeBlockContentExposes>({
  name: 'shadcn-code-block-content',
  setup(def) {
    asCodeBlockContent();
    def.feedback.style.use(tw('overflow-auto p-4 text-sm font-mono leading-relaxed'));
  },
});

export default content;
