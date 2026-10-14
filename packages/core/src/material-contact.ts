import type { AnatomyFamily } from './anatomy';

/** Proposed portable declaration. No host identity, coordinates, callbacks or
 * input operations. Public names and admission remain under owner review. */
export type MaterialContactLink = Readonly<{
  family: AnatomyFamily;
  key: string;
  ownerRole: string;
  paintRole: string;
}>;

export type MaterialContactPlacement = 'fixed' | 'style-owned-translation';

export type MaterialContactPaintDeclaration =
  | Readonly<{
      source: 'self';
      placement: MaterialContactPlacement;
      link?: never;
    }>
  | Readonly<{
      source: 'part';
      placement: MaterialContactPlacement;
      link: MaterialContactLink;
    }>;

/** Setup-only declaration handle. At most one receive per paint instance;
 * duplicate self/part declarations are rejected, never last-write-wins.
 * The material-contact module implements cardinality, current-role,
 * strict plain-data snapshot and same-domain checks. Types alone prove none of
 * those facts. There is intentionally no sample/current/activate/capture API. */
export interface MaterialContactHandle {
  offer(link: MaterialContactLink): void;
  receive(declaration: MaterialContactPaintDeclaration): void;
}

// No MaterialCandidate, MaterialSlot or VisualFeedbackFrame grammar change is
// proposed. contact:'pointer' requests self contact unless the local instance
// explicitly declares a part receiver. An invalid explicit receiver never
// silently falls back to observing its own router.
