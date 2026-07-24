import { definePrototype, tw } from '@proto.ui/core';
import { DIALOG_FAMILY } from '@proto.ui/prototypes-base/dialog';

const dialogHeader = definePrototype({
  name: 'brutalist-dialog-header',
  setup(def) {
    def.anatomy.claim(DIALOG_FAMILY, { role: 'header' });
    def.feedback.style.use(tw('grid gap-1 border-b-2 border-black pb-3 text-left'));
    return (renderer) => renderer.r.slot();
  },
});

export default dialogHeader;
