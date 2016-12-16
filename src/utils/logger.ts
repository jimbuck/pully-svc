import * as debug from 'debug';

export { IDebugger } from 'debug';

const loggers: { [name: string]: debug.IDebugger } = {};

export function logger(area: string): debug.IDebugger {
  return loggers[area] = (loggers[area] || debug(`pully-server:${area}`));
}