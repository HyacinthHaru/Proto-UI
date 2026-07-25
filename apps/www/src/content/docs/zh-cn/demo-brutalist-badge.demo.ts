import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import { BrutalistBadgeRoot } from '@proto.ui/prototypes-brutalist';

const TAG = 'pui-brutalist-badge-root';
defineWebComponent(TAG, defineReactComponent(BrutalistBadgeRoot, () => null).def);

export default {
  label: 'Brutalist Badge',
  setup: () => ({
    html: `<div style="display:flex;gap:0.75rem;align-items:center;flex-wrap:wrap"><${TAG}>Unread 3</${TAG}><${TAG}>Support</${TAG}><${TAG}>Production</${TAG}></div>`,
  }),
  react: { component: defineReactComponent(BrutalistBadgeRoot, () => null) },
  vue: { component: defineVueComponent(BrutalistBadgeRoot) },
};
