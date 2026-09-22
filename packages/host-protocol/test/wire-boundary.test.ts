import { describe, expect, it } from 'vitest';

import { WireBoundaryError, assertWireValue } from '../src';

describe('wire boundary', () => {
  it('accepts bounded data', () => {
    const value = {
      protocolVersion: 0,
      ids: ['a', 'b'],
      nested: { flag: true, count: 3, none: null },
    };
    expect(assertWireValue(value)).toBe(value);
    expect(assertWireValue(null)).toBeNull();
    expect(assertWireValue('text')).toBe('text');
  });

  it('rejects functions, symbols, undefined, bigint and non-finite numbers with a path', () => {
    const cases: readonly [unknown, string, RegExp][] = [
      [{ callback: () => undefined }, 'callback', /functions/],
      [{ token: Symbol('token') }, 'token', /symbols/],
      [{ nested: [1, undefined] }, 'nested[1]', /undefined/],
      [{ big: 1n }, 'big', /bigint/],
      [{ size: Number.NaN }, 'size', /non-finite/],
      [{ size: Number.POSITIVE_INFINITY }, 'size', /non-finite/],
    ];
    for (const [value, path, message] of cases) {
      let caught: unknown;
      try {
        assertWireValue(value);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(WireBoundaryError);
      expect((caught as WireBoundaryError).path).toBe(path);
      expect((caught as WireBoundaryError).message).toMatch(message);
    }
  });

  it('rejects object identity carriers: class instances, symbol keys and cycles', () => {
    class Handle {
      readonly id = 'handle';
    }
    expect(() => assertWireValue({ handle: new Handle() })).toThrow(/object identity/);
    expect(() => assertWireValue({ [Symbol('secret')]: 1 })).toThrow(/symbol keys/);

    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => assertWireValue(cyclic)).toThrow(/cyclic/);

    const shared = { ok: true };
    expect(() => assertWireValue({ first: shared, second: shared })).not.toThrow();
  });
});
