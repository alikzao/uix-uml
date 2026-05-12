import 'bootstrap-icons/font/bootstrap-icons.css';
import '../../../../popup/static/popup.css';
import './styles/uml.css';
import { UML, createUML, initUML, initializeUMLSocket } from './index.js';

const api = {
  UML,
  createUML,
  initUML,
  initializeUMLSocket
};

if (typeof window !== 'undefined') {
  window.UIXUML = Object.assign({}, window.UIXUML || {}, api);
}

export { UML, createUML, initUML, initializeUMLSocket };
export default api;
