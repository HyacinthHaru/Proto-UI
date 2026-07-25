import { createAnatomyFamily } from '@proto.ui/core';

export const SCROLL_AREA_FAMILY = createAnatomyFamily('base-scroll-area', {
  roles: {
    root: { cardinality: { min: 1, max: 1 } },
    viewport: { cardinality: { min: 1, max: 1 } },
    scrollbar: { cardinality: { min: 0, max: 2 } },
    thumb: { cardinality: { min: 0, max: 2 } },
    corner: { cardinality: { min: 0, max: 1 } },
  },
  relations: [
    { kind: 'contains', parent: 'root', child: 'viewport' },
    { kind: 'contains', parent: 'root', child: 'scrollbar' },
    { kind: 'contains', parent: 'scrollbar', child: 'thumb' },
    { kind: 'contains', parent: 'root', child: 'corner' },
  ],
});
