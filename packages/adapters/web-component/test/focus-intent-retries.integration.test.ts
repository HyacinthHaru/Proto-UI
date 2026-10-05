import { AdaptToWebComponent } from '../src';
import { focusIntentRetryConformance } from '../../base/test/fixtures/focus-intent-retry-conformance';
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
focusIntentRetryConformance('wc', async (proto) => {
  AdaptToWebComponent(proto);
  const root = document.createElement(proto.name) as HTMLElement & { getExposes(): any };
  document.body.append(root);
  await flush();
  return {
    root,
    getExposes: () => root.getExposes(),
    act: async (callback) => {
      callback();
      await flush();
    },
    unmount: async () => {
      root.remove();
      await flush();
    },
  };
});
