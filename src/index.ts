import { EventEmitter } from 'events';
import { FeedResult } from 'scany';
import { FlexelDatabase } from 'flexel';
import { Presets, DownloadResults, ProgressData } from 'pully';

import { VideoRecord, PullySvcConfig, WatchListItem, ParsedPullySvcConfig, ParsedWatchListItem } from './lib/models';
import { logger, configureLogs, notify } from './utils/logger';
import { TaskScheduler } from './lib/task-scheduler';
import { stripTime } from './utils/dates-helpers';


const parseDuration: ((str: string) => number) = require('parse-duration');

export { Presets };
  
const log = logger('core');

const EMPTY_STRING = '';
const DEFAULT_LOGGING = 'pully*';

export const DEFAULT_CONFIG: PullySvcConfig = {
  logging: DEFAULT_LOGGING,
  db: './pully-svc-db',
  pollMinDelay: '5 minutes',
  pollMaxDelay: '10 minutes',
  downloadDelay: '5 seconds',
  defaults: {
    preset: Presets.HD,
    dir: './downloads',
    publishedSince: '24 hours',
    format: '${feed.feedName}/${video.title}',
    match: ['*'],
    enabled: true,
    lookupPlaylist: false
  },
  watchlist: []
};

export declare interface PullyService {
  on(event: 'started', listener: () => void): this;
  on(event: 'stopped', listener: () => void): this;
  on(event: 'scanning', listener: (args: { list: WatchListItem }) => void): this;
  on(event: 'scanned', listener: (args: { list: WatchListItem, feed: FeedResult }) => void): this;
  on(event: 'queued', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'skipped', listener: (args: { video: VideoRecord }) => void): this;
  on(event: 'downloading', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'progress', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord, prog: ProgressData }) => void): this;
  on(event: 'downloaded', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord, downloadResult: DownloadResults }) => void): this;
  on(event: 'downloadfailed', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'pollfailed', listener: (args: { list: WatchListItem }) => void): this;
}

export class PullyService extends EventEmitter {

  private _scheduler: TaskScheduler;

  constructor(config: PullySvcConfig) {
    super();

    if (!config || !config.watchlist || config.watchlist.length === 0) {
      throw new Error(`A config definition with at least one watchlist item must be provided!`);
    }

    let parsedConfig = parseConfig(config);

    configureLogs(config.logging);

    let rootDb = typeof config.db === 'string'
      ? new FlexelDatabase(config.db)
      : new FlexelDatabase();
    
    this._scheduler = new TaskScheduler({
      rootDb,
      config: parsedConfig,
      emitter: this
    });
  }

  public start(): void {
    if (!this._scheduler || this._scheduler['isStarted']) return;
    log('Starting...');
    this._scheduler.start();
    this.emit('started');
    log('Started!');
    notify(`PullySvc has started!`);
  }

  public stop(): void {
    if (!this._scheduler || !this._scheduler['isStarted']) return;
    log('Stopping...');
    this._scheduler.stop();
    this.emit('stopped');
    log('Stopped!');
    notify(`PullySvc has stopped!`);
  }

  public stats(): any {
    // TODO: Return status information
    //  - current videos in database
    //  - current videos in queue
    //  - current download name, progress, ETA
  }
}

function parseConfig(config: PullySvcConfig): ParsedPullySvcConfig {
  config = Object.assign({}, DEFAULT_CONFIG, config);
  config.defaults = Object.assign({}, DEFAULT_CONFIG.defaults, config.defaults);
  config.watchlist = config.watchlist.map(item => {
    if (!item || !item.feedUrl) return null;
    return Object.assign({}, config.defaults, item);
  }).filter(item => !!item);

  let settings: ParsedPullySvcConfig = {
    logging: typeof config.logging === 'boolean' ? (config.logging?DEFAULT_LOGGING : EMPTY_STRING) : config.logging,
    db: config.db,
    pollMinDelay: parseDuration(config.pollMinDelay),
    pollMaxDelay: parseDuration(config.pollMaxDelay),
    downloadDelay: parseDuration(config.downloadDelay),
    defaults: Object.assign({}, config.defaults as any),
    watchlist: []
  };
  settings.defaults.publishedSince = parseDateOrDurationAgo(config.defaults.publishedSince);

  settings.watchlist = config.watchlist.map((item: WatchListItem) => {
    let parsedItem = Object.assign({}, settings.defaults, item as any);
    parsedItem.publishedSince = parseDateOrDurationAgo(item.publishedSince);
    return parsedItem;
  });

  return settings;
}

function parseDateOrDurationAgo(mysteryStr: string): number {
  const now = Date.now();

  try {
    let agoTime = new Date(mysteryStr).valueOf();

    if (isNaN(agoTime)) agoTime = now - parseDuration(mysteryStr);

    if (!isNaN(agoTime)) return stripTime(agoTime);
  } catch {
    // Do nothing...
  }

  return stripTime(now);
}