import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import SiteLinkSurface, {
  type SiteLinkAppearance,
  type SiteLinkEmphasis,
  type SiteLinkSurfaceProps,
} from '../prototypes/site-link-surface.proto';
import { type SiteLinkIcon } from '../prototypes/site-link-icons';
import { bindNativeLinkFacts } from './site-native-link-facts';
import { resolveSiteLibraryFamily, type SiteLibraryFamily } from './site-library-family';
import { resolveProjectionThemeSurfaceStyle } from './PrototypePreviewer/projection-theme';

const SITE_LINK_TAG = 'wc-site-link-surface';
const bindings = new WeakMap<HTMLAnchorElement, () => void>();

export function siteLinkAppearance(link: HTMLAnchorElement): SiteLinkAppearance {
  if (link.hasAttribute('data-home-brand')) return 'brand';
  const requested = link.dataset.siteLinkAppearance;
  if (
    requested === 'action' ||
    requested === 'icon' ||
    requested === 'nav' ||
    requested === 'text' ||
    requested === 'brand'
  )
    return requested;
  if (link.closest('.homepage-hero__eyebrow')) return 'text';
  if (link.closest('[data-site-header-navigation]')) return 'nav';
  return link.dataset.homeActionVariant === 'minimal' || link.dataset.homeActionVariant === 'link'
    ? 'text'
    : 'action';
}
export function siteLinkEmphasis(link: HTMLAnchorElement): SiteLinkEmphasis {
  const value = link.dataset.homeActionVariant;
  return value === 'primary' || value === 'minimal' || value === 'link' ? value : 'secondary';
}
export function siteLinkIcon(link: HTMLAnchorElement): SiteLinkIcon | 'none' {
  const value = link.dataset.siteLinkIcon;
  return value === 'github' || value === 'discord' || value === 'x' || value === 'bluesky'
    ? value
    : 'none';
}

/** Enhances existing SSR anchors, never replaces their native navigation root.
 * Homepage-owned groups use the same Prototype through their four-runtime
 * transaction; this small WC bridge is only for static documentation chrome. */
export function initSiteNativeControls(scope: ParentNode = document): () => void {
  const document = scope.nodeType === 9 ? (scope as Document) : (scope as Node).ownerDocument;
  if (!document) return () => {};
  const view = document.defaultView;
  if (!view) return () => {};
  if (!view.customElements.get(SITE_LINK_TAG)) {
    const Constructor = AdaptToWebComponent(SiteLinkSurface, {
      register: false,
      registerAs: SITE_LINK_TAG,
    });
    view.customElements.define(SITE_LINK_TAG, Constructor);
  }
  const releases: Array<() => void> = [];
  for (const link of scope.querySelectorAll<HTMLAnchorElement>(
    'a[data-site-native-link], a[data-site-native-button]'
  )) {
    if (link.closest('[data-homepage-actions]') || bindings.has(link)) continue;
    let alive = true;
    const surface = document.createElement(SITE_LINK_TAG);
    // Keep SSR glyph/text nodes: the passive slot never takes ownership of the
    // anchor's name, destination, focus target, or default browser action.
    const content = Array.from(link.childNodes);
    surface.append(...content);
    link.append(surface);
    link.classList.add('site-native-link');
    link.dataset.siteLinkEnhanced = 'true';
    link.dataset.siteNativeLink = '';
    link.removeAttribute('data-slot');
    link.removeAttribute('data-site-native-button');
    let facts = { hovered: false, pressed: false, focusVisible: false, current: false };
    const update = () => {
      if (!alive) return;
      const family: SiteLibraryFamily =
        document.documentElement.dataset.siteLibraryFamily === 'brutalist'
          ? 'brutalist'
          : resolveSiteLibraryFamily(view.location.pathname);
      const props: SiteLinkSurfaceProps & { surfaceStyle: Record<string, string> } = {
        family,
        appearance: siteLinkAppearance(link),
        emphasis: siteLinkEmphasis(link),
        icon: 'none',
        ...facts,
        surfaceStyle: resolveProjectionThemeSurfaceStyle(family, document.documentElement),
      };
      setElementProps(surface, props);
      // Direct props can arrive during Custom Element upgrade. Replay only
      // while this exact native link binding still owns the surface.
      queueMicrotask(() => {
        if (alive && surface.isConnected)
          (surface as HTMLElement & { setProps?: (props: unknown) => void }).setProps?.(props);
      });
    };
    const unbind = bindNativeLinkFacts(link, (next) => {
      facts = next;
      update();
    });
    const observer = new view.MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-site-library-family'],
    });
    const media = view.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', update);
    const release = () => {
      if (!alive) return;
      // The fact bridge clears its contribution before the binding is torn
      // down; no queued replay may modify the new page/generation afterwards.
      unbind();
      alive = false;
      observer.disconnect();
      media?.removeEventListener?.('change', update);
      bindings.delete(link);
      if (surface.parentElement === link) {
        surface.replaceWith(...Array.from(surface.childNodes));
        delete link.dataset.siteLinkEnhanced;
      }
    };
    bindings.set(link, release);
    releases.push(release);
  }
  return () => {
    for (const release of releases) release();
  };
}
