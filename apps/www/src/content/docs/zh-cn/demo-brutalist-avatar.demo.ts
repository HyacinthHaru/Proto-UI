import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import {
  BrutalistAvatarFallback,
  BrutalistAvatarImage,
  BrutalistAvatarRoot,
} from '@proto.ui/prototypes-brutalist';

const ROOT_TAG = 'pui-brutalist-avatar-root';
const IMAGE_TAG = 'pui-brutalist-avatar-image';
const FALLBACK_TAG = 'pui-brutalist-avatar-fallback';

defineWebComponent(ROOT_TAG, defineReactComponent(BrutalistAvatarRoot, () => null).def);
defineWebComponent(IMAGE_TAG, defineReactComponent(BrutalistAvatarImage, () => null).def);
defineWebComponent(FALLBACK_TAG, defineReactComponent(BrutalistAvatarFallback, () => null).def);

const reactComponent = defineReactComponent(BrutalistAvatarRoot, () => null);
const vueComponent = defineVueComponent(BrutalistAvatarRoot);

export default {
  label: 'Brutalist Avatar',
  setup: () => ({
    html: [
      `<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">`,
      `<${ROOT_TAG}><${IMAGE_TAG} src="/favicon.svg" alt="Proto UI"></${IMAGE_TAG}><${FALLBACK_TAG}>PU</${FALLBACK_TAG}></${ROOT_TAG}>`,
      `<${ROOT_TAG}><${FALLBACK_TAG}>GL</${FALLBACK_TAG}></${ROOT_TAG}>`,
      `</div>`,
    ].join(''),
  }),
  react: { component: reactComponent },
  vue: { component: vueComponent },
};
