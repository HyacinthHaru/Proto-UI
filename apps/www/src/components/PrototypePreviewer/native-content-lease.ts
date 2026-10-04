/** Preserve browser-owned focus and directional Selection around a physical
 * composition move. Source nodes are retained, never cloned or serialized. */
export function withNativeContentLease(scope: HTMLElement, move: () => void): void {
  const document = scope.ownerDocument;
  const focused = document.activeElement as HTMLElement | null;
  const ownedFocus = focused && (focused === scope || scope.contains(focused));
  const selection = document.getSelection();
  const anchor = selection?.anchorNode;
  const extent = selection?.focusNode;
  const anchorOffset = selection?.anchorOffset ?? 0;
  const extentOffset = selection?.focusOffset ?? 0;
  const ownedSelection =
    !!selection && ((anchor && scope.contains(anchor)) || (extent && scope.contains(extent)));
  move();
  if (ownedFocus && focused.isConnected && document.activeElement !== focused)
    focused.focus({ preventScroll: true });
  if (ownedSelection && anchor?.isConnected && extent?.isConnected) {
    try {
      selection!.setBaseAndExtent(anchor, anchorOffset, extent, extentOffset);
    } catch {
      /* Connected callbacks may edit source lengths. Cleanup still completes. */
    }
  }
}
