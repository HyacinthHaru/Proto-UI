import { definePrototype, tw } from '@proto.ui/core';
import { BRUTALIST_PANEL_TOKENS } from '../style';
import { asDialogContent } from '@proto.ui/prototypes-base/dialog';
import type { BrutalistDialogContentExposes, BrutalistDialogContentProps } from './types';

const dialogContent = definePrototype<BrutalistDialogContentProps, BrutalistDialogContentExposes>({
  name: 'brutalist-dialog-content',
  setup(def) {
    // P-BRUTALIST-DIALOG-CONTENT-BASE-INHERITANCE,
    // P-BRUTALIST-DIALOG-CONTENT-PUBLIC-BOUNDARY-DEVIATION
    const dialog = asDialogContent();
    // P-BRUTALIST-DIALOG-CONTENT-TRANSITION
    dialog.asTransition.configure({ enterDuration: 200, leaveDuration: 200 });
    const dialogState = dialog.stateHandles;
    const { open } = dialogState;
    // P-BRUTALIST-DIALOG-CONTENT-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(
      tw(
        `fixed left-1/2 top-1/2 grid w-full max-w-lg gap-4 -translate-x-1/2 -translate-y-1/2 p-6 outline-none duration-200 ${BRUTALIST_PANEL_TOKENS}`
      )
    );

    def.rule({
      when: (w) => w.state(open).eq(true),
      intent: (i) => i.feedback.style.use(tw('animate-in fade-in-0 zoom-in-95')),
    });

    def.rule({
      when: (w) => w.state(open).eq(false),
      intent: (i) => i.feedback.style.use(tw('animate-out fade-out-0 zoom-out-95')),
    });
  },
});

/** P-BRUTALIST-DIALOG-CONTENT-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-DIALOG-CONTENT-COMPATIBILITY-SUBSET. */

export default dialogContent;
