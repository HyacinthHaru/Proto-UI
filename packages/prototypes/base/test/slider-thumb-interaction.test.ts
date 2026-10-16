import { afterEach, expect, it } from 'vitest';
import { AdaptToWebComponent, setElementProps } from '@proto.ui/adapter-web-component';
import * as base from '../src/slider';
import * as shadcn from '../../shadcn/src/slider';
import * as brutalist from '../../brutalist/src/slider';
import * as bootstrap from '../../bootstrap-2-3-2/src/slider';
import * as glass from '../../liquid-glass/src/slider';
import { fieldRoot } from '../src/field';
const families = { base, shadcn, brutalist, 'bootstrap-2-3-2': bootstrap, 'liquid-glass': glass };
for (const group of Object.values(families))
  for (const p of Object.values(group))
    if (typeof p === 'object' && p && 'setup' in p) AdaptToWebComponent(p as any);
AdaptToWebComponent(fieldRoot);
const flush = async () => {
  for (let i = 0; i < 40; i++) await Promise.resolve();
};
afterEach(async () => {
  document.body.replaceChildren();
  await flush();
});
const pointer = (type: string, props: PointerEventInit = {}) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 7,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    clientX: 60,
    clientY: 6,
    ...props,
  });
async function fixture(family: string, field: boolean, props: Record<string, unknown> = {}) {
  const root = document.createElement(`${family}-slider-root`) as any;
  const track = document.createElement(`${family}-slider-track`) as any;
  const thumb = document.createElement(
    `${family}-slider-${field ? 'field-thumb' : 'thumb'}`
  ) as any;
  setElementProps(root, { defaultValue: 25, ...props });
  track.append(thumb);
  root.append(track);
  if (field) {
    const owner = document.createElement('base-field-root');
    owner.append(root);
    document.body.append(owner);
  } else document.body.append(root);
  await flush();
  track.getBoundingClientRect = () => new DOMRect(10, 0, 200, 12);
  thumb.getBoundingClientRect = () => new DOMRect(46, -8, 28, 28);
  return { root, track, thumb, facts: thumb.getExposes() };
}
for (const family of Object.keys(families))
  for (const field of [false, true]) {
    it(`${family} thumb facts follow the accepted Track session, field=${field}`, async () => {
      const f = await fixture(family, field);
      expect(f.facts.hovered.get()).toBe(false);
      expect(f.facts.pressed.get()).toBe(false);
      f.thumb.dispatchEvent(pointer('pointerenter'));
      await flush();
      expect(f.facts.hovered.get()).toBe(true);
      f.thumb.dispatchEvent(pointer('pointerdown'));
      await flush();
      expect(f.root.getExposes().dragging.get()).toBe(true);
      expect(f.facts.pressed.get()).toBe(true);
      f.thumb.dispatchEvent(pointer('pointerleave', { clientX: 100 }));
      await flush();
      expect(f.facts.hovered.get()).toBe(false);
      expect(f.facts.pressed.get()).toBe(true); // captured drag survives leaving the thumb
      f.track.dispatchEvent(pointer('pointerup', { clientX: 160 }));
      await flush();
      expect(f.root.getExposes().dragging.get()).toBe(false);
      expect(f.facts.pressed.get()).toBe(false);
      expect(f.root.getExposes().value.get()).toBe(75);
      f.thumb.dispatchEvent(pointer('pointerenter'));
      f.thumb.dispatchEvent(pointer('pointerdown'));
      await flush();
      expect(f.facts.pressed.get()).toBe(true);
      f.track.dispatchEvent(pointer('lostpointercapture'));
      await flush();
      expect(f.root.getExposes().dragging.get()).toBe(false);
      expect(f.facts.pressed.get()).toBe(false);
      expect(f.facts.hovered.get()).toBe(false);
      expect(f.root.getExposes().value.get()).toBe(75); // cancel restores accepted start
      f.thumb.getExposes().focusSelf();
      await flush();
      f.thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await flush();
      expect(f.root.getExposes().value.get()).toBe(100);
      expect(f.facts.pressed.get()).toBe(false);
    });
    it(`${family} clears facts on policy, blur and unmount without changing controlled ownership, field=${field}`, async () => {
      const f = await fixture(family, field, { value: 25 });
      f.thumb.dispatchEvent(pointer('pointerenter'));
      f.thumb.dispatchEvent(pointer('pointerdown'));
      await flush();
      expect(f.facts.pressed.get()).toBe(true);
      setElementProps(f.root, { value: 25, disabled: true });
      await flush();
      expect(f.facts.pressed.get()).toBe(false);
      expect(f.facts.hovered.get()).toBe(false);
      f.thumb.dispatchEvent(pointer('pointerenter'));
      f.thumb.dispatchEvent(pointer('pointerdown'));
      await flush();
      expect(f.facts.hovered.get()).toBe(false);
      expect(f.facts.pressed.get()).toBe(false);
      setElementProps(f.root, { value: 25, readOnly: true });
      await flush();
      f.thumb.dispatchEvent(pointer('pointerenter'));
      f.thumb.dispatchEvent(pointer('pointerdown'));
      await flush();
      expect(f.facts.hovered.get()).toBe(true);
      expect(f.facts.pressed.get()).toBe(false);
      setElementProps(f.root, { value: 25 });
      await flush();
      f.thumb.dispatchEvent(pointer('pointerdown'));
      await flush();
      expect(f.facts.pressed.get()).toBe(true);
      window.dispatchEvent(new Event('blur'));
      await flush();
      expect(f.facts.pressed.get()).toBe(false);
      expect(f.facts.hovered.get()).toBe(false);
      expect(f.root.getExposes().value.get()).toBe(25);
      f.thumb.dispatchEvent(pointer('pointerenter'));
      f.thumb.dispatchEvent(pointer('pointerdown'));
      await flush();
      const parent = f.root.parentElement!;
      f.root.remove();
      await flush();
      expect(() => f.facts.pressed.get()).toThrow(/terminal disposal/);
      parent.append(f.root);
      await flush();
      expect(f.thumb.getExposes().pressed.get()).toBe(false);
    });
  }

it('ordinary Slider method lookup preserves invalid live-domain errors', async () => {
  const { sliderMethod } = await import('../src/slider/shared');
  const error = Object.assign(new Error('invalid live claim'), { code: 'ANATOMY_CLAIM_INVALID' });
  expect(() =>
    sliderMethod(
      {
        anatomy: {
          partsOf() {
            throw error;
          },
        },
      } as any,
      'requestValue',
      20
    )
  ).toThrow(error);
});
for (const field of [false, true])
  it(`retiring the Track cancels the existing Root session, field=${field}`, async () => {
    const f = await fixture('base', field);
    f.thumb.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
    await flush();
    expect(f.root.getExposes().dragging.get()).toBe(true);
    expect(f.root.getExposes().value.get()).toBe(45);
    f.track.remove();
    await flush();
    expect(f.root.getExposes().dragging.get()).toBe(false);
    expect(f.root.getExposes().value.get()).toBe(25);
  });

for (const family of Object.keys(families))
  for (const field of [false, true]) {
    it(`${family} retiring and restoring Thumb revokes the old pointer lease, field=${field}`, async () => {
      const f = await fixture(family, field);
      const commits: unknown[] = [];
      f.root.addEventListener('valueCommit', (e: Event) => commits.push(e));
      f.thumb.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
      await flush();
      expect(f.root.getExposes().value.get()).toBe(45);
      f.thumb.remove();
      await flush();
      expect(f.root.getExposes().beginInteraction()).toBe(false);
      expect(f.root.getExposes().dragging.get()).toBe(false);
      expect(f.root.getExposes().value.get()).toBe(25);
      for (const type of ['pointermove', 'pointerup', 'pointerdown', 'pointermove', 'pointerup'])
        f.track.dispatchEvent(pointer(type, { clientX: 180 }));
      await flush();
      expect(f.root.getExposes().value.get()).toBe(25);
      expect(f.root.getExposes().dragging.get()).toBe(false);
      expect(commits).toHaveLength(0);
      f.track.append(f.thumb);
      await flush();
      f.track.dispatchEvent(pointer('pointermove', { clientX: 180 }));
      f.track.dispatchEvent(pointer('pointerup', { clientX: 180 }));
      await flush();
      expect(f.root.getExposes().value.get()).toBe(25);
      expect(commits).toHaveLength(0);
      f.thumb.dispatchEvent(pointer('pointerdown', { pointerId: 8, clientX: 100 }));
      f.track.dispatchEvent(pointer('pointerup', { pointerId: 8, clientX: 160 }));
      await flush();
      expect(f.root.getExposes().value.get()).toBe(75);
      expect(f.root.getExposes().dragging.get()).toBe(false);
      expect(commits).toHaveLength(1);
    });
    it(`${family} reset revokes capture before the next fresh gesture, field=${field}`, async () => {
      const f = await fixture(family, field);
      f.thumb.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
      await flush();
      f.root.getExposes().resetValue();
      await flush();
      f.track.dispatchEvent(pointer('pointermove', { clientX: 180 }));
      f.track.dispatchEvent(pointer('pointerup', { clientX: 180 }));
      await flush();
      expect(f.root.getExposes().value.get()).toBe(25);
      expect(f.root.getExposes().dragging.get()).toBe(false);
      f.thumb.dispatchEvent(pointer('pointerdown', { pointerId: 8, clientX: 100 }));
      f.track.dispatchEvent(pointer('pointerup', { pointerId: 8, clientX: 160 }));
      await flush();
      expect(f.root.getExposes().value.get()).toBe(75);
    });
    for (const part of ['track', 'root'])
      it(`${family} ${part} retirement and reentry rejects old samples, field=${field}`, async () => {
        const f = await fixture(family, field);
        f.thumb.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
        await flush();
        const node = f[part as 'track' | 'root'];
        const parent = node.parentElement!;
        node.remove();
        await flush();
        parent.append(node);
        await flush();
        f.track.dispatchEvent(pointer('pointermove', { clientX: 180 }));
        f.track.dispatchEvent(pointer('pointerup', { clientX: 180 }));
        await flush();
        expect(f.root.getExposes().value.get()).toBe(25);
        expect(f.root.getExposes().dragging.get()).toBe(false);
        f.thumb.dispatchEvent(pointer('pointerdown', { pointerId: 8, clientX: 100 }));
        f.track.dispatchEvent(pointer('pointerup', { pointerId: 8, clientX: 160 }));
        await flush();
        expect(f.root.getExposes().value.get()).toBe(75);
      });
  }
for (const policy of ['disabled', 'readOnly'])
  it(`Field policy ${policy} toggle cancels rather than resumes the old pointer lease`, async () => {
    const f = await fixture('base', true);
    f.thumb.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
    await flush();
    setElementProps(f.root.parentElement, { [policy]: true });
    await flush();
    expect(f.root.getExposes().dragging.get()).toBe(false);
    setElementProps(f.root.parentElement, { [policy]: false });
    await flush();
    f.track.dispatchEvent(pointer('pointermove', { clientX: 180 }));
    f.track.dispatchEvent(pointer('pointerup', { clientX: 180 }));
    await flush();
    expect(f.root.getExposes().value.get()).toBe(25);
    f.thumb.dispatchEvent(pointer('pointerdown', { pointerId: 8, clientX: 100 }));
    f.track.dispatchEvent(pointer('pointerup', { pointerId: 8, clientX: 160 }));
    await flush();
    expect(f.root.getExposes().value.get()).toBe(75);
  });

for (const field of [false, true])
  for (const cause of ['thumb-retired', 'reset', 'root-cancel'])
    it(`releases the actual Track capture lease on ${cause}, field=${field}`, async () => {
      const f = await fixture('base', field);
      const held = new Set<number>();
      const released: number[] = [];
      f.track.setPointerCapture = (id: number) => held.add(id);
      f.track.hasPointerCapture = (id: number) => held.has(id);
      f.track.releasePointerCapture = (id: number) => {
        held.delete(id);
        released.push(id);
      };
      f.thumb.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
      await flush();
      expect(held.has(7)).toBe(true);
      if (cause === 'thumb-retired') f.thumb.remove();
      else if (cause === 'reset') f.root.getExposes().resetValue();
      else f.root.getExposes().cancelInteraction();
      await flush();
      expect(held.size).toBe(0);
      expect(released).toEqual([7]);
      expect(f.root.getExposes().value.get()).toBe(25);
    });

for (const field of [false, true])
  it(`keyboard-focused Shadcn captured drag retires with all root providers, field=${field}`, async () => {
    const f = await fixture('shadcn', field);
    f.thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    f.thumb.getExposes().focusSelf();
    await flush();
    const external = document.createElement('button');
    document.body.append(external);
    external.focus();
    await flush();
    f.thumb.dispatchEvent(pointer('pointerdown', { clientX: 100 }));
    await flush();
    expect(f.facts.pressed.get()).toBe(true);
    expect(f.facts.focusVisible.get()).toBe(true);
    document.body.replaceChildren();
    await flush();
  });

// T-AXIS-INPUT-DIRECTIONAL-0001-CASE-PREVIEW
// Scalar families share a preview fact; persistent percentage and ARIA stay truthful.
for (const family of Object.keys(families))
  for (const field of [false, true])
    it(`${family} follows controlled display preview without changing request cadence, field=${field}`, async () => {
      const f = await fixture(family, field, { value: 25 });
      const changes: number[] = [],
        commits: number[] = [],
        atCommit: number[] = [];
      f.root.addEventListener('valueChange', (event: CustomEvent) =>
        changes.push(event.detail.value)
      );
      f.root.addEventListener('valueCommit', (event: CustomEvent) => {
        commits.push(event.detail.value);
        atCommit.push(f.facts.displayPercentage.get());
      });
      f.thumb.dispatchEvent(pointer('pointerdown'));
      f.track.dispatchEvent(pointer('pointermove', { clientX: 160 }));
      await flush();
      expect(f.facts.displayPercentage.get()).toBe(75);
      expect(f.root.getExposes().displayPercentage.get()).toBe(75);
      expect(f.facts.value.get()).toBe(25);
      expect(f.facts.percentage.get()).toBe(25);
      expect(f.thumb.getAttribute('aria-valuenow')).toBe('25');
      expect(f.thumb.style.getPropertyValue('--pui-display-percentage')).toBe('75');
      f.track.dispatchEvent(pointer('pointermove', { clientX: 110 }));
      f.track.dispatchEvent(pointer('pointerup', { clientX: 110 }));
      await flush();
      expect(changes).toEqual([75, 50, 50]);
      expect(commits).toEqual([25]); // Existing scalar controlled commit semantics.
      expect(atCommit).toEqual([25]);
      expect(f.facts.displayPercentage.get()).toBe(25);
    });

it('scalar Slider clears provisional display on external truth, cancel and policy changes', async () => {
  const f = await fixture('base', false, { value: 25 });
  f.thumb.dispatchEvent(pointer('pointerdown'));
  f.track.dispatchEvent(pointer('pointermove', { clientX: 160 }));
  expect(f.facts.displayPercentage.get()).toBe(75);
  setElementProps(f.root, { value: 60 });
  await flush();
  expect(f.facts.displayPercentage.get()).toBe(60);
  f.track.dispatchEvent(pointer('pointermove', { clientX: 110 }));
  expect(f.facts.displayPercentage.get()).toBe(50);
  setElementProps(f.root, { value: 60 });
  await flush();
  expect(f.facts.displayPercentage.get()).toBe(50); // Same-value render is not a new owner answer.
  f.track.dispatchEvent(pointer('pointercancel'));
  await flush();
  expect(f.facts.displayPercentage.get()).toBe(60);
  f.thumb.dispatchEvent(pointer('pointerdown'));
  f.track.dispatchEvent(pointer('pointermove', { clientX: 160 }));
  setElementProps(f.root, { value: 60, disabled: true });
  await flush();
  expect(f.facts.displayPercentage.get()).toBe(60);
  expect(f.root.getExposes().dragging.get()).toBe(false);
});

it('scalar Slider preview cannot survive a reentrant refusal that disables the control', async () => {
  const f = await fixture('base', false, { value: 25 });
  const commits: number[] = [];
  f.root.addEventListener('valueChange', () =>
    setElementProps(f.root, { value: 25, disabled: true })
  );
  f.root.addEventListener('valueCommit', (event: CustomEvent) => commits.push(event.detail.value));
  f.thumb.dispatchEvent(pointer('pointerdown'));
  f.track.dispatchEvent(pointer('pointermove', { clientX: 160 }));
  await flush();
  f.track.dispatchEvent(pointer('pointerup', { clientX: 160 }));
  expect(f.facts.displayPercentage.get()).toBe(25);
  expect(f.facts.value.get()).toBe(25);
  expect(commits).toEqual([]);
});

it('scalar Slider stops the old request when a display observer cancels synchronously', async () => {
  const f = await fixture('base', false, { value: 25 });
  const changes: number[] = [];
  f.root.addEventListener('valueChange', (event: CustomEvent) => changes.push(event.detail.value));
  const off = f.root.getExposes().displayPercentage.subscribe((event: any) => {
    if (event.type === 'next' && event.next === 75) f.root.getExposes().cancelInteraction();
  });
  f.thumb.dispatchEvent(pointer('pointerdown'));
  f.track.dispatchEvent(pointer('pointermove', { clientX: 160 }));
  await flush();
  expect(changes).toEqual([]);
  expect(f.facts.displayPercentage.get()).toBe(25);
  expect(f.root.getExposes().dragging.get()).toBe(false);
  off();
});

for (const action of ['reset', 'commit', 'replace', 'external-truth'])
  it(`scalar Slider retires a suspended preview request after reentrant ${action}`, async () => {
    const f = await fixture('base', false, { value: 25 });
    const ex = f.root.getExposes();
    const changes: number[] = [],
      commits: number[] = [];
    f.root.addEventListener('valueChange', (event: CustomEvent) =>
      changes.push(event.detail.value)
    );
    f.root.addEventListener('valueCommit', (event: CustomEvent) =>
      commits.push(event.detail.value)
    );
    const off = ex.displayPercentage.subscribe((event: any) => {
      if (event.type !== 'next' || event.next !== 75) return;
      if (action === 'reset') ex.resetValue();
      else if (action === 'commit') ex.commitValue();
      else if (action === 'external-truth') setElementProps(f.root, { value: 60 });
      else {
        ex.cancelInteraction();
        expect(ex.beginInteraction()).toBe(true);
      }
    });
    f.thumb.dispatchEvent(pointer('pointerdown'));
    f.track.dispatchEvent(pointer('pointermove', { clientX: 160 }));
    await flush();
    expect(changes).toEqual(action === 'reset' ? [25] : []);
    expect(commits).toEqual(action === 'commit' ? [25] : []);
    expect(ex.displayPercentage.get()).toBe(action === 'external-truth' ? 60 : 25);
    expect(ex.dragging.get()).toBe(action === 'replace' || action === 'external-truth');
    off();
  });

it('scalar controlled Slider preserves Field change reporting after synchronous owner acceptance', async () => {
  const f = await fixture('base', true, { value: 25 });
  const owner = f.root.parentElement;
  setElementProps(owner, { externalValidation: true, validationMode: 'onChange' });
  await flush();
  const requests: any[] = [];
  owner.addEventListener('validationRequest', (event: CustomEvent) => requests.push(event.detail));
  f.root.addEventListener('valueChange', (event: CustomEvent) =>
    setElementProps(f.root, { value: event.detail.value })
  );
  f.thumb.dispatchEvent(pointer('pointerdown'));
  f.track.dispatchEvent(pointer('pointermove', { clientX: 160 }));
  await flush();
  expect(f.root.getExposes().value.get()).toBe(75);
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({ value: 75, reason: 'change' });
  expect(typeof requests[0].requestId).toBe('string');
});
