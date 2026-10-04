// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderHostIndex } from '../src/services/codegen';
import { collectProtoStyleTokens } from '../src/services/prototype-style-tokens';
import { renderProtoStyleTokenCss } from '../src/services/proto-style-css';
import { COMPONENT_REGISTRY } from '../src/registry/components';

describe('Surface public compiler consumption', () => {
  it.each(['shadcn', 'brutalist', 'bootstrap-2-3-2', 'liquid-glass'])(
    'closes actual %s Surface tokens through the Web compiler',
    async (family) => {
      const tokens = (await collectProtoStyleTokens(
        path.resolve(`packages/prototypes/${family}/src/surface`)
      )) as string[];
      const css = renderProtoStyleTokenCss(tokens);
      expect(tokens.length).toBeGreaterThan(15);
      expect(css).not.toContain('Unsupported Proto UI style tokens');
      expect(css).toContain('border');
      expect(css).toContain('border-radius');
      expect(css).not.toMatch(/(?:^|\n)\s*(?:body|h1|p|a)\s*\{/);
    }
  );
  // T-TEXT-0001-CASE-PUBLIC
  it.each(['base', 'shadcn', 'brutalist', 'bootstrap-2-3-2', 'liquid-glass'])(
    'exports %s Surface and generates all four public Adapter facades',
    (family) => {
      const entry = COMPONENT_REGISTRY[`${family}-surface`];
      expect(entry.importPath).toBe(`@proto.ui/prototypes-${family}/surface`);
      const manifest = JSON.parse(
        readFileSync(`packages/prototypes/${family}/package.json`, 'utf8')
      );
      expect(manifest.exports['./surface']).toEqual(
        family === 'bootstrap-2-3-2' || family === 'liquid-glass'
          ? { types: './src/surface/index.ts', default: './src/surface/index.ts' }
          : {
              types: './dist/surface/index.d.ts',
              import: './dist/surface/index.js',
              default: './dist/surface/index.js',
            }
      );
      for (const runtime of ['wc', 'react', 'vue', 'vue2']) {
        const code = renderHostIndex(runtime, [`${family}-surface`]);
        expect(code).toContain(`from '@proto.ui/prototypes-${family}/surface'`);
        expect(code).toContain(entry.items[0].prototypeImport);
        expect(code).toContain(
          runtime === 'wc' ? entry.items[0].wcExport : entry.items[0].reactExport
        );
      }
    }
  );

  // T-TEXT-0001-CASE-LIMITS
  it('reports unsupported targets and unknown style tokens instead of inventing parity', () => {
    expect(() => renderHostIndex('gpui', ['shadcn-surface'])).toThrow('unsupported host "gpui"');
    const css = renderProtoStyleTokenCss(['border-0', 'unsupported-surface-feature']);
    expect(css).toContain('Unsupported Proto UI style tokens');
    expect(css).toContain('unsupported-surface-feature');
    expect(css).toContain('border-width: 0px;');
  });
});
