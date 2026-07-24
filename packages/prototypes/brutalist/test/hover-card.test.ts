import { afterEach, describe, expect, it, vi } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { hoverCardContent, hoverCardRoot, hoverCardTrigger } from '../src/hover-card';

AdaptToWebComponent(hoverCardRoot as any);
AdaptToWebComponent(hoverCardTrigger as any);
AdaptToWebComponent(hoverCardContent as any);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(async () => {
  document.body.replaceChildren();
  await flush();
  vi.useRealTimers();
});

describe('prototypes/brutalist: hover-card', () => {
  it('keeps named parts and projects a hard-shadowed content panel', async () => {
    vi.useFakeTimers();
    expect(hoverCardRoot.name).toBe('brutalist-hover-card-root');
    expect(hoverCardTrigger.name).toBe('brutalist-hover-card-trigger');
    expect(hoverCardContent.name).toBe('brutalist-hover-card-content');

    const root = document.createElement('brutalist-hover-card-root') as any;
    const trigger = document.createElement('brutalist-hover-card-trigger') as any;
    const content = document.createElement('brutalist-hover-card-content') as any;
    setElementProps(root, { openDelay: 0, closeDelay: 0 });
    setElementProps(content, { side: 'right', align: 'start', avoidCollisions: false });
    root.append(trigger, content);
    document.body.appendChild(root);
    await flush();

    trigger.dispatchEvent(new Event('pointerenter'));
    await vi.advanceTimersByTimeAsync(0);
    await flush();

    expect(root.getExposes().open.get()).toBe(true);
    expect(styleContains(trigger, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'border-2')).toBe(true);
    expect(styleContains(content, 'shadow-[8px_8px_0_0_#000]')).toBe(true);
    expect(styleContains(content, 'bg-secondary-background')).toBe(true);
    expect(styleContains(content, 'rounded-md')).toBe(false);
    expect(styleContains(content, 'shadow-md')).toBe(false);
  });
});
