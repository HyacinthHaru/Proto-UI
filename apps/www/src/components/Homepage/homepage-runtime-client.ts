import { homepageDemoParticipant } from './homepage-demo-participant';
import { applySiteLibraryFamily } from '../site-library-family';
import {
  resolveProjectionPart,
  type ProjectionFamilyId,
  type SharedBaseFamilyId,
} from '../PrototypePreviewer/projection-families';
import { PREFERRED_ADAPTER_EVENT, PREFERRED_ADAPTER_KEY } from '../adapter-preference';
import type { DemoNode, DemoSpec, DemoSetupContext } from '../PrototypePreviewer/demo-types';
import {
  PROJECTION_FOCUS_KEYS,
  type ProjectionCompositionControls,
} from '../PrototypePreviewer/projection-composition';
import {
  materializeProjectionCandidate,
  restoreProjectionControlFocus,
  type MaterializedProjectionCandidate,
} from '../PrototypePreviewer/projection-materializer';
import {
  createProjectionScopeController,
  type ProjectionScopeSnapshot,
} from '../PrototypePreviewer/projection-scope';
import {
  resolveProjectionThemeSurfaceStyle,
  watchProjectionThemeSurfaceStyle,
} from '../PrototypePreviewer/projection-theme';
import { AdapterIds, isRuntimeId, type RuntimeId } from '../PrototypePreviewer/runtimes/registry';

const LABELS: Record<RuntimeId, string> = {
  wc: 'Web Components',
  react: 'React',
  vue: 'Vue',
  vue2: 'Vue 2',
};
const ANCHOR_ATTRIBUTES = [
  'href',
  'target',
  'rel',
  'title',
  'aria-label',
  'download',
  'hreflang',
  'data-home-locale',
  'data-home-brand',
] as const;
type Group = {
  root: HTMLElement;
  mount: HTMLElement;
  fallback: HTMLElement;
  ownerId: string;
  links: HTMLAnchorElement[];
  theme: boolean;
  runtime: boolean;
};
type HomepageHandle = { destroy(): Promise<void>; getSnapshot(): ProjectionScopeSnapshot };

/** Bind exactly one protocol event channel; native and WC projected clicks must not double-fire. */
function bindThemeButton(
  context: DemoSetupContext,
  runtime: RuntimeId,
  isActive: () => boolean
): () => void {
  const button = context.refs['home-theme'];
  if (!button) return () => {};
  const document = button.ownerDocument;
  const window = document.defaultView;
  const provider = () =>
    (window as (Window & { StarlightTheme?: { toggle(): void } }) | null)?.StarlightTheme;
  const onClick = () => {
    if (isActive()) provider()?.toggle();
  };
  const listener = (event: Event) => {
    if (window && event instanceof window.CustomEvent) onClick();
  };
  if (runtime === 'wc') button.addEventListener('click', listener);
  else context.api.setProps('home-theme', { onClick });
  const update = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
  };
  update();
  document.addEventListener('starlight-theme:change', update);
  let alive = true;
  return () => {
    if (!alive) return;
    alive = false;
    button.removeEventListener('click', listener);
    document.removeEventListener('starlight-theme:change', update);
    if (runtime !== 'wc') context.api.setProps('home-theme', { onClick: () => {} });
  };
}

export function createHomepageContent(
  group: Group,
  runtime: RuntimeId,
  isActive: () => boolean,
  family: ProjectionFamilyId = 'shadcn'
): DemoSpec {
  const children: DemoNode[] = group.links.map((link, index) => {
    const attrs: Record<string, string> = {};
    for (const name of ANCHOR_ATTRIBUTES) {
      const value = link.getAttribute(name);
      if (value !== null) attrs[name] = value;
    }
    return {
      kind: 'box',
      tag: 'a',
      ref: `home-link-${index}`,
      attrs: { ...attrs, 'data-home-link-recipe': link.dataset.homeActionVariant || 'primary' },
      className: 'home-runtime-anchor',
      children: [link.textContent?.trim() || 'Link'],
    };
  });
  if (group.theme)
    children.push({
      kind: 'proto',
      prototypeId: resolveProjectionPart(family, 'button', 'root').prototypeId,
      ref: 'home-theme',
      props: {
        variant: family === 'shadcn' ? 'ghost' : 'surface',
        size: group.root.dataset.homepageThemeIcon === 'true' ? 'icon' : 'default',
        'aria-label': group.root.dataset.homepageThemeLabel || 'Toggle theme',
      },
      children: [
        group.root.dataset.homepageThemeIcon === 'true'
          ? '◐'
          : group.root.dataset.homepageThemeLabel || 'Toggle theme',
      ],
    });
  return {
    type: 'demo',
    root: { kind: 'box', className: 'home-runtime-actions', children },
    setup(context) {
      const cleanupTheme = bindThemeButton(context, runtime, isActive);
      const listeners: Array<{ link: Element; listener: EventListener }> = [];
      for (const link of context.host.querySelectorAll<HTMLAnchorElement>('a[href]')) {
        const listener: EventListener = (event) => {
          if (!isActive()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            return;
          }
          const locale = link.getAttribute('data-home-locale');
          if (!locale) return;
          try {
            link.ownerDocument.defaultView?.localStorage.setItem('preferred-locale', locale);
          } catch {
            /* Optional preference. */
          }
          link.ownerDocument.cookie = `preferred-locale=${encodeURIComponent(locale)}; path=/; max-age=31536000; SameSite=Lax`;
        };
        link.addEventListener('click', listener);
        listeners.push({ link, listener });
      }
      return () => {
        cleanupTheme();
        for (const { link, listener } of listeners) link.removeEventListener('click', listener);
      };
    },
  };
}

/** One atomic controller for homepage actions, real PUI controls, and the live example. */
export function initHomepageRuntime(root: HTMLElement): HomepageHandle | undefined {
  const ownedRoot = root as HTMLElement & { __homepageRuntime__?: HomepageHandle };
  if (ownedRoot.__homepageRuntime__) return ownedRoot.__homepageRuntime__;
  const document = root.ownerDocument;
  const groups: Group[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-homepage-actions]')
  ).map((group, index) => {
    const mount = group.querySelector<HTMLElement>('[data-homepage-mount]');
    const fallback = group.querySelector<HTMLElement>('[data-homepage-fallback]');
    if (!mount || !fallback)
      throw new Error('[HomepageRuntime] action group requires an SSR fallback and mount.');
    const ownerId = `homepage-${group.id || index}`;
    mount.dataset.projectionOwner = ownerId;
    return {
      root: group,
      mount,
      fallback,
      ownerId,
      links: Array.from(fallback.querySelectorAll<HTMLAnchorElement>('a[href]')),
      theme: !!fallback.querySelector('[data-homepage-theme]'),
      runtime: group.dataset.homepageControls === 'runtime',
    };
  });
  const selectorGroup = groups.find((group) => group.runtime);
  if (!selectorGroup || groups.filter((group) => group.runtime).length !== 1)
    throw new Error('[HomepageRuntime] exactly one page runtime selector is required.');
  let initialRuntime: RuntimeId = 'wc';
  try {
    const stored = document.defaultView?.localStorage.getItem(PREFERRED_ADAPTER_KEY);
    if (isRuntimeId(stored)) initialRuntime = stored;
  } catch {
    /* Optional preference. */
  }
  const demo = homepageDemoParticipant(document);
  const initialFamily = demo?.initialFamily ?? 'shadcn';
  let desiredFamily: ProjectionFamilyId = initialFamily;
  let activeFamily: ProjectionFamilyId = initialFamily;
  let desiredComponent: SharedBaseFamilyId = demo?.initialComponent ?? 'button';
  let committedComponent = desiredComponent;
  const roots = [...groups.map((group) => group.root), ...(demo ? [demo.root] : [])];
  let destroyed = false;
  let epoch = 0;
  let desiredRuntime = initialRuntime;
  let activeCandidates: MaterializedProjectionCandidate[] = [];
  const staged = new Map<
    number,
    { candidates: MaterializedProjectionCandidate[]; component: SharedBaseFamilyId }
  >();
  const status = root.querySelector<HTMLElement>('[data-homepage-runtime-status]');
  const setStatus = (state: 'loading' | 'ready' | 'error', runtime: RuntimeId) => {
    root.dataset.runtimeState = state;
    root.dataset.runtime = runtime;
    root.setAttribute('aria-busy', String(state === 'loading'));
    demo?.setStatus(state, runtime);
    if (status)
      status.textContent = `${LABELS[runtime]} · ${root.dataset[`status${state[0]!.toUpperCase()}${state.slice(1)}`] || state}`;
  };
  const controls = (): ProjectionCompositionControls => ({
    runtime: {
      label: root.dataset.runtimeLabel || 'Page runtime',
      options: AdapterIds.map((value) => ({ value, label: LABELS[value] })),
      onValueChange: requestRuntime,
    },
    family: {
      label: root.dataset.familyLabel || demo?.root.dataset.familyLabel || 'Page library',
      options: [
        { value: 'shadcn', label: 'Shadcn' },
        { value: 'brutalist', label: 'Brutalist' },
      ],
      onValueChange: requestFamily,
    },
    component: {
      label: demo?.root.dataset.pickerLabel || 'Component',
      options: demo?.options.map((option) => ({
        value: option.componentId,
        label: option.label,
      })) ?? [{ value: 'button', label: 'Button' }],
      onValueChange: (value) => requestComponent(value as SharedBaseFamilyId),
    },
  });
  const controller = createProjectionScopeController({
    initialSelection: { runtimeId: initialRuntime, projectionFamilyId: initialFamily },
    async materialize(request) {
      const runtime = request.selection.runtimeId as RuntimeId;
      const family = request.selection.projectionFamilyId as ProjectionFamilyId;
      const component = desiredComponent;
      const work = groups.map(async (group) => {
        const ids = group.theme
          ? [resolveProjectionPart(family, 'button', 'root').prototypeId]
          : [];
        if (!group.links.length && !group.theme)
          throw new Error('[HomepageRuntime] action groups must not be empty.');
        return materializeProjectionCandidate(request, {
          mount: group.mount,
          ownerId: group.ownerId,
          componentId: 'button',
          controls: controls(),
          controlIds: group.runtime ? ['runtime'] : [],
          content: {
            demo: createHomepageContent(
              group,
              runtime,
              () =>
                !destroyed &&
                controller.getSnapshot().phase === 'ready' &&
                controller.getSnapshot().generation === request.generation,
              family
            ),
            recipe: { id: group.ownerId, prototypeIds: ids, rootPrototypeId: ids[0] ?? null },
          },
        });
      });
      if (demo)
        work.push(
          materializeProjectionCandidate(request, {
            mount: demo.mount,
            ownerId: demo.ownerId,
            componentId: component,
            controls: controls(),
            controlIds: ['family', 'component'],
          })
        );
      const outcomes = await Promise.allSettled(work);
      const candidates = outcomes.flatMap((outcome) =>
        outcome.status === 'fulfilled' ? [outcome.value] : []
      );
      const failure = outcomes.find((outcome) => outcome.status === 'rejected');
      if (failure?.status === 'rejected') {
        await Promise.allSettled(candidates.map((candidate) => candidate.dispose()));
        throw failure.reason;
      }
      staged.set(request.generation, { candidates, component });
      let disposed = false;
      return {
        activate() {
          for (const candidate of candidates) candidate.activate();
        },
        setLocked(locked: boolean) {
          for (const candidate of candidates) candidate.setLocked?.(locked);
        },
        async dispose() {
          if (disposed) return;
          disposed = true;
          staged.delete(request.generation);
          const results = await Promise.allSettled(
            candidates.map((candidate) => candidate.dispose())
          );
          const failed = results.find((result) => result.status === 'rejected');
          if (failed?.status === 'rejected') throw failed.reason;
        },
      };
    },
    prepareCommit(commit) {
      const prepared = staged.get(commit.generation);
      if (!prepared) throw new Error('[HomepageRuntime] prepared page generation is missing.');
      const next = prepared.candidates;
      const family = commit.selection.projectionFamilyId as ProjectionFamilyId;
      for (let index = 0; index < next.length; index++)
        next[index]!.setThemeSurfaceStyle(
          resolveProjectionThemeSurfaceStyle(family, roots[index]!)
        );
      const demoPublication = demo?.prepareCommit(commit, prepared.component);
      const previous = activeCandidates;
      const previousFamily = activeFamily;
      const previousComponent = committedComponent;
      const previousSiteMarkers = [
        document.documentElement,
        ...document.querySelectorAll<HTMLElement>('[data-site-family-scope]'),
      ].map((element) => ({ element, value: element.getAttribute('data-site-library-family') }));
      const hidden = groups.map((group) => group.fallback.hidden);
      const previousAttributes = [
        'data-runtime-generation',
        'data-family',
        'data-runtime-state',
        'data-runtime',
        'aria-busy',
      ].map((name) => [name, root.getAttribute(name)] as const);
      const previousStatus = status?.textContent ?? null;
      return {
        publish() {
          activeCandidates = next;
          activeFamily = family;
          committedComponent = prepared.component;
          for (const group of groups) group.fallback.hidden = true;
          root.dataset.runtimeGeneration = String(commit.generation);
          root.dataset.family = family;
          applySiteLibraryFamily(document, family);
          demoPublication?.publish();
          setStatus('ready', commit.selection.runtimeId as RuntimeId);
        },
        rollback() {
          activeCandidates = previous;
          activeFamily = previousFamily;
          committedComponent = previousComponent;
          groups.forEach((group, index) => {
            group.fallback.hidden = hidden[index]!;
          });
          for (const [name, value] of previousAttributes) {
            if (value === null) root.removeAttribute(name);
            else root.setAttribute(name, value);
          }
          for (const { element, value } of previousSiteMarkers) {
            if (value === null) element.removeAttribute('data-site-library-family');
            else element.setAttribute('data-site-library-family', value);
          }
          if (status) status.textContent = previousStatus;
          demoPublication?.rollback();
        },
      };
    },
    restoreFocus(key, commit, origin) {
      const mount = key === PROJECTION_FOCUS_KEYS.runtime ? selectorGroup.mount : demo?.mount;
      if (mount) restoreProjectionControlFocus(mount, key, commit.generation, origin);
    },
  });
  const observe = (promise: Promise<ProjectionScopeSnapshot>, publishPreference: boolean) => {
    const requestEpoch = ++epoch;
    setStatus('loading', desiredRuntime);
    void promise
      .then((snapshot) => {
        if (destroyed || requestEpoch !== epoch) return;
        desiredRuntime = snapshot.selection.runtimeId as RuntimeId;
        desiredFamily = snapshot.selection.projectionFamilyId as ProjectionFamilyId;
        desiredComponent = committedComponent;
        setStatus('ready', desiredRuntime);
        if (publishPreference) {
          try {
            document.defaultView?.localStorage.setItem(PREFERRED_ADAPTER_KEY, desiredRuntime);
          } catch {
            /* Optional preference. */
          }
          document.dispatchEvent(
            new CustomEvent(PREFERRED_ADAPTER_EVENT, {
              detail: { adapter: desiredRuntime, source: root },
            })
          );
        }
      })
      .catch((error) => {
        if (destroyed || requestEpoch !== epoch) return;
        desiredRuntime = controller.getSnapshot().selection.runtimeId as RuntimeId;
        desiredFamily = controller.getSnapshot().selection.projectionFamilyId as ProjectionFamilyId;
        desiredComponent = committedComponent;
        setStatus('error', desiredRuntime);
        console.error('[HomepageRuntime] retained previous generation or native SSR links.', error);
      });
  };
  function requestRuntime(runtime: RuntimeId): void {
    if (destroyed || runtime === desiredRuntime) return;
    desiredRuntime = runtime;
    observe(
      controller.request(
        { runtimeId: runtime, projectionFamilyId: desiredFamily },
        {
          force: desiredComponent !== committedComponent,
          focusKey: PROJECTION_FOCUS_KEYS.runtime,
          focusOrigin: document.activeElement,
        }
      ),
      true
    );
  }
  function requestFamily(family: ProjectionFamilyId): void {
    if (destroyed || family === desiredFamily) return;
    desiredFamily = family;
    observe(
      controller.request(
        { runtimeId: desiredRuntime, projectionFamilyId: family },
        {
          force: desiredComponent !== committedComponent,
          focusKey: PROJECTION_FOCUS_KEYS.family,
          focusOrigin: document.activeElement,
        }
      ),
      false
    );
  }
  function requestComponent(component: SharedBaseFamilyId): void {
    if (destroyed || component === desiredComponent) return;
    desiredComponent = component;
    observe(
      controller.request(
        { runtimeId: desiredRuntime, projectionFamilyId: desiredFamily },
        {
          force: true,
          focusKey: PROJECTION_FOCUS_KEYS.component,
          focusOrigin: document.activeElement,
        }
      ),
      false
    );
  }
  const onAdapterChange = (event: Event) => {
    const detail = (event as CustomEvent<{ adapter?: unknown; source?: unknown }>).detail;
    if (
      detail?.source === root ||
      !isRuntimeId(detail?.adapter) ||
      detail.adapter === desiredRuntime ||
      destroyed
    )
      return;
    desiredRuntime = detail.adapter;
    observe(
      controller.request(
        { runtimeId: desiredRuntime, projectionFamilyId: desiredFamily },
        { force: desiredComponent !== committedComponent }
      ),
      false
    );
  };
  document.addEventListener(PREFERRED_ADAPTER_EVENT, onAdapterChange);
  const stopThemes = (['shadcn', 'brutalist'] as const).map((family) =>
    watchProjectionThemeSurfaceStyle(family, root, () => {
      if (destroyed || family !== activeFamily) return;
      for (let index = 0; index < activeCandidates.length; index++)
        activeCandidates[index]!.setThemeSurfaceStyle(
          resolveProjectionThemeSurfaceStyle(family, roots[index]!)
        );
    })
  );
  let destroyPromise: Promise<void> | undefined;
  const destroy = () =>
    (destroyPromise ??= (async () => {
      destroyed = true;
      epoch++;
      observer.disconnect();
      for (const stop of stopThemes) stop();
      document.removeEventListener(PREFERRED_ADAPTER_EVENT, onAdapterChange);
      document.removeEventListener('astro:before-swap', onBeforeSwap);
      activeCandidates = [];
      await controller.destroy();
      staged.clear();
      for (const group of groups) group.fallback.hidden = false;
      delete ownedRoot.__homepageRuntime__;
    })());
  const onBeforeSwap = () => {
    void destroy();
  };
  const observer = new MutationObserver(() => {
    if (!root.isConnected) void destroy();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('astro:before-swap', onBeforeSwap);
  ownedRoot.__homepageRuntime__ = { destroy, getSnapshot: () => controller.getSnapshot() };
  observe(controller.start(), false);
  return ownedRoot.__homepageRuntime__;
}
