import { definePrototype } from '@proto.ui/core';
import { asSelectRoot } from '@proto.ui/prototypes-base/select';
import type { BrutalistSelectRootExposes, BrutalistSelectRootProps } from './types';

const selectRoot = definePrototype<BrutalistSelectRootProps, BrutalistSelectRootExposes>({
  name: 'brutalist-select-root',
  setup() {
    // P-BRUTALIST-SELECT-BASE-INHERITANCE, P-BRUTALIST-SELECT-CURRENT-BASE-DEVIATIONS
    asSelectRoot();
  },
});

/** P-BRUTALIST-SELECT-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-SELECT-COMPATIBILITY-SUBSET. */

export default selectRoot;
