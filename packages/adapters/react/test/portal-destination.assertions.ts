import { expect } from 'vitest';

/** Strict host-unit shape; native layout/paint remains separate evidence. */
export function expectInertReactPortalContainer(mount: HTMLElement): void {
  expect(mount.dataset.puiPortalMount).toBe('');
  expect(mount.style.display).toBe('contents');
  expect([...mount.attributes].map((attribute) => attribute.name).sort()).toEqual([
    'data-pui-portal-mount',
    'style',
  ]);
  expect(mount.style.length).toBe(1);
  expect(mount.getAttribute('role')).toBeNull();
  expect(mount.getAttribute('tabindex')).toBeNull();
}

export function expectStableReactPortalMount(
  host: HTMLElement,
  destination: HTMLElement
): HTMLElement {
  const mount = host.parentElement!;
  expect(mount).not.toBeNull();
  expect(mount.parentElement).toBe(destination);
  expect([...mount.childNodes]).toEqual([host]);
  // No styled box, paint, clip, transform, focus target or host input policy.
  expectInertReactPortalContainer(mount);
  expect(document.querySelectorAll('[data-pui-portal-mount]')).toHaveLength(1);
  return mount;
}
