import { definePrototype, tw } from '@proto.ui/core';
import {
  asSurfaceRoot,
  type SurfaceRootProps,
  type SurfaceRootExposes,
} from '@proto.ui/prototypes-base/surface';
export const BrutalistSurfaceRoot = definePrototype<SurfaceRootProps, SurfaceRootExposes>({
  name: 'brutalist-surface-root',
  setup(def) {
    asSurfaceRoot();
    def.rule({
      when: (w) => w.prop('radius').eq('default'),
      intent: (i) => i.feedback.style.use(tw('rounded-base')),
    });
    def.rule({
      when: (w) => w.prop('radius').eq('none'),
      intent: (i) => i.feedback.style.use(tw('rounded-none')),
    });
    def.rule({
      when: (w) => w.prop('radius').eq('sm'),
      intent: (i) => i.feedback.style.use(tw('rounded-sm')),
    });
    def.rule({
      when: (w) => w.prop('radius').eq('md'),
      intent: (i) => i.feedback.style.use(tw('rounded-md')),
    });
    def.rule({
      when: (w) => w.prop('radius').eq('lg'),
      intent: (i) => i.feedback.style.use(tw('rounded-lg')),
    });
    def.rule({
      when: (w) => w.prop('radius').eq('xl'),
      intent: (i) => i.feedback.style.use(tw('rounded-xl')),
    });
    def.rule({
      when: (w) => w.prop('radius').eq('full'),
      intent: (i) => i.feedback.style.use(tw('rounded-full')),
    });
    def.rule({
      when: (w) => w.prop('border').eq('all'),
      intent: (i) => i.feedback.style.use(tw('border-2 border-black')),
    });
    def.rule({
      when: (w) => w.prop('border').eq('bottom'),
      intent: (i) => i.feedback.style.use(tw('border-b-2 border-black')),
    });
    def.rule({
      when: (w) => w.prop('border').eq('none'),
      intent: (i) => i.feedback.style.use(tw('border-0')),
    });
    def.rule({
      when: (w) => w.prop('variant').eq('transparent'),
      intent: (i) => i.feedback.style.use(tw('bg-transparent text-foreground')),
    });
    def.rule({
      when: (w) => w.prop('variant').eq('outline'),
      intent: (i) => i.feedback.style.use(tw('bg-background text-foreground')),
    });
    def.rule({
      when: (w) => w.prop('variant').eq('secondary'),
      intent: (i) => i.feedback.style.use(tw('bg-secondary-background text-foreground')),
    });
    def.rule({
      when: (w) => w.prop('variant').eq('muted'),
      intent: (i) => i.feedback.style.use(tw('bg-muted text-foreground')),
    });
    def.rule({
      when: (w) => w.prop('variant').eq('accent'),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground')),
    });
    def.rule({
      when: (w) => w.prop('variant').eq('solid'),
      intent: (i) => i.feedback.style.use(tw('bg-main text-main-foreground')),
    });
    def.rule({
      when: (w) => w.prop('elevation').eq('raised'),
      intent: (i) => i.feedback.style.use(tw('shadow-[4px_4px_0_0_#000]')),
    });
    def.rule({
      when: (w) => w.prop('focusVisible').eq(true),
      intent: (i) =>
        i.feedback.style.use(
          tw('outline-none ring-2 ring-ring ring-offset-2 ring-offset-background')
        ),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.prop('elevation').eq('raised'),
          w.any(w.prop('hovered').eq(true), w.prop('pressed').eq(true))
        ),
      intent: (i) => i.feedback.style.use(tw('translate-x-1 translate-y-1 shadow-none')),
    });
    def.rule({
      when: (w) =>
        w.all(
          w.any(w.prop('variant').eq('outline'), w.prop('variant').eq('transparent')),
          w.any(w.prop('hovered').eq(true), w.prop('current').eq(true))
        ),
      intent: (i) => i.feedback.style.use(tw('bg-muted text-foreground')),
    });
    def.rule({
      when: (w) => w.all(w.prop('elevation').eq('none'), w.prop('pressed').eq(true)),
      intent: (i) => i.feedback.style.use(tw('translate-y-px')),
    });
    return (renderer) => renderer.r.slot();
  },
});
export default BrutalistSurfaceRoot;
