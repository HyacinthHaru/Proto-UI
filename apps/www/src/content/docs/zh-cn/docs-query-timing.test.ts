// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync('apps/www/src/content/docs/zh-cn/docs-query-timing.mjs', 'utf8');
const helper = (name: string, next: string) => {
  const start = source.indexOf(`const ${name} = `);
  const end = source.indexOf(`\n  const ${next} = `, start);
  if (start < 0 || end < 0) throw new Error(`Missing diagnostic helper ${name}`);
  return source
    .slice(start + `const ${name} = `.length, end)
    .trim()
    .replace(/;$/, '');
};

function observe(original: () => unknown, facts?: () => unknown, tracked = true) {
  const rows: string[] = [];
  const errors: string[] = [];
  const context = {
    storage: { getStore: () => (tracked ? { callId: 'call@1' } : undefined) },
    requests: new Map([['call@1', {}]]),
    record: (stage: string) => rows.push(stage),
    diagnosticError: (stage: string) => errors.push(stage),
    replace: (object: any, key: string, create: (fn: any) => unknown) => {
      object[key] = create(object[key]);
    },
    tap: undefined as unknown,
  };
  context.tap = runInNewContext(`(${helper('tap', 'replace')})`, context);
  const install = runInNewContext(`(${helper('observeWait', 'patchContext')})`, context);
  const object = { read: original };
  install(object, 'read', 'wait', facts);
  return { object, rows, errors };
}

describe('Docs SDK wait observation boundary', () => {
  it('returns the original Promise and invokes the tracked operation once', async () => {
    const promise = Promise.resolve('combobox');
    let calls = 0;
    const { object, rows, errors } = observe(() => {
      calls++;
      return promise;
    });
    expect(object.read()).toBe(promise);
    expect(await promise).toBe('combobox');
    expect(calls).toBe(1);
    expect(rows).toEqual(['wait.enter', 'wait.fulfilled']);
    expect(errors).toEqual([]);
  });

  it('retains the original synchronous thrown value when serialization itself throws', () => {
    const thrown = Object.create(null);
    const { object, errors } = observe(() => {
      throw thrown;
    });
    let observed;
    try {
      object.read();
    } catch (error) {
      observed = error;
    }
    expect(observed).toBe(thrown);
    expect(errors).toEqual(['wait.throw-observation']);
  });

  it('does not let diagnostic facts prevent the original call', async () => {
    const promise = Promise.resolve('combobox');
    let calls = 0;
    const { object, errors } = observe(
      () => {
        calls++;
        return promise;
      },
      () => {
        throw new Error('facts');
      }
    );
    expect(object.read()).toBe(promise);
    expect(await promise).toBe('combobox');
    expect(calls).toBe(1);
    expect(errors).toEqual(['wait.facts']);
  });

  it('passes unrelated operations through without installing reactions or facts', async () => {
    const promise = Promise.resolve('other');
    const { object, rows, errors } = observe(
      () => promise,
      () => {
        throw new Error('untracked');
      },
      false
    );
    expect(object.read()).toBe(promise);
    expect(await promise).toBe('other');
    expect(rows).toEqual([]);
    expect(errors).toEqual([]);
  });
});
