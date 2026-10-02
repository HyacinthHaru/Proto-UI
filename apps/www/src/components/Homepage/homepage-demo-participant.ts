import { readDemoOptions } from '../PrototypePreviewer/home-demo-client';
import { getDemoSourcePath } from '../PrototypePreviewer/demo-modules';
import {
  PROJECTION_FAMILY_MANIFESTS,
  resolveProjectionRecipe,
  type ProjectionFamilyId,
  type SharedBaseFamilyId,
} from '../PrototypePreviewer/projection-families';
import type { ProjectionScopeCommit } from '../PrototypePreviewer/projection-scope';
import type { RuntimeId } from '../PrototypePreviewer/runtimes/registry';

export function homepageDemoParticipant(document: Document) {
  const root = document.querySelector<HTMLElement>('[data-home-demo-options]');
  if (!root) return null;
  const mount = root.querySelector<HTMLElement>('[data-home-demo-host]');
  if (!mount) throw new Error('[HomepageRuntime] live example mount is missing.');
  const options = readDemoOptions(root.dataset.homeDemoOptions);
  const initial = options.find((option) => option.id === root.dataset.initialDemoId) ?? options[0]!;
  const initialFamily = resolveProjectionRecipe(initial.id)
    .projectionFamilyId as ProjectionFamilyId;
  const ownerId = root.dataset.projectionOwner || root.id || 'homepage-live-example';
  mount.dataset.projectionOwner = ownerId;
  const status = root.querySelector<HTMLElement>('[data-home-demo-status]');
  const description = root.querySelector<HTMLElement>('[data-home-demo-description]');
  const source = root.querySelector<HTMLAnchorElement>('[data-home-demo-source]');
  const definition = root.querySelector<HTMLElement>('[data-home-demo-definition]');
  const setStatus = (state: 'loading' | 'ready' | 'error', runtime: RuntimeId) => {
    root.dataset.runnerState = state;
    root.dataset.runnerRuntime = runtime;
    mount.setAttribute('aria-busy', String(state === 'loading'));
    if (status)
      status.textContent = `${runtime === 'wc' ? 'Web Components' : runtime === 'vue2' ? 'Vue 2' : runtime === 'react' ? 'React' : 'Vue'} · ${root.dataset[`status${state[0]!.toUpperCase()}${state.slice(1)}`] || state}`;
  };
  return {
    root,
    mount,
    ownerId,
    options,
    initialFamily,
    initialComponent: initial.componentId,
    setStatus,
    prepareCommit(commit: ProjectionScopeCommit, component: SharedBaseFamilyId) {
      const family = commit.selection.projectionFamilyId as ProjectionFamilyId;
      const recipe = PROJECTION_FAMILY_MANIFESTS[family].families[component].recipeId;
      // Fallible source resolution belongs before activation.
      const sourcePath = getDemoSourcePath(recipe);
      const attributes = [
        'data-runner-state',
        'data-runner-runtime',
        'data-projection-family',
        'data-projection-component',
        'data-projection-generation',
      ];
      const previousAttributes = attributes.map((name) => [name, root.getAttribute(name)] as const);
      const oldStatus = status?.textContent ?? null;
      const oldDescription = description?.textContent ?? null;
      const oldDefinition = definition?.textContent ?? null;
      const oldSourceText = source?.textContent ?? null;
      const oldSourceHref = source?.getAttribute('href') ?? null;
      const oldBusy = mount.getAttribute('aria-busy');
      return {
        publish() {
          root.dataset.projectionFamily = family;
          root.dataset.projectionComponent = component;
          root.dataset.projectionGeneration = String(commit.generation);
          if (description)
            description.textContent =
              options.find((option) => option.componentId === component)?.description ?? '';
          if (definition)
            definition.textContent =
              options.find((option) => option.componentId === component)?.label ?? component;
          if (source) {
            source.href = `https://github.com/Proto-UI/Proto-UI/blob/main/${sourcePath}`;
            source.textContent = `${recipe}.demo.ts`;
          }
          setStatus('ready', commit.selection.runtimeId as RuntimeId);
        },
        rollback() {
          for (const [name, value] of previousAttributes) {
            if (value === null) root.removeAttribute(name);
            else root.setAttribute(name, value);
          }
          if (status) status.textContent = oldStatus;
          if (description) description.textContent = oldDescription;
          if (definition) definition.textContent = oldDefinition;
          if (source) {
            source.textContent = oldSourceText;
            if (oldSourceHref === null) source.removeAttribute('href');
            else source.setAttribute('href', oldSourceHref);
          }
          if (oldBusy === null) mount.removeAttribute('aria-busy');
          else mount.setAttribute('aria-busy', oldBusy);
        },
      };
    },
  };
}
