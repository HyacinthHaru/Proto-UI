import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import { BrutalistSeparatorRoot } from '../src/separator';

AdaptToWebComponent(BrutalistSeparatorRoot as any);

describe('prototypes/brutalist: separator', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-separator-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'shrink-0')).toBe(true);
    expect(styleContains(el, 'bg-foreground')).toBe(true);

    el.remove();
  });
});
