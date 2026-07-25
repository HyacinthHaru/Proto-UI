import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import { BrutalistSeparatorRoot } from '@proto.ui/prototypes-brutalist';
const TAG = 'pui-brutalist-separator-root';
defineWebComponent(TAG, defineReactComponent(BrutalistSeparatorRoot, () => null).def);
export default {
  label: 'Brutalist Separator',
  setup: () => ({
    html: `<div style="display:grid;gap:1rem"><div>Today</div><${TAG}></${TAG}><div style="display:flex;height:3rem;gap:1rem;align-items:center"><span>Human</span><${TAG} orientation="vertical"></${TAG}><span>Assistant</span></div></div>`,
  }),
  react: { component: defineReactComponent(BrutalistSeparatorRoot, () => null) },
  vue: { component: defineVueComponent(BrutalistSeparatorRoot) },
};
