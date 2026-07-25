import { definePrototype, tw } from '@proto.ui/core';
import { asComposerSendButton } from '@proto.ui/prototypes-base/composer';
import type { ShadcnComposerSendButtonExposes, ShadcnComposerSendButtonProps } from './types';

export type * from './types';

const sendButton = definePrototype<ShadcnComposerSendButtonProps, ShadcnComposerSendButtonExposes>({
  name: 'shadcn-composer-send-button',
  setup(def) {
    asComposerSendButton();
    def.feedback.style.use(
      tw(
        'inline-flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 data-[disabled="true"]:bg-muted data-[disabled="true"]:text-muted-foreground data-[disabled="true"]:cursor-not-allowed'
      )
    );
  },
});

export default sendButton;
