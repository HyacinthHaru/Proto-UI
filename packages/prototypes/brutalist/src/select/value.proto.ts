import { definePrototype } from '@proto.ui/core';
import { asSelectValue } from '@proto.ui/prototypes-base/select';
import type { BrutalistSelectValueExposes, BrutalistSelectValueProps } from './types';

const selectValue = definePrototype<BrutalistSelectValueProps, BrutalistSelectValueExposes>({
  name: 'brutalist-select-value',
  setup() {
    // P-BRUTALIST-SELECT-VALUE-BASE-INHERITANCE,
    // P-BRUTALIST-SELECT-VALUE-CURRENT-BASE-DEVIATIONS,
    // P-BRUTALIST-SELECT-VALUE-DISPLAY-RENDER
    const value = asSelectValue().stateHandles;
    if (!value) throw new Error('[brutalist-select-value] Select Value must project displayValue.');
    return () => (value.displayValue.get() ? [value.displayValue.get()] : null);
  },
});

/** P-BRUTALIST-SELECT-VALUE-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-SELECT-VALUE-COMPATIBILITY-SUBSET. */

export default selectValue;
