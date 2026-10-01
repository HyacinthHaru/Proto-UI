import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const workflow = await readFile(
  new URL('../.github/workflows/poppy-preview-security.yml', import.meta.url),
  'utf8'
);
const script = workflow
  .match(
    /cat > "\$RUNNER_TEMP\/verify-dcbot-contract\.mjs" <<'SCRIPT'\n([\s\S]*?)\n          SCRIPT/
  )[1]
  .split('\n')
  .map((line) => line.replace(/^          /, ''))
  .join('\n');
const contractPath = 'integrations/proto-ui-preview/contracts/dcbot-preview-handler-v1.json';
const revision = '3f60a2b41832a0b02e64a0f4b8bf237355b59806';

async function fixture(t, variant) {
  const root = await mkdtemp(path.join(tmpdir(), 'poppy-contract-blob-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const head = path.join(root, 'head');
  const handler = path.join(root, 'handler');
  await mkdir(path.join(head, path.dirname(contractPath)), { recursive: true });
  await mkdir(path.join(handler, 'internal/preview'), { recursive: true });
  const source = 'pinned handler fixture';
  await writeFile(path.join(handler, 'internal/preview/server.go'), source);
  const contract = JSON.stringify({
    repository: 'Proto-UI/dcbot',
    revision,
    sourceDigests: {
      'internal/preview/server.go': `sha256:${createHash('sha256').update(source).digest('hex')}`,
    },
  });
  const target = path.join(head, contractPath);
  const secret = path.join(root, 'private.json');
  await writeFile(secret, JSON.stringify({ repository: 'PRIVATE_CANARY_MUST_NOT_BE_READ' }));
  if (variant === 'absolute-symlink') await symlink(secret, target);
  else if (variant === 'relative-symlink')
    await symlink(path.relative(path.dirname(target), secret), target);
  else if (variant === 'parent-symlink') {
    const outside = path.join(root, 'private-contracts');
    await mkdir(outside);
    await writeFile(path.join(outside, path.basename(target)), await readFile(secret));
    await rm(path.dirname(target), { recursive: true });
    await symlink(outside, path.dirname(target));
  } else if (variant.startsWith('unicode-')) {
    const unicode = JSON.parse(contract);
    unicode.padding = '界'.repeat(20_000);
    const bytes = JSON.stringify(unicode);
    const padding = 64 * 1024 - Buffer.byteLength(bytes) + (variant === 'unicode-overflow' ? 1 : 0);
    await writeFile(target, bytes + ' '.repeat(padding));
  } else await writeFile(target, variant === 'oversize' ? ' '.repeat(64 * 1024 + 1) : contract);
  execFileSync('git', ['init', '-q', head]);
  execFileSync('git', ['-C', head, 'add', '.']);
  execFileSync('git', [
    '-C',
    head,
    '-c',
    'user.name=Test Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'fixture',
  ]);
  const verifier = path.join(root, 'verify.mjs');
  await writeFile(verifier, script);
  return spawnSync(process.execPath, [verifier], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PR_HEAD_ROOT: head,
      PR_HEAD_CONTRACT: target,
      DCBOT_CONTRACT_ROOT: handler,
      PINNED_DCBOT_REPOSITORY: 'Proto-UI/dcbot',
      PINNED_DCBOT_REVISION: revision,
    },
  });
}

test('trusted inline verifier accepts only the bounded exact-head regular Git blob', async (t) => {
  const result = await fixture(t, 'regular');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /verified 1 pinned dcbot source digests/);
});

for (const variant of ['absolute-symlink', 'relative-symlink', 'parent-symlink']) {
  test(`trusted inline verifier rejects ${variant} without reading the private target`, async (t) => {
    const result = await fixture(t, variant);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /contract must be a regular Git blob/);
    assert.doesNotMatch(result.stderr + result.stdout, /PRIVATE_CANARY_MUST_NOT_BE_READ/);
  });
}

test('trusted inline verifier accepts Unicode data at the exact byte bound', async (t) => {
  const result = await fixture(t, 'unicode-boundary');
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /verified 1 pinned dcbot source digests/);
});

for (const variant of ['oversize', 'unicode-overflow']) {
  test(`trusted inline verifier rejects ${variant} before reading or parsing`, async (t) => {
    const result = await fixture(t, variant);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /contract exceeds the trusted 64 KiB data bound/);
  });
}
