import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import { BrutalistInputRoot } from '@proto.ui/prototypes-brutalist';

const TAG = 'pui-brutalist-input-root';
defineWebComponent(TAG, defineReactComponent(BrutalistInputRoot, () => null).def);
export default {
  label: 'Brutalist Input',
  setup: () => ({
    html: `<${TAG} name="conversation-search" placeholder="Find conversation..."></${TAG}>`,
  }),
  react: { component: defineReactComponent(BrutalistInputRoot, () => null) },
  vue: { component: defineVueComponent(BrutalistInputRoot) },
};
