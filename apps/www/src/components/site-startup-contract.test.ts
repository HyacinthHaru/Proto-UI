import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import YAML from 'yaml';
const read = (p: string) => readFileSync(p, 'utf8');

describe('startup source invariants (not browser paint)', () => {
  it('keeps the pre-upgrade runtime value neutral instead of contradicting stored preference', () => {
    const adapter = read('apps/www/src/components/override/AdapterSelect.astro');
    expect(adapter).toContain('<SelectValue data-placeholder="选择适配器">Runtime</SelectValue>');
    expect(read('apps/www/src/components/Homepage/HomeActions.astro')).toContain(
      'class="site-header-runtime-placeholder">Runtime'
    );
  });
  it('uses the stable canvas height input for both fallback and loaded host', () => {
    const source = read('apps/www/src/components/PrototypePreviewer/PrototypePreviewer.astro');
    const host = source.match(/\.proto-previewer__preview \.host\s*\{([^}]*)\}/)![1];
    const fallback = source
      .match(/\.proto-previewer__skeleton\s*\{([^}]*)\}/g)!
      .find((s) => s.includes('min-height'))!;
    const height = 'min-height: var(--runtime-box-content-min, 10rem)';
    expect(host).toContain(height);
    expect(fallback).toContain(height);
  });
  it('schedules its production-only suite when a theme or underlying adapter changes', () => {
    const workflow = YAML.parse(read('.github/workflows/site-startup-theme-evidence.yml'));
    expect(workflow.on.pull_request.paths).toEqual(
      expect.arrayContaining([
        'apps/www/**',
        'packages/adapters/**',
        'packages/prototypes/**',
        'packages/modules/**',
        'packages/runtime/**',
        'packages/cli/**',
        'pnpm-lock.yaml',
      ])
    );
    const probe = read('apps/www/src/content/docs/zh-cn/site-startup-theme.browser.test.ts');
    expect(probe).toContain('/zh-cn/ui-libraries/brutalist/components/card/');
    expect(probe).toContain('Page.captureScreenshot');
    expect(probe).toContain('response?.status()).toBe(200)');
  });
});
