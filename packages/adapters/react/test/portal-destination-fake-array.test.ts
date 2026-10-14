import { expect, it } from 'vitest';
import { createFakeReactRuntime } from './utils/fake-react';

it('the fake renderer preserves actual root-array siblings and the Adapter host identity', () => {
  const fake = createFakeReactRuntime();
  const hostRef = { current: null as HTMLElement | null };
  const originRef = { current: null as HTMLElement | null };
  const Component = fake.runtime.forwardRef((props: { origin: boolean; text: string }) => {
    const host = fake.runtime.createElement(
      'div',
      { ref: hostRef, 'data-pui-root': '' },
      props.text
    );
    return props.origin
      ? [
          fake.runtime.createElement('span', { ref: originRef, 'data-pui-portal-origin': '' }),
          [host],
        ]
      : host;
  });
  const mounted = fake.render(Component, { origin: false, text: 'first' });
  try {
    const host = mounted.root!;
    const parent = host.parentElement!;
    mounted.update({ origin: true, text: 'second' });
    expect(mounted.root).toBe(host);
    expect(hostRef.current).toBe(host);
    expect([...parent.children]).toEqual([originRef.current, host]);
    expect(host.textContent).toBe('second');
    mounted.update({ origin: false, text: 'third' });
    expect(mounted.root).toBe(host);
    expect([...parent.children]).toEqual([host]);
    expect(host.textContent).toBe('third');
  } finally {
    mounted.unmount();
  }
});

it('the fake renderer flattens Context-wrapped arrays without discarding later siblings', () => {
  const fake = createFakeReactRuntime({ context: true });
  const context = fake.runtime.createContext!(null);
  const Component = fake.runtime.forwardRef(() =>
    fake.runtime.createElement(context.Provider, { value: null }, [
      fake.runtime.createElement('span', { 'data-pui-portal-origin': '' }),
      fake.runtime.createElement('div', { 'data-pui-root': '' }, 'Content'),
    ])
  );
  const mounted = fake.render(Component);
  try {
    expect(mounted.root?.tagName).toBe('DIV');
    expect(mounted.root?.textContent).toBe('Content');
    expect([...mounted.root!.parentElement!.children].map((node) => node.tagName)).toEqual([
      'SPAN',
      'DIV',
    ]);
  } finally {
    mounted.unmount();
  }
});

it('the lightweight fake renderer does not advertise an unimplemented default portal capability', () => {
  expect(createFakeReactRuntime().runtime.createPortal).toBeUndefined();
});

it('the explicit fake portal capability renders the host into its actual destination', () => {
  const destination = document.createElement('div');
  document.body.append(destination);
  const fake = createFakeReactRuntime({ createPortal: (children) => children });
  const Component = fake.runtime.forwardRef(() => [
    fake.runtime.createElement('span', { 'data-pui-portal-origin': '' }),
    fake.runtime.createPortal!(
      fake.runtime.createElement('div', { 'data-pui-root': '' }, 'Portalled'),
      destination
    ),
  ]);
  const mounted = fake.render(Component);
  try {
    expect(mounted.root!.parentElement).toBe(destination);
    expect(destination.childNodes).toHaveLength(1);
    expect(mounted.root!.textContent).toBe('Portalled');
    expect(document.querySelector('[data-pui-portal-origin]')?.parentElement).not.toBe(destination);
  } finally {
    mounted.unmount();
    expect(destination.childNodes).toHaveLength(0);
    destination.remove();
  }
});

it('the fake renderer reruns no-dependency layout effects and preserves explicit empty-array effects', () => {
  const fake = createFakeReactRuntime();
  const everyCommit: string[] = [];
  const once: string[] = [];
  const Component = fake.runtime.forwardRef((props: { value: string }) => {
    fake.runtime.useLayoutEffect(() => {
      everyCommit.push(props.value);
    });
    fake.runtime.useLayoutEffect(() => {
      once.push(props.value);
    }, []);
    return fake.runtime.createElement('div', { 'data-pui-root': '' }, props.value);
  });
  const mounted = fake.render(Component, { value: 'first' });
  try {
    mounted.update({ value: 'second' });
    expect(everyCommit).toEqual(['first', 'second']);
    expect(once).toEqual(['first']);
  } finally {
    mounted.unmount();
  }
});
