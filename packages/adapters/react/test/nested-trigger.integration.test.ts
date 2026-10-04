import * as React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { button } from '@proto.ui/prototypes-base';
import { definePrototype } from '@proto.ui/core';
import {
  asButton,
  type ButtonExposes,
  type ButtonStateHandles,
} from '../../../prototypes/base/src/button';

import { createReactAdapter } from '../src';
import type { ReactAdapterHandle } from '../src/adapt';

type ButtonConsumerExposes = {
  focusSelf: ButtonExposes['focusSelf']['fn'];
  focused: Pick<ButtonStateHandles['focused'], 'get'>;
};

const mountedRoots: Array<{ unmount(): void }> = [];
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(async () => {
  for (const root of mountedRoots.splice(0)) {
    await act(async () => root.unmount());
  }
  document.body.replaceChildren();
});

describe('adapter-react: nested trigger routing', () => {
  it('defers outer native focus until the resolved inner Trigger surface is ready', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    mountedRoots.push(root);
    const outerRef = React.createRef<ReactAdapterHandle>();
    const innerRef = React.createRef<ReactAdapterHandle>();
    const innerProto = definePrototype({
      name: 'react-inner-trigger-native-readiness',
      setup(def) {
        asButton();
        def.expose.event('beforeReady');
        def.lifecycle.onUpdated((run) => run.expose.emit('beforeReady'));
        return (renderer) => [renderer.el('span', 'Inner')];
      },
    });
    const adapt = createReactAdapter(React);
    const Outer = adapt(button, { rootTag: 'div' });
    const Inner = adapt(innerProto, { rootTag: 'div' });
    const duringCommit: Array<{ active: boolean; focused: boolean }> = [];
    let requestFocus = false;
    await act(async () => {
      root.render(
        React.createElement(
          Outer,
          { ref: outerRef },
          React.createElement(Inner, {
            ref: innerRef,
            onBeforeReady: () => {
              if (!requestFocus) return;
              requestFocus = false;
              (outerRef.current!.getExposes() as ButtonConsumerExposes).focusSelf();
              const target = host.querySelectorAll<HTMLElement>('[data-pui-root]')[1]!;
              duringCommit.push({
                active: document.activeElement === target,
                focused: (innerRef.current!.getExposes() as ButtonConsumerExposes).focused.get(),
              });
            },
          })
        )
      );
    });
    const innerTarget = host.querySelectorAll<HTMLElement>('[data-pui-root]')[1]!;
    requestFocus = true;
    await act(async () => innerRef.current!.update());
    expect(duringCommit).toEqual([{ active: false, focused: false }]);
    expect(document.activeElement).toBe(innerTarget);
    expect((innerRef.current!.getExposes() as ButtonConsumerExposes).focused.get()).toBe(true);
  });

  it('merges nested adapted triggers while accepting activation only from the inner surface', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    mountedRoots.push(root);

    const adapt = createReactAdapter(React);
    const Button = adapt(button, {
      rootTag: 'div',
      schedule: (task) => task(),
    });
    const outerClick = vi.fn();
    const innerClick = vi.fn();

    await act(async () => {
      root.render(
        React.createElement(
          Button,
          { onClick: outerClick },
          React.createElement(Button, { onClick: innerClick }, 'Inner')
        )
      );
      await Promise.resolve();
    });

    const roots = host.querySelectorAll<HTMLElement>('[data-pui-root]');
    expect(roots).toHaveLength(2);
    expect(roots[0]!.tabIndex).toBe(-1);
    expect(roots[0]!.hasAttribute('tabindex')).toBe(false);
    expect(roots[0]!.hasAttribute('role')).toBe(false);
    expect(roots[1]!.tabIndex).toBe(0);
    expect(roots[1]!.getAttribute('role')).toBe('button');

    await act(async () => {
      roots[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
      await Promise.resolve();
    });

    expect(innerClick).not.toHaveBeenCalled();
    expect(outerClick).not.toHaveBeenCalled();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    roots[1]!.focus();
    expect(roots[1]!.hasAttribute('data-focus-visible')).toBe(true);
    expect(roots[0]!.hasAttribute('data-focus-visible')).toBe(false);

    await act(async () => {
      roots[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    expect(innerClick).toHaveBeenCalledOnce();
    expect(outerClick).toHaveBeenCalledOnce();
  });
});
