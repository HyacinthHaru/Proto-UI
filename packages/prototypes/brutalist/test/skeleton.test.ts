import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import { BrutalistSkeletonRoot } from '../src/skeleton';
const TAG = 'pui-test-brutalist-skeleton';
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const styleTokens = (el: HTMLElement) => (el.getAttribute('data-pui-style') ?? '').split(/\s+/);
afterEach(() => {
  document.body.innerHTML = '';
});
describe('Brutalist Skeleton', () => {
  it('projects a static square Lavender placeholder', async () => {
    const def = defineReactComponent(BrutalistSkeletonRoot, () => null).def;
    defineWebComponent(TAG, def);
    const skeleton = document.createElement(TAG) as HTMLElement;
    document.body.append(skeleton);
    await settle();
    const tokens = styleTokens(skeleton);
    expect(tokens).toContain('rounded-none');
    expect(tokens).toContain('border-2');
    expect(tokens).toContain('bg-lavender');
    expect(tokens).toContain('shadow-[2px_2px_0_0_var(--pui-foreground)]');
    expect(tokens).not.toContain('animate-pulse');
    expect(tokens.every((token) => !token.includes('shimmer'))).toBe(true);
  });
});
