import * as debug from 'debug';

export { IDebugger } from 'debug';

const loggers: { [name: string]: debug.IDebugger } = {};

export function configureLogs(namespaces: string | boolean): void {
  if (namespaces === false) {
    debug.disable();
  } else if (namespaces === true) {
    debug.enable('*');
  } else {
    debug.enable(namespaces);
  }
}

export function logger(area: string): debug.IDebugger {
  return loggers[area] = (loggers[area] || debug(`pully-server:${area}`));
}