import { loadSpecWorkspaceFromDirectory } from '@proto.ui/spec-engine/node';
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const SPEC_DIR = path.join(process.cwd(), 'spec');

type Source = { path?: string };
type Implementation = { id?: string; path?: string; status?: string; consumesCases?: string[] };
type Case = { id?: string };
type Entity = {
  id: string;
  sources?: Source[];
  implementations?: Implementation[];
  cases?: Case[];
};

/** A citation outside the repository is evidence this check cannot resolve. */
function isRepositoryPath(value: string | undefined): value is string {
  return typeof value === 'string' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function resolves(value: string): boolean {
  return existsSync(path.join(REPO_ROOT, value));
}

/**
 * Reports the citations that do not resolve and the cases nothing consumes.
 * Exported so a focused fixture can drive it without a repository scan.
 */
export function collectEvidenceGaps(entities: readonly Entity[]): {
  missingSources: string[];
  missingImplementations: string[];
  orphanCases: string[];
} {
  const missingSources: string[] = [];
  const missingImplementations: string[] = [];
  const orphanCases: string[] = [];

  for (const entity of entities) {
    for (const source of entity.sources ?? []) {
      if (!isRepositoryPath(source.path)) continue;
      if (!resolves(source.path)) missingSources.push(`${entity.id}: ${source.path}`);
    }

    for (const implementation of entity.implementations ?? []) {
      // A planned implementation is a declared intent, not a claim that a file
      // exists. Every other status asserts current evidence.
      if (implementation.status === 'planned') continue;
      if (!isRepositoryPath(implementation.path)) continue;
      if (!resolves(implementation.path)) {
        missingImplementations.push(`${entity.id}: ${implementation.id} -> ${implementation.path}`);
      }
    }

    const consumed = new Set(
      (entity.implementations ?? []).flatMap((implementation) => implementation.consumesCases ?? [])
    );
    for (const testCase of entity.cases ?? []) {
      if (testCase.id && !consumed.has(testCase.id))
        orphanCases.push(`${entity.id}: ${testCase.id}`);
    }
  }

  return { missingSources, missingImplementations, orphanCases };
}

describe('catalog evidence integrity', () => {
  it('separates a resolvable citation from one that only looks like evidence', () => {
    const gaps = collectEvidenceGaps([
      {
        id: 'C-FIXTURE-0001',
        sources: [
          { path: 'package.json' },
          { path: 'spec/nothing-here.md' },
          // A citation outside the repository is not this check's to resolve.
          { path: 'https://www.w3.org/TR/wai-aria-1.2/' },
        ],
        implementations: [
          {
            id: 'present',
            path: 'package.json',
            status: 'passing',
            consumesCases: ['C-FIXTURE-0001-CASE-A'],
          },
          {
            id: 'absent',
            path: 'packages/nothing-here.test.ts',
            status: 'passing',
            consumesCases: ['C-FIXTURE-0001-CASE-B'],
          },
          // Planned names a file that has not been written yet, which is what
          // planned means; it must not be read as a missing artefact.
          {
            id: 'later',
            path: 'packages/not-written-yet.test.ts',
            status: 'planned',
            consumesCases: ['C-FIXTURE-0001-CASE-C'],
          },
        ],
        cases: [
          { id: 'C-FIXTURE-0001-CASE-A' },
          { id: 'C-FIXTURE-0001-CASE-B' },
          { id: 'C-FIXTURE-0001-CASE-C' },
          { id: 'C-FIXTURE-0001-CASE-ORPHAN' },
        ],
      },
    ]);

    expect(gaps.missingSources).toEqual(['C-FIXTURE-0001: spec/nothing-here.md']);
    expect(gaps.missingImplementations).toEqual([
      'C-FIXTURE-0001: absent -> packages/nothing-here.test.ts',
    ]);
    expect(gaps.orphanCases).toEqual(['C-FIXTURE-0001: C-FIXTURE-0001-CASE-ORPHAN']);
  });

  it('leaves no cited evidence path unresolved across the catalog', async () => {
    const workspace = await loadSpecWorkspaceFromDirectory(SPEC_DIR);
    expect(workspace.issues).toEqual([]);

    const gaps = collectEvidenceGaps(workspace.entities as unknown as Entity[]);

    expect(gaps.missingSources, 'cited sources that do not resolve').toEqual([]);
    expect(
      gaps.missingImplementations,
      'implementations claiming current evidence at a path that does not resolve'
    ).toEqual([]);
  });

  it('leaves no declared case without an implementation that consumes it', async () => {
    const workspace = await loadSpecWorkspaceFromDirectory(SPEC_DIR);
    // A file that fails to load contributes no cases, so without this the
    // invariant would read as satisfied by an entity that never arrived.
    expect(workspace.issues).toEqual([]);

    const gaps = collectEvidenceGaps(workspace.entities as unknown as Entity[]);

    // Coverage a catalog intends but has not written is a `status: planned`
    // implementation consuming the case, not a case pointing at nothing.
    expect(gaps.orphanCases, 'cases no implementation consumes').toEqual([]);
  });
});
