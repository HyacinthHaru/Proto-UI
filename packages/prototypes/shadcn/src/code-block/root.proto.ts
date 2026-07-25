import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockRoot } from '@proto.ui/prototypes-base/code-block';
import type { ShadcnCodeBlockRootExposes, ShadcnCodeBlockRootProps } from './types';

const root = definePrototype<ShadcnCodeBlockRootProps, ShadcnCodeBlockRootExposes>({
  name: 'shadcn-code-block-root',
  setup(def) {
    asCodeBlockRoot();
    def.feedback.style.use(
      tw('flex flex-col overflow-hidden rounded-md border bg-card text-card-foreground')
    );
  },
});

export default root;
