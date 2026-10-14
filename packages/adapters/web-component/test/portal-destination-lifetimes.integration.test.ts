import { AdaptToWebComponent } from '../src';
import { getProtoParent } from '../src/platform/instance-tree';
import { portalDestinationContract } from '../../react/test/portal-destination.contract';

portalDestinationContract('WC owned native projection', async (host, ownerProto, contentProto) => {
  const Owner = AdaptToWebComponent(ownerProto, { shadow: false });
  const Content = AdaptToWebComponent(contentProto, { shadow: false });
  const owner = new Owner();
  const content = new Content();
  content.className = 'portal-lifetime-target';
  owner.append(content);
  host.append(owner);
  const flush = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    for (let i = 0; i < 30; i++) await Promise.resolve();
  };
  return {
    flush,
    run: async (work) => {
      work();
      await flush();
    },
    refresh: async () => {
      // WC uses its existing author-tree mutation observer for host updates.
      const marker = document.createComment('application update checkpoint');
      host.append(marker);
      marker.remove();
      await flush();
    },
    destroy: async () => {
      owner.remove();
      content.remove();
      await flush();
    },
    actions: () => (content as any).getExposes().actions,
    owner: () => owner,
    logicalParent: getProtoParent,
  };
});
