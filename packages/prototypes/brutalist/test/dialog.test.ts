import { describe, expect, it } from 'vitest';
import { styleContains } from '../../test-utils/style';
import { AdaptToWebComponent } from '@proto.ui/adapter-web-component';
import {
  dialogClose,
  dialogCloseIcon,
  dialogContent,
  dialogDescription,
  dialogFooter,
  dialogHeader,
  dialogMask,
  dialogRoot,
  dialogTitle,
  dialogTrigger,
} from '../src/dialog';

AdaptToWebComponent(dialogRoot as any);
AdaptToWebComponent(dialogTrigger as any);
AdaptToWebComponent(dialogMask as any);
AdaptToWebComponent(dialogContent as any);
AdaptToWebComponent(dialogTitle as any);
AdaptToWebComponent(dialogDescription as any);
AdaptToWebComponent(dialogClose as any);
AdaptToWebComponent(dialogCloseIcon as any);
AdaptToWebComponent(dialogHeader as any);
AdaptToWebComponent(dialogFooter as any);

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('prototypes/brutalist: dialog', () => {
  it('keeps every Dialog part named and opens square hard-shadowed content without blur', async () => {
    expect(dialogRoot.name).toBe('brutalist-dialog-root');
    expect(dialogTrigger.name).toBe('brutalist-dialog-trigger');
    expect(dialogMask.name).toBe('brutalist-dialog-mask');
    expect(dialogContent.name).toBe('brutalist-dialog-content');
    expect(dialogTitle.name).toBe('brutalist-dialog-title');
    expect(dialogDescription.name).toBe('brutalist-dialog-description');
    expect(dialogClose.name).toBe('brutalist-dialog-close');
    expect(dialogCloseIcon.name).toBe('brutalist-dialog-close-icon');
    expect(dialogHeader.name).toBe('brutalist-dialog-header');
    expect(dialogFooter.name).toBe('brutalist-dialog-footer');

    const root = document.createElement('brutalist-dialog-root') as any;
    const trigger = document.createElement('brutalist-dialog-trigger') as any;
    const mask = document.createElement('brutalist-dialog-mask') as any;
    const content = document.createElement('brutalist-dialog-content') as any;
    const title = document.createElement('brutalist-dialog-title') as any;
    const description = document.createElement('brutalist-dialog-description') as any;
    const close = document.createElement('brutalist-dialog-close') as any;
    const closeIcon = document.createElement('brutalist-dialog-close-icon') as any;
    const header = document.createElement('brutalist-dialog-header') as any;
    const footer = document.createElement('brutalist-dialog-footer') as any;
    header.append(title, description);
    footer.appendChild(close);
    content.append(header, footer, closeIcon);
    root.append(trigger, mask, content);
    document.body.appendChild(root);
    await flush();

    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    expect(root.getExposes().open.get()).toBe(true);
    expect(styleContains(trigger, 'rounded-none')).toBe(true);
    expect(styleContains(mask, 'bg-overlay')).toBe(true);
    expect(styleContains(mask, 'backdrop-blur')).toBe(false);
    expect(styleContains(content, 'rounded-none')).toBe(true);
    expect(styleContains(content, 'border-2')).toBe(true);
    expect(styleContains(content, 'shadow-[8px_8px_0_0_#000]')).toBe(true);
    expect(styleContains(content, 'rounded-lg')).toBe(false);
    expect(styleContains(content, 'shadow-lg')).toBe(false);
  });
});
