import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import {
  BrutalistCodeBlockRoot,
  BrutalistCodeBlockHeader,
  BrutalistCodeBlockContent,
} from '../src/code-block';

AdaptToWebComponent(BrutalistCodeBlockRoot as any);
AdaptToWebComponent(BrutalistCodeBlockHeader as any);
AdaptToWebComponent(BrutalistCodeBlockContent as any);

describe('prototypes/brutalist: code-block', () => {
  it('projects the Brutalist visual grammar', async () => {
    const el = document.createElement('brutalist-code-block-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(el, 'rounded-none')).toBe(true);
    expect(styleContains(el, 'border-2')).toBe(true);
    el.remove();
  });
});
