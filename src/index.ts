import { join as joinPath } from 'path';
import { LevelUp } from 'levelup';
import { FlexelDatabase } from 'flexel';
import { Skedgy, Options as SkedgyOptions } from 'skedgy';
import { Scany, VideoResult, FeedResult } from 'scany';
import { Pully, DownloadOptions, Presets } from 'pully';

import { VideoRecord, DownloadStatus, WatchList, WatchListItem, DownloadRequest } from './lib/models';
import { VideoRepository } from './lib/video-repo';
import { DownloadQueue } from './lib/download-queue';

import { logger } from './utils/logger';

export { Presets };

const SKEDGY_1_MINUTE = 60;
const SKEDGY_5_MINUTES = SKEDGY_1_MINUTE * 5;
const SKEDGY_1_HOUR = 60 * 60;
const SKEDGY_4_HOURS = SKEDGY_1_HOUR * 4;

const log = logger('core');

export class PullyService {

  private _scheduler: Skedgy<VideoRecord>;
  private _scany: Scany;
  private _pully: Pully;

  private _watchlist: WatchList;

  private _videoRepo: VideoRepository;
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
    this._watchlist = options.watchlist;

    let rootDb = options.db ? (typeof options.db === 'string'
        ? new FlexelDatabase(options.db)
        : new FlexelDatabase(options.db))
        : new FlexelDatabase();

    this._videoRepo = new VideoRepository({
      db: rootDb.sub('videos')
    });

    this._downloadQueue = new DownloadQueue(rootDb.sub('downloads'));

    this._scany = new Scany();
    this._pully = new Pully(Object.assign({
      preset: Presets.HD,
    }, options.pullyOptions));

    const timingOptions = Object.assign({
      pollMinDelay: SKEDGY_1_HOUR,
      pollMaxDelay: SKEDGY_4_HOURS,
      taskMinDelay: SKEDGY_1_MINUTE,
      taskMaxDelay: SKEDGY_5_MINUTES,
    }, {
        pollMinDelay: options.skedgyOptions.pollMinDelay,
        pollMaxDelay: options.skedgyOptions.pollMaxDelay,
        taskMinDelay: options.skedgyOptions.taskMinDelay,
        taskMaxDelay: options.skedgyOptions.taskMaxDelay
      }) as SkedgyOptions<VideoRecord>;
    
    this._scheduler = new Skedgy<DownloadRequest>(Object.assign({
      db: this._downloadQueue,
      poll: this._scan.bind(this),
      work: this._download.bind(this)
    } as SkedgyOptions<DownloadRequest>, timingOptions));
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

  private async _scan(enqueue: (data: DownloadRequest) => void): Promise<void> {
    
    for (let listName in this._watchlist) {
      let list = this._watchlist[listName];
      let url = typeof list === 'string' ? list : list.feedUrl;
      let feed = await this._scany.feed(url);
      for (let video of (feed.videos as VideoRecord[])) {
        video.watchlistName = listName;
        video = await this._videoRepo.getOrAddVideo(video);

        if (video.status === DownloadStatus.Queued) {
          log(`[queued] "${video.videoTitle}" was already queued.`);
        } else if (video.status === DownloadStatus.Downloaded) {
          log(`[downloaded] "${video.videoTitle}" was already downloaded.`);
        } else if (video.status === DownloadStatus.Downloading) {
          log(`[downloading] "${video.videoTitle}" is currently downloading.`);
        } else {
          log(`[enqueuing] Enqueueing "${video.videoTitle}"...`);
          await this._videoRepo.markAsQueued(video);
          enqueue({ video, feed });
        }
      }
    }
  }

  private async _download({ video, feed }: { video: VideoRecord, feed: FeedResult }): Promise<void> {
    log(`Downloading ${video.videoTitle} by ${video.channelName} (${video.videoUrl})...`);
    video = await this._videoRepo.markAsDownloading(video);
    let watchlist = getWatchlist(this._watchlist[video.watchlistName]);

    let downloadResult = await this._pully
      .download({
        url: video.videoUrl,
        preset: watchlist.preset,
        dir: watchlist.dir,
        progress: (prog) => {
          if (prog.indeterminate) return;
          
        },
        template: () => watchlist.template(video, feed)
      });
    
    video.path = downloadResult.path;
    await this._videoRepo.markAsDownloaded(video);

    log(`Downloaded ${video.videoTitle} by ${video.channelName} (${video.videoId})`);
  }
}

function getWatchlist(item: string | WatchListItem): WatchListItem {
  if (!item) return null;
  if (typeof item === 'string') return { feedUrl: item };
  return item;
}