import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  createContrastReportJournal,
  readContrastReportJournal,
} from './contrast-report-journal.mjs';

const digest = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;

async function fixture(t, otherCases = []) {
  const output = await mkdtemp(path.join(os.tmpdir(), 'contrast-report-journal-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  const journal = await createContrastReportJournal(output);
  const report = {
    schemaVersion: 3,
    runID: 'fixture-run',
    baseline: 'fixture-head',
    disposition: 'running; no acceptance determination',
    cases: [
      {
        family: 'button',
        runtime: 'react',
        theme: 'light',
        status: 'running',
        plannedStates: ['rest', 'hover'],
        achievedTargets: [],
        errors: [],
      },
      ...otherCases,
    ],
    frames: journal.frames,
    failedCases: [],
    summary: { collectedFrames: 0, caseCoverage: [{ status: 'running' }] },
  };
  await journal.persist('initial', report);
  return { output, journal, report };
}

async function capture({ output, journal, report }, index, payloadBytes = 1024) {
  const name = `button-react-light-state-${index}`;
  const frame = {
    family: 'button',
    runtime: 'react',
    theme: 'light',
    requestedState: `state-${index}`,
    status: 'attempting',
    image: null,
    facts: null,
  };
  await journal.beginFrame(name, frame);
  const png = Buffer.from(`fixture-png-${index}`);
  await writeFile(path.join(output, `${name}.png`), png, { flag: 'wx' });
  frame.image = { path: `${name}.png`, digest: digest(png) };
  frame.facts = { pixels: `unique-fact-${index}:${'x'.repeat(payloadBytes)}` };
  const json = JSON.stringify(frame.facts);
  await writeFile(path.join(output, `${name}.facts.json`), json, { flag: 'wx' });
  frame.factsFile = { path: `${name}.facts.json`, digest: digest(json) };
  frame.status = 'matched';
  frame.targetObservation = { achieved: true, details: `target-${index}` };
  report.cases[0].achievedTargets.push(frame.requestedState);
  await journal.finishFrame(name, frame);
  report.summary.collectedFrames = journal.frames.length;
  await journal.persist('frame', report, report.cases[0]);
  return { name, frame };
}

async function allFiles(root) {
  const paths = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) paths.push(...(await allFiles(full)));
    else paths.push(full);
  }
  return paths;
}

describe('contrast report journal', () => {
  it('stores facts once, compact manifests during capture, and one final report', async (t) => {
    const context = await fixture(t);
    const { output, journal, report } = context;
    const { frame } = await capture(context, 0);
    const manifest = JSON.parse(await readFile(path.join(output, 'report.json'), 'utf8'));
    assert.equal(manifest.storage.format, 'create-only-contrast-journal-v1');
    assert.equal(manifest.frames, undefined);
    assert.equal(manifest.summary.caseCoverage, undefined);
    assert.equal(journal.matchedFrames, 1);
    assert.equal(report.frames[0].facts, undefined);
    assert.equal(report.frames[0].targetObservation, undefined);
    const stored = JSON.parse(
      await readFile(path.join(output, report.frames[0].frameFile.path), 'utf8')
    );
    assert.equal(stored.frame.facts, undefined);
    assert.deepEqual(stored.frame.factsFile, frame.factsFile);
    assert.deepEqual(stored.frame.targetObservation, frame.targetObservation);
    report.cases[0].status = 'observed';
    report.completedAt = 'fixture-completed';
    report.disposition = 'planned target observations collected; conformance not evaluated';
    await journal.persist('final', report);
    const final = JSON.parse(await readFile(path.join(output, 'report.json'), 'utf8'));
    assert.deepEqual(final.cases, report.cases);
    assert.deepEqual(final.frames, report.frames);
    assert.deepEqual(final.summary, report.summary);
    assert.deepEqual(
      JSON.parse(await readFile(path.join(output, 'report-final.json'), 'utf8')),
      final
    );
    const replay = await readContrastReportJournal(output);
    assert.deepEqual(replay.cases, report.cases);
    assert.deepEqual(replay.frames, report.frames);
    assert.deepEqual(replay.failedCases, []);
    assert.deepEqual(replay.recoveryErrors, []);
    const contents = await Promise.all(
      (await allFiles(output)).map((file) => readFile(file, 'utf8'))
    );
    assert.equal(contents.filter((text) => text.includes('unique-fact-0:')).length, 1);
  });

  it('retains failed frames, unmatched artifacts, case errors and fatal/cleanup failures', async (t) => {
    const { output, journal, report } = await fixture(t);
    const name = 'button-react-light-failed';
    const frame = { status: 'attempting', requestedState: 'failed', image: null, facts: null };
    await journal.beginFrame(name, frame);
    frame.status = 'failed';
    frame.error = 'PNG/fact state mismatch';
    frame.image = { path: `${name}.png`, digest: 'fixture-image' };
    frame.factsFile = { path: `${name}.facts.json`, digest: 'fixture-facts' };
    frame.mismatchFile = { path: `${name}.mismatch.json`, digest: 'fixture-mismatch' };
    await journal.finishFrame(name, frame);
    report.cases[0].status = 'failed';
    report.cases[0].errors.push({ phase: 'capture', error: frame.error });
    report.failedCases.push({ phase: 'capture', error: frame.error });
    report.fatalError = { phase: 'source-provenance', error: 'source changed' };
    report.browserCleanupError = 'context close failed';
    await journal.persist('failure', report);
    const replay = await readContrastReportJournal(output);
    assert.deepEqual(replay.cases, report.cases);
    assert.deepEqual(replay.failedCases, report.failedCases);
    assert.deepEqual(replay.fatalError, report.fatalError);
    assert.equal(replay.browserCleanupError, report.browserCleanupError);
    assert.equal(replay.frames[0].status, 'failed');
    assert.equal(journal.matchedFrames, 0);
    const result = JSON.parse(
      await readFile(path.join(output, replay.frames[0].frameFile.path), 'utf8')
    );
    assert.deepEqual(result.frame.mismatchFile, frame.mismatchFile);
  });

  it('recovers an interrupted attempt even before its first checkpoint or result', async (t) => {
    const { output, journal } = await fixture(t);
    const name = 'button-react-light-interrupted';
    await journal.beginFrame(name, { status: 'attempting', requestedState: 'interrupted' });
    await writeFile(path.join(output, `${name}.png`), 'partial-attempt-png', { flag: 'wx' });
    const replay = await readContrastReportJournal(output);
    assert.equal(replay.frames[0].status, 'attempting');
    assert.equal(replay.frames[0].expectedArtifacts.image, `${name}.png`);
    assert.equal(replay.frames[0].expectedArtifacts.facts, `${name}.facts.json`);
    assert.equal(replay.cases[0].status, 'running');
    assert.equal(replay.completedAt, undefined);
  });

  it('preserves unexternalized facts when a facts-file write did not complete', async (t) => {
    const { output, journal } = await fixture(t);
    const frame = { status: 'attempting', facts: null };
    await journal.beginFrame('failed-facts-write', frame);
    frame.status = 'failed';
    frame.error = 'facts file write failed';
    frame.facts = { retained: 'measured before filesystem error' };
    await journal.finishFrame('failed-facts-write', frame);
    const result = JSON.parse(
      await readFile(path.join(output, journal.frames[0].frameFile.path), 'utf8')
    );
    assert.deepEqual(result.frame.facts, frame.facts);
    assert.equal(journal.frames[0].facts, undefined);
  });

  it('never replaces a previous run, duplicate attempt, frame result or final report', async (t) => {
    const context = await fixture(t);
    const { output, journal, report } = context;
    const { name, frame } = await capture(context, 0);
    const resultPath = path.join(output, journal.frames[0].frameFile.path);
    const before = await readFile(resultPath, 'utf8');
    await assert.rejects(createContrastReportJournal(output), { code: 'EEXIST' });
    await assert.rejects(journal.beginFrame(name, frame), /already started/);
    await assert.rejects(journal.finishFrame(name, frame), /already finished/);
    assert.equal(await readFile(resultPath, 'utf8'), before);
    await journal.persist('final', report);
    await assert.rejects(journal.persist('final', report), /finalized/);
    await assert.rejects(journal.beginFrame('later', frame), /finalized/);
  });

  it('keeps prior evidence readable and reports a truncated tail as unresolved', async (t) => {
    const context = await fixture(t);
    await capture(context, 0);
    const directory = path.join(context.output, 'report-journal');
    await writeFile(path.join(directory, 'checkpoint-000002.json'), '{"partial":');
    const replay = await readContrastReportJournal(context.output);
    assert.equal(replay.frames[0].status, 'matched');
    assert.equal(replay.cases[0].achievedTargets.length, 1);
    assert.equal(replay.recoveryErrors.length, 1);
    assert.match(replay.recoveryErrors[0].path, /checkpoint-000002/);
    assert.match(replay.disposition, /incomplete/);
  });

  it('does not serialize older frames, accumulated targets or unrelated cases at a checkpoint', async (t) => {
    let otherCaseReads = 0;
    const context = await fixture(t, [
      {
        family: 'toggle',
        status: 'pending',
        achievedTargets: [],
        errors: [],
        observation: { toJSON: () => (++otherCaseReads, { achieved: false }) },
      },
    ]);
    await capture(context, 0);
    const unexpectedRead = () => assert.fail('Previously stored evidence was serialized again.');
    otherCaseReads = 0;
    context.journal.frames[0].toJSON = unexpectedRead;
    context.report.cases[0].achievedTargets[0] = { toJSON: unexpectedRead };
    context.report.summary.caseCoverage = { toJSON: unexpectedRead };
    await capture(context, 1);
    assert.equal(otherCaseReads, 0);
  });

  it('retains linearly growing bytes as frame count doubles, including all snapshots', async (t) => {
    const totals = [];
    for (const count of [24, 48]) {
      const context = await fixture(t);
      for (let index = 0; index < count; index++) await capture(context, index, 32_768);
      await context.journal.persist('final', context.report);
      const files = await allFiles(context.output);
      const bytes = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce(
        (sum, size) => sum + size,
        0
      );
      totals.push(bytes);
      assert.ok(
        bytes < count * 45_000,
        `all retained evidence: ${bytes} bytes for ${count} frames`
      );
      assert.equal(files.filter((file) => file.endsWith('.facts.json')).length, count);
      assert.equal(files.filter((file) => file.endsWith('.png')).length, count);
      assert.equal(files.filter((file) => /report-\d+-frame\.json$/.test(file)).length, 0);
    }
    assert.ok(totals[1] < totals[0] * 2.15, `doubling retained ${totals[0]} -> ${totals[1]}`);
    t.diagnostic(`Retained-byte scaling: 24 frames=${totals[0]}, 48 frames=${totals[1]}.`);
  });
});
