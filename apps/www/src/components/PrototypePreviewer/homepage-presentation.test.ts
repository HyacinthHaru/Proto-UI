// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('Homepage presentation source boundaries', () => {
  it('uses one defined bilingual sans-serif stack instead of an unresolved color token', () => {
    const style = read('apps/www/src/styles/tailwindcss.css');
    expect(style).toContain('--font-sans:');
    expect(style).toContain("'PingFang SC'");
    expect(style).toContain("'Microsoft YaHei'");
    expect(style).toContain("'Noto Sans CJK SC'");
    expect(style).toContain('font-family: var(--font-sans)');
    expect(style).not.toContain('--color-font-geist-sans');
    expect(style).not.toContain('GeistVF.woff2');
  });

  it('keeps the live preview and research limitations distinct in both languages', () => {
    const preview = read('apps/www/src/components/PrototypePreviewer/HomeDemoPreviewer.astro');
    expect(preview).toContain('data-home-demo-source');
    expect(preview).toContain('data-home-demo-host');
    expect(preview).toContain('not available adapters or conformance claims');
    expect(preview).toContain('不代表可用 Adapter 或一致性支持');
    expect(preview).not.toContain('完整 generation');
    expect(preview).not.toContain('component lineage');
  });

  it('retains docs, live example and whitepaper paths while dogfooding actions', () => {
    const hero = read('apps/www/src/components/override/Hero.astro');
    expect(hero).toContain('HomeActions');
    expect(hero).toContain('/whitepaper/0-preface/');
    for (const locale of ['en', 'zh-cn']) {
      const home = read(`apps/www/src/content/docs/${locale}/index.mdx`);
      expect(home).toContain(`/${locale}/start-here/what-you-saw/`);
      expect(home).toContain("'#home-demo-previewer'");
    }
  });
});
