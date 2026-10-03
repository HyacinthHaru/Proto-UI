import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createRuntimePreviewSurface,
  runtimePreviewFamily,
  runtimePreviewRecipe,
} from './runtime-preview-surface';
import { collectPrototypeIds, type DemoSetupContext, type DemoSpec } from './demo-types';
import { PROJECTION_FAMILY_MANIFESTS, type ProjectionFamilyManifest } from './projection-families';
import { registerPrototype } from './registry';
import { renderDemo } from './demo-renderer';
import SitePreviewSurface from '../../prototypes/site-preview-surface.proto';
import Toggle from '../../../../../packages/prototypes/shadcn/src/toggle/toggle.proto';

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

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-site-library-family');
});

describe('RuntimeBox canvas composition', () => {
  it('preserves the original recipe root and forwards only its setup refs and cleanup once', () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    const child: DemoSpec = { type: 'demo', root: { kind: 'box', ref: 'original' }, setup };
    const surface = createRuntimePreviewSurface(child, 'brutalist');
    expect(surface.demo.root.kind).toBe('proto');
    if (surface.demo.root.kind !== 'proto') throw new Error('Expected a Prototype surface');
    expect(surface.demo.root.children).toEqual([child.root]);
    expect(surface.demo.root.children?.[0]).toBe(child.root);
    const original = document.createElement('div');
    const host = document.createElement('div');
    const context = {
      host,
      refs: { original, [surface.demo.root.ref!]: host },
      api: { setProps: vi.fn(), call: vi.fn(), getExposes: vi.fn() },
    };
    const release = surface.demo.setup!(context)!;
    expect(setup).toHaveBeenCalledWith({ ...context, refs: { original } });
    release();
    release();
    surface.setAppearance('shadcn', { '--pui-background': '#fff' });
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(context.api.setProps).not.toHaveBeenCalled();
  });

  it('declares only the original recipe closure plus the one actual app surface', () => {
    for (const family of ['shadcn', 'brutalist'] as const) {
      for (const component of ['button', 'select', 'dialog', 'tooltip', 'scroll-area'] as const) {
        const original = (PROJECTION_FAMILY_MANIFESTS[family] as ProjectionFamilyManifest).families[
          component
        ]!;
        if (!original) {
          expect(() => runtimePreviewRecipe(family, component)).toThrow(/unavailable/);
          continue;
        }
        const recipe = runtimePreviewRecipe(family, component);
        expect(recipe.prototypeIds).toEqual([
          ...original.recipePrototypeIds,
          'site-preview-surface',
        ]);
        expect(recipe.rootPrototypeId).not.toBe('site-preview-surface');
      }
    }
    const child: DemoSpec = {
      type: 'demo',
      root: { kind: 'proto', prototypeId: 'original-component' },
    };
    const ids = new Set<string>();
    collectPrototypeIds(createRuntimePreviewSurface(child, 'shadcn').demo.root, ids);
    expect([...ids]).toEqual(['site-preview-surface', 'original-component']);
  });

  it('rejects a child ref collision instead of taking over the demonstrated instance', () => {
    expect(() =>
      createRuntimePreviewSurface(
        { type: 'demo', root: { kind: 'box', ref: '__website_runtime_preview_surface__' } },
        'shadcn'
      )
    ).toThrow(/reserved surface ref/);
  });

  it('honors a fixed family before document presentation and resolves current generic ancestry', () => {
    const root = document.createElement('section');
    document.body.append(root);
    document.documentElement.dataset.siteLibraryFamily = 'brutalist';
    expect(runtimePreviewFamily(root)).toBe('brutalist');
    root.dataset.projectionFamily = 'shadcn';
    expect(runtimePreviewFamily(root)).toBe('shadcn');
    delete root.dataset.projectionFamily;
    document.documentElement.dataset.siteLibraryFamily = 'shadcn';
    expect(runtimePreviewFamily(root)).toBe('shadcn');
  });

  for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const) {
    it(`${runtime}: keeps the demonstrated uncontrolled state and activation after a surface family change`, async () => {
      registerPrototype('site-preview-surface', SitePreviewSurface);
      registerPrototype('shadcn-toggle', Toggle);
      let context!: DemoSetupContext;
      const cleanup = vi.fn();
      const child: DemoSpec = {
        type: 'demo',
        root: {
          kind: 'proto',
          prototypeId: 'shadcn-toggle',
          ref: 'toggle',
          children: ['Keep my state'],
        },
        setup(next) {
          context = next;
          return cleanup;
        },
      };
      const surface = createRuntimePreviewSurface(child, 'shadcn');
      const host = document.createElement('div');
      document.body.append(host);
      const result = await renderDemo({ runtime, host, demo: surface.demo });
      try {
        const toggle = context.refs.toggle!;
        const active = () => (context.api.getExposes('toggle')?.active as { get(): boolean }).get();
        toggle.click();
        await vi.waitFor(() => expect(active()).toBe(true));
        toggle.focus();
        surface.setAppearance('brutalist', {
          '--pui-background': '#fff',
          '--pui-foreground': '#000',
        });
        await vi.waitFor(() =>
          expect(
            host.querySelector('.pui-runtime-preview-surface')?.getAttribute('data-pui-style')
          ).toContain('rounded-none')
        );
        expect(context.refs.toggle).toBe(toggle);
        expect(active()).toBe(true);
        expect(document.activeElement).toBe(toggle);
        toggle.click();
        await vi.waitFor(() => expect(active()).toBe(false));
      } finally {
        await result.destroy();
      }
      expect(cleanup).toHaveBeenCalledTimes(1);
    }, 15000);
    it(`${runtime}: projects the real slot, keeps native node/focus identity on family/theme update and revokes cleanup`, async () => {
      registerPrototype('site-preview-surface', SitePreviewSurface);
      let context!: DemoSetupContext;
      const cleanup = vi.fn();
      const setup = vi.fn((next: DemoSetupContext) => {
        context = next;
        return cleanup;
      });
      const child: DemoSpec = {
        type: 'demo',
        root: {
          kind: 'box',
          tag: 'a',
          ref: 'original-link',
          attrs: { href: '#destination', 'aria-label': 'Original link' },
          children: ['Selectable original content'],
        },
        setup,
      };
      const surface = createRuntimePreviewSurface(child, 'shadcn', { '--pui-background': '#fff' });
      const host = document.createElement('div');
      document.body.append(host);
      const result = await renderDemo({ runtime, host, demo: surface.demo });
      try {
        const link = host.querySelector('a')!;
        const frame = host.querySelector<HTMLElement>('.pui-runtime-preview-surface')!;
        expect(context.refs['original-link']).toBe(link);
        expect(frame.contains(link)).toBe(true);
        expect(frame.getAttribute('role')).toBeNull();
        expect(frame.getAttribute('tabindex')).toBeNull();
        expect(frame.getAttribute('data-pui-style')).toContain('rounded-xl');
        link.focus();
        expect(document.activeElement).toBe(link);
        surface.setAppearance('brutalist', {
          '--pui-background': '#111',
          '--pui-foreground': '#fff',
        });
        await vi.waitFor(() =>
          expect(frame.getAttribute('data-pui-style')).toContain('rounded-none')
        );
        expect(host.querySelector('a')).toBe(link);
        expect(document.activeElement).toBe(link);
        expect(link.getAttribute('href')).toBe('#destination');
        expect(link.getAttribute('aria-label')).toBe('Original link');
        surface.setAppearance('brutalist', { '--pui-background': '#000' });
        expect(frame.style.getPropertyValue('--pui-foreground')).toBe('');
        expect(host.querySelector('a')).toBe(link);
        expect(setup).toHaveBeenCalledTimes(1);
        await result.destroy();
        expect(cleanup).toHaveBeenCalledTimes(1);
        expect(link.isConnected).toBe(false);
        surface.setAppearance('shadcn', { '--pui-background': '#ccc' });
        expect(link.isConnected).toBe(false);
      } finally {
        await result.destroy();
      }
    }, 15000);
  }
});
