import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import {
  BrutalistTooltipRoot,
  BrutalistTooltipTrigger,
  BrutalistTooltipPortal,
  BrutalistTooltipContent,
  BrutalistTooltipArrow,
} from '../src/tooltip';

AdaptToWebComponent(BrutalistTooltipRoot as any);
AdaptToWebComponent(BrutalistTooltipTrigger as any);
AdaptToWebComponent(BrutalistTooltipPortal as any);
AdaptToWebComponent(BrutalistTooltipContent as any);
AdaptToWebComponent(BrutalistTooltipArrow as any);

describe('prototypes/brutalist: tooltip', () => {
  it('projects the Brutalist visual grammar on content', async () => {
    const content = document.createElement('brutalist-tooltip-content') as any;
    document.body.appendChild(content);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(content, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'border-2')).toBe(true);
    expect(styleContains(content, 'bg-foreground')).toBe(true);
    expect(styleContains(content, 'font-mono')).toBe(true);
    content.remove();
  });
});
