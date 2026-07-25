import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import {
  BrutalistCardAction,
  BrutalistCardContent,
  BrutalistCardDescription,
  BrutalistCardFooter,
  BrutalistCardHeader,
  BrutalistCardRoot,
  BrutalistCardTitle,
} from '../src/card';

const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const styleContains = (el: HTMLElement, token: string) =>
  (el.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);

const parts = {
  root: ['pui-test-brutalist-card-root', BrutalistCardRoot],
  header: ['pui-test-brutalist-card-header', BrutalistCardHeader],
  title: ['pui-test-brutalist-card-title', BrutalistCardTitle],
  description: ['pui-test-brutalist-card-description', BrutalistCardDescription],
  action: ['pui-test-brutalist-card-action', BrutalistCardAction],
  content: ['pui-test-brutalist-card-content', BrutalistCardContent],
  footer: ['pui-test-brutalist-card-footer', BrutalistCardFooter],
} as const;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Brutalist Card', () => {
  it('renders explicit Base anatomy with brutalist panel hierarchy', async () => {
    for (const [, [tag, prototype]] of Object.entries(parts)) {
      defineWebComponent(tag, defineReactComponent(prototype, () => null).def);
    }

    const elements = Object.fromEntries(
      Object.entries(parts).map(([name, [tag]]) => [
        name,
        document.createElement(tag) as HTMLElement,
      ])
    ) as Record<keyof typeof parts, HTMLElement>;
    elements.root.append(
      elements.header,
      elements.title,
      elements.description,
      elements.action,
      elements.content,
      elements.footer
    );
    document.body.append(elements.root);
    await settle();

    const groupNode =
      elements.root.getAttribute('role') === 'group' ||
      elements.root.shadowRoot?.querySelector('[role="group"]');
    expect(groupNode).toBeTruthy();
    expect(styleContains(elements.root, 'rounded-none')).toBe(true);
    expect(styleContains(elements.root, 'border-2')).toBe(true);
    expect(styleContains(elements.root, 'shadow-[6px_6px_0_0_var(--pui-foreground)]')).toBe(true);
    expect(styleContains(elements.header, 'border-b-2')).toBe(true);
    expect(styleContains(elements.title, 'font-black')).toBe(true);
    expect(styleContains(elements.title, 'uppercase')).toBe(true);
    expect(styleContains(elements.description, 'font-mono')).toBe(true);
    expect(styleContains(elements.action, 'shrink-0')).toBe(true);
    expect(styleContains(elements.content, 'px-6')).toBe(true);
    expect(styleContains(elements.footer, 'border-t-2')).toBe(true);
  });
});
