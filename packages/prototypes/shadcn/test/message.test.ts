import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import { ShadcnMessageRoot } from '../src/message';

AdaptToWebComponent(ShadcnMessageRoot as any);

describe('prototypes/shadcn: message', () => {
  it('projects the shadcn card surface with direction variants', async () => {
    const incoming = document.createElement('shadcn-message-root') as any;
    document.body.appendChild(incoming);
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(incoming, 'rounded-lg')).toBe(true);
    expect(styleContains(incoming, 'bg-card')).toBe(true);
    incoming.remove();

    const outgoing = document.createElement('shadcn-message-root') as any;
    document.body.appendChild(outgoing);
    await Promise.resolve();
    await Promise.resolve();
    outgoing.setAttribute('direction', 'outgoing');
    await Promise.resolve();
    await Promise.resolve();
    expect(styleContains(outgoing, 'data-[direction=outgoing]:ml-auto')).toBe(true);
    expect(styleContains(outgoing, 'data-[direction=outgoing]:bg-primary')).toBe(true);
    outgoing.remove();
  });
});
