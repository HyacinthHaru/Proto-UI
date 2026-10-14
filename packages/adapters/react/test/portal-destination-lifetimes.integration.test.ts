import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { createReactAdapter } from '../src';
import { getProtoParent } from '../src/platform/instance-tree';
import { portalDestinationContract } from './portal-destination.contract';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
portalDestinationContract('React native createPortal', async (host, ownerProto, contentProto) => {
  const adapt = createReactAdapter({ ...React, createPortal });
  const Owner = adapt(ownerProto);
  const Content = adapt(contentProto);
  const ref = React.createRef<any>();
  const root = createRoot(host);
  let revision = 0;
  const render = () =>
    root.render(
      React.createElement(
        Owner,
        { 'data-revision': revision },
        React.createElement(Content, {
          ref,
          className: 'portal-lifetime-target',
          'data-revision': revision,
        })
      )
    );
  const flush = async () => {
    await React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  await React.act(async () => render());
  return {
    stablePortalContainer: true,
    flush,
    run: async (work) => {
      await React.act(async () => work());
    },
    refresh: async () => {
      revision++;
      await React.act(async () => render());
    },
    destroy: async () => {
      await React.act(async () => root.unmount());
    },
    actions: () => ref.current.getExposes().actions,
    owner: () => host.querySelector<HTMLElement>('[data-pui-root]')!,
    logicalParent: getProtoParent,
  };
});
