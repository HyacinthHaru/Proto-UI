import { definePrototype } from '@proto.ui/core';
import { asDropdownRoot } from '@proto.ui/prototypes-base/dropdown';
import type { BrutalistDropdownRootExposes, BrutalistDropdownRootProps } from './types';

const dropdownRoot = definePrototype<BrutalistDropdownRootProps, BrutalistDropdownRootExposes>({
  name: 'brutalist-dropdown-root',
  setup(def) {
    // P-BRUTALIST-DROPDOWN-MENU-BASE-INHERITANCE,
    // P-BRUTALIST-DROPDOWN-MENU-CURRENT-BASE-DEVIATIONS
    asDropdownRoot();
  },
});

/** P-BRUTALIST-DROPDOWN-MENU-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-DROPDOWN-MENU-COMPATIBILITY-SUBSET. */

export default dropdownRoot;
