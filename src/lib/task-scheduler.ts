import { Scheduler, Options } from 'skedgy';
import { VideoRecord, DownloadRequest, WatchList, DownloadStatus, WatchListItem } from './models';
import { Scany } from 'scany';
import { Pully, PullyOptions } from 'pully';
import { logger } from '../utils/logger';
import { VideoRepository } from './video-repo';
import FlexelDatabase from 'flexel';

const log = logger('task-scheduler');

export class TaskScheduler extends Scheduler<DownloadRequest> {
  
  private _watchlist: WatchList;

  private _scany: Scany;
  private _pully: Pully;
  private _videoRepo: VideoRepository;

  constructor(options: {
    rootDb: FlexelDatabase,
    watchList: WatchList,
    pully: PullyOptions,
    scheduler: Options<DownloadRequest>
  }) {
    super(options.scheduler);

    this._watchlist = options.watchList;

    this._scany = new Scany();
    this._pully = new Pully(options.pully);

    this._videoRepo = new VideoRepository({
      db: options.rootDb.table<VideoRecord>('videos', 'videoId')
    });
  }
  
  protected async poll(): Promise<void> {
    
    for (let listName in this._watchlist) {
      let item = this._watchlist[listName];
      if (typeof item === 'string') item = { feedUrl: item };
      await this._find(item);      
    }
  }

  private async _find(item: WatchListItem) {
    let feed = await this._scany.feed(item.feedUrl);
    for (let video of (feed.videos as VideoRecord[])) {
      video.watchlistName = name;
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
        this.enqueue({ video, feed });
      }
    }
  }
  
  protected async work(downloadRequest: DownloadRequest): Promise<void> {
    let { feed, video } = downloadRequest;
    log(`Downloading ${video.videoTitle} by ${video.channelName} (${video.videoUrl})...`);
    video = await this._videoRepo.markAsDownloading(video);
    let watchlist = getWatchlist(this._watchlist[video.watchlistName]);
    if (!watchlist) {
      // Watchlist must have been deleted.
      // TODO: Mark as errored...
    }

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