import { join as joinPath } from 'path';
import { LevelUp } from 'levelup';
import { FlexelDatabase } from 'flexel';
import { Scheduler, Options as SkedgyOptions } from 'skedgy';
import { Scany, VideoResult, FeedResult } from 'scany';
import { Pully, DownloadOptions, Presets } from 'pully';

import { VideoRecord, DownloadStatus, WatchList, WatchListItem, DownloadRequest } from './lib/models';
import { VideoRepository } from './lib/video-repo';
import { DownloadQueue } from './lib/download-queue';

import { logger } from './utils/logger';
import { TaskScheduler } from './lib/task-scheduler';

export { Presets };

const SKEDGY_1_MINUTE = 60;
const SKEDGY_5_MINUTES = SKEDGY_1_MINUTE * 5;
const SKEDGY_1_HOUR = 60 * 60;
const SKEDGY_4_HOURS = SKEDGY_1_HOUR * 4;

const log = logger('core');

export class PullyService {

  private _scheduler: TaskScheduler;
  private _downloadQueue: DownloadQueue;

  constructor(options: {
    watchlist: WatchList,
    db?: string | LevelUp,
    pullyOptions?: DownloadOptions,
    skedgyOptions?: SkedgyOptions<VideoRecord>
  }) {
    if (!options.watchlist) {
      throw new Error(`A watchlist must be provided!`);
    }

    let rootDb = options.db ? (typeof options.db === 'string'
        ? new FlexelDatabase(options.db)
        : new FlexelDatabase(options.db))
        : new FlexelDatabase();

    const timingOptions = Object.assign({
      pollMinDelay: SKEDGY_1_HOUR,
      pollMaxDelay: SKEDGY_4_HOURS,
      workMinDelay: SKEDGY_1_MINUTE,
      workMaxDelay: SKEDGY_5_MINUTES,
    }, {
        pollMinDelay: options.skedgyOptions.pollMinDelay,
        pollMaxDelay: options.skedgyOptions.pollMaxDelay,
        workMinDelay: options.skedgyOptions.workMinDelay,
        workMaxDelay: options.skedgyOptions.workMaxDelay
      }) as SkedgyOptions<VideoRecord>;
    
    this._downloadQueue = new DownloadQueue(rootDb.sub('downloads'));
    
    this._scheduler = new TaskScheduler({
      rootDb,
      watchList: options.watchlist,
      pully: Object.assign({
        preset: Presets.HD,
      }, options.pullyOptions),
      scheduler: Object.assign({
        db: this._downloadQueue
      } as SkedgyOptions<DownloadRequest>, timingOptions)
    });
  }

  public start(): void {
    this._scheduler && this._scheduler.start();
  }

  public stop(): void {
    this._scheduler && this._scheduler.stop();
  }

  public stats(): any {
    // TODO: Return status information
    //  - current videos in database
    //  - current videos in queue
    //  - current download name, progress, ETA
  }
}