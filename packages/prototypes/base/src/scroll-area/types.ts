import type { ExposeState, State } from '@proto.ui/core';

export interface ScrollAreaRootProps {}

export type ScrollAreaRootExposes = {};

export type ScrollAreaRootStateHandles = {};

export type ScrollAreaRootAsHookContract = {};

export interface ScrollAreaViewportProps {}

export type ScrollAreaViewportExposes = {
  scrollTop: ExposeState<number>;
  scrollLeft: ExposeState<number>;
  scrollHeight: ExposeState<number>;
  scrollWidth: ExposeState<number>;
  clientHeight: ExposeState<number>;
  clientWidth: ExposeState<number>;
};

export type ScrollAreaViewportStateHandles = {
  scrollTop: State<number>;
  scrollLeft: State<number>;
  scrollHeight: State<number>;
  scrollWidth: State<number>;
  clientHeight: State<number>;
  clientWidth: State<number>;
};

export type ScrollAreaViewportAsHookContract = {
  state: ScrollAreaViewportStateHandles;
};

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

export type ScrollAreaThumbExposes = {
  sizeRatio: ExposeState<number>;
  offsetRatio: ExposeState<number>;
};

export type ScrollAreaThumbStateHandles = {
  sizeRatio: State<number>;
  offsetRatio: State<number>;
};

export type ScrollAreaThumbAsHookContract = {
  state: ScrollAreaThumbStateHandles;
};

export interface ScrollAreaCornerProps {}

export type ScrollAreaCornerExposes = {};

export type ScrollAreaCornerStateHandles = {};

export type ScrollAreaCornerAsHookContract = {};
