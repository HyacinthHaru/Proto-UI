import { ExposeState, State } from '@proto.ui/core';

export interface ScrollAreaRootProps {}

export type ScrollAreaRootExposes = {};

export type ScrollAreaRootStateHandles = {};

export type ScrollAreaRootAsHookContract = {};

export interface ScrollAreaViewportProps {}

export type ScrollAreaViewportExposes = {};

export type ScrollAreaViewportStateHandles = {};

export type ScrollAreaViewportAsHookContract = {};

export interface ScrollAreaScrollbarProps {
  orientation?: 'horizontal' | 'vertical';
}

export type ScrollAreaScrollbarExposes = {
  orientation: ExposeState<string>;
};

export type ScrollAreaScrollbarStateHandles = {
  orientation: State<string>;
};

export type ScrollAreaScrollbarAsHookContract = {
  state: ScrollAreaScrollbarStateHandles;
};

export interface ScrollAreaThumbProps {}

export type ScrollAreaThumbExposes = {};

export type ScrollAreaThumbStateHandles = {};

export type ScrollAreaThumbAsHookContract = {};

export interface ScrollAreaCornerProps {}

export type ScrollAreaCornerExposes = {};

export type ScrollAreaCornerStateHandles = {};

export type ScrollAreaCornerAsHookContract = {};
