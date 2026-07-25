import { definePrototype, tw } from '@proto.ui/core';
import { asComposerActions } from '@proto.ui/prototypes-base/composer';
import type { ShadcnComposerActionsExposes, ShadcnComposerActionsProps } from './types';

export type * from './types';

const actions = definePrototype<ShadcnComposerActionsProps, ShadcnComposerActionsExposes>({
  name: 'shadcn-composer-actions',
  setup(def) {
    asComposerActions();
    def.feedback.style.use(tw('flex flex-row items-center gap-1 shrink-0'));
  },
});

export default actions;
