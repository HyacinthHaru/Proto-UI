import { afterEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock('./site-copy-command', () => ({ initCopyCommand: fake.init }));
import { initSiteCopyCommands } from './site-copy-client';
let dispose: (() => void) | undefined;
afterEach(() => {
  dispose?.();
  dispose = undefined;
  document.body.replaceChildren();
  localStorage.clear();
  fake.init.mockReset();
});
function fixture(hidden = true) {
  const parent = document.createElement('div');
  parent.dataset.adapterPanel = 'react';
  parent.style.display = hidden ? 'none' : '';
  const root = document.createElement('div');
  root.dataset.siteCopy = '';
  parent.append(root);
  document.body.append(parent);
  const destroy = vi.fn(async () => {});
  const syncSource = vi.fn();
  const preferences: string[] = [];
  fake.init.mockImplementation(() => {
    preferences.push(localStorage.getItem('preferred-prototypes-adapter') ?? 'wc');
    return { destroy, owner: { syncSource } };
  });
  return { parent, root, destroy, preferences };
}
describe('Copy bootstrap visibility', () => {
  it('reads latest preference on reveal and retains a mounted owner when rehidden', async () => {
    const { parent, root, destroy, preferences } = fixture();
    dispose = initSiteCopyCommands();
    expect(fake.init).not.toHaveBeenCalled();
    localStorage.setItem('preferred-prototypes-adapter', 'vue2');
    parent.style.display = '';
    await vi.waitFor(() => expect(fake.init).toHaveBeenCalledOnce());
    expect(preferences).toEqual(['vue2']);
    parent.style.display = 'none';
    parent.style.display = '';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fake.init).toHaveBeenCalledOnce();
    expect(destroy).not.toHaveBeenCalled();
    root.remove();
    await vi.waitFor(() => expect(destroy).toHaveBeenCalledOnce());
  });
  it('keeps hidden copy overlays pending until expansion', async () => {
    const { root } = fixture(false);
    root.hidden = true;
    dispose = initSiteCopyCommands();
    expect(fake.init).not.toHaveBeenCalled();
    root.hidden = false;
    await vi.waitFor(() => expect(fake.init).toHaveBeenCalledOnce());
  });
  it.each(['remove', 'swap', 'dispose'] as const)(
    'cancels pending activation on %s',
    async (action) => {
      const { parent, root } = fixture();
      dispose = initSiteCopyCommands();
      if (action === 'remove') root.remove();
      if (action === 'swap') document.dispatchEvent(new Event('astro:before-swap'));
      if (action === 'dispose') dispose();
      parent.style.display = '';
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(fake.init).not.toHaveBeenCalled();
    }
  );
  it('keeps visible no-panel controls eager, including inserted controls', async () => {
    const { root } = fixture(false);
    document.body.append(root);
    dispose = initSiteCopyCommands();
    expect(fake.init).toHaveBeenCalledOnce();
    const second = root.cloneNode() as HTMLElement;
    document.body.append(second);
    await vi.waitFor(() => expect(fake.init).toHaveBeenCalledTimes(2));
  });
});
