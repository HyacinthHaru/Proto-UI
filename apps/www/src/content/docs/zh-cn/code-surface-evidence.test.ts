import { describe, expect, it } from 'vitest';
import {
  codeSurfaceOwnershipIssues,
  codeSurfaceSettled,
  type CodeSurfaceGenerationFacts,
} from './code-surface-evidence';

function ready(): CodeSurfaceGenerationFacts {
  return {
    view: 'ready',
    runtime: 'react',
    family: 'shadcn',
    surfaceCount: 1,
    hosts: [
      {
        generation: '2',
        state: 'active',
        family: 'shadcn',
        runtime: 'react',
        inert: false,
        ariaHidden: null,
        pointerEvents: 'none',
      },
    ],
  };
}
describe('passive code-frame settled evidence', () => {
  it('accepts the exact committed frame only after all other generations retire', () => {
    expect(codeSurfaceSettled(ready(), 'react', 'shadcn')).toBe(true);
    const staging = ready();
    staging.hosts.push({
      ...staging.hosts[0],
      generation: '3',
      state: 'staging',
      inert: true,
      ariaHidden: 'true',
    });
    staging.surfaceCount++;
    expect(codeSurfaceOwnershipIssues(staging)).toEqual([]);
    expect(codeSurfaceSettled(staging, 'react', 'shadcn')).toBe(false);
  });
  it('rejects missing, duplicated, wrong-coordinate and not-ready frames', () => {
    for (const change of [
      (f: CodeSurfaceGenerationFacts) => {
        f.hosts = [];
      },
      (f: CodeSurfaceGenerationFacts) => {
        f.hosts.push({ ...f.hosts[0] });
      },
      (f: CodeSurfaceGenerationFacts) => {
        f.surfaceCount = 0;
      },
      (f: CodeSurfaceGenerationFacts) => {
        f.surfaceCount = 2;
      },
      (f: CodeSurfaceGenerationFacts) => {
        f.view = 'unavailable';
      },
      (f: CodeSurfaceGenerationFacts) => {
        f.hosts[0].family = 'brutalist';
      },
      (f: CodeSurfaceGenerationFacts) => {
        f.hosts[0].runtime = 'wc';
      },
      (f: CodeSurfaceGenerationFacts) => {
        f.hosts[0].generation = null;
      },
    ]) {
      const f = ready();
      change(f);
      expect(codeSurfaceSettled(f, 'react', 'shadcn')).toBe(false);
    }
  });
  it('rejects interactive passive paint and exposed staging hosts during replacement', () => {
    const f = ready();
    f.hosts[0].pointerEvents = 'auto';
    expect(codeSurfaceOwnershipIssues(f)).toContain('Passive code paint has pointer authority');
    f.hosts[0] = { ...f.hosts[0], pointerEvents: 'none', state: 'staging', inert: false };
    expect(codeSurfaceOwnershipIssues(f)).toContain('Uncommitted code generation is exposed');
  });
});
