import { UML } from './js/uml.js';
import socketService from '/modules/core/js/socketService.js';

export function initializeUMLSocket(options = {}) {
  socketService.initialize({
    userId: options.userId || 'uix-uml-demo'
  });
  return socketService;
}

export function createUML(selector, props = {}) {
  return new UML(selector, props);
}

export async function initUML(selector, props = {}) {
  const diagram = createUML(selector, props);

  if (props.autoLoad === false) {
    return diagram;
  }

  if (Object.prototype.hasOwnProperty.call(props, 'initialData')) {
    await diagram.initState({ data: props.initialData });
    return diagram;
  }

  const data = await diagram.getData();
  await diagram.initState({ data });
  return diagram;
}

export { UML };
