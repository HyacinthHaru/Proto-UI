import {
  withNativeContentLease,
  registerNativeContentContainer,
} from './PrototypePreviewer/native-content-lease';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import ShadcnSurface from '@proto.ui/prototypes-shadcn/surface';
import BrutalistSurface from '@proto.ui/prototypes-brutalist/surface';
import ShadcnText from '@proto.ui/prototypes-shadcn/text';
import BrutalistText from '@proto.ui/prototypes-brutalist/text';
import {
  linkSurfaceProps,
  linkSurfaceLayout,
  linkTextProps,
  type SiteLinkAppearance,
  type SiteLinkEmphasis,
} from './site-link-recipes';
import { type SiteLinkIcon } from '../prototypes/site-link-icons';
import { bindNativeLinkFacts } from './site-native-link-facts';
import { resolveSiteLibraryFamily, type SiteLibraryFamily } from './site-library-family';
import { resolveProjectionThemeSurfaceStyle } from './PrototypePreviewer/projection-theme';

const bindings = new WeakMap<HTMLAnchorElement, () => void>();

export function siteLinkAppearance(link: HTMLAnchorElement): SiteLinkAppearance {
  if (link.hasAttribute('data-home-brand')) return 'brand';
  const requested = link.dataset.siteLinkAppearance;
  if (
    requested === 'action' ||
    requested === 'icon' ||
    requested === 'nav' ||
    requested === 'text' ||
    requested === 'brand' ||
    requested === 'sidebar' ||
    requested === 'toc' ||
    requested === 'pagination'
  )
    return requested;
  if (link.closest('.homepage-hero__eyebrow')) return 'text';
  if (link.closest('.sidebar-pane .top-level')) return 'sidebar';
  if (link.closest('.pagination-links')) return 'pagination';
  if (link.closest('sl-toc')) return 'toc';
  if (link.closest('[data-site-header-navigation], [data-site-header-desktop-navigation]'))
    return 'nav';
  return link.dataset.homeActionVariant === 'minimal' || link.dataset.homeActionVariant === 'link'
    ? 'text'
    : 'action';
}

/** Keep Starlight's localized label, line break and title nodes. Only the
 * existing caption becomes visually hidden; the native accessible name still
 * includes Previous/Next and the title. Releasing restores exact node order. */
function preparePaginationCaption(link: HTMLAnchorElement): () => void {
  if (siteLinkAppearance(link) !== 'pagination') return () => {};
  const title = link.querySelector('.link-title');
  const label = title?.parentElement;
  if (!title || !label) return () => {};
  const before: ChildNode[] = [];
  for (const node of label.childNodes) {
    if (node === title) break;
    before.push(node);
  }
  if (!before.length) return () => {};
  const caption = link.ownerDocument.createElement('span');
  caption.dataset.sitePaginationCaption = '';
  caption.append(...before);
  label.insertBefore(caption, title);
  return () => caption.replaceWith(...before);
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
  for (const [family, surface, text] of [
    ['shadcn', ShadcnSurface, ShadcnText],
    ['brutalist', BrutalistSurface, BrutalistText],
  ] as const) {
    for (const [part, proto] of [
      ['surface', surface],
      ['text', text],
    ] as const) {
      const tag = `wc-site-${family}-${part}`;
      if (!view.customElements.get(tag))
        view.customElements.define(
          tag,
          AdaptToWebComponent(proto, { register: false, registerAs: tag })
        );
    }
  }
  const releases: Array<() => void> = [];
  for (const link of scope.querySelectorAll<HTMLAnchorElement>(
    'a[data-site-native-link], a[data-site-native-button], .sidebar-pane .top-level a[href], .pagination-links a[href], sl-toc a[href]'
  )) {
    if (link.closest('[data-homepage-actions]') || bindings.has(link)) continue;
    let alive = true;
    const appearance = siteLinkAppearance(link);
    let restoreCaption = () => {};
    let family: SiteLibraryFamily =
      document.documentElement.dataset.siteLibraryFamily === 'brutalist'
        ? 'brutalist'
        : resolveSiteLibraryFamily(view.location.pathname);
    let surface = document.createElement(`wc-site-${family}-surface`);
    let texts: HTMLElement[] = [];
    // Original arrows and text regions remain separate flex items, in source
    // order. Wrapping an entire anchor would break pagination reversal and
    // sidebar label/badge alignment even if the accessible name survived.
    const content = Array.from(link.childNodes);
    const composeContent = () => {
      surface.dataset.siteLinkContent = '';
      registerNativeContentContainer(surface, content);
      texts = [];
      for (const node of content) {
        if (
          (node.nodeType === 1 &&
            (node as Element).namespaceURI === 'http://www.w3.org/2000/svg') ||
          (node.nodeType === 3 && !node.textContent?.trim())
        ) {
          surface.append(node);
        } else {
          const text = document.createElement(`wc-site-${family}-text`);
          text.dataset.siteLinkText = '';
          registerNativeContentContainer(text, [node]);
          text.append(node);
          surface.append(text);
          texts.push(text);
        }
      }
    };
    withNativeContentLease(link, () => {
      restoreCaption = preparePaginationCaption(link);
      composeContent();
      link.append(surface);
    });
    link.classList.add('site-native-link');
    link.dataset.siteLinkEnhanced = 'true';
    link.dataset.siteLinkAppearance = appearance;
    link.dataset.siteNativeLink = '';
    link.removeAttribute('data-slot');
    link.removeAttribute('data-site-native-button');
    let facts = { hovered: false, pressed: false, focusVisible: false, current: false };
    const update = () => {
      if (!alive) return;
      const nextFamily: SiteLibraryFamily =
        document.documentElement.dataset.siteLibraryFamily === 'brutalist'
          ? 'brutalist'
          : resolveSiteLibraryFamily(view.location.pathname);
      if (nextFamily !== family) {
        const previous = surface;
        family = nextFamily;
        surface = document.createElement(`wc-site-${family}-surface`);
        withNativeContentLease(link, () => {
          composeContent();
          previous.replaceWith(surface);
        });
      }
      const theme = resolveProjectionThemeSurfaceStyle(family, document.documentElement);
      const props = {
        ...linkSurfaceProps(family, appearance, siteLinkEmphasis(link), facts),
        surfaceStyle: {
          ...theme,
          ...linkSurfaceLayout(family, appearance, siteLinkEmphasis(link)),
        },
      };
      setElementProps(surface, props);
      const textProps = {
        ...linkTextProps(appearance, facts),
        surfaceStyle: { ...theme, minWidth: '0' },
      };
      for (const text of texts) setElementProps(text, textProps);
      // Direct props can arrive during Custom Element upgrade. Replay only
      // while this exact native link binding still owns the surface.
      queueMicrotask(() => {
        if (alive && surface.isConnected) {
          (surface as HTMLElement & { setProps?: (props: unknown) => void }).setProps?.(props);
          for (const text of texts)
            (text as HTMLElement & { setProps?: (props: unknown) => void }).setProps?.(textProps);
        }
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
      withNativeContentLease(link, () => {
        restoreCaption();
        if (surface.parentElement === link) {
          surface.replaceWith(...content);
          delete link.dataset.siteLinkEnhanced;
        }
      });
    };
    bindings.set(link, release);
    releases.push(release);
  }
  return () => {
    for (const release of releases) release();
  };
}
