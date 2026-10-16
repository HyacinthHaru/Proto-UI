// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, type Browser, type Page } from 'playwright-core';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { chromeExecutable, startServer, stopServer } from './browser-harness';
import {
  REFRACTION_POLICY,
  REFRACTION_SEQUENCE,
  summarizeRefractionCoverage,
  refractionCollectionBudget,
  terminalRefractionCoverage,
  summarizeRefractionSequence,
} from './liquid-visible-refraction-diagnostic';
import type { FrozenTintFrame } from './liquid-tint-stage-diagnostic';
const route = '/en/test/liquid-visible-refraction-diagnostic/';
const inputDirectory = path.resolve('apps/www/src/content/docs/zh-cn/liquid-tint-stage-inputs');
const frozen = JSON.parse(readFileSync(path.join(inputDirectory, 'manifest.json'), 'utf8')) as {
  frames: FrozenTintFrame[];
};
const hash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const evidenceRoot = process.env.PROTO_UI_MATERIAL_EVIDENCE_DIR;
const output = evidenceRoot ? path.join(evidenceRoot, 'visible-refraction-diagnostic') : null;
const candidate = {
  sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
  patchSha256: hash(execFileSync('git', ['diff', '--binary', 'HEAD'])),
};
const fixtureFrames = ['light', 'dark'].flatMap((theme) =>
  ['button', 'submit'].map((part) => {
    const frame = frozen.frames.find((f) => f.id === `react-${theme}-${part}-text-pastel-0-tinted`);
    if (!frame) throw new Error(`refraction-frozen-fixture-missing-${theme}-${part}`);
    return frame;
  })
);
const fixtures = fixtureFrames.flatMap((frame) =>
  (['structured', 'archived'] as const).map((sourceKind) => ({
    frame,
    sourceKind,
    id: `${frame.theme}-${frame.part}-${sourceKind}`,
  }))
);
const plan = fixtures.flatMap((fixture) => [
  ...REFRACTION_SEQUENCE.map((step, sequenceIndex) => ({
    fixture,
    id: `${fixture.id}-${step.id}`,
    sequenceIndex,
    staticProfile: false,
    scriptTimestampMs: step.milliseconds,
  })),
  {
    fixture,
    id: `${fixture.id}-fixed-static-profile`,
    sequenceIndex: 0,
    staticProfile: true,
    scriptTimestampMs: 0,
  },
]);
type Status = 'not-run' | 'running' | 'passed' | 'failed' | 'interrupted' | 'blocked';
type Coverage = {
  status: Status;
  executed: boolean;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  nativeExecutionUnknown?: boolean;
};
const coverage: Record<string, Coverage> = Object.fromEntries(
  plan.map((p) => [p.id, { status: 'not-run', executed: false }])
);
const files: {
  file: string;
  sha256: string;
  bytes: number;
  caseId: string;
  role: string;
  candidate: typeof candidate;
}[] = [];
const results = new Map<string, any>();
let browser: Browser | undefined,
  baseUrl = '',
  deadline = 0,
  checkpointSequence = 0,
  terminal = false,
  enabled = false;
let sequenceIntegrityStatus = 'not-evaluated';
function summary() {
  const collected = summarizeRefractionCoverage(
    plan.map((p) => p.id),
    coverage
  );
  return {
    ...collected,
    sequenceIntegrityStatus,
    status:
      collected.status !== 'collected-native-diagnostic'
        ? collected.status
        : sequenceIntegrityStatus === 'complete'
          ? collected.status
          : sequenceIntegrityStatus === 'failed'
            ? 'scripted-sequence-integrity-failed'
            : 'incomplete-native-diagnostic',
  };
}
const message = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);
function json(file: string, value: unknown) {
  if (output) writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
}
function finalizeCoverage() {
  const terminalStates = terminalRefractionCoverage(coverage);
  for (const record of Object.values(coverage)) {
    if (record.status === 'running') {
      record.status = 'interrupted';
      record.nativeExecutionUnknown = !record.executed;
      record.finishedAt = new Date().toISOString();
    } else if (record.status === 'not-run') record.status = 'blocked';
  }
  for (const [id, row] of Object.entries(terminalStates))
    coverage[id].status = row.status as Status;
}
function checkpoint(phase: 'planned' | 'running' | 'terminal') {
  if (!output || !enabled || terminal) return;
  const snapshot = {
    candidate,
    policy: REFRACTION_POLICY,
    phase,
    sequence: ++checkpointSequence,
    updatedAt: new Date().toISOString(),
    inputManifestSha256: hash(readFileSync(path.join(inputDirectory, 'manifest.json'))),
    plan: plan.map(({ fixture, ...entry }) => ({
      ...entry,
      fixture: fixture.id,
      originalFrameId: fixture.frame.id,
    })),
    coverage,
    drawsCollected: [...results.values()].reduce(
      (sum, r) => sum + r.captures.reduce((n: number, c: any) => n + c.draws, 0),
      0
    ),
    ...summary(),
    productAccepted: false,
  };
  const temp = path.join(output, 'coverage-checkpoint.tmp');
  writeFileSync(temp, JSON.stringify(snapshot, null, 2), { flush: true });
  renameSync(temp, path.join(output, 'coverage-checkpoint.json'));
  if (phase === 'terminal') terminal = true;
}
function exitCheckpoint() {
  finalizeCoverage();
  checkpoint('terminal');
}
function termCheckpoint() {
  exitCheckpoint();
  process.exit(143);
}
function intCheckpoint() {
  exitCheckpoint();
  process.exit(130);
}
function save(file: string, bytes: Buffer, role: string, caseId: string) {
  if (!output) throw new Error('refraction-evidence-directory-required');
  writeFileSync(path.join(output, file), bytes);
  files.push({ file, sha256: hash(bytes), bytes: bytes.length, role, caseId, candidate });
}
function saveResult(id: string, result: any) {
  for (const capture of result.captures ?? []) {
    const raw = Buffer.from(capture.rawReadback);
    if (hash(raw) !== capture.rawReadbackSha256)
      throw new Error('refraction-raw-readback-transfer-mismatch');
    save(
      `${id}-${capture.mode}-raw-rgba8.gz`,
      gzipSync(raw),
      'raw-premultiplied-bottom-up-readback',
      id
    );
    delete capture.rawReadback;
  }

  for (const [role, uri] of Object.entries(result.pngs ?? {}))
    save(
      `${id}-${role}.png`,
      Buffer.from((uri as string).replace(/^data:image\/png;base64,/, ''), 'base64'),
      role,
      id
    );
  const { pngs, ...receipt } = result;
  save(
    `${id}.json`,
    Buffer.from(
      JSON.stringify(
        { candidate, ...receipt, artifacts: files.filter((f) => f.caseId === id) },
        null,
        2
      )
    ),
    'frame-receipt',
    id
  );
  results.set(id, receipt);
  json('artifact-manifest.json', { candidate, files, productAccepted: false });
}
function saveViewer() {
  if (!output) return;
  const sections = fixtures
    .map(
      (f) =>
        `<section><h2>${f.id}</h2><p>Scripted renderer sequence, fixed CSS size and DPR 1. Synthetic contexts combine the same source and decoded native canvas PNG; material has no component glyph. Times are planned sequence times, not measured interaction timing.</p>${plan
          .filter((p) => p.fixture.id === f.id)
          .map((p) => {
            const r = results.get(p.id);
            return `<article><h3>${p.staticProfile ? 'Separate fixed static profile' : `${p.scriptTimestampMs} ms: ${REFRACTION_SEQUENCE[p.sequenceIndex].id}`}</h3><p>${coverage[p.id].status}; ${r?.measurement?.verdict ?? 'no measurement'}. Source shift ${p.staticProfile ? 0 : REFRACTION_SEQUENCE[p.sequenceIndex].sourceShiftRasterX} source-raster px (${r?.sourceTranslation?.cssPixelsX ?? 'uncollected'} CSS px).</p>${r ? ['baseline', 'strict-warp-off', ...(p.sequenceIndex === 0 && !p.staticProfile ? ['zero-aberration', 'total-zero-refraction'] : [])].map((mode) => `<figure><figcaption>${mode}</figcaption><img src="${p.id}-${mode}-context.png" alt="${f.id} ${mode} ${p.id}" /></figure>`).join('') : ''}</article>`;
          })
          .join('')}</section>`
    )
    .join('');
  json('sequence-index.json', {
    candidate,
    coordinateSystem:
      'native DPR1 PNGs at 1x, logical scripted timestamps and per-frame wall clock receipts',
    productAccepted: false,
  });
  writeFileSync(
    path.join(output, 'index.html'),
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>Visible refraction diagnostic sequence</title><style>body{font:14px system-ui;margin:24px;background:#eee;color:#111}section{margin:36px 0}article{border-top:1px solid #aaa;padding:16px 0;overflow:auto}figure{display:inline-block;vertical-align:top;margin:4px 16px 4px 0}img{display:block;max-width:none}figcaption{margin:6px 0}</style><h1>Visible refraction diagnostics</h1><p>Commit ${candidate.sha}; tree ${candidate.tree}. No appearance acceptance. Strict warp-off removes only offset; total-zero is a multi-factor explanatory control. Outer 0–4 CSS-pixel rim is outside correspondence patch support and cannot be declared absent.</p>${sections}</html>`
  );
}
beforeAll(async () => {
  if (output) {
    mkdirSync(output, { recursive: true });
    enabled = true;
    checkpoint('planned');
  }
  process.once('exit', exitCheckpoint);
  process.once('SIGTERM', termCheckpoint);
  process.once('SIGINT', intCheckpoint);
  try {
    if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.CANDIDATE_SHA || !output)
      throw new Error(
        'Visible-refraction native evidence requires official exact-head GitHub Actions; no local browser fallback'
      );
    expect(candidate.sha).toBe(process.env.CANDIDATE_SHA);
    expect(execFileSync('git', ['diff', '--binary', 'HEAD']).length).toBe(0);
    expect(
      execFileSync('git', ['ls-files', '--others', '--exclude-standard'], {
        encoding: 'utf8',
      }).trim()
    ).toBe('');
    if (process.env.PROTO_UI_BROWSER_BASE_URL)
      throw new Error('Refraction collector must own its loopback server');
    expect(fixtures.length).toBe(REFRACTION_POLICY.maximumFixtures);
    expect(plan.length).toBe(REFRACTION_POLICY.maximumFrames);
    deadline = Date.now() + REFRACTION_POLICY.maximumMilliseconds;
    baseUrl = await startServer(route);
    browser = await chromium.launch({
      executablePath: await chromeExecutable(),
      headless: true,
      chromiumSandbox: true,
      args: ['--disable-dev-shm-usage'],
    });
  } catch (error) {
    for (const row of Object.values(coverage)) {
      row.status = 'blocked';
      row.error = message(error);
    }
    checkpoint('terminal');
    throw error;
  }
}, 150_000);
async function collect(entry: (typeof plan)[number]) {
  const { id, fixture } = entry;
  let page: Page | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    evaluationStarted = false;
  try {
    const observedDraws = [...results.values()].reduce(
      (sum, result) => sum + result.captures.reduce((n: number, c: any) => n + c.draws, 0),
      0
    );
    refractionCollectionBudget(observedDraws, Date.now(), deadline);
    if (!browser || Date.now() >= deadline)
      throw new Error('refraction-browser-or-12-minute-budget-exhausted');
    coverage[id] = { status: 'running', executed: false, startedAt: new Date().toISOString() };
    checkpoint('running');
    page = await browser.newPage({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 1 });
    await page.route('**/*', (request) => {
      const url = new URL(request.request().url());
      return ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
        ? request.continue()
        : request.abort();
    });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'load', timeout: 10_000 });
    await page.waitForFunction(
      () => document.documentElement.dataset.visibleRefractionReady === 'true',
      null,
      { timeout: 5_000 }
    );
    const file = fixture.frame.files.source;
    const sourceBytes = readFileSync(path.join(inputDirectory, file.file));
    expect(hash(sourceBytes)).toBe(file.sha256);
    evaluationStarted = true;
    const result: any = await Promise.race([
      page.evaluate(
        (input) => (window as any).visibleRefractionDiagnostic.runVisibleRefractionFrame(input),
        {
          frame: fixture.frame,
          sourcePng: `data:image/png;base64,${sourceBytes.toString('base64')}`,
          sourceKind: fixture.sourceKind,
          sequenceIndex: entry.sequenceIndex,
          staticProfile: entry.staticProfile,
        }
      ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('refraction-case-budget-exhausted')),
          refractionCollectionBudget(observedDraws, Date.now(), deadline)
        );
      }),
    ]);
    coverage[id].executed =
      result.captures?.some((c: any) => c.draws > 0 && c.productionReadbacks > 0) === true;
    saveResult(id, result);
    const cumulativeDraws = [...results.values()].reduce(
      (sum, saved) => sum + saved.captures.reduce((n: number, c: any) => n + c.draws, 0),
      0
    );
    expect(cumulativeDraws).toBeLessThanOrEqual(REFRACTION_POLICY.maximumDraws);
    expect(result.productAccepted).toBe(false);
    expect(result.nativeDpr).toBe(1);
    expect(result.sourceAdmissionProved).toBe(false);
    expect(result.status).toBe('collected-native-diagnostic');
    for (const capture of result.captures) {
      expect(capture.draws).toBe(1);
      expect(capture.productionReadbacks).toBe(1);
      expect(capture.safety.minimumContrast).toBeGreaterThanOrEqual(4.5);
    }
    expect(result.captures.length).toBe(entry.sequenceIndex === 0 && !entry.staticProfile ? 4 : 2);
    coverage[id].status = 'passed';
  } catch (error) {
    coverage[id] = {
      ...coverage[id],
      status: evaluationStarted ? 'failed' : 'blocked',
      error: message(error),
      nativeExecutionUnknown: evaluationStarted && !coverage[id].executed,
    };
    if (enabled)
      json(`${id}-error.json`, { candidate, id, error: message(error), productAccepted: false });
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    coverage[id].finishedAt = new Date().toISOString();
    checkpoint('running');
    await page?.close().catch(() => {});
  }
}
describe('test-only same-frame visible-refraction source controls', () => {
  for (const entry of plan) it(entry.id, () => collect(entry), 30_000);
});
afterAll(async () => {
  try {
    finalizeCoverage();
    saveViewer();
    const sequences = fixtures.map((fixture) => ({
      fixture: fixture.id,
      ...summarizeRefractionSequence(
        Object.fromEntries(
          REFRACTION_SEQUENCE.map((step) => [step.id, results.get(`${fixture.id}-${step.id}`)])
        )
      ),
    }));
    sequenceIntegrityStatus = sequences.some((s) => s.status === 'failed')
      ? 'failed'
      : sequences.every((s) => s.status === 'complete')
        ? 'complete'
        : 'incomplete';
    if (enabled)
      json('results.json', {
        candidate,
        browser: browser?.version(),
        node: process.version,
        policy: REFRACTION_POLICY,
        coverage,
        ...summary(),
        sequences,
        results: [...results.entries()].map(([id, result]) => ({ id, ...result })),
        productAccepted: false,
      });
    for (const sequence of sequences)
      if (sequence.status === 'failed')
        throw new Error(`refraction-scripted-sequence-integrity-${sequence.fixture}`);
  } finally {
    checkpoint('terminal');
    process.removeListener('exit', exitCheckpoint);
    process.removeListener('SIGTERM', termCheckpoint);
    process.removeListener('SIGINT', intCheckpoint);
    try {
      await browser?.close();
    } finally {
      await stopServer();
    }
  }
});
