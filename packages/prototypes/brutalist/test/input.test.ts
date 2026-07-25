import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import { BrutalistInputRoot } from '../src/input';

const TAG = 'pui-test-brutalist-input';
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const styleContains = (el: HTMLElement, token: string) =>
  (el.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Brutalist Input', () => {
  it('preserves Base value exposure and projects brutalist state tokens', async () => {
    const def = defineReactComponent(BrutalistInputRoot, () => null).def;
    defineWebComponent(TAG, def);
    const input = document.createElement(TAG) as HTMLElement;
    input.setAttribute('value', 'Find conversation');
    document.body.append(input);
    await settle();

    const exposes = (
      input as unknown as { getExposes: () => { value?: { get: () => string } } }
    ).getExposes();
    expect(exposes.value?.get()).toBe('Find conversation');
    expect(styleContains(input, 'rounded-none')).toBe(true);
    expect(styleContains(input, 'border-2')).toBe(true);
    expect(styleContains(input, 'font-mono')).toBe(true);
    expect(styleContains(input, 'shadow-[3px_3px_0_0_var(--pui-foreground)]')).toBe(true);
    expect(styleContains(input, 'data-[focus-visible]:ring-3')).toBe(true);
    expect(styleContains(input, 'data-[disabled]:opacity-50')).toBe(true);
  });
});
