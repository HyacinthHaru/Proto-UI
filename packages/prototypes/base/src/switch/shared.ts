import { createAnatomyFamily, createContextKey } from '@proto.ui/core';

export type SwitchContextValue = {
  checked: boolean;
  disabled: boolean;
  pressed: boolean;
};

// P-BASE-SWITCH-ANATOMY-FAMILY, P-BASE-SWITCH-FAMILY-ROLES
// P-BASE-SWITCH-ROOT-CARDINALITY, P-BASE-SWITCH-THUMB-CARDINALITY
// P-BASE-SWITCH-ROOT-CONTAINS-THUMB
export const SWITCH_FAMILY = createAnatomyFamily('base-switch', {
  roles: {
    root: { cardinality: { min: 1, max: 1 } },
    thumb: { cardinality: { min: 0, max: '*' } },
  },
  relations: [{ kind: 'contains', parent: 'root', child: 'thumb' }],
});

// P-BASE-SWITCH-CONTEXT-KEY
export const SWITCH_CONTEXT = createContextKey<SwitchContextValue>('base-switch');
