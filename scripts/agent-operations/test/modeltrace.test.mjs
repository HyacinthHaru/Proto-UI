import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runModelTraceCli } from '../modeltrace-cli.mjs';
import {
  assertModelTraceDisclosure,
  assertModelTraceFresh,
  buildModelTraceRecord,
  computeModelTraceChallengeDigest,
  createModelTraceChallenge,
  loadModelTraceRecord,
  renderModelTraceDisclosure,
  validateModelTraceSample,
  validateModelTraceContext,
} from '../modeltrace.mjs';

const NOW = new Date('2026-10-04T12:00:00.000Z');
function fixture({ declared = { systemModel: null, harnessModel: null }, failed = false } = {}) {
  const context = {
    schemaVersion: 1,
    kind: 'proto-ui.modeltrace-context',
    repositoryId: 'github.com:fixture/repository',
    sessionId: 'synthetic-unit-test-not-a-model-measurement',
    contextDigest: 'a'.repeat(64),
    routeDigest: 'b'.repeat(64),
    declared,
  };
  const challenge = createModelTraceChallenge(context, { now: NOW });
  const response = {
    schemaVersion: 1,
    kind: 'proto-ui.modeltrace-response',
    challengeDigest: computeModelTraceChallengeDigest(challenge),
    startedAt: NOW.toISOString(),
    completedAt: NOW.toISOString(),
    method: 'active-model-literals',
    // Deliberately synthetic fixtures, never self-measurements of an Agent.
    outputs: challenge.probes.map((probe) => ({
      id: probe.id,
      text: failed ? null : JSON.stringify(Array(probe.count).fill(137)),
      error: failed ? 'unavailable' : null,
    })),
  };
  return { context, challenge, response, record: buildModelTraceRecord(challenge, response) };
}

test('strict samples reject extraction, repair, decimals and out-of-range integers', () => {
  const raw = JSON.stringify(Array(218).fill(137));
  assert.equal(validateModelTraceSample(raw, 218).length, 218);
  assert.equal(validateModelTraceSample(`\`\`\`json\n${raw}\n\`\`\``, 218).length, 218);
  for (const invalid of [
    `prefix ${raw}`,
    raw.replace('137', '1.5'),
    raw.replace('137', '1e2'),
    raw.replace('137', '356'),
    raw.slice(0, -1),
    `${raw}\n${raw}`,
  ]) {
    assert.throws(() => validateModelTraceSample(invalid, 218));
  }
  assert.throws(() => validateModelTraceSample(JSON.stringify(Array(119).fill(137)), 218), /count/);
  assert.throws(() => validateModelTraceSample(JSON.stringify(Array(274).fill(137)), 218), /count/);
});

test('model declarations cannot select the fingerprint or become a failed-probe fallback', () => {
  const first = fixture({ declared: { systemModel: 'gpt-5.4', harnessModel: 'gpt-5.4' } });
  const second = fixture({ declared: { systemModel: 'gpt-6-astra', harnessModel: 'gpt-6-astra' } });
  assert.deepEqual(first.record.receipt.result, second.record.receipt.result);
  const failed = fixture({
    declared: { systemModel: 'gpt-6.1-sol', harnessModel: 'gpt-6-astra' },
    failed: true,
  });
  assert.equal(failed.record.receipt.result.status, 'failed');
  assert.equal(failed.record.receipt.result.modelId, null);
  assert(failed.record.receipt.anomalies.includes('declared-model-not-in-bank'));
  assert(failed.record.receipt.anomalies.includes('declaration-conflict'));
  assert(failed.record.receipt.anomalies.includes('unknown-model-not-excluded'));
  assert.equal(failed.record.receipt.trust.backendAuthenticated, false);
});

test('an invalid third probe cannot be scored as a two-query identity', () => {
  const f = fixture();
  f.response.outputs[2].text = 'prose containing 1, 2, 3';
  const record = buildModelTraceRecord(f.challenge, f.response);
  assert.equal(record.receipt.result.status, 'failed');
  assert.equal(record.receipt.result.modelId, null);
  assert.equal(record.response.outputs[2].text, 'prose containing 1, 2, 3');
  assert(record.receipt.anomalies.includes('sample-validation-failed'));
  assert.equal(record.receipt.sampling.counts[2], null);
});

test('natural count deviations are retained without repair', () => {
  const f = fixture();
  f.response.outputs[1].text = JSON.stringify(Array(230).fill(137));
  const record = buildModelTraceRecord(f.challenge, f.response);
  assert.equal(record.receipt.sampling.counts[1], 230);
  assert(record.receipt.anomalies.includes('count-deviation'));
  assert.equal(record.response.outputs[1].text, f.response.outputs[1].text);
});

test('expiry, changed task/provider/session and future clocks require a new measurement', () => {
  const f = fixture({ failed: true });
  const receipt = f.record.receipt;
  assertModelTraceFresh(receipt, f.context, { now: NOW });
  assertModelTraceFresh(receipt, f.context, { now: new Date(Date.parse(receipt.expiresAt) - 1) });
  assert.throws(
    () => assertModelTraceFresh(receipt, f.context, { now: new Date(receipt.expiresAt) }),
    /expired/
  );
  assert.throws(
    () => assertModelTraceFresh(receipt, f.context, { now: new Date(NOW.getTime() - 1) }),
    /future/
  );
  for (const context of [
    { ...f.context, repositoryId: 'github.com:another/repository' },
    { ...f.context, sessionId: 'another-agent' },
    { ...f.context, contextDigest: 'c'.repeat(64) },
    { ...f.context, routeDigest: 'c'.repeat(64) },
    { ...f.context, declared: { systemModel: 'gpt-5.4', harnessModel: null } },
  ])
    assert.throws(() => assertModelTraceFresh(receipt, context, { now: NOW }), /changed/);
});

test('failed retests remain failed, not a fabricated model mismatch', () => {
  const prior = fixture().record.receipt;
  const f = fixture({ failed: true });
  const record = buildModelTraceRecord(f.challenge, f.response, { previous: prior });
  assert.equal(record.receipt.result.modelId, null);
  assert.equal(record.receipt.anomalies.includes('retest-inconsistent'), false);
  assert(record.receipt.anomalies.includes('probe-failed'));
  assert.equal(record.receipt.priorReceiptDigest, prior.id.slice(7));
});

test('raw samples are re-scored before use and never appear in public disclosure', (t) => {
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'modeltrace-boundary-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const f = fixture();
  const recordPath = path.join(directory, 'record.json');
  const contextPath = path.join(directory, 'context.json');
  fs.writeFileSync(recordPath, JSON.stringify(f.record));
  fs.writeFileSync(contextPath, JSON.stringify(f.context));
  const receipt = loadModelTraceRecord({ recordPath, contextPath, now: NOW });
  const disclosure = renderModelTraceDisclosure(receipt);
  assert.equal(disclosure.includes(f.context.sessionId), false);
  assert.equal(disclosure.includes(f.response.outputs[0].text), false);
  f.record.response.outputs[0].text = JSON.stringify(Array(218).fill(138));
  fs.writeFileSync(recordPath, JSON.stringify(f.record));
  assert.throws(
    () => loadModelTraceRecord({ recordPath, contextPath, now: NOW }),
    /does not reproduce/
  );
  fs.symlinkSync(contextPath, path.join(directory, 'linked-context'));
  assert.throws(() =>
    loadModelTraceRecord({
      recordPath,
      contextPath: path.join(directory, 'linked-context'),
      now: NOW,
    })
  );
});

test('responses cannot be relabelled as a fresh challenge or another sampler', () => {
  const f = fixture();
  const next = createModelTraceChallenge(f.context, { now: NOW });
  assert.throws(() => buildModelTraceRecord(next, f.response), /does not bind/);
  f.response.method = 'fresh-api-model';
  assert.throws(() => buildModelTraceRecord(f.challenge, f.response), /unsupported sampler/);
});

test('hidden and duplicate disclosures cannot satisfy visible publication', () => {
  const receipt = fixture({ failed: true }).record.receipt;
  const disclosure = renderModelTraceDisclosure(receipt);
  assertModelTraceDisclosure(`Evidence\n\n${disclosure}`, receipt);
  assert.throws(() => assertModelTraceDisclosure(`<!--\n${disclosure}\n-->`, receipt), /visible/);
  assert.throws(() => assertModelTraceDisclosure(`<!--\n${disclosure}`, receipt), /visible/);
  assert.throws(
    () => assertModelTraceDisclosure(`${disclosure}\n\n${disclosure}`, receipt),
    /visible/
  );
});

test('digest and repository bindings reject regex-coercible singleton arrays', () => {
  const context = fixture({ failed: true }).context;
  assert.throws(
    () => validateModelTraceContext({ ...context, repositoryId: [context.repositoryId] }),
    /repository/
  );
  assert.throws(
    () => validateModelTraceContext({ ...context, contextDigest: [context.contextDigest] }),
    /digest/
  );
  assert.throws(
    () => validateModelTraceContext({ ...context, routeDigest: [context.routeDigest] }),
    /digest/
  );
});

test('non-rendered HTML and enclosing code cannot impersonate a standalone disclosure', () => {
  const receipt = fixture({ failed: true }).record.receipt;
  const disclosure = renderModelTraceDisclosure(receipt);
  assertModelTraceDisclosure(`Evidence <!-- harmless comment -->\n\n${disclosure}`, receipt);
  assertModelTraceDisclosure(`The delimiter is \`<!--\`.\n\n${disclosure}`, receipt);
  assertModelTraceDisclosure(`The escaped delimiter is \\<!--.\n\n${disclosure}`, receipt);
  for (const wrapped of [
    `<?\n${disclosure}\n?>`,
    `<script>\n${disclosure}\n</script>`,
    `<![CDATA[\n${disclosure}\n]]>`,
    `~~~text\n${disclosure}\n~~~`,
    `<div>\n<!--\n</div>\n\n${disclosure}\n-->`,
    `<hr>\n<!--\n\n${disclosure}\n-->`,
    `<p>\n<!--\n</p>\n\n${disclosure}\n-->`,
  ])
    assert.throws(() => assertModelTraceDisclosure(wrapped, receipt), /visible/);
});

test('canonical fenced receipt bytes cannot be reconstructed by stripping literal comments', () => {
  const receipt = fixture({ failed: true }).record.receipt;
  const disclosure = renderModelTraceDisclosure(receipt);
  assert.throws(
    () => assertModelTraceDisclosure(disclosure.replace('"result"', '"res<!--x-->ult"'), receipt),
    /exact/
  );
  assert.throws(
    () => assertModelTraceDisclosure(`${disclosure}not-a-closing-fence`, receipt),
    /exact/
  );
});

test('private --out storage cannot enter the repository through a parent symlink', (t) => {
  const outside = fs.mkdtempSync(path.join(tmpdir(), 'modeltrace-private-output-'));
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const inside = fs.mkdtempSync(path.join(root, '.modeltrace-output-fixture-'));
  t.after(() => {
    fs.rmSync(outside, { recursive: true, force: true });
    fs.rmSync(inside, { recursive: true, force: true });
  });
  const contextPath = path.join(outside, 'context.json');
  fs.writeFileSync(contextPath, JSON.stringify(fixture({ failed: true }).context));
  fs.symlinkSync(inside, path.join(outside, 'linked-parent'));
  assert.throws(
    () =>
      runModelTraceCli(
        [
          'challenge',
          '--context',
          contextPath,
          '--out',
          path.join(outside, 'linked-parent', 'private.json'),
        ],
        { now: NOW, stdout: { write() {} } }
      ),
    /outside the repository/
  );
  assert.equal(fs.existsSync(path.join(inside, 'private.json')), false);
});

test('canonical-equivalent prior receipts remain usable for bounded retests', (t) => {
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'modeltrace-prior-order-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const f = fixture({ failed: true });
  f.record.receipt = Object.fromEntries(Object.entries(f.record.receipt).reverse());
  const previous = path.join(directory, 'previous.json');
  const challenge = path.join(directory, 'challenge.json');
  const response = path.join(directory, 'response.json');
  fs.writeFileSync(previous, JSON.stringify(f.record));
  const next = createModelTraceChallenge(f.context, { now: NOW });
  fs.writeFileSync(challenge, JSON.stringify(next));
  fs.writeFileSync(
    response,
    JSON.stringify({ ...f.response, challengeDigest: computeModelTraceChallengeDigest(next) })
  );
  const record = runModelTraceCli(
    ['score', '--challenge', challenge, '--response', response, '--previous', previous],
    { now: NOW, stdout: { write() {} } }
  );
  assert.equal(record.receipt.priorReceiptDigest, f.record.receipt.id.slice(7));
  assert.equal(record.receipt.result.status, 'failed');
});
