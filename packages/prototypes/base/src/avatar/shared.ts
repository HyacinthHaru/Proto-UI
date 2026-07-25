import { createAnatomyFamily } from '@proto.ui/core';

// P-BASE-AVATAR-ANATOMY-FAMILY, P-BASE-AVATAR-FAMILY-ROLES
// P-BASE-AVATAR-ROOT-CARDINALITY, P-BASE-AVATAR-IMAGE-CARDINALITY
// P-BASE-AVATAR-FALLBACK-CARDINALITY
// P-BASE-AVATAR-ROOT-CONTAINS-IMAGE, P-BASE-AVATAR-ROOT-CONTAINS-FALLBACK
export const AVATAR_FAMILY = createAnatomyFamily('base-avatar', {
  roles: {
    root: { cardinality: { min: 1, max: 1 } },
    image: { cardinality: { min: 0, max: 1 } },
    fallback: { cardinality: { min: 0, max: 1 } },
  },
  relations: [
    { kind: 'contains', parent: 'root', child: 'image' },
    { kind: 'contains', parent: 'root', child: 'fallback' },
  ],
});
