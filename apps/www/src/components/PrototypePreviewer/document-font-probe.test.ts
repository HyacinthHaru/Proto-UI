import { readFileSync } from 'node:fs';
import { WEBSITE_SHADCN_THEME_TOKENS } from './projection-theme';
import { afterEach, describe, expect, it } from 'vitest';
import { siteTypographyParticipant } from '../site-typography';
import type { MaterializedProjectionCandidate } from './projection-materializer';
import { findDocumentFontSample } from './document-font-probe';

const candidates: MaterializedProjectionCandidate[] = [];
afterEach(async () => {
  for (const candidate of candidates.splice(0)) await candidate.dispose();
  document.body.replaceChildren();
});

describe('document font sample through actual Text projection', () => {
  for (const family of ['shadcn', 'brutalist'] as const) {
    it(`${family}: resolves the real WC text slot and retained authored CJK node`, async () => {
      document.body.innerHTML =
        '<main data-site-family-scope><div data-doc-flow><p><code>shadcn-surface-root</code> 是 draft 工作区 Surface 原子。<a href="/zh-cn/ui-libraries/base/surface/">Base Surface</a></p></div></main>';
      const root = document.querySelector<HTMLElement>('main')!;
      const css = readFileSync('apps/www/src/styles/shadcn-theme.css', 'utf8');
      for (const name of WEBSITE_SHADCN_THEME_TOKENS) {
        const value = css.match(new RegExp(`--pui-${name}:\\s*([^;]+);`))?.[1];
        expect(value, `Actual website theme token ${name}`).toBeTruthy();
        root.style.setProperty(`--pui-${name}`, value!);
      }
      const paragraph = root.querySelector('p')!;
      const authoredChinese = paragraph.childNodes[1];
      expect(authoredChinese.nodeType).toBe(Node.TEXT_NODE);
      const candidate = await siteTypographyParticipant(root).materialize({
        generation: 1,
        selection: { runtimeId: 'wc', projectionFamilyId: family },
      });
      candidates.push(candidate);
      candidate.activate();
      await expect.poll(() => paragraph.querySelector('[data-pui-root]')).not.toBeNull();
      const sample = findDocumentFontSample('[data-doc-flow] > p:first-of-type', true)!;
      expect(sample).not.toBeNull();
      expect(sample).not.toBe(paragraph);
      expect(sample.contains(authoredChinese)).toBe(true);
      expect(authoredChinese.parentElement).toBe(sample);
      expect(sample.closest('[data-pui-root]')).not.toBeNull();
      expect(findDocumentFontSample('[data-doc-flow] > p:first-of-type', false)).toBe(sample);
      expect(root.querySelector('p')).toBe(paragraph);
      // CDP's font query must target this actual direct-text carrier, not <p>.
      expect([...paragraph.childNodes].some((node) => node.nodeType === Node.TEXT_NODE)).toBe(
        false
      );
    });
  }
});
