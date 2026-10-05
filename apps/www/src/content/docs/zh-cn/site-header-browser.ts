import type { Page } from 'playwright-core';

/** Follow the real compact Header journey. This helper neither changes app
 * preferences nor forces interaction with hidden controls. Old baseline pages
 * without the docking marker retain their existing visible selector path. */
export async function revealHeaderPreferences(page: Page): Promise<boolean> {
  const preferences = page.locator('[data-site-header] [data-site-header-preferences]');
  if (!(await preferences.count())) return false;
  // A viewport change can precede the application's matchMedia callback.
  // Wait for the existing owner to reach its real dock, not for a desired
  // height or a guessed paint delay, before deciding whether to open its menu.
  await page.waitForFunction(() => {
    const owner = document.querySelector('[data-site-header] [data-site-header-preferences]');
    const compact = window.matchMedia('(max-width: 47.999rem)').matches;
    return owner?.parentElement?.matches(
      compact ? '[data-site-header-compact-context]' : '[data-site-header-context]'
    );
  });
  if (await preferences.isVisible()) return false;
  const menu = page.locator(
    '[data-site-header] .site-header-menu [data-projection-generation-state="active"] [data-demo-ref="home-menu"], [data-docs-site-header] [data-site-menu-button]'
  );
  if ((await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
  await preferences.waitFor({ state: 'visible' });
  return true;
}
