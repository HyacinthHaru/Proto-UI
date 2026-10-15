import { afterEach, describe, expect, it, vi } from 'vitest';
import { definePrototype } from '@proto.ui/core';
import { AdaptToWebComponent } from '../src';
import { getLogicalParent } from '../src/platform/instance-tree';

const flush = async () => {
  for (let i = 0; i < 40; i++) await Promise.resolve();
};
let serial = 0;
afterEach(async () => {
  document.body.replaceChildren();
  await flush();
  vi.restoreAllMocks();
});

// A-WEB-COMPONENT-0001-G/I: native callback delivery is not proof of a live
// connection. Retain instance ownership through sync moves, retire only after
// confirmed disconnection, and admit a future genuine connection normally.
describe('WC stale connected reactions', () => {
  it.each([false, true])(
    'skips never-connected activation, then initializes on real attach (shadow=%s)',
    async (shadow) => {
      let setups = 0;
      const C = AdaptToWebComponent(
        definePrototype({
          name: `stale-first-${++serial}`,
          setup() {
            setups++;
            return (r) => r.el('span', 'Ready');
          },
        }),
        { shadow }
      );
      const host = new C() as any;
      host.connectedCallback();
      expect(setups).toBe(0);
      expect(host._mountedOnce).toBe(false);
      expect(host._controller).toBeNull();
      document.body.append(host);
      await flush();
      expect(setups).toBe(1);
      expect((host.shadowRoot ?? host).textContent).toBe('Ready');
    }
  );
  it('preserves an existing logical parent through stale delivery and resolves a real reparent', async () => {
    const C = AdaptToWebComponent(
      definePrototype({
        name: `stale-owner-${++serial}`,
        setup() {
          return (r) => r.slot();
        },
      })
    );
    const first = new C() as any,
      second = new C() as any,
      child = new C() as any;
    first.append(child);
    document.body.append(first, second);
    await flush();
    const token = child._instanceToken,
      controller = child._controller;
    expect(getLogicalParent(token)).toBe(first._instanceToken);
    child.remove();
    child.connectedCallback();
    expect(getLogicalParent(token)).toBe(first._instanceToken);
    expect(child._controller).toBe(controller);
    second.append(child);
    await flush();
    expect(getLogicalParent(token)).toBe(second._instanceToken);
    expect(child._instanceToken).toBe(token);
    expect(child._controller).toBe(controller);
  });
  it('ignores stale delivery during terminal retirement and permits the next real generation', async () => {
    let setups = 0,
      disposed = 0,
      reconnectRequested: boolean | undefined;
    let host: any;
    const C = AdaptToWebComponent(
      definePrototype({
        name: `stale-terminal-${++serial}`,
        setup(def) {
          setups++;
          def.lifecycle.onBeforeDispose(() => {
            disposed++;
            expect(host.isConnected).toBe(false);
            expect(host._terminalDisposing).toBe(true);
            host.connectedCallback();
            reconnectRequested = host._terminalReconnectRequested;
          });
          return (r) => r.slot();
        },
      })
    );
    host = new C();
    document.body.append(host);
    await flush();
    const token = host._instanceToken;
    host.remove();
    await flush();
    expect(disposed).toBe(1);
    expect(reconnectRequested).toBe(false);
    expect(host._mountedOnce).toBe(false);
    expect(host._controller).toBeNull();
    document.body.append(host);
    await flush();
    expect(setups).toBe(2);
    expect(host._instanceToken).not.toBe(token);
    expect(host._controller).not.toBeNull();
  });
});
