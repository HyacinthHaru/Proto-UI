import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import { BrutalistSeparatorRoot } from '../src/separator';

const TAG = 'pui-test-brutalist-separator';
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const styleContains = (el: HTMLElement, token: string) =>
  (el.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Brutalist Separator', () => {
  it('preserves Base orientation and projects two-pixel ink rules', async () => {
    const def = defineReactComponent(BrutalistSeparatorRoot, () => null).def;
    defineWebComponent(TAG, def);
    const separator = document.createElement(TAG) as HTMLElement;
    separator.setAttribute('orientation', 'vertical');
    document.body.append(separator);
    await settle();

    const exposes = (
      separator as unknown as { getExposes: () => { orientation?: { get: () => string } } }
    ).getExposes();
    expect(exposes.orientation?.get()).toBe('vertical');
    expect(styleContains(separator, 'bg-foreground')).toBe(true);
    expect(styleContains(separator, 'data-[orientation=horizontal]:h-0.5')).toBe(true);
    expect(styleContains(separator, 'data-[orientation=horizontal]:w-full')).toBe(true);
    expect(styleContains(separator, 'data-[orientation=vertical]:h-full')).toBe(true);
    expect(styleContains(separator, 'data-[orientation=vertical]:w-0.5')).toBe(true);
  });
});
