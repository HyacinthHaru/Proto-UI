import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { tooltipContent, tooltipRoot, tooltipTrigger } from '../src/tooltip';

AdaptToWebComponent(tooltipRoot as any);
AdaptToWebComponent(tooltipTrigger as any);
AdaptToWebComponent(tooltipContent as any);

async function flushViewReconciliation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await flushViewReconciliation();
}

async function completeTransition(element: any): Promise<void> {
  const exposes = element.getExposes();
  const state = exposes.transitionState?.get?.();
  if (state === 'entering' || state === 'leaving') exposes.controls.complete();
  await flushViewReconciliation();
}

function createTooltip(props: Record<string, unknown> = {}) {
  const root = document.createElement('base-tooltip-root') as any;
  const trigger = document.createElement('base-tooltip-trigger') as any;
  const content = document.createElement('base-tooltip-content') as any;
  setElementProps(root, props);
  root.append(trigger, content);
  document.body.appendChild(root);
  return { root, trigger, content };
}

afterEach(async () => {
  document.body.replaceChildren();
  await flushViewReconciliation();
  vi.useRealTimers();
});

describe('prototypes/base: tooltip', () => {
  it('opens after delay on trigger pointerenter and closes after leave', async () => {
    vi.useFakeTimers();
    const { root, trigger, content } = createTooltip({ delayDuration: 100, closeDelay: 50 });
    const requests: any[] = [];
    root.addEventListener('openChange', (event: Event) => {
      requests.push((event as CustomEvent).detail);
    });
    await flushViewReconciliation();

    expect(root.getExposes().open.get()).toBe(false);
    expect(content.hasAttribute('data-pui-view-detached')).toBe(true);

    trigger.dispatchEvent(new Event('pointerenter'));
    await advance(99);
    expect(root.getExposes().open.get()).toBe(false);

    await advance(1);
    expect(root.getExposes().open.get()).toBe(true);
    expect(content.getExposes().open.get()).toBe(true);
    expect(requests).toEqual([
      expect.objectContaining({ open: true, reason: 'trigger.pointerenter' }),
    ]);
    await completeTransition(content);

    trigger.dispatchEvent(new Event('pointerleave'));
    await advance(49);
    expect(root.getExposes().open.get()).toBe(true);
    await advance(1);
    expect(root.getExposes().open.get()).toBe(false);
  });

  it('keeps open while content is hovered', async () => {
    vi.useFakeTimers();
    const { root, trigger, content } = createTooltip({ delayDuration: 0, closeDelay: 80 });
    await flushViewReconciliation();

    trigger.dispatchEvent(new Event('pointerenter'));
    await advance(0);
    await completeTransition(content);
    expect(root.getExposes().open.get()).toBe(true);

    content.dispatchEvent(new Event('pointerenter'));
    trigger.dispatchEvent(new Event('pointerleave'));
    await advance(100);
    expect(root.getExposes().open.get()).toBe(true);

    content.dispatchEvent(new Event('pointerleave'));
    await advance(80);
    expect(root.getExposes().open.get()).toBe(false);
  });

  it('controlled mode emits requests without replacing owner open', async () => {
    vi.useFakeTimers();
    const { root, trigger, content } = createTooltip({
      open: false,
      delayDuration: 0,
      closeDelay: 0,
    });
    const requests: any[] = [];
    root.addEventListener('openChange', (event: Event) => {
      requests.push((event as CustomEvent).detail);
    });
    await flushViewReconciliation();

    trigger.dispatchEvent(new Event('pointerenter'));
    await advance(0);
    expect(root.getExposes().open.get()).toBe(false);
    expect(content.hasAttribute('data-pui-view-detached')).toBe(true);
    expect(requests.at(-1)).toEqual(
      expect.objectContaining({ open: true, reason: 'trigger.pointerenter' })
    );

    setElementProps(root, { open: true, delayDuration: 0, closeDelay: 0 });
    await flushViewReconciliation();
    expect(root.getExposes().open.get()).toBe(true);

    root.getExposes().close('root.method.close');
    expect(root.getExposes().open.get()).toBe(true);
    expect(requests.at(-1)).toEqual(
      expect.objectContaining({ open: false, reason: 'root.method.close' })
    );
  });

  it('opens from focus and ignores disabled trigger interaction', async () => {
    vi.useFakeTimers();
    const { root, trigger } = createTooltip({ delayDuration: 0, closeDelay: 0 });
    await flushViewReconciliation();

    trigger.focus();
    await advance(0);
    expect(root.getExposes().open.get()).toBe(true);

    trigger.blur();
    await advance(0);
    expect(root.getExposes().open.get()).toBe(false);

    setElementProps(trigger, { disabled: true });
    await flushViewReconciliation();
    trigger.dispatchEvent(new Event('pointerenter'));
    await advance(0);
    expect(root.getExposes().open.get()).toBe(false);
  });
});
