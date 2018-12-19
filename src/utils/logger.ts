import * as debug from 'debug';
import * as got from 'got';

const makerWebhookKey = process.env.MAKER_WEBHOOK_KEY;
const loggers: { [name: string]: debug.IDebugger } = {};
const { name: appName } = require('../../package.json');

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
  return loggers[area] = (loggers[area] || debug(`${appName}:${area}`))
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