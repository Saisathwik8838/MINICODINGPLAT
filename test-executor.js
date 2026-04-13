import { runCodeInSandbox } from './backend/src/utils/dockerSandbox.js'; runCodeInSandbox('PYTHON', 'x = input()\nprint(x)', '').then(console.log).catch(console.error);
