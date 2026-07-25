import { definePrototype, tw } from '@proto.ui/core';
import { asComposerSendButton } from '@proto.ui/prototypes-base/composer';
import type { BrutalistComposerSendButtonExposes, BrutalistComposerSendButtonProps } from './types';

const sendButton = definePrototype<
  BrutalistComposerSendButtonProps,
  BrutalistComposerSendButtonExposes
>({
  name: 'brutalist-composer-send-button',
  setup(def) {
    asComposerSendButton();
    def.feedback.style.use(
      tw(
        'inline-flex items-center justify-center h-9 w-9 bg-canary border-2 border-ink text-canary-foreground font-mono text-xs shadow-hard hover:bg-yellow-300 active:translate-y-[1px] active:shadow-sm data-[disabled="true"]:bg-gray-200 data-[disabled="true"]:cursor-not-allowed'
      )
    );
  },
});

export default sendButton;
