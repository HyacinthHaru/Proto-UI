import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { BrutalistMessageRoot } from '../src/message';

AdaptToWebComponent(BrutalistMessageRoot as any);

describe('prototypes/brutalist: message', () => {
  it('projects the Brutalist visual grammar with direction variants', async () => {
    const incoming = document.createElement('brutalist-message-root') as any;
    document.body.appendChild(incoming);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(incoming, 'rounded-none')).toBe(true);
    expect(styleContains(incoming, 'border-2')).toBe(true);
    expect(styleContains(incoming, 'font-mono')).toBe(true);
    expect(styleContains(incoming, 'shadow-[3px_3px_0_0_var(--pui-foreground)]')).toBe(true);
    incoming.remove();

    const outgoing = document.createElement('brutalist-message-root') as any;
    setElementProps(outgoing, { direction: 'outgoing' });
    document.body.appendChild(outgoing);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(outgoing, 'ml-auto')).toBe(true);
    expect(styleContains(outgoing, 'bg-canary')).toBe(true);
    outgoing.remove();
  });
});
