import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  CodeBlockRootAsHookContract,
  CodeBlockRootExposes,
  CodeBlockRootProps,
} from './types';

export type {
  CodeBlockRootProps,
  CodeBlockRootExposes,
  CodeBlockRootStateHandles,
  CodeBlockRootAsHookContract,
} from './types';

function setupCodeBlockRoot(def: DefHandle<CodeBlockRootProps, CodeBlockRootExposes>): void {
  def.props.define({
    language: { type: 'string' },
    filename: { type: 'string' },
  });

  const language = def.state.string('language', '');
  const filename = def.state.string('filename', '');
  def.expose.state('language', language);
  def.expose.state('filename', filename);

  def.lifecycle.onCreated((run) => {
    language.set(run.props.get().language ?? '', 'reason: code-block init language');
    filename.set(run.props.get().filename ?? '', 'reason: code-block init filename');
  });
  def.props.watch(['language', 'filename'], (_run, next) => {
    language.set(next.language ?? '', 'reason: code-block prop language');
    filename.set(next.filename ?? '', 'reason: code-block prop filename');
  });
}

export const asCodeBlockRoot = defineAsHook<
  CodeBlockRootProps,
  CodeBlockRootExposes,
  CodeBlockRootAsHookContract
>({
  name: 'as-code-block-root',
  setup: setupCodeBlockRoot,
});

const codeBlockRoot = definePrototype({
  name: 'base-code-block-root',
  setup: setupCodeBlockRoot,
});

export default codeBlockRoot;
