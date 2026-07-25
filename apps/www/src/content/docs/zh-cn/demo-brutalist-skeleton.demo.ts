import { defineReactComponent } from '@proto.ui/adapters-react';
import { defineVueComponent } from '@proto.ui/adapters-vue';
import { defineWebComponent } from '@proto.ui/adapters-web-component';
import { BrutalistSkeletonRoot } from '@proto.ui/prototypes-brutalist';
const TAG = 'pui-brutalist-skeleton-root';
defineWebComponent(TAG, defineReactComponent(BrutalistSkeletonRoot, () => null).def);
export default {
  label: 'Brutalist Skeleton',
  setup: () => ({
    html: `<div style="display:grid;grid-template-columns:2.5rem 1fr;gap:0.75rem;align-items:start"><${TAG} style="display:block;width:2.5rem;height:2.5rem"></${TAG}><div style="display:grid;gap:0.5rem"><${TAG} style="display:block;width:45%;height:1rem"></${TAG}><${TAG} style="display:block;width:100%;height:3rem"></${TAG}></div></div>`,
  }),
  react: { component: defineReactComponent(BrutalistSkeletonRoot, () => null) },
  vue: { component: defineVueComponent(BrutalistSkeletonRoot) },
};
