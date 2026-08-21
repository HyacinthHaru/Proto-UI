import { describe, expect, it, vi } from 'vitest';

vi.mock(
  '../../../../apps/www/src/components/PrototypePreviewer/runtimes/vue2-runtime',
  async () => {
    const actual = await vi.importActual<
      typeof import('../../../../apps/www/src/components/PrototypePreviewer/runtimes/vue2-runtime')
    >('../../../../apps/www/src/components/PrototypePreviewer/runtimes/vue2-runtime');
    return actual;
  }
);

describe('PrototypePreviewer vue2 runtime data mapping', () => {
  it('splits host props, fallthrough attrs, class, style, and event listeners for Vue 2 VNodes', async () => {
    const { toVue2ComponentData } =
      await import('../../../../apps/www/src/components/PrototypePreviewer/runtimes/vue2-runtime');
    const onSelect = vi.fn();

    const data = toVue2ComponentData({
      label: 'Button',
      disabled: true,
      hostClass: 'host-a',
      surfaceClass: 'surface-a',
      hostStyle: { color: 'red' },
      surfaceStyle: { margin: '4px' },
      class: 'fallthrough-a',
      style: { padding: '8px' },
      onSelect,
    });

    expect(data.props).toEqual({
      hostClass: 'host-a',
      surfaceClass: 'surface-a',
      hostStyle: { color: 'red' },
      surfaceStyle: { margin: '4px' },
    });
    expect(data.attrs).toEqual({
      label: 'Button',
      disabled: true,
    });
    expect(data.class).toBe('fallthrough-a');
    expect(data.style).toEqual({ padding: '8px' });
    expect(data.on.select).toBe(onSelect);
  });
});
