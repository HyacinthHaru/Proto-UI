import { loadSpecWorkspaceFromDirectory } from '@proto.ui/spec-engine/node';
import { describe, expect, it } from 'vitest';
import path from 'node:path';

const SPEC_DIR = path.join(process.cwd(), 'spec');

describe('shadcn Checkbox baseline text', () => {
  it('keeps the pinned baseline and the later adopted recipe distinguishable', async () => {
    const workspace = await loadSpecWorkspaceFromDirectory(SPEC_DIR);
    expect(workspace.issues).toEqual([]);

    const entity = workspace.entities.find((candidate) => candidate.id === 'P-SHADCN-CHECKBOX');
    const criterion = entity?.criteria?.find(
      (candidate) => candidate.id === 'P-SHADCN-CHECKBOX-COMPATIBILITY-SUBSET'
    );

    const text = criterion?.text;
    if (!text || typeof text === 'string') {
      throw new Error('compatibility-subset criterion must have bilingual text');
    }
    expect(text.en).toContain(
      'the pinned historical compatibility baseline and evidence for later official recipes must remain distinct'
    );
    // Agreement with a later recipe is not baseline movement, and disagreement
    // is not automatically a gap. Both halves have to survive an edit.
    expect(text.en).toContain('must not be read as advancing the overall baseline');
    expect(text.en).toContain('must not be filed as a parity gap by default');
    expect(text['zh-CN']).toContain('固定历史兼容比较基线与后来的官方 recipe 证据必须分开记录');

    const context = entity?.openQuestions?.[0]?.context;
    if (!context || typeof context === 'string') {
      throw new Error('the compatibility open question must have bilingual context');
    }
    // The per-item conclusions are the whole point of the separation: which
    // parts of the later recipe this projection adopts, and which it does not.
    // The compared revision must stay pinned. A floating "current upstream"
    // claim cannot be reconstructed once that branch moves.
    expect(context.en).toContain('63c1308d112b6b1205d86244a156cca1abef5087');
    expect(context.en).not.toContain('current upstream main');
    expect(context['zh-CN']).toContain('63c1308d112b6b1205d86244a156cca1abef5087');
    expect(context.en).toContain('style-maia.css');
    expect(context.en).toContain('centers with `flex items-center justify-center`');
    expect(context.en).toContain('`rounded-[6px]` is not adopted');
    expect(context['zh-CN']).toContain('逐字节相同');
    expect(context['zh-CN']).toContain('`rounded-[6px]` 未被采用');

    // The centering mechanism has one settled classification. It must not read
    // as an adoption in one sentence and a remaining gap in the next.
    expect(context.en).toContain('intentional adoption of the later official recipe');
    expect(context.en).not.toMatch(/gaps include[^.]*centering mechanism/);
    expect(context['zh-CN']).toContain('有意采用较新官方 recipe');

    const indicator = workspace.entities.find(
      (candidate) => candidate.id === 'P-SHADCN-CHECKBOX-INDICATOR'
    );
    const indicatorContext = indicator?.openQuestions?.[0]?.context;
    if (!indicatorContext || typeof indicatorContext === 'string') {
      throw new Error('the Indicator compatibility question must have bilingual context');
    }
    // Same settled classification on the owning entity, not merely a retraction.
    expect(indicatorContext.en).toContain(
      'intentional adoption of the later official recipe rather than a parity gap'
    );
    expect(indicatorContext['zh-CN']).toContain('有意采用较新官方 recipe');
  });
});
