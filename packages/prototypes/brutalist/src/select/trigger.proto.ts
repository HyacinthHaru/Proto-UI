import { definePrototype, type RendererHandle, tw } from '@proto.ui/core';
import { asSelectTrigger } from '@proto.ui/prototypes-base/select';
import type { BrutalistSelectTriggerExposes, BrutalistSelectTriggerProps } from './types';

function renderChevron(renderer: Pick<RendererHandle<any>, 'svg' | 'el'>) {
  return renderer.el(
    'span',
    { style: tw('pointer-events-none flex shrink-0 items-center opacity-50') },
    renderer.svg.root(
      {
        viewBox: '0 0 24 24',
        width: 16,
        height: 16,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      },
      renderer.svg.path({ d: 'm6 9 6 6 6-6' })
    )
  );
}

const selectTrigger = definePrototype<BrutalistSelectTriggerProps, BrutalistSelectTriggerExposes>({
  name: 'brutalist-select-trigger',
  setup(def) {
    // P-BRUTALIST-SELECT-TRIGGER-SIZE-PROP
    def.props.define({
      size: { type: 'enum', empty: 'fallback', options: ['sm', 'default'] },
    });
    def.props.setDefaults({ size: 'default' });

    // P-BRUTALIST-SELECT-TRIGGER-BASE-INHERITANCE,
    // P-BRUTALIST-SELECT-TRIGGER-CURRENT-BASE-DEVIATIONS
    const state = asSelectTrigger().stateHandles;
    if (!state) {
      throw new Error('[brutalist-select-trigger] Select Trigger must project command states.');
    }
    const { disabled, hovered, focusVisible, pressed, placeholder } = state;

    // P-BRUTALIST-SELECT-TRIGGER-CURRENT-VISUAL-SURFACE
    def.feedback.style.use(
      tw(
        'flex items-center justify-between gap-2 rounded-none border-2 border-black bg-secondary-background px-3 py-2 text-sm whitespace-nowrap shadow-[5px_5px_0_0_var(--pui-foreground)] outline-none select-none'
      )
    );
    // P-BRUTALIST-SELECT-TRIGGER-STATE-DRIVEN-STYLES
    def.rule({
      when: (w) => w.prop('size').eq('default'),
      intent: (i) => i.feedback.style.use(tw('h-9')),
    });
    def.rule({
      when: (w) => w.prop('size').eq('sm'),
      intent: (i) => i.feedback.style.use(tw('h-8')),
    });
    def.rule({
      when: (w) => w.state(placeholder).eq(true),
      intent: (i) => i.feedback.style.use(tw('text-muted-foreground')),
    });
    def.rule({
      when: (w) => w.state(hovered).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('-translate-x-0.5 -translate-y-0.5 shadow-[8px_8px_0_0_var(--pui-foreground)]')
        ),
    });
    def.rule({
      when: (w) => w.state(pressed).eq(true),
      intent: (i) => i.feedback.style.use(tw('translate-x-[5px] translate-y-[5px] shadow-none')),
    });
    def.rule({
      when: (w) => w.state(focusVisible).eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('outline-none ring-2 ring-ring ring-offset-2 ring-offset-background')
        ),
    });
    def.rule({
      when: (w) => w.state(disabled).eq(true),
      intent: (i) => i.feedback.style.use(tw('pointer-events-none opacity-50')),
    });

    // P-BRUTALIST-SELECT-TRIGGER-CHEVRON
    return (renderer) => [renderer.r.slot(), renderChevron(renderer)];
  },
});

/** P-BRUTALIST-SELECT-TRIGGER-DIRECT-ENTRY; parity is bounded by P-BRUTALIST-SELECT-TRIGGER-COMPATIBILITY-SUBSET. */

export default selectTrigger;
