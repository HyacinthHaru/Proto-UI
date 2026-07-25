import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import { BrutalistTextareaRoot } from '@proto.ui/prototypes-brutalist';

const TAG = 'pui-brutalist-textarea-root';
defineWebComponent(TAG, defineReactComponent(BrutalistTextareaRoot, () => null).def);
export default {
  label: 'Brutalist Textarea',
  setup: () => ({
    html: `<${TAG} name="message" rows="5" placeholder="Write a message..."></${TAG}>`,
  }),
  react: { component: defineReactComponent(BrutalistTextareaRoot, () => null) },
  vue: { component: defineVueComponent(BrutalistTextareaRoot) },
};
