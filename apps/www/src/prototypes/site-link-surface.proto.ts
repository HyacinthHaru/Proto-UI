import { definePrototype, tw } from '@proto.ui/core';
import { SITE_LINK_ICONS, type SiteLinkIcon } from './site-link-icons';

export type SiteLinkAppearance = 'action' | 'icon' | 'nav' | 'text' | 'brand';
export type SiteLinkEmphasis = 'primary' | 'secondary' | 'minimal' | 'link';
export type SiteLinkSurfaceProps = {
  family: 'shadcn' | 'brutalist';
  appearance: SiteLinkAppearance;
  emphasis: SiteLinkEmphasis;
  icon: SiteLinkIcon | 'none';
  hovered: boolean;
  focusVisible: boolean;
  pressed: boolean;
  current: boolean;
};

const SIZE_TOKENS: Record<SiteLinkAppearance, string> = {
  action: 'min-h-11 px-4 py-2 gap-2 text-sm whitespace-nowrap',
  icon: 'size-11 p-0 whitespace-nowrap',
  nav: 'min-h-11 px-0 py-2 text-sm whitespace-nowrap',
  // Text inherits normal document wrapping; do not add a competing nowrap
  // baseline or an unsupported whitespace-normal token.
  text: 'min-h-6 px-0 py-0 text-sm',
  brand: 'min-h-11 px-0 py-2 text-base font-semibold tracking-tight whitespace-nowrap',
};

/** App-owned experimental visual composition, not an official Link protocol.
 * The containing native anchor alone owns semantics, focus and activation.
 * Host facts enter as controlled props; this surface has no interaction hooks,
 * event, state, method, role, tabindex or default-action owner. */
export const SiteLinkSurface = definePrototype<SiteLinkSurfaceProps>({
  name: 'site-link-surface',
  setup(def) {
    def.props.define({
      family: { type: 'enum', empty: 'fallback', options: ['shadcn', 'brutalist'] },
      appearance: {
        type: 'enum',
        empty: 'fallback',
        options: ['action', 'icon', 'nav', 'text', 'brand'],
      },
      emphasis: {
        type: 'enum',
        empty: 'fallback',
        options: ['primary', 'secondary', 'minimal', 'link'],
      },
      icon: {
        type: 'enum',
        empty: 'fallback',
        options: ['none', 'github', 'discord', 'x', 'bluesky'],
      },
      hovered: { type: 'boolean', empty: 'fallback' },
      focusVisible: { type: 'boolean', empty: 'fallback' },
      pressed: { type: 'boolean', empty: 'fallback' },
      current: { type: 'boolean', empty: 'fallback' },
    });
    def.props.setDefaults({
      family: 'shadcn',
      appearance: 'action',
      emphasis: 'secondary',
      icon: 'none',
      hovered: false,
      focusVisible: false,
      pressed: false,
      current: false,
    });
    def.feedback.style.use(
      tw(
        // Native anchors own pointer hit testing as well as activation. A
        // visual-only WC update may rebuild decoration; it must not replace
        // the browser's in-flight pointer/click target inside the anchor.
        'pointer-events-none inline-flex shrink-0 items-center justify-center border border-transparent bg-transparent text-foreground font-medium outline-none'
      )
    );
    for (const appearance of Object.keys(SIZE_TOKENS) as SiteLinkAppearance[]) {
      def.rule({
        when: (w) => w.prop('appearance').eq(appearance),
        intent: (i) => i.feedback.style.use(tw(SIZE_TOKENS[appearance])),
      });
    }
    def.rule({
      when: (w) =>
        w.all(
          w.prop('family').eq('shadcn'),
          w.any(w.prop('appearance').eq('icon'), w.prop('appearance').eq('action'))
        ),
      intent: (i) => i.feedback.style.use(tw('rounded-lg')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('family').eq('shadcn'),
          w.prop('appearance').eq('action'),
          w.prop('emphasis').eq('primary')
        ),
      intent: (i) => i.feedback.style.use(tw('bg-primary text-primary-foreground')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('family').eq('shadcn'),
          w.prop('appearance').eq('action'),
          w.prop('emphasis').eq('secondary')
        ),
      intent: (i) => i.feedback.style.use(tw('border-border bg-background text-foreground')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('family').eq('brutalist'),
          w.any(w.prop('appearance').eq('icon'), w.prop('appearance').eq('action'))
        ),
      intent: (i) =>
        i.feedback.style.use(
          tw(
            'rounded-none border-2 border-foreground bg-secondary-background text-foreground shadow-[2px_2px_0_0_var(--pui-foreground)]'
          )
        ),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('family').eq('brutalist'),
          w.prop('appearance').eq('action'),
          w.prop('emphasis').eq('primary')
        ),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground font-bold')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('hovered').eq(true),
          w.prop('family').eq('shadcn'),
          w.any(
            w.prop('appearance').eq('icon'),
            w.all(w.prop('appearance').eq('action'), w.prop('emphasis').eq('secondary'))
          )
        ),
      intent: (i) => i.feedback.style.use(tw('bg-muted text-foreground')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('hovered').eq(true),
          w.prop('family').eq('shadcn'),
          w.prop('appearance').eq('action'),
          w.prop('emphasis').eq('primary')
        ),
      intent: (i) => i.feedback.style.use(tw('bg-primary/80')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('hovered').eq(true),
          w.prop('family').eq('brutalist'),
          w.any(w.prop('appearance').eq('icon'), w.prop('appearance').eq('action'))
        ),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.any(w.prop('hovered').eq(true), w.prop('current').eq(true)),
          w.any(w.prop('appearance').eq('nav'), w.prop('appearance').eq('text'))
        ),
      intent: (i) => i.feedback.style.use(tw('underline underline-offset-4')),
    });
    def.rule({
      when: (w) => w.prop('current').eq(true),
      intent: (i) => i.feedback.style.use(tw('font-semibold')),
    });
    def.rule({
      when: (w) => w.prop('pressed').eq(true),
      intent: (i) => i.feedback.style.use(tw('translate-y-px shadow-none')),
    });
    def.rule({
      when: (w) => w.prop('focusVisible').eq(true),
      intent: (i) =>
        i.feedback.style.use(tw('ring-2 ring-ring ring-offset-2 ring-offset-background')),
    });
    return (renderer) => {
      const icon = renderer.read.props.get().icon;
      if (icon === 'none') return renderer.r.slot();
      const glyph = SITE_LINK_ICONS[icon];
      return renderer.svg.root(
        {
          viewBox: glyph.viewBox,
          width: 18,
          height: 18,
          'aria-hidden': 'true',
          fill: 'currentColor',
        },
        renderer.svg.path({ d: glyph.path })
      );
    };
  },
});
export default SiteLinkSurface;
