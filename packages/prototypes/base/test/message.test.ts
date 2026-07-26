import { describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import messageRoot from '../src/message';

AdaptToWebComponent(messageRoot as any);

describe('prototypes/base: message', () => {
  it('exposes direction state with default incoming', async () => {
    const el = document.createElement('base-message-root') as any;
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    const exposes = el.getExposes();
    expect(exposes.direction.get()).toBe('incoming');
    el.remove();
  });

  it('syncs direction from props', async () => {
    const el = document.createElement('base-message-root') as any;
    setElementProps(el, { direction: 'outgoing' });
    document.body.appendChild(el);
    await Promise.resolve();
    await Promise.resolve();
    const exposes = el.getExposes();
    expect(exposes.direction.get()).toBe('outgoing');
    el.remove();
  });
});
