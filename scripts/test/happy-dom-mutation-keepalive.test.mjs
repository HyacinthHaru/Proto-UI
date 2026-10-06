import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

test('pinned observer forwarding survives GC only with its lifetime keeper and stops on disconnect', () => {
  const script = `
    import { Window } from 'happy-dom';
    import { retainHappyDomMutationCallbacks } from './scripts/test/happy-dom-mutation-keepalive.mjs';
    const run = async (keep) => {
      const w = new Window();
      const keeper = keep ? retainHappyDomMutationCallbacks(w) : null;
      const node = w.document.createElement('div');
      w.document.body.append(node);
      const records = [];
      const observer = new w.MutationObserver((batch) => records.push(...batch.map(r => r.attributeName)));
      observer.observe(node, { attributes: true, attributeFilter: ['data-probe'] });
      for (let i = 0; i < 6; i++) {
        await new Promise(resolve => setImmediate(resolve));
        global.gc();
        node.setAttribute('data-probe', String(i));
        node.setAttribute('data-ignored', String(i));
        await w.happyDOM.whenAsyncComplete();
      }
      const retainedBefore = keeper?.retainedCount();
      observer.disconnect();
      node.setAttribute('data-probe', 'after-disconnect');
      await w.happyDOM.whenAsyncComplete();
      const result = { records, retainedBefore, retainedAfter: keeper?.retainedCount(), connected: node.isConnected };
      keeper?.restore();
      await w.happyDOM.close();
      return result;
    };
    console.log(JSON.stringify({ unpatched: await run(false), repaired: await run(true) }));
  `;
  const result = spawnSync(process.execPath, ['--expose-gc', '--input-type=module', '-e', script], {
    cwd: new URL('../../', import.meta.url),
    encoding: 'utf8',
    timeout: 20_000,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const observed = JSON.parse(result.stdout);
  assert.equal(observed.unpatched.connected, true);
  assert.deepEqual(observed.unpatched.records, []);
  assert.equal(observed.repaired.connected, true);
  assert.deepEqual(observed.repaired.records, Array(6).fill('data-probe'));
  assert.equal(observed.repaired.retainedBefore, 1);
  assert.equal(observed.repaired.retainedAfter, 0);
});
