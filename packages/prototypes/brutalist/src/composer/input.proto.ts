import { definePrototype, tw } from '@proto.ui/core';
import { asComposerInput } from '@proto.ui/prototypes-base/composer';
import type { BrutalistComposerInputExposes, BrutalistComposerInputProps } from './types';

const input = definePrototype<BrutalistComposerInputProps, BrutalistComposerInputExposes>({
  name: 'brutalist-composer-input',
  setup(def) {
    asComposerInput();
    def.feedback.style.use(
      tw(
        'flex-1 min-w-[200px] px-3 py-2 bg-canvas border-2 border-ink text-ink font-mono text-sm outline-none placeholder:text-gray-500 data-[disabled="true"]:bg-gray-100 data-[disabled="true"]:cursor-not-allowed'
      )
    );
  },
});

export default input;
