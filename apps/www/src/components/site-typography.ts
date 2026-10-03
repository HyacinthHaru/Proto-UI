import {
  SITE_TYPOGRAPHY_ROLES,
  type SiteTypographyRole,
} from '../prototypes/site-typography.proto';
import { prepareDemoRuntime, renderDemo } from './PrototypePreviewer/demo-renderer';
import { loadPrototypes } from './PrototypePreviewer/prototype-modules';
import type { DemoRenderResult, DemoSpec } from './PrototypePreviewer/demo-types';
import type { MaterializedProjectionCandidate } from './PrototypePreviewer/projection-materializer';
import type { ProjectionScopeMaterializeRequest } from './PrototypePreviewer/projection-scope';
import {
  applyProjectionThemeSurfaceStyle,
  resolveProjectionThemeSurfaceStyle,
  type ProjectionThemeSurfaceStyle,
} from './PrototypePreviewer/projection-theme';
import { releaseHostMount } from './PrototypePreviewer/runtimes/host-mount';
import { isRuntimeId } from './PrototypePreviewer/runtimes/registry';

const ROLES = new Set<string>(SITE_TYPOGRAPHY_ROLES);
const SEMANTIC_TARGETS = 'h1,h2,h3,h4,h5,h6,p,label,legend,figcaption';
const COMPONENT_OWNED =
  '[data-pui-root],[data-pui-style],[data-previewer-id],[data-home-showcase],[data-homepage-actions],[data-site-native-link],[data-site-native-button],pre,code,script,style,template';
const MARKERS = [
  'data-typography-owner',
  'data-typography-runtime',
  'data-typography-family',
  'data-typography-generation',
] as const;
type Target = { native: HTMLElement; role: SiteTypographyRole };
type View = Target & {
  carrier: HTMLElement;
  surface: HTMLElement;
  slot: HTMLElement;
  home: HTMLElement;
};
const activeViews = new WeakMap<HTMLElement, View>();
let serial = 0;

/** Inventory uses native semantics, never discovers text by replacing HTML.
 * Existing Proto component content is deliberately not wrapped a second time. */
export function collectSiteTypographyTargets(root: ParentNode, docsOnly = false): Target[] {
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>(
      docsOnly
        ? '[data-site-typography], [data-doc-flow] :is(h1,h2,h3,h4,h5,h6,p,label,legend,figcaption)'
        : `[data-site-typography],${SEMANTIC_TARGETS}`
    )
  );
  return candidates.flatMap((native): Target[] => {
    const explicit = native.dataset.siteTypography;
    const explicitRole = explicit !== undefined && ROLES.has(explicit);
    if (
      native.closest('[data-site-typography-batch],pre,code,script,style,template') ||
      (!explicitRole && native.closest(COMPONENT_OWNED))
    )
      return [];
    // Explicit native text markers can live inside a passive Header/Card frame.
    // Unmarked component text stays with its existing actual Proto owner.
    const tag = native.localName;
    const role =
      explicit && ROLES.has(explicit)
        ? (explicit as SiteTypographyRole)
        : /^h[1-6]$/.test(tag)
          ? (tag as SiteTypographyRole)
          : tag === 'label' || tag === 'legend'
            ? 'label'
            : tag === 'figcaption'
              ? 'caption'
              : 'body';
    // Only phrasing content can pass through a span. Leaf paragraphs/headings
    // and authored label/legend keep native semantics; block compositions stay
    // with their separately inventoried owner instead of producing invalid DOM.
    if (native.querySelector('p,h1,h2,h3,h4,h5,h6,div,section,article,ul,ol,li,table,fieldset,pre'))
      return [];
    if (!native.textContent?.trim() && !activeViews.has(native)) return [];
    return [{ native, role }];
  });
}

function sourceNodes(native: HTMLElement): Node[] {
  const active = activeViews.get(native);
  return Array.from(native.childNodes).flatMap((node) =>
    node === active?.carrier ? Array.from(active.slot.childNodes) : [node]
  );
}
function preserveSelection(document: Document, move: () => void): void {
  const focus = document.activeElement as HTMLElement | null;
  const selection = document.getSelection();
  const anchor = selection?.anchorNode;
  const focusNode = selection?.focusNode;
  const anchorOffset = selection?.anchorOffset ?? 0;
  const focusOffset = selection?.focusOffset ?? 0;
  move();
  if (focus?.isConnected && document.activeElement !== focus) focus.focus({ preventScroll: true });
  if (selection && anchor?.isConnected && focusNode?.isConnected) {
    try {
      selection.setBaseAndExtent(anchor, anchorOffset, focusNode, focusOffset);
    } catch {
      /* Source changed while selecting. */
    }
  }
}

/** One renderer/framework root and runtime preparation for an entire scope.
 * Each passive carrier is moved as an opaque subtree; no VDOM update is ever
 * issued while carriers are borrowed. They return to their original batch
 * parent before renderer.destroy(), in original order, on every exit path. */
export function siteTypographyParticipant(
  root: HTMLElement,
  options: { docsOnly?: boolean; ownerId?: string } = {}
) {
  const document = root.ownerDocument;
  const ownerId = options.ownerId ?? `site-typography-${++serial}`;
  let alive = true;
  let committed: Target[] = [];
  let committedCompact = false;
  const compact = () => document.defaultView?.matchMedia('(max-width: 47.999rem)').matches === true;
  const targets = () => collectSiteTypographyTargets(root, options.docsOnly);
  return {
    root,
    needsRefresh() {
      if (!alive) return false;
      const next = targets();
      return (
        compact() !== committedCompact ||
        next.length !== committed.length ||
        next.some(
          (target, index) =>
            target.native !== committed[index]?.native ||
            target.role !== committed[index]?.role ||
            activeViews.get(target.native)?.carrier.parentElement !== target.native
        )
      );
    },
    async materialize(
      request: ProjectionScopeMaterializeRequest
    ): Promise<MaterializedProjectionCandidate> {
      const runtime = request.selection.runtimeId;
      const family = request.selection.projectionFamilyId;
      if (!isRuntimeId(runtime) || (family !== 'shadcn' && family !== 'brutalist'))
        throw new Error('[SiteTypography] Unsupported projection selection.');
      const selected = targets();
      const isCompact = compact();
      const host = document.createElement('span');
      host.dataset.siteTypographyBatch = ownerId;
      host.hidden = true;
      host.setAttribute('aria-hidden', 'true');
      // Staging contains no source text, IDs, controls or duplicate SEO copy.
      document.body.append(host);
      let renderer: DemoRenderResult | undefined;
      let batch: HTMLElement | undefined;
      let views: View[] = [];
      let disposed = false;
      let theme: ProjectionThemeSurfaceStyle;
      const applyTheme = () => {
        // Shadcn keeps its existing system-sans contract even when the retained
        // native parent still inherits a previous Brutalist font theme.
        const fontTheme =
          family === 'shadcn'
            ? {
                ...theme,
                '--pui-font-sans':
                  document.defaultView
                    ?.getComputedStyle(document.documentElement)
                    .getPropertyValue('--font-sans')
                    .trim() || 'ui-sans-serif, system-ui, sans-serif',
              }
            : theme;
        for (const view of views) applyProjectionThemeSurfaceStyle(view.surface, fontTheme);
      };
      const restoreNative = () =>
        preserveSelection(document, () => {
          for (const view of views) {
            if (activeViews.get(view.native) !== view) continue;
            // A source author may already have replaced textContent/innerHTML.
            // Never restore detached old copy over that newer native content.
            if (view.carrier.parentElement === view.native)
              view.carrier.replaceWith(...Array.from(view.slot.childNodes));
            activeViews.delete(view.native);
            for (const marker of MARKERS) view.native.removeAttribute(marker);
          }
        });
      const dispose = async () => {
        if (disposed) return;
        disposed = true;
        restoreNative();
        // Legal renderer parent ownership restored before framework teardown.
        if (batch) for (const view of views) batch.append(view.carrier);
        try {
          if (renderer) await renderer.destroy();
          else releaseHostMount(host);
        } finally {
          host.remove();
        }
      };
      try {
        theme = resolveProjectionThemeSurfaceStyle(family, root);
        if (selected.length === 0)
          return {
            host,
            scope: host,
            activate() {
              committed = [];
              committedCompact = isCompact;
            },
            setLocked() {},
            setThemeSurfaceStyle() {},
            dispose,
          };
        await Promise.all([prepareDemoRuntime(runtime), loadPrototypes(['site-typography'])]);
        if (!alive) throw new Error('[SiteTypography] Scope was disposed during preparation.');
        const demo: DemoSpec = {
          type: 'demo',
          root: {
            kind: 'box',
            tag: 'span',
            ref: 'typography-batch',
            children: selected.map(({ role }, index) => ({
              kind: 'box',
              tag: 'span',
              ref: `carrier-${index}`,
              attrs: { 'data-site-typography-carrier': '' },
              children: [
                {
                  kind: 'proto',
                  prototypeId: 'site-typography',
                  rootTag: 'span',
                  ref: `surface-${index}`,
                  props: { family, role, compact: isCompact },
                  surfaceStyle: theme,
                  children: [
                    {
                      kind: 'box',
                      tag: 'span',
                      ref: `slot-${index}`,
                      attrs: { 'data-site-typography-slot': '' },
                    },
                  ],
                },
              ],
            })),
          },
          setup(context) {
            batch = context.refs['typography-batch'];
            views = selected.map((target, index) => {
              const carrier = context.refs[`carrier-${index}`];
              const surface = context.refs[`surface-${index}`];
              const slot = context.refs[`slot-${index}`];
              if (!carrier || !surface || !slot)
                throw new Error('[SiteTypography] Missing prepared inline slot.');
              surface.dataset.typographyPrototype = 'site-typography';
              surface.dataset.typographyRole = target.role;
              surface.dataset.typographyRuntime = runtime;
              surface.dataset.typographyFamily = family;
              surface.dataset.typographyGeneration = String(request.generation);
              return { ...target, carrier, surface, slot, home: batch! };
            });
          },
        };
        renderer = await renderDemo({ runtime, host, demo, isCurrent: () => alive && !disposed });
        if (!batch || views.length !== selected.length)
          throw new Error('[SiteTypography] Renderer did not prepare the whole batch.');
        applyTheme();
        return {
          host,
          scope: batch,
          activate() {
            if (disposed) throw new Error('[SiteTypography] Cannot activate a disposed batch.');
            preserveSelection(document, () => {
              for (const view of views) {
                if (!view.native.isConnected) continue;
                const previous = activeViews.get(view.native);
                const content = sourceNodes(view.native);
                view.slot.append(...content);
                // Leave a retired carrier under its own hidden batch, not in
                // native semantic content. It has no source nodes to duplicate.
                if (previous && previous !== view) {
                  previous.home.append(previous.carrier);
                }
                view.native.append(view.carrier);
                activeViews.set(view.native, view);
                view.native.dataset.typographyOwner = ownerId;
                view.native.dataset.typographyRuntime = runtime;
                view.native.dataset.typographyFamily = family;
                view.native.dataset.typographyGeneration = String(request.generation);
              }
            });
            committed = selected;
            committedCompact = isCompact;
          },
          // Passive text must remain selectable/clickable during preparation.
          setLocked() {},
          setThemeSurfaceStyle(next: ProjectionThemeSurfaceStyle) {
            theme = next;
            applyTheme();
          },
          dispose,
        };
      } catch (error) {
        await dispose();
        throw error;
      }
    },
    destroy() {
      alive = false;
    },
  };
}
