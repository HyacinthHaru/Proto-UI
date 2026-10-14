import { cap, type MaterialContactPlacement } from '@proto.ui/core';

/** Trusted host facts. No author-facing entrypoint exports physical samples. */
export type MaterialContactView = Readonly<{
  instance: object;
  target: object;
  document: object;
  identity: object;
  epoch: number;
  connected: boolean;
}>;
export type MaterialInputRegistration = Readonly<{
  instance: object;
  target: object;
  document: object;
  viewIdentity: object;
  viewEpoch: number;
  owner: object;
  ownerEpoch: number;
}>;
type ContactIdentity = Readonly<{
  owner: object;
  ownerEpoch: number;
  document: object;
  session: object;
  /** Strictly increasing across all sessions of one registration. */
  revision: number;
}>;
export type MaterialInputContact = ContactIdentity &
  (
    | Readonly<{
        phase: 'pending' | 'active' | 'released';
        coordinateSpace: object;
        down: Readonly<{ x: number; y: number }>;
        current: Readonly<{ x: number; y: number }>;
      }>
    | Readonly<{ phase: 'cancelled'; reason: string }>
  );
export interface MaterialInputReadLease {
  readonly registration: MaterialInputRegistration;
  current(): MaterialInputContact | null;
  subscribe(invalidated: () => void): () => void;
}
export type MaterialContactHostBinding = Readonly<{
  identity: object;
  owner: MaterialContactView;
  paint: MaterialContactView;
  input: MaterialInputRegistration;
  placement: MaterialContactPlacement;
  /** Must also gate any deferred work in the eventual paint provider. */
  isCurrent(): boolean;
}>;
export interface MaterialContactPaintLease {
  contact(sample: MaterialInputContact): void;
  clear(): void;
  dispose(): void;
}
/** Deliberately has no production provider or Runtime registration in this
 * slice. Registry methods are privileged host capabilities, not author facts. */
export interface MaterialContactHost {
  readView(instance: object): MaterialContactView | null;
  readInput(instance: object): MaterialInputReadLease | null;
  isCurrentInput(input: MaterialInputReadLease): boolean;
  subscribe(invalidated: () => void): () => void;
  attach(binding: MaterialContactHostBinding): MaterialContactPaintLease;
}
export const MATERIAL_CONTACT_HOST_CAP = cap<MaterialContactHost>(
  '@proto.ui/material-contact/host'
);
