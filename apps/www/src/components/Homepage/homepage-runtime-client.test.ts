import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertDemoSpec, type DemoSpec } from '../PrototypePreviewer/demo-types';
const fakes = vi.hoisted(() => ({
  materialize: vi.fn(),
  restoreFocus: vi.fn(),
  stopTheme: vi.fn(),
  watchTheme: vi.fn(),
}));
vi.mock('../PrototypePreviewer/projection-materializer', () => ({
  materializeProjectionCandidate: fakes.materialize,
  restoreProjectionControlFocus: fakes.restoreFocus,
}));
vi.mock('../PrototypePreviewer/projection-theme', () => ({
  resolveProjectionThemeSurfaceStyle: () => ({ '--pui-background': '#fff' }),
  watchProjectionThemeSurfaceStyle: fakes.watchTheme,
}));
import { createHomepageContent, initHomepageRuntime } from './homepage-runtime-client';
import * as siteFamily from '../site-library-family';

type Handle = NonNullable<ReturnType<typeof initHomepageRuntime>>;
let handle: Handle | undefined;
function fixture(withDemo = false) {
  document.body.innerHTML = `<header data-homepage-runtime data-runtime-label="Page runtime"><output data-homepage-runtime-status></output>
  <div id="navigation" data-homepage-actions data-homepage-controls="runtime"><div data-homepage-fallback><a href="/docs/" data-home-action-variant="minimal">Docs</a><button data-homepage-theme>Theme</button></div><div data-homepage-mount></div></div></header>
  <main><div id="hero" data-homepage-actions><div data-homepage-fallback><a href="https://example.com/docs" target="_blank" rel="noopener">Get started</a></div><div data-homepage-mount></div></div></main>`;
  if (withDemo) {
    const demo = document.createElement('section');
    demo.dataset.homeDemoOptions = JSON.stringify([
      { id: 'demo-shadcn-button', label: 'Button' },
      { id: 'demo-shadcn-tabs', label: 'Tabs' },
    ]);
    demo.dataset.initialDemoId = 'demo-shadcn-button';
    demo.innerHTML =
      '<div data-home-demo-host></div><output data-home-demo-status></output><p data-home-demo-description></p><a data-home-demo-source></a><span data-home-demo-definition></span>';
    document.body.append(demo);
  }
  return document.querySelector<HTMLElement>('[data-homepage-runtime]')!;
}
function candidate() {
  return {
    activate: vi.fn(),
    dispose: vi.fn(),
    setLocked: vi.fn(),
    setThemeSurfaceStyle: vi.fn(),
    host: document.createElement('div'),
    scope: document.createElement('div'),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const settle = async () => {
  for (let index = 0; index < 18; index++) await Promise.resolve();
};
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  fakes.materialize.mockReset().mockImplementation(async () => candidate());
  fakes.watchTheme.mockReturnValue(fakes.stopTheme);
});
afterEach(async () => {
  await handle?.destroy();
  handle = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Homepage page-owned runtime', () => {
  it('stages all action groups before hiding native SSR links, with one runtime selector', async () => {
    const root = fixture();
    const gate = deferred<ReturnType<typeof candidate>>();
    fakes.materialize.mockImplementationOnce(() => gate.promise);
    handle = initHomepageRuntime(root);
    await settle();
    expect(document.querySelector<HTMLElement>('[data-homepage-fallback]')!.hidden).toBe(false);
    expect(fakes.materialize.mock.calls[0]![1].controlIds).toEqual(['runtime']);
    expect(fakes.materialize.mock.calls[1]![1].controlIds).toEqual([]);
    gate.resolve(candidate());
    await settle();
    expect(root.dataset.runtimeState).toBe('ready');
    expect(
      [...document.querySelectorAll<HTMLElement>('[data-homepage-fallback]')].every(
        (element) => element.hidden
      )
    ).toBe(true);
    const content = fakes.materialize.mock.calls[1]![1].content.demo as DemoSpec;
    assertDemoSpec(content);
    expect(JSON.stringify(content.root)).toContain('"tag":"a"');
    expect(JSON.stringify(content.root)).toContain('"href":"https://example.com/docs"');
    expect(JSON.stringify(content.root)).toContain('"target":"_blank"');
    expect(JSON.stringify(content.root)).toContain('"rel":"noopener"');
  });

  it('commits repeated runtime switches to every group and publishes preference after success', async () => {
    const root = fixture();
    handle = initHomepageRuntime(root);
    await settle();
    const old = fakes.materialize.mock.results.map((result) => result.value);
    const controls = fakes.materialize.mock.calls[0]![1].controls;
    controls.runtime.onValueChange('react');
    await settle();
    expect(root.dataset.runtime).toBe('react');
    expect(localStorage.getItem('preferred-prototypes-adapter')).toBe('react');
    expect(
      fakes.materialize.mock.calls
        .slice(-2)
        .every(([request]) => request.selection.runtimeId === 'react')
    ).toBe(true);
    for (const promise of old) expect((await promise).dispose).toHaveBeenCalledOnce();
    expect(fakes.restoreFocus).toHaveBeenCalled();
    controls.runtime.onValueChange('vue2');
    await settle();
    expect(handle!.getSnapshot().selection.runtimeId).toBe('vue2');
  });

  it('keeps the prior whole page on partial materialization failure and disposes prepared siblings', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = fixture();
    handle = initHomepageRuntime(root);
    await settle();
    const oldGeneration = handle!.getSnapshot().generation;
    const partial = candidate();
    fakes.materialize
      .mockImplementationOnce(async () => partial)
      .mockRejectedValueOnce(new Error('framework dependency unavailable'));
    fakes.materialize.mock.calls[0]![1].controls.runtime.onValueChange('react');
    await settle();
    expect(root.dataset.runtimeState).toBe('error');
    expect(root.dataset.runtime).toBe('wc');
    expect(handle!.getSnapshot().generation).toBe(oldGeneration);
    expect(partial.activate).not.toHaveBeenCalled();
    expect(partial.dispose).toHaveBeenCalledOnce();
    expect(localStorage.getItem('preferred-prototypes-adapter')).toBeNull();
  });

  it('discards late candidates after a newer selection and preserves the latest whole page', async () => {
    const root = fixture();
    handle = initHomepageRuntime(root);
    await settle();
    const late = deferred<ReturnType<typeof candidate>>();
    fakes.materialize.mockImplementationOnce(() => late.promise);
    const controls = fakes.materialize.mock.calls[0]![1].controls;
    controls.runtime.onValueChange('react');
    await settle();
    controls.runtime.onValueChange('vue');
    await settle();
    const stale = candidate();
    late.resolve(stale);
    await settle();
    expect(root.dataset.runtime).toBe('vue');
    expect(stale.activate).not.toHaveBeenCalled();
    expect(stale.dispose).toHaveBeenCalledOnce();
  });

  it('restores fallback and removes subscriptions on disposal', async () => {
    const root = fixture();
    handle = initHomepageRuntime(root);
    await settle();
    expect(initHomepageRuntime(root)).toBe(handle);
    await handle!.destroy();
    expect(fakes.stopTheme).toHaveBeenCalledTimes(2);
    expect(document.querySelector<HTMLElement>('[data-homepage-fallback]')!.hidden).toBe(false);
    const count = fakes.materialize.mock.calls.length;
    document.dispatchEvent(new CustomEvent('proto-adapter:change', { detail: { adapter: 'vue' } }));
    await settle();
    expect(fakes.materialize.mock.calls).toHaveLength(count);
  });
  it('switches header, native action recipes and demo in one generation with orthogonal family/component state', async () => {
    const root = fixture(true);
    handle = initHomepageRuntime(root);
    await settle();
    const demo = document.querySelector<HTMLElement>('[data-home-demo-options]')!;
    expect(fakes.materialize.mock.calls).toHaveLength(3);
    expect(demo.dataset.projectionGeneration).toBe(root.dataset.runtimeGeneration);
    const controls = fakes.materialize.mock.calls[2]![1].controls;
    controls.component.onValueChange('tabs');
    await settle();
    expect(demo.dataset.projectionComponent).toBe('tabs');
    expect(demo.querySelector('a')?.getAttribute('href')).toContain(
      'demo_components/tabs/demo-shadcn-tabs.demo.ts'
    );
    controls.family.onValueChange('brutalist');
    await settle();
    expect(root.dataset.family).toBe('brutalist');
    expect(demo.dataset.projectionFamily).toBe('brutalist');
    expect(demo.dataset.projectionComponent).toBe('tabs');
    expect(document.documentElement.dataset.siteLibraryFamily).toBe('brutalist');
    expect(
      fakes.materialize.mock.calls
        .slice(-3)
        .every(([request]) => request.selection.projectionFamilyId === 'brutalist')
    ).toBe(true);
    const headerDemo = fakes.materialize.mock.calls.at(-3)![1].content.demo;
    expect(JSON.stringify(headerDemo.root)).toContain('brutalist-button');
    expect(JSON.stringify(headerDemo.root)).not.toContain('shadcn-button');
    controls.runtime.onValueChange('react');
    await settle();
    expect(root.dataset.runtime).toBe('react');
    expect(demo.dataset.runnerRuntime).toBe('react');
    expect(demo.dataset.projectionGeneration).toBe(root.dataset.runtimeGeneration);
    expect(demo.dataset.projectionComponent).toBe('tabs');
    expect(root.dataset.family).toBe('brutalist');
  });

  it('a failed demo prevents the header and native action groups from committing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = fixture(true);
    handle = initHomepageRuntime(root);
    await settle();
    const demo = document.querySelector<HTMLElement>('[data-home-demo-options]')!;
    const generation = root.dataset.runtimeGeneration;
    const header = candidate();
    const actions = candidate();
    fakes.materialize
      .mockResolvedValueOnce(header)
      .mockResolvedValueOnce(actions)
      .mockRejectedValueOnce(new Error('demo target failed'));
    fakes.materialize.mock.calls[0]![1].controls.runtime.onValueChange('vue');
    await settle();
    expect(root.dataset.runtimeGeneration).toBe(generation);
    expect(demo.dataset.projectionGeneration).toBe(generation);
    expect(root.dataset.runtime).toBe('wc');
    expect(demo.dataset.runnerRuntime).toBe('wc');
    expect(header.activate).not.toHaveBeenCalled();
    expect(actions.activate).not.toHaveBeenCalled();
    expect(header.dispose).toHaveBeenCalledOnce();
    expect(actions.dispose).toHaveBeenCalledOnce();
  });
  it('rolls back every site family marker when publication fails, including absent markers', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = fixture(true);
    document.documentElement.removeAttribute('data-site-library-family');
    const scope = document.createElement('div');
    scope.setAttribute('data-site-family-scope', '');
    document.body.append(scope);
    const apply = siteFamily.applySiteLibraryFamily;
    vi.spyOn(siteFamily, 'applySiteLibraryFamily').mockImplementationOnce((doc, family) => {
      apply(doc, family);
      throw new Error('publication failed');
    });
    handle = initHomepageRuntime(root);
    await settle();
    expect(root.dataset.runtimeState).toBe('error');
    expect(document.documentElement.hasAttribute('data-site-library-family')).toBe(false);
    expect(scope.hasAttribute('data-site-library-family')).toBe(false);
    expect(document.querySelector<HTMLElement>('[data-homepage-fallback]')!.hidden).toBe(false);
  });

  it('gates stale native-link events without intercepting current native navigation', () => {
    const root = fixture();
    const group = document.querySelector<HTMLElement>('[data-homepage-actions]')!;
    const anchor = group.querySelector<HTMLAnchorElement>('a')!;
    let active = false;
    const content = createHomepageContent(
      {
        root: group,
        mount: group,
        fallback: group,
        ownerId: 'test',
        links: [anchor],
        theme: false,
        runtime: false,
      },
      'wc',
      () => active
    );
    const cleanup = content.setup?.({
      host: group,
      refs: {},
      api: {
        call() {},
        getExposes() {
          return undefined;
        },
        setProps() {},
      },
    });
    const stale = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    anchor.dispatchEvent(stale);
    expect(stale.defaultPrevented).toBe(true);
    active = true;
    // Capture at the caller only to keep this unit test from navigating its document.
    const current = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    let nativeAllowed = false;
    const preventTestNavigation = (event: Event) => {
      nativeAllowed = !event.defaultPrevented;
      event.preventDefault();
    };
    root.addEventListener('click', preventTestNavigation);
    anchor.dispatchEvent(current);
    expect(nativeAllowed).toBe(true);
    root.removeEventListener('click', preventTestNavigation);
    if (typeof cleanup === 'function') cleanup();
  });
  it('uses the public icon-size Button prop for compact accessible header preferences', () => {
    fixture();
    const group = document.querySelector<HTMLElement>('[data-homepage-actions]')!;
    group.dataset.homepageThemeIcon = 'true';
    group.dataset.homepageThemeLabel = 'Toggle color theme';
    const content = createHomepageContent(
      {
        root: group,
        mount: group,
        fallback: group,
        ownerId: 'preferences',
        links: [],
        theme: true,
        runtime: true,
      },
      'wc',
      () => true
    );
    const button = content.root.kind === 'box' ? content.root.children?.[0] : null;
    expect(
      button && typeof button !== 'string' && button.kind === 'proto' ? button.props : null
    ).toMatchObject({ size: 'icon' });
    expect(
      button && typeof button !== 'string' && button.kind === 'proto' ? button.children : null
    ).toEqual([
      { kind: 'box', attrs: { 'aria-hidden': 'true' }, children: ['◐'] },
      { kind: 'box', className: 'home-theme-accessible-label', children: ['Toggle color theme'] },
    ]);
  });
});
