import type { State } from './state';

export type A11yRole = string;
export type A11yRoleTarget = A11yRole | State<A11yRole>;

export type A11yTextTarget = string | State<string | null | undefined>;
export type A11yTextAlternative = { kind: 'content' } | { kind: 'text'; value: A11yTextTarget };

export type A11yStateKey = string;
export type A11yActionKey = string;
export type A11yRelationKey = string;

export type A11yStateBinding<V = unknown> = {
  key: A11yStateKey;
  state: State<V>;
};

export type A11yActionSpec = {
  event?: string;
};

export type A11yRelationTarget = string | State<string | null | undefined>;
export type A11yIdentityTarget = string | State<string | null | undefined>;

export type A11yRelationSpec = {
  target: A11yRelationTarget;
};

export type A11yTreeBehavior = {
  hidden?: boolean | State<boolean>;
  mergeChildren?: boolean | State<boolean>;
};

export type A11ySemanticObjectSnapshot = {
  id?: string | null;
  role?: A11yRole;
  name?: A11yTextAlternative;
  description?: A11yTextAlternative;
  states: Record<A11yStateKey, unknown>;
  actions: Record<A11yActionKey, A11yActionSpec>;
  relations: Record<A11yRelationKey, string | null | undefined>;
  tree?: A11yTreeBehavior;
};

export type A11yDefAPI = {
  id(target: A11yIdentityTarget): void;
  role(role: A11yRoleTarget): void;
  name(value: A11yTextTarget): void;
  nameFromContent(): void;
  description(value: A11yTextTarget): void;
  state<V>(key: A11yStateKey, handle: State<V>): void;
  action(key: A11yActionKey, spec?: A11yActionSpec): void;
  relation(key: A11yRelationKey, spec: A11yRelationSpec): void;
  tree(patch: A11yTreeBehavior): void;
};
