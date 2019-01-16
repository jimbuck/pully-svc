import { format as formatString } from 'util';
import { createWriteStream, WriteStream } from 'fs';

import * as got from 'got';
import * as debug from 'debug';
import stripAnsi = require('strip-ansi');
import { EventEmitter } from 'events';

const makerWebhookKey = process.env.MAKER_WEBHOOK_KEY;
const loggers: { [name: string]: debug.IDebugger } = {};
const { name: appName } = require('../../package.json');

let logStream: WriteStream;
export function configureLogs(path: string | false, emitter: EventEmitter): void {
  if (path === false) {
    debug.disable();
  } else {
    debug.enable('pully*,skedy*,scany*');
    logStream = createWriteStream(path);
    (debug as any).log = (...args: any[]) => {
      let message = `[${new Date().toISOString()}] ${stripAnsi(`${formatString.apply(null, args)}`).trim()}`;
      emitter.emit('log', { message });
      logStream.write(message + '\n');
    };
  }
}

export function closeLogs(): void {
  try {
    logStream && logStream.end();
  } catch (err) {
    // Silence this error...
  }
}

export function logger(area: string): debug.IDebugger {
  if (!loggers[area]) {
    loggers[area] = debug(`${appName}:${area}`);
  }

  return loggers[area];
}

export async function notify(message: string, imageUrl?: string) {
  try {
    if (!makerWebhookKey) return;
    await got.post(`https://maker.ifttt.com/trigger/node_debug/with/key/${makerWebhookKey}`, {
      form: true,
      body: { value1: appName, value2: message, value3: imageUrl }
    });
  } catch (err) {
    // Do nothing...
  }
}