import type { BorrowedStateHandle, ObservedStateHandle } from '@proto.ui/core';
import { asCollapsibleRoot, asCollapsibleTrigger } from '../src/collapsible';
import type { CollapsibleRootProps, CollapsibleTriggerProps } from '../src/collapsible';

function rootCapture(root: ReturnType<typeof asCollapsibleRoot>) {
  const child = root.getAsHookHandle?.('useOpenState');
  const open: BorrowedStateHandle<boolean, CollapsibleRootProps> | undefined =
    child?.getState?.('open');
  open?.setDefault(true);
  // @ts-expect-error the nested open declaration is not flattened into Root's direct capture
  root.getState?.('open');
  return open;
}
void rootCapture;

function triggerCapture(trigger: ReturnType<typeof asCollapsibleTrigger>) {
  const focused: ObservedStateHandle<boolean, CollapsibleTriggerProps> | undefined =
    trigger.getState?.('focused');
  const focusVisible = trigger.getState?.('focusVisible');
  trigger.getState?.('expanded')?.setDefault(false);
  focused?.watch((_run, event) => {
    if (event.type === 'next') focused?.get();
  });
  // @ts-expect-error Focus facts do not acquire author write authority through capture
  focusVisible?.set(true);
  // @ts-expect-error Focus facts cannot receive author setup defaults
  focusVisible?.setDefault(true);
  return focused;
}
void triggerCapture;
