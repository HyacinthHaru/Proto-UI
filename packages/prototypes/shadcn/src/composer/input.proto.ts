import { definePrototype, tw } from '@proto.ui/core';
import { asComposerInput } from '@proto.ui/prototypes-base/composer';
import type { ShadcnComposerInputExposes, ShadcnComposerInputProps } from './types';

export type * from './types';

const input = definePrototype<ShadcnComposerInputProps, ShadcnComposerInputExposes>({
  name: 'shadcn-composer-input',
  setup(def) {
    asComposerInput();
    def.feedback.style.use(
      tw(
        'flex-1 min-w-[200px] px-3 py-2 rounded-md bg-background border border-border text-sm outline-none placeholder:text-muted-foreground data-[disabled="true"]:bg-muted/50 data-[disabled="true"]:text-muted-foreground data-[disabled="true"]:cursor-not-allowed'
      )
    );
  },
});

export default input;
