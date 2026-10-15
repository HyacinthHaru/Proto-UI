import * as Vue from 'vue';
import { createVueAdapter } from '../src';
import { getProtoParent } from '../src/platform/instance-tree';
import { portalDestinationContract } from '../../react/test/portal-destination.contract';

portalDestinationContract('Vue native Teleport', async (host, ownerProto, contentProto) => {
  const adapt = createVueAdapter(Vue);
  const Owner = adapt(ownerProto);
  const Content = adapt(contentProto);
  const ref = Vue.ref<any>();
  const revision = Vue.ref(0);
  const app = Vue.createApp({
    render: () =>
      Vue.h(Owner, { 'data-revision': revision.value }, () =>
        Vue.h(Content, { ref, class: 'portal-lifetime-target', 'data-revision': revision.value })
      ),
  });
  const flush = async () => {
    await Vue.nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await Vue.nextTick();
  };
  app.mount(host);
  return {
    flush,
    run: async (work) => {
      work();
      await flush();
    },
    refresh: async () => {
      revision.value++;
      await flush();
    },
    destroy: async () => {
      app.unmount();
      await flush();
    },
    actions: () => ref.value.getExposes().actions,
    owner: () => host.querySelector<HTMLElement>('[data-pui-root]')!,
    logicalParent: getProtoParent,
  };
});
