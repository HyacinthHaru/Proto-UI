import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import {
  BrutalistCardRoot,
  BrutalistCardHeader,
  BrutalistCardTitle,
  BrutalistCardDescription,
  BrutalistCardAction,
  BrutalistCardContent,
  BrutalistCardFooter,
} from '../src/card';

AdaptToWebComponent(BrutalistCardRoot as any);
AdaptToWebComponent(BrutalistCardHeader as any);
AdaptToWebComponent(BrutalistCardTitle as any);
AdaptToWebComponent(BrutalistCardDescription as any);
AdaptToWebComponent(BrutalistCardAction as any);
AdaptToWebComponent(BrutalistCardContent as any);
AdaptToWebComponent(BrutalistCardFooter as any);

describe('prototypes/brutalist: card', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-card-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'rounded-none')).toBe(true);
    expect(styleContains(el, 'border-2')).toBe(true);

    el.remove();
  });
});
