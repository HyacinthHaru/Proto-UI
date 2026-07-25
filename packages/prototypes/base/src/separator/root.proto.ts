import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  SeparatorRootAsHookContract,
  SeparatorRootExposes,
  SeparatorRootProps,
} from './types';

export type {
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

  const orientation = def.state.string('orientation', 'horizontal');
  def.expose.state('orientation', orientation);

  const decorative = def.state.bool('decorative', true);
  def.expose.state('decorative', decorative);

  def.a11y.role('separator');

  def.lifecycle.onCreated((run) => {
    orientation.set(
      run.props.get().orientation ?? 'horizontal',
      'reason: separator init orientation'
    );
    decorative.set(run.props.get().decorative ?? true, 'reason: separator init decorative');
  });
  def.props.watch(['orientation'], (_run, next) => {
    orientation.set(next.orientation ?? 'horizontal', 'reason: separator prop orientation');
  });
  def.props.watch(['decorative'], (_run, next) => {
    decorative.set(next.decorative ?? true, 'reason: separator prop decorative');
  });
}

export const asSeparatorRoot = defineAsHook<
  SeparatorRootProps,
  SeparatorRootExposes,
  SeparatorRootAsHookContract
>({
  name: 'as-separator-root',
  setup: setupSeparatorRoot,
});

const separatorRoot = definePrototype({
  name: 'base-separator-root',
  setup: setupSeparatorRoot,
});

export default separatorRoot;
