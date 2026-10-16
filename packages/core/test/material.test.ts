import { describe, expect, it } from 'vitest';
import { snapshotMaterialCandidate, snapshotMaterialSlot } from '../src/material';
import vectors from './fixtures/material-intent-vectors.json';

const slot = () => ({
  version: 2,
  shape: { kind: 'rounded-rect', geometry: 'style' },
  source: { kind: 'owned-scene', slot: 'scene' },
  fallback: { fill: 'style', foreground: 'style' },
});

describe('shared finite material intent vectors', () => {
  it.each(vectors.valid)('accepts a portable whole intent %j', (value) => {
    const snapshot = snapshotMaterialCandidate(value);
    expect(snapshot).toEqual(value);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });
  it.each(vectors.invalid.map((value) => [value]))('rejects a foreign payload %j', (value) => {
    expect(() => snapshotMaterialCandidate(value)).toThrow();
  });
  it('does not execute getters, inherit fields, admit symbols or accept explicit undefined', () => {
    let reads = 0;
    expect(() =>
      snapshotMaterialCandidate({
        get intent() {
          reads++;
          return 'liquid-glass';
        },
      })
    ).toThrow();
    expect(reads).toBe(0);
    for (const value of [
      Object.create({ intent: 'liquid-glass' }),
      { intent: 'liquid-glass', [Symbol('payload')]: true },
      { intent: 'liquid-glass', variant: undefined },
      { intent: 'liquid-glass', deformation: { kind: 'press', phase: NaN } },
      { intent: 'liquid-glass', deformation: { kind: 'press', phase: Infinity } },
    ])
      expect(() => snapshotMaterialCandidate(value)).toThrow();
  });
  it('copies and freezes nested deformation, rather than retaining mutable author input', () => {
    const original = { intent: 'liquid-glass', deformation: { kind: 'press', phase: 'pressed' } };
    const result = snapshotMaterialCandidate(original);
    original.deformation.phase = 'rest';
    expect(result).toEqual({
      intent: 'liquid-glass',
      deformation: { kind: 'press', phase: 'pressed' },
    });
    expect(result.intent === 'liquid-glass' && Object.isFrozen(result.deformation)).toBe(true);
  });
  it('accepts all logical source scopes without creating a resource or permission', () => {
    for (const source of [
      { kind: 'owned-scene', slot: 'scene' },
      { kind: 'in-app-backdrop' },
      { kind: 'behind-window' },
    ]) {
      const data = { ...slot(), source };
      expect(snapshotMaterialSlot(data)).toEqual(data);
    }
  });
  it('rejects nonlogical sources, ambiguous fallback ownership and private profile fields', () => {
    for (const data of [
      { ...slot(), source: { kind: 'owned-scene', slot: 'https://example.invalid/x' } },
      { ...slot(), source: { kind: 'owned-scene', slot: 'x'.repeat(65) } },
      { ...slot(), source: { kind: 'behind-window', slot: 'scene' } },
      { ...slot(), source: { kind: 'owned-scene', slot: 'scene', texture: {} } },
      { ...slot(), shape: { kind: 'path', geometry: 'style' } },
      { ...slot(), fallback: { fill: [0, 0, 0, 0.5], foreground: 'style' } },
      { ...slot(), fallback: { fill: 'computed-css', foreground: 'style' } },
      { ...slot(), interaction: { kind: 'button-press' } },
      { ...slot(), version: 1 },
    ])
      expect(() => snapshotMaterialSlot(data)).toThrow();
  });
});

it('admits only a finite pointer contact request, never author coordinates or programs', () => {
  expect(
    snapshotMaterialCandidate({
      intent: 'liquid-glass',
      deformation: { kind: 'press', phase: 'rest', contact: 'pointer' },
    })
  ).toEqual({
    intent: 'liquid-glass',
    deformation: { kind: 'press', phase: 'rest', contact: 'pointer' },
  });
  for (const contact of [null, 'mouse', { x: 0.5, y: 0.5 }, Infinity])
    expect(() =>
      snapshotMaterialCandidate({
        intent: 'liquid-glass',
        deformation: { kind: 'press', phase: 'rest', contact },
      })
    ).toThrow();
});

describe('finite liquid-glass style-fill tint', () => {
  it.each([undefined, 'regular', 'clear'] as const)(
    'copies an explicit tint with variant %s without adding a default variant',
    (variant) => {
      const original = {
        intent: 'liquid-glass',
        ...(variant ? { variant } : {}),
        tint: 'style-fill',
        deformation: { kind: 'press', phase: 'pressed', contact: 'pointer' },
      };
      const snapshot = snapshotMaterialCandidate(original);
      expect(snapshot).toEqual(original);
      expect(snapshot).not.toBe(original);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(snapshot.intent === 'liquid-glass' && Object.isFrozen(snapshot.deformation)).toBe(
        true
      );
      original.tint = 'changed';
      original.deformation.phase = 'rest';
      expect(snapshot).toMatchObject({
        tint: 'style-fill',
        deformation: { phase: 'pressed' },
      });
      expect(Object.hasOwn(snapshot, 'variant')).toBe(variant !== undefined);
    }
  );

  it('keeps every untinted fixture byte-for-byte unchanged and tint absent', () => {
    for (const value of vectors.valid) {
      const snapshot = snapshotMaterialCandidate(value);
      expect(JSON.stringify(snapshot)).toBe(JSON.stringify(value));
      expect(Object.keys(snapshot)).toEqual(Object.keys(value));
      expect(Object.hasOwn(snapshot, 'tint')).toBe(false);
    }
  });

  it.each([
    undefined,
    null,
    false,
    true,
    0,
    NaN,
    Infinity,
    'none',
    'primary',
    '#0061cc',
    'rgba(0, 0, 0, 1)',
    [0, 0, 1, 1],
    { fill: 'style' },
    new String('style-fill'),
    Symbol('style-fill'),
    () => 'style-fill',
  ])('rejects a non-finite or non-enumerated tint %s', (tint) => {
    expect(() => snapshotMaterialCandidate({ intent: 'liquid-glass', tint })).toThrow();
  });

  it('rejects tint on adaptive-blur and author-supplied capability or profile fields', () => {
    for (const candidate of [
      { intent: 'adaptive-blur', tint: 'style-fill' },
      { intent: 'adaptive-blur', tone: 'system', tint: 'style-fill' },
      { intent: 'liquid-glass', tint: 'style-fill', styleTintVariants: ['regular'] },
      { intent: 'liquid-glass', tint: 'style-fill', profile: 'tinted' },
      { intent: 'liquid-glass', tint: 'style-fill', foreground: [1, 1, 1, 1] },
      { intent: 'liquid-glass', tint: 'style-fill', alpha: 0.7 },
    ])
      expect(() => snapshotMaterialCandidate(candidate)).toThrow();
  });

  it('accepts a plain null-prototype tint value and rejects inherited or polluted fields', () => {
    const candidate = Object.assign(Object.create(null), {
      intent: 'liquid-glass',
      tint: 'style-fill',
    });
    expect(snapshotMaterialCandidate(candidate)).toEqual({
      intent: 'liquid-glass',
      tint: 'style-fill',
    });
    for (const invalid of [
      Object.assign(Object.create({ tint: 'style-fill' }), { intent: 'liquid-glass' }),
      Object.assign(Object.create({ intent: 'liquid-glass' }), { tint: 'style-fill' }),
      JSON.parse(' {"intent":"liquid-glass","tint":"style-fill","__proto__":{"ready":true}}'),
      { intent: 'liquid-glass', tint: 'style-fill', [Symbol('field')]: true },
      Object.defineProperty({ intent: 'liquid-glass' }, 'tint', { value: 'style-fill' }),
    ])
      expect(() => snapshotMaterialCandidate(invalid)).toThrow();
  });

  it('rejects tint accessors without executing author code', () => {
    let reads = 0;
    const candidate = {
      intent: 'liquid-glass',
      get tint() {
        reads++;
        return 'style-fill';
      },
    };
    expect(() => snapshotMaterialCandidate(candidate)).toThrow();
    expect(reads).toBe(0);
    expect(() =>
      snapshotMaterialCandidate(
        Object.defineProperty({ intent: 'liquid-glass' }, 'tint', {
          enumerable: true,
          set(_) {
            reads++;
          },
        })
      )
    ).toThrow();
    expect(reads).toBe(0);
  });
});
