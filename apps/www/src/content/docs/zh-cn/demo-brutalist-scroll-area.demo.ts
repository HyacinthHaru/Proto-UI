import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import {
  BrutalistScrollAreaCorner,
  BrutalistScrollAreaRoot,
  BrutalistScrollAreaScrollbar,
  BrutalistScrollAreaThumb,
  BrutalistScrollAreaViewport,
} from '@proto.ui/prototypes-brutalist';
const tags = {
  root: 'pui-brutalist-scroll-area-root',
  viewport: 'pui-brutalist-scroll-area-viewport',
  scrollbar: 'pui-brutalist-scroll-area-scrollbar',
  thumb: 'pui-brutalist-scroll-area-thumb',
  corner: 'pui-brutalist-scroll-area-corner',
} as const;
const prototypes = {
  root: BrutalistScrollAreaRoot,
  viewport: BrutalistScrollAreaViewport,
  scrollbar: BrutalistScrollAreaScrollbar,
  thumb: BrutalistScrollAreaThumb,
  corner: BrutalistScrollAreaCorner,
} as const;
for (const key of Object.keys(tags) as Array<keyof typeof tags>)
  defineWebComponent(tags[key], defineReactComponent(prototypes[key], () => null).def);
export default {
  label: 'Brutalist Scroll Area',
  setup: () => ({
    html: `<${tags.root} style="display:block;width:22rem;height:12rem"><${tags.viewport}><div style="display:grid;gap:0.75rem;padding:1rem">${Array.from({ length: 10 }, (_, i) => `<div><strong>MESSAGE ${i + 1}</strong><br><span style="font-family:monospace">Scrollable conversation row.</span></div>`).join('')}</div></${tags.viewport}><${tags.scrollbar}><${tags.thumb}></${tags.thumb}></${tags.scrollbar}><${tags.corner}></${tags.corner}></${tags.root}>`,
  }),
  react: { component: defineReactComponent(BrutalistScrollAreaRoot, () => null) },
  vue: { component: defineVueComponent(BrutalistScrollAreaRoot) },
};
