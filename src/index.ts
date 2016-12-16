import { writeFileSync } from 'fs';
import { Skedgy, Options as SkedgyOptions } from 'skedgy';
import { Scany, FlatVideoData } from 'scany';
import { Pully } from 'pully';
const level = require('level');
const SubLevel = require('level-sublevel');

import { VideoRecord, VideoStatus } from './lib/models';
import { VideoRepository } from './lib/video-repo';
import { DownloadQueue } from './lib/download-queue';

import { logger } from './utils/logger';
import { LevelWrapper } from './utils/level-wrapper';

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
    db: LevelUp
  }) {
    this._urls = options.urls || [];

    let rootDb = SubLevel(options.db);

    this._videoRepo = new VideoRepository({
      db: new LevelWrapper(rootDb.sublevel('pully-server.video-repo'))
    });

    this._downloadQueue = new DownloadQueue({
      db: new LevelWrapper(rootDb.sublevel('pully-server.download-queue'))
    });

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
    
    this._scheduler = new Skedgy<VideoRecord>(Object.assign<SkedgyOptions<VideoRecord>, SkedgyOptions<VideoRecord>>({
      db: this._downloadQueue,
      poll: (enqueue) => this._scan(enqueue),
      work: (record) => this._download(record)
    }, timingOptions));
  }

  

  public start(): void {
    this._scheduler && this._scheduler.start();
  }

  public stop(): void {
    this._scheduler && this._scheduler.stop();
  }

  private async _scan(enqueue: (data: VideoRecord) => void): Promise<void> {
    const videos = await Promise.all(this._urls.map(url => this._scany.fetchFlat(url))).then(lists => {
      return lists.reduce((result, list) => result.concat(list));
    });
    
    for (let videoIndex = 0; videoIndex < videos.length; videoIndex++) {
      const video = await this._videoRepo.getOrAddVideo(videos[videoIndex]);

      if (video.status === VideoStatus.Queued) {
        log(`[queued] "${video.data.title}" was already queued.`);
      } else if (video.status === VideoStatus.Downloaded) {
        log(`[downloaded] "${video.data.title}" was already downloaded.`);
      } else {
        log(`[enqueuing] Enqueueing "${video.data.title}"...`);
        await this._videoRepo.markAsQueued(video);
        enqueue(video);
      }
    }
  }

  private async _download(video: VideoRecord): Promise<void> {
    log(`Downloading ${video.data.title} by ${video.data.author} (${video.data.url})...`);

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        log(`Mock downloaded ${video.data.title} by ${video.data.author} (${video.id})`);
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