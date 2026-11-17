import { describe, expect, it } from 'vitest';
import { definePrototype } from '@proto.ui/core';
import { asTableStructure } from '@proto.ui/hooks';
import {
  ANATOMY_GET_PROTO_CAP,
  ANATOMY_INSTANCE_TOKEN_CAP,
  ANATOMY_PARENT_CAP,
  ANATOMY_ROOT_TARGET_CAP,
  type AnatomyPort,
} from '@proto.ui/module-anatomy';
import {
  TABLE_STRUCTURE_FAMILY,
  type TablePartRole,
  type TableStructurePort,
} from '@proto.ui/module-table-structure';
import { createRuntimeSession, type RuntimeSession } from '../../src';

type Owner = { parent: Owner | null; target: HTMLElement };
const getParent = (owner: unknown) => (owner as Owner).parent;
const getTarget = (owner: unknown) => (owner as Owner).target;

describe('Runtime Table target notifications', () => {
  it('keeps unrelated established tables quiet during a target replacement', async () => {
    const sessions: RuntimeSession[] = [];
    const elements: HTMLElement[] = [];
    const mount = async (role: TablePartRole, parent: Owner | null = null) => {
      const owner = { parent, target: document.createElement('div') };
      elements.push(owner.target);
      (parent?.target ?? document.body).append(owner.target);
      const proto = definePrototype({
        name: `table-target-domain-${role}`,
        setup(def) {
          def.anatomy.claim(TABLE_STRUCTURE_FAMILY, { role });
          const table = asTableStructure(role);
          if (role === 'headerCell') table.configure({ headerKey: 'key', headerKind: 'column' });
          if (role === 'cell') table.configure({ headers: ['key'] });
        },
      });
      let publishTarget!: () => void;
      const session = createRuntimeSession(proto, {
        prototypeName: proto.name,
        getRawProps: () => ({}),
        commit(_children, signal) {
          signal?.done();
        },
        schedule(task) {
          task();
        },
        onRuntimeReady(wiring) {
          wiring.attach('anatomy', [
            [ANATOMY_INSTANCE_TOKEN_CAP, owner],
            [ANATOMY_PARENT_CAP, getParent],
            [ANATOMY_GET_PROTO_CAP, () => proto],
            [ANATOMY_ROOT_TARGET_CAP, getTarget],
          ]);
          publishTarget = () => {
            wiring.attach('anatomy', [
              [ANATOMY_ROOT_TARGET_CAP, (part: unknown) => getTarget(part)],
            ]);
          };
        },
      });
      sessions.push(session);
      await session.mount();
      return { owner, session, publishTarget };
    };
    const table = async () => {
      const { owner, session } = await mount('root');
      const row = await mount('row', owner);
      await mount('headerCell', row.owner);
      const cell = await mount('cell', row.owner);
      const port = session.caps.getPort<TableStructurePort>('table-structure')!;
      return { root: session, cell, snapshot: () => port.getSnapshot() };
    };

    try {
      const publisher = await table();
      const sibling = await table();
      const original = publisher.snapshot();
      const unrelated = sibling.snapshot();
      expect(original).toMatchObject({ valid: true, rowCount: 1, columnCount: 2 });
      expect(unrelated).toMatchObject({ valid: true, rowCount: 1, columnCount: 2 });

      const replacement = document.createElement('div');
      elements.push(replacement);
      publisher.cell.owner.target.replaceWith(replacement);
      publisher.cell.owner.target = replacement;
      publisher.cell.publishTarget();

      expect(publisher.snapshot()).not.toBe(original);
      expect(publisher.snapshot()).toEqual(original);
      expect(sibling.snapshot()).toBe(unrelated);

      // Explicit structural publication still refreshes the family.
      publisher.root.caps.getPort<AnatomyPort>('anatomy')!.syncStructure();
      expect(sibling.snapshot()).not.toBe(unrelated);
      expect(sibling.snapshot()).toEqual(unrelated);
    } finally {
      for (const session of sessions.reverse()) await session.dispose();
      for (const element of elements) element.remove();
    }
  });
});
