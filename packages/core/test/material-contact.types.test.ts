import { describe, expect, it } from 'vitest';
import {
  createAnatomyFamily,
  type MaterialContactHandle,
  type MaterialContactLink,
  type MaterialContactPaintDeclaration,
} from '../src';

// Type-only function: invalid expressions are compiled, never executed.
function portableBoundary(handle: MaterialContactHandle, link: MaterialContactLink) {
  // @ts-expect-error A delegated paint requires its explicit pair.
  const missing: MaterialContactPaintDeclaration = { source: 'part', placement: 'fixed' };
  // @ts-expect-error Self cannot smuggle a delegated pair.
  const self: MaterialContactPaintDeclaration = { source: 'self', placement: 'fixed', link };
  // @ts-expect-error Arbitrary transforms are not material placement modes.
  handle.receive({ source: 'self', placement: 'rotate' });
  // @ts-expect-error Authors cannot name physical targets.
  const target: MaterialContactLink = { ...link, ownerTarget: {} };
  // @ts-expect-error Contact declarations cannot inspect host samples.
  handle.current();
  // @ts-expect-error Contact declarations never acquire input capture.
  handle.capture(1);
  // @ts-expect-error Material does not activate or change a domain value.
  handle.activate(true);
  return [missing, self, target];
}
void portableBoundary;
describe('material contact portable declarations', () => {
  it('has one finite part-link shape independent of a host or component name', () => {
    const family = createAnatomyFamily('contact-type-fixture', {
      roles: {
        root: { cardinality: { min: 1, max: 1 } },
        thumb: { cardinality: { min: 0, max: '*' } },
      },
    });
    const link: MaterialContactLink = {
      family,
      key: 'thumb',
      ownerRole: 'root',
      paintRole: 'thumb',
    };
    const declaration: MaterialContactPaintDeclaration = {
      source: 'part',
      link,
      placement: 'style-owned-translation',
    };
    expect(declaration.link).toBe(link);
  });
});
