import type { EffectsPort } from '@proto.ui/core';
import type { VisualFeedbackFrame, VisualFeedbackSink } from '@proto.ui/module-feedback';
import {
  subscribeWebPortalProjection,
  isWebPortalMaterialSuspended,
  subscribeWebPortalMaterialSuspension,
} from '@proto.ui/adapter-base';
export type PreviewMaterialFactory = (
  host: HTMLElement,
  effects: EffectsPort
) => VisualFeedbackSink | null;
type ProviderEntry = { factory: PreviewMaterialFactory };
const providers = new WeakMap<HTMLElement, ProviderEntry>();
const changes = new Set<() => void>();
function findProviderEntry(host: HTMLElement): ProviderEntry | null {
  for (let parent: HTMLElement | null = host; parent; parent = parent.parentElement) {
    const provider = providers.get(parent);
    if (provider) return provider;
  }
  return null;
}
export function findPreviewMaterialProvider(host: HTMLElement): PreviewMaterialFactory | null {
  return findProviderEntry(host)?.factory ?? null;
}
function notifyProviderChanges() {
  for (const notify of [...changes]) {
    if (!changes.has(notify)) continue;
    try {
      notify();
    } catch (error) {
      queueMicrotask(() => {
        throw error;
      });
    }
  }
}
/** A physical-view proxy survives a missing first provider. It only rebinds at
 * actual adapter projection commits or explicit provider registration changes;
 * neither a registry entry nor a logical origin grants optical admission. */
export const createPreviewMaterialSink: PreviewMaterialFactory = (host, effects) => {
  let retired = false;
  let current: VisualFeedbackFrame | null = null;
  let factory: ProviderEntry | null = null;
  let sink: VisualFeedbackSink | null = null;
  let generation = 0;
  let rebinding = false;
  let attempted = false;
  let dirty = false;
  const ordinary = (frame: VisualFeedbackFrame) => {
    effects.queueStyle({ ...frame.style, tokens: [...frame.style.tokens] });
    effects.requestFlush();
  };
  const eligibleProvider = () =>
    host.isConnected && !isWebPortalMaterialSuspended(host) ? findProviderEntry(host) : null;
  const refresh = () => {
    if (retired || !current) return;
    if (rebinding) {
      dirty = true;
      return;
    }
    const next = eligibleProvider();
    if (next === factory && attempted) return;
    if (next === factory && !next) {
      ordinary(current);
      return;
    }
    const operation = ++generation;
    const frame = current;
    const previous = sink;
    sink = null;
    factory = next;
    attempted = true;
    rebinding = true;
    try {
      previous?.release(frame.view);
      if (retired || operation !== generation) return;
      if (eligibleProvider() !== next) {
        attempted = false;
        dirty = true;
        return;
      }
      const acquired = next?.factory(host, effects) ?? null;
      if (retired || operation !== generation || eligibleProvider() !== next) {
        acquired?.release(frame.view);
        attempted = false;
        dirty = !retired;
        return;
      }
      sink = acquired;
      if (sink) sink.commit(current ?? frame);
      else ordinary(current ?? frame);
    } catch (error) {
      factory = null;
      attempted = false;
      throw error;
    } finally {
      rebinding = false;
      if (dirty) {
        dirty = false;
        refresh();
      }
    }
  };
  const offProjection = subscribeWebPortalProjection(host, () => {
    ++generation;
    attempted = false;
    refresh();
  });
  const offSuspension = subscribeWebPortalMaterialSuspension(host, () => {
    ++generation;
    attempted = false;
    refresh();
  });
  changes.add(refresh);
  return {
    commit(frame) {
      if (
        retired ||
        (current && (frame.view !== current.view || frame.revision < current.revision))
      )
        return;
      current = frame;
      const previous = sink;
      refresh();
      if (!retired && sink && sink === previous) sink.commit(frame);
      else if (!retired && !sink && attempted) ordinary(frame);
    },
    release(view) {
      if (retired || (current && current.view !== view)) return;
      retired = true;
      generation++;
      offProjection();
      offSuspension();
      changes.delete(refresh);
      const previous = sink;
      sink = null;
      factory = null;
      previous?.release(view);
      current = null;
    },
  };
};
export function registerPreviewMaterialProvider(
  scope: HTMLElement,
  provider: PreviewMaterialFactory
): () => void {
  const entry = { factory: provider };
  providers.set(scope, entry);
  notifyProviderChanges();
  return () => {
    if (providers.get(scope) === entry) {
      providers.delete(scope);
      notifyProviderChanges();
    }
  };
}
