import { join as joinPath, dirname as extractDirName, resolve as resolvePath, extname as extName } from 'path';
import { rename as renameFile } from 'fs';
import * as mkdirp from 'mkdirp';
import { EventEmitter } from 'events';

import { scanFeed } from 'scany';
import FlexelDatabase from 'flexel';
import { template, scrubObject } from 'pully-core';
import { Pully, DownloadConfig } from 'pully';
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

    this._pully = new Pully();

    this._videoRepo = new VideoRepository({
      db: options.rootDb.table<VideoRecord>('videos', 'videoId'),
      emitter: this._emitter
    });
  }
  
  public async poll(): Promise<void> {
    for (let list of this._config.watchlist) {
      await this._find(list).catch(err => {
        log(`Error occurred while polling: ${JSON.stringify(err)}`);
        this._emitter.emit('pollfailed', { list });
      });
    }
  }

  public async enqueue({ video, feed, list }: DownloadRequest) {
    video = await this._videoRepo.markAsQueued(video);
    await super.enqueue({ video, feed, list });
    this._emitter.emit('queued', { video, feed, list });
  }

  public async skip({ video, feed, list }: DownloadRequest, reason: string) {
    video = await this._videoRepo.markAsSkipped(video, reason);
    this._emitter.emit('skipped', { video, feed, list });
  }

  private async _find(list: WatchListItem) {
    const now = new Date();
    this._emitter.emit('scanning', { list });
    let feed = await scanFeed(list.feedUrl);
    log(`Found ${feed.videos.length} videos for '${list.feedUrl}'`);
    for (let video of (feed.videos as VideoRecord[])) {
      video.watchlistName = list.feedUrl;
      video = await this._videoRepo.getOrAddVideo(video);
      
      if (!matchPatterns(video.videoTitle, this._config.defaults.match, list.match)) {
        await this.skip({ video, feed, list }, 'excluded by pattern');
        continue;
      }

      let videoAge = now.valueOf() - (video.published || new Date()).valueOf();
      if (videoAge < this._config.maxRetroDownload) {
        await this.skip({ video, feed, list }, 'greater than max retro');
        continue;
      }

      if (video.status === DownloadStatus.Queued) {
        log(`[queued] "${video.videoTitle}" was already queued.`);
      } else if (video.status === DownloadStatus.Downloaded) {
        log(`[downloaded] "${video.videoTitle}" was already downloaded.`);
      } else if (video.status === DownloadStatus.Downloading) {
        log(`[downloading] "${video.videoTitle}" is currently downloading.`);
      } else {
        // TODO: Add current queue count...
        log(`[enqueuing] Enqueueing "${video.videoTitle}"...`);
        this.enqueue({ video, feed, list });
      }
    }
    this._emitter.emit('scanned', { feed, list });
  }
  
  protected async work({ feed, video, list}: DownloadRequest): Promise<void> {
    video = await this._videoRepo.markAsDownloading(video);
    
    const templateFn: () => string = template(list.format).bind(null, { feed: scrubObject(feed), video: scrubObject(video) });
    let prevProg = 0;
    await this._pully
      .download({
        url: video.videoUrl,
        preset: list.preset,
        info: (format) => {
          this._emitter.emit('downloading', { video, feed, list });
          log(`Downloading ${video.videoTitle} by ${video.channelName} (${video.videoUrl}) to '${format.path}'...`);
        },
        progress: (prog) => {
          if (prog.indeterminate) return;
          let progChange = prog.percent - prevProg;
          if (progChange >= 0.25 || prog.percent >= 100) {
            log(`[progress] '${video.videoTitle}' - ${prog.percent}%`);
            prevProg = prog.percent;
          }
          this._emitter.emit('progress', { feed, list, video, prog });
        }
      } as DownloadConfig).then(async downloadResult => {
        const tempPath = downloadResult.path;
        const targetPath = resolvePath(list.dir, templateFn() + extName(tempPath));
        log(`Moving (${video.videoUrl}) from '${tempPath}' to '${targetPath}'...`);
        await moveFile(tempPath, targetPath);
        
        video.path = downloadResult.path = targetPath;
        await this._videoRepo.markAsDownloaded(video);
    
        log(`Downloaded ${video.videoTitle} by ${video.channelName} (${video.videoId})`);
        this._emitter.emit('downloaded', { video, feed, list });
      }).catch(async err => {
        await this._videoRepo.markAsFailed(video);
        log(`Failed to download ${video.videoTitle} (${video.videoId}): ${err.toString()}`);

        this._emitter.emit('downloadfailed', { video, feed, list });
      });
  }
}

function moveFile(oldPath: string, newPath: string) {
  return new Promise<void>((resolve, reject) => {
    mkdirp(extractDirName(newPath), function (err) {
      if (err) return reject(err);
      renameFile(oldPath, newPath, err => err ? reject(err) : resolve());
    });
  });
}

function prepConfig(config: PullyServiceConfig<any, any>): PullyServiceConfig {
  config.watchlist = (config.watchlist || []).map(item => {
    if (!item) return null;
    if (typeof item === 'string') item = { feedUrl: item };
    return Object.assign({}, config.defaults, item);
  }).filter(item => !!item);

  if (config.maxRetroDownload) config.maxRetroDownload = parseDuration(config.maxRetroDownload);

  config.defaults = config.defaults || {};

  return config;
}