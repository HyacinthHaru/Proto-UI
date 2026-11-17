// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { loadReact } from './react-runtime';

describe('real reader React loader', () => {
  it('shares in-flight and completed runtime acquisition', async () => {
    const first = loadReact();
    expect(loadReact()).toBe(first);
    const runtime = await first;
    expect(await loadReact()).toBe(runtime);
  });

  it('retains matched React 18 client roots, commit and portal APIs', async () => {
    const { React, ReactDOM } = await loadReact();
    expect(React.version).toBe('18.3.1');
    for (const key of ['createRoot', 'hydrateRoot', 'flushSync', 'createPortal'])
      expect(typeof ReactDOM[key], key).toBe('function');
  });

  it('commits before synchronous consumer setup and cleans up real body portals', async () => {
    const { React, ReactDOM } = await loadReact();
    const host = document.createElement('div');
    const portal = document.createElement('div');
    document.body.append(host, portal);
    const root = ReactDOM.createRoot(host);
    try {
      ReactDOM.flushSync(() =>
        root.render(
          React.createElement(
            'div',
            { 'data-reader-content': '' },
            ReactDOM.createPortal(
              React.createElement('span', { 'data-reader-portal': '' }, 'Real portal'),
              portal
            )
          )
        )
      );
      // Actual DOM immediately after the commit boundary, without frames or mocked modules.
      expect(host.querySelector('[data-reader-content]')).not.toBeNull();
      expect(portal.querySelector('[data-reader-portal]')?.textContent).toBe('Real portal');
      expect(host.querySelector('[data-reader-portal]')).toBeNull();
    } finally {
      ReactDOM.flushSync(() => root.unmount());
      host.remove();
      portal.remove();
    }
    expect(host.innerHTML).toBe('');
    expect(portal.innerHTML).toBe('');
  });

  it('drops the shared acquisition after a dependency fails', async () => {
    const failure = new Error('transient client-root import');
    let rejectOnce = true;
    vi.resetModules();
    vi.doMock('./retryable-module', () => ({
      retryableModule: (load: () => Promise<unknown>, url: string) => () => {
        if (url === 'react-client' && rejectOnce) {
          rejectOnce = false;
          return Promise.reject(failure);
        }
        return load();
      },
    }));
    vi.doMock('virtual:proto-ui/runtime-retry-urls', () => ({
      default: { react: 'react', reactDom: 'react-dom', reactDomClient: 'react-client' },
    }));
    try {
      const { loadReact: reload } = await import('./react-runtime');
      await expect(reload()).rejects.toBe(failure);
      const runtime = await reload();
      expect(runtime.React.version).toBe('18.3.1');
      expect(typeof runtime.ReactDOM.createRoot).toBe('function');
      expect(await reload()).toBe(runtime);
    } finally {
      vi.doUnmock('./retryable-module');
      vi.doUnmock('virtual:proto-ui/runtime-retry-urls');
      vi.resetModules();
    }
  });
});
