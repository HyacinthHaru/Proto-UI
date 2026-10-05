/** Website-owned decorative CTA artwork. Social icon-only links stay separate. */
export const HOME_ACTION_ICONS = {
  external: {
    viewBox: '0 0 24 24',
    path: 'M14 3h7v7h-2V6.414l-9.293 9.293-1.414-1.414L17.586 5H14V3ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  },
} as const;
export type HomeActionIcon = keyof typeof HOME_ACTION_ICONS;
export function homeActionIcon(value: unknown): HomeActionIcon | undefined {
  return value === 'external' ? value : undefined;
}
export function appendHomeActionGlyph(slot: HTMLElement, icon: HomeActionIcon): void {
  const source = HOME_ACTION_ICONS[icon];
  const svg = slot.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', source.viewBox);
  svg.setAttribute('width', '18');
  svg.setAttribute('height', '18');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.marginInlineStart = '0.5rem';
  const path = slot.ownerDocument.createElementNS(svg.namespaceURI, 'path');
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('d', source.path);
  svg.append(path);
  slot.append(svg);
}
