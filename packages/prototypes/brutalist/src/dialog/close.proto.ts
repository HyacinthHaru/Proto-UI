import { definePrototype } from '@proto.ui/core';
import { asDialogClose } from '@proto.ui/prototypes-base/dialog';
import type { BrutalistDialogCloseExposes, BrutalistDialogCloseProps } from './types';

const dialogClose = definePrototype<BrutalistDialogCloseProps, BrutalistDialogCloseExposes>({
  name: 'brutalist-dialog-close',
  setup() {
    // P-BRUTALIST-DIALOG-CLOSE-BASE-INHERITANCE,
    // P-BRUTALIST-DIALOG-CLOSE-CURRENT-BASE-DEVIATIONS
    asDialogClose();
  },
});

/** P-BRUTALIST-DIALOG-CLOSE-DIRECT-ENTRY and P-BRUTALIST-DIALOG-CLOSE-STATE-DRIVEN-STYLES. */

export default dialogClose;
