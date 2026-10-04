// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Browser } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RUNTIMES, launchBrowser, selectRuntime, startServer, stopServer } from './browser-harness';

type ShellTrace = {
  atMs: number;
  slots: {
    generation: string | null;
    phase: string | null;
    runtime: string | null;
    hostHidden: boolean;
    hostInert: boolean;
    hostDisplay: string | null;
    blockedByAncestor: boolean;
    borrowedContent: boolean;
    prototypeCount: number;
    active: boolean;
  }[];
};
type ShellRecorder = {
  traces: ShellTrace[];
  events: { name: string; atMs: number; detail: unknown; slots: ShellTrace['slots'] }[];
};

function readyEventHasExpectedOwner(event: ShellRecorder['events'][number]): boolean {
  const active = event.slots.filter((slot) => slot.active);
  const detail = event.detail as { id?: string; runtime?: string } | null;
  const expected =
    event.name === 'runtime:changed'
      ? detail?.id
      : event.name === 'previewer:mounted'
        ? detail?.runtime
        : undefined;
  return (
    !!expected &&
    (RUNTIMES as readonly string[]).includes(expected) &&
    active.length === 1 &&
    active[0].runtime === expected
  );
}

function installShellRecorder() {
  const state: ShellRecorder = { traces: [], events: [] };
  (window as typeof window & { __passiveAtomEvidence: ShellRecorder }).__passiveAtomEvidence =
    state;
  let previous = '';
  const capture = () => {
    const preview = document.querySelector('[data-previewer-id]');
    if (!preview) return;
    const slots = [...preview.querySelectorAll<HTMLElement>('[data-passive-shell-slot]')].map(
      (slot) => {
        const surface = slot.closest<HTMLElement>('.pui-runtime-preview-surface');
        const host = surface?.parentElement;
        let blockedByAncestor = false;
        for (
          let ancestor: HTMLElement | null = slot;
          ancestor && ancestor !== preview;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);
          if (
            ancestor.hidden ||
            ancestor.inert ||
            style.display === 'none' ||
            style.visibility === 'hidden'
          )
            blockedByAncestor = true;
        }
        const borrowedContent = Boolean(
          slot.querySelector('[data-demo-ref="__website_runtime_preview_surface__-content"]')
        );
        const prototypeCount = slot.querySelectorAll('[data-pui-root]').length;
        return {
          generation: surface?.dataset.projectionGeneration ?? null,
          phase: surface?.dataset.projectionState ?? host?.dataset.projectionState ?? null,
          runtime: surface?.dataset.projectionRuntime ?? null,
          hostHidden: host?.hidden ?? false,
          hostInert: host?.inert ?? false,
          hostDisplay: host ? getComputedStyle(host).display : null,
          blockedByAncestor,
          borrowedContent,
          prototypeCount,
          active: !blockedByAncestor && borrowedContent && prototypeCount > 0,
        };
      }
    );
    const key = JSON.stringify(slots);
    if (key !== previous) {
      previous = key;
      state.traces.push({ atMs: performance.now(), slots });
    }
  };
  for (const name of ['runtime:changed', 'previewer:mounted']) {
    document.addEventListener(name, (event) => {
      capture();
      state.events.push({
        name,
        atMs: performance.now(),
        detail: (event as CustomEvent).detail,
        slots: state.traces.at(-1)?.slots ?? [],
      });
    });
  }
  new MutationObserver(capture).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      'hidden',
      'inert',
      'style',
      'class',
      'data-projection-generation',
      'data-projection-state',
      'data-projection-runtime',
    ],
  });
}

const subjects = [
  ...(['base', 'shadcn', 'brutalist'] as const).map((family) => ({ family, atom: 'text' })),
  ...(['base', 'shadcn', 'brutalist', 'bootstrap-2-3-2', 'liquid-glass'] as const).map(
    (family) => ({ family, atom: 'surface' })
  ),
];
const cases = subjects.flatMap(({ family, atom }) =>
  (['en', 'zh-cn'] as const).flatMap((locale) =>
    RUNTIMES.map((runtime) => ({
      family,
      atom,
      locale,
      runtime,
      route: `/${locale}/ui-libraries/${family}/${family === 'brutalist' ? 'components/' : ''}${atom}/`,
    }))
  )
);
let browser: Browser;
let baseUrl = '';
const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const trackedDiff = execFileSync('git', ['diff', '--binary', 'HEAD'], { encoding: 'utf8' });
const untrackedSource = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(
    (file) =>
      /^(apps\/www\/src|scripts\/test|packages|spec)\//.test(file) &&
      /\.(?:[cm]?[jt]sx?|mdx?|json|ya?ml)$/.test(file)
  );
const sourceDirty = trackedDiff.length > 0 || untrackedSource.length > 0;
const sourceDigest = createHash('sha256').update(sourceSha).update(trackedDiff);
for (const file of untrackedSource.sort()) sourceDigest.update(file).update(readFileSync(file));
const sourceSnapshotSha256 = sourceDigest.digest('hex');
const runId = `${new Date().toISOString().replaceAll(':', '-')}-${process.pid}`;
const evidence = path.join(
  process.env.PROTO_UI_RUNTIME_EVIDENCE_DIR ?? tmpdir(),
  'passive-atom-docs',
  `${sourceSha.slice(0, 12)}-${runId}`
);

beforeAll(async () => {
  await mkdir(evidence, { recursive: true });
  baseUrl = await startServer('/en/ui-libraries/base/text/');
  browser = await launchBrowser();
}, 180_000);
afterAll(async () => {
  try {
    await browser?.close();
  } finally {
    await stopServer();
  }
}, 60_000);

describe.sequential('Public passive atom documentation previews', () => {
  it.each(cases)(
    '$locale/$family/$atom/$runtime retains public content and passive ownership',
    async ({ family, atom, locale, runtime, route }) => {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 1000 },
        colorScheme: 'light',
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(installShellRecorder);
      const name = `${locale}-${family}-${atom}-${runtime}`;
      try {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
        const preview = page.locator('[data-previewer-id]').first();
        const readinessDeadline = Date.now() + 20_000;
        await selectRuntime(page, preview, runtime, '[data-pui-root]', 4);
        if (Date.now() >= readinessDeadline)
          throw new Error('Passive atom readiness exceeded its original 20-second budget');
        // A preparing hidden/empty candidate is not another active content owner.
        // Keep every observed candidate in the trace; never use .first() to hide duplicates.
        await page.waitForFunction(
          () => {
            const state = (window as typeof window & { __passiveAtomEvidence: ShellRecorder })
              .__passiveAtomEvidence;
            const latest = state.traces.at(-1);
            return latest?.slots.filter((slot) => slot.active).length === 1;
          },
          undefined,
          { timeout: Math.max(1, readinessDeadline - Date.now()) }
        );
        await page.waitForFunction(
          () => {
            // Select content is portalled outside the preview; observe its real document surface.
            return [...document.querySelectorAll<HTMLElement>('[role="listbox"]')].every(
              (listbox) => {
                for (let node: HTMLElement | null = listbox; node; node = node.parentElement) {
                  const style = getComputedStyle(node);
                  if (node.hidden || style.display === 'none' || style.visibility === 'hidden')
                    return true;
                }
                return listbox.getClientRects().length === 0;
              }
            );
          },
          undefined,
          { timeout: Math.max(1, readinessDeadline - Date.now()) }
        );
        if (Date.now() >= readinessDeadline)
          throw new Error(
            'Passive atom frame/menu readiness exceeded its original 20-second budget'
          );
        const shellEvidence = await page.evaluate(
          () =>
            (window as typeof window & { __passiveAtomEvidence: ShellRecorder })
              .__passiveAtomEvidence
        );
        expect(
          shellEvidence.traces.every(
            (trace) => trace.slots.filter((slot) => slot.active).length <= 1
          )
        ).toBe(true);
        expect(shellEvidence.events.length).toBeGreaterThan(0);
        expect(shellEvidence.events.every(readyEventHasExpectedOwner)).toBe(true);
        const facts = await preview.evaluate((root) => {
          const host =
            root.querySelector<HTMLElement>('[data-projection-content]') ??
            root.querySelector<HTMLElement>('.host');
          if (!host) throw new Error('Public preview host is missing');
          const slots = [...host.querySelectorAll<HTMLElement>('[data-passive-shell-slot]')];
          const active = slots.filter((slot) => {
            if (
              !slot.querySelector('[data-demo-ref="__website_runtime_preview_surface__-content"]')
            )
              return false;
            for (
              let ancestor: HTMLElement | null = slot;
              ancestor && ancestor !== root;
              ancestor = ancestor.parentElement
            ) {
              const style = getComputedStyle(ancestor);
              if (
                ancestor.hidden ||
                ancestor.inert ||
                style.display === 'none' ||
                style.visibility === 'hidden'
              )
                return false;
            }
            return slot.querySelectorAll('[data-pui-root]').length > 0;
          });
          if (active.length !== 1)
            throw new Error(
              `Expected exactly one active borrowed-content frame, got ${active.length}`
            );
          const content = active[0];
          const nodes = [...content.querySelectorAll<HTMLElement>('[data-pui-root]')];
          return nodes.map((node) => {
            const style = getComputedStyle(node);
            return {
              text: node.textContent?.trim(),
              role: node.getAttribute('role'),
              tabIndex: node.tabIndex,
              width: node.getBoundingClientRect().width,
              height: node.getBoundingClientRect().height,
              size: Number.parseFloat(style.fontSize),
              decoration: style.textDecorationLine,
              background: style.backgroundColor,
              shadow: style.boxShadow,
              transform: style.transform,
            };
          });
        });
        // P-BASE-TEXT-PASSIVE / P-BASE-SURFACE-PASSIVE: a visual sample must not gain input ownership.
        expect(facts).toHaveLength(4);
        for (const fact of facts) {
          expect(fact.text?.length).toBeGreaterThan(0);
          expect(fact.role).toBeNull();
          expect(fact.tabIndex).toBe(-1);
          expect(fact.width).toBeGreaterThan(0);
          expect(fact.height).toBeGreaterThan(0);
        }
        if (atom === 'text') {
          expect(facts[0].text).toBe('A reusable Text atom');
          if (family !== 'base') {
            expect(facts[0].size).toBeGreaterThan(facts[1].size);
            expect(facts[3].decoration).toContain('underline');
          }
        } else {
          expect(facts[0].text).toBe('Outline · rest');
          if (family !== 'base') {
            expect(facts[2].shadow).not.toBe('none');
            expect(facts[3].transform).not.toBe('none');
          }
        }
        expect(errors).toEqual([]);
        await preview.screenshot({ path: path.join(evidence, `${name}.png`) });
        const documentCapture =
          family === 'shadcn' && atom === 'surface' && runtime === 'wc'
            ? `${name}-document.png`
            : null;
        if (documentCapture)
          await page.screenshot({ path: path.join(evidence, documentCapture), fullPage: true });
        await writeFile(
          path.join(evidence, `${name}.json`),
          JSON.stringify(
            {
              sourceSha,
              sourceDirty,
              sourceSnapshotSha256,
              runId,
              route,
              runtime,
              viewport: { width: 1280, height: 1000 },
              theme: 'light',
              captures: { preview: `${name}.png`, document: documentCapture },
              facts,
              shellEvidence,
              errors,
            },
            null,
            2
          )
        );
      } catch (error) {
        const shellEvidence = await page.evaluate(
          () =>
            (window as typeof window & { __passiveAtomEvidence?: ShellRecorder })
              .__passiveAtomEvidence ?? null
        );
        await writeFile(
          path.join(evidence, `${name}-failure.json`),
          JSON.stringify(
            {
              sourceSha,
              sourceDirty,
              sourceSnapshotSha256,
              runId,
              route,
              runtime,
              error: String(error),
              shellEvidence,
              errors,
            },
            null,
            2
          )
        );
        await page.screenshot({ path: path.join(evidence, `${name}-failure.png`), fullPage: true });
        throw error;
      } finally {
        await context.close();
      }
    },
    90_000
  );
});
