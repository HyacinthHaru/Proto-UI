import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import { BrutalistInputRoot } from '../src/input';

AdaptToWebComponent(BrutalistInputRoot as any);

describe('prototypes/brutalist: input', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-input-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'rounded-none')).toBe(true);
    expect(styleContains(el, 'border-2')).toBe(true);
    expect(styleContains(el, 'font-mono')).toBe(true);

    el.remove();
  });
});
