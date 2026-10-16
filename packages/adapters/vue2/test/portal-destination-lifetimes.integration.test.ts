import { createVue2Adapter } from '../src/adapt';
import { getProtoParent } from '../src/platform/instance-tree';
import { flushVue2, Vue2Any, Vue2RuntimeAny } from './utils/vue2';
import { portalDestinationContract } from '../../react/test/portal-destination.contract';

portalDestinationContract(
  'Vue2 owned native projection',
  async (host, ownerProto, contentProto) => {
    const adapt = createVue2Adapter(Vue2RuntimeAny);
    const Owner = adapt(ownerProto);
    const Content = adapt(contentProto);
    let revision = 0;
    const App = Vue2Any.extend({
      render(h: any) {
        return h(Owner, { attrs: { 'data-revision': revision } }, [
          h(Content, {
            ref: 'content',
            class: 'portal-lifetime-target',
            attrs: { 'data-revision': revision },
          }),
        ]);
      },
    });
    const vm = new App().$mount();
    host.append(vm.$el);
    const flush = async () => {
      await flushVue2();
      await flushVue2();
    };
    return {
      flush,
      run: async (work) => {
        work();
        await flush();
      },
      refresh: async () => {
        revision++;
        vm.$forceUpdate();
        await flush();
      },
      destroy: async () => {
        vm.$destroy();
        host.replaceChildren();
        await flush();
      },
      actions: () => vm.$refs.content.getExposes().actions,
      owner: () => host.querySelector<HTMLElement>('[data-pui-root]')!,
      logicalParent: getProtoParent,
    };
  }
);
