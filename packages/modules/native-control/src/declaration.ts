import { declareModule, moduleDeclaration, type PrototypeModuleDeclaration } from '@proto.ui/core';

export type NativeControlWebTarget = Readonly<{
  namespace: 'web';
  localName: 'input' | 'textarea';
}>;

export type NativeControlDeclaration = Readonly<{
  target: NativeControlWebTarget;
}>;

export const NATIVE_CONTROL_DECLARATION = moduleDeclaration<NativeControlDeclaration>(
  '@proto.ui/native-control/declaration'
);

export function declareNativeControl(
  config: NativeControlDeclaration
): PrototypeModuleDeclaration<NativeControlDeclaration> {
  return declareModule(NATIVE_CONTROL_DECLARATION, config);
}
