/** Application-owned navigation disclosure. Button owns command activation;
 * the website owns navigation visibility, ARIA relationships and return focus. */
export interface SiteHeaderDisclosure {
  bindButton(button: HTMLElement): () => void;
  enhance(): void;
  toggle(): void;
  close(restoreFocus?: boolean): void;
  destroy(): void;
}

const SITE_HEADER_OPEN_EVENT = 'site-header:disclosure-open';
const SITE_CONTENTS_OPEN_EVENT = 'site-contents:open';
const disclosures = new WeakMap<HTMLElement, SiteHeaderDisclosure>();
const contentsNavigations = new WeakMap<HTMLElement, () => void>();
const FOCUSABLE = 'a[href], button, [role="button"], [role="combobox"], [tabindex="0"]';

export function initSiteHeaderDisclosure(root: HTMLElement): SiteHeaderDisclosure {
  const existing = disclosures.get(root);
  if (existing) return existing;
  const document = root.ownerDocument;
  const window = document.defaultView;
  const panel = root.querySelector<HTMLElement>('[data-site-header-panel]');
  const navigation = root.querySelector<HTMLElement>('[data-site-header-navigation]');
  const settings = root.querySelector<HTMLElement>('[data-site-header-settings]');
  const compact = window?.matchMedia('(max-width: 47.999rem)');
  const buttons = new Set<HTMLElement>();
  let enhanced = false;
  let open = false;
  let destroyed = false;
  // Docs offsets follow the actual header, including font enlargement and
  // wrapped values. The existing disclosure owns this one measurement source.
  const frame = root.hasAttribute('data-docs-site-header')
    ? root.closest<HTMLElement>('.site-page-frame')
    : null;
  const originalHeight = frame?.style.getPropertyValue('--header-height') ?? '';
  const originalHeightPriority = frame?.style.getPropertyPriority('--header-height') ?? '';
  let measuredHeight: string | null = null;
  const measureHeader = () => {
    if (destroyed || !enhanced || !frame || !root.isConnected) return;
    // offsetHeight is a layout pixel measurement; CSS zoom must not be applied
    // twice when this value is later consumed by a positioned descendant.
    const height = root.offsetHeight;
    if (!Number.isFinite(height) || height <= 0) return;
    const next = `${height}px`;
    if (frame.style.getPropertyValue('--header-height') === next) return;
    frame.style.setProperty('--header-height', next);
    measuredHeight = next;
  };
  const heightObserver =
    frame && typeof window?.ResizeObserver === 'function'
      ? new window.ResizeObserver(measureHeader)
      : null;
  heightObserver?.observe(root);
  if (frame && !heightObserver) window?.addEventListener('resize', measureHeader);
  const activeButton = () =>
    [...buttons].find((button) => {
      const generation = button.closest<HTMLElement>('[data-projection-generation-state]');
      return (
        button.isConnected &&
        (!generation || generation.dataset.projectionGenerationState === 'active')
      );
    });
  const sync = () => {
    root.dataset.siteMenuOpen = String(open);
    root.toggleAttribute('data-site-menu-ready', enhanced);
    if (navigation) navigation.hidden = enhanced && !!compact?.matches && !open;
    if (settings) settings.hidden = enhanced && !open;
    const controlled = compact?.matches ? panel : settings;
    for (const button of buttons) {
      button.setAttribute('aria-expanded', String(open));
      if (controlled?.id) button.setAttribute('aria-controls', controlled.id);
    }
    measureHeader();
  };
  const close = (restoreFocus = false) => {
    if (!open || destroyed) return;
    open = false;
    sync();
    if (restoreFocus) activeButton()?.focus();
  };
  const onEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !open) return;
    // A Select or another nested overlay owns its own Escape first.
    const target = event.target as Element | null;
    if (target?.closest('[role="listbox"], [role="dialog"]')) return;
    event.preventDefault();
    close(true);
  };
  const onOutside = (event: Event) => {
    if (!open) return;
    const target = event.target as Element | null;
    if (!target || root.contains(target)) return;
    // Header Select popups are portaled. Do not dismiss their parent disclosure.
    if (target.closest('[role="listbox"], [data-site-select-content]')) return;
    close();
  };
  const onNavigation = (event: Event) => {
    const link = (event.target as Element | null)?.closest('a[href]');
    if (link && panel?.contains(link)) close();
  };
  const onBreakpoint = () => {
    const focused = document.activeElement;
    sync();
    if (navigation?.hidden && focused && navigation.contains(focused)) activeButton()?.focus();
  };
  const onContentsOpen = () => close();
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    heightObserver?.disconnect();
    window?.removeEventListener('resize', measureHeader);
    if (
      frame &&
      measuredHeight !== null &&
      frame.style.getPropertyValue('--header-height') === measuredHeight &&
      frame.style.getPropertyPriority('--header-height') === ''
    ) {
      if (originalHeight)
        frame.style.setProperty('--header-height', originalHeight, originalHeightPriority);
      else frame.style.removeProperty('--header-height');
    }
    compact?.removeEventListener('change', onBreakpoint);
    document.removeEventListener('keydown', onEscape);
    document.removeEventListener('pointerdown', onOutside);
    document.removeEventListener(SITE_CONTENTS_OPEN_EVENT, onContentsOpen);
    document.removeEventListener('astro:before-swap', destroy);
    panel?.removeEventListener('click', onNavigation);
    buttons.clear();
    if (navigation) navigation.hidden = false;
    if (settings) settings.hidden = false;
    root.removeAttribute('data-site-menu-ready');
    root.removeAttribute('data-site-menu-open');
    disclosures.delete(root);
  };
  const handle: SiteHeaderDisclosure = {
    bindButton(button) {
      buttons.add(button);
      sync();
      return () => {
        buttons.delete(button);
      };
    },
    enhance() {
      if (destroyed || enhanced) return;
      enhanced = true;
      sync();
    },
    toggle() {
      if (destroyed || !enhanced) return;
      open = !open;
      sync();
      if (open) {
        document.dispatchEvent(new CustomEvent(SITE_HEADER_OPEN_EVENT));
        queueMicrotask(() => {
          if (!open || destroyed) return;
          const region = compact?.matches ? panel : settings;
          const target = [...(region?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].find(
            (element) => !element.closest('[hidden], [inert]')
          );
          target?.focus();
        });
      }
    },
    close,
    destroy,
  };
  compact?.addEventListener('change', onBreakpoint);
  document.addEventListener('keydown', onEscape);
  document.addEventListener('pointerdown', onOutside);
  document.addEventListener(SITE_CONTENTS_OPEN_EVENT, onContentsOpen);
  document.addEventListener('astro:before-swap', destroy);
  panel?.addEventListener('click', onNavigation);
  disclosures.set(root, handle);
  return handle;
}

/** Keep the existing Starlight contents drawer independent from, and mutually
 * exclusive with, global navigation. Closing its peer must never steal focus. */
export function initSiteContentsNavigation(document: Document): (() => void) | undefined {
  const menuHost = document.querySelector<HTMLElement>('starlight-menu-button');
  const menuControl = menuHost?.querySelector('button');
  if (!menuHost || !menuControl) return;
  const existing = contentsNavigations.get(menuHost);
  if (existing) return existing;
  let expanded = false;
  let destroyed = false;
  const syncExpandedState = () => {
    const next = menuHost.getAttribute('aria-expanded') === 'true';
    menuControl.setAttribute('aria-expanded', String(next));
    const newlyOpened = next && !expanded;
    expanded = next;
    if (newlyOpened) document.dispatchEvent(new CustomEvent(SITE_CONTENTS_OPEN_EVENT));
  };
  const collapseMenu = (restoreFocus = false) => {
    menuHost.setAttribute('aria-expanded', 'false');
    document.body.removeAttribute('data-mobile-menu-expanded');
    syncExpandedState();
    if (restoreFocus) menuControl.focus();
  };
  const desktopQuery = document.defaultView?.matchMedia('(min-width: 64rem)');
  const collapseOnDesktop = () => {
    if (desktopQuery?.matches) collapseMenu();
  };
  const onHeaderOpen = () => collapseMenu();
  const onEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !document.body.hasAttribute('data-mobile-menu-expanded')) return;
    collapseMenu(true);
  };
  const observer = new MutationObserver(syncExpandedState);
  observer.observe(menuHost, { attributes: true, attributeFilter: ['aria-expanded'] });
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    observer.disconnect();
    desktopQuery?.removeEventListener('change', collapseOnDesktop);
    document.removeEventListener(SITE_HEADER_OPEN_EVENT, onHeaderOpen);
    document.removeEventListener('keyup', onEscape);
    document.removeEventListener('astro:before-swap', destroy);
    collapseMenu();
    contentsNavigations.delete(menuHost);
  };
  desktopQuery?.addEventListener('change', collapseOnDesktop);
  document.addEventListener(SITE_HEADER_OPEN_EVENT, onHeaderOpen);
  document.addEventListener('keyup', onEscape);
  document.addEventListener('astro:before-swap', destroy);
  contentsNavigations.set(menuHost, destroy);
  syncExpandedState();
  collapseOnDesktop();
  return destroy;
}
