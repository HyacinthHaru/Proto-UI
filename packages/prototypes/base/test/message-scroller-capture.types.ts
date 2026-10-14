import type {
  ObservedStateHandle,
  ScrollEndFollowState,
  ScrollEndFollowRequestStatus,
} from '@proto.ui/core';
import {
  asMessageScrollerViewport,
  asMessageScrollerJump,
  type MessageScrollerViewportProps,
} from '../src/message-scroller';

// C-SCROLL-END-FOLLOW-0001-FACTS: module/host facts retain observation authority.
function viewportCapture(viewport: ReturnType<typeof asMessageScrollerViewport>) {
  const atEnd: ObservedStateHandle<boolean, MessageScrollerViewportProps> | undefined =
    viewport.getState?.('@scroll/verticalAtEnd');
  const following:
    | ObservedStateHandle<ScrollEndFollowState, MessageScrollerViewportProps>
    | undefined = viewport.getState?.('@scroll/endFollowState');
  const status:
    | ObservedStateHandle<ScrollEndFollowRequestStatus, MessageScrollerViewportProps>
    | undefined = viewport.getState?.('@scroll/endFollowRequestStatus');
  atEnd?.watch((_run, event) => {
    if (event.type === 'next') {
      const next: boolean = event.next;
      void next;
    }
  });
  following?.watch((_run, event) => {
    if (event.type === 'next') {
      const next: ScrollEndFollowState = event.next;
      void next;
    }
  });
  status?.watch((_run, event) => {
    if (event.type === 'next') {
      const next: ScrollEndFollowRequestStatus = event.next;
      void next;
    }
  });
  // Use the actual public lookup rather than the narrower annotations above.
  // @ts-expect-error Host-owned atEnd facts cannot be author-written.
  viewport.getState?.('@scroll/verticalAtEnd')?.set(false);
  // @ts-expect-error Host-owned atEnd facts cannot receive author defaults.
  viewport.getState?.('@scroll/verticalAtEnd')?.setDefault(false);
  // @ts-expect-error End-follow state is observed, not writable.
  viewport.getState?.('@scroll/endFollowState')?.set('paused');
  // @ts-expect-error End-follow state cannot receive author defaults.
  viewport.getState?.('@scroll/endFollowState')?.setDefault('off');
  // @ts-expect-error Request status is observed, not writable.
  viewport.stateHandles?.['@scroll/endFollowRequestStatus'].set('applied');
  // @ts-expect-error Request status cannot receive author defaults.
  viewport.stateHandles?.['@scroll/endFollowRequestStatus'].setDefault('idle');
  // Authored label remains writable through capture.
  viewport.getState?.('a11yLabel')?.setDefault('Conversation');
  viewport.getState?.('a11yLabel')?.set('Conversation');
  return [atEnd?.get(), following?.get(), status?.get()];
}
void viewportCapture;

// The Jump's own presentation copy is authored state, not a host fact handle.
function jumpCapture(jump: ReturnType<typeof asMessageScrollerJump>) {
  jump.getState?.('atEnd')?.setDefault(false);
  jump.getState?.('atEnd')?.set(true);
  jump.getState?.('newContentCount')?.setDefault(0);
  jump.getState?.('newContentCount')?.set(2);
}
void jumpCapture;
