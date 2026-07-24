import { definePrototype, tw } from '@proto.ui/core';
import { asDialogTitle } from '@proto.ui/prototypes-base/dialog';
import type { BrutalistDialogTitleExposes, BrutalistDialogTitleProps } from './types';

const dialogTitle = definePrototype<BrutalistDialogTitleProps, BrutalistDialogTitleExposes>({
  name: 'brutalist-dialog-title',
  setup(def) {
    // P-BRUTALIST-DIALOG-TITLE-BASE-INHERITANCE,
    // P-BRUTALIST-DIALOG-TITLE-CURRENT-VISUAL-SURFACE
    asDialogTitle();
    def.feedback.style.use(tw('font-bold uppercase tracking-tight text-foreground'));
  },
});

/** P-BRUTALIST-DIALOG-TITLE-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-DIALOG-TITLE-COMPATIBILITY-SUBSET. */

export default dialogTitle;
