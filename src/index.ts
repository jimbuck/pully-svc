import { writeFileSync } from 'fs';
import { FlexelDatabase, FlexelQueue, AbstractDatabase } from 'flexel';
import { Skedgy, Options as SkedgyOptions } from 'skedgy';
import { Scany, VideoResult } from 'scany';
import { Pully } from 'pully';

import { VideoRecord, VideoStatus } from './lib/models';
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
    urls: Array<string>,
    skedgyOptions?: SkedgyOptions<VideoRecord>,
    db: AbstractDatabase // TODO: Replace with LevelUp type.
  }) {
    this._urls = options.urls || [];

    let rootDb = new FlexelDatabase(options.db);

    this._videoRepo = new VideoRepository({
      db: rootDb.sub('video-repo')
    });

    this._downloadQueue = new DownloadQueue(rootDb.sub('download-queue'));

    this._scany = new Scany();
    this._pully = new Pully({
      // TODO: Set up options...
    });

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
      const video = await this._videoRepo.getOrAddVideo(videos[videoIndex]);

      if (video.status === VideoStatus.Queued) {
        log(`[queued] "${video.data.videoTitle}" was already queued.`);
      } else if (video.status === VideoStatus.Downloaded) {
        log(`[downloaded] "${video.data.videoTitle}" was already downloaded.`);
      } else {
        log(`[enqueuing] Enqueueing "${video.data.videoTitle}"...`);
        await this._videoRepo.markAsQueued(video);
        enqueue(video);
      }
    }
  }

  private async _download(video: VideoRecord): Promise<void> {
    log(`Downloading ${video.data.videoTitle} by ${video.data.channelName} (${video.data.videoUrl})...`);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        log(`Mock downloaded ${video.data.videoTitle} by ${video.data.channelName} (${video.id})`);
        this._videoRepo.markAsDownloaded(video).then(() => {
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