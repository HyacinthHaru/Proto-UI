import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  CodeBlockHeaderAsHookContract,
  CodeBlockHeaderExposes,
  CodeBlockHeaderProps,
} from './types';

export type {
  CodeBlockHeaderProps,
  CodeBlockHeaderExposes,
  CodeBlockHeaderStateHandles,
  CodeBlockHeaderAsHookContract,
} from './types';

function setupCodeBlockHeader(def: DefHandle<CodeBlockHeaderProps, CodeBlockHeaderExposes>): void {
  def.props.define({
    language: { type: 'string' },
    filename: { type: 'string' },
  });

  const language = def.state.string('language', '');
  const filename = def.state.string('filename', '');
  def.expose.state('language', language);
  def.expose.state('filename', filename);

  def.lifecycle.onCreated((run) => {
    language.set(run.props.get().language ?? '', 'reason: code-block-header init language');
    filename.set(run.props.get().filename ?? '', 'reason: code-block-header init filename');
  });
  def.props.watch(['language', 'filename'], (_run, next) => {
    language.set(next.language ?? '', 'reason: code-block-header prop language');
    filename.set(next.filename ?? '', 'reason: code-block-header prop filename');
  });
}

export const asCodeBlockHeader = defineAsHook<
  CodeBlockHeaderProps,
  CodeBlockHeaderExposes,
  CodeBlockHeaderAsHookContract
>({
  name: 'as-code-block-header',
  setup: setupCodeBlockHeader,
});

const codeBlockHeader = definePrototype({
  name: 'base-code-block-header',
  setup: setupCodeBlockHeader,
});

export default codeBlockHeader;
