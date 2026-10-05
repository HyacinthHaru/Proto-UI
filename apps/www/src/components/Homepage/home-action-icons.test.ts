import { describe, expect, it } from 'vitest';
import { appendHomeActionGlyph, homeActionIcon } from './home-action-icons';

describe('bounded hero decorative icon mapping', () => {
  it('accepts the configured external icon without interpreting arbitrary inputs', () => {
    expect(homeActionIcon('external')).toBe('external');
    for (const value of [undefined, null, '', 'github', 'unknown', '<svg/>', {}, 1])
      expect(homeActionIcon(value)).toBeUndefined();
  });
  it('creates passive artwork with no name or focus owner', () => {
    const slot = document.createElement('span');
    appendHomeActionGlyph(slot, 'external');
    const svg = slot.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.style.marginInlineStart).toBe('0.5rem');
    expect(svg.querySelector('path')?.getAttribute('d')).toBeTruthy();
    expect(slot.textContent).toBe('');
    expect(slot.querySelector('a,button,[tabindex],[role]')).toBeNull();
  });
});
