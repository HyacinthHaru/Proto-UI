import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerNativeContentContainer, withNativeContentLease } from './native-content-lease';
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});
function fixture(register: boolean) {
  const link = document.createElement('a');
  link.href = '/retained';
  const oldSurface = document.createElement('span'),
    oldText = document.createElement('span'),
    source = document.createElement('span');
  source.textContent = 'Original native source';
  oldText.append(source);
  oldSurface.append(oldText);
  link.append(oldSurface);
  document.body.append(link);
  if (register) {
    registerNativeContentContainer(oldSurface, [source]);
    registerNativeContentContainer(oldText, [source]);
  }
  const nextSurface = document.createElement('span'),
    nextText = document.createElement('span');
  const move = () => {
    nextText.append(source);
    nextSurface.append(nextText);
    oldSurface.replaceWith(nextSurface);
  };
  return { link, source, oldSurface, nextText, move };
}
describe('native source boundary normalization', () => {
  for (const [anchor, focus] of [
    [0, 1],
    [1, 0],
  ])
    it(`maps retired generated Surface endpoints ${anchor} → ${focus} to the same authored content`, () => {
      const { link, source, oldSurface, nextText, move } = fixture(true);
      const selection = document.getSelection()!;
      selection.setBaseAndExtent(oldSurface, anchor!, oldSurface, focus!);
      // HappyDOM 15 aliases focusOffset to anchorOffset; this getter fixture tests
      // forwarding only. Real forward/backward Selection remains in browser CI.
      vi.spyOn(selection, 'focusOffset', 'get').mockReturnValue(focus!);
      const restore = vi.spyOn(selection, 'setBaseAndExtent');
      withNativeContentLease(link, move);
      expect(oldSurface.isConnected).toBe(false);
      expect(source.isConnected).toBe(true);
      expect(restore).toHaveBeenLastCalledWith(nextText, anchor, nextText, focus);
      expect(link.textContent).toBe('Original native source');
    });
  it('negative control cannot claim a retired wrapper is retained without a source mapping', () => {
    const { link, oldSurface, move } = fixture(false);
    const selection = document.getSelection()!;
    selection.setBaseAndExtent(oldSurface, 0, oldSurface, 1);
    vi.spyOn(selection, 'focusOffset', 'get').mockReturnValue(1);
    const restore = vi.spyOn(selection, 'setBaseAndExtent');
    withNativeContentLease(link, move);
    expect(oldSurface.isConnected).toBe(false);
    expect(restore).not.toHaveBeenCalled();
  });
});

describe('passive shell ancestor boundary ownership', () => {
  for (const [anchor, focus] of [
    [0, 1],
    [1, 0],
  ]) {
    it(`restores registered ancestor endpoints ${anchor} → ${focus} for the retained source scope`, () => {
      const { source, oldSurface, nextText, move } = fixture(true);
      const selection = document.getSelection()!;
      selection.setBaseAndExtent(oldSurface, anchor!, oldSurface, focus!);
      vi.spyOn(selection, 'focusOffset', 'get').mockReturnValue(focus!);
      const restore = vi.spyOn(selection, 'setBaseAndExtent');
      withNativeContentLease(source, move);
      expect(restore).toHaveBeenLastCalledWith(nextText, anchor, nextText, focus);
    });
  }
  it('does not claim an unrelated registered container', () => {
    const { source, oldSurface, move } = fixture(true);
    const other = document.createElement('div');
    other.textContent = 'Other owner';
    document.body.append(other);
    registerNativeContentContainer(oldSurface, [other]);
    const selection = document.getSelection()!;
    selection.setBaseAndExtent(oldSurface, 0, oldSurface, 1);
    const restore = vi.spyOn(selection, 'setBaseAndExtent');
    withNativeContentLease(source, move);
    expect(restore).not.toHaveBeenCalled();
  });
});
