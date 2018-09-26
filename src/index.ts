import { LevelUp } from 'levelup';
import { FlexelDatabase, FlexelQueue } from 'flexel';
import { Skedgy, Options as SkedgyOptions } from 'skedgy';
import { Scany, VideoResult } from 'scany';
import { Pully, DownloadOptions } from 'pully';

import { VideoRecord, DownloadStatus } from './lib/models';
import { VideoRepository } from './lib/video-repo';
import { DownloadQueue } from './lib/download-queue';

import { logger } from './utils/logger';

const log = logger('core');

export class PullyServer {

  private _scheduler: Skedgy<VideoRecord>;
  private _scany: Scany;
  private _pully: Pully;

  private _urls: Array<string>;

  private _videoRepo: VideoRepository;
  private _downloadQueue: DownloadQueue;

  constructor(options: {
    watchList: any,
    db?: string | LevelUp,
    pullyOptions?: DownloadOptions,
    skedgyOptions?: SkedgyOptions<VideoRecord>
  }) {
    this._urls = options.watchList || {};

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
      // TODO: Set up default options...
    }, options.pullyOptions));

    const timingOptions = Object.assign({
      pollMinDelay: 60 * 5, // 5 minutes
      pollMaxDelay: 60 * 30, // 30 minutes
      taskMinDelay: 60 * 5, // 5 minutes
      taskMaxDelay: 60 * 90, // 90 minutes
    }, {
        pollMinDelay: options.skedgyOptions.pollMinDelay,
        pollMaxDelay: options.skedgyOptions.pollMaxDelay,
        taskMinDelay: options.skedgyOptions.taskMinDelay,
        taskMaxDelay: options.skedgyOptions.taskMaxDelay
      }) as SkedgyOptions<VideoRecord>;
    
    this._scheduler = new Skedgy<VideoRecord>(Object.assign({
      db: rootDb.queue<VideoRecord>(''),
      poll: (enqueue) => this._scan(enqueue),
      work: (record) => this._download(record)
    } as SkedgyOptions<VideoRecord>, timingOptions));
  }

  

  public start(): void {
    this._scheduler && this._scheduler.start();
  }

  public stop(): void {
    this._scheduler && this._scheduler.stop();
  }

  private async _scan(enqueue: (data: VideoRecord) => void): Promise<void> {
    let videos: VideoResult[] = [];
    for (let url in this._urls) {
      let result = await this._scany.feed(url);
      videos.push(...result.videos);
    }
    
    for (let videoIndex = 0; videoIndex < videos.length; videoIndex++) {
      const record = await this._videoRepo.getOrAddVideo(videos[videoIndex]);

      if (record.status === DownloadStatus.Queued) {
        log(`[queued] "${record.videoTitle}" was already queued.`);
      } else if (record.status === DownloadStatus.Downloaded) {
        log(`[downloaded] "${record.videoTitle}" was already downloaded.`);
      } else {
        log(`[enqueuing] Enqueueing "${record.videoTitle}"...`);
        await this._videoRepo.markAsQueued(record);
        enqueue(record);
      }
    }
  }

  private async _download(record: VideoRecord): Promise<void> {
    log(`Downloading ${record.videoTitle} by ${record.channelName} (${record.videoUrl})...`);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        log(`Mock downloaded ${record.videoTitle} by ${record.channelName} (${record.videoId})`);
        this._videoRepo.markAsDownloaded(record).then(() => {
          resolve();
        });
      }, 3000);
    });

    // return this._pully
    //   .download(video.data.url)
    //   .then(results => {
    //     this._videoRepo.markAsDownloaded(video).then(() => {
    //       log(`Downloaded ${video.data.title} by ${video.data.author} (${video.id})`);
    //     });
    //   });
  }
}