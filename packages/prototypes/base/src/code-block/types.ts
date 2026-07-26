import type { ExposeState } from '@proto.ui/core';

export interface CodeBlockRootProps {
  language?: string;
  filename?: string;
}

export type CodeBlockRootStateHandles = {
  language: ExposeState<string>;
  filename: ExposeState<string>;
};

export interface CodeBlockRootExposes extends CodeBlockRootStateHandles {}

export type CodeBlockRootAsHookContract = {
  state: CodeBlockRootStateHandles;
};

export interface CodeBlockHeaderProps {
  language?: string;
  filename?: string;
}

export type CodeBlockHeaderStateHandles = {
  language: ExposeState<string>;
  filename: ExposeState<string>;
};

export interface CodeBlockHeaderExposes extends CodeBlockHeaderStateHandles {}

export type CodeBlockHeaderAsHookContract = {
  state: CodeBlockHeaderStateHandles;
};

export interface CodeBlockContentProps {
  language?: string;
}

export type CodeBlockContentStateHandles = {
  language: ExposeState<string>;
};

export interface CodeBlockContentExposes extends CodeBlockContentStateHandles {}

export type CodeBlockContentAsHookContract = {
  state: CodeBlockContentStateHandles;
};
