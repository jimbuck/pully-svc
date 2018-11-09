#!/usr/bin/env node

import { existsSync, writeFileSync } from 'fs';
import { resolve as resolvePath } from 'path';

import * as yargs from 'yargs';

import { PullyService, DEFAULT_CONFIG } from '..';
import { PullyServiceConfig, WatchListItem } from '../lib/models';

const DEFAULT_CONFIG_PATH = './pully.conf.json';

yargs
  .scriptName('pully-svc')
  .usage('Usage: $0 <config>')
  .command('$0', 'Starts the service.', svc => svc
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

function run({ config: configPath }: { config: string, db: string } & yargs.Arguments) {
  configPath = resolvePath(configPath);
  if (!existsSync(configPath)) {
    console.error(`No config file found at '${configPath}'! Exiting...`);
    process.exit(1);
  }
  
  let config: PullyServiceConfig<string | WatchListItem, string> = require(configPath);

  const pullySvc = new PullyService(config);

  pullySvc.start();
}

function init({ config: configPath }: { config: string } & yargs.Arguments) {
  if (existsSync(configPath)) {
    console.log(`Config file already found at ${configPath}! Exiting...`);
    process.exit(0);
  }

  // Copy and assign the watchlist so it appears at the bottom of the JSON file...
  let data = Object.assign({}, DEFAULT_CONFIG);
  data.watchlist = ['<channel or playlist URL>'];

  writeFileSync(configPath, JSON.stringify(data, null, '\t'));
  console.log(`New config created at ${configPath}!`);
  process.exit(0);
}