import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformSync } from 'esbuild';
import { retainHappyDomMutationCallbacks } from '../../../scripts/test/happy-dom-mutation-keepalive.mjs';
import { initProjectedPreviewer } from '../src/components/PrototypePreviewer/projected-previewer-client';
import {
  readContrastPopupEscapeBefore,
  readContrastPopupEscapeAfter,
  establishContrastPopupEscapeBaseline,
} from '../scripts/contrast-popup-escape.mjs';

// Actual authored recipes, producer and installed Adapters; CDN acquisition,
// geometry/style inputs and synthetic event delivery are the only substitutes.
// No browser, native keyboard delivery, paint, or timing conformance is claimed.
vi.mock('../src/components/PrototypePreviewer/runtimes/react-runtime', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/packages/adapters/react/package.json');
  return {
    loadReact: async () => ({
      React: require('react'),
      ReactDOM: { ...require('react-dom'), ...require('react-dom/client') },
    }),
  };
});
vi.mock('../src/components/PrototypePreviewer/runtimes/vue-runtime', async () => {
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/apps/www/package.json');
  return { loadVue: async () => require('vue') };
});
vi.mock('../src/components/PrototypePreviewer/runtimes/vue2-runtime', async (original) => {
  const current =
    await original<typeof import('../src/components/PrototypePreviewer/runtimes/vue2-runtime')>();
  const { createRequire } = await import('node:module');
  const require = createRequire(process.cwd() + '/packages/adapters/vue2/package.json');
  return { ...current, loadVue2: async () => require('vue') };
});

type Family = 'tooltip' | 'dropdown-menu' | 'select' | 'dialog' | 'hover-card';
type Runtime = 'wc' | 'react' | 'vue' | 'vue2';
// Playwright serializes these exact callback bodies without their Node closure.
const browserBefore = (input: unknown) =>
  new Function('input', `return (${readContrastPopupEscapeBefore.toString()})(input)`)(input);
const browserAfter = (input: unknown) =>
  new Function('input', `return (${readContrastPopupEscapeAfter.toString()})(input)`)(input);
// Keep the pinned happy-dom forwarding closures alive; delivery and records
// remain the installed observer. Never use this test repair in native evidence.
let observerKeeper: ReturnType<typeof retainHappyDomMutationCallbacks>;
let fixtureId = 0;
const cleanups = new Set<() => Promise<void>>();
afterEach(async () => {
  for (const cleanup of [...cleanups]) await cleanup();
});
beforeAll(() => {
  observerKeeper = retainHappyDomMutationCallbacks(window);
  const source = readFileSync(
    resolve(process.cwd(), 'apps/www/scripts/contrast-probe.browser.ts'),
    'utf8'
  );
  const compiled = transformSync(source, {
    loader: 'ts',
    format: 'iife',
    globalName: 'puiContrastProbe',
    keepNames: false,
  }).code;
  (globalThis as any).puiContrastProbe = new Function(compiled + ';return puiContrastProbe;')();
});
afterAll(() => {
  observerKeeper.restore();
  delete (globalThis as any).puiContrastProbe;
});

function measurements() {
  const bounds = {
    x: 20,
    y: 20,
    left: 20,
    top: 20,
    right: 120,
    bottom: 60,
    width: 100,
    height: 40,
  };
  const defaults: Record<string, string> = {
    visibility: 'visible',
    display: 'block',
    contentVisibility: 'visible',
    opacity: '1',
    clip: 'auto',
    clipPath: 'none',
    maskImage: 'none',
    filter: 'none',
    backdropFilter: 'none',
    mixBlendMode: 'normal',
    transform: 'none',
    translate: 'none',
    rotate: 'none',
    scale: 'none',
    contain: 'none',
    overflowX: 'visible',
    overflowY: 'visible',
    perspective: 'none',
    transformStyle: 'flat',
  };
  const rect = vi
    .spyOn(Element.prototype, 'getBoundingClientRect')
    .mockImplementation(() => bounds as DOMRect);
  const rects = vi.spyOn(Element.prototype, 'getClientRects').mockImplementation(function (
    this: Element
  ) {
    return (!this.isConnected ||
    this.hasAttribute('hidden') ||
    (this as HTMLElement).style.display === 'none'
      ? []
      : [bounds]) as unknown as DOMRectList;
  });
  const styles = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
    (element) =>
      new Proxy({} as CSSStyleDeclaration, {
        get(_target, key) {
          if (key === 'getPropertyValue')
            return (property: string) =>
              (element as HTMLElement).style.getPropertyValue(property) || '';
          if (
            key === 'display' &&
            (element.hasAttribute('hidden') || element.hasAttribute('data-pui-view-detached'))
          )
            return 'none';
          if (key === 'visibility' && element.hasAttribute('data-pui-view-pending'))
            return 'hidden';
          return (element as HTMLElement).style[key as any] || defaults[String(key)] || '';
        },
      })
  );
  const restore = async () => {
    styles.mockRestore();
    rects.mockRestore();
    rect.mockRestore();
    cleanups.delete(restore);
  };
  cleanups.add(restore);
  return restore;
}
async function preview(family: Family, runtime: Runtime = 'wc') {
  localStorage.clear();
  const root = document.createElement('section');
  root.dataset.previewerId = `escape-${++fixtureId}`;
  root.dataset.demoId = `demo-brutalist-${family}`;
  const runtimes: Runtime[] =
    family === 'tooltip' ? ['wc', 'react', 'vue'] : ['wc', 'react', 'vue', 'vue2'];
  root.dataset.runtimes = JSON.stringify(runtimes);
  root.innerHTML = '<div class="host"></div>';
  document.body.append(root);
  const previousFocus = document.createElement('button');
  const destroy = async () => {
    try {
      await (root as any).__previewer__?.destroy();
    } finally {
      root.remove();
      previousFocus.remove();
      localStorage.clear();
      cleanups.delete(destroy);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  };
  cleanups.add(destroy);
  initProjectedPreviewer({
    root,
    initialRuntime: runtime,
    runtimeList: runtimes,
    projectionFamilyId: 'brutalist',
    componentId: family,
    toolbar: true,
  });
  await vi.waitFor(() => expect(root.dataset.projectionState).toBe('ready'));
  const contentName =
    family === 'dropdown-menu' ? 'brutalist-dropdown-content' : `brutalist-${family}-content`;
  const triggerName =
    family === 'dropdown-menu' ? 'brutalist-dropdown-trigger' : `brutalist-${family}-trigger`;
  const trigger = root.querySelector<HTMLElement>(
    `[data-demo-ref="__website_runtime_preview_surface__-content"] [data-projection-prototype="${triggerName}"]`
  )!;
  expect(trigger).not.toBeNull();
  document.body.append(previousFocus);
  previousFocus.focus();
  if (family === 'tooltip' || family === 'hover-card')
    trigger.dispatchEvent(new Event('pointerenter'));
  else {
    // Happy DOM click() omits native pointer-down focus. Dialog's existing
    // pointer journey establishes this Trigger as the pre-open focus owner.
    if (family === 'dialog') {
      await vi.waitFor(() => expect(trigger.getAttribute('tabindex')).toBe('0'));
      trigger.focus();
      expect(document.activeElement).toBe(trigger);
    }
    trigger.click();
  }
  let popup!: HTMLElement;
  await vi.waitFor(
    () => {
      const id =
        family === 'tooltip'
          ? trigger.getAttribute('aria-describedby')
          : trigger.getAttribute('aria-controls');
      if (family !== 'hover-card') expect(id).toBeTruthy();
      popup = document.querySelector<HTMLElement>(
        `${family === 'hover-card' ? '' : `[id="${id}"]`}[data-projection-prototype="${contentName}"][data-projection-owner="${trigger.dataset.projectionOwner}"]`
      )!;
      expect(popup?.getAttribute('data-projection-prototype')).toBe(contentName);
      expect(
        (globalThis as any).puiContrastProbe.readContrastPaintedVisibility(popup).visible
      ).toBe(true);
    },
    { timeout: 2000 }
  );
  if (family !== 'tooltip' && family !== 'hover-card')
    await vi.waitFor(() => expect(popup.contains(document.activeElement)).toBe(true));
  const owner = trigger.dataset.projectionOwner;
  const generation = trigger.dataset.projectionGeneration;
  const baseline = browserBefore({ family, trigger, popup, owner, generation });
  expect(baseline.observation.achieved, JSON.stringify(baseline.observation)).toBe(true);
  const record: any = {};
  const run = async (suppressEscape = false, afterEscape?: () => void) =>
    establishContrastPopupEscapeBaseline({
      family,
      record,
      readBefore: async () => baseline.observation,
      pressEscape: async () => {
        if (!suppressEscape)
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        afterEscape?.();
      },
      waitForClosed: async () => {
        await vi.waitFor(
          () => {
            if (!browserAfter(baseline).closed)
              throw new Error('Exact popup is still open after Escape.');
          },
          { timeout: suppressEscape ? 100 : 1000, interval: 10 }
        );
      },
      waitForSettled: async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      },
      waitForFocus: async () => {
        await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
      },
      readAfter: async () => browserAfter(baseline),
    });
  return {
    trigger,
    popup,
    baseline,
    previousFocus,
    run,
    record,
    destroy,
  };
}

for (const family of ['tooltip', 'dropdown-menu', 'select'] as const) {
  const runtimes: Runtime[] =
    family === 'tooltip' ? ['wc', 'react', 'vue'] : ['wc', 'react', 'vue', 'vue2'];
  for (const runtime of runtimes)
    it(`${family}/${runtime}: verifies the actual opened popup before any pointer/focus reset`, async () => {
      const restore = measurements();
      const mounted = await preview(family, runtime);
      try {
        const result = await mounted.run().catch((error: Error) => {
          throw new Error(`${error.message} ${JSON.stringify(mounted.record)}`);
        });
        expect(result.achieved).toBe(true);
        expect(result.after.closed).toBe(true);
        if (family === 'tooltip') expect(document.activeElement).toBe(mounted.previousFocus);
        else expect(document.activeElement).toBe(mounted.trigger);
        if (family === 'select') {
          expect(result.after.selectionUnchanged).toBe(true);
          expect(result.after.triggerText).toBe('Paper');
          if (result.after.retainedOptions)
            expect(result.after.selection).toEqual(result.before.selection);
        }
      } finally {
        await mounted.destroy();
        restore();
      }
    });
  it(`${family}: rejects swallowed Escape before a later reset can hide the failure`, async () => {
    const restore = measurements();
    const mounted = await preview(family);
    try {
      await expect(mounted.run(true)).rejects.toThrow('Exact popup is still open after Escape');
      expect(mounted.record.stage).toBe('waiting-escape-close');
      expect(mounted.record.achieved).toBe(false);
      expect(browserAfter(mounted.baseline).closed).toBe(false);
      // The formerly subsequent action really can close the broken baseline.
      if (family === 'tooltip') mounted.trigger.dispatchEvent(new Event('pointerleave'));
      else mounted.trigger.click();
      await vi.waitFor(() => expect(browserAfter(mounted.baseline).closed).toBe(true));
    } finally {
      await mounted.destroy();
      restore();
    }
  });
}

it('Tooltip rejects focus movement even when closure succeeded', async () => {
  const restore = measurements();
  const mounted = await preview('tooltip');
  try {
    await expect(mounted.run(false, () => mounted.previousFocus.blur())).rejects.toThrow(
      'focus/selection baseline'
    );
    expect(mounted.record.after.closed).toBe(true);
    expect(mounted.record.after.focusPreserved).toBe(false);
  } finally {
    await mounted.destroy();
    restore();
  }
});
it('Select rejects a changed committed display after successful closure', async () => {
  const restore = measurements();
  const mounted = await preview('select');
  try {
    await expect(
      mounted.run(false, () => {
        mounted.trigger.textContent = 'Ink';
      })
    ).rejects.toThrow('focus/selection baseline');
    expect(mounted.record.after.closed).toBe(true);
    expect(mounted.record.after.selectionUnchanged).toBe(false);
  } finally {
    await mounted.destroy();
    restore();
  }
});
it('rejects a same-ID replacement rather than rebinding the exact popup', async () => {
  const restore = measurements();
  const mounted = await preview('tooltip');
  let replacement: Element | undefined;
  try {
    await expect(
      mounted.run(false, () => {
        replacement = document.createElement('div');
        for (const attribute of mounted.popup.attributes)
          replacement.setAttribute(attribute.name, attribute.value);
        replacement.removeAttribute('data-pui-view-detached');
        document.body.append(replacement);
      })
    ).rejects.toThrow('focus/selection baseline');
    expect(mounted.record.after.sameOwnedPopup).toBe(false);
  } finally {
    replacement?.remove();
    await mounted.destroy();
    restore();
  }
});

it('refuses ambiguous Select labels before sending Escape', async () => {
  const restore = measurements();
  const mounted = await preview('select');
  try {
    const options = mounted.popup.querySelectorAll<HTMLElement>('[role="option"]');
    options[1].textContent = options[0].textContent;
    const before = browserBefore({
      family: 'select',
      trigger: mounted.trigger,
      popup: mounted.popup,
      owner: mounted.trigger.dataset.projectionOwner,
      generation: mounted.trigger.dataset.projectionGeneration,
    });
    expect(before.observation.achieved).toBe(false);
    let pressed = false;
    await expect(
      establishContrastPopupEscapeBaseline({
        family: 'select',
        record: {},
        readBefore: async () => before.observation,
        pressEscape: async () => {
          pressed = true;
        },
        waitForClosed: async () => {},
        waitForFocus: async () => {},
        readAfter: async () => ({}),
      })
    ).rejects.toThrow('exact visible owned popup');
    expect(pressed).toBe(false);
  } finally {
    await mounted.destroy();
    restore();
  }
});

for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const) {
  it(`dialog/${runtime}: Escape closes the same popup and restores the pre-open Trigger`, async () => {
    const restore = measurements();
    const mounted = await preview('dialog', runtime);
    try {
      const result = await mounted.run();
      expect(result.achieved).toBe(true);
      expect(result.after.closed).toBe(true);
      expect(result.after.sameOwnedPopup).toBe(true);
      expect(result.after.triggerFocused).toBe(true);
      expect(result.after.ariaExpanded).toBe('false');
      expect(document.activeElement).toBe(mounted.trigger);
    } finally {
      await mounted.destroy();
      await restore();
    }
  });
  it(`dialog/${runtime}: closed Content cannot hide failed host Trigger restoration`, async () => {
    const restore = measurements();
    const mounted = await preview('dialog', runtime);
    const focus = vi.spyOn(mounted.trigger, 'focus').mockImplementation(() => {});
    try {
      await expect(mounted.run()).rejects.toThrow();
      expect(mounted.record.stage).toBe('waiting-escape-focus');
      expect(mounted.record.achieved).toBe(false);
      expect(browserAfter(mounted.baseline).closed).toBe(true);
      expect(document.activeElement).not.toBe(mounted.trigger);
      expect(focus).toHaveBeenCalled();
    } finally {
      focus.mockRestore();
      await mounted.destroy();
      await restore();
    }
  });
}

for (const runtime of ['wc', 'react', 'vue', 'vue2'] as const) {
  it(`hover-card/${runtime}: existing Escape retains the same painted popup and focus`, async () => {
    const restore = measurements();
    const mounted = await preview('hover-card', runtime);
    try {
      const result = await mounted.run();
      expect(result.achieved).toBe(true);
      expect(result.after.sameOwnedPopup).toBe(true);
      expect(result.after.closed).toBe(false);
      expect(result.after.focusPreserved).toBe(true);
      expect(document.activeElement).toBe(mounted.previousFocus);
    } finally {
      await mounted.destroy();
      restore();
    }
  });
  it(`hover-card/${runtime}: rejects a dismissal that pointer leave would otherwise mask`, async () => {
    const restore = measurements();
    const mounted = await preview('hover-card', runtime);
    try {
      // Controlled paint fault after actual Escape; never change product policy.
      await expect(
        mounted.run(false, () => {
          mounted.popup.style.display = 'none';
        })
      ).rejects.toThrow('Escape changed the exact painted owned popup or focus');
      expect(mounted.record.achieved).toBe(false);
    } finally {
      await mounted.destroy();
      restore();
    }
  });
}
it('hover-card: rejects same-ID replacement and unintended focus restoration', async () => {
  for (const mutation of ['replacement', 'focus'] as const) {
    const restore = measurements();
    const mounted = await preview('hover-card');
    let clone: HTMLElement | undefined;
    try {
      await expect(
        mounted.run(false, () => {
          if (mutation === 'focus') mounted.trigger.focus();
          else {
            clone = document.createElement('div');
            for (const { name, value } of mounted.popup.attributes) clone.setAttribute(name, value);
            mounted.popup.replaceWith(clone);
          }
        })
      ).rejects.toThrow('Escape changed the exact painted owned popup or focus');
    } finally {
      clone?.remove();
      await mounted.destroy();
      restore();
    }
  }
});
