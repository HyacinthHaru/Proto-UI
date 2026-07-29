import { describe, expect, it } from 'vitest';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import { styleContains } from '../../test-utils/style';
import {
  BrutalistTooltipArrow,
  BrutalistTooltipContent,
  BrutalistTooltipPortal,
  BrutalistTooltipRoot,
  BrutalistTooltipTrigger,
} from '../src/tooltip';

const TooltipRootElement = AdaptToWebComponent(BrutalistTooltipRoot);
const TooltipTriggerElement = AdaptToWebComponent(BrutalistTooltipTrigger);
const TooltipPortalElement = AdaptToWebComponent(BrutalistTooltipPortal);
const TooltipContentElement = AdaptToWebComponent(BrutalistTooltipContent);
const TooltipArrowElement = AdaptToWebComponent(BrutalistTooltipArrow);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('prototypes/brutalist: tooltip shell', () => {
  it('projects all five Base parts without inventing Root behavior', async () => {
    const root = new TooltipRootElement();
    const trigger = new TooltipTriggerElement();
    const portal = new TooltipPortalElement();
    const content = new TooltipContentElement();
    const arrow = new TooltipArrowElement();
    content.appendChild(arrow);
    portal.appendChild(content);
    root.append(trigger, portal);
    document.body.appendChild(root);
    await flush();

    expect(root.getExposes()).toEqual({});
    expect(trigger.getExposes()).toEqual({});
    expect(portal.getExposes()).toEqual({});
    expect(content.getExposes()).toEqual({});
    expect(arrow.getExposes()).toEqual({});
    expect(styleContains(content, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'border-2')).toBe(true);
    expect(styleContains(content, 'bg-foreground')).toBe(true);
    expect(styleContains(content, 'font-mono')).toBe(true);
    expect(styleContains(content, 'shadow-[4px_4px_0_0_var(--pui-foreground)]')).toBe(true);
    expect(styleContains(arrow, 'fill-foreground')).toBe(true);

    root.remove();
  });
});
