import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initSiteContentsNavigation,
  initSiteHeaderDisclosure,
  type SiteHeaderDisclosure,
} from './site-header-disclosure';

let disclosure: SiteHeaderDisclosure | undefined;
let destroyContents: (() => void) | undefined;
let query: MediaQueryList;
function fixture(mobile = true) {
  const target = new EventTarget();
  query = Object.assign(target, { matches: mobile }) as MediaQueryList;
  vi.spyOn(window, 'matchMedia').mockReturnValue(query);
  document.body.innerHTML = `<header data-site-header>
    <div data-site-header-panel id="navigation-panel">
      <nav data-site-header-navigation><a href="/docs/">Docs</a></nav>
      <div data-site-header-settings id="settings-panel"><a href="/zh-cn/">简体中文</a></div>
    </div>
    <button data-menu>Menu</button><button data-runtime>Runtime</button>
  </header><button data-outside>Outside</button>`;
  const root = document.querySelector<HTMLElement>('header')!;
  const button = root.querySelector<HTMLButtonElement>('[data-menu]')!;
  disclosure = initSiteHeaderDisclosure(root);
  disclosure.bindButton(button);
  return {
    root,
    button,
    navigation: root.querySelector<HTMLElement>('nav')!,
    settings: root.querySelector<HTMLElement>('[data-site-header-settings]')!,
  };
}
beforeEach(() => vi.restoreAllMocks());
afterEach(() => {
  destroyContents?.();
  destroyContents = undefined;
  disclosure?.destroy();
  document.body.removeAttribute('data-mobile-menu-expanded');
  disclosure = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('shared website navigation disclosure', () => {
  it('keeps SSR navigation available until a real Button is ready, then opens and returns focus on Escape', async () => {
    const { root, button, navigation, settings } = fixture();
    expect(navigation.hidden).toBe(false);
    expect(settings.hidden).toBe(false);
    expect(initSiteHeaderDisclosure(root)).toBe(disclosure);
    disclosure!.enhance();
    expect(navigation.hidden).toBe(true);
    expect(settings.hidden).toBe(true);
    expect(button.getAttribute('aria-controls')).toBe('navigation-panel');
    disclosure!.toggle();
    await Promise.resolve();
    expect(navigation.hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(navigation.querySelector('a'));
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button);
  });

  it('keeps desktop links inline while the controlled settings are collapsed', async () => {
    const { button, navigation, settings } = fixture(false);
    disclosure!.enhance();
    expect(navigation.hidden).toBe(false);
    expect(settings.hidden).toBe(true);
    expect(button.getAttribute('aria-controls')).toBe('settings-panel');
    disclosure!.toggle();
    await Promise.resolve();
    expect(document.activeElement).toBe(settings.querySelector('a'));
    disclosure!.close();
    expect(navigation.hidden).toBe(false);
  });

  it('retains open state and rebinds return focus across a runtime generation', async () => {
    const { root, button } = fixture();
    disclosure!.enhance();
    disclosure!.toggle();
    const staged = document.createElement('div');
    staged.dataset.projectionGenerationState = 'prepared';
    const replacement = document.createElement('button');
    staged.append(replacement);
    root.append(staged);
    const unbind = disclosure!.bindButton(replacement);
    expect(replacement.getAttribute('aria-expanded')).toBe('true');
    button.remove();
    staged.dataset.projectionGenerationState = 'active';
    disclosure!.enhance();
    expect(root.dataset.siteMenuOpen).toBe('true');
    disclosure!.close(true);
    expect(document.activeElement).toBe(replacement);
    unbind();
  });

  it('does not close while using Runtime or a portaled Select, and respects the Select Escape', () => {
    const { root } = fixture();
    disclosure!.enhance();
    disclosure!.toggle();
    root
      .querySelector('[data-runtime]')!
      .dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.dataset.siteMenuOpen).toBe('true');
    const listbox = document.createElement('div');
    listbox.setAttribute('role', 'listbox');
    document.body.append(listbox);
    listbox.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    listbox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.dataset.siteMenuOpen).toBe('true');
    document
      .querySelector('[data-outside]')!
      .dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(root.dataset.siteMenuOpen).toBe('false');
  });

  it('restores a focused inline link to Menu when shrinking, without moving mounted nodes', () => {
    const { navigation, button } = fixture(false);
    disclosure!.enhance();
    const link = navigation.querySelector('a')!;
    link.focus();
    Object.defineProperty(query, 'matches', { value: true });
    query.dispatchEvent(new Event('change'));
    expect(navigation.hidden).toBe(true);
    expect(document.activeElement).toBe(button);
    expect(navigation.querySelector('a')).toBe(link);
  });

  it('restores readable fallback and removes listeners on disposal', () => {
    const { root, navigation, settings } = fixture();
    disclosure!.enhance();
    disclosure!.toggle();
    disclosure!.destroy();
    expect(navigation.hidden).toBe(false);
    expect(settings.hidden).toBe(false);
    expect(root.hasAttribute('data-site-menu-ready')).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(root.hasAttribute('data-site-menu-open')).toBe(false);
  });

  it('makes global navigation and contents mutually exclusive so one Escape returns focus only to the active opener', async () => {
    const { root, button } = fixture();
    const contentsHost = document.createElement('starlight-menu-button');
    const contentsButton = document.createElement('button');
    contentsButton.textContent = 'Contents';
    contentsHost.append(contentsButton);
    root.append(contentsHost);
    // Model Starlight's existing click owner; the website only coordinates drawers.
    contentsButton.addEventListener('click', () => {
      contentsHost.setAttribute('aria-expanded', 'true');
      document.body.setAttribute('data-mobile-menu-expanded', '');
    });
    const desktopQuery = Object.assign(new EventTarget(), { matches: false }) as MediaQueryList;
    vi.mocked(window.matchMedia).mockReturnValue(desktopQuery);
    destroyContents = initSiteContentsNavigation(document);
    expect(initSiteContentsNavigation(document)).toBe(destroyContents);
    disclosure!.enhance();

    contentsButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(contentsButton.getAttribute('aria-expanded')).toBe('true');
    disclosure!.toggle();
    await Promise.resolve();
    expect(contentsButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.body.hasAttribute('data-mobile-menu-expanded')).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'Escape', bubbles: true })
    );
    expect(document.activeElement).toBe(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');

    disclosure!.toggle();
    await Promise.resolve();
    contentsButton.focus();
    contentsButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(contentsButton.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(contentsButton);
    contentsButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    );
    contentsButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(contentsButton);
    expect(contentsButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('cleans both drawer listeners and contents observer before Astro navigation', async () => {
    const { root, button } = fixture();
    const host = document.createElement('starlight-menu-button');
    host.innerHTML = '<button>Contents</button>';
    root.append(host);
    vi.mocked(window.matchMedia).mockReturnValue(
      Object.assign(new EventTarget(), { matches: false }) as MediaQueryList
    );
    destroyContents = initSiteContentsNavigation(document);
    disclosure!.enhance();
    disclosure!.toggle();
    document.dispatchEvent(new Event('astro:before-swap'));
    host.setAttribute('aria-expanded', 'true');
    document.body.setAttribute('data-mobile-menu-expanded', '');
    await new Promise((resolve) => setTimeout(resolve, 0));
    button.focus();
    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
    expect(document.activeElement).toBe(button);
    expect(host.getAttribute('aria-expanded')).toBe('true');
    expect(root.hasAttribute('data-site-menu-open')).toBe(false);
  });
});
