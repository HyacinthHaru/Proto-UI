import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertNoTruncation,
  buildLiveReviewInput,
  normalizeCheck,
  summarizeLiveChecks,
} from '../collect-live-review-input.mjs';

const sha = (letter) => letter.repeat(40);
const changedFiles = [
  { filename: 'packages/core/src/index.ts', previous_filename: null, status: 'modified' },
  {
    filename: 'internal/records/moved.md',
    previous_filename: 'spec/decisions/D-OLD-0001.yaml',
    status: 'renamed',
  },
];

function payload(overrides = {}) {
  return {
    data: {
      viewer: { login: 'reviewer' },
      repository: {
        viewerPermission: 'WRITE',
        pullRequest: {
          state: 'OPEN',
          isDraft: false,
          changedFiles: changedFiles.length,
          body: 'Bounded target',
          baseRefOid: sha('a'),
          headRefOid: sha('b'),
          author: { login: 'contributor' },
          commits: {
            nodes: [{ commit: { oid: sha('b'), messageHeadline: 'Bounded change' } }],
            pageInfo: { hasNextPage: false },
          },
          reviews: {
            nodes: [
              {
                id: 'PRR_review_1',
                author: { login: 'earlier-reviewer' },
                state: 'COMMENTED',
                commit: { oid: sha('b') },
                submittedAt: '2026-08-23T05:00:00Z',
                body: 'Earlier review',
              },
            ],
            pageInfo: { hasNextPage: false },
          },
          reviewThreads: {
            nodes: [
              {
                id: 'PRR_kwT1',
                isResolved: true,
                comments: {
                  nodes: [
                    {
                      databaseId: 1001,
                      author: { login: 'maintainer' },
                      body: 'Please bound this',
                      updatedAt: '2026-08-23T06:00:00Z',
                    },
                  ],
                  pageInfo: { hasNextPage: false },
                },
              },
            ],
            pageInfo: { hasNextPage: false },
          },
          headRef: {
            target: {
              statusCheckRollup: {
                contexts: {
                  nodes: [
                    {
                      __typename: 'CheckRun',
                      name: 'test',
                      status: 'COMPLETED',
                      conclusion: 'SUCCESS',
                      completedAt: '2026-08-23T06:00:00Z',
                      detailsUrl: 'https://github.com/Proto-UI/Proto-UI/actions/runs/1',
                    },
                    {
                      __typename: 'StatusContext',
                      context: 'legacy-ci',
                      state: 'FAILURE',
                      targetUrl: 'https://ci.example/1',
                      createdAt: '2026-08-23T06:00:00Z',
                    },
                  ],
                  pageInfo: { hasNextPage: false },
                },
              },
            },
          },
        },
      },
    },
    ...overrides,
  };
}

test('live collector builds a complete canonical input from the GraphQL payload', () => {
  const result = buildLiveReviewInput(
    payload(),
    'github.com:Proto-UI/Proto-UI',
    487,
    [],
    changedFiles
  );
  assert.equal(result.viewerLogin, 'reviewer');
  assert.equal(result.viewerPermission, 'WRITE');
  assert.equal(result.authorLogin, 'contributor');
  assert.equal(result.input.commits.length, 1);
  assert.equal(result.input.pullRequestState, 'OPEN');
  assert.equal(result.input.isDraft, false);
  assert.deepEqual(result.input.changedFiles, [
    { path: 'packages/core/src/index.ts', previousPath: null, status: 'modified' },
    {
      path: 'internal/records/moved.md',
      previousPath: 'spec/decisions/D-OLD-0001.yaml',
      status: 'renamed',
    },
  ]);
  assert.equal(result.input.reviews[0].author, 'earlier-reviewer');
  assert.equal(result.input.replies.length, 1);
  assert.equal(result.input.replies[0].id, '1001');
  assert.equal(result.input.replies[0].threadId, 'PRR_kwT1');
  assert.equal(result.input.threads[0].updatedAt, '2026-08-23T06:00:00Z');
  assert.equal(result.input.checks.length, 2);
  assert.equal(result.input.checks[0].status, 'COMPLETED');
  assert.equal(result.input.checks[1].name, 'legacy-ci');
  assert.equal(result.input.checks[1].status, 'COMPLETED');
  assert.equal(result.input.checks[1].conclusion, 'FAILURE');
  assert.equal(summarizeLiveChecks(result.input.checks), 'failure');
  assert.deepEqual(result.input.externalEvidence, []);
});

test('live collector derives thread time from comments and never fabricates timestamps', () => {
  const threaded = payload();
  threaded.data.repository.pullRequest.reviewThreads.nodes[0].comments.nodes.push({
    databaseId: 1002,
    author: { login: 'maintainer' },
    body: 'Later note',
    updatedAt: '2026-08-23T07:00:00Z',
  });
  const result = buildLiveReviewInput(
    threaded,
    'github.com:Proto-UI/Proto-UI',
    487,
    [],
    changedFiles
  );
  assert.equal(result.input.threads[0].updatedAt, '2026-08-23T07:00:00Z');
  assert.equal(result.input.replies.length, 2);

  const empty = payload();
  empty.data.repository.pullRequest.reviewThreads.nodes[0].comments.nodes = [];
  assert.throws(
    () => buildLiveReviewInput(empty, 'github.com:Proto-UI/Proto-UI', 487, [], changedFiles),
    /no comment timestamps/
  );
});

test('live collector fails closed on pagination truncation for every connection', () => {
  for (const [label, mutate] of [
    [
      'reviews',
      (p) => {
        p.data.repository.pullRequest.reviews.pageInfo.hasNextPage = true;
      },
    ],
    [
      'commits',
      (p) => {
        p.data.repository.pullRequest.commits.pageInfo.hasNextPage = true;
      },
    ],
    [
      'review threads',
      (p) => {
        p.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage = true;
      },
    ],
    [
      'thread comments',
      (p) => {
        p.data.repository.pullRequest.reviewThreads.nodes[0].comments.pageInfo.hasNextPage = true;
      },
    ],
    [
      'check contexts',
      (p) => {
        p.data.repository.pullRequest.headRef.target.statusCheckRollup.contexts.pageInfo.hasNextPage = true;
      },
    ],
  ]) {
    const truncated = payload();
    mutate(truncated);
    assert.throws(
      () => buildLiveReviewInput(truncated, 'github.com:Proto-UI/Proto-UI', 487, [], changedFiles),
      /exceeds one page/,
      `${label} truncation must fail closed`
    );
    assert.throws(() => assertNoTruncation(undefined, { hasNextPage: true }, label), /malformed/);
  }
});

test('live collector fails closed when the REST changed-file list is incomplete', () => {
  const truncated = payload();
  truncated.data.repository.pullRequest.changedFiles = changedFiles.length + 1;
  assert.throws(
    () => buildLiveReviewInput(truncated, 'github.com:Proto-UI/Proto-UI', 487, [], changedFiles),
    /changed-file collection is incomplete/
  );
});

test('live collector passes external evidence through verbatim and validates its shape', () => {
  const evidence = [
    { kind: 'artifact', locator: 'https://example.com/a.txt', digest: 'd'.repeat(64) },
  ];
  const result = buildLiveReviewInput(
    payload(),
    'github.com:Proto-UI/Proto-UI',
    487,
    evidence,
    changedFiles
  );
  assert.deepEqual(result.input.externalEvidence, evidence);

  assert.throws(
    () =>
      buildLiveReviewInput(
        payload(),
        'github.com:Proto-UI/Proto-UI',
        487,
        [{ kind: 'artifact', locator: 'https://example.com/a.txt', digest: 'short' }],
        changedFiles
      ),
    /external evidence digest/
  );
});

test('live collector accepts nullable check detail links from both context kinds', () => {
  const nullableUrls = payload();
  nullableUrls.data.repository.pullRequest.headRef.target.statusCheckRollup.contexts.nodes = [
    {
      __typename: 'CheckRun',
      name: 'test',
      status: 'COMPLETED',
      conclusion: 'SUCCESS',
      completedAt: '2026-08-23T06:00:00Z',
      detailsUrl: null,
    },
    {
      __typename: 'StatusContext',
      context: 'legacy-ci',
      state: 'SUCCESS',
      targetUrl: null,
      createdAt: '2026-08-23T06:00:00Z',
    },
  ];
  const result = buildLiveReviewInput(
    nullableUrls,
    'github.com:Proto-UI/Proto-UI',
    487,
    [],
    changedFiles
  );
  assert.equal(result.input.checks.length, 2);
  assert.equal(result.input.checks[0].detailsUrl, null);
  assert.equal(result.input.checks[1].detailsUrl, null);
  assert.equal(summarizeLiveChecks(result.input.checks), 'success');
});

test('check context normalization matches both connection node kinds', () => {
  assert.deepEqual(
    normalizeCheck({
      __typename: 'CheckRun',
      name: 'test',
      status: 'IN_PROGRESS',
      conclusion: null,
      completedAt: null,
      detailsUrl: 'https://example.com',
    }),
    {
      name: 'test',
      status: 'IN_PROGRESS',
      conclusion: null,
      completedAt: null,
      detailsUrl: 'https://example.com',
    }
  );
  assert.deepEqual(
    normalizeCheck({
      __typename: 'StatusContext',
      context: 'ci',
      state: 'PENDING',
      targetUrl: null,
      createdAt: '2026-08-23T06:00:00Z',
    }),
    {
      name: 'ci',
      status: 'PENDING',
      conclusion: null,
      completedAt: '2026-08-23T06:00:00Z',
      detailsUrl: null,
    }
  );
});

test('live check summary accepts neutral terminal conclusions but not pending checks', () => {
  const successCompatible = ['SUCCESS', 'SKIPPED', 'NEUTRAL'].map((conclusion) => ({
    name: conclusion.toLowerCase(),
    status: 'COMPLETED',
    conclusion,
    completedAt: '2026-08-23T06:00:00Z',
    detailsUrl: null,
  }));
  assert.equal(summarizeLiveChecks(successCompatible), 'success');
  assert.equal(
    summarizeLiveChecks([
      ...successCompatible,
      {
        name: 'pending',
        status: 'IN_PROGRESS',
        conclusion: null,
        completedAt: null,
        detailsUrl: null,
      },
    ]),
    'unknown'
  );
});
