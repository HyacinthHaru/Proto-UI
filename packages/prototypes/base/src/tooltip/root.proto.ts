import { defineAsHook, definePrototype, type DefHandle } from '@proto.ui/core';
import { TOOLTIP_FAMILY } from './shared';
import type { TooltipRootAsHookContract, TooltipRootExposes, TooltipRootProps } from './types';

function setupTooltipRoot(def: DefHandle<TooltipRootProps, TooltipRootExposes>): void {
  def.anatomy.claim(TOOLTIP_FAMILY, { role: 'root' });

  def.props.define({
    open: { type: 'boolean', empty: 'fallback' },
    defaultOpen: { type: 'boolean', empty: 'fallback' },
    delayDuration: { type: 'number', empty: 'fallback' },
  });
  def.props.setDefaults({ defaultOpen: false });

  const open = def.state.bool('open', false);
  def.expose.state('open', open);

  def.lifecycle.onCreated((run) => {
    const props = run.props.get();
    const controlled = run.props.isProvided('open');
    const initial = controlled ? !!props.open : !!props.defaultOpen;
    open.set(initial, 'reason: tooltip root init open');
  });

  def.props.watch(['open'], (run, next) => {
    if (run.props.isProvided('open')) {
      open.set(!!next.open, 'reason: tooltip root prop open controlled sync');
    }
  });
}

export const asTooltipRoot = defineAsHook<
  TooltipRootProps,
  TooltipRootExposes,
  TooltipRootAsHookContract
>({
  name: 'as-tooltip-root',
  setup: setupTooltipRoot,
});

const tooltipRoot = definePrototype({
  name: 'base-tooltip-root',
  setup: setupTooltipRoot,
});

export default tooltipRoot;
