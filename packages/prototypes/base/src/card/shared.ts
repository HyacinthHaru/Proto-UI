import { createAnatomyFamily } from '@proto.ui/core';

// P-BASE-CARD-ANATOMY-FAMILY, P-BASE-CARD-FAMILY-ROLES
// P-BASE-CARD-ROOT-CARDINALITY, P-BASE-CARD-HEADER-CARDINALITY
// P-BASE-CARD-TITLE-CARDINALITY, P-BASE-CARD-DESCRIPTION-CARDINALITY
// P-BASE-CARD-ACTION-CARDINALITY, P-BASE-CARD-CONTENT-CARDINALITY
// P-BASE-CARD-FOOTER-CARDINALITY, P-BASE-CARD-ROOT-CONTAINS-PARTS
export const CARD_FAMILY = createAnatomyFamily('base-card', {
  roles: {
    root: { cardinality: { min: 1, max: 1 } },
    header: { cardinality: { min: 0, max: 1 } },
    title: { cardinality: { min: 0, max: 1 } },
    description: { cardinality: { min: 0, max: 1 } },
    action: { cardinality: { min: 0, max: 1 } },
    content: { cardinality: { min: 0, max: '*' } },
    footer: { cardinality: { min: 0, max: 1 } },
  },
  relations: [
    { kind: 'contains', parent: 'root', child: 'header' },
    { kind: 'contains', parent: 'root', child: 'title' },
    { kind: 'contains', parent: 'root', child: 'description' },
    { kind: 'contains', parent: 'root', child: 'action' },
    { kind: 'contains', parent: 'root', child: 'content' },
    { kind: 'contains', parent: 'root', child: 'footer' },
  ],
});
