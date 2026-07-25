import { definePrototype, tw } from '@proto.ui/core';
import { asComposerRoot } from '@proto.ui/prototypes-base/composer';
import type { ShadcnComposerRootExposes, ShadcnComposerRootProps } from './types';

export type * from './types';

const root = definePrototype<ShadcnComposerRootProps, ShadcnComposerRootExposes>({
  name: 'shadcn-composer-root',
  setup(def) {
    asComposerRoot();
    def.feedback.style.use(
      tw('flex flex-row items-end gap-2 p-2 rounded-lg bg-muted border border-border')
    );
  },
});

export default root;
