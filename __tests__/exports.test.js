import { jest } from '@jest/globals';
import { UML, createUML, initUML, initializeUMLSocket } from '../src/index.js';
import {
  UML as LegacyUML,
  createUML as legacyCreateUML,
  initUML as legacyInitUML,
  initializeUMLSocket as legacyInitializeUMLSocket
} from '../../js/uml.js';

describe('uix-uml public exports', () => {
  test('exports UML helpers', () => {
    expect(typeof UML).toBe('function');
    expect(typeof createUML).toBe('function');
    expect(typeof initUML).toBe('function');
    expect(typeof initializeUMLSocket).toBe('function');
  });

  test('legacy module facade re-exports package API', () => {
    expect(LegacyUML).toBe(UML);
    expect(legacyCreateUML).toBe(createUML);
    expect(legacyInitUML).toBe(initUML);
    expect(legacyInitializeUMLSocket).toBe(initializeUMLSocket);
  });

  test('UML prototype keeps component-facing methods visible', () => {
    [
      'getData',
      'refreshFromServer',
      'componentUpdate',
      'render',
      'addEvents',
      'drawNode',
      'drawItem',
      'updateLinks',
      'openCreateNodePopup',
      'addNode',
      'addItemToNode',
      '_searchAndFocus',
      'initHBar'
    ].forEach((methodName) => {
      expect(typeof UML.prototype[methodName]).toBe('function');
    });
  });

  test('initializes bundled socket service before UML construction', () => {
    const socket = { on: jest.fn(), off: jest.fn(), emit: jest.fn(), onAny: jest.fn() };
    global.window = {
      config: { isDev: true },
      location: { origin: 'http://localhost:8765' }
    };
    global.io = jest.fn(() => socket);

    const service = initializeUMLSocket({ userId: 'demo-user' });

    expect(global.io).toHaveBeenCalledWith(
      'http://localhost:8765',
      expect.objectContaining({
        query: { userId: 'demo-user' },
        path: '/socket.io',
        transports: ['websocket', 'polling']
      })
    );
    expect(service.getSocket()).toBe(socket);
  });
});
