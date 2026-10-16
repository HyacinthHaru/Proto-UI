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
  TINT_STAGE_POLICY,
  TINT_STAGE_RAMPS,
  summarizeTintStageNativeStatus,
  type FrozenTintFrame,
} from './liquid-tint-stage-diagnostic';
import {
  measureProminentTintPair,
  classifyProminentTintEvidence,
  type TintPair,
} from './liquid-prominent-tint-metrics';
const route = '/en/test/liquid-tint-stage-diagnostic/';
const inputDirectory = path.resolve('apps/www/src/content/docs/zh-cn/liquid-tint-stage-inputs');
const frozen = JSON.parse(readFileSync(path.join(inputDirectory, 'manifest.json'), 'utf8')) as {
  frames: FrozenTintFrame[];
};
const hash = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');
const evidenceRoot = process.env.PROTO_UI_MATERIAL_EVIDENCE_DIR;
const output = evidenceRoot ? path.join(evidenceRoot, 'tint-stage-diagnostic') : null;
const candidate = {
  sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim(),
  patchSha256: hash(execFileSync('git', ['diff', '--binary', 'HEAD'])),
};
const plan = [
  ...frozen.frames.map((f) => ({
    id: f.id,
    kind: f.control === 'tinted' ? 'matched-gpu-frozen' : 'historical-control-reference',
  })),
  ...TINT_STAGE_RAMPS.map((r) => ({ id: r.id, kind: 'matched-gpu-ramp' })),
];
type Status = 'not-run' | 'running' | 'passed' | 'failed' | 'interrupted' | 'blocked';
const coverage: Record<
  string,
  { status: Status; executed?: boolean; error?: string; startedAt?: string; finishedAt?: string }
> = Object.fromEntries(plan.map((p) => [p.id, { status: 'not-run', executed: false }]));
const results = new Map<string, any>(),
  files: {
    file: string;
    bytes: number;
    sha256: string;
    candidate: typeof candidate;
    frameId?: string;
    role: string;
  }[] = [];
let browser: Browser | undefined,
  baseUrl = '',
  sequence = 0,
  enabled = false,
  terminal = false,
  deadline = 0;
const message = (error: unknown) =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);
function json(file: string, value: unknown) {
  if (output) writeFileSync(path.join(output, file), JSON.stringify(value, null, 2) + '\n');
}
function checkpoint(phase: 'planned' | 'running' | 'terminal') {
  if (!output || !enabled || terminal) return;
  if (phase === 'terminal') terminal = true;
  const snapshot = {
    candidate,
    originalInputs: {
      head: TINT_STAGE_POLICY.originalHead,
      tree: TINT_STAGE_POLICY.originalTree,
      manifestSha256: hash(readFileSync(path.join(inputDirectory, 'manifest.json'))),
    },
    policy: TINT_STAGE_POLICY,
    sequence: ++sequence,
    phase,
    updatedAt: new Date().toISOString(),
    plan,
    coverage,
    counts: Object.fromEntries(
      ['not-run', 'running', 'passed', 'failed', 'interrupted', 'blocked'].map((s) => [
        s,
        Object.values(coverage).filter((v) => v.status === s).length,
      ])
    ),
    gpuPlan: { frozenTintedFrames: 16, ramps: 12, drawsPerFrame: 10, extraArchiveReferences: 32 },
    candidateGeneralTransfer: 'rejected-analytically',
    productAccepted: false,
  };
  const temporary = path.join(output, 'coverage-checkpoint.tmp');
  writeFileSync(temporary, JSON.stringify(snapshot, null, 2), { flush: true });
  renameSync(temporary, path.join(output, 'coverage-checkpoint.json'));
}
function save(file: string, bytes: Buffer, role: string, frameId?: string) {
  if (!output) throw new Error('tint-stage-no-evidence-output');
  writeFileSync(path.join(output, file), bytes);
  files.push({ file, bytes: bytes.length, sha256: hash(bytes), candidate, frameId, role });
}
function png(file: string, uri: string, role: string, frameId: string) {
  save(file, Buffer.from(uri.replace(/^data:image\/png;base64,/, ''), 'base64'), role, frameId);
}
function saveResult(id: string, result: any) {
  for (const [role, uri] of Object.entries(result.stagePngs ?? {}))
    png(`${id}-${role}.png`, uri as string, role, id);
  if (result.sourcePng) png(`${id}-source.png`, result.sourcePng, 'fixed-ramp-source', id);
  for (const role of ['material', 'candidate'])
    if (result[role]?.png) png(`${id}-${role}-interior.png`, result[role].png, role, id);
  // Raw stage arrays are lossless, hash-bound and separately compressed. PNGs
  // retain 1x registration; summaries never replace the complete whole shape.
  if (result.rampObservation)
    save(
      `${id}-stage-observations.json.gz`,
      gzipSync(JSON.stringify(result.rampObservation)),
      'complete-stage-observations',
      id
    );
  const {
    stagePngs,
    sourcePng,
    rampObservation,
    sourceImage,
    material,
    candidate: candidateImage,
    ...receipt
  } = result;
  const payload = {
    candidate,
    ...receipt,
    originalInput: frozen.frames.find((f) => f.id === id) ?? null,
    material: material ? { width: material.width, height: material.height } : null,
    candidateImage: candidateImage
      ? { width: candidateImage.width, height: candidateImage.height }
      : null,
    artifacts: files.filter((f) => f.frameId === id),
    productAccepted: false,
  };
  save(`${id}.json`, Buffer.from(JSON.stringify(payload, null, 2)), 'frame-stage-receipt', id);
  results.set(id, result);
  json('artifact-manifest.json', { candidate, files, productAccepted: false });
}
function finalizeCoverage() {
  for (const record of Object.values(coverage)) {
    if (record.status === 'running') {
      record.status = 'interrupted';
      record.finishedAt = new Date().toISOString();
    } else if (record.status === 'not-run') record.status = 'blocked';
  }
}
// Synchronous exit checkpoint is a last-resort supplement. Every individual case
// also writes its terminal result in finally; afterAll is not the sole journal.
function termCheckpoint() {
  exitCheckpoint();
  process.exit(143);
}
function intCheckpoint() {
  exitCheckpoint();
  process.exit(130);
}
function exitCheckpoint() {
  finalizeCoverage();
  checkpoint('terminal');
}
beforeAll(async () => {
  if (output) {
    mkdirSync(output, { recursive: true });
    enabled = true;
    checkpoint('planned');
  }
  if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.CANDIDATE_SHA || !output)
    throw new Error(
      'Tint-stage native evidence requires official exact-head GitHub Actions; no local browser fallback'
    );
  expect(candidate.sha).toBe(process.env.CANDIDATE_SHA);
  expect(execFileSync('git', ['diff', '--binary', 'HEAD']).length).toBe(0);
  expect(
    execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).trim()
  ).toBe('');
  if (process.env.PROTO_UI_BROWSER_BASE_URL) throw new Error('Use this job own loopback server');
  expect(plan.length).toBeLessThanOrEqual(TINT_STAGE_POLICY.maximumFrames);
  process.once('exit', exitCheckpoint);
  process.once('SIGTERM', termCheckpoint);
  process.once('SIGINT', intCheckpoint);
  deadline = Date.now() + 12 * 60_000;
  baseUrl = await startServer(route);
  browser = await chromium.launch({
    executablePath: await chromeExecutable(),
    headless: true,
    chromiumSandbox: true,
    args: ['--disable-dev-shm-usage'],
  });
}, 150_000);
async function boundedCase(id: string, operation: (page: Page) => Promise<any>) {
  let page: Page | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!browser || Date.now() >= deadline)
      throw new Error('tint-stage-collection-budget-or-browser-unavailable');
    coverage[id] = { status: 'running', executed: false, startedAt: new Date().toISOString() };
    checkpoint('running');
    page = await browser.newPage({ viewport: { width: 800, height: 300 }, deviceScaleFactor: 1 });
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'load', timeout: 10_000 });
    await page.waitForFunction(
      () => document.documentElement.dataset.tintStageReady === 'true',
      null,
      { timeout: 5_000 }
    );
    coverage[id].executed = true;
    checkpoint('running');
    const result = await Promise.race([
      operation(page),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('tint-stage-case-budget-exhausted')), 12_000);
      }),
    ]);
    saveResult(id, result);
    if (result.status === 'failed') throw new Error(result.failure);
    expect(result.productAccepted).toBe(false);
    if (result.control === 'tinted') {
      expect(result.baselineReplay).toBe('byte-identical-raw-premultiplied-bottom-up');
      expect(result.productionReadback.sha256).toBe(
        result.stageReceipts.baseline.rawBottomUpSha256
      );
      expect(result.safety.candidate.minimumContrast).toBeGreaterThanOrEqual(4.5);
      expect(result.candidateGeneralTransfer).toBe('rejected-analytically');
    }
    if (result.ramp) {
      // Full-domain veto is a required negative finding, not candidate acceptance.
      if (result.ramp.low === 0) {
        expect(result.veto.verdict).toBe('rejected-continuous-tone');
        expect(new Set(result.veto.intervals.map((interval: any) => interval.side))).toEqual(
          new Set(['low', 'high'])
        );
      }
      expect(result.veto.verdict.startsWith('inconclusive')).toBe(false);
    }
    coverage[id].status = 'passed';
  } catch (error) {
    coverage[id] = {
      ...coverage[id],
      status: coverage[id].executed ? 'failed' : 'blocked',
      error: message(error),
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
describe('matched Tint4 stages and expected continuous-tone veto', () => {
  for (const frame of frozen.frames)
    it(
      frame.id,
      async () => {
        await boundedCase(frame.id, (page) => {
          const pngs = Object.fromEntries(
            Object.entries(frame.files).map(([role, file]) => [
              role,
              `data:image/png;base64,${readFileSync(path.join(inputDirectory, file.file)).toString('base64')}`,
            ])
          );
          return page.evaluate(
            (input) => (window as any).tintStageDiagnostic.runTintStageFrame(input),
            { frame, pngs }
          );
        });
      },
      30_000
    );
  for (const ramp of TINT_STAGE_RAMPS)
    it(
      ramp.id,
      async () => {
        await boundedCase(ramp.id, (page) =>
          page.evaluate(
            (input) => (window as any).tintStageDiagnostic.runTintStageRamp(input),
            ramp
          )
        );
      },
      30_000
    );
});
afterAll(async () => {
  try {
    finalizeCoverage();
    const pairs: unknown[] = [];
    for (const theme of ['light', 'dark'])
      for (const part of ['button', 'submit'])
        for (const content of ['text', 'icon-only']) {
          const key = `react-${theme}-${part}-${content}-pastel`;
          const controls: Record<string, any> = {};
          for (const control of ['neutral', 'tinted', 'opaque']) {
            const a = results.get(`${key}-0-${control}`),
              b = results.get(`${key}-1-${control}`);
            if (!a || !b || a.status === 'failed' || b.status === 'failed') continue;
            const cells = frozen.frames.find((f) => f.id === `${key}-0-${control}`)!.cells;
            const source = [a.sourceImage, b.sourceImage] as TintPair;
            controls[control] = measureProminentTintPair(source, [a.material, b.material], cells);
            if (control === 'tinted')
              controls.candidate = measureProminentTintPair(
                source,
                [a.candidate, b.candidate],
                cells
              );
          }
          const complete = ['neutral', 'tinted', 'opaque', 'candidate'].every((k) => controls[k]);
          pairs.push({
            id: key,
            complete,
            controls,
            mixedReferenceDiagnosticClassification: complete
              ? classifyProminentTintEvidence(controls.neutral, controls.tinted, controls.opaque)
              : null,
            candidateMixedTimeReferenceClassification: complete
              ? classifyProminentTintEvidence(controls.neutral, controls.candidate, controls.opaque)
              : null,
            interpretation:
              'tinted-only GPU diagnostics plus frozen historical neutral/opaque own-geometry controls; no UI/runtime acceptance; weak neutral stays inconclusive',
            candidateGeneralTransfer: 'rejected-analytically',
            productAccepted: false,
          });
        }
    if (enabled)
      json('results.json', {
        candidate,
        browser: browser?.version(),
        node: process.version,
        policy: TINT_STAGE_POLICY,
        coverage,
        pairs,
        candidateGeneralTransfer: 'rejected-analytically',
        ...summarizeTintStageNativeStatus(
          frozen.frames.filter((frame) => frame.control === 'tinted').map((frame) => frame.id),
          coverage,
          results
        ),
        productAccepted: false,
        originalNativeFailuresPreserved: [
          'light-button-text',
          'light-button-icon-only',
          'dark-submit-text',
          'dark-submit-icon-only',
        ],
        originalNeutralLimitation:
          'dark Button remains inconclusive; tinted-only diagnostics never erase it',
      });
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
