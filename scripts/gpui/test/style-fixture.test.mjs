// Negative evidence for the style fixture gate: a stale fixture must fail the
// check, not merely be expected to. The check is run as the repository runs
// it, through its CLI, so the test cannot pass while the gate is broken.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SCRIPT = path.join(ROOT, 'scripts/gpui/generate-style-fixture.mts');
const FIXTURE = path.join(ROOT, 'native/gpui/fixtures/style-tokens.json');
const TSX = path.join(ROOT, 'node_modules/.bin/tsx');

function runCheck(fixture) {
  return spawnSync(TSX, [SCRIPT, '--check', '--fixture', fixture], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

test('the committed fixture is current', () => {
  const result = runCheck(FIXTURE);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /current: \d+ compiled/);
});

test('a stale fixture fails the check', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'proto-ui-style-fixture-'));
  const copy = path.join(dir, 'style-tokens.json');
  copyFileSync(FIXTURE, copy);
  assert.equal(runCheck(copy).status, 0, 'an untouched copy must still pass');

  // One declaration changed is enough: the check compares the whole file.
  const corrupted = JSON.parse(readFileSync(copy, 'utf8'));
  corrupted.tokens.flex = { display: 'block' };
  writeFileSync(copy, `${JSON.stringify(corrupted, null, 2)}\n`);

  const result = runCheck(copy);
  assert.notEqual(result.status, 0, 'a stale fixture must fail');
  assert.match(result.stderr, /is stale; run pnpm gpui:style-fixture/);
});

test('a missing fixture fails the check', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'proto-ui-style-fixture-'));
  const result = runCheck(path.join(dir, 'absent.json'));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing/);
});
