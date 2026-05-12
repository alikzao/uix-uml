import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { templateMethods } from '../src/js/diagram/template.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticRoot = path.resolve(__dirname, '../..');

describe('template and compatibility facades', () => {
  test('renders stable component ids from UML id map', () => {
    const ctx = {
      _uid: 'demo',
      ids: {
        container: 'diagram-container-demo',
        inner: 'diagram-inner-demo',
        svg: 'diagram-demo',
        searchInput: 'searchInput-demo',
        btnSearch: 'btnSearch-demo',
        btnAdd: 'addNode-demo',
        btnIn: 'zoomIn-demo',
        btnOut: 'zoomOut-demo',
        btnReset: 'reset-demo'
      }
    };

    const html = templateMethods.render.call(ctx);

    expect(html).toContain('id="diagram-container-demo"');
    expect(html).toContain('id="diagram-inner-demo"');
    expect(html).toContain('id="diagram-demo"');
    expect(html).toContain('id="hbar-demo"');
    expect(html).toContain('id="hbar-inner-demo"');
    expect(html).toContain('id="searchInput-demo"');
  });

  test('legacy CSS facade points at packaged styles', () => {
    const css = fs.readFileSync(path.join(staticRoot, 'css/uml.css'), 'utf8').trim();
    expect(css).toBe("@import url('../diagram/src/styles/uml.css');");
  });

  test('legacy JS facade points at packaged source entry', () => {
    const js = fs.readFileSync(path.join(staticRoot, 'js/uml.js'), 'utf8').trim();
    expect(js).toBe("export { UML, createUML, initUML, initializeUMLSocket } from '../diagram/src/index.js';");
  });
});
