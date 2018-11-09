import { FlexelDatabase } from 'flexel';
import { Presets, DownloadResults, ProgressData } from 'pully';

import { VideoRecord, PullyServiceConfig, WatchListItem } from './lib/models';

import { logger, configureLogs } from './utils/logger';
import { TaskScheduler } from './lib/task-scheduler';
import { EventEmitter } from 'events';
import { FeedResult } from 'scany';

export { Presets };
  
const log = logger('core');

const DEFAULT_DB_PATH = './pully-db';
export const DEFAULT_CONFIG: PullyServiceConfig<string|WatchListItem, string> = {
  logging: true,
  db: DEFAULT_DB_PATH,
  pollMinDelay: '5 minutes',
  pollMaxDelay: '10 minutes',
  downloadDelay: '5 seconds',
  defaults: {
    preset: Presets.HD,
    dir: './downloads',
    format: '${feed.feedName}/${video.title}'
  },
  watchlist: []
};

export declare interface PullyService {
  on(event: 'started', listener: () => void): this;
  on(event: 'stopped', listener: () => void): this;
  on(event: 'scanning', listener: (args: { list: WatchListItem }) => void): this;
  on(event: 'scanned', listener: (args: { list: WatchListItem, feed: FeedResult }) => void): this;
  on(event: 'queued', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'ignored', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'downloading', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
  on(event: 'progress', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord, prog: ProgressData }) => void): this;
  on(event: 'downloaded', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord, downloadResult: DownloadResults }) => void): this;
  on(event: 'downloadfailed', listener: (args: { list: WatchListItem, feed: FeedResult, video: VideoRecord }) => void): this;
}

export class PullyService extends EventEmitter {

  private _scheduler: TaskScheduler;

  constructor(config: PullyServiceConfig<string | WatchListItem, string>) {
    super();

    if (!config || !config.watchlist || config.watchlist.length === 0) {
      throw new Error(`A config definition with at least one watchlist item must be provided!`);
    }

    config = Object.assign({}, DEFAULT_CONFIG, config);

    configureLogs(config.logging);

    let rootDb = typeof config.db === 'string'
      ? new FlexelDatabase(config.db)
      : new FlexelDatabase();
    
    this._scheduler = new TaskScheduler({
      rootDb,
      config,
      emitter: this
    });
  }

  public start(): void {
    if (!this._scheduler || this._scheduler['isStarted']) return;
    log('Starting...');
    this._scheduler.start();
    this.emit('started');
    log('Started!');
  }

  public stop(): void {
    if (!this._scheduler || !this._scheduler['isStarted']) return;
    log('Stopping...');
    this._scheduler.stop();
    this.emit('stopped');
    log('Stopped!');
  }

  public stats(): any {
    // TODO: Return status information
    //  - current videos in database
    //  - current videos in queue
    //  - current download name, progress, ETA
  }
}