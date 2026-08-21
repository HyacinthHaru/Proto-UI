import { describe, expect, it } from 'vitest';
import type { Prototype } from '@proto.ui/core';

import { createMountedVue2Adapter, flushVue2 } from './utils/vue2';

describe('adapter-vue2: lifecycle', () => {
  it('runs Proto lifecycle hooks through Vue 2 mount and destroy', async () => {
    const calls: string[] = [];

    const proto: Prototype = {
      name: 'vue2-life-basic',
      setup(def) {
        def.lifecycle.onCreated(() => calls.push('created'));
        def.lifecycle.onMounted(() => calls.push('mounted'));
        def.lifecycle.onUnmounted(() => calls.push('unmounted'));
        return (r) => [r.el('div', 'ok')];
      },
    };

    const mounted = createMountedVue2Adapter(proto);
    await flushVue2();

    expect(calls.slice(0, 2)).toEqual(['created', 'mounted']);

    mounted.unmount();
    await flushVue2();

    expect(calls.includes('unmounted')).toBe(true);
  });
});
