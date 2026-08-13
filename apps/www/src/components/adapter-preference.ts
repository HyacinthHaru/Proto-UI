import { AdapterIds, type RuntimeId } from './PrototypePreviewer/runtimes/registry';

export const PREFERRED_ADAPTER_KEY = 'preferred-prototypes-adapter';
export const DEFAULT_ADAPTER: RuntimeId = 'wc';
export const PREFERRED_ADAPTER_EVENT = 'proto-adapter:change';

export type PreferredAdapterChangeDetail = Readonly<{
  adapter: RuntimeId;
}>;

export function isRuntimeId(value: unknown): value is RuntimeId {
  return typeof value === 'string' && AdapterIds.includes(value);
}
