import { describe, expect, it, vi } from 'vitest';
import type { Page } from 'playwright-core';
import { revealHeaderPreferences } from './site-header-browser';

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
});

// setViewportSize can settle before the application's matchMedia callback moves
// the existing owner. A visible old dock is not readiness for the new layout.
describe('Header owner docking before visibility sampling', () => {
  it('does not return from the visible desktop owner before compact docking', async () => {
    let docked = false;
    const f = fixture({ visible: true });
    f.preferences.isVisible.mockImplementation(async () => !docked);
    const waitForFunction = vi.fn(async (predicate: () => boolean) => {
      expect(predicate()).toBe(false);
      docked = true;
      expect(predicate()).toBe(true);
    });
    Object.assign(f.page, { waitForFunction });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) });
    vi.stubGlobal('document', {
      querySelector: () => ({
        parentElement: {
          matches: (selector: string) =>
            docked && selector === '[data-site-header-compact-context]',
        },
      }),
    });
    try {
      expect(await revealHeaderPreferences(f.page)).toBe(true);
      expect(waitForFunction).toHaveBeenCalledOnce();
      expect(f.menu.click).toHaveBeenCalledOnce();
      expect(f.preferences.waitFor).toHaveBeenCalledWith({ state: 'visible' });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('does not open the menu while compact controls are moving back to desktop', async () => {
    let docked = false;
    const f = fixture();
    f.preferences.isVisible.mockImplementation(async () => docked);
    const waitForFunction = vi.fn(async (predicate: () => boolean) => {
      expect(predicate()).toBe(false);
      docked = true;
      expect(predicate()).toBe(true);
    });
    Object.assign(f.page, { waitForFunction });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('document', {
      querySelector: () => ({
        parentElement: {
          matches: (selector: string) => docked && selector === '[data-site-header-context]',
        },
      }),
    });
    try {
      expect(await revealHeaderPreferences(f.page)).toBe(false);
      expect(waitForFunction).toHaveBeenCalledOnce();
      expect(f.menu.click).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

it('preserves a failed owner-docking wait without clicking or bypassing it', async () => {
  const f = fixture();
  const failure = new Error('owner docking did not complete');
  Object.assign(f.page, {
    waitForFunction: vi.fn(async () => {
      throw failure;
    }),
  });
  await expect(revealHeaderPreferences(f.page)).rejects.toBe(failure);
  expect(f.preferences.isVisible).not.toHaveBeenCalled();
  expect(f.menu.click).not.toHaveBeenCalled();
});
