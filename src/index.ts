import { EventEmitter } from 'events';
import { FeedResult } from 'scany';
import { FlexelDatabase } from 'flexel';
import { Presets, DownloadResults, ProgressData } from 'pully';

import { VideoRecord, PullySvcConfig, WatchListItem, ParsedPullySvcConfig, ParsedWatchListItem } from './lib/models';
import { logger, configureLogs, closeLogs, notify } from './utils/logger';
import { parseDateOrDurationAgo } from './utils/dates-helpers';
import { TaskScheduler } from './lib/task-scheduler';
import jsonquery = require('jsonquery');


const parseDuration: ((str: string) => number) = require('parse-duration');

export { Presets };
  
const log = logger('core');

const EMPTY_STRING = '';
const DEFAULT_LOGGING = './pully-svc.log';

export const DEFAULT_CONFIG: PullySvcConfig = {
  log: DEFAULT_LOGGING,
  db: './pully-svc-db',
  pollMinDelay: '5 minutes',
  pollMaxDelay: '10 minutes',
  downloadDelay: '5 seconds',
  defaults: {
    preset: Presets.HD,
    dir: './downloads',
    published: '24 hours',
    format: '${feed.feedName}/${video.title}',
    match: ['*'],
    enabled: true,
    lookupPlaylist: false
  },
  watchlist: []
};

export declare interface PullyService {
  on(event: 'log', listener: (args: { message: string }) => void): this;
  on(event: 'started', listener: () => void): this;
  on(event: 'stopped', listener: () => void): this;
  on(event: 'polling', listener: (args: { list: WatchListItem }) => void): this;
  on(event: 'polled', listener: (args: { list: WatchListItem, feed: FeedResult }) => void): this;
  on(event: 'queued', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'skipped', listener: (args: { video: VideoRecord }) => void): this;
  on(event: 'downloading', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'progress', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord, prog: ProgressData }) => void): this;
  on(event: 'downloaded', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord, downloadResult: DownloadResults }) => void): this;
  on(event: 'downloadfailed', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord, err: Error }) => void): this;
  on(event: 'pollfailed', listener: (args: { list?: WatchListItem, err: Error }) => void): this;
}

export class PullyService extends EventEmitter {

  private _scheduler: TaskScheduler;

  constructor(config: PullySvcConfig) {
    super();

    if (!config || !config.watchlist || config.watchlist.length === 0) {
      throw new Error(`A config definition with at least one watchlist item must be provided!`);
    }

    let parsedConfig = parseConfig(config);

    configureLogs(parsedConfig.log, this);

    let rootDb = typeof parsedConfig.db === 'string'
      ? new FlexelDatabase(parsedConfig.db)
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
    closeLogs();
  }

  public getQueue() {
    return this._scheduler.getQueue();
  }

  public async query(query: jsonquery.Query<VideoRecord> = {}): Promise<VideoRecord[]> {
    return await this._scheduler.query(query);
  }

  public stats(): any {
    // TODO: Return status information
    //  - # of videos in database
    //  - # of videos in queue
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
    log: typeof config.log === 'boolean' && config.log === true ? DEFAULT_LOGGING : config.log,
    db: config.db,
    pollMinDelay: parseDuration(config.pollMinDelay),
    pollMaxDelay: parseDuration(config.pollMaxDelay),
    downloadDelay: parseDuration(config.downloadDelay),
    defaults: Object.assign({}, config.defaults as any),
    watchlist: []
  };
  settings.defaults.published = parseDateOrDurationAgo(config.defaults.published);

  settings.watchlist = config.watchlist.map((item: WatchListItem) => {
    let parsedItem: ParsedWatchListItem = Object.assign({}, settings.defaults, item as any);
    parsedItem.published = parseDateOrDurationAgo(item.published);
    return parsedItem;
  });

  return settings;
}