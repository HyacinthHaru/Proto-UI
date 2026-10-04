import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { initSiteNativeControls } from './site-native-controls';
const theme = vi.hoisted(() => ({ color: '#222222', read: vi.fn() }));
vi.mock('./PrototypePreviewer/projection-theme', () => ({
  resolveProjectionThemeSurfaceStyle: (...args: unknown[]) => theme.read(...args),
}));
const releases: Array<() => void> = [];
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
beforeEach(() => {
  theme.color = '#222222';
  theme.read.mockReset().mockImplementation(() => ({ '--pui-foreground': theme.color }));
  document.body.innerHTML =
    '<div class="sidebar-pane"><ul class="top-level"><li><details><summary>Group</summary><a href="/a/">A</a><a href="/b/">B</a></details></li></ul></div>';
});
afterEach(() => {
  for (const release of releases.splice(0)) release();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('class');
  document.documentElement.removeAttribute('style');
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.siteLibraryFamily;
  vi.restoreAllMocks();
});
function assertColor(color: string) {
  const surfaces = document.querySelectorAll<HTMLElement>(
    'wc-site-shadcn-surface,wc-site-shadcn-text,wc-site-brutalist-surface,wc-site-brutalist-text'
  );
  expect(surfaces.length).toBe(6);
  for (const surface of surfaces)
    expect(surface.style.getPropertyValue('--pui-foreground')).toBe(color);
}
it('reads one theme per batch and reuses the closed snapshot for native interaction facts', async () => {
  releases.push(initSiteNativeControls());
  await settle();
  expect(theme.read).toHaveBeenCalledTimes(1);
  assertColor('#222222');
  const duplicate = initSiteNativeControls();
  duplicate();
  expect(theme.read).toHaveBeenCalledTimes(1);
  for (const link of document.querySelectorAll('a,summary')) {
    link.dispatchEvent(new Event('pointerenter'));
    link.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    link.dispatchEvent(new Event('pointerleave'));
  }
  await settle();
  expect(theme.read).toHaveBeenCalledTimes(1);
});
it('reads once and broadcasts the latest root class/theme/style/family input, preserving native owners', async () => {
  const summary = document.querySelector('summary')!;
  const link = document.querySelector('a')!;
  releases.push(initSiteNativeControls());
  await settle();
  for (const [attribute, value, color] of [
    ['class', 'dark', '#eeeeee'],
    ['data-theme', 'light', '#111111'],
    ['style', '--external-theme-input: 1', '#cc0000'],
    ['data-site-library-family', 'brutalist', '#00cc00'],
    ['data-site-library-family', 'shadcn', '#0000cc'],
  ]) {
    const previousReads = theme.read.mock.calls.length;
    theme.color = color;
    document.documentElement.setAttribute(attribute, value);
    await settle();
    expect(theme.read).toHaveBeenCalledTimes(previousReads + 1);
    assertColor(color);
    expect(document.querySelector('summary')).toBe(summary);
    expect(document.querySelector('a')).toBe(link);
  }
});
it('releases the batch watcher and resolves a fresh page snapshot on reconnect', async () => {
  const source = document.querySelector('a')!.firstChild;
  const release = initSiteNativeControls();
  releases.push(release);
  await settle();
  release();
  const reads = theme.read.mock.calls.length;
  theme.color = '#abcdef';
  document.documentElement.style.setProperty('--external-theme-input', 'new-page');
  await settle();
  expect(theme.read).toHaveBeenCalledTimes(reads);
  expect(document.querySelector('a')!.firstChild).toBe(source);
  releases.push(initSiteNativeControls());
  await settle();
  expect(theme.read).toHaveBeenCalledTimes(reads + 1);
  assertColor('#abcdef');
});

it('suppresses duplicate closed-theme broadcasts without losing root input observation', async () => {
  releases.push(initSiteNativeControls());
  await settle();
  const mutations: MutationRecord[] = [];
  const surface = document.querySelector('wc-site-shadcn-surface')!;
  const observer = new MutationObserver((records) => mutations.push(...records));
  observer.observe(surface, { attributes: true, attributeFilter: ['style'] });
  document.documentElement.classList.add('unrelated-layout-state');
  await settle();
  expect(theme.read).toHaveBeenCalledTimes(2);
  expect(mutations).toHaveLength(0);
  assertColor('#222222');
  observer.disconnect();
});

it('broadcasts a live color-scheme change once and releases its media listener', async () => {
  const media = Object.assign(new EventTarget(), { matches: false });
  vi.spyOn(window, 'matchMedia').mockReturnValue(media as MediaQueryList);
  const release = initSiteNativeControls();
  releases.push(release);
  await settle();
  theme.color = '#eeeeee';
  media.matches = true;
  media.dispatchEvent(new Event('change'));
  await settle();
  expect(theme.read).toHaveBeenCalledTimes(2);
  assertColor('#eeeeee');
  release();
  media.dispatchEvent(new Event('change'));
  await settle();
  expect(theme.read).toHaveBeenCalledTimes(2);
});
