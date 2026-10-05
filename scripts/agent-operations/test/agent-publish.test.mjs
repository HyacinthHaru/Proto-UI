import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  parsePublishCli,
  PublicationUnknown,
  runCommitMessageHook,
  runPublishCli,
} from '../agent-publish.mjs';
import {
  buildModelTraceRecord,
  computeModelTraceChallengeDigest,
  createModelTraceChallenge,
  renderModelTraceDisclosure,
} from '../modeltrace.mjs';
import { ownerDelegationSigningBytes } from '../owner-authorization.mjs';

const REPOSITORY = 'github.com:fixture-owner/fixture-repository';
const LOGIN = 'fixture-contributor';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const PUBLISH_SCRIPT = fileURLToPath(new URL('../agent-publish.mjs', import.meta.url));
const HOOK_SCRIPT = fileURLToPath(new URL('../../../.husky/commit-msg', import.meta.url));
const LAUNCH = [
  '--mode',
  'human-assisted',
  '--mode-source',
  'current-user',
  '--authorization',
  'explicit-current-user',
];

function fixture(
  t,
  {
    body = 'Synthetic offline publication fixture.\n',
    now = new Date(),
    failed = false,
    repositoryId = REPOSITORY,
  } = {}
) {
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'agent-publish-fixture-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const context = {
    schemaVersion: 1,
    kind: 'proto-ui.modeltrace-context',
    repositoryId,
    sessionId: 'synthetic-test-session-not-an-agent-identity',
    contextDigest: 'a'.repeat(64),
    routeDigest: 'b'.repeat(64),
    declared: { systemModel: 'synthetic-fixture', harnessModel: 'synthetic-fixture' },
  };
  const challenge = createModelTraceChallenge(context, { now });
  // Intentionally generated deterministic SYNTHETIC samples test rendering and
  // validation only. They are not a fingerprint measurement of Main or a model.
  const response = {
    schemaVersion: 1,
    kind: 'proto-ui.modeltrace-response',
    challengeDigest: computeModelTraceChallengeDigest(challenge),
    startedAt: now.toISOString(),
    completedAt: now.toISOString(),
    method: 'active-model-literals',
    outputs: challenge.probes.map((probe, index) => ({
      id: probe.id,
      text: failed
        ? null
        : JSON.stringify(
            Array.from(
              { length: probe.count },
              (_, position) => ((position * 31 + index * 11) % 355) + 1
            )
          ),
      error: failed ? 'refused' : null,
    })),
  };
  const record = buildModelTraceRecord(challenge, response);
  const recordPath = path.join(directory, 'record.json');
  const contextPath = path.join(directory, 'context.json');
  const bodyPath = path.join(directory, 'body.txt');
  fs.writeFileSync(recordPath, JSON.stringify(record));
  fs.writeFileSync(contextPath, JSON.stringify(context));
  fs.writeFileSync(bodyPath, body);
  return {
    directory,
    now,
    record,
    recordPath,
    contextPath,
    bodyPath,
    body,
    args: [
      ...LAUNCH,
      '--repository',
      repositoryId,
      '--record',
      recordPath,
      '--context',
      contextPath,
    ],
    env: {
      ...process.env,
      PUI_AGENT: '1',
      PUI_MODELTRACE_RECORD: recordPath,
      PUI_MODELTRACE_CONTEXT: contextPath,
    },
  };
}

function server({
  unknown = false,
  applyUnknown = false,
  targetChanged = false,
  pull = false,
  foreignCommit = false,
  permission = 'WRITE',
  sourceOwner = 'fixture-owner',
  sourceName = null,
  liveSourceName = null,
  protectedBranch = false,
  repositoryId = REPOSITORY,
  login = LOGIN,
  revision = { headSha: 'c'.repeat(40), baseSha: 'd'.repeat(40) },
} = {}) {
  const comments = [];
  const issues = [];
  const writes = [];
  let targetReads = 0;
  const target = {
    id: 7,
    number: 7,
    node_id: 'I_fixture',
    body: 'Original body',
    state: 'closed',
    locked: false,
    updated_at: '2026-10-04T00:00:00Z',
    user: { login },
    html_url: 'fixture://issue/7',
  };
  const fullName = repositoryId.slice('github.com:'.length);
  const sourceFullName = `${sourceOwner}/${sourceName ?? fullName.split('/')[1]}`;
  const runner = (binary, args, options) => {
    if (binary === 'git' && pull) {
      if (args[0] === 'config') return `https://github.com/${sourceFullName}.git\n`;
      if (args[0] === 'symbolic-ref') return 'fixture-contributor-branch\n';
      if (args[0] === 'rev-parse') return `${revision.headSha}\n`;
      if (args[0] === 'check-ref-format') return '';
    }
    assert.equal(binary, 'gh');
    const endpoint =
      args.find((arg) => arg.startsWith('repos/')) ?? args.find((arg) => arg === 'graphql');
    const methodIndex = args.indexOf('--method');
    const method = methodIndex === -1 ? 'GET' : args[methodIndex + 1];
    const input = options.input ? JSON.parse(options.input) : null;
    if (endpoint === 'graphql')
      return JSON.stringify({
        data: {
          viewer: { login },
          repository: {
            nameWithOwner: fullName,
            viewerPermission: permission,
            isArchived: false,
            defaultBranchRef: { name: 'main' },
          },
        },
      });
    if (method !== 'GET') {
      if (pull && endpoint.endsWith('/pulls')) {
        const parts = input.head.split(':');
        const requestedOwner = parts.length === 2 ? parts[0] : fullName.split('/')[0];
        if (
          parts.length > 2 ||
          requestedOwner.toLowerCase() !== sourceOwner.toLowerCase() ||
          parts.at(-1) !== 'fixture-contributor-branch'
        )
          throw new Error('requested head branch is unavailable in the source repository');
      }
      if (
        pull &&
        endpoint.endsWith('/pulls') &&
        sourceFullName !== fullName &&
        (sourceOwner === fullName.split('/')[0] || input.head_repo !== undefined) &&
        input.head_repo !== sourceFullName.split('/')[1]
      )
        throw new Error('fork request must select its actual head repository');
      writes.push({ method, endpoint, input });
      const number = 10 + comments.length + issues.length;
      let published;
      if (method === 'PATCH')
        published = { ...target, ...input, updated_at: '2026-10-04T00:01:00Z' };
      else
        published = {
          id: number,
          number,
          node_id: 'I_created',
          ...input,
          user: { login },
          updated_at: '2026-10-04T00:01:00Z',
          html_url: `fixture://publication/${number}`,
          ...(pull
            ? {
                pull_request: { url: `fixture://pull/${number}` },
                base: { ref: 'main', sha: revision.baseSha },
                head: {
                  ref: 'fixture-contributor-branch',
                  sha: revision.headSha,
                  repo: { full_name: sourceFullName },
                },
              }
            : {}),
        };
      if (!unknown || applyUnknown) {
        if (endpoint.endsWith('/comments')) comments.push(published);
        else if (method === 'PATCH') Object.assign(target, published);
        else issues.push(published);
      }
      if (unknown) throw new Error('synthetic connection lost after possible server write');
      return JSON.stringify(
        pull && endpoint.endsWith('/pulls')
          ? { ...published, id: 100 + number, node_id: 'PR_created' }
          : published
      );
    }
    if (pull && endpoint === `repos/${sourceFullName}`)
      return JSON.stringify({ full_name: liveSourceName ?? sourceFullName });
    if (endpoint.includes('/issues/7/comments?')) return JSON.stringify(comments);
    if (pull && endpoint.includes('/branches/'))
      return JSON.stringify({
        commit: { sha: endpoint.endsWith('/main') ? revision.baseSha : revision.headSha },
        protected: protectedBranch,
      });
    if (pull && endpoint.includes('/compare/'))
      return JSON.stringify({
        total_commits: 1,
        commits: [
          {
            sha: revision.headSha,
            author: { login: foreignCommit ? 'another-contributor' : login },
            committer: { login },
          },
        ],
      });
    if (pull && /\/pulls\/\d+$/.test(endpoint)) {
      const item = issues.find((item) => item.number === Number(endpoint.split('/').at(-1)));
      return JSON.stringify({ ...item, id: 100 + item.number, node_id: 'PR_created' });
    }
    if (/\/issues\/comments\/\d+$/.test(endpoint))
      return JSON.stringify(
        comments.find((item) => item.id === Number(endpoint.split('/').at(-1)))
      );
    if (endpoint.includes('/issues?')) return JSON.stringify(issues);
    if (/\/issues\/\d+$/.test(endpoint) && !endpoint.endsWith('/issues/7'))
      return JSON.stringify(
        issues.find((item) => item.number === Number(endpoint.split('/').at(-1)))
      );
    if (endpoint.endsWith('/issues/7')) {
      targetReads++;
      return JSON.stringify(
        targetChanged && targetReads > 1
          ? { ...target, body: 'Concurrent edit', updated_at: '2026-10-04T00:02:00Z' }
          : target
      );
    }
    throw new Error(`unexpected fixture endpoint: ${endpoint}`);
  };
  return { runner, writes, comments, issues, target };
}

function ownerFixture(f, { scopeIds = ['*'], actions = ['implement', 'collaborate'] } = {}) {
  // This disposable signer is a synthetic trust anchor, never a production grant.
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const statePath = path.join(f.directory, 'owner-state.json');
  const keyPath = path.join(f.directory, 'owner.pub');
  fs.writeFileSync(keyPath, publicKey.export({ type: 'spki', format: 'pem' }));
  const grant = {
    id: 'synthetic-publisher-owner',
    generation: 1,
    status: 'active',
    grantor: { login: 'cyjin-yl', id: 19223209 },
    actor: 'cyjin-yl',
    repositoryId: 'github.com:Proto-UI/Proto-UI',
    actions,
    scopeIds,
    baseRefName: 'main',
    decisionReference: 'fixture:synthetic-owner-decision',
  };
  const save = (current = grant, revision = 1) => {
    const payload = {
      schemaVersion: 1,
      kind: 'proto-ui.owner-delegation-state',
      revision,
      grants: [current],
    };
    fs.writeFileSync(
      statePath,
      JSON.stringify({
        payload,
        signature: sign(null, ownerDelegationSigningBytes(payload), privateKey).toString('base64'),
      })
    );
  };
  save();
  return {
    grant,
    save,
    args: [
      '--mode',
      'autonomous',
      '--mode-source',
      'schedule',
      '--authorization',
      grant.id,
      '--owner-authorization',
      statePath,
      '--owner-key',
      keyPath,
      '--owner-grant',
      grant.id,
      ...f.args.slice(LAUNCH.length),
    ],
  };
}

function localRepository(f) {
  const git = (args) =>
    execFileSync('git', args, {
      cwd: f.directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        PUI_AGENT: '0',
        GIT_AUTHOR_NAME: LOGIN,
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: LOGIN,
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  git(['init', '--initial-branch=main']);
  git(['config', 'user.name', LOGIN]);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', '.git/hooks']);
  const repositoryId = f.args[f.args.indexOf('--repository') + 1];
  git([
    'remote',
    'add',
    'origin',
    `https://github.com/${repositoryId.slice('github.com:'.length)}.git`,
  ]);
  fs.writeFileSync(path.join(f.directory, 'initial.txt'), 'Synthetic repository fixture\n');
  git(['add', 'initial.txt']);
  git(['commit', '-m', 'Synthetic fixture baseline']);
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  git(['checkout', '-b', 'fixture-contributor-branch']);
  const before = git(['rev-parse', 'HEAD']).trim();
  fs.writeFileSync(
    path.join(f.directory, '.git/hooks/commit-msg'),
    `#!/bin/sh\nexec "${process.execPath}" "${PUBLISH_SCRIPT}" check-commit-message --message-file "$1"\n`,
    { mode: 0o700 }
  );
  fs.writeFileSync(path.join(f.directory, 'change.txt'), 'Synthetic contributor change\n');
  git(['add', 'change.txt']);
  const tree = git(['write-tree']).trim();
  const messagePath = path.join(f.directory, 'message.txt');
  fs.writeFileSync(messagePath, 'feat: synthetic fixture contributor commit\n');
  const runner = (binary, args, options) => {
    assert.equal(binary, 'git', 'local commits must not acquire GitHub network privileges');
    return execFileSync(binary, args, {
      ...options,
      env: {
        ...(options.env ?? process.env),
        GIT_AUTHOR_NAME: LOGIN,
        GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
        GIT_COMMITTER_NAME: LOGIN,
        GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      },
    });
  };
  return {
    git,
    before,
    tree,
    runner,
    args: [
      '--message-file',
      messagePath,
      '--branch',
      'fixture-contributor-branch',
      '--expected-head',
      before,
      '--expected-tree',
      tree,
    ],
  };
}

for (const declaration of ['--record', '--context', '--mode', '--mode-source', '--authorization']) {
  test(`rejects missing ${declaration} before mutation`, (t) => {
    const f = fixture(t);
    const argv = ['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath];
    const index = argv.indexOf(declaration);
    argv.splice(index, 2);
    let calls = 0;
    assert.throws(
      () =>
        runPublishCli(argv, {
          runner() {
            calls++;
            throw new Error('unexpected IO');
          },
        }),
      /required/
    );
    assert.equal(calls, 0);
  });
}

test('strict options and independent authorization cannot be supplied by an artifact', (t) => {
  const f = fixture(t);
  const argv = ['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath];
  assert.throws(() => parsePublishCli([...argv, '--labels', 'feature']), /unexpected option/);
  assert.throws(() => parsePublishCli([...argv, '--record', f.recordPath]), /duplicate option/);
  assert.throws(
    () =>
      parsePublishCli(
        argv.map((arg) => (arg === 'explicit-current-user' ? 'standing-maintainer-scope' : arg))
      ),
    /standing scopes/
  );
  assert.throws(
    () =>
      parsePublishCli(
        argv
          .map((arg) => (arg === 'human-assisted' ? 'autonomous' : arg))
          .map((arg) => (arg === 'current-user' ? 'schedule' : arg))
      ),
    /autonomous execution/
  );
});

test('missing and expired records are rejected before even a live permission read', (t) => {
  const f = fixture(t, { failed: true });
  const argv = ['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath];
  let calls = 0;
  const runner = () => {
    calls++;
    throw new Error('unexpected IO');
  };
  assert.throws(
    () => runPublishCli(argv, { runner, now: new Date(f.record.receipt.expiresAt) }),
    /expired/
  );
  fs.rmSync(f.recordPath);
  assert.throws(() => runPublishCli(argv, { runner }), /ENOENT/);
  assert.equal(calls, 0);
});

test('publishes full-length evidence to a historical CLOSED Issue with a synthetic receipt and exact readback', (t) => {
  const f = fixture(t, {
    body: `Synthetic long evidence\n${'subject evidence '.repeat(3200)}\n\n`,
  });
  const gh = server();
  const argv = ['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath];
  const result = runPublishCli(argv, { runner: gh.runner, now: f.now });
  assert.equal(result.status, 'published');
  assert.equal(gh.writes.length, 1);
  assert.equal(gh.comments[0].body.slice(0, f.body.length), f.body);
  assert.ok(gh.comments[0].body.includes(renderModelTraceDisclosure(f.record.receipt)));
  assert.ok(!gh.comments[0].body.includes('synthetic-test-session-not-an-agent-identity'));
  assert.equal(gh.target.state, 'closed');
  assert.equal(runPublishCli(argv, { runner: gh.runner, now: f.now }).status, 'already-published');
  assert.equal(gh.writes.length, 1);
});

test('Issue create sends one full body and never mutates labels or ownership state', (t) => {
  const f = fixture(t, { failed: true });
  const gh = server();
  const result = runPublishCli(
    ['issue', 'create', ...f.args, '--title', 'Synthetic offline issue', '--body-file', f.bodyPath],
    { runner: gh.runner, now: f.now }
  );
  assert.equal(result.status, 'published');
  assert.deepEqual(Object.keys(gh.writes[0].input).sort(), ['body', 'title']);
  assert.ok(gh.issues[0].body.includes(renderModelTraceDisclosure(f.record.receipt)));
  assert.equal(f.record.receipt.result.modelId, null);
});

test('a later compact JSON page preserves multiline evidence and prevents duplicate publication', (t) => {
  const f = fixture(t, {
    failed: true,
    body: 'Synthetic evidence line one.\nLine two remains intact.\n',
  });
  const gh = server();
  const argv = ['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath];
  assert.equal(runPublishCli(argv, { runner: gh.runner, now: f.now }).status, 'published');
  const runner = (binary, args, options) => {
    if (args.some((arg) => arg.includes('/issues/7/comments?'))) {
      return `${JSON.stringify([{ id: 99, body: 'Unrelated earlier page' }])}\n${JSON.stringify(gh.comments)}\n`;
    }
    return gh.runner(binary, args, options);
  };
  assert.equal(runPublishCli(argv, { runner, now: f.now }).status, 'already-published');
  assert.ok(gh.comments[0].body.startsWith(f.body));
  assert.equal(gh.writes.length, 1);
});

test('missing pagination frames are not an empty collection and cannot authorize a duplicate write', (t) => {
  const f = fixture(t, { failed: true });
  const gh = server();
  const runner = (binary, args, options) =>
    args.some((arg) => arg.includes('/issues/7/comments?'))
      ? ' \n\t'
      : gh.runner(binary, args, options);
  assert.throws(
    () =>
      runPublishCli(['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath], {
        runner,
        now: f.now,
      }),
    /page evidence/
  );
  assert.equal(gh.writes.length, 0);
});

test('PR creation preserves authorized collaborative history at the exact pushed source', (t) => {
  const f = fixture(t, { failed: true });
  const gh = server({ pull: true, foreignCommit: true });
  const argv = [
    'pull-request',
    'create',
    ...f.args,
    '--title',
    'Synthetic offline PR',
    '--body-file',
    f.bodyPath,
    '--base',
    'main',
    '--head',
    'fixture-contributor-branch',
  ];
  assert.equal(runPublishCli(argv, { runner: gh.runner, now: f.now }).status, 'published');
  assert.ok(gh.issues[0].body.includes(renderModelTraceDisclosure(f.record.receipt)));
  assert.equal(gh.writes.length, 1);
  assert.equal(gh.writes[0].input.head, 'fixture-contributor-branch');
  assert.equal(gh.writes[0].input.base, 'main');
});

test('a public READ contributor can propose the exact fork head without rewriting protected collaborative history', (t) => {
  const f = fixture(t, { failed: true });
  const gh = server({
    pull: true,
    permission: 'READ',
    sourceOwner: LOGIN,
    protectedBranch: true,
    foreignCommit: true,
  });
  const head = `${LOGIN}:fixture-contributor-branch`;
  const result = runPublishCli(
    [
      'pull-request',
      'create',
      ...f.args,
      '--title',
      'Synthetic fork PR',
      '--body-file',
      f.bodyPath,
      '--base',
      'main',
      '--head',
      head,
    ],
    { runner: gh.runner, now: f.now }
  );
  assert.equal(result.status, 'published');
  assert.equal(gh.writes.length, 1);
});

for (const sourceOwner of [LOGIN, 'fixture-owner']) {
  test(`renamed ${sourceOwner} fork publishes once and reconciles its actual source repository`, (t) => {
    const f = fixture(t, { failed: true });
    const gh = server({ pull: true, sourceOwner, sourceName: 'renamed-fork' });
    const argv = [
      'pull-request',
      'create',
      ...f.args,
      '--title',
      'Synthetic renamed fork',
      '--body-file',
      f.bodyPath,
      '--base',
      'main',
      '--head',
      `${sourceOwner}:fixture-contributor-branch`,
    ];
    const published = runPublishCli(argv, { runner: gh.runner, now: f.now });
    assert.equal(published.status, 'published');
    const repeated = runPublishCli(argv, { runner: gh.runner, now: f.now });
    assert.equal(repeated.status, 'already-published');
    assert.equal(repeated.url, published.url);
    assert.equal(gh.writes.length, 1);
  });
}

test('fork creation rejects a changed live source identity before publication', (t) => {
  const f = fixture(t, { failed: true });
  const gh = server({
    pull: true,
    sourceOwner: LOGIN,
    sourceName: 'renamed-fork',
    liveSourceName: `${LOGIN}/different-repository`,
  });
  assert.throws(
    () =>
      runPublishCli(
        [
          'pull-request',
          'create',
          ...f.args,
          '--title',
          'Synthetic renamed fork',
          '--body-file',
          f.bodyPath,
          '--base',
          'main',
          '--head',
          `${LOGIN}:fixture-contributor-branch`,
        ],
        { runner: gh.runner, now: f.now }
      ),
    /source repository differs/
  );
  assert.equal(gh.writes.length, 0);
});

test('already disclosed approved evidence is published byte-for-byte without another marker', (t) => {
  const f = fixture(t, { failed: true });
  const approvedBody = `Synthetic approved evidence.  \n\n${renderModelTraceDisclosure(f.record.receipt)}\n\n<!-- approved-evidence:fixture -->\n`;
  fs.writeFileSync(f.bodyPath, approvedBody);
  const gh = server({ permission: 'READ' });
  const result = runPublishCli(['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath], {
    runner: gh.runner,
    now: f.now,
  });
  assert.equal(result.status, 'published');
  assert.equal(gh.comments[0].body, approvedBody);
  assert.equal(sha256(gh.comments[0].body), sha256(approvedBody));
});

test('prepared non-rendered or comment-corrupted receipts cannot reach a GitHub mutation', (t) => {
  const f = fixture(t, { failed: true });
  const disclosure = renderModelTraceDisclosure(f.record.receipt);
  for (const invalid of [
    `<?\n${disclosure}\n?>`,
    disclosure.replace('"result"', '"res<!--x-->ult"'),
    `<div>\n<!--\n</div>\n\n${disclosure}\n-->`,
    `<hr>\n<!--\n\n${disclosure}\n-->`,
    `<p>\n<!--\n</p>\n\n${disclosure}\n-->`,
  ]) {
    fs.writeFileSync(f.bodyPath, invalid);
    const gh = server();
    assert.throws(
      () =>
        runPublishCli(['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath], {
          runner: gh.runner,
          now: f.now,
        }),
      /visible.*exact/
    );
    assert.equal(gh.writes.length, 0);
  }
});

for (const applied of [false, true]) {
  test(`lost acknowledgement remains unattributable ${applied ? 'with an exact observed publication' : 'without an observed publication'}`, (t) => {
    const f = fixture(t, { failed: true });
    const gh = server({ unknown: true, applyUnknown: applied });
    const argv = ['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath];
    assert.throws(() => runPublishCli(argv, { runner: gh.runner, now: f.now }), PublicationUnknown);
    if (applied)
      assert.equal(
        runPublishCli(argv, { runner: gh.runner, now: f.now }).status,
        'already-published'
      );
    assert.equal(gh.writes.length, 1);
  });
}

test('truncated or altered acknowledged body is unknown, not compensated with another comment', (t) => {
  const f = fixture(t, { failed: true });
  const gh = server();
  const runner = (binary, args, options) => {
    const result = gh.runner(binary, args, options);
    if (gh.writes.length && gh.comments.length)
      gh.comments[0].body = gh.comments[0].body.replace('Synthetic offline', 'Tampered');
    return result;
  };
  assert.throws(
    () =>
      runPublishCli(['comment', ...f.args, '--number', '7', '--body-file', f.bodyPath], {
        runner,
        now: f.now,
      }),
    PublicationUnknown
  );
  assert.equal(gh.writes.length, 1);
});

for (const changed of [false, true]) {
  test(`body replacement ${changed ? 'rejects a concurrent target edit' : 'changes only owned exact target body'}`, (t) => {
    const f = fixture(t, { failed: true });
    const gh = server({ targetChanged: changed });
    const argv = [
      'update-body',
      ...f.args,
      '--number',
      '7',
      '--body-file',
      f.bodyPath,
      '--target-updated-at',
      gh.target.updated_at,
      '--target-body-digest',
      sha256(gh.target.body),
    ];
    if (changed)
      assert.throws(
        () => runPublishCli(argv, { runner: gh.runner, now: f.now }),
        /changed before write/
      );
    else {
      assert.equal(runPublishCli(argv, { runner: gh.runner, now: f.now }).status, 'published');
      assert.deepEqual(Object.keys(gh.writes[0].input), ['body']);
      assert.equal(gh.target.state, 'closed');
    }
    assert.equal(gh.writes.length, changed ? 0 : 1);
  });
}

test('body replacement rejects stale prepared bindings and another author without compensation', (t) => {
  const f = fixture(t, { failed: true });
  const gh = server();
  const argv = [
    'update-body',
    ...f.args,
    '--number',
    '7',
    '--body-file',
    f.bodyPath,
    '--target-updated-at',
    gh.target.updated_at,
    '--target-body-digest',
    sha256('Not the current body'),
  ];
  assert.throws(
    () => runPublishCli(argv, { runner: gh.runner, now: f.now }),
    /exact current target/
  );
  gh.target.user.login = 'another-contributor';
  assert.throws(() => runPublishCli(argv, { runner: gh.runner, now: f.now }), /credential-owned/);
  assert.equal(gh.writes.length, 0);
});

test('hook exempts human commits and rejects missing or expired Agent disclosures independently', (t) => {
  assert.deepEqual(runCommitMessageHook('/does-not-exist', { env: {} }), {
    status: 'human-exempt',
  });
  const human = spawnSync('sh', [HOOK_SCRIPT, '/does-not-exist'], {
    env: { ...process.env, PUI_AGENT: '0' },
    encoding: 'utf8',
  });
  assert.equal(human.status, 0);
  assert.throws(
    () => runCommitMessageHook('/does-not-exist', { env: { PUI_AGENT: '1' } }),
    /requires PUI_MODELTRACE_RECORD/
  );
  const f = fixture(t, { failed: true });
  const messagePath = path.join(f.directory, 'message.txt');
  const message = `Synthetic commit\n\n${renderModelTraceDisclosure(f.record.receipt, 'commit')}\n`;
  fs.writeFileSync(messagePath, message);
  const runner = () => 'https://github.com/fixture-owner/fixture-repository.git\n';
  assert.equal(
    runCommitMessageHook(messagePath, { env: f.env, runner, now: f.now }).status,
    'validated'
  );
  assert.throws(
    () =>
      runCommitMessageHook(messagePath, {
        env: f.env,
        runner,
        now: new Date(f.record.receipt.expiresAt),
      }),
    /expired/
  );
  fs.writeFileSync(
    messagePath,
    message.replace('Synthetic commit', 'Synthetic commit\nModelTrace: forged')
  );
  assert.throws(
    () => runCommitMessageHook(messagePath, { env: f.env, runner, now: f.now }),
    /exactly one/
  );
  fs.writeFileSync(messagePath, message.trimEnd() + ' forged suffix\n');
  assert.throws(
    () => runCommitMessageHook(messagePath, { env: f.env, runner, now: f.now }),
    /exact current disclosure/
  );
  fs.writeFileSync(messagePath, 'Synthetic commit without identity\n');
  assert.throws(
    () => runCommitMessageHook(messagePath, { env: f.env, runner, now: f.now }),
    /exactly one/
  );
});

test('contributor commit executes git signoff and the independent installed hook in a throwaway repository', (t) => {
  const f = fixture(t, { failed: true });
  const { git, before, runner, args } = localRepository(f);
  const result = runPublishCli(['commit', ...f.args, ...args], { runner, cwd: f.directory });
  assert.equal(result.status, 'published');
  assert.notEqual(git(['rev-parse', 'HEAD']).trim(), before);
  const committed = git(['log', '-1', '--format=%B']);
  assert.ok(committed.includes(renderModelTraceDisclosure(f.record.receipt, 'commit')));
  assert.ok(committed.includes(`Signed-off-by: ${LOGIN} <fixture@example.invalid>`));
});

test('signed owner delegation reaches commit PR creation and exact Issue comment publishers', (t) => {
  const repositoryId = 'github.com:Proto-UI/Proto-UI';
  const f = fixture(t, { failed: true, repositoryId });
  const owner = ownerFixture(f);
  const local = localRepository(f);
  const committed = runPublishCli(['commit', ...owner.args, ...local.args], {
    runner: local.runner,
    cwd: f.directory,
    now: f.now,
  });
  assert.equal(committed.status, 'published');
  assert.equal(local.git(['rev-parse', 'HEAD^{tree}']).trim(), local.tree);
  const gh = server({ repositoryId, login: 'cyjin-yl', sourceOwner: 'Proto-UI', pull: true });
  const pull = runPublishCli(
    [
      'pull-request',
      'create',
      ...owner.args,
      '--title',
      'Synthetic delegated PR',
      '--body-file',
      f.bodyPath,
      '--base',
      'main',
      '--head',
      'fixture-contributor-branch',
    ],
    { runner: gh.runner, now: f.now }
  );
  assert.equal(pull.status, 'published');
  const comments = server({ repositoryId, login: 'cyjin-yl' });
  const scoped = ownerFixture(f, { scopeIds: ['issue:7'], actions: ['collaborate'] });
  const comment = runPublishCli(
    ['comment', ...scoped.args, '--number', '7', '--body-file', f.bodyPath],
    { runner: comments.runner, now: f.now }
  );
  assert.equal(comment.status, 'published');
  assert.equal(
    comments.comments[0].body.split(renderModelTraceDisclosure(f.record.receipt)).length,
    2
  );
  assert.equal(gh.writes.length, 1);
  assert.equal(comments.writes.length, 1);
});

test('publisher owner grants cannot cross exact target kind actor or action', (t) => {
  const repositoryId = 'github.com:Proto-UI/Proto-UI';
  for (const boundary of ['target-kind', 'actor', 'action']) {
    const f = fixture(t, { failed: true, repositoryId });
    const owner = ownerFixture(f, {
      scopeIds: ['issue:7'],
      actions: boundary === 'action' ? ['implement'] : ['collaborate'],
    });
    const gh = server({ repositoryId, login: boundary === 'actor' ? LOGIN : 'cyjin-yl' });
    if (boundary === 'target-kind') gh.target.pull_request = { url: 'fixture://pull/7' };
    assert.throws(
      () =>
        runPublishCli(['comment', ...owner.args, '--number', '7', '--body-file', f.bodyPath], {
          runner: gh.runner,
          now: f.now,
        }),
      Error
    );
    assert.equal(gh.writes.length, 0, boundary);
    assert.equal(gh.target.body, 'Original body');
  }
});

test('signed revocation after live preflight prevents the final publisher mutation', (t) => {
  const repositoryId = 'github.com:Proto-UI/Proto-UI';
  const f = fixture(t, { failed: true, repositoryId });
  const owner = ownerFixture(f, { scopeIds: ['issue:7'], actions: ['collaborate'] });
  const gh = server({ repositoryId, login: 'cyjin-yl' });
  let viewerReads = 0;
  const runner = (binary, args, options) => {
    if (args.includes('graphql') && ++viewerReads === 2)
      owner.save({ ...owner.grant, generation: 2, status: 'revoked' }, 2);
    return gh.runner(binary, args, options);
  };
  assert.throws(
    () =>
      runPublishCli(['comment', ...owner.args, '--number', '7', '--body-file', f.bodyPath], {
        runner,
        now: f.now,
      }),
    Error
  );
  assert.equal(viewerReads, 2);
  assert.equal(gh.writes.length, 0);
});

test('a commit rejects staged work outside the authorized tree without consuming the index', (t) => {
  const f = fixture(t, { failed: true });
  const local = localRepository(f);
  fs.writeFileSync(path.join(f.directory, 'user.txt'), 'Unrelated synthetic user work\n');
  local.git(['add', 'user.txt']);
  const staged = local.git(['diff', '--cached', '--name-only']);
  assert.throws(
    () =>
      runPublishCli(['commit', ...f.args, ...local.args], {
        runner: local.runner,
        cwd: f.directory,
        now: f.now,
      }),
    Error
  );
  assert.equal(local.git(['rev-parse', 'HEAD']).trim(), local.before);
  assert.equal(local.git(['diff', '--cached', '--name-only']), staged);
});

test('a commit rechecks index changes during preparation before writing HEAD', (t) => {
  const f = fixture(t, { failed: true });
  const local = localRepository(f);
  let treesRead = 0;
  const runner = (binary, args, options) => {
    if (args[0] === 'write-tree' && ++treesRead === 2) {
      fs.writeFileSync(path.join(f.directory, 'user.txt'), 'Concurrent staged fixture\n');
      local.git(['add', 'user.txt']);
    }
    return local.runner(binary, args, options);
  };
  assert.throws(
    () =>
      runPublishCli(['commit', ...f.args, ...local.args], {
        runner,
        cwd: f.directory,
        now: f.now,
      }),
    Error
  );
  assert.equal(local.git(['rev-parse', 'HEAD']).trim(), local.before);
  assert.equal(local.git(['diff', '--cached', '--name-only']), 'change.txt\nuser.txt\n');
});

test('late shared-index user staging stays staged and cannot enter the authorized commit', (t) => {
  const f = fixture(t, { failed: true });
  const local = localRepository(f);
  const runner = (binary, args, options) => {
    if (args[0] === 'commit') {
      fs.writeFileSync(path.join(f.directory, 'user.txt'), 'Late synthetic user staging\n');
      local.git(['add', 'user.txt']);
    }
    return local.runner(binary, args, options);
  };
  const result = runPublishCli(['commit', ...f.args, ...local.args], {
    runner,
    cwd: f.directory,
    now: f.now,
  });
  assert.equal(result.status, 'published');
  assert.equal(local.git(['rev-parse', 'HEAD^{tree}']).trim(), local.tree);
  assert.equal(
    local.git(['diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD']),
    'change.txt\n'
  );
  assert.equal(local.git(['diff', '--cached', '--name-only']), 'user.txt\n');
  assert.equal(
    fs.readFileSync(path.join(f.directory, 'user.txt'), 'utf8'),
    'Late synthetic user staging\n'
  );
});

test('reused branch publication binds both exact revisions and keeps each closed PR idempotent', (t) => {
  const f = fixture(t, { failed: true });
  const revision = { headSha: 'c'.repeat(40), baseSha: 'd'.repeat(40) };
  const gh = server({ pull: true, revision });
  const argv = [
    'pull-request',
    'create',
    ...f.args,
    '--title',
    'Synthetic reused contributor branch',
    '--body-file',
    f.bodyPath,
    '--base',
    'main',
    '--head',
    'fixture-contributor-branch',
  ];
  const first = runPublishCli(argv, { runner: gh.runner, now: f.now });
  gh.issues[0].state = 'closed';
  revision.headSha = 'e'.repeat(40);
  const second = runPublishCli(argv, { runner: gh.runner, now: f.now });
  assert.equal(second.status, 'published');
  assert.notEqual(second.url, first.url);
  assert.equal(runPublishCli(argv, { runner: gh.runner, now: f.now }).status, 'already-published');
  assert.equal(gh.writes.length, 2);
  gh.issues[1].state = 'closed';
  revision.baseSha = 'f'.repeat(40);
  const third = runPublishCli(argv, { runner: gh.runner, now: f.now });
  assert.equal(third.status, 'published');
  assert.notEqual(third.url, second.url);
  assert.equal(runPublishCli(argv, { runner: gh.runner, now: f.now }).status, 'already-published');
  assert.equal(gh.writes.length, 3);
});

test('revision idempotency also preserves an already approved PR body byte-for-byte', (t) => {
  const f = fixture(t, { failed: true });
  const prepared = `${f.body}\n${renderModelTraceDisclosure(f.record.receipt)}\n`;
  fs.writeFileSync(f.bodyPath, prepared);
  const revision = { headSha: 'c'.repeat(40), baseSha: 'd'.repeat(40) };
  const gh = server({ pull: true, revision });
  const argv = [
    'pull-request',
    'create',
    ...f.args,
    '--title',
    'Synthetic immutable prepared PR',
    '--body-file',
    f.bodyPath,
    '--base',
    'main',
    '--head',
    'fixture-contributor-branch',
  ];
  const first = runPublishCli(argv, { runner: gh.runner, now: f.now });
  gh.issues[0].state = 'closed';
  revision.headSha = 'e'.repeat(40);
  const second = runPublishCli(argv, { runner: gh.runner, now: f.now });
  assert.equal(second.status, 'published');
  assert.notEqual(second.url, first.url);
  assert.equal(runPublishCli(argv, { runner: gh.runner, now: f.now }).status, 'already-published');
  assert.equal(gh.writes.length, 2);
  for (const issue of gh.issues) assert.equal(issue.body, prepared);
});
