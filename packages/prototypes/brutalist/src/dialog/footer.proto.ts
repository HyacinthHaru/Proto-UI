import { definePrototype, tw } from '@proto.ui/core';
import { DIALOG_FAMILY } from '@proto.ui/prototypes-base/dialog';

const dialogFooter = definePrototype({
  name: 'brutalist-dialog-footer',
  setup(def) {
    def.anatomy.claim(DIALOG_FAMILY, { role: 'footer' });
    def.feedback.style.use(
      tw('flex flex-col-reverse gap-2 border-t-2 border-foreground pt-3 justify-end')
    );
    return (renderer) => renderer.r.slot();
  },
});

export default dialogFooter;
