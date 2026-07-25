import { definePrototype, tw } from '@proto.ui/core';
import { asComposerRoot } from '@proto.ui/prototypes-base/composer';
import type { BrutalistComposerRootExposes, BrutalistComposerRootProps } from './types';

const root = definePrototype<BrutalistComposerRootProps, BrutalistComposerRootExposes>({
  name: 'brutalist-composer-root',
  setup(def) {
    asComposerRoot();
    def.feedback.style.use(
      tw('flex flex-row items-end gap-3 p-3 bg-paper border-2 border-ink shadow-hard')
    );
  },
});

export default root;
