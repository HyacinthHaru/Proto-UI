import { definePrototype, tw } from '@proto.ui/core';
import { asCodeBlockHeader } from '@proto.ui/prototypes-base/code-block';
import type { ShadcnCodeBlockHeaderExposes, ShadcnCodeBlockHeaderProps } from './types';

const header = definePrototype<ShadcnCodeBlockHeaderProps, ShadcnCodeBlockHeaderExposes>({
  name: 'shadcn-code-block-header',
  setup(def) {
    asCodeBlockHeader();
    def.feedback.style.use(
      tw(
        'flex items-center justify-between px-3 py-2 text-xs text-muted-foreground border-b bg-muted/50 gap-2'
      )
    );
  },
});

export default header;
