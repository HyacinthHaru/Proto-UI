import { defineAsHook, definePrototype, type DefHandle, type RunHandle } from '@proto.ui/core';
import { useOpenState } from '../tools';
import {
  COLLAPSIBLE_CONTEXT,
  COLLAPSIBLE_FAMILY,
  rejectDuplicateCollapsiblePart,
  requestCollapsibleOpen,
  type CollapsibleContextValue,
  type CollapsibleOpenReason,
} from './shared';
import type {
  CollapsibleRootAsHookContract,
  CollapsibleRootExposes,
  CollapsibleRootProps,
} from './types';

function setupCollapsibleRoot(def: DefHandle<CollapsibleRootProps, CollapsibleRootExposes>): void {
  // P-BASE-COLLAPSIBLE-ROOT-OWNER, P-BASE-COLLAPSIBLE-ANATOMY
  def.anatomy.claim(COLLAPSIBLE_FAMILY, { role: 'root' });
  def.props.define({
    open: { type: 'boolean', empty: 'fallback' },
    defaultOpen: { type: 'boolean', empty: 'fallback' },
    disabled: { type: 'boolean', empty: 'fallback' },
  });
  def.props.setDefaults({ defaultOpen: false, disabled: false });

  let snapshot: CollapsibleContextValue = {
    open: false,
    controlled: false,
    disabled: false,
    requestedOpen: false,
    requestReason: null,
    requestVersion: 0,
  };
  def.context.provide(COLLAPSIBLE_CONTEXT, snapshot);

  // P-BASE-COLLAPSIBLE-DEFAULT-OPEN, P-BASE-COLLAPSIBLE-CONTROLLED
  // Existing protocol-neutral helper owns initialization and controlled prop sync.
  const openState = useOpenState({
    exposeOpenMethodKey: 'openCollapsible',
    requestOpen(run, nextOpen, reason) {
      const normalized: CollapsibleOpenReason =
        reason === 'pointer' || reason === 'keyboard' ? reason : 'programmatic';
      requestCollapsibleOpen(run, nextOpen, normalized);
    },
  });
  const open = openState.getState!('open')!;
  def.expose.event('openChange', { payload: 'json' });
  let lastRequestVersion = 0;

  const syncContext = (run: RunHandle<CollapsibleRootProps>) => {
    const nextOpen = open.get();
    const controlled = run.props.isProvided('open');
    const disabled = !!run.props.get().disabled;
    if (
      snapshot.open === nextOpen &&
      snapshot.controlled === controlled &&
      snapshot.disabled === disabled
    )
      return;
    snapshot = { ...snapshot, open: nextOpen, controlled, disabled };
    run.context.update(COLLAPSIBLE_CONTEXT, snapshot);
  };

  def.context.subscribe(COLLAPSIBLE_CONTEXT, (run, next) => {
    snapshot = next;
    if (next.requestVersion === lastRequestVersion) return;
    lastRequestVersion = next.requestVersion;
    // P-BASE-COLLAPSIBLE-REQUEST-ONLY: controlled requests do not mutate open.
    if (!next.controlled) {
      open.set(next.requestedOpen, 'reason: collapsible uncontrolled request');
    }
    run.expose.emit('openChange', {
      open: next.requestedOpen,
      reason: next.requestReason!,
    });
  });

  for (const role of ['trigger', 'content'] as const) {
    def.anatomy.subscribeParts(COLLAPSIBLE_FAMILY, role, (run, parts) => {
      if (parts.length > 1) rejectDuplicateCollapsiblePart(run, role);
      // Rebind reused, including detached, parts to this owner's current fact.
      // This is structural synchronization, not a disclosure request.
      run.context.update(COLLAPSIBLE_CONTEXT, snapshot);
    });
  }

  def.lifecycle.onCreated(syncContext);
  def.props.watch(['open', 'disabled'], (run) => syncContext(run));
  open.watch((run, event) => {
    if (event.type === 'next') syncContext(run);
  });
}

// P-BASE-COLLAPSIBLE-AUTHORING-ENTRIES
export const asCollapsibleRoot = defineAsHook<
  CollapsibleRootProps,
  CollapsibleRootExposes,
  CollapsibleRootAsHookContract
>({ name: 'as-collapsible-root', setup: setupCollapsibleRoot });

const collapsibleRoot = definePrototype({
  name: 'base-collapsible-root',
  setup: setupCollapsibleRoot,
});

export default collapsibleRoot;
