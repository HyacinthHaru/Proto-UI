import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHiddenFirstActivation } from './hidden-first-activation';
const disposers: Array<() => void> = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
function fixture() {
  const parent = document.createElement('div');
  const root = document.createElement('div');
  parent.append(root);
  document.body.append(parent);
  const activate = vi.fn();
  const gate = createHiddenFirstActivation(document, activate);
  disposers.push(() => gate.dispose());
  return { parent, root, activate, gate };
}
describe('first visible activation', () => {
  it.each(['display', 'hidden', 'class'] as const)(
    'defers %s but activates once on reveal',
    async (kind) => {
      const { parent, root, activate, gate } = fixture();
      const style = document.createElement('style');
      style.textContent = '.concealed { display: none; }';
      parent.append(style);
      if (kind === 'display') parent.style.display = 'none';
      if (kind === 'hidden') parent.hidden = true;
      if (kind === 'class') parent.className = 'concealed';
      gate.add(root);
      expect(activate).not.toHaveBeenCalled();
      parent.removeAttribute('style');
      parent.hidden = false;
      parent.className = '';
      await vi.waitFor(() => expect(activate).toHaveBeenCalledOnce());
      parent.hidden = true;
      parent.hidden = false;
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(activate).toHaveBeenCalledOnce();
    }
  );
  it('does not defer opacity, visibility or offscreen presentation', () => {
    const { parent, root, activate, gate } = fixture();
    parent.style.cssText = 'opacity:0;visibility:hidden;position:absolute;left:-10000px';
    gate.add(root);
    expect(activate).toHaveBeenCalledWith(root);
  });
  it('activates a deferred node moved into a visible parent', async () => {
    const { parent, root, activate, gate } = fixture();
    parent.hidden = true;
    gate.add(root);
    document.body.append(root);
    await vi.waitFor(() => expect(activate).toHaveBeenCalledOnce());
  });
  it.each(['remove', 'dispose'] as const)('does not activate after %s', async (action) => {
    const { parent, root, activate, gate } = fixture();
    parent.hidden = true;
    gate.add(root);
    if (action === 'remove') root.remove();
    else gate.dispose();
    parent.hidden = false;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(activate).not.toHaveBeenCalled();
  });
  it('rechecks responsive display on resize without polling', async () => {
    const { root, activate, gate } = fixture();
    let narrow = true;
    const original = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
      if (element === root) return { display: narrow ? 'none' : 'block' } as CSSStyleDeclaration;
      return original(element, pseudo);
    });
    gate.add(root);
    expect(activate).not.toHaveBeenCalled();
    narrow = false;
    window.dispatchEvent(new Event('resize'));
    await vi.waitFor(() => expect(activate).toHaveBeenCalledOnce());
  });
  it('ignores unrelated runtime-internal style and class writes', async () => {
    const { parent, root, activate, gate } = fixture();
    parent.hidden = true;
    gate.add(root);
    const read = vi.spyOn(window, 'getComputedStyle');
    const unrelated = document.createElement('div');
    document.body.append(unrelated);
    unrelated.style.display = 'block';
    unrelated.className = 'runtime-update';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(read).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
});
