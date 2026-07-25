import { definePrototype, tw } from '@proto.ui/core';
import { asComposerActions } from '@proto.ui/prototypes-base/composer';
import type { BrutalistComposerActionsExposes, BrutalistComposerActionsProps } from './types';

const actions = definePrototype<BrutalistComposerActionsProps, BrutalistComposerActionsExposes>({
  name: 'brutalist-composer-actions',
  setup(def) {
    asComposerActions();
    def.feedback.style.use(tw('flex flex-row items-center gap-2 shrink-0'));
  },
});

export default actions;
