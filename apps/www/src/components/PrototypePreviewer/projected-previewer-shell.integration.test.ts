import { SHADCN_THEME_CSS } from '../../../../../packages/cli/src/legacy/type';
import { renderPrefixedThemeCss } from '../../../../../packages/cli/src/services/proto-style-css';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initProjectedPreviewer } from './projected-previewer-client';
// Exercise the real adapters with the repository's installed framework versions.
// Only the CDN loader is replaced; hosted-browser coverage exercises the website URLs.
vi.mock('./runtimes/react-runtime', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/packages/adapters/react/package.json');
  return {
    loadReact: async () => ({
      React: require('react'),
      ReactDOM: { ...require('react-dom'), ...require('react-dom/client') },
    }),
  };
});
vi.mock('./runtimes/vue-runtime', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/apps/www/package.json');
  return { loadVue: async () => require('vue') };
});
vi.mock('./runtimes/vue2-runtime', async (original) => {
  const current = await original<typeof import('./runtimes/vue2-runtime')>();
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/packages/adapters/vue2/package.json');
  return { ...current, loadVue2: async () => require('vue') };
});

beforeEach(() => {
  const style = document.createElement('style');
  style.id = 'real-website-theme';
  style.textContent = renderPrefixedThemeCss(SHADCN_THEME_CSS);
  document.head.append(style);
});
const roots: HTMLElement[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await (root as any).__previewer__?.destroy();
  document.body.replaceChildren();
  document.querySelector('#real-website-theme')?.remove();
  localStorage.clear();
});
for (const family of ['shadcn', 'brutalist', 'bootstrap-2-3-2', 'liquid-glass'] as const)
  for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const)
    it(`${family}/${runtime}: real projected caller commits independent content and matching ready public shell`, async () => {
      const root = document.createElement('section');
      root.dataset.previewerId = `real-${family}-${runtime}`;
      root.innerHTML = '<div class="host"></div>';
      // HappyDOM does not inherit custom properties through this fixture tree.
      // Supply the actual website-generated root declarations to the theme input.
      for (const match of renderPrefixedThemeCss(SHADCN_THEME_CSS)
        .split('}')[0]!
        .matchAll(/(--pui-[\w-]+):\s*([^;]+);/g)) {
        root.style.setProperty(match[1]!, match[2]!);
        root.querySelector<HTMLElement>('.host')!.style.setProperty(match[1]!, match[2]!);
      }
      document.body.append(root);
      roots.push(root);
      initProjectedPreviewer({
        root,
        initialRuntime: runtime,
        runtimeList: ['wc', 'react', 'vue', 'vue2'],
        projectionFamilyId: family,
        componentId: 'button',
        toolbar: false,
      });
      await vi.waitFor(() =>
        expect(root.dataset.projectionState, root.textContent ?? '').toBe('ready')
      );
      const scope = root.querySelector('[data-projection-scope]')!;
      expect(scope.getAttribute('data-projection-runtime')).toBe(runtime);
      const shell = root.querySelector<HTMLElement>('.pui-runtime-preview-surface')!;
      expect(shell).not.toBeNull();
      expect(shell.dataset.projectionRuntime).toBe(runtime);
      expect(shell.dataset.projectionPrototype).toBe(`${family}-surface-root`);
      const slot = shell.querySelector('[data-passive-shell-slot]')!;
      expect(slot.querySelector('[role="button"]')).not.toBeNull();
      if (runtime === 'wc') expect(shell.tagName.startsWith('WC-')).toBe(true);
      else expect(shell.tagName.startsWith('WC-')).toBe(false);
      await (root as any).__previewer__.destroy();
      expect(root.querySelector('.host')!.childNodes).toHaveLength(0);
    });

for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const)
  it(`${runtime}: generic caller publishes runtime-ready only after its real shell exists`, async () => {
    const { initPreviewer } = await import('./previewer-client');
    const root = document.createElement('section');
    root.dataset.previewerId = `generic-${runtime}`;
    root.innerHTML = '<select></select><div class="host"></div>';
    for (const match of renderPrefixedThemeCss(SHADCN_THEME_CSS)
      .split('}')[0]!
      .matchAll(/(--pui-[\w-]+):\s*([^;]+);/g)) {
      root.style.setProperty(match[1]!, match[2]!);
      root.querySelector<HTMLElement>('.host')!.style.setProperty(match[1]!, match[2]!);
    }
    document.body.append(root);
    roots.push(root);
    const publications: Array<{ present: boolean; runtime: string | undefined }> = [];
    root.addEventListener('runtime:changed', () => {
      const shell = root.querySelector<HTMLElement>('.pui-runtime-preview-surface');
      publications.push({
        present: !!shell?.querySelector('[data-passive-shell-slot] [data-pui-root]'),
        runtime: shell?.dataset.projectionRuntime,
      });
    });
    initPreviewer({
      root,
      prototypeId: 'shadcn-button',
      initialRuntime: runtime,
      runtimeList: ['wc', 'react', 'vue', 'vue2'],
      demoProps: {},
    });
    await vi.waitFor(() => expect(publications).toEqual([{ present: true, runtime }]));
    expect((root as any).__previewer__.getCurrentRuntime()).toBe(runtime);
    expect(root.querySelectorAll('.pui-runtime-preview-surface')).toHaveLength(1);
    await (root as any).__previewer__.destroy();
    expect(root.querySelector('.host')!.childNodes).toHaveLength(0);
  });
