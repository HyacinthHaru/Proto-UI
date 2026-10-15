import { describe, it, expect, vi } from 'vitest';
import {
  prominentTintDemo,
  paintProminentTintSource,
  PROMINENT_TINT_CONTROLS,
  createProminentTintPlan,
  createProminentTintCheckpoint,
  prominentTintPreferenceStages,
} from './liquid-prominent-tint-fixture';
import type { DemoNode, DemoRuntimeApi } from '../../../components/PrototypePreviewer/demo-types';
const nodes = (node: DemoNode): DemoNode[] => [
  node,
  ...('children' in node
    ? (node.children ?? []).flatMap((child) => (typeof child === 'string' ? [] : nodes(child)))
    : []),
];
describe('real prominent command fixture ownership', () => {
  it.each(PROMINENT_TINT_CONTROLS)('uses real single Form owner and real action %s', (control) => {
    const patch = vi.fn();
    const api = { setProps: patch } as unknown as DemoRuntimeApi;
    const events: any[] = [];
    const demo = prominentTintDemo('submit', control, 'text', () => {}, events);
    const protos = nodes(demo.root).filter((n) => n.kind === 'proto');
    expect(protos).toHaveLength(2);
    expect(protos[0]).toMatchObject({ prototypeId: 'liquid-glass-form-root', ref: 'owner' });
    expect(protos[1]).toMatchObject({
      prototypeId: control === 'neutral' ? 'liquid-glass-form-reset' : 'liquid-glass-form-submit',
      props: { material: control === 'opaque' ? 'opaque' : 'auto' },
    });
    demo.setup!({ api, host: document.createElement('div'), refs: {} });
    expect(patch.mock.calls[0][0]).toBe('owner');
    expect(JSON.stringify(demo.root)).toContain(control === 'neutral' ? 'Reset' : 'Submit');
  });
  it('keeps icon-only accessible names without inventing selected state', () => {
    const demo = prominentTintDemo('button', 'tinted', 'icon-only', () => {}, []);
    expect(
      nodes(demo.root).find((n) => n.kind === 'box' && n.attrs?.['data-tint-foreground'] === '')
    ).toMatchObject({ attrs: { role: 'img', 'aria-label': 'Continue' } });
    expect(JSON.stringify(demo.root)).not.toContain('active');
    expect(JSON.stringify(demo.root)).not.toContain('width');
  });
  it('paints deterministically with predeclared phase and no random noise or time', () => {
    const calls: unknown[][] = [];
    const ctx = {
      fillRect: (...x: unknown[]) => calls.push(x),
      beginPath() {},
      moveTo() {},
      lineTo() {},
      fill() {},
      fillText: (...x: unknown[]) => calls.push(x),
    } as unknown as CanvasRenderingContext2D;
    paintProminentTintSource(ctx, 320, 180, 'gray-boundary', 'dark', 0);
    expect(calls).toHaveLength(10);
    expect(calls[0]).toEqual([0, 0, 32, 180]);
  });
  it('predeclares all 48 cases and every preference capture before any browser launch', () => {
    const plan = createProminentTintPlan();
    expect(plan.cases).toHaveLength(48);
    expect(plan.cases.filter((entry) => entry.kind === 'journey')).toHaveLength(32);
    expect(plan.cases.filter((entry) => entry.kind === 'preferences')).toHaveLength(16);
    const captures = plan.cases.flatMap((entry) => entry.captures);
    expect(captures).toHaveLength(1608);
    expect(new Set(captures).size).toBe(1608);
    for (const runtime of plan.runtimes) {
      const shard = createProminentTintPlan(runtime);
      expect(shard.cases).toHaveLength(12);
      expect(shard.cases.flatMap((entry) => entry.captures)).toHaveLength(402);
    }
    expect(() => createProminentTintPlan('invalid')).toThrow(/shard/);
    expect(prominentTintPreferenceStages('button')).toHaveLength(33);
    expect(prominentTintPreferenceStages('submit')).toHaveLength(36);
  });
  it('serializes useful planned/running partial matrices and only finalizes on normal completion', () => {
    const plan = createProminentTintPlan('wc'),
      first = plan.cases[0];
    const planned = createProminentTintCheckpoint(plan, { cases: {}, captures: {} }, 'planned');
    expect(planned.partial).toBe(true);
    expect(planned.expectedCases).toBe(12);
    expect(planned.cases.every((entry) => entry.status === 'not-run')).toBe(true);
    const state = {
      cases: { [first.id]: { status: 'running' } },
      captures: {
        [first.captures[0]]: { status: 'failed', error: 'registered PNG size mismatch' },
      },
    };
    const running = JSON.parse(
      JSON.stringify(createProminentTintCheckpoint(plan, state, 'running'))
    );
    expect(running.cases[0].status).toBe('running');
    expect(running.cases[0].captures[0].status).toBe('failed');
    expect(running.cases[0].captures[1].status).toBe('not-run');
    const final = createProminentTintCheckpoint(plan, state, 'terminal');
    expect(final.partial).toBe(false);
    expect(final.cases[0].status).toBe('blocked-at-normal-finalization');
    expect(final.cases[0].captures[0].status).toBe('failed');
  });
});
