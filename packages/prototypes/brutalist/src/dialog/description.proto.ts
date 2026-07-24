import { definePrototype, tw } from '@proto.ui/core';
import { asDialogDescription } from '@proto.ui/prototypes-base/dialog';
import type { BrutalistDialogDescriptionExposes, BrutalistDialogDescriptionProps } from './types';

const dialogDescription = definePrototype<
  BrutalistDialogDescriptionProps,
  BrutalistDialogDescriptionExposes
>({
  name: 'brutalist-dialog-description',
  setup(def) {
    // P-BRUTALIST-DIALOG-DESCRIPTION-BASE-INHERITANCE,
    // P-BRUTALIST-DIALOG-DESCRIPTION-CURRENT-VISUAL-SURFACE
    asDialogDescription();
    def.feedback.style.use(tw('font-mono text-sm text-foreground'));
  },
});

/** P-BRUTALIST-DIALOG-DESCRIPTION-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-DIALOG-DESCRIPTION-COMPATIBILITY-SUBSET. */

export default dialogDescription;
