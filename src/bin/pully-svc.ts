#!/usr/bin/env node

import { existsSync, writeFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

import * as yargs from 'yargs';

import { DEFAULT_CONFIG } from '..';
import { PullySvcConfig } from '../lib/models';
import { bootstrap } from './app/main';
import { closeLogs } from '../utils/logger';

interface InitOptions { config: string }

interface RunOptions extends InitOptions {
  db: string;
  silent?: boolean;
}

const DEFAULT_CONFIG_PATH = './pully.conf.json';

autoHandle('uncaughtException');
autoHandle('unhandledRejection');

process.on('exit', () => {
  closeLogs();
});

(yargs as yargs.Argv<RunOptions>)
  .scriptName('pully-svc')
  .usage('Usage: $0 <config>')
  .command<RunOptions>('$0', 'Starts the service.', svc => svc
    .positional('config', {
      alias: 'c',
      type: 'string',
      normalize: true,
      default: DEFAULT_CONFIG_PATH,
      describe: `The path to the configuration file.`
    })
    .option('db', {
      alias: 'd',
      type: 'string',
      normalize: true,
      default: './pully-db'
    })
    .option('silent', {
      alias: 's',
      type: 'boolean',
      default: false
    }),
    run
  )
  .command('init', 'Scaffolds out a fresh config file.', init => init
    .option('config', {
      alias: 'c',
      type: 'string',
      normalize: true,
      default: DEFAULT_CONFIG_PATH,
    }),
    init
)
  .argv;

function run({ config: configPath }: yargs.Arguments<RunOptions>) {
  configPath = resolvePath(configPath);
  if (!existsSync(configPath)) {
    console.error(`No config file found at '${configPath}'! Exiting...`);
    exitApp(1);
  }
  
  let config: PullySvcConfig = require(configPath);

  bootstrap(config);
}

function init({ config: configPath }: yargs.Arguments<InitOptions>) {
  if (existsSync(configPath)) {
    console.log(`Config file already found at ${configPath}! Exiting...`);
    exitApp(0);
  }

  // Copy and assign the watchlist so it appears at the bottom of the JSON file...
  let data = Object.assign({}, DEFAULT_CONFIG);
  data.watchlist = [{
    desc: 'A name or description can go here...',
    feedUrl: '<channel or playlist URL>'
  }];

  writeFileSync(configPath, JSON.stringify(data, null, '\t'));
  console.log(`New config created at ${configPath}!`);
  exitApp(0);
}

function autoHandle(name: string) {
  process.on(name as any, (err: any) => {
    process.stderr.write(`TOP LEVEL ERROR: ${name}\n`);
    process.stderr.write(err.toString());

    exitApp(99);
  });
}

function exitApp(errorCode: number): void {
  closeLogs();
  if(!errorCode) process.stdout.write("\u001b[2J\u001b[0;0H");
  process.exit(errorCode);
}