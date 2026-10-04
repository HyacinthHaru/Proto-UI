import { afterEach, describe, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { renderProtoStyleTokenCss } from '../../cli/src/services/proto-style-css';
import { BrutalistScrollAreaScrollbar } from '../brutalist/src/scroll-area';
import { ShadcnScrollAreaScrollbar } from '../shadcn/src/scroll-area';

const families = [
  {
    name: 'brutalist',
    prototype: BrutalistScrollAreaScrollbar,
    fill: 'bg-lavender',
    height: 'h-[calc(100%_+_2px)]',
  },
  {
    name: 'shadcn',
    prototype: ShadcnScrollAreaScrollbar,
    fill: 'bg-muted',
    height: 'h-[calc(100%_+_4px)]',
  },
];
const settle = async () => {
  for (let step = 0; step < 4; step++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
  for (let step = 0; step < 4; step++) await Promise.resolve();
};
afterEach(async () => {
  document.body.replaceChildren();
  await settle();
});

describe('styled Scrollbar private passive corner', () => {
  it.each(families)(
    '$name owns only a horizontal pointer-inert template and preserves caller slots',
    async ({ prototype, fill, height }) => {
      const Element = AdaptToWebComponent(prototype);
      const track = new Element();
      const caller = document.createElement('span');
      caller.className = 'caller-owned';
      track.append(caller);
      setElementProps(track, { orientation: 'horizontal' });
      document.body.append(track);
      await settle();
      const corner = () =>
        [...track.children].find((child) => child !== caller && child.tagName === 'SPAN') as
          | HTMLElement
          | undefined;
      const initial = corner();
      expect(initial).toBeDefined();
      expect(initial?.getAttribute('data-pui-style')).toContain('pointer-events-none');
      expect(initial?.getAttribute('data-pui-style')).toContain('overflow-hidden');
      expect(initial?.getAttribute('data-pui-style')).toContain(
        'w-[var(--proto-ui-scroll-track-end-inset,0px)]'
      );
      expect(initial?.getAttribute('data-pui-style')).toContain(height);
      expect(initial?.firstElementChild?.getAttribute('data-pui-style')).toContain(fill);
      for (const element of [initial!, initial!.firstElementChild!]) {
        expect(element.hasAttribute('data-pui-root')).toBe(false);
        expect(element.hasAttribute('tabindex')).toBe(false);
        expect(element.hasAttribute('role')).toBe(false);
        const tokens = element.getAttribute('data-pui-style')!.split(' ');
        for (const token of tokens)
          expect(renderProtoStyleTokenCss([token]), token).not.toContain('Unsupported tokens');
      }
      expect(track.contains(caller)).toBe(true);
      setElementProps(track, { orientation: 'vertical' });
      await settle();
      expect(corner()).toBeUndefined();
      expect(initial?.isConnected).toBe(false);
      expect(track.contains(caller)).toBe(true);
      setElementProps(track, { orientation: 'horizontal' });
      await settle();
      expect(corner()).toBeDefined();
      expect(corner()).not.toBe(initial);
      expect(caller.className).toBe('caller-owned');
      track.remove();
      await settle();
      expect(caller.isConnected).toBe(false);
    }
  );
});
