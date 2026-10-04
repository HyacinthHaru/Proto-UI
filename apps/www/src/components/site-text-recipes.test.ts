import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { siteTextRecipe } from './site-text-recipes';
describe('documentation reading scale consumes public Text props', () => {
  for (const family of ['shadcn', 'brutalist'] as const) {
    it(`${family}: keeps body and family weight while reducing section hierarchy`, () => {
      expect(siteTextRecipe('h2', family)).toMatchObject({
        size: '2xl',
        leading: 'tight',
        weight: family === 'brutalist' ? 'bold' : 'semibold',
      });
      expect(siteTextRecipe('h3', family)).toMatchObject({ size: 'xl', leading: 'snug' });
      expect(siteTextRecipe('h4', family)).toMatchObject({ size: 'lg', leading: 'snug' });
      expect(siteTextRecipe('h1', family).size).toBe('4xl');
      expect(siteTextRecipe('body', family)).toMatchObject({ size: 'base', leading: 'relaxed' });
    });
  }
  it('matches section scale before JavaScript without overriding atom paint', () => {
    const css = readFileSync('apps/www/src/styles/markdown.css', 'utf8');
    expect(css).toMatch(/h2\s*\{[^}]*text-2xl leading-tight/);
    expect(css).toMatch(/h3\s*\{[^}]*text-xl leading-snug/);
    expect(css).toMatch(/h4\s*\{[^}]*text-lg leading-snug/);
    expect(css).toMatch(/sl-heading-wrapper\s*\{[^}]*mt-10/);
  });
});
