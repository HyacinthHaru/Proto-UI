import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceAt, sampleOptics, makeField } from './heightfield.mjs';
test('rim displacement is spatially varying, two-dimensional and vanishes outside', () => {
  const left = sampleOptics(143, 132),
    right = sampleOptics(247, 132);
  assert(left.dx < -2 && right.dx > 2);
  assert(Math.abs(left.dx + right.dx) < 0.1);
  assert(sampleOptics(195, 88).dy < -2);
  assert.equal(sampleOptics(195, 132).dx, 0);
  assert.equal(sampleOptics(20, 20).alpha, 0);
});
test('shape union connects continuously and press/morph change actual geometry', () => {
  assert(distanceAt(300, 132, { merge: 0 }) > 0);
  assert(distanceAt(300, 132, { merge: 1 }) < 0);
  assert(distanceAt(195, 81, { press: 1 }) > distanceAt(195, 81, { press: 0 }));
  assert(distanceAt(300, 60, { mode: 'menu', morph: 0 }) > 0);
  assert(distanceAt(300, 60, { mode: 'menu', morph: 1 }) < 0);
  for (let i = 1; i <= 20; i++)
    assert(
      Math.abs(
        distanceAt(300, 132, { merge: i / 20 }) - distanceAt(300, 132, { merge: (i - 1) / 20 })
      ) < 4
    );
});
test('specular response follows light and field buffers keep bounded shape data', () => {
  const a = sampleOptics(143, 132, { light: [-1, 0] });
  const b = sampleOptics(143, 132, { light: [1, 0] });
  assert(Math.abs(a.highlight - b.highlight) > 0.1);
  const f = makeField();
  assert.equal(f.normal.length, 300 * 132 * 4);
  assert(f.normal.some((v, i) => i % 4 === 3 && v === 255));
  assert.equal(f.normal[3], 0);
});
