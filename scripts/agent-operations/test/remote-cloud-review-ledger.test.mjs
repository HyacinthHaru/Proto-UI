import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LocalCloudReviewLedger, LOCAL_LEDGER_REF } from '../local-cloud-review-ledger.mjs';
import {
  RemoteCloudReviewLedger,
  REMOTE_LEDGER_REF,
  readOnlyGitLedgerTransport,
} from '../remote-cloud-review-ledger.mjs';
import { analysis } from './fixtures/cloud-review.mjs';

const git = (dir, ...args) =>
  execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim();
const event = (id = 'event-1', pr = 487) => ({
  type: 'enqueue',
  deliveryId: id,
  pullRequest: pr,
  eventKind: 'synchronize',
  materialDigest: id === 'event-1' ? 'a'.repeat(64) : 'b'.repeat(64),
});
function fixture(t) {
  const root = mkdtempSync(path.join(tmpdir(), 'pui-remote-state-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const remote = path.join(root, 'remote.git');
  mkdirSync(remote);
  git(remote, 'init', '--bare');
  const genesis = LocalCloudReviewLedger.initialize(remote);
  git(remote, 'update-ref', REMOTE_LEDGER_REF, genesis);
  let sequence = 0;
  const open = (checkpoint = genesis, overrides = {}) => {
    const dir = path.join(root, `cache-${sequence++}.git`);
    mkdirSync(dir);
    git(dir, 'init', '--bare');
    const calls = { reads: 0, writes: 0 };
    const transport = {
      readInto(directory) {
        calls.reads++;
        // This is a local filesystem fixture, not a GitHub test.
        git(directory, 'fetch', '--no-tags', '--no-write-fetch-head', remote, REMOTE_LEDGER_REF);
        return git(remote, 'rev-parse', REMOTE_LEDGER_REF);
      },
      publish({ directory, ref, expectedRevision, revision }) {
        calls.writes++;
        assert.equal(ref, REMOTE_LEDGER_REF);
        assert.equal(git(directory, 'show', '-s', '--format=%P', revision), expectedRevision);
        git(directory, 'push', '--porcelain', remote, `${revision}:${ref}`); // no force/lease override
        return { status: 'accepted' };
      },
    };
    const original = { ...transport };
    Object.assign(transport, overrides(original, calls));
    const ledger = new RemoteCloudReviewLedger(dir, genesis, { checkpoint, transport });
    return { ledger, calls, transport, directory: dir };
  };
  return {
    remote,
    genesis,
    open: (checkpoint, overrides = () => ({})) => open(checkpoint, overrides),
  };
}
const apply = (ledger, command) => ledger.apply(ledger.read().revision, command);

test('remote candidate round-trip persists baseline; fresh cache must supply checkpoint and cannot adopt owner', (t) => {
  const f = fixture(t);
  const a = f.open();
  assert.equal(apply(a.ledger, event()).status, 'applied');
  assert.equal(apply(a.ledger, { type: 'claim', pullRequest: 487 }).status, 'applied');
  const checkpoint = a.ledger.read().checkpoint;
  const restarted = f.open(checkpoint);
  assert.throws(() => apply(restarted.ledger, { type: 'abandon' }), /fresh or restarted/);
  assert.equal(apply(a.ledger, { type: 'finishAnalysis', ...analysis() }).status, 'applied');
  const reopened = f.open(a.ledger.read().checkpoint).ledger.read();
  assert.equal(reopened.state.analyses.length, 1);
  assert.equal(reopened.state.slot, null);
  assert.equal(reopened.publicationAllowed, false);
  assert.throws(
    () => new RemoteCloudReviewLedger(a.directory, f.genesis),
    /explicit trusted checkpoint/
  );
  assert.equal(typeof readOnlyGitLedgerTransport().publish, 'undefined');
});
test('a competing sibling wins remotely; loser stops and can only reconcile', (t) => {
  const f = fixture(t);
  const seed = f.open();
  apply(seed.ledger, event());
  const checkpoint = seed.ledger.read().checkpoint;
  const b = f.open(checkpoint);
  let bResult;
  const a = f.open(checkpoint, (original) => ({
    publish(args) {
      bResult = apply(b.ledger, { type: 'claim', pullRequest: 487 });
      return original.publish(args);
    },
  }));
  const result = apply(a.ledger, { type: 'claim', pullRequest: 487 });
  assert.equal(bResult.status, 'applied');
  assert.equal(result.status, 'unknown');
  assert.equal(a.calls.writes, 1);
  assert.equal(b.calls.writes, 1);
  assert.equal(a.ledger.read().revision, b.ledger.read().revision);
  assert.throws(() => apply(a.ledger, { type: 'claim', pullRequest: 487 }), /mutation is stopped/);
});
test('lost remote acknowledgement, accepted-but-stale readback and checkpoint rollback all fail closed', async (t) => {
  for (const [name, overrides] of [
    [
      'ack loss',
      (original) => ({
        publish(args) {
          original.publish(args);
          throw new Error('lost acknowledgement');
        },
      }),
    ],
    [
      'false acknowledgement',
      () => ({
        publish() {
          return { status: 'accepted' };
        },
      }),
    ],
  ])
    await t.test(name, (t) => {
      const f = fixture(t);
      const a = f.open(f.genesis, overrides);
      const result = apply(a.ledger, event());
      assert.equal(result.status, 'unknown');
      assert.throws(() => apply(a.ledger, event('retry')), /mutation is stopped/);
      assert.equal(a.ledger.read().publicationAllowed, false);
    });
  await t.test('rollback below externally supplied checkpoint', (t) => {
    const f = fixture(t);
    const a = f.open();
    apply(a.ledger, event());
    const checkpoint = a.ledger.read().checkpoint;
    git(f.remote, 'update-ref', REMOTE_LEDGER_REF, f.genesis); // hostile local fixture reset
    assert.throws(() => f.open(checkpoint), /reset or rewrite|not a valid|bad object/);
  });
});
test('no mutation provider means no local candidate, and missing remote never initializes', (t) => {
  const f = fixture(t);
  const a = f.open(f.genesis, () => ({ publish: undefined }));
  const before = a.ledger.read().revision;
  assert.throws(() => a.ledger.apply(before, event()), /writes are disabled/);
  assert.equal(git(a.directory, 'rev-parse', LOCAL_LEDGER_REF), before);
  git(f.remote, 'update-ref', '-d', REMOTE_LEDGER_REF); // local fixture only
  assert.throws(() => a.ledger.read());
});
test('remote unknown intent survives new cache and new queued PR without release', (t) => {
  const f = fixture(t);
  const a = f.open();
  apply(a.ledger, event());
  apply(a.ledger, { type: 'claim', pullRequest: 487 });
  apply(a.ledger, { type: 'stageIntent', ...analysis() });
  const b = f.open(a.ledger.read().checkpoint);
  apply(b.ledger, event('second', 488));
  const state = b.ledger.read().state;
  assert.equal(state.slot.intent.status, 'unknown');
  assert(state.pending.some((x) => x.pullRequest === 488));
  assert.throws(() => apply(b.ledger, { type: 'claim', pullRequest: 488 }), /global slot/);
  assert.throws(() => apply(a.ledger, { type: 'abandon' }), /unknown intent permanently/);
});

test('lost acknowledgement of simulated finalization preserves baseline and never repeats exchange', (t) => {
  const f = fixture(t);
  const a = f.open(f.genesis, (original) => ({
    publish(args) {
      const entry = JSON.parse(git(args.directory, 'show', `${args.revision}:entry.json`));
      const result = original.publish(args);
      if (entry.type === 'finalizeSimulation') throw new Error('finalizer acknowledgement lost');
      return result;
    },
  }));
  apply(a.ledger, event());
  apply(a.ledger, { type: 'claim', pullRequest: 487 });
  apply(a.ledger, { type: 'stageSimulationIntent', ...analysis() });
  const intent = a.ledger.read().state.slot.intent;
  a.ledger.consumeSimulationAttempt(intent.id);
  const receipt = {
    repositoryId: intent.repositoryId,
    pullRequest: intent.pullRequest,
    id: '81',
    authorId: intent.principalId,
    authorLogin: intent.principalLogin,
    commitId: intent.headSha,
    state: 'APPROVED',
    body: intent.body,
  };
  const result = apply(a.ledger, {
    type: 'finalizeSimulation',
    response: receipt,
    readback: receipt,
  });
  assert.equal(result.status, 'unknown');
  const state = a.ledger.read().state;
  assert.equal(state.slot, null);
  assert.equal(state.analyses[0].simulationReceipt.id, '81');
  const reopened = f.open(a.ledger.read().checkpoint).ledger;
  assert.equal(reopened.read().state.analyses[0].simulationReceipt.id, '81');
  assert.throws(() => reopened.consumeSimulationAttempt(intent.id), /fresh, stopped or restarted/);
  assert.throws(() => a.ledger.consumeSimulationAttempt(intent.id), /mutation is stopped/);
});
