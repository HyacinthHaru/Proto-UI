import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const [repository, directory, expected] = process.argv.slice(2);
assert(repository && directory && ['baseline', 'candidate'].includes(expected));
const { validateSpecEntity } = await import(
  pathToFileURL(path.join(repository, 'packages/spec/schema/src/index.ts')).href
);
const { checkSpecLifecycleAuthoring, checkSpecActiveTestMappings, getSpecLifecycleReport } =
  await import(pathToFileURL(path.join(repository, 'packages/spec/engine/src/index.ts')).href);
const { loadSpecWorkspaceFromDirectory } = await import(
  pathToFileURL(path.join(repository, 'packages/spec/engine/src/node.ts')).href
);

const version = '0.3.0-alpha.1';
const contractId = 'C-AUDIT-0001';
const cidA = `${contractId}-A`,
  cidB = `${contractId}-B`;
const common = {
  status: 'draft',
  since: version,
  lifecycleRationale: 'Synthetic audit direction, no admission claimed.',
};
const contract = validateSpecEntity({
  ...common,
  id: contractId,
  type: 'contract',
  title: 'Two-criterion audit contract',
  statement: 'Two separately scoped requirements.',
  criteria: [
    { id: cidA, text: 'A' },
    { id: cidB, text: 'B' },
  ],
});
const active = validateSpecEntity({
  ...contract,
  status: 'active',
  activeSince: version,
  lifecycleRationale: 'Synthetic candidate asserting admission, for negative testing only.',
  revisions: [{ version, change: 'admitted', summary: 'Synthetic admission.' }],
});
function evidence(id: string, covers: string, anchors: string[]) {
  return validateSpecEntity({
    ...common,
    id,
    type: 'test',
    title: id,
    cases: [
      {
        id: `${id}-CASE-ONE`,
        title: covers,
        expectation: 'governed-result',
        covers: [covers],
      },
    ],
    implementations: [
      {
        id: 'declared',
        kind: 'fixture',
        status: 'passing',
        required: true,
        path: 'evidence.test.ts',
        consumesCases: [`${id}-CASE-ONE`],
      },
    ],
    verifies: { contracts: [{ id: contractId, anchors }] },
  });
}
async function run(
  name: string,
  entities: ReturnType<typeof validateSpecEntity>[],
  before: ReturnType<typeof validateSpecEntity>,
  candidate: ReturnType<typeof validateSpecEntity>
) {
  const root = path.join(directory, name),
    spec = path.join(root, 'spec');
  await mkdir(spec, { recursive: true });
  await writeFile(
    path.join(root, 'evidence.test.ts'),
    "import assert from 'node:assert/strict';\nassert.equal(1, 1);\n"
  );
  for (const entity of entities)
    await writeFile(path.join(spec, `${entity.id}.yaml`), JSON.stringify(entity));
  const loaded = await loadSpecWorkspaceFromDirectory(spec);
  const report = getSpecLifecycleReport(loaded, version);
  return {
    loaderIssues: loaded.issues,
    mappingIssues: checkSpecActiveTestMappings(report),
    candidateGaps: report.rows.find((row) => row.entityId === candidate.id)?.gaps,
    authoringIssues: checkSpecLifecycleAuthoring(before, candidate, loaded, version),
    candidateSources: candidate.sources,
    rowEvidence: report.rows.find((row) => row.entityId === candidate.id)?.evidence,
  };
}
const a = evidence('T-AUDIT-0001', cidA, [cidA]);
const misScoped = evidence('T-AUDIT-0002', cidB, [cidA]);
const scoped = evidence('T-AUDIT-0002', cidB, [cidB]);
const withoutB = await run('anchors-no-B-control', [active, a], contract, active);
const mismatch = await run('anchors-mismatch', [active, a, misScoped], contract, active);
const matching = await run('anchors-matching-control', [active, a, scoped], contract, active);
assert(withoutB.candidateGaps?.some((g) => g.code === 'criterion-needs-evidence'));
assert.equal(mismatch.loaderIssues.length, 0);
assert.equal(mismatch.authoringIssues.length, expected === 'baseline' ? 0 : 1);
assert.equal(matching.authoringIssues.length, 0);

const sourceFiles = [
  'packages/spec/schema/src/index.ts',
  'packages/spec/engine/src/index.ts',
  'packages/spec/engine/src/node.ts',
  'packages/spec/engine/src/lifecycle.ts',
];
const sourceHashes = {};
for (const file of sourceFiles)
  sourceHashes[file] = createHash('sha256')
    .update(await readFile(path.join(repository, file)))
    .digest('hex');
const result = {
  basis: expected,
  type: 'Schema-valid synthetic fixtures, real loader/report/authoring; the fixture file is a path-resolution sentinel, not product conformance evidence.',
  sourceHashes,
  anchors: {
    fixture: { declaredAnchor: cidA, outOfScopeCoveredCriterion: cidB },
    withoutB,
    mismatch,
    matching,
  },
};
await writeFile(path.join(directory, 'engine-result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(
  JSON.stringify(
    {
      basis: expected,
      observations: Object.fromEntries(
        Object.entries({ withoutB, mismatch, matching }).map(([name, data]) => [
          name,
          {
            gaps: data.candidateGaps.length,
            evidence: data.rowEvidence.length,
            authoringIssues: data.authoringIssues.length,
          },
        ])
      ),
    },
    null,
    2
  )
);
