import { afterEach, describe, expect, it, vi } from 'vitest';
import { initSiteNativeControls } from './site-native-controls';
vi.mock('./PrototypePreviewer/projection-theme', () => ({
  resolveProjectionThemeSurfaceStyle: (family: string) => ({
    '--pui-foreground': family === 'brutalist' ? '#111' : '#222',
  }),
}));
const releases: Array<() => void> = [];
const settle = async () => {
  for (let index = 0; index < 12; index++) await Promise.resolve();
};
afterEach(() => {
  for (const release of releases.splice(0)) release();
  document.body.replaceChildren();
  delete document.documentElement.dataset.siteLibraryFamily;
  vi.restoreAllMocks();
});

describe('website native anchor composition', () => {
  it('retains the native link and moves only its content into a passive visual Prototype', async () => {
    document.body.innerHTML =
      '<a data-site-native-button href="/docs/" target="_blank" rel="noreferrer" aria-label="Docs"><span>Docs</span></a>';
    const link = document.querySelector('a')!;
    document.documentElement.dataset.siteLibraryFamily = 'brutalist';
    releases.push(initSiteNativeControls());
    await settle();
    const surface = link.querySelector('wc-site-link-surface') as HTMLElement & {
      getExposes(): Record<string, unknown>;
    };
    expect(surface).not.toBeNull();
    expect(surface.getAttribute('data-pui-style')).toContain('border-foreground');
    expect(surface.getAttribute('data-pui-style')).toContain('rounded-none');
    expect(surface.textContent).toBe('Docs');
    expect(surface.getExposes()).toEqual({});
    expect(surface.hasAttribute('role')).toBe(false);
    expect(surface.hasAttribute('tabindex')).toBe(false);
    expect(link.getAttribute('href')).toBe('/docs/');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
    expect(link.getAttribute('aria-label')).toBe('Docs');
    expect(link.hasAttribute('role')).toBe(false);
    expect(link.hasAttribute('data-slot')).toBe(false);
    link.dispatchEvent(new Event('pointerenter'));
    await settle();
    expect(surface.getAttribute('data-pui-style')).toContain('bg-main');
    link.dispatchEvent(new Event('pointerleave'));
    await settle();
    expect(surface.getAttribute('data-pui-style')).not.toContain('bg-main');
    document.documentElement.dataset.siteLibraryFamily = 'shadcn';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await settle();
    expect(surface.getAttribute('data-pui-style')).toContain('rounded-lg');
    expect(surface.getAttribute('data-pui-style')).not.toContain('rounded-none');
  });
  it('does not wrap a homepage transaction and supports cleanup followed by reinitialization', async () => {
    document.body.innerHTML =
      '<a data-site-native-button href="/docs/">Docs</a><div data-homepage-actions><a data-site-native-link href="/home/">Home</a></div>';
    const release = initSiteNativeControls();
    const releaseDuplicate = initSiteNativeControls();
    await settle();
    expect(document.querySelectorAll('wc-site-link-surface')).toHaveLength(1);
    releaseDuplicate();
    expect(document.querySelector('[data-homepage-actions] wc-site-link-surface')).toBeNull();
    const first = document.querySelector('wc-site-link-surface')!;
    release();
    expect(document.querySelector('wc-site-link-surface')).toBeNull();
    releases.push(initSiteNativeControls());
    await settle();
    expect(document.querySelector('wc-site-link-surface')).not.toBe(first);
    expect(document.querySelectorAll('wc-site-link-surface')).toHaveLength(1);
  });
});
