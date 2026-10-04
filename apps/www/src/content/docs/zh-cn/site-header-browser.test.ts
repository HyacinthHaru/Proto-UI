import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Page } from 'playwright-core';
import { hasCommittedHeaderPreferencesDock, revealHeaderPreferences } from './site-header-browser';
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function fixture({ marker = true, visible = false, expanded = false } = {}) {
  const preferences = {
    count: vi.fn(async () => (marker ? 1 : 0)),
    isVisible: vi.fn(async () => visible),
    waitFor: vi.fn(async () => {}),
  };
  const menu = { getAttribute: vi.fn(async () => String(expanded)), click: vi.fn(async () => {}) };
  const page = {
    waitForFunction: vi.fn(async () => {}),
    locator: vi.fn((selector: string) =>
      selector === '[data-site-header] [data-site-header-preferences]' ? preferences : menu
    ),
  };
  return { page: page as unknown as Page, preferences, menu };
}

describe('native compact Header browser entry', () => {
  it('opens hidden preferences through the actual menu and waits for visibility', async () => {
    const f = fixture();
    expect(await revealHeaderPreferences(f.page)).toBe(true);
    expect(f.menu.click).toHaveBeenCalledWith();
    expect(f.preferences.waitFor).toHaveBeenCalledWith({ state: 'visible' });
    expect(f.page.waitForFunction).toHaveBeenCalledWith(hasCommittedHeaderPreferencesDock);
  });
  it('never toggles an already-open menu closed or changes visible desktop controls', async () => {
    const open = fixture({ expanded: true });
    await revealHeaderPreferences(open.page);
    expect(open.menu.click).not.toHaveBeenCalled();
    expect(open.preferences.waitFor).toHaveBeenCalledWith({ state: 'visible' });
    const desktop = fixture({ visible: true });
    expect(await revealHeaderPreferences(desktop.page)).toBe(false);
    expect(desktop.menu.click).not.toHaveBeenCalled();
  });
  it('preserves the immutable baseline without inventing a compact control path', async () => {
    const baseline = fixture({ marker: false });
    expect(await revealHeaderPreferences(baseline.page)).toBe(false);
    expect(baseline.menu.click).not.toHaveBeenCalled();
    expect(baseline.page.waitForFunction).not.toHaveBeenCalled();
  });
  it('rejects old visible ownership on both sides of a pending viewport move', () => {
    const media = { matches: true } as MediaQueryList;
    vi.spyOn(window, 'matchMedia').mockReturnValue(media);
    document.body.innerHTML =
      '<header data-site-header data-site-menu-ready><div data-site-header-context><div data-site-header-preferences>Original owner</div></div><div data-site-header-compact-context></div></header>';
    const preferences = document.querySelector('[data-site-header-preferences]')!;
    expect(hasCommittedHeaderPreferencesDock()).toBe(false);
    document.querySelector('[data-site-header-compact-context]')!.append(preferences);
    expect(hasCommittedHeaderPreferencesDock()).toBe(true);
    Object.defineProperty(media, 'matches', { value: false });
    expect(hasCommittedHeaderPreferencesDock()).toBe(false);
    document.querySelector('[data-site-header-context]')!.append(preferences);
    expect(hasCommittedHeaderPreferencesDock()).toBe(true);
    document.querySelector('header')!.removeAttribute('data-site-menu-ready');
    expect(hasCommittedHeaderPreferencesDock()).toBe(false);
  });
});
