import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import {
  BrutalistTooltipRoot,
  BrutalistTooltipTrigger,
  BrutalistTooltipContent,
} from '../src/tooltip';

AdaptToWebComponent(BrutalistTooltipRoot as any);
AdaptToWebComponent(BrutalistTooltipTrigger as any);
AdaptToWebComponent(BrutalistTooltipContent as any);

describe('prototypes/brutalist: tooltip', () => {
  it('projects the Brutalist visual grammar on content', async () => {
    const root = document.createElement('brutalist-tooltip-root') as any;
    const trigger = document.createElement('brutalist-tooltip-trigger') as any;
    const content = document.createElement('brutalist-tooltip-content') as any;
    setElementProps(root, { defaultOpen: true, delayDuration: 0, closeDelay: 0 });
    root.append(trigger, content);
    document.body.appendChild(root);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(content, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'border-2')).toBe(true);
    expect(styleContains(content, 'bg-foreground')).toBe(true);
    expect(styleContains(content, 'font-mono')).toBe(true);
    root.remove();
  });
});
