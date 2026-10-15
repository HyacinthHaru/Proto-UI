import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebComponentAdapterElement } from '@proto.ui/adapter-web-component';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import { styleContains } from '../../test-utils/style';
import { switchRoot, switchThumb } from '../src/switch';

type SwitchRootElement = WebComponentAdapterElement<typeof switchRoot>;
type SwitchThumbElement = WebComponentAdapterElement<typeof switchThumb>;

AdaptToWebComponent(switchRoot);
AdaptToWebComponent(switchThumb);

async function flush(): Promise<void> {
  for (let index = 0; index < 4; index += 1) await Promise.resolve();
}

function createSwitch(props: Record<string, unknown> = {}) {
  const root = document.createElement(switchRoot.name) as SwitchRootElement;
  const thumb = document.createElement(switchThumb.name) as SwitchThumbElement;
  setElementProps(root, props);
  root.appendChild(thumb);
  document.body.appendChild(root);
  return { root, thumb };
}

afterEach(async () => {
  document.body.replaceChildren();
  await flush();
});

describe('prototypes/brutalist: switch', () => {
  it('projects named Root and Thumb entries over Base Switch state', async () => {
    // T-BRUTALIST-SWITCH-0001-CASE-1
    const { root, thumb } = createSwitch();
    await flush();

    expect(switchRoot.name).toBe('brutalist-switch-root');
    expect(switchThumb.name).toBe('brutalist-switch-thumb');
    expect(root.getAttribute('role')).toBe('switch');
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(root.getExposes().checked.get()).toBe(false);
    expect(thumb.getExposes().isChecked()).toBe(false);

    root.click();
    await flush();
    expect(root.getExposes().checked.get()).toBe(true);
    expect(thumb.getExposes().isChecked()).toBe(true);
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(root.hasAttribute('data-checked')).toBe(true);
    expect(thumb.hasAttribute('data-checked')).toBe(true);
  });

  it('keeps fixed Root padding while Thumb owns checked travel', async () => {
    // T-BRUTALIST-SWITCH-0001-CASE-2
    const { root, thumb } = createSwitch();
    await flush();

    expect(styleContains(root, 'p-0')).toBe(true);
    expect(styleContains(root, 'pl-0.5')).toBe(false);
    expect(styleContains(root, 'pr-5')).toBe(false);
    expect(styleContains(thumb, 'translate-x-0')).toBe(true);

    root.click();
    await flush();

    expect(root.getExposes().checked.get()).toBe(true);
    expect(thumb.getExposes().isChecked()).toBe(true);
    expect(styleContains(root, 'p-0')).toBe(true);
    expect(styleContains(root, 'data-[checked]:pl-5')).toBe(false);
    expect(styleContains(root, 'data-[checked]:pr-0.5')).toBe(false);
    expect(styleContains(thumb, 'translate-x-5')).toBe(true);
    expect(styleContains(thumb, 'bg-white')).toBe(true);
  });

  it('changes checked fill without changing track geometry', async () => {
    // T-BRUTALIST-SWITCH-0001-CASE-3
    const { root, thumb } = createSwitch({ defaultChecked: true });
    await flush();

    expect(root.getExposes().checked.get()).toBe(true);
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(thumb.getExposes().isChecked()).toBe(true);
    expect(styleContains(root, 'data-[checked]:bg-main')).toBe(true);
    expect(styleContains(thumb, 'bg-white')).toBe(true);
    for (const token of ['h-6', 'w-12', 'p-0']) expect(styleContains(root, token)).toBe(true);
  });

  it('activates press and focus rules and gates disabled changes', async () => {
    // T-BRUTALIST-SWITCH-0001-CASE-4
    const { root, thumb } = createSwitch();
    await flush();

    root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await flush();
    expect(root.getExposes().pressed.get()).toBe(true);
    expect(root.hasAttribute('data-pressed')).toBe(true);
    expect(styleContains(root, 'data-[pressed]:ring-2')).toBe(false);
    expect(styleContains(root, 'data-[pressed]:ring-ring')).toBe(false);
    root.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    await flush();
    expect(root.getExposes().pressed.get()).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    const matchesSpy = vi.spyOn(root, 'matches').mockReturnValue(true);
    root.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    await flush();
    expect(root.getExposes().focusVisible.get()).toBe(true);
    expect(root.hasAttribute('data-focus-visible')).toBe(true);
    expect(styleContains(root, 'data-[focus-visible]:ring-2')).toBe(true);
    expect(styleContains(root, 'data-[focus-visible]:ring-ring')).toBe(true);
    expect(styleContains(root, 'data-[focus-visible]:ring-offset-2')).toBe(true);

    setElementProps(root, { disabled: true });
    await flush();
    const checkedBefore = root.getExposes().checked.get();
    root.click();
    await flush();
    expect(root.getExposes().disabled.get()).toBe(true);
    expect(root.getAttribute('aria-disabled')).toBe('true');
    expect(root.hasAttribute('data-disabled')).toBe(true);
    expect(root.getExposes().checked.get()).toBe(checkedBefore);
    expect(thumb.getExposes().isChecked()).toBe(checkedBefore);
    expect(styleContains(root, 'data-[disabled]:pointer-events-none')).toBe(true);
    expect(styleContains(root, 'data-[disabled]:opacity-50')).toBe(true);
  });

  it('keeps the reference capsule, centered white disc and reduced-motion grammar', async () => {
    // T-BRUTALIST-SWITCH-0001-CASE-5
    const { root, thumb } = createSwitch();
    await flush();

    for (const token of [
      'h-6',
      'w-12',
      'rounded-full',
      'border-2',
      'border-black',
      'bg-secondary-background',
    ]) {
      expect(styleContains(root, token)).toBe(true);
    }
    for (const token of [
      'block',
      'absolute',
      'left-1',
      'top-1/2',
      '-translate-y-1/2',
      'size-4',
      'rounded-full',
      'border-2',
      'border-black',
      'bg-white',
    ]) {
      expect(styleContains(thumb, token)).toBe(true);
    }
    expect(styleContains(thumb, 'transition-transform')).toBe(false);
    expect(styleContains(thumb, 'duration-150')).toBe(false);
    for (const forbidden of ['rounded-none', 'shadow-md', 'backdrop-blur']) {
      expect(styleContains(root, forbidden)).toBe(false);
      expect(styleContains(thumb, forbidden)).toBe(false);
    }
  });
});

// T-BRUTALIST-SWITCH-0001-CASE-DRAG-DEFERRED
// Real WC and shared Axis implementation with synthetic source-resolved metrics.
// These checks do not substitute for native layout/input evidence.
describe('Brutalist Switch temporary drag non-admission', () => {
  function input(root: HTMLElement, type: string, x = 14) {
    return root.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 73,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: 12,
        detail: 1,
      })
    );
  }
  function geometry(root: HTMLElement, thumb: HTMLElement, rem: number) {
    root.style.cssText = `box-sizing:border-box;width:${3 * rem}px;height:${1.5 * rem}px;border:2px solid;padding:0;`;
    root.getBoundingClientRect = () => new DOMRect(0, 0, 3 * rem, 1.5 * rem);
    thumb.getBoundingClientRect = () => new DOMRect(2 + rem / 4, 2, rem, rem);
  }
  for (const rem of [16, 32])
    for (const direction of ['ltr', 'rtl']) {
      it(`rejects raw draggable=true without a drag request at ${rem}px/${direction}`, async () => {
        const { root, thumb } = createSwitch({ draggable: true, direction });
        await flush();
        geometry(root, thumb, rem);
        const capture = vi.fn();
        root.setPointerCapture = capture;
        const changes: boolean[] = [];
        root.addEventListener('checkedChange', (event) =>
          changes.push((event as CustomEvent).detail.checked)
        );
        input(root, 'pointerdown');
        input(root, 'pointermove', direction === 'rtl' ? -30 : 60);
        expect(root.getExposes().dragging.get()).toBe(false);
        expect(root.getExposes().percentage.get()).toBe(0);
        expect(root.getExposes().checked.get()).toBe(false);
        expect(capture).not.toHaveBeenCalled();
        input(root, 'pointerup', direction === 'rtl' ? -30 : 60);
        expect(changes).toEqual([]); // No release-generated checked request.
        expect(root.getExposes().pressed.get()).toBe(false);
        expect(styleContains(root, 'p-0')).toBe(true);
        expect(styleContains(root, 'w-12')).toBe(true);
        expect(styleContains(thumb, 'size-4')).toBe(true);
        input(root, 'pointerdown');
        input(root, 'pointerup');
        input(root, 'click');
        expect(changes).toEqual([true]); // Ordinary tap still activates once.
        expect(styleContains(thumb, 'translate-x-5')).toBe(true);
        root.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
        expect(changes).toEqual([true, false]);
      });
    }
  it('keeps controlled refusal and dynamic raw true updates on the ordinary activation path', async () => {
    const { root, thumb } = createSwitch({ checked: true });
    await flush();
    geometry(root, thumb, 16);
    setElementProps(root, { checked: true, draggable: true });
    await flush();
    const changes: boolean[] = [];
    root.addEventListener('checkedChange', (event) =>
      changes.push((event as CustomEvent).detail.checked)
    );
    input(root, 'pointerdown', 34);
    input(root, 'pointermove', 14);
    input(root, 'pointerup', 14);
    expect(root.getExposes().dragging.get()).toBe(false);
    expect(root.getExposes().percentage.get()).toBe(100);
    expect(changes).toEqual([]);
    input(root, 'pointerdown');
    input(root, 'pointerup');
    input(root, 'click');
    expect(changes).toEqual([false]);
    expect(root.getExposes().checked.get()).toBe(true);
    expect(root.getAttribute('aria-checked')).toBe('true');
  });
  it('keeps disabled activation inert when the raw drag flag is true', async () => {
    const { root, thumb } = createSwitch({ draggable: true, disabled: true });
    await flush();
    geometry(root, thumb, 16);
    const changes: boolean[] = [];
    root.addEventListener('checkedChange', (event) =>
      changes.push((event as CustomEvent).detail.checked)
    );
    input(root, 'pointerdown');
    input(root, 'pointermove', 40);
    input(root, 'pointerup', 40);
    input(root, 'click', 40);
    root.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
    expect(root.getExposes().dragging.get()).toBe(false);
    expect(root.getExposes().checked.get()).toBe(false);
    expect(changes).toEqual([]);
  });
});
