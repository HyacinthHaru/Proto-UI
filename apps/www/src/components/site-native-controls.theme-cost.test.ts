import { afterEach, expect, it, vi } from 'vitest';
import { initSiteNativeControls } from './site-native-controls';
import { WEBSITE_SHADCN_THEME_TOKENS } from './PrototypePreviewer/projection-theme';

const releases: Array<() => void> = [];
const styles: HTMLStyleElement[] = [];
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let index = 0; index < 12; index++) await Promise.resolve();
};
afterEach(() => {
  for (const release of releases.splice(0)) release();
  for (const style of styles.splice(0)) style.remove();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

it('samples the real root theme once before the batch writes, independent of the number of native owners', async () => {
  // Real projection-theme, public family Surface/Text and WC Adapter. Count only
  // the root computed-style reads, not unrelated Adapter style work or CPU time.
  for (const name of WEBSITE_SHADCN_THEME_TOKENS)
    document.documentElement.style.setProperty(`--pui-${name}`, '#222222');
  document.body.innerHTML = Array.from(
    { length: 20 },
    (_, index) => `<a data-site-native-link href="/page-${index}/"><span>Page ${index}</span></a>`
  ).join('');
  const nativeOwners = [...document.querySelectorAll('a')];
  const content = nativeOwners.map((link) => link.firstChild);
  const nativeGetComputedStyle = window.getComputedStyle.bind(window);
  const rootReadAfterOwnerCounts: number[] = [];
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    if (element === document.documentElement)
      rootReadAfterOwnerCounts.push(document.querySelectorAll('[data-site-link-enhanced]').length);
    return nativeGetComputedStyle(element);
  });
  const release = initSiteNativeControls();
  releases.push(release);
  await settle();
  expect(rootReadAfterOwnerCounts).toEqual([0]);
  expect(document.querySelectorAll('wc-site-shadcn-surface')).toHaveLength(20);
  for (const [index, link] of nativeOwners.entries()) {
    expect(link.querySelector('span')).toBe(content[index]);
    expect(
      link
        .querySelector<HTMLElement>('wc-site-shadcn-text')!
        .style.getPropertyValue('--pui-foreground')
    ).toBe('#222222');
  }

  const duplicate = initSiteNativeControls();
  duplicate();
  expect(rootReadAfterOwnerCounts).toEqual([0]);
  for (const link of nativeOwners) {
    link.dispatchEvent(new Event('pointerenter'));
    link.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
    link.dispatchEvent(new Event('pointerleave'));
  }
  await settle();
  expect(rootReadAfterOwnerCounts).toEqual([0, 20, 20]);
  release();
  await settle();
  expect(rootReadAfterOwnerCounts).toEqual([0, 20, 20]);
  for (const [index, link] of nativeOwners.entries()) expect(link.firstChild).toBe(content[index]);
});

it('settles a real CSSOM edit followed by native focus within the same pointer event', async () => {
  const style = document.createElement('style');
  styles.push(style);
  style.textContent = `:root{${WEBSITE_SHADCN_THEME_TOKENS.map((name) => `--pui-${name}:#222222;`).join('')}}`;
  document.head.append(style);
  document.body.innerHTML =
    '<a data-site-native-link href="/a/">A</a><a data-site-native-link href="/b/">B</a>';
  releases.push(initSiteNativeControls());
  await settle();
  const [first, second] = [...document.querySelectorAll('a')];
  // Register after the native fact bridge: its first sample sees the old theme.
  // This real CSSOM write emits no root mutation; native focus publishes the
  // second owner's fact before the same pointerdown dispatch returns.
  first.addEventListener('pointerdown', () => {
    style.sheet!.insertRule(':root{--pui-foreground:#ff0000}', style.sheet!.cssRules.length);
    second.focus();
  });
  first.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
  // Happy DOM's frame callback verifies host scheduling, not actual browser paint.
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  expect(
    window.getComputedStyle(document.documentElement).getPropertyValue('--pui-foreground')
  ).toBe('#ff0000');
  expect(document.activeElement).toBe(second);
  for (const text of document.querySelectorAll<HTMLElement>('wc-site-shadcn-text'))
    expect(text.style.getPropertyValue('--pui-foreground')).toBe('#ff0000');
});
