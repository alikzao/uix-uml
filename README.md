# UIX UML Diagram

`@alikzao/uix-uml-diagram` is a browser-first UIX component for UML-like diagrams, database schema maps, and workflow graphs.

Demo:
- [UIX Playground UML example](https://alikzao.github.io/uix-playground/?example=uml-diagram)
- Local standalone demo: `demo.html`

It includes:
- Main `UML` component compatible with `ExtendedComponent`
- Database and workflow popup registry
- Link creation/deletion helpers
- SVG rendering, layout, search, menus, and horizontal diagram scrolling
- CSS packaged for standalone plugin builds

## Monorepo Usage

Legacy paths are preserved:
- `/modules/uml/js/uml.js`
- `/modules/uml/css/uml.css`

The current application can keep using:

```js
import { UML } from '/modules/uml/js/uml.js';
```

## Public API

```js
import { UML, createUML, initUML, initializeUMLSocket } from './dist/uix-uml.esm.js';
```

- `UML` is the main component class.
- `createUML(selector, props?)` creates a component instance without loading data.
- `initUML(selector, props?)` creates a component and calls `getData()` + `initState()` unless `autoLoad: false` is passed.
- `initializeUMLSocket(options?)` initializes the bundled UIX socket service before constructing `UML`.

When `popupKeys` are provided, create/edit actions use the registered UIX popup components. When they are omitted, the package falls back to a small local popup so `demo.html` can create nodes and items without a backend popup runtime.

## Minimal Data Example

```js
const demoData = {
  status: 'ok',
  pipeId: 'demo-pipe',
  maps: {
    nodes: [
      {
        id: 'order',
        label: 'Create Order',
        type: 'trigger',
        triggerTypes: 'external',
        sort: 0,
        fields: [
          { id: 'payload', label: 'Payload', type: 'object' },
          { id: 'customer_id', label: 'Customer ID', type: 'string' }
        ]
      },
      {
        id: 'invoice',
        label: 'Generate Invoice',
        type: 'action_group',
        sort: 1,
        fields: [
          { id: 'invoice_id', label: 'Invoice ID', type: 'string' },
          {
            id: 'totals',
            label: 'Totals',
            type: 'object',
            children: [
              { id: 'subtotal', label: 'Subtotal', type: 'number' },
              { id: 'tax', label: 'Tax', type: 'number' }
            ]
          }
        ]
      }
    ],
    links: [
      {
        source: { node: 'order', field: 'customer_id' },
        target: { node: 'invoice', field: 'invoice_id' }
      }
    ]
  }
};

initializeUMLSocket({ userId: 'demo-user' });

const diagram = new UML('#diagram', {
  data: { id: 'demo-pipe' },
  popupKeys: {},
  linkKeys: { api: 'link.api.uml' }
});

await diagram.initState({ data: demoData });
```

## Build For Plugins/GitHub

```bash
npm run build
```

Build output:
- `dist/uix-uml.esm.js` (ESM)
- `dist/uix-uml.iife.js` (single script for browser/framework integration)
- `dist/uix-uml.css` with Bootstrap Icons font assets in `dist/fonts`

### Script-Only Usage

```html
<link rel="stylesheet" href="./uix-uml.css" />
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="./uix-uml.iife.js"></script>
<script>
  window.UIXUML.initializeUMLSocket({ userId: 'demo-user' });

  const diagram = new window.UIXUML.UML('#diagram', {
    init_url: '/get/list/maps',
    popupKeys: {
      createNode: 'node.popup.db',
      createItem: 'item.popup.db'
    },
    linkKeys: { api: 'link.api.db' }
  });

  diagram.getData().then((data) => diagram.initState({ data }));
</script>
```

## Runtime Expectations

The component is designed for the UIX/ERP browser runtime. The bundle includes the UIX component classes through webpack aliases, but the host page still needs:

- `d3` available globally as `window.d3`
- `req` available globally for backend calls when loading/saving data
- `t`/`i18n` globals if translated popup text is used
- a socket runtime initialized by the host app, or a compatible `io` mock for local demos

## Local Demo From Dist

Open:

- `demo.html`

It is wired to `./dist/uix-uml.css` and `./dist/uix-uml.iife.js`.

## Source Layout

```text
src/
  index.js
  plugin-entry.js
  js/
    uml.js
    diagram/
    registries/
  styles/
```

`src/js/uml.js` intentionally keeps the main component structure visible and delegates heavy implementation to diagram modules.
