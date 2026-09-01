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
    expect(context.en).toContain('byte-identical between the pinned revision and current upstream');
    expect(context.en).toContain('style-maia.css');
    expect(context.en).toContain('centers with `flex items-center justify-center`');
    expect(context.en).toContain('`rounded-[6px]` is not adopted');
    expect(context['zh-CN']).toContain('逐字节相同');
    expect(context['zh-CN']).toContain('`rounded-[6px]` 未被采用');

    const indicator = workspace.entities.find(
      (candidate) => candidate.id === 'P-SHADCN-CHECKBOX-INDICATOR'
    );
    const indicatorContext = indicator?.openQuestions?.[0]?.context;
    if (!indicatorContext || typeof indicatorContext === 'string') {
      throw new Error('the Indicator compatibility question must have bilingual context');
    }
    // The centering mechanism was recorded as a parity gap before this was
    // measured; the retraction must not silently disappear.
    expect(indicatorContext.en).toContain('no longer recorded as a parity gap');
    expect(indicatorContext['zh-CN']).toContain('不再记为 parity gap');
  });
});
