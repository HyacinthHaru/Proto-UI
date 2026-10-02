import type { Locator } from 'playwright-core';
import { describe, expect, it } from 'vitest';
import { runtimeSelectTrigger } from './browser-harness';

/** Resolve the real selector against DOM fixtures without launching a browser. */
function locatorFor(root: HTMLElement): Locator {
  return {
    locator(selector: string) {
      return { first: () => root.querySelector(selector) };
    },
  } as unknown as Locator;
}

describe('documentation runtime control locator', () => {
  it.each(['shadcn', 'brutalist'])(
    'uses the actual %s runtime Select through its shared accessible role',
    (family) => {
      const previewer = document.createElement('div');
      previewer.innerHTML = `
        <wc-${family}-select-root data-language-select-root>
          <wc-${family}-select-trigger role="combobox" data-control="language"></wc-${family}-select-trigger>
        </wc-${family}-select-root>
        <wc-${family}-select-root data-adapter-select-root>
          <wc-${family}-select-trigger role="combobox" data-control="runtime"></wc-${family}-select-trigger>
        </wc-${family}-select-root>`;
      const trigger = runtimeSelectTrigger(locatorFor(previewer)) as unknown as HTMLElement;
      expect(trigger?.dataset.control).toBe('runtime');
      expect(trigger?.localName).toBe(`wc-${family}-select-trigger`);
    }
  );

  it('keeps fixed-family runtime controls separate from other projection Selects', () => {
    const previewer = document.createElement('div');
    previewer.innerHTML = `
      <div data-projection-control="component"><div role="combobox" data-control="component"></div></div>
      <div data-projection-control="runtime"><div role="combobox" data-control="runtime"></div></div>`;
    const trigger = runtimeSelectTrigger(locatorFor(previewer)) as unknown as HTMLElement;
    expect(trigger?.dataset.control).toBe('runtime');
  });
});
