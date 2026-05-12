import { searchMethods } from '../src/js/diagram/search.js';

describe('diagram search methods', () => {
  test('finds nodes by exact id before fuzzy label matching', () => {
    const ctx = {
      nodes: [
        { id: 'invoice', label: 'Invoice' },
        { id: 'invoice-draft', label: 'invoice' },
        { id: 'payment', label: 'Incoming Payment' }
      ]
    };

    expect(searchMethods._findNodesByQuery.call(ctx, 'invoice')).toEqual([{ id: 'invoice', label: 'Invoice' }]);
    expect(searchMethods._findNodesByQuery.call(ctx, 'pay')).toEqual([{ id: 'payment', label: 'Incoming Payment' }]);
    expect(searchMethods._findNodesByQuery.call(ctx, '')).toEqual([]);
  });

  test('returns trigger-specific highlight colors', () => {
    expect(searchMethods._getNodeStrokeFill({ type: 'trigger', triggerTypes: 'internal' })).toEqual({
      stroke: '#2e8b57',
      fill: 'rgba(46,139,87,0.10)'
    });
    expect(searchMethods._getNodeStrokeFill({ type: 'trigger', triggerTypes: 'external' })).toEqual({
      stroke: '#2b6cb0',
      fill: 'rgba(43,108,176,0.10)'
    });
    expect(searchMethods._getNodeStrokeFill({ type: 'action_group' })).toEqual({
      stroke: '#D66FFF',
      fill: 'rgba(255,0,255,0.10)'
    });
  });

  test('cycles repeated search hits', () => {
    const focused = [];
    const ctx = {
      nodes: [
        { id: 'node-a', label: 'Alpha' },
        { id: 'node-b', label: 'Alpha next' }
      ],
      _findNodesByQuery: searchMethods._findNodesByQuery,
      _focusNode(node) {
        focused.push(node.id);
      }
    };

    expect(searchMethods._searchAndFocus.call(ctx, 'node')).toBe(true);
    expect(searchMethods._searchAndFocus.call(ctx, 'node')).toBe(true);
    expect(focused).toEqual(['node-a', 'node-b']);

    expect(searchMethods._searchAndFocus.call(ctx, 'missing')).toBe(false);
  });
});
