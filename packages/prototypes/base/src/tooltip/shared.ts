import { createAnatomyFamily } from '@proto.ui/core';

export const TOOLTIP_FAMILY = createAnatomyFamily('base-tooltip', {
  roles: {
    root: { cardinality: { min: 1, max: 1 } },
    trigger: { cardinality: { min: 1, max: 1 } },
    portal: { cardinality: { min: 0, max: 1 } },
    content: { cardinality: { min: 0, max: 1 } },
    arrow: { cardinality: { min: 0, max: 1 } },
  },
  relations: [
    { kind: 'contains', parent: 'root', child: 'trigger' },
    { kind: 'contains', parent: 'root', child: 'portal' },
    { kind: 'contains', parent: 'portal', child: 'content' },
    { kind: 'contains', parent: 'content', child: 'arrow' },
  ],
});
