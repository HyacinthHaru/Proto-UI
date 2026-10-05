import { loadSpecWorkspaceFromDirectory } from '@proto.ui/spec-engine/node';
import { beforeAll, describe, expect, it } from 'vitest';
import path from 'node:path';

let workspace: Awaited<ReturnType<typeof loadSpecWorkspaceFromDirectory>>;

beforeAll(async () => {
  workspace = await loadSpecWorkspaceFromDirectory(path.join(process.cwd(), 'spec'));
  expect(workspace.issues).toEqual([]);
});

describe('Focus readiness evidence boundaries', () => {
  it.each([
    [
      'react-focus-acquisition-readiness',
      'T-FOCUS-0002-CASE-ACQUISITION-READINESS',
      ['HC-FOCUS-TARGET-0001-D'],
    ],
    [
      'react-focus-updated-native-blur',
      'T-FOCUS-0002-CASE-UPDATED-BLUR',
      ['HC-FOCUS-TARGET-0001-B', 'HC-FOCUS-TARGET-0001-D'],
    ],
  ])('keeps %s scoped to its exercised host boundary', (implementationId, caseId, covers) => {
    const entity = workspace.entities.find((candidate) => candidate.id === 'T-FOCUS-0002');
    const implementation = entity?.implementations.find(
      (candidate) => candidate.id === implementationId
    );

    expect(implementation?.consumesCases).toEqual([caseId]);
    expect(entity?.cases.find((candidate) => candidate.id === caseId)?.covers).toEqual(covers);
  });

  it.each([
    ['M-FOCUS-0001', 'M-FOCUS-0001-G'],
    ['HC-FOCUS-TARGET-0001', 'HC-FOCUS-TARGET-0001-D'],
  ])('traces %s retained entry realization to its governing contract', (entityId, criterionId) => {
    const criterion = workspace.entities
      .find((candidate) => candidate.id === entityId)
      ?.criteria.find((candidate) => candidate.id === criterionId);
    const reference = criterion?.references?.contracts?.find(
      (candidate) => candidate.id === 'C-AS-FOCUS-ENTRY-0001'
    );

    expect(reference?.anchors).toContain('C-AS-FOCUS-ENTRY-0001-H');
  });
});
