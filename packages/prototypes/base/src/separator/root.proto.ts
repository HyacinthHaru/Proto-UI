import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  SeparatorRootAsHookContract,
  SeparatorRootExposes,
  SeparatorRootProps,
} from './types';

export type {
  SeparatorOrientation,
  SeparatorRootProps,
  SeparatorRootExposes,
  SeparatorRootStateHandles,
  SeparatorRootAsHookContract,
} from './types';

function setupSeparatorRoot(def: DefHandle<SeparatorRootProps, SeparatorRootExposes>): void {
  def.props.define({
    orientation: { type: 'enum', empty: 'fallback', options: ['horizontal', 'vertical'] },
    decorative: { type: 'boolean', empty: 'fallback' },
  });
  def.props.setDefaults({ orientation: 'horizontal', decorative: true });

  const orientation = def.state.string('orientation', 'horizontal', {
    options: ['horizontal', 'vertical'],
  });
  const decorative = def.state.bool('decorative', true);
  const role = def.state.string('role', '');
  const hidden = def.state.bool('hidden', true);
  def.expose.state('orientation', orientation);
  def.expose.state('decorative', decorative);
  def.a11y.role(role);
  def.a11y.state('orientation', orientation);
  def.a11y.tree({ hidden });

  const sync = (props: Readonly<SeparatorRootProps>) => {
    const nextOrientation = props.orientation ?? 'horizontal';
    const nextDecorative = props.decorative ?? true;
    orientation.set(nextOrientation, 'reason: separator orientation');
    decorative.set(nextDecorative, 'reason: separator decorative');
    role.set(nextDecorative ? '' : 'separator', 'reason: separator role');
    hidden.set(nextDecorative, 'reason: separator hidden');
  };
  def.lifecycle.onCreated((run) => sync(run.props.get()));
  def.props.watchAll((_run, next) => sync(next));
}

export const asSeparatorRoot = defineAsHook<
  SeparatorRootProps,
  SeparatorRootExposes,
  SeparatorRootAsHookContract
>({ name: 'as-separator-root', setup: setupSeparatorRoot });

const separatorRoot = definePrototype({ name: 'base-separator-root', setup: setupSeparatorRoot });
export default separatorRoot;
