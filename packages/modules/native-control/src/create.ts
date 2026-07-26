import { createModule, defineModule, type ModuleFactoryArgs } from '@proto.ui/module-base';
import { NativeControlModuleImpl } from './impl';
import type { NativeControlFacade, NativeControlPort } from './types';

export function createNativeControlModule(ctx: ModuleFactoryArgs) {
  return createModule<'native-control', 'instance', NativeControlFacade, NativeControlPort>({
    name: 'native-control',
    scope: 'instance',
    init: ctx.init,
    caps: ctx.caps,
    deps: ctx.deps,
    build: ({ init, caps }) => {
      const impl = new NativeControlModuleImpl(caps, init.prototypeName, init.declarations);
      return {
        facade: {
          declare: () => impl.declare(),
        },
        hooks: {
          onMountPhase: (phase, epoch) => impl.onMountPhase(phase, epoch),
          dispose: () => impl.dispose(),
        },
        port: {
          isDeclared: () => impl.snapshot() !== null,
          getSnapshot: () => impl.snapshot(),
        },
      };
    },
  });
}

export const NativeControlModuleDef = defineModule({
  name: 'native-control',
  resourceOwnership: 'mixed',
  create: createNativeControlModule,
});
