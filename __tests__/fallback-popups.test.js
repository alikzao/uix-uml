import { jest } from '@jest/globals';
import { PopupComponent } from '/modules/core/js/popupComponent.js';
import { DemoUMLPopup } from '../src/js/demoUMLPopup.js';
import { UML } from '../src/index.js';

function makeDiagram(data = { status: 'ok', maps: { nodes: [], links: [] } }) {
  const diagram = Object.create(UML.prototype);
  diagram.state = { data };
  diagram.procId = 'demo-pipe';
  diagram._redrawFromLocalState = jest.fn();
  return diagram;
}

describe('fallback popup data operations', () => {
  test('demo fallback popup uses PopupComponent', () => {
    expect(DemoUMLPopup.prototype).toBeInstanceOf(PopupComponent);
  });

  test('addNode appends a normalized node and redraws from local state', () => {
    const diagram = makeDiagram();

    const id = diagram.addNode({
      label: 'Create Invoice',
      fields: [
        { id: 'invoice_id', label: 'Invoice ID', type: 'string' }
      ]
    });

    expect(id).toBe('create_invoice');
    expect(diagram.state.data.maps.nodes).toEqual([
      expect.objectContaining({
        id: 'create_invoice',
        label: 'Create Invoice',
        type: 'action_group',
        fields: [{ id: 'invoice_id', label: 'Invoice ID', type: 'string' }]
      })
    ]);
    expect(diagram._redrawFromLocalState).toHaveBeenCalledTimes(1);
  });

  test('addNode keeps generated ids unique', () => {
    const diagram = makeDiagram({
      status: 'ok',
      maps: {
        nodes: [{ id: 'new_action', label: 'New action', fields: [] }],
        links: []
      }
    });

    const id = diagram.addNode({ label: 'New action' });

    expect(id).toBe('new_action_2');
    expect(diagram.state.data.maps.nodes).toHaveLength(2);
  });

  test('addItemToNode appends an item to an existing node', () => {
    const diagram = makeDiagram({
      status: 'ok',
      maps: {
        nodes: [{ id: 'order', label: 'Order', fields: [] }],
        links: []
      }
    });

    const id = diagram.addItemToNode({ id: 'order' }, { label: 'Order ID' });

    expect(id).toBe('order_id');
    expect(diagram.state.data.maps.nodes[0].fields).toEqual([
      { id: 'order_id', label: 'Order ID', type: 'string' }
    ]);
    expect(diagram._redrawFromLocalState).toHaveBeenCalledTimes(1);
  });
});
