import { definePrototype, tw } from '@proto.ui/core';

/** Website-only experimental presentation surface, not a public Card protocol.
 * Native content semantics and preview data belong to the app. This Prototype
 * owns the selected family's visual shell and projects stable slot content. */
export const SitePreviewSurface = definePrototype<{
  family: 'shadcn' | 'brutalist';
  emphasis: 'plain' | 'accent';
}>({
  name: 'site-preview-surface',
  setup(def) {
    def.props.define({
      family: { type: 'enum', empty: 'fallback', options: ['shadcn', 'brutalist'] },
      emphasis: { type: 'enum', empty: 'fallback', options: ['plain', 'accent'] },
    });
    def.props.setDefaults({ family: 'shadcn', emphasis: 'plain' });
    def.feedback.style.use(tw('block w-full min-w-0 border p-4 text-foreground'));
    def.rule({
      when: (w) => w.prop('family').eq('shadcn'),
      intent: (i) => i.feedback.style.use(tw('rounded-2xl border-border bg-background shadow-sm')),
    });
    def.rule({
      when: (w) => w.all(w.prop('family').eq('shadcn'), w.prop('emphasis').eq('accent')),
      intent: (i) => i.feedback.style.use(tw('bg-muted')),
    });
    def.rule({
      when: (w) => w.prop('family').eq('brutalist'),
      intent: (i) =>
        i.feedback.style.use(
          tw(
            'rounded-none border-2 border-foreground bg-secondary-background shadow-[3px_3px_0_0_var(--pui-foreground)]'
          )
        ),
    });
    def.rule({
      when: (w) => w.all(w.prop('family').eq('brutalist'), w.prop('emphasis').eq('accent')),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground')),
    });
    return (renderer) => renderer.r.slot();
  },
});

export default SitePreviewSurface;
