// src/components/PrototypePreviewer/runtimes/registry.ts
export type RuntimeId = 'wc' | 'react' | 'vue' | 'vue2';
/** Runtimes presented as supported adapters in public website surfaces. */
export const AdapterIds = ['wc', 'react', 'vue'] as const;
export type PublicRuntimeId = (typeof AdapterIds)[number];

/** Additional runtime(s) available only to internal validation surfaces. */
export const InternalAdapterIds = [...AdapterIds, 'vue2'] as const satisfies readonly RuntimeId[];
export type RuntimeAPI = {
  id: RuntimeId;
  label: string;
  mount(
    host: HTMLElement,
    prototype: any,
    options?: { props?: Record<string, unknown> }
  ): Promise<void> | void;
  unmount(host: HTMLElement): Promise<void> | void;
};

export const runtimeLoaders: Record<RuntimeId, () => Promise<RuntimeAPI>> = {
  wc: async () => (await import('./wc-runtime')).runtime,
  react: async () => (await import('./react-runtime')).runtime,
  vue: async () => (await import('./vue-runtime')).runtime,
  vue2: async () => (await import('./vue2-runtime')).runtime,
};
