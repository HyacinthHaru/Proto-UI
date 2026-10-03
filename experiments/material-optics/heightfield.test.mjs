import test from 'node:test';
import assert from 'node:assert/strict';
import { distanceAt, sampleOptics, makeField, advanceSpring } from './heightfield.mjs';
test('rim displacement is spatially varying, two-dimensional and vanishes outside', () => {
  const left = sampleOptics(230, 132),
    right = sampleOptics(370, 132);
  assert(left.dx < -0.5 && right.dx > 0.5);
  assert(Math.abs(left.dx + right.dx) < 0.1);
  assert(sampleOptics(300, 105).dy < -0.5);
  assert.equal(sampleOptics(300, 132).dx, 0);
  assert.equal(sampleOptics(20, 20).alpha, 0);
});
test('shape union connects continuously and press/morph change actual geometry', () => {
  assert(distanceAt(300, 132, { merge: 0, mode: 'pair' }) > 0);
  assert(distanceAt(300, 132, { merge: 1, mode: 'pair' }) < 0);
  assert(distanceAt(300, 103, { press: 1 }) > distanceAt(300, 103, { press: 0 }));
  assert(distanceAt(300, 60, { mode: 'menu', morph: 0 }) > 0);
  assert(distanceAt(300, 60, { mode: 'menu', morph: 1 }) < 0);
  for (let i = 1; i <= 20; i++)
    assert(
      Math.abs(
        distanceAt(300, 132, { merge: i / 20, mode: 'pair' }) -
          distanceAt(300, 132, { merge: (i - 1) / 20, mode: 'pair' })
      ) < 4
    );
});
test('specular response follows light and field buffers keep bounded shape data', () => {
  const a = sampleOptics(230, 132, { light: [-1, 0] });
  const b = sampleOptics(230, 132, { light: [1, 0] });
  assert(Math.abs(a.highlight - b.highlight) > 0.01);
  const f = makeField();
  assert.equal(f.normal.length, 600 * 264 * 4);
  assert(f.normal.some((v, i) => i % 4 === 2 && v === 255));
  assert.equal(f.normal[2], 0);
  assert(f.normal.every((v, i) => i % 4 !== 3 || v === 255));
});

test('ordinary rim sampling stays monotonic and independent spring clocks converge', () => {
  let previous = -Infinity;
  for (let x = 220; x <= 270; x += 0.25) {
    const mapped = x + sampleOptics(x, 132).dx;
    assert(mapped > previous);
    previous = mapped;
  }
  const states = [30, 60, 120].map((rate) => {
    let s = { value: 0, velocity: 0 };
    for (let i = 0; i < 2 * rate; i++) s = advanceSpring(s.value, s.velocity, 1, 1 / rate);
    return s;
  });
  for (const s of states) assert(Math.abs(s.value - 1) < 0.0001);
  assert(Math.abs(states[0].value - states[2].value) < 1e-8);
  const first = advanceSpring(0.4, 2, 0, 1 / 60);
  assert(first.value > 0.4, 'retarget preserves incoming velocity before turning');
});
