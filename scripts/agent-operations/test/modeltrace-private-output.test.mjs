import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runModelTraceCli } from '../modeltrace-cli.mjs';

test('write-time parent retarget is rejected when renamed to a checkout symlink after preflight', (t) => {
  const outside = fs.mkdtempSync(path.join(tmpdir(), 'modeltrace-retarget-'));
  const root = fileURLToPath(new URL('../../..', import.meta.url));
  const inside = fs.mkdtempSync(path.join(root, '.modeltrace-retarget-fixture-'));
  const parent = path.join(outside, 'parent');
  fs.mkdirSync(parent);
  t.after(() => {
    fs.rmSync(outside, { recursive: true, force: true });
    fs.rmSync(inside, { recursive: true, force: true });
  });

  const contextPath = path.join(outside, 'context.json');
  fs.writeFileSync(
    contextPath,
    JSON.stringify({
      schemaVersion: 1,
      kind: 'proto-ui.modeltrace-context',
      repositoryId: 'github.com:fixture/repository',
      sessionId: 'd'.repeat(64),
      contextDigest: 'a'.repeat(64),
      routeDigest: 'b'.repeat(64),
      declared: { systemModel: null, harnessModel: null },
    })
  );

  const outPath = path.join(parent, 'record.json');
  let retargeted = false;
  const originalOpenSync = fs.openSync;
  t.mock.method(fs, 'openSync', function (p, flags, ...rest) {
    if (!retargeted && p === contextPath) {
      fs.renameSync(parent, path.join(outside, 'parent.bak'));
      fs.symlinkSync(inside, parent);
      retargeted = true;
    }
    return originalOpenSync.call(this, p, flags, ...rest);
  });

  assert.throws(
    () =>
      runModelTraceCli(['challenge', '--context', contextPath, '--out', outPath], {
        now: new Date('2026-10-06T00:00:00.000Z'),
        stdout: { write() {} },
      }),
    /outside the repository/
  );
  assert.equal(retargeted, true, 'retarget injection must have fired between preflight and write');
  assert.equal(fs.existsSync(path.join(inside, 'record.json')), false);
});
