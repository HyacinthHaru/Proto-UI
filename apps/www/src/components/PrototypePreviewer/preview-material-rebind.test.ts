import { afterEach, expect, it, vi } from 'vitest';
import type { EffectsPort } from '@proto.ui/core';
import type { VisualFeedbackFrame, VisualFeedbackSink } from '@proto.ui/module-feedback';
import { notifyWebPortalProjection, beginWebPortalMaterialEpoch } from '@proto.ui/adapter-base';
import {
  createPreviewMaterialSink,
  registerPreviewMaterialProvider,
} from './preview-material-provider';
const releases: Array<() => void> = [];
afterEach(() => {
  for (const fn of releases.splice(0).reverse()) fn();
  document.body.replaceChildren();
});
const frame = (revision = 0) =>
  ({
    view: 1,
    revision,
    style: { tokens: [], provenance: [] },
    material: { slot: null, candidates: [] },
  }) as unknown as VisualFeedbackFrame;
function fixture() {
  const a = document.createElement('div'),
    b = document.createElement('div'),
    host = document.createElement('div');
  document.body.append(a, b, host);
  const effects = { queueStyle: vi.fn(), requestFlush: vi.fn() } as EffectsPort;
  const sink = createPreviewMaterialSink(host, effects)!;
  releases.push(() => sink.release(1));
  return { a, b, host, effects, sink };
}
it('rebinds a missing first provider only after actual projection, without claiming optics', () => {
  const f = fixture();
  const provider = { commit: vi.fn(), release: vi.fn() };
  const allocate = vi.fn(() => provider);
  releases.push(registerPreviewMaterialProvider(f.a, allocate));
  f.sink.commit(frame());
  expect(allocate).not.toHaveBeenCalled();
  expect(f.effects.queueStyle).toHaveBeenCalled();
  f.a.append(f.host);
  notifyWebPortalProjection(f.host);
  expect(allocate).toHaveBeenCalledTimes(1);
  expect(provider.commit).toHaveBeenCalledWith(frame());
  f.sink.commit(frame(1));
  expect(allocate).toHaveBeenCalledTimes(1);
  expect(provider.commit).toHaveBeenLastCalledWith(frame(1));
});
it('releases the acquiring provider before moving to the next physical scope', () => {
  const f = fixture();
  const events: string[] = [];
  releases.push(
    registerPreviewMaterialProvider(f.a, () => ({
      commit() {
        events.push('a');
      },
      release() {
        events.push('release-a');
      },
    }))
  );
  releases.push(
    registerPreviewMaterialProvider(f.b, () => ({
      commit() {
        events.push('b');
      },
      release() {
        events.push('release-b');
      },
    }))
  );
  f.a.append(f.host);
  f.sink.commit(frame());
  f.b.append(f.host);
  notifyWebPortalProjection(f.host);
  expect(events).toEqual(['a', 'release-a', 'b']);
  f.sink.release(1);
  notifyWebPortalProjection(f.host);
  expect(events).toEqual(['a', 'release-a', 'b', 'release-b']);
});
it('does not poll a null factory on unrelated material commits, retries on projection', () => {
  const f = fixture();
  const allocate = vi.fn(() => null);
  releases.push(registerPreviewMaterialProvider(f.a, allocate));
  f.a.append(f.host);
  f.sink.commit(frame());
  f.sink.commit(frame(1));
  expect(allocate).toHaveBeenCalledTimes(1);
  notifyWebPortalProjection(f.host);
  expect(allocate).toHaveBeenCalledTimes(2);
});
it('a provider withdrawn in place is released and ordinary style restored', () => {
  const f = fixture();
  const provider = { commit: vi.fn(), release: vi.fn() };
  const off = registerPreviewMaterialProvider(f.a, () => provider);
  releases.push(off);
  f.a.append(f.host);
  f.sink.commit(frame());
  off();
  expect(provider.release).toHaveBeenCalledOnce();
  expect(f.effects.queueStyle).toHaveBeenCalled();
});
it('retirement during allocation releases the returned sink without committing', () => {
  const f = fixture();
  const provider = { commit: vi.fn(), release: vi.fn() };
  releases.push(
    registerPreviewMaterialProvider(f.a, () => {
      f.sink.release(1);
      return provider;
    })
  );
  f.a.append(f.host);
  f.sink.commit(frame());
  expect(provider.commit).not.toHaveBeenCalled();
  expect(provider.release).toHaveBeenCalledWith(1);
});
it('release-triggered replacement cannot commit a stale provider', () => {
  const f = fixture();
  let offB = () => {};
  const events: string[] = [];
  const stale = { commit: vi.fn(), release: vi.fn() };
  releases.push(
    registerPreviewMaterialProvider(f.a, () => ({
      commit() {},
      release() {
        offB();
      },
    }))
  );
  f.a.append(f.host);
  f.sink.commit(frame());
  offB = registerPreviewMaterialProvider(f.b, () => stale);
  releases.push(offB);
  f.b.append(f.host);
  notifyWebPortalProjection(f.host);
  expect(stale.commit).not.toHaveBeenCalled();
});
it('a reentrant same-provider physical move invalidates acquisition before its first paint', () => {
  const f = fixture();
  const first = { commit: vi.fn(), release: vi.fn() },
    second = { commit: vi.fn(), release: vi.fn() };
  const nested = document.createElement('div');
  f.a.append(nested, f.host);
  let allocations = 0;
  releases.push(
    registerPreviewMaterialProvider(f.a, () => {
      if (++allocations === 1) {
        nested.append(f.host);
        notifyWebPortalProjection(f.host);
        return first;
      }
      return second;
    })
  );
  f.sink.commit(frame());
  expect(first.commit).not.toHaveBeenCalled();
  expect(first.release).toHaveBeenCalledWith(1);
  expect(second.commit).toHaveBeenCalledWith(frame());
});
it('same-function replacement has its own registration identity', () => {
  const f = fixture();
  const provider = { commit: vi.fn(), release: vi.fn() };
  const allocate = vi.fn(() => provider);
  const stale = registerPreviewMaterialProvider(f.a, allocate);
  releases.push(stale);
  const current = registerPreviewMaterialProvider(f.a, allocate);
  releases.push(current);
  stale();
  f.a.append(f.host);
  f.sink.commit(frame());
  expect(allocate).toHaveBeenCalledOnce();
});

it('suspends a live epoch immediately and cannot reacquire through frames or provider changes', () => {
  const f = fixture();
  f.a.append(f.host);
  const provider = { commit: vi.fn(), release: vi.fn() };
  const allocate = vi.fn(() => provider);
  releases.push(registerPreviewMaterialProvider(f.a, allocate));
  const epoch = beginWebPortalMaterialEpoch(f.host);
  epoch.commitProjection();
  f.sink.commit(frame());
  expect(provider.commit).toHaveBeenCalledOnce();
  epoch.suspend();
  expect(provider.release).toHaveBeenCalledWith(1);
  f.sink.commit(frame(1));
  releases.push(registerPreviewMaterialProvider(f.a, allocate));
  notifyWebPortalProjection(f.host);
  expect(allocate).toHaveBeenCalledOnce();
  expect(provider.commit).toHaveBeenCalledOnce();
  const nextEpoch = beginWebPortalMaterialEpoch(f.host);
  expect(allocate).toHaveBeenCalledOnce();
  nextEpoch.commitProjection();
  expect(allocate).toHaveBeenCalledTimes(2);
  epoch.release();
  f.sink.commit(frame(2));
  expect(provider.commit).toHaveBeenLastCalledWith(frame(2));
  nextEpoch.release();
});
it('rejects a sink acquired reentrantly after its portal epoch is suspended', () => {
  const f = fixture();
  f.a.append(f.host);
  const epoch = beginWebPortalMaterialEpoch(f.host);
  epoch.commitProjection();
  const provider = { commit: vi.fn(), release: vi.fn() };
  releases.push(
    registerPreviewMaterialProvider(f.a, () => {
      epoch.suspend();
      return provider;
    })
  );
  f.sink.commit(frame());
  expect(provider.commit).not.toHaveBeenCalled();
  expect(provider.release).toHaveBeenCalledWith(1);
  f.sink.commit(frame(1));
  expect(provider.commit).not.toHaveBeenCalled();
  epoch.release();
});

it('holds material pending until the new physical epoch actually commits', () => {
  const f = fixture();
  f.a.append(f.host);
  const provider = { commit: vi.fn(), release: vi.fn() };
  const allocate = vi.fn(() => provider);
  releases.push(registerPreviewMaterialProvider(f.a, allocate));
  const epoch = beginWebPortalMaterialEpoch(f.host);
  f.sink.commit(frame());
  notifyWebPortalProjection(f.host);
  expect(allocate).not.toHaveBeenCalled();
  epoch.commitProjection();
  expect(allocate).toHaveBeenCalledOnce();
  epoch.suspend();
  epoch.commitProjection();
  f.sink.commit(frame(1));
  expect(allocate).toHaveBeenCalledOnce();
  epoch.release();
});
