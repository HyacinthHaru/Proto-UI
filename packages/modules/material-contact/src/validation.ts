import type {
  AnatomyFamily,
  MaterialContactLink,
  MaterialContactPaintDeclaration,
} from '@proto.ui/core';
import type { MaterialContactView, MaterialInputContact, MaterialInputRegistration } from './caps';

export const object = (value: unknown): value is object => !!value && typeof value === 'object';
export const epoch = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;

/** Descriptor inspection rejects getters, extra fields and inherited payloads;
 * structural TypeScript assignability is intentionally not used as validation. */
export function record(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = []
) {
  if (!object(value) || Array.isArray(value))
    throw TypeError('[MaterialContact] plain data required');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw TypeError('[MaterialContact] plain data required');
  const result: Record<string, unknown> = Object.create(null);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || ![...required, ...optional].includes(key))
      throw TypeError('[MaterialContact] unknown field');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor) || !descriptor.enumerable)
      throw TypeError('[MaterialContact] data properties required');
    result[key] = descriptor.value;
  }
  if (!required.every((key) => Object.hasOwn(result, key)))
    throw TypeError('[MaterialContact] missing field');
  return result;
}
function family(value: unknown, roles: readonly string[]): AnatomyFamily {
  const f = record(value, ['__brand', 'debugName', 'decl']);
  if (f.__brand !== 'AnatomyFamily' || typeof f.debugName !== 'string')
    throw TypeError('[MaterialContact] invalid family');
  const decl = record(f.decl, ['roles'], ['relations', 'profiles']);
  if (
    !object(decl.roles) ||
    !roles.every((role) => {
      const d = Object.getOwnPropertyDescriptor(decl.roles, role);
      return !!d && 'value' in d && !!d.value;
    })
  )
    throw TypeError('[MaterialContact] undeclared role');
  return value as AnatomyFamily;
}
export function snapshotLink(value: unknown): MaterialContactLink {
  const v = record(value, ['family', 'key', 'ownerRole', 'paintRole']);
  if (
    typeof v.key !== 'string' ||
    v.key.length < 1 ||
    v.key.length > 64 ||
    typeof v.ownerRole !== 'string' ||
    typeof v.paintRole !== 'string'
  )
    throw TypeError('[MaterialContact] invalid link');
  return Object.freeze({
    family: family(v.family, [v.ownerRole, v.paintRole]),
    key: v.key,
    ownerRole: v.ownerRole,
    paintRole: v.paintRole,
  });
}
export function snapshotPaint(value: unknown): MaterialContactPaintDeclaration {
  const v = record(value, ['source', 'placement'], ['link']);
  if (v.placement !== 'fixed' && v.placement !== 'style-owned-translation')
    throw TypeError('[MaterialContact] invalid placement');
  if (v.source === 'self' && !Object.hasOwn(v, 'link'))
    return Object.freeze({ source: 'self', placement: v.placement });
  if (v.source === 'part')
    return Object.freeze({ source: 'part', placement: v.placement, link: snapshotLink(v.link) });
  throw TypeError('[MaterialContact] invalid source');
}
export function snapshotView(value: unknown): MaterialContactView {
  const v = record(value, ['instance', 'target', 'document', 'identity', 'epoch', 'connected']);
  if (
    ![v.instance, v.target, v.document, v.identity].every(object) ||
    !epoch(v.epoch) ||
    typeof v.connected !== 'boolean'
  )
    throw TypeError('[MaterialContact] invalid view');
  return Object.freeze(v) as MaterialContactView;
}
export function snapshotRegistration(value: unknown): MaterialInputRegistration {
  const v = record(value, [
    'instance',
    'target',
    'document',
    'viewIdentity',
    'viewEpoch',
    'owner',
    'ownerEpoch',
  ]);
  if (
    ![v.instance, v.target, v.document, v.viewIdentity, v.owner].every(object) ||
    !epoch(v.viewEpoch) ||
    !epoch(v.ownerEpoch)
  )
    throw TypeError('[MaterialContact] invalid input registration');
  return Object.freeze(v) as MaterialInputRegistration;
}
export function snapshotContact(value: unknown): MaterialInputContact {
  const v = record(
    value,
    ['owner', 'ownerEpoch', 'document', 'session', 'revision', 'phase'],
    ['coordinateSpace', 'down', 'current', 'reason']
  );
  if (![v.owner, v.document, v.session].every(object) || !epoch(v.ownerEpoch) || !epoch(v.revision))
    throw TypeError('[MaterialContact] invalid contact identity');
  if (v.phase === 'cancelled') {
    if (
      typeof v.reason !== 'string' ||
      !v.reason ||
      ['coordinateSpace', 'down', 'current'].some((k) => Object.hasOwn(v, k))
    )
      throw TypeError('[MaterialContact] invalid cancellation');
  } else {
    if (
      !['pending', 'active', 'released'].includes(v.phase as string) ||
      !object(v.coordinateSpace) ||
      Object.hasOwn(v, 'reason')
    )
      throw TypeError('[MaterialContact] invalid phase');
    for (const key of ['down', 'current']) {
      const p = record(v[key], ['x', 'y']);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y))
        throw TypeError('[MaterialContact] nonfinite contact');
      v[key] = Object.freeze(p);
    }
  }
  return Object.freeze(v) as MaterialInputContact;
}
export const sameView = (a: MaterialContactView, b: MaterialContactView) =>
  a.instance === b.instance &&
  a.target === b.target &&
  a.document === b.document &&
  a.identity === b.identity &&
  a.epoch === b.epoch &&
  a.connected === b.connected;
export const sameRegistration = (a: MaterialInputRegistration, b: MaterialInputRegistration) =>
  a.instance === b.instance &&
  a.target === b.target &&
  a.document === b.document &&
  a.viewIdentity === b.viewIdentity &&
  a.viewEpoch === b.viewEpoch &&
  a.owner === b.owner &&
  a.ownerEpoch === b.ownerEpoch;
