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

describe('prototypes/brutalist: tooltip projection', () => {
  it('inherits Base behavior across five parts and styles only Content and Arrow', async () => {
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

    expect(root.getExposes().open.get()).toBe(false);
    expect(trigger.getExposes().disabled.get()).toBe(false);
    expect(portal.getExposes()).toEqual({});
    expect(content.getExposes().open.get()).toBe(false);
    expect(arrow.getExposes()).toEqual({});
    root.getExposes().openTooltip('test.materialize');
    await flush();
    expect(root.getExposes().open.get()).toBe(true);
    expect(content.getExposes().open.get()).toBe(true);
    expect(styleContains(content, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'border-2')).toBe(true);
    expect(styleContains(content, 'bg-foreground')).toBe(true);
    expect(styleContains(content, 'font-mono')).toBe(true);
    expect(styleContains(content, 'shadow-[4px_4px_0_0_var(--pui-foreground)]')).toBe(true);
    expect(styleContains(arrow, 'fill-foreground')).toBe(true);

    root.remove();
  });
});
