import { describe, expect, it, vi } from 'vitest';
import {
  assertDemoSpec,
  type DemoNode,
  type DemoRuntimeApi,
} from '../../../components/PrototypePreviewer/demo-types';
import {
  LIQUID_HOVER_PARTS,
  LIQUID_HOVER_NEGATIVES,
  liquidHoverDemo,
  liquidHoverContextCapture,
  liquidHoverRemoveProp,
  type HoverRequest,
} from './liquid-hover-fixture';

function walk(
  node: DemoNode,
  ancestry: string[] = []
): Array<{ node: DemoNode; ancestry: string[] }> {
  const next = node.kind === 'proto' ? [...ancestry, node.prototypeId] : ancestry;
  return [
    { node, ancestry },
    ...('children' in node ? (node.children ?? []) : []).flatMap((child) =>
      typeof child === 'string' ? [] : walk(child, next)
    ),
  ];
}
describe('Liquid hover first-party fixture composition (source only)', () => {
  it('keeps the bounded six-part slice and explicit carrier-negative controls', () => {
    expect(LIQUID_HOVER_PARTS).toEqual([
      'button',
      'toggle',
      'accordion',
      'collapsible',
      'select',
      'dropdown',
    ]);
    expect(LIQUID_HOVER_NEGATIVES).toEqual([
      'source-edge',
      'authored-before',
      'neighbor',
      'clipped-source',
    ]);
  });
  for (const part of LIQUID_HOVER_PARTS)
    it(`${part}: one real subject with required ancestry and outward requests only`, () => {
      const capture = vi.fn();
      const setProps = vi.fn();
      const requests: HoverRequest[] = [];
      const api: DemoRuntimeApi = { call: vi.fn(), getExposes: vi.fn(), setProps };
      const demo = liquidHoverDemo(part, capture, requests);
      expect(() => assertDemoSpec(demo)).not.toThrow();
      const nodes = walk(demo.root);
      const targets = nodes.filter(({ node }) => node.kind === 'proto' && node.ref === 'subject');
      expect(targets).toHaveLength(1);
      const { node, ancestry } = targets[0];
      expect(node.kind === 'proto' && node.prototypeId).toBe(
        `liquid-glass-${part === 'button' || part === 'toggle' ? part : `${part}-trigger`}`
      );
      expect(ancestry).toEqual(
        part === 'button' || part === 'toggle'
          ? []
          : part === 'accordion'
            ? [
                'liquid-glass-accordion-root',
                'liquid-glass-accordion-item',
                'liquid-glass-accordion-heading',
              ]
            : [`liquid-glass-${part}-root`]
      );
      expect(
        nodes.filter(
          ({ node }) => node.kind === 'box' && node.attrs?.['data-liquid-hover-slot'] === ''
        )
      ).toHaveLength(1);
      demo.setup!({ api, refs: {}, host: {} as HTMLElement });
      expect(capture).toHaveBeenCalledWith(api);
      expect(setProps).toHaveBeenCalledTimes(1);
      const [ref, patch] = setProps.mock.calls[0];
      expect(ref).toBe(part === 'button' || part === 'toggle' ? 'subject' : 'owner');
      const event = part === 'button' ? 'Click' : part === 'toggle' ? 'ActiveChange' : 'OpenChange';
      expect(Object.keys(patch)).toEqual([`on${event}`]);
      patch[`on${event}`]({ value: 'observed' });
      expect(requests).toEqual([{ kind: event, detail: { value: 'observed' } }]);
      expect(api.call).not.toHaveBeenCalled();
      expect(api.getExposes).not.toHaveBeenCalled();
    });
  it('models Accordion collapseBlocked through real Root policy, never a trigger stub', () => {
    const demo = liquidHoverDemo('accordion', () => {}, [], true);
    const owner = walk(demo.root).find(
      ({ node }) => node.kind === 'proto' && node.ref === 'owner'
    )!.node;
    expect(owner.kind === 'proto' && owner.props).toEqual({
      openItems: ['item'],
      allowEmpty: false,
    });
  });
});

describe('native screenshot context retains outer visual evidence', () => {
  const viewport = { width: 800, height: 600 };
  it('keeps at least 32 CSS pixels around a normal subject', () => {
    const result = liquidHoverContextCapture({ x: 100, y: 100, width: 160, height: 48 }, viewport);
    expect(result.clip).toEqual({ x: 68, y: 68, width: 224, height: 112 });
    expect(result.fullyPadded).toBe(true);
  });
  it('includes the expanded material footprint and reports viewport clipping honestly', () => {
    const result = liquidHoverContextCapture(
      { x: 20, y: 100, width: 160, height: 48 },
      viewport,
      30
    );
    expect(result.margin).toBe(46);
    expect(result.clip).toEqual({ x: 0, y: 54, width: 226, height: 140 });
    expect(result.fullyPadded).toBe(false);
  });
  it('rejects empty and nonfinite evidence rectangles', () => {
    expect(() =>
      liquidHoverContextCapture({ x: 900, y: 100, width: 100, height: 48 }, viewport)
    ).toThrow('outside');
    expect(() =>
      liquidHoverContextCapture({ x: 100, y: 100, width: NaN, height: 48 }, viewport)
    ).toThrow('Invalid');
  });
});

describe('hover fixture authored-prop withdrawal', () => {
  it('requests deletion through the preview capability without an undefined patch', () => {
    const api: DemoRuntimeApi = {
      call: vi.fn(),
      getExposes: vi.fn(),
      setProps: vi.fn(),
      removeProps: vi.fn(),
    };
    liquidHoverRemoveProp(api, 'subject', 'disabled');
    expect(api.removeProps).toHaveBeenCalledWith('subject', ['disabled']);
    expect(api.setProps).not.toHaveBeenCalled();
  });
  it('fails explicitly when an external preview API lacks the capability', () => {
    const api: DemoRuntimeApi = { call: vi.fn(), getExposes: vi.fn(), setProps: vi.fn() };
    expect(() => liquidHoverRemoveProp(api, 'subject', 'material')).toThrow(
      'authored-prop withdrawal'
    );
    expect(api.setProps).not.toHaveBeenCalled();
  });
});
