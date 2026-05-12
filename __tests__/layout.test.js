import { layoutMethods } from '../src/js/diagram/layout.js';
import { itemMethods } from '../src/js/diagram/items.js';

function makeContext() {
  return {
    gap: 4,
    baseItemHeight: 25,
    computeItemHeight: itemMethods.computeItemHeight,
    isTriggerNode: layoutMethods.isTriggerNode,
    getTriggerKind: layoutMethods.getTriggerKind
  };
}

describe('diagram layout methods', () => {
  test('detects internal and external trigger nodes', () => {
    const ctx = makeContext();

    expect(layoutMethods.isTriggerNode.call(ctx, { type: 'trigger', triggerTypes: 'internal' })).toBe(true);
    expect(layoutMethods.isTriggerNode.call(ctx, { type: 'trigger', triggerTypes: 'external' })).toBe(true);
    expect(layoutMethods.isTriggerNode.call(ctx, { type: 'trigger', triggerTypes: 'manual' })).toBe(false);
    expect(layoutMethods.isTriggerNode.call(ctx, { type: 'action_group', triggerTypes: 'internal' })).toBe(false);

    expect(layoutMethods.getTriggerKind.call(ctx, { type: 'trigger', triggerTypes: 'external' })).toBe('external');
    expect(layoutMethods.getTriggerKind.call(ctx, { type: 'action_group' })).toBeNull();
  });

  test('computes nested item height recursively', () => {
    const ctx = makeContext();
    const field = {
      id: 'parent',
      children: [
        { id: 'child-a' },
        { id: 'child-b' }
      ]
    };

    expect(itemMethods.computeItemHeight.call(ctx, { id: 'plain' })).toBe(26);
    expect(itemMethods.computeItemHeight.call(ctx, field)).toBe(89);
  });

  test('assigns coordinates and diagram bounds without mutating link identity', () => {
    const ctx = makeContext();
    const nodes = [
      { id: 'external', type: 'trigger', triggerTypes: 'external', fields: [{ id: 'start' }] },
      { id: 'a', fields: [{ id: 'out' }] },
      { id: 'b', fields: [{ id: 'in' }] },
      { id: 'internal', type: 'trigger', triggerTypes: 'internal', fields: [{ id: 'kick' }] }
    ];
    const links = [
      { source: { node: 'a', field: 'out' }, target: { node: 'b', field: 'in' } }
    ];

    const result = layoutMethods.assignCoordinates.call(ctx, nodes, links);

    expect(result.links).toBe(links);
    expect(result.nodes).toBe(nodes);
    expect(result.diagramWidth).toBeGreaterThan(0);
    expect(result.diagramHeight).toBeGreaterThan(0);
    nodes.forEach((node) => {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.computedWidth).toBe(150);
      expect(node.computedHeight).toBeGreaterThan(0);
    });
  });
});
