import { describe, expect, it, vi } from 'vitest';
import { loadPrototypes } from '../../../../apps/www/src/components/PrototypePreviewer/prototype-modules';
import { renderDemo } from '../../../../apps/www/src/components/PrototypePreviewer/demo-renderer';
import demo from '../../../../apps/www/src/content/docs/demo_components/tabs/demo-shadcn-tabs.demo';
import baseDialogDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-base-dialog.demo';
import shadcnDialogDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-shadcn-dialog.demo';
import baseHoverCardDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-base-hover-card.demo';
import baseDropdownDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-base-dropdown-menu.demo';
import { assertDemoSpec } from '../../../../apps/www/src/components/PrototypePreviewer/demo-types';
import brutalistMessageDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-message.demo';
import brutalistComposerDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-composer.demo';
import brutalistCodeBlockDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-code-block.demo';
import brutalistAvatarDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-avatar.demo';
import brutalistBadgeDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-badge.demo';
import brutalistCardDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-card.demo';
import brutalistInputDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-input.demo';
import brutalistTextareaDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-textarea.demo';
import brutalistSeparatorDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-separator.demo';
import brutalistSkeletonDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-skeleton.demo';
import brutalistScrollAreaDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-scroll-area.demo';
import brutalistTooltipDemo from '../../../../apps/www/src/content/docs/zh-cn/demo-brutalist-tooltip.demo';

function styleContains(el: Element | null, token: string): boolean {
  return (el?.getAttribute('data-pui-style') ?? '').split(/\s+/).includes(token);
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function completeTransitions(...elements: Array<HTMLElement | null>): Promise<void> {
  for (const element of elements) {
    const exposes = (element as any)?.getExposes?.();
    const state = exposes?.transitionState?.get?.();
    if (state === 'entering' || state === 'leaving') exposes.controls.complete();
  }
  await settle();
}

describe('PrototypePreviewer demo-renderer / wc', () => {
  it('renders the Base Dropdown demo with keyboard focus entry and portaled positioning', async () => {
    vi.useFakeTimers();
    await loadPrototypes([
      'base-dropdown-root',
      'base-dropdown-trigger',
      'base-dropdown-content',
      'base-dropdown-item',
    ]);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const session = await renderDemo({ runtime: 'wc', demo: baseDropdownDemo as any, host });
    await settle();

    try {
      const root = host.querySelector('wc-base-dropdown-root') as any;
      const trigger = host.querySelector('wc-base-dropdown-trigger') as HTMLElement | null;
      const content = host.querySelector('wc-base-dropdown-content') as HTMLElement | null;
      const firstItem = host.querySelector('wc-base-dropdown-item') as HTMLElement | null;
      expect(root?.getExposes().open.get()).toBe(false);

      trigger?.focus();
      trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await vi.advanceTimersByTimeAsync(0);
      await settle();

      expect(root?.getExposes().open.get()).toBe(true);
      expect(content?.parentElement).toBe(document.body);
      expect(content?.style.position).toBe('fixed');
      expect(document.activeElement).toBe(firstItem);
    } finally {
      await session.destroy();
      host.remove();
      vi.useRealTimers();
    }
  });

  it('passes Hover Card delay props through the demo renderer', async () => {
    vi.useFakeTimers();
    await loadPrototypes([
      'base-hover-card-root',
      'base-hover-card-trigger',
      'base-hover-card-content',
    ]);

    const host = document.createElement('div');
    document.body.appendChild(host);
    const session = await renderDemo({ runtime: 'wc', demo: baseHoverCardDemo as any, host });
    await settle();

    try {
      const root = host.querySelector('wc-base-hover-card-root') as any;
      const trigger = host.querySelector('wc-base-hover-card-trigger') as HTMLElement | null;
      expect(root?.getExposes().open.get()).toBe(false);

      trigger?.focus();
      await vi.advanceTimersByTimeAsync(149);
      expect(root?.getExposes().open.get()).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(root?.getExposes().open.get()).toBe(true);
    } finally {
      await session.destroy();
      host.remove();
      vi.useRealTimers();
    }
  });

  it('renders shadcn tabs parts with host styles in demo wc mode', async () => {
    await loadPrototypes([
      'shadcn-button',
      'shadcn-tabs-root',
      'shadcn-tabs-list',
      'shadcn-tabs-trigger',
      'shadcn-tabs-content',
    ]);

    const host = document.createElement('div');
    document.body.appendChild(host);

    const session = await renderDemo({
      runtime: 'wc',
      demo: demo as any,
      host,
    });

    await Promise.resolve();
    await Promise.resolve();

    const root = host.querySelector('wc-shadcn-tabs-root') as HTMLElement | null;
    const list = host.querySelector('wc-shadcn-tabs-list') as HTMLElement | null;
    const trigger = host.querySelector('wc-shadcn-tabs-trigger') as HTMLElement | null;
    const content = host.querySelector('wc-shadcn-tabs-content') as HTMLElement | null;

    expect(root).not.toBeNull();
    expect(list).not.toBeNull();
    expect(trigger).not.toBeNull();
    expect(content).not.toBeNull();
    expect(styleContains(root, 'flex')).toBe(true);
    expect(root?.className).toContain('w-[420px]');
    expect(styleContains(list, 'inline-flex')).toBe(true);
    expect(styleContains(trigger, 'rounded-lg')).toBe(true);
    expect(styleContains(content, 'min-h-28')).toBe(true);

    await session.destroy();
    host.remove();
  });

  it('moves focus into the base dialog demo when opened', async () => {
    await loadPrototypes([
      'base-dialog-root',
      'base-dialog-trigger',
      'base-dialog-mask',
      'base-dialog-content',
      'base-dialog-title',
      'base-dialog-description',
      'base-dialog-close',
    ]);

    const host = document.createElement('div');
    document.body.appendChild(host);

    const session = await renderDemo({
      runtime: 'wc',
      demo: baseDialogDemo as any,
      host,
    });

    await settle();

    const trigger = host.querySelector('wc-base-dialog-trigger') as HTMLElement | null;
    const content = host.querySelector('wc-base-dialog-content') as HTMLElement | null;
    const mask = host.querySelector('wc-base-dialog-mask') as HTMLElement | null;
    const close = host.querySelector('wc-base-dialog-close') as HTMLElement | null;

    expect(trigger).not.toBeNull();
    expect(content).not.toBeNull();
    expect(close).not.toBeNull();
    expect(content?.hasAttribute('data-pui-view-detached')).toBe(true);

    trigger?.focus();
    trigger?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();

    expect(styleContains(content, 'hidden')).toBe(false);
    expect(document.activeElement).toBe(close);

    close?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    await completeTransitions(mask, content);

    await session.destroy();
    host.remove();
  });

  it('moves focus into the shadcn dialog demo when opened', async () => {
    await loadPrototypes([
      'shadcn-dialog-root',
      'shadcn-dialog-trigger',
      'shadcn-dialog-mask',
      'shadcn-dialog-content',
      'shadcn-dialog-title',
      'shadcn-dialog-description',
      'shadcn-dialog-close',
      'shadcn-dialog-close-icon',
      'shadcn-dialog-header',
      'shadcn-dialog-footer',
      'shadcn-button',
    ]);

    const host = document.createElement('div');
    document.body.appendChild(host);

    const session = await renderDemo({
      runtime: 'wc',
      demo: shadcnDialogDemo as any,
      host,
    });

    await settle();

    const trigger = host.querySelector('wc-shadcn-dialog-trigger') as HTMLElement | null;
    const triggerButton = trigger?.querySelector('wc-shadcn-button') as HTMLElement | null;
    const content = host.querySelector('wc-shadcn-dialog-content') as HTMLElement | null;
    const mask = host.querySelector('wc-shadcn-dialog-mask') as HTMLElement | null;
    const close = host.querySelector('wc-shadcn-dialog-close') as HTMLElement | null;
    const closeButton = close?.querySelector('wc-shadcn-button') as HTMLElement | null;
    const closeIcon = host.querySelector('wc-shadcn-dialog-close-icon') as HTMLElement | null;

    expect(trigger).not.toBeNull();
    expect(triggerButton).not.toBeNull();
    expect(content).not.toBeNull();
    expect(close).not.toBeNull();
    expect(closeButton).not.toBeNull();
    expect(closeIcon).not.toBeNull();
    expect(content?.hasAttribute('data-pui-view-detached')).toBe(true);
    expect(trigger?.hasAttribute('data-pui-style')).toBe(false);
    expect(trigger?.tabIndex).toBe(-1);
    expect(triggerButton?.tabIndex).toBe(0);

    triggerButton?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    triggerButton?.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    triggerButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    await settle();

    expect(styleContains(content, 'hidden')).toBe(false);

    closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    await completeTransitions(mask, content);

    triggerButton?.focus();
    triggerButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await settle();

    expect(styleContains(content, 'hidden')).toBe(false);
    expect(document.activeElement).toBe(closeButton);

    closeButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    await completeTransitions(mask, content);

    await session.destroy();
    host.remove();
  });

  it('accepts every new Brutalist component demo spec', () => {
    const demos = [
      brutalistAvatarDemo,
      brutalistBadgeDemo,
      brutalistCardDemo,
      brutalistInputDemo,
      brutalistTextareaDemo,
      brutalistSeparatorDemo,
      brutalistSkeletonDemo,
      brutalistScrollAreaDemo,
      brutalistTooltipDemo,
      brutalistMessageDemo,
      brutalistComposerDemo,
      brutalistCodeBlockDemo,
    ];

    for (const demo of demos) expect(() => assertDemoSpec(demo as any)).not.toThrow();
  });
});
