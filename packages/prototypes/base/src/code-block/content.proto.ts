import type { DefHandle } from '@proto.ui/core';
import { defineAsHook, definePrototype } from '@proto.ui/core';
import type {
  CodeBlockContentAsHookContract,
  CodeBlockContentExposes,
  CodeBlockContentProps,
} from './types';

export type {
  CodeBlockContentProps,
  CodeBlockContentExposes,
  CodeBlockContentStateHandles,
  CodeBlockContentAsHookContract,
} from './types';

function setupCodeBlockContent(
  def: DefHandle<CodeBlockContentProps, CodeBlockContentExposes>
): void {
  def.props.define({
    language: { type: 'string' },
  });

  const language = def.state.string('language', '');
  def.expose.state('language', language);

  def.lifecycle.onCreated((run) => {
    language.set(run.props.get().language ?? '', 'reason: code-block-content init language');
  });
  def.props.watch(['language'], (_run, next) => {
    language.set(next.language ?? '', 'reason: code-block-content prop language');
  });
}

export const asCodeBlockContent = defineAsHook<
  CodeBlockContentProps,
  CodeBlockContentExposes,
  CodeBlockContentAsHookContract
>({
  name: 'as-code-block-content',
  setup: setupCodeBlockContent,
});

const codeBlockContent = definePrototype({
  name: 'base-code-block-content',
  setup: setupCodeBlockContent,
});

export default codeBlockContent;
