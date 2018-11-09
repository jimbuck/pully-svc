import { join as joinPath } from 'path';
import { EventEmitter } from 'events';

import { Scany } from 'scany';
import FlexelDatabase from 'flexel';
import { template } from 'pully-core';
import { Pully } from 'pully';
import { Scheduler, Options as SkedgyOptions } from 'skedgy';
const parseDuration: ((str: string) => number) = require('parse-duration');

import { logger } from '../utils/logger';
import { VideoRepository } from './video-repo';
import { DownloadQueue } from './download-queue';
import { VideoRecord, DownloadRequest, DownloadStatus, WatchListItem, PullyServiceConfig } from './models';
import { matchPatterns } from '../utils/matcher';

const log = logger('task-scheduler');

const TIMING = {
  THREE_SECONDS: 3,
  FIVE_SECONDS: 5,
  TEN_MINUTES: 600,
  FIFTEEN_MINUTES: 900,
};
export class TaskScheduler extends Scheduler<DownloadRequest> {
  
  private _config: PullyServiceConfig;

  private _scany: Scany;
  private _pully: Pully;
  private _videoRepo: VideoRepository;
  private _emitter: EventEmitter;

  constructor(options: {
    rootDb: FlexelDatabase,
    config: PullyServiceConfig<string | WatchListItem, string>,
    emitter: EventEmitter
  }) {
    const timingOptions: SkedgyOptions<DownloadRequest> = {
      pollMinDelay: TIMING.TEN_MINUTES,
      pollMaxDelay: TIMING.FIFTEEN_MINUTES,
      workMinDelay: TIMING.THREE_SECONDS,
      workMaxDelay: TIMING.FIVE_SECONDS,
      queue: new DownloadQueue(options.rootDb.sub('downloads'))
    };
    if (options.config.pollMinDelay) timingOptions.pollMinDelay = parseDuration(options.config.pollMinDelay);
    if (options.config.pollMaxDelay) timingOptions.pollMaxDelay = parseDuration(options.config.pollMaxDelay);
    if (options.config.downloadDelay) timingOptions.workMinDelay = timingOptions.workMaxDelay = parseDuration(options.config.downloadDelay);
    
    super(timingOptions);

    this._emitter = options.emitter;
    this._config = prepConfig(options.config);

    this._scany = new Scany();
    this._pully = new Pully();

    this._videoRepo = new VideoRepository({
      db: options.rootDb.table<VideoRecord>('videos', 'videoId')
    });
  }
  
  protected async poll(): Promise<void> {
    for (let list of this._config.watchlist) {
      await this._find(list);
    }
  }

  private async _find(list: WatchListItem) {
    this._emitter.emit('scanning', { list });
    let feed = await this._scany.feed(list.feedUrl);
    for (let video of (feed.videos as VideoRecord[])) {
      video.watchlistName = name;
      video = await this._videoRepo.getOrAddVideo(video);
      
      if (!matchPatterns(video.videoTitle, this._config.defaults.match, list.match)) {
        log(`[ignored] "${video.videoTitle}" does not match patterns.`);
        video = await this._videoRepo.markAsIgnored(video);
        this._emitter.emit('ignored', { video, feed, list });
        continue;
      }

      if (video.status === DownloadStatus.Queued) {
        log(`[queued] "${video.videoTitle}" was already queued.`);
      } else if (video.status === DownloadStatus.Downloaded) {
        log(`[downloaded] "${video.videoTitle}" was already downloaded.`);
      } else if (video.status === DownloadStatus.Downloading) {
        log(`[downloading] "${video.videoTitle}" is currently downloading.`);
      } else {
        log(`[enqueuing] Enqueueing "${video.videoTitle}"...`);
        video = await this._videoRepo.markAsQueued(video);
        this.enqueue({ video, feed, list });
        this._emitter.emit('queued', { video, feed, list });
      }
    }
    this._emitter.emit('scanned', { feed, list });
  }
  
  protected async work({ feed, video, list}: DownloadRequest): Promise<void> {
    log(`Downloading ${video.videoTitle} by ${video.channelName} (${video.videoUrl})...`);
    video = await this._videoRepo.markAsDownloading(video);
    this._emitter.emit('downloading', { video, feed, list });

    const templateFn = template(list.format).bind(null, { feed, video });

    await this._pully
      .download({
        url: video.videoUrl,
        preset: list.preset,
        dir: list.dir,
        progress: (prog) => {
          if (prog.indeterminate) return;
          this._emitter.emit('progress', { feed, list, video, prog });
        },
        template: templateFn
      }).then(async downloadResult => {
        video.path = downloadResult.path;
        await this._videoRepo.markAsDownloaded(video);
    
        log(`Downloaded ${video.videoTitle} by ${video.channelName} (${video.videoId})`);
        this._emitter.emit('downloaded', { video, feed, list });
      }, async err => {
        await this._videoRepo.markAsFailed(video);
        log(`Failed to download ${video.videoTitle} (${video.videoId}): ${err.toString()}`);
        this._emitter.emit('downloadfailed', { video, feed, list });
      });
  }
}

function prepConfig(config: PullyServiceConfig<any, any>): PullyServiceConfig {
  config.watchlist = (config.watchlist || []).map(item => {
    if (!item) return null;
    if (typeof item === 'string') return { feedUrl: item };
    return Object.assign({}, config.defaults, item);
  }).filter(item => !!item);

  config.defaults = config.defaults || {};

  return config;
}