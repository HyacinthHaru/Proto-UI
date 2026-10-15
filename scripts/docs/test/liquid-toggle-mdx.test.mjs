import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { compile } from '@mdx-js/mdx';

for (const locale of ['en', 'zh-cn']) {
  test(`Liquid Toggle public ${locale} MDX compiles with literal signal payload`, async () => {
    const file = path.join(
      process.cwd(),
      `apps/www/src/content/docs/${locale}/ui-libraries/liquid-glass/toggle.mdx`
    );
    const source = readFileSync(file, 'utf8');
    await assert.doesNotReject(() => compile(source));
    assert.ok(source.includes('`{ active: boolean }`'));
    // Keep the exact observed failure as a negative control; compilation never executes MDX.
    const invalid = source.replace('`{ active: boolean }`', '{ active: boolean }');
    await assert.rejects(() => compile(invalid), /Could not parse expression with acorn/);
  });
}
