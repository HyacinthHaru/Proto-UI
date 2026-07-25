import { afterEach, describe, expect, it } from 'vitest';
import { defineReactComponent } from '../../adapters/react/src/index';
import { defineWebComponent } from '../../adapters/web-component/src/index';
import {
  BrutalistScrollAreaCorner,
  BrutalistScrollAreaRoot,
  BrutalistScrollAreaScrollbar,
  BrutalistScrollAreaThumb,
  BrutalistScrollAreaViewport,
} from '../src/scroll-area';
const settle = async () => {
  await Promise.resolve();
  await Promise.resolve();
};
const has = (el: HTMLElement, token: string) =>
  (el.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);
const parts = {
  root: ['pui-test-brutalist-scroll-root', BrutalistScrollAreaRoot],
  viewport: ['pui-test-brutalist-scroll-viewport', BrutalistScrollAreaViewport],
  scrollbar: ['pui-test-brutalist-scrollbar', BrutalistScrollAreaScrollbar],
  thumb: ['pui-test-brutalist-scroll-thumb', BrutalistScrollAreaThumb],
  corner: ['pui-test-brutalist-scroll-corner', BrutalistScrollAreaCorner],
} as const;
afterEach(() => {
  document.body.innerHTML = '';
});
describe('Brutalist Scroll Area', () => {
  it('projects explicit five-part anatomy and orientation-driven scrollbar tokens', async () => {
    for (const [, [tag, prototype]] of Object.entries(parts))
      defineWebComponent(tag, defineReactComponent(prototype, () => null).def);
    const nodes = Object.fromEntries(
      Object.entries(parts).map(([name, [tag]]) => [
        name,
        document.createElement(tag) as HTMLElement,
      ])
    ) as Record<keyof typeof parts, HTMLElement>;
    nodes.root.append(nodes.viewport, nodes.scrollbar, nodes.corner);
    nodes.scrollbar.append(nodes.thumb);
    document.body.append(nodes.root);
    await settle();
    const exposes = (
      nodes.scrollbar as unknown as { getExposes: () => { orientation?: { get: () => string } } }
    ).getExposes();
    expect(exposes.orientation?.get()).toBe('vertical');
    expect(has(nodes.root, 'rounded-none')).toBe(true);
    expect(has(nodes.root, 'border-2')).toBe(true);
    expect(has(nodes.viewport, 'size-full')).toBe(true);
    expect(has(nodes.scrollbar, 'bg-lavender')).toBe(true);
    expect(has(nodes.scrollbar, 'data-[orientation="vertical"]:w-4')).toBe(true);
    expect(has(nodes.scrollbar, 'data-[orientation="horizontal"]:h-4')).toBe(true);
    expect(has(nodes.thumb, 'bg-foreground')).toBe(true);
    expect(has(nodes.thumb, 'rounded-none')).toBe(true);
    expect(has(nodes.corner, 'bg-foreground')).toBe(true);
  });
});
