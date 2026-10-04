import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
  { body = 'Synthetic offline publication fixture.\n', now = new Date(), failed = false } = {}
) {
  const directory = fs.mkdtempSync(path.join(tmpdir(), 'agent-publish-fixture-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const context = {
    schemaVersion: 1,
    kind: 'proto-ui.modeltrace-context',
    repositoryId: REPOSITORY,
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
    args: [...LAUNCH, '--repository', REPOSITORY, '--record', recordPath, '--context', contextPath],
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
  protectedBranch = false,
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
    user: { login: LOGIN },
    html_url: 'fixture://issue/7',
  };
  const runner = (binary, args, options) => {
    if (binary === 'git' && pull) {
      if (args[0] === 'config') return `https://github.com/${sourceOwner}/fixture-repository.git\n`;
      if (args[0] === 'symbolic-ref') return 'fixture-contributor-branch\n';
      if (args[0] === 'rev-parse') return `${'c'.repeat(40)}\n`;
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
          viewer: { login: LOGIN },
          repository: {
            nameWithOwner: 'fixture-owner/fixture-repository',
            viewerPermission: permission,
            isArchived: false,
            defaultBranchRef: { name: 'main' },
          },
        },
      });
    if (method !== 'GET') {
      writes.push({ method, endpoint, input });
      let published;
      if (method === 'PATCH')
        published = { ...target, ...input, updated_at: '2026-10-04T00:01:00Z' };
      else
        published = {
          id: 10,
          number: 10,
          node_id: 'I_created',
          ...input,
          user: { login: LOGIN },
          updated_at: '2026-10-04T00:01:00Z',
          html_url: 'fixture://publication/10',
          ...(pull ? { pull_request: { url: 'fixture://pull/10' } } : {}),
        };
      if (!unknown || applyUnknown) {
        if (endpoint.endsWith('/comments')) comments.push(published);
        else if (method === 'PATCH') Object.assign(target, published);
        else issues.push(published);
      }
      if (unknown) throw new Error('synthetic connection lost after possible server write');
      return JSON.stringify(published);
    }
    if (endpoint.includes('/issues/7/comments?')) return JSON.stringify([comments]);
    if (pull && endpoint.includes('/branches/'))
      return JSON.stringify({
        commit: { sha: endpoint.endsWith('/main') ? 'd'.repeat(40) : 'c'.repeat(40) },
        protected: protectedBranch,
      });
    if (pull && endpoint.includes('/compare/'))
      return JSON.stringify({
        total_commits: 1,
        commits: [
          {
            sha: 'c'.repeat(40),
            author: { login: foreignCommit ? 'another-contributor' : LOGIN },
            committer: { login: LOGIN },
          },
        ],
      });
    if (pull && endpoint.endsWith('/pulls/10'))
      return JSON.stringify({
        base: { ref: 'main' },
        head: {
          ref: 'fixture-contributor-branch',
          sha: 'c'.repeat(40),
          repo: { full_name: `${sourceOwner}/fixture-repository` },
        },
      });
    if (endpoint.includes('/issues/comments/10')) return JSON.stringify(comments[0]);
    if (endpoint.includes('/issues?')) return JSON.stringify([issues]);
    if (endpoint.endsWith('/issues/10')) return JSON.stringify(issues[0]);
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
  assert.equal(gh.writes[0].input.head, head);
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
    });
  git(['init', '--initial-branch=main']);
  git(['config', 'user.name', LOGIN]);
  git(['config', 'user.email', 'fixture@example.invalid']);
  git(['config', 'commit.gpgsign', 'false']);
  git(['config', 'core.hooksPath', '.git/hooks']);
  git(['remote', 'add', 'origin', 'https://github.com/fixture-owner/fixture-repository.git']);
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
  const messagePath = path.join(f.directory, 'message.txt');
  fs.writeFileSync(messagePath, 'feat: synthetic fixture contributor commit\n');
  const runner = (binary, args, options) => {
    assert.equal(
      binary,
      'git',
      'local commits must not require GitHub network or email privileges'
    );
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
  const result = runPublishCli(
    [
      'commit',
      ...f.args,
      '--message-file',
      messagePath,
      '--branch',
      'fixture-contributor-branch',
      '--expected-head',
      before,
    ],
    { runner, cwd: f.directory }
  );
  assert.equal(result.status, 'published');
  assert.notEqual(git(['rev-parse', 'HEAD']).trim(), before);
  const committed = git(['log', '-1', '--format=%B']);
  assert.ok(committed.includes(renderModelTraceDisclosure(f.record.receipt, 'commit')));
  assert.ok(committed.includes(`Signed-off-by: ${LOGIN} <fixture@example.invalid>`));
});
