import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import {
  tooltipContent,
  tooltipPortal,
  tooltipRoot,
  tooltipTrigger,
  type TooltipRootProps,
} from '../src/tooltip';

const TooltipRootElement = AdaptToWebComponent(tooltipRoot);
const TooltipTriggerElement = AdaptToWebComponent(tooltipTrigger);
const TooltipPortalElement = AdaptToWebComponent(tooltipPortal);
const TooltipContentElement = AdaptToWebComponent(tooltipContent);

type OpenChangeRequest = { open: boolean; reason?: string | null };

async function flushViewReconciliation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
  await flushViewReconciliation();
}

async function completeTransition(
  content: InstanceType<typeof TooltipContentElement>
): Promise<void> {
  const exposes = content.getExposes();
  const state = exposes.transitionState.get();
  if (state === 'entering' || state === 'leaving') exposes.controls.complete();
  await flushViewReconciliation();
}

function createTooltip(props: Partial<TooltipRootProps> = {}) {
  const root = new TooltipRootElement();
  const trigger = new TooltipTriggerElement();
  const portal = new TooltipPortalElement();
  const content = new TooltipContentElement();
  setElementProps(root, props);
  portal.appendChild(content);
  root.append(trigger, portal);
  document.body.appendChild(root);
  return { root, trigger, portal, content };
}

function collectRequests(root: InstanceType<typeof TooltipRootElement>): OpenChangeRequest[] {
  const requests: OpenChangeRequest[] = [];
  root.addEventListener('openChange', (event: Event) => {
    requests.push((event as CustomEvent<OpenChangeRequest>).detail);
  });
  return requests;
}

afterEach(async () => {
  document.body.replaceChildren();
  await flushViewReconciliation();
  vi.useRealTimers();
});

describe('prototypes/base: tooltip behavior', () => {
  it('opens after delay on trigger pointerenter and closes after leave', async () => {
    vi.useFakeTimers();
    const { root, trigger, content } = createTooltip({ delayDuration: 100, closeDelay: 50 });
    const requests = collectRequests(root);
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

  it('emits controlled requests without replacing owner open', async () => {
    vi.useFakeTimers();
    const { root, trigger, content } = createTooltip({
      open: false,
      delayDuration: 0,
      closeDelay: 0,
    });
    const requests = collectRequests(root);
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

  it('projects stable tooltip semantics and description linkage', async () => {
    vi.useFakeTimers();
    const { trigger, content } = createTooltip({ defaultOpen: true, delayDuration: 0 });
    await advance(0);

    expect(content.id).toMatch(/^pui-tooltip-\d+-content$/);
    expect(content.getAttribute('role')).toBe('tooltip');
    expect(trigger.getAttribute('aria-describedby')).toBe(content.id);
  });

  it('closes through Overlay Escape handling and allows a fresh reopen', async () => {
    vi.useFakeTimers();
    const { root, trigger, content } = createTooltip({ delayDuration: 0, closeDelay: 0 });
    const requests = collectRequests(root);
    await flushViewReconciliation();

    trigger.dispatchEvent(new Event('pointerenter'));
    await advance(0);
    await completeTransition(content);
    expect(root.getExposes().open.get()).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await advance(0);
    expect(requests.at(-1)).toEqual(expect.objectContaining({ open: false, reason: 'escape' }));
    expect(root.getExposes().open.get()).toBe(false);

    trigger.dispatchEvent(new Event('pointerenter'));
    await advance(0);
    expect(root.getExposes().open.get()).toBe(true);
    expect(content.getExposes().open.get()).toBe(true);
  });
});
