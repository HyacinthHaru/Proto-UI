import { afterEach, expect, it } from 'vitest';
import { definePrototype } from '@proto.ui/core';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import {
  asMessageScrollerViewport,
  asMessageScrollerJump,
  messageScrollerRoot,
} from '../src/message-scroller';

const captures: {
  viewport?: ReturnType<typeof asMessageScrollerViewport>;
  jump?: ReturnType<typeof asMessageScrollerJump>;
} = {};
AdaptToWebComponent(messageScrollerRoot, { registerAs: 'capture-message-scroller-root' });
AdaptToWebComponent(
  definePrototype({
    name: 'capture-message-scroller-viewport',
    setup(def) {
      const capture = asMessageScrollerViewport();
      captures.viewport = capture;
      for (const key of [
        '@scroll/verticalAtEnd',
        '@scroll/endFollowState',
        '@scroll/endFollowRequestStatus',
      ] as const) {
        // Observe during setup, just as an actual prototype consumer would.
        capture.getState?.(key)?.watch(() => {});
      }
      capture.getState?.('a11yLabel')?.setDefault('Capture messages');
      def.lifecycle.onMounted(() => capture.getState?.('a11yLabel')?.set('Renamed messages'));
    },
  })
);
AdaptToWebComponent(
  definePrototype({
    name: 'capture-message-scroller-jump',
    setup(def) {
      const capture = asMessageScrollerJump();
      captures.jump = capture;
      capture.getState?.('atEnd')?.setDefault(true);
      capture.getState?.('newContentCount')?.setDefault(0);
      def.lifecycle.onMounted(() => {
        capture.getState?.('atEnd')?.set(false);
        capture.getState?.('newContentCount')?.set(3);
      });
    },
  })
);
afterEach(() => {
  document.body.replaceChildren();
  captures.viewport = undefined;
  captures.jump = undefined;
});
it('preserves real Scroll observed captures while retaining authored label and Jump writes', async () => {
  const root = document.createElement('capture-message-scroller-root');
  root.append(
    document.createElement('capture-message-scroller-viewport'),
    document.createElement('capture-message-scroller-jump')
  );
  document.body.append(root);
  for (let n = 0; n < 24; n++) await Promise.resolve();
  const viewport = captures.viewport;
  expect(viewport).toBeDefined();
  for (const key of [
    '@scroll/verticalAtEnd',
    '@scroll/endFollowState',
    '@scroll/endFollowRequestStatus',
  ] as const) {
    const fact = viewport?.getState?.(key);
    expect(fact, key).toBeDefined();
    expect(fact).toBe(viewport?.stateHandles?.[key]);
    expect(typeof fact?.get).toBe('function');
    expect(typeof fact?.watch).toBe('function');
    expect(Reflect.has(fact!, 'set'), key).toBe(false);
    expect(Reflect.has(fact!, 'setDefault'), key).toBe(false);
  }
  expect(typeof viewport?.getState?.('@scroll/verticalAtEnd')?.get()).toBe('boolean');
  expect(['off', 'pending', 'following', 'paused']).toContain(
    viewport?.getState?.('@scroll/endFollowState')?.get()
  );
  expect(['idle', 'pending', 'applied', 'rejected']).toContain(
    viewport?.getState?.('@scroll/endFollowRequestStatus')?.get()
  );
  const label = viewport?.getState?.('a11yLabel');
  expect(typeof label?.setDefault).toBe('function');
  expect(label?.get()).toBe('Renamed messages');
  const jump = captures.jump;
  expect(jump).toBeDefined();
  expect(typeof jump?.getState?.('atEnd')?.setDefault).toBe('function');
  expect(jump?.getState?.('atEnd')?.get()).toBe(false);
  expect(jump?.getState?.('newContentCount')?.get()).toBe(3);
});
