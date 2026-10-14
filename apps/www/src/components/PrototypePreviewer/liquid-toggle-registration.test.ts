import { describe, expect, it } from 'vitest';
import { liquidGlassToggle } from '@proto.ui/prototypes-liquid-glass/toggle';
import { getPrototype } from './registry';
import { loadPrototype } from './prototype-modules';
import {
  PROJECTION_FAMILY_MANIFESTS,
  resolveProjectionPart,
  resolveProjectionRecipe,
  validateProjectionFamilyManifest,
  type ProjectionFamilyManifest,
} from './projection-families';

describe('Liquid Toggle exact Previewer delivery', () => {
  it('loads the actual standalone prototype through its lazy public subpath', async () => {
    await loadPrototype('liquid-glass-toggle');
    expect(getPrototype('liquid-glass-toggle')).toBe(liquidGlassToggle);
    expect(getPrototype('liquid-glass-toggle').name).toBe('liquid-glass-toggle');
  });

  it('binds the recipe and Base Toggle lineage to the explicit Liquid family', () => {
    expect(resolveProjectionRecipe('demo-liquid-glass-toggle')).toEqual({
      projectionFamilyId: 'liquid-glass',
      familyId: 'toggle',
    });
    expect(resolveProjectionPart('liquid-glass', 'toggle', 'root')).toEqual({
      basePrototypeId: 'P-BASE-TOGGLE',
      prototypeId: 'liquid-glass-toggle',
    });
    const manifest: ProjectionFamilyManifest = PROJECTION_FAMILY_MANIFESTS['liquid-glass'];
    expect(manifest.families.toggle).toMatchObject({
      baseFamilyId: 'P-BASE-TOGGLE',
      recipeId: 'demo-liquid-glass-toggle',
      recipePrototypeIds: ['liquid-glass-toggle'],
    });
    expect(Object.keys(manifest.families.toggle.parts)).toEqual(['root']);
    expect(manifest.families.toggle.auxiliaryPrototypes ?? []).toEqual([]);
    expect(() => validateProjectionFamilyManifest(manifest)).not.toThrow();
    const wrongFamily = {
      ...manifest,
      families: {
        ...manifest.families,
        toggle: {
          ...manifest.families.toggle,
          parts: { root: { basePrototypeId: 'P-BASE-TOGGLE', prototypeId: 'shadcn-toggle' } },
        },
      },
    };
    expect(() => validateProjectionFamilyManifest(wrongFamily)).toThrow(
      /explicit Prototype identity/
    );
  });
});
