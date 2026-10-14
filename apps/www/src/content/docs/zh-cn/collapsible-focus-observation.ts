// Serialized by Playwright. Observe the failed native surface without changing focus.
export function collectCollapsibleFocusFailure(elements: Element[]) {
  const element = elements.length === 1 ? elements[0] : null;
  const doc = elements[0]?.ownerDocument ?? document;
  const win = doc.defaultView!;
  const summarize = (target: Element | null) => {
    if (!target) return null;
    const style = win.getComputedStyle(target);
    const rect = target.getBoundingClientRect();
    return {
      tag: target.tagName,
      id: target.id,
      role: target.getAttribute('role'),
      tabIndex: target.getAttribute('tabindex'),
      text: target.textContent?.trim().slice(0, 120),
      connected: target.isConnected,
      hidden: target.hasAttribute('hidden'),
      inertAncestor: !!target.closest('[inert]'),
      pendingAncestor: !!target.closest('[data-pui-view-pending]'),
      detachedAncestor: !!target.closest('[data-pui-view-detached]'),
      generation: target
        .closest('[data-projection-generation-state]')
        ?.getAttribute('data-projection-generation-state'),
      display: style.display,
      visibility: style.visibility,
      pointerEvents: style.pointerEvents,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      materialQuality: target.getAttribute('data-material-quality'),
    };
  };
  const previewer = element?.closest<HTMLElement>('[data-previewer-id]');
  const evidence = previewer as
    | (HTMLElement & {
        __puiCollapsibleEvidence?: unknown[];
        __puiCollapsibleLastPointerTarget?: Element | null;
      })
    | null;
  const input = evidence?.__puiCollapsibleEvidence;
  const pointerTarget = evidence?.__puiCollapsibleLastPointerTarget;
  return {
    matchCount: elements.length,
    focused: element ? doc.activeElement === element : null,
    matches: elements.map(summarize),
    expected: summarize(element),
    active: summarize(doc.activeElement),
    pointerTargetIsExpected: element && pointerTarget ? pointerTarget === element : null,
    pointerTarget: summarize(pointerTarget ?? null),
    runtime: previewer?.dataset.projectionRuntime,
    projectionState: previewer?.dataset.projectionState,
    recentInput: input?.slice(-30) ?? [],
  };
}

// Serialized by Playwright for normal polling. This deliberately preserves the
// document.activeElement identity contract, including Shadow DOM retargeting:
// it does not traverse shadowRoot.activeElement or switch to ownerDocument.
// evaluateAll re-resolves every sample; no old handle or first-match shortcut.
export function collectCollapsibleFocusSample(elements: Element[]) {
  if (elements.length !== 1)
    throw new Error(`Expected exactly one Collapsible focus target; received ${elements.length}`);
  const element = elements[0]!;
  const browserNow = performance.now();
  const active = document.activeElement;
  const identify = (node: Element | null) =>
    node
      ? {
          tag: node.tagName,
          id: node.id,
          role: node.getAttribute('role'),
          ref: node.closest('[data-demo-ref]')?.getAttribute('data-demo-ref') ?? null,
          connected: node.isConnected,
        }
      : null;
  const host = element.closest('[data-previewer-id]') as
    | (HTMLElement & { __puiCollapsibleLastPointerTarget?: Element | null })
    | null;
  const pointerTarget = host?.__puiCollapsibleLastPointerTarget;
  return {
    matchCount: elements.length,
    focused: element.isConnected && active === element,
    browserNow,
    browserTimeOrigin: performance.timeOrigin,
    expected: identify(element),
    active: identify(active),
    expectedIsPointerTarget: pointerTarget ? element === pointerTarget : null,
    activeIsPointerTarget: pointerTarget ? active === pointerTarget : null,
  };
}

// The caller passes the original ElementHandles, never a selector for new views.
// The old loop silently accepted an empty array; that cannot prove teardown of
// the already asserted four disclosures. Reject that evidence gap explicitly.
export function collectCollapsibleViewConnections(elements: Node[]) {
  if (!elements.length) throw new Error('Expected original Collapsible views before teardown');
  return elements.map((element) => element.isConnected);
}
