import { describe, expect, it } from 'vitest';

import { AdapterIds, InternalAdapterIds } from './registry';

describe('runtime registry', () => {
  it('keeps Vue 2 internal-only until it becomes a supported adapter', () => {
    expect(AdapterIds).toEqual(['wc', 'react', 'vue']);
    expect(InternalAdapterIds).toEqual(['wc', 'react', 'vue', 'vue2']);
  });
});
