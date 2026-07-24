import { definePrototype, tw } from '@proto.ui/core';
import { asHoverCardRoot } from '@proto.ui/prototypes-base/hover-card';
import type { BrutalistHoverCardRootExposes, BrutalistHoverCardRootProps } from './types';

const hoverCardRoot = definePrototype<BrutalistHoverCardRootProps, BrutalistHoverCardRootExposes>({
  name: 'brutalist-hover-card-root',
  setup(def) {
    // P-BRUTALIST-HOVER-CARD-BASE-INHERITANCE,
    // P-BRUTALIST-HOVER-CARD-CURRENT-BASE-DEVIATIONS
    asHoverCardRoot();
    // P-BRUTALIST-HOVER-CARD-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(tw('relative inline-flex items-start'));
  },
});

/** P-BRUTALIST-HOVER-CARD-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-HOVER-CARD-COMPATIBILITY-SUBSET. */

export default hoverCardRoot;
