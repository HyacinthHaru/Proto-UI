import type { MaterialContactLink } from '@proto.ui/core';
export type Entry = {
  kind: 'offer' | 'receive';
  link: MaterialContactLink;
  domain: object;
  current(): boolean;
  changed(): void;
  owner: object;
};
const families = new WeakMap<object, WeakMap<object, Set<Entry>>>();
function bucket(entry: Entry) {
  let domains = families.get(entry.link.family);
  if (!domains) families.set(entry.link.family, (domains = new WeakMap()));
  let entries = domains.get(entry.domain);
  if (!entries) domains.set(entry.domain, (entries = new Set()));
  return entries;
}
export function notify(entry: Entry) {
  for (const member of [...bucket(entry)]) member.changed();
}
export function add(entry: Entry) {
  bucket(entry).add(entry);
  notify(entry);
}
export function remove(entry: Entry) {
  bucket(entry).delete(entry);
  notify(entry);
}
export function matches(entry: Entry, kind: Entry['kind']) {
  return [...bucket(entry)].filter(
    (other) =>
      other.kind === kind &&
      other.link.key === entry.link.key &&
      other.link.ownerRole === entry.link.ownerRole &&
      other.link.paintRole === entry.link.paintRole &&
      other.current()
  );
}
