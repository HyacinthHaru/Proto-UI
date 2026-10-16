// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as liquidRoot from '../../prototypes/liquid-glass/src';
import * as liquidToggle from '../../prototypes/liquid-glass/src/toggle';
import {
  COMPONENT_REGISTRY,
  WORKSPACE_COMPONENT_REGISTRY,
  listComponentChoices,
} from '../src/registry/components';
import { renderHostIndex, renderRootIndex } from '../src/services/codegen';

const componentId = 'liquid-glass-toggle';

describe('Liquid Toggle standalone source delivery', () => {
  it('keeps the private package boundary and exports one real standalone prototype', () => {
    const manifest = JSON.parse(
      readFileSync('packages/prototypes/liquid-glass/package.json', 'utf8')
    );
    expect(manifest.private).toBe(true);
    expect(manifest.protoUi.release.scan).toBe(false);
    expect(manifest.exports['./toggle']).toEqual({
      types: './src/toggle/index.ts',
      default: './src/toggle/index.ts',
    });
    expect(Object.keys(liquidToggle).sort()).toEqual(['default', 'liquidGlassToggle']);
    expect(liquidToggle.default).toBe(liquidToggle.liquidGlassToggle);
    expect(liquidToggle.default.name).toBe(componentId);
    expect(liquidRoot).toHaveProperty('liquidGlassToggle', liquidToggle.default);
  });

  it('registers exactly the standalone Liquid identity only for workspace consumption', () => {
    const entry = WORKSPACE_COMPONENT_REGISTRY[componentId];
    expect(entry).toMatchObject({
      id: componentId,
      packageName: '@proto.ui/prototypes-liquid-glass',
      importPath: '@proto.ui/prototypes-liquid-glass/toggle',
      stylePreset: 'liquid-glass',
      sourceOnly: true,
    });
    expect(entry?.items).toEqual([
      {
        prototypeImport: 'liquidGlassToggle',
        reactExport: 'LiquidGlassToggle',
        vueExport: 'LiquidGlassToggle',
        wcExport: 'LiquidGlassToggleElement',
        elementName: 'proto-ui-liquid-glass-toggle',
      },
    ]);
    expect(COMPONENT_REGISTRY[componentId]).toBeUndefined();
    expect(listComponentChoices().some((item) => item.value === componentId)).toBe(false);
  });

  for (const host of ['wc', 'react', 'vue', 'vue2'] as const) {
    it(`${host} emits the real Liquid export only with explicit workspace source mode`, () => {
      expect(() => renderHostIndex(host, [componentId])).toThrow(/workspace-source-only/);
      for (const language of ['ts', 'js'] as const) {
        const facade = renderHostIndex(host, [componentId], { sourceMode: 'workspace', language });
        expect(facade).toContain(
          "import { liquidGlassToggle } from '@proto.ui/prototypes-liquid-glass/toggle';"
        );
        expect(facade).toContain(
          host === 'wc'
            ? "export const LiquidGlassToggleElement = AdaptToWebComponent(liquidGlassToggle, { registerAs: 'proto-ui-liquid-glass-toggle' });"
            : 'export const LiquidGlassToggle = adapt(liquidGlassToggle);'
        );
        expect(facade).not.toMatch(
          /ToggleGroup|toggle-group|prototypes-bootstrap|prototypes-shadcn/
        );
        const root = renderRootIndex({ [host]: [componentId] }, language);
        expect(root).toContain(host === 'wc' ? 'LiquidGlassToggleElement' : 'LiquidGlassToggle');
      }
    });
  }

  it('does not claim an unsupported native host', () => {
    expect(() => renderHostIndex('gpui', [componentId], { sourceMode: 'workspace' })).toThrow(
      'unsupported host'
    );
  });
});
