import { definePrototype, tw } from '@proto.ui/core';
import { asDialogRoot } from '@proto.ui/prototypes-base/dialog';
import type { BrutalistDialogRootExposes, BrutalistDialogRootProps } from './types';

const dialogRoot = definePrototype<BrutalistDialogRootProps, BrutalistDialogRootExposes>({
  name: 'brutalist-dialog-root',
  setup(def) {
    // P-BRUTALIST-DIALOG-BASE-INHERITANCE, P-BRUTALIST-DIALOG-CURRENT-BASE-DEVIATIONS
    asDialogRoot();
    // P-BRUTALIST-DIALOG-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(tw('relative inline-flex items-start'));
  },
});

/** P-BRUTALIST-DIALOG-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-DIALOG-COMPATIBILITY-SUBSET. */

export default dialogRoot;
