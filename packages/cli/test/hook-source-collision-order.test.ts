import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { scanRuleStateReads } from '../src/services/lowered-hook-coverage';
import { createHookSourceSummaryContext } from '../src/services/hook-source-summary';

/**
 * Two producers that share one configured name but project different states.
 * The runtime registers a `once` hook by configured name and the first
 * registration wins, so two calls in one setup chain cannot both own their own
 * producer's state.
 */
const PRODUCERS = [
  "import { defineAsHook } from '@proto.ui/core';",
  'export const asA = defineAsHook({',
  "  name: 'shared',",
  "  setup(d) { d.state.bool('alpha', false); },",
  '  projectHandle(r) { return { ready: r.stateHandles.alpha }; },',
  '});',
  'export const asB = defineAsHook({',
  "  name: 'shared',",
  "  setup(d) { d.state.bool('beta', false); },",
  '  projectHandle(r) { return { ready: r.stateHandles.beta }; },',
  '});',
].join('\n');

/** A real rule the coverage scan reads. */
const rule = (condition: string) =>
  `def.rule({ when: (w) => ${condition}, intent: (i) => i.feedback.style.use(tw('bg-primary')) });`;

describe('hook source collision order', () => {
  it('withholds a nested producer when an enclosing producer registered in an earlier iteration', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-repeated-enclosing-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  let bag = null;',
        '  for (let i = 0; i < 2; i++) asB(i === 0 ? undefined : (bag = asA()));',
        `  ${rule('w.state(bag.ready).eq(true)')}`,
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());
      expect(scan.usages).toEqual([]);
      expect(scan.unresolved.map(({ expression }) => expression)).toEqual(['bag.ready']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('certifies the first registration of one statement and withholds the later one', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-order-'));
    try {
      const producerFile = path.join(dir, 'producers.ts');
      await writeFile(producerFile, PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  const first = asA(), second = asB();',
        `  ${rule('w.state(first.ready).eq(true)')}`,
        `  ${rule('w.state(second.ready).eq(true)')}`,
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // The statement evaluates left to right, so `asA()` registers `shared`
      // first and `first` is that producer's own handle.
      expect(scan.usages.map(({ hook, state }) => ({ hook, state }))).toEqual([
        { hook: 'asA', state: 'alpha' },
      ]);
      expect(scan.usages.map(({ provenance }) => provenance?.owner.file)).toEqual([producerFile]);
      // `asB()` runs after that registration, so it cannot own `beta`. The
      // summary refuses the later collision instead of certifying either state.
      expect(scan.unresolved.map(({ expression }) => expression)).toEqual(['second.ready']);
      expect(scan.usages.map(({ hook, state }) => ({ hook, state }))).not.toContainEqual({
        hook: 'asB',
        state: 'beta',
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps a nested earlier registration as an earlier registration', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-nested-earlier-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  const bag = asB(asA());',
        `  ${rule('w.state(bag.ready).eq(true)')}`,
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // The argument is evaluated before the call it is passed to, so the
      // nested `asA()` is an earlier registration of `shared`.
      expect(scan.usages).toEqual([]);
      expect(scan.unresolved.map(({ expression }) => expression)).toEqual(['bag.ready']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not treat the enclosing later call as an earlier registration', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-nested-later-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  const bag = asB(asA());',
        `  ${rule('w.state(asA().ready).eq(true)')}`,
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // The enclosing `asB()` call runs after the argument it is given, so it
      // cannot have registered `shared` before the nested `asA()` call.
      expect(scan.usages.map(({ hook, state }) => ({ hook, state }))).toEqual([
        { hook: 'asA', state: 'alpha' },
      ]);
      expect(scan.unresolved).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps refusing a later registration from an earlier statement', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-earlier-statement-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  asA();',
        '  const bag = asB();',
        `  ${rule('w.state(bag.ready).eq(true)')}`,
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      expect(scan.usages).toEqual([]);
      expect(scan.unresolved.map(({ expression }) => expression)).toEqual(['bag.ready']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps refusing a registration a switch selector made before the body', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-switch-selector-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  switch (0) {',
        '    default: {',
        '      const bag = asA();',
        `      ${rule('w.state(bag.ready).eq(true)')}`,
        '      break;',
        '    }',
        '    case (asB(), 1): break;',
        '  }',
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // The runtime evaluates the case expression before it enters the
      // default body, so `asB()` registered `shared` first and the body's
      // `asA()` cannot own it. The source order of the nodes does not show
      // that, because the case clause is written after the body.
      expect(scan.usages).toEqual([]);
      expect(scan.unresolved.map(({ expression }) => expression)).toEqual(['bag.ready']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps refusing it when the switch selector is written first', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-switch-selector-first-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  switch (0) {',
        '    case (asB(), 1): break;',
        '    default: {',
        '      const bag = asA();',
        `      ${rule('w.state(bag.ready).eq(true)')}`,
        '      break;',
        '    }',
        '  }',
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // The case expression still selects the clause before the body runs,
      // so the refusal does not depend on where the case clause is written.
      expect(scan.usages).toEqual([]);
      expect(scan.unresolved.map(({ expression }) => expression)).toEqual(['bag.ready']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps a switch selector that calls the same producer as one registration', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-switch-selector-same-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA } from './producers';",
        'function setup(def) {',
        '  switch (0) {',
        '    default: {',
        '      const bag = asA();',
        `      ${rule('w.state(bag.ready).eq(true)')}`,
        '      break;',
        '    }',
        '    case (asA(), 1): break;',
        '  }',
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // One producer called twice is one registration, so the selector and
      // the body share the producer and the body still owns `alpha`.
      expect(scan.usages.map(({ hook, state }) => ({ hook, state }))).toEqual([
        { hook: 'asA', state: 'alpha' },
      ]);
      expect(scan.unresolved).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps refusing a registration a binding default made after the initializer', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-destructuring-default-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  let bag;',
        '  const { unused = (bag = asA()) } = (asB(), {});',
        `  ${rule('w.state(bag.ready).eq(true)')}`,
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // The runtime evaluates the initializer before the binding default, so
      // `asB()` registered `shared` first and the default's `asA()` cannot
      // own it. The binding default comes first in the source, so the source
      // order of the nodes does not show that.
      expect(scan.usages).toEqual([]);
      expect(scan.unresolved.map(({ expression }) => expression)).toEqual(['bag.ready']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps an outer switch selector out of an inner setup', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-inner-setup-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA, asB } from './producers';",
        'function setup(def) {',
        '  switch (0) {',
        '    case (asB(), 1): break;',
        '    default: {',
        '      function inner(def) {',
        '        const bag = asA();',
        `        ${rule('w.state(bag.ready).eq(true)')}`,
        '      }',
        '      inner(def);',
        '      break;',
        '    }',
        '  }',
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // The inner setup is its own runtime cache, so the outer switch's
      // `asB()` cannot have registered `shared` before the inner `asA()`.
      expect(scan.usages.map(({ hook, state }) => ({ hook, state }))).toEqual([
        { hook: 'asA', state: 'alpha' },
      ]);
      expect(scan.unresolved).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps the provenance of a producer that is called twice', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'hook-collision-repeated-'));
    try {
      await writeFile(path.join(dir, 'producers.ts'), PRODUCERS);
      const consumerFile = path.join(dir, 'consumer.proto.ts');
      const consumer = [
        "import { asA } from './producers';",
        'function setup(def) {',
        '  const first = asA(), second = asA();',
        `  ${rule('w.state(first.ready).eq(true)')}`,
        `  ${rule('w.state(second.ready).eq(true)')}`,
        '}',
        'setup(def);',
      ].join('\n');
      await writeFile(consumerFile, consumer);
      const scan = scanRuleStateReads(consumer, consumerFile, createHookSourceSummaryContext());

      // One producer called twice is one registration, not a collision.
      expect(scan.usages.map(({ hook, state }) => ({ hook, state }))).toEqual([
        { hook: 'asA', state: 'alpha' },
        { hook: 'asA', state: 'alpha' },
      ]);
      expect(scan.unresolved).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
