import { afterEach, expect, it, vi } from 'vitest';
import { createPassiveShellComposition } from './passive-shell-composition';
import { loadPrototypes } from './prototype-modules';
import { panelSurfaceProps, surfacePrototypeId } from '../surface-recipes';
import type { ProjectionFamilyId } from './projection-families';
import type { ProjectionThemeSurfaceStyle } from './projection-theme';
import type { RuntimeId } from './runtimes/registry';

// Keep the real public Prototype loader and adapters. Only control load timing
// and failures, and replace CDN framework loading with installed dependencies.
vi.mock('./prototype-modules', async (original) => {
  const current = await original<typeof import('./prototype-modules')>();
  return { ...current, loadPrototypes: vi.fn(current.loadPrototypes) };
});
vi.mock('./runtimes/react-runtime', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/packages/adapters/react/package.json');
  return {
    loadReact: async () => ({
      React: require('react'),
      ReactDOM: { ...require('react-dom'), ...require('react-dom/client') },
    }),
  };
});
vi.mock('./runtimes/vue-runtime', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/apps/www/package.json');
  return { loadVue: async () => require('vue') };
});
vi.mock('./runtimes/vue2-runtime', async (original) => {
  const current = await original<typeof import('./runtimes/vue2-runtime')>();
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/packages/adapters/vue2/package.json');
  return { ...current, loadVue2: async () => require('vue') };
});

const INITIAL: ProjectionThemeSurfaceStyle = {
  '--pui-background': '#123456',
  '--pui-retained-only': 'retained',
};
const NEXT: ProjectionThemeSurfaceStyle = {
  '--pui-background': '#abcdef',
  '--pui-candidate-only': 'candidate',
};
const LATEST: ProjectionThemeSurfaceStyle = { '--pui-background': '#654321' };
const compositions: Array<ReturnType<typeof createPassiveShellComposition>> = [];
const pendingLoads: Array<ReturnType<typeof defer>> = [];

function defer() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((accept, decline) => {
    resolve = accept;
    reject = decline;
  });
  return { promise, resolve, reject };
}

function delayNextLoad() {
  const gate = defer();
  pendingLoads.push(gate);
  vi.mocked(loadPrototypes).mockImplementationOnce(async (ids) => {
    await gate.promise;
    const original =
      await vi.importActual<typeof import('./prototype-modules')>('./prototype-modules');
    await original.loadPrototypes(ids);
  });
  return gate;
}

async function mountShell(runtime: RuntimeId = 'wc') {
  const home = document.createElement('div');
  const mount = document.createElement('div');
  const content = document.createElement('div');
  const input = document.createElement('input');
  input.value = 'Original uncontrolled content';
  content.append(input);
  home.append(content);
  document.body.append(mount, home);
  const shell = createPassiveShellComposition({
    runtime,
    mount,
    content,
    family: 'shadcn',
    theme: INITIAL,
    prototypeId: (family) => surfacePrototypeId(family as ProjectionFamilyId),
    props: () => ({ ...panelSurfaceProps('canvas') }),
    layout: { display: 'block', width: '100%' },
    className: 'transaction-shell',
  });
  compositions.push(shell);
  await shell.ready;
  const surface = () => content.closest<HTMLElement>('.transaction-shell')!;
  expect(surface().dataset.projectionPrototype).toBe('shadcn-surface-root');
  expect(surface().hasAttribute('data-pui-root')).toBe(true);
  expect(surface().shadowRoot).toBeNull();
  expect(surface().querySelector('input')).toBe(input);
  return { shell, mount, home, content, input, surface };
}

function expectTheme(surface: HTMLElement, theme: ProjectionThemeSurfaceStyle) {
  for (const property of new Set([...Object.keys(INITIAL), ...Object.keys(NEXT)])) {
    expect(
      surface.style.getPropertyValue(property),
      `${surface.dataset.projectionFamily}/${property}`
    ).toBe(theme[property as keyof ProjectionThemeSurfaceStyle] ?? '');
  }
}

afterEach(async () => {
  for (const gate of pendingLoads.splice(0)) gate.resolve();
  await Promise.all(compositions.splice(0).map((shell) => shell.destroy()));
  vi.mocked(loadPrototypes).mockClear();
  document.body.replaceChildren();
});

// D-HOST-PROTOTYPE-PROJECTION-SCOPE-0001 (draft): ATOMIC-GENERATION,
// NO-HYBRID-PRESENTATION and FAIL-CLOSED govern these host-local observations.
for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const) {
  it(`${runtime}: pending and failed family replacement retain the committed family and theme`, async () => {
    const { shell, content, input, surface } = await mountShell(runtime);
    const original = surface();
    const gate = delayNextLoad();
    const replacement = shell.update('brutalist', NEXT);
    const outcome = replacement.then(
      () => null,
      (error: unknown) => error
    );
    expect(surface()).toBe(original);
    expectTheme(original, INITIAL);
    gate.reject(new Error('Injected candidate load failure'));
    expect(await outcome).toEqual(new Error('Injected candidate load failure'));
    expect(surface()).toBe(original);
    expect(original.dataset.projectionFamily).toBe('shadcn');
    expectTheme(original, INITIAL);
    expect(content.querySelector('input')).toBe(input);
    expect(input.value).toBe('Original uncontrolled content');

    // A failed request must not poison the theme captured by a later retry.
    await shell.update('brutalist', NEXT);
    expect(surface().dataset.projectionPrototype).toBe('brutalist-surface-root');
    expectTheme(surface(), NEXT);
    expect(surface().querySelector('input')).toBe(input);
    expect(surface().shadowRoot).toBeNull();
  });

  it(`${runtime}: same-family themes update synchronously without remounting or moving content`, async () => {
    const { shell, input, surface } = await mountShell(runtime);
    const original = surface();
    input.focus();
    const loads = vi.mocked(loadPrototypes).mock.calls.length;
    const update = shell.update('shadcn', LATEST);
    expectTheme(original, LATEST);
    expect(surface()).toBe(original);
    expect(document.activeElement).toBe(input);
    await update;
    expect(vi.mocked(loadPrototypes).mock.calls).toHaveLength(loads);
    expect(surface().querySelector('input')).toBe(input);
  });
}

it('a stale successful family load cannot recolor the retained fallback after the latest request fails', async () => {
  const { shell, surface } = await mountShell();
  const original = surface();
  const stale = delayNextLoad();
  const first = shell.update('brutalist', NEXT);
  const latest = delayNextLoad();
  const second = shell.update('bootstrap-2-3-2', LATEST);
  const outcome = second.then(
    () => null,
    (error: unknown) => error
  );
  latest.reject(new Error('Injected latest load failure'));
  expect(await outcome).toEqual(new Error('Injected latest load failure'));
  expect(surface()).toBe(original);
  expectTheme(original, INITIAL);
  stale.resolve();
  await first;
  expect(surface()).toBe(original);
  expectTheme(original, INITIAL);
});

it('the latest same-target request owns its theme even when an older load finishes last', async () => {
  const { shell, mount, surface } = await mountShell();
  const firstLoad = delayNextLoad();
  const first = shell.update('brutalist', NEXT);
  const secondLoad = delayNextLoad();
  const second = shell.update('brutalist', LATEST);
  expectTheme(surface(), INITIAL);
  secondLoad.resolve();
  await second;
  const committed = surface();
  expect(committed.dataset.projectionFamily).toBe('brutalist');
  expectTheme(committed, LATEST);
  firstLoad.resolve();
  await first;
  expect(surface()).toBe(committed);
  expectTheme(committed, LATEST);
  expect(mount.querySelectorAll('.transaction-shell')).toHaveLength(1);
});

it('returning to the committed family updates only its theme while superseding another pending family', async () => {
  const { shell, surface } = await mountShell();
  const original = surface();
  const gate = delayNextLoad();
  const pending = shell.update('brutalist', NEXT);
  const returned = shell.update('shadcn', LATEST);
  expectTheme(original, LATEST);
  await returned;
  gate.resolve();
  await pending;
  expect(surface().dataset.projectionFamily).toBe('shadcn');
  expectTheme(surface(), LATEST);
});

it('destroy returns the original LightDOM content immediately and revokes pending theme publication', async () => {
  const { shell, mount, home, content, input, surface } = await mountShell();
  const original = surface();
  const gate = delayNextLoad();
  const pending = shell.update('brutalist', NEXT);
  const destroyed = shell.destroy();
  expect(content.parentNode).toBe(home);
  expect(content.querySelector('input')).toBe(input);
  expectTheme(original, INITIAL);
  await shell.update('bootstrap-2-3-2', LATEST);
  gate.resolve();
  await Promise.all([pending, destroyed]);
  expect(content.parentNode).toBe(home);
  expect(mount.childNodes).toHaveLength(0);
  expectTheme(original, INITIAL);
});
