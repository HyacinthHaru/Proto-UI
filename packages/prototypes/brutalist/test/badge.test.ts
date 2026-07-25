import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import { BrutalistBadgeRoot } from '../src/badge';

const TAG = 'pui-test-brutalist-badge';
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const styleContains = (el: HTMLElement, token: string) =>
  (el.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Brutalist Badge', () => {
  it('projects the Base status anatomy and brutalist label grammar', async () => {
    const def = defineReactComponent(BrutalistBadgeRoot, () => null).def;
    defineWebComponent(TAG, def);
    const badge = document.createElement(TAG) as HTMLElement;
    badge.textContent = 'Unread 3';
    document.body.append(badge);
    await settle();

    expect(def.anatomy.some((entry) => entry.role === 'status')).toBe(true);
    expect(styleContains(badge, 'inline-flex')).toBe(true);
    expect(styleContains(badge, 'rounded-none')).toBe(true);
    expect(styleContains(badge, 'border-2')).toBe(true);
    expect(styleContains(badge, 'bg-canary')).toBe(true);
    expect(styleContains(badge, 'text-canary-foreground')).toBe(true);
    expect(styleContains(badge, 'font-mono')).toBe(true);
    expect(styleContains(badge, 'font-bold')).toBe(true);
    expect(styleContains(badge, 'uppercase')).toBe(true);
    expect(styleContains(badge, 'shadow-[2px_2px_0_0_var(--pui-foreground)]')).toBe(true);
  });
});
