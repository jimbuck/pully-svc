import { join as joinPath, dirname as extractDirName, resolve as resolvePath, extname as extName } from 'path';
import { copyFile as copyFile, unlink as deleteFile } from 'fs';
import * as mkdirp from 'mkdirp';
import { EventEmitter } from 'events';

import { scanFeed, findFeed } from 'scany';
import FlexelDatabase from 'flexel';
import { template, scrubObject, extractPlaylistId } from 'pully-core';
import { Pully, DownloadConfig } from 'pully';
import { Scheduler, Options as SkedgyOptions } from 'skedgy';

import { logger, notify } from '../utils/logger';
import { VideoRepository } from './video-repo';
import { DownloadQueue } from './download-queue';
import { VideoRecord, DownloadRequest, DownloadStatus, ParsedPullySvcConfig, ParsedWatchListItem } from './models';
import { matchPatterns } from '../utils/matcher';
import { stripTime } from '../utils/dates-helpers';

const log = logger('task-scheduler');

const TIMING = {
  THREE_SECONDS: 3,
  FIVE_SECONDS: 5,
  TEN_MINUTES: 600,
  FIFTEEN_MINUTES: 900,
};
export class TaskScheduler extends Scheduler<DownloadRequest> {

  private _config: ParsedPullySvcConfig;

  private _pully: Pully;
  private _videoRepo: VideoRepository;
  private _emitter: EventEmitter;

  private get _downloadQueue() {
    return this.queue as DownloadQueue;
  }

  constructor(options: {
    rootDb: FlexelDatabase,
    config: ParsedPullySvcConfig,
    emitter: EventEmitter
  }) {
    const timingOptions: SkedgyOptions<DownloadRequest> = {
      pollMinDelay: TIMING.TEN_MINUTES,
      pollMaxDelay: TIMING.FIFTEEN_MINUTES,
      workMinDelay: TIMING.THREE_SECONDS,
      workMaxDelay: TIMING.FIVE_SECONDS,
      queue: new DownloadQueue(options.rootDb.sub('downloads'))
    };
    if (options.config.pollMinDelay) timingOptions.pollMinDelay = options.config.pollMinDelay;
    if (options.config.pollMaxDelay) timingOptions.pollMaxDelay = options.config.pollMaxDelay;
    if (options.config.downloadDelay) timingOptions.workMinDelay = timingOptions.workMaxDelay = options.config.downloadDelay;

    super(timingOptions);

    this._emitter = options.emitter;
    this._config = options.config;

    this._pully = new Pully();

    this._videoRepo = new VideoRepository({
      db: options.rootDb.table<VideoRecord>('videos', 'videoId'),
      emitter: this._emitter
    });
  }

  public async poll(): Promise<void> {
    try {
      for (let list of this._config.watchlist) {
        try {
          await this._find(list);
        } catch (err) {
          log(`Error occurred while polling: ${JSON.stringify(err)}`);
          this._emitter.emit('pollfailed', { list, err });
        }
      }
    } catch (err) {
      log(`General error occurred while polling: ${JSON.stringify(err)}`);
      this._emitter.emit('pollfailed', { list: null, err });
    }
  }

  public async enqueue({ video, feed, list }: DownloadRequest) {
    video = await this._videoRepo.markAsQueued(video);
    await super.enqueue({ video, feed, list });
    this._emitter.emit('queued', { video, feed, list });
  }

  public async getQueue() {
    return (await this._downloadQueue.query({}));
  }

  public async skip({ video, feed, list }: DownloadRequest, reason: string) {
    if (video.status === DownloadStatus.Skipped) return;

    video = await this._videoRepo.markAsSkipped(video, reason);
    this._emitter.emit('skipped', { video, feed, list });
  }

  private async _find(list: ParsedWatchListItem) {
    if (!list.enabled) return;

    const today = stripTime(new Date());
    this._emitter.emit('scanning', { list });
    let scannedFeed = await scanFeed(list.feedUrl);
    //log(`Found ${scannedFeed.videos.length} videos for '${list.feedUrl}'`);
    for (let video of (scannedFeed.videos as VideoRecord[])) {
      let feed = scannedFeed;
      video = await this._videoRepo.getOrAddVideo(video);

      if (video.status !== DownloadStatus.New) {
        // if (video.status === DownloadStatus.Queued) {
        //   log(`[queued] "${video.videoTitle}" was already queued.`);
        // } else if (video.status === DownloadStatus.Downloaded) {
        //   log(`[downloaded] "${video.videoTitle}" was already downloaded.`);
        // } else if (video.status === DownloadStatus.Downloading) {
        //   log(`[downloading] "${video.videoTitle}" is currently downloading.`);
        // } else if (video.status === DownloadStatus.Skipped) {
        //   log(`[skipped] "${video.videoTitle}" was already skipped.`);
        // }
        continue;
      }

      if (list.lookupPlaylist) {
        if (!extractPlaylistId(list.feedUrl)) {
          log(`Looking up playlist for '${video.videoTitle}'...`);
          feed = await findFeed(video).catch(() => scannedFeed);
          log(`Saving '${video.videoTitle}' under playlist '${feed.playlistTitle}'...`);
        }
      }

      if (!matchPatterns(video.videoTitle, this._config.defaults.match, list.match)) {
        await this.skip({ video, feed, list }, 'excluded by pattern');
        continue;
      }

      let videoPublished = (video.published || today).valueOf();
      if (videoPublished < list.published) {
        log(`[age] '${video.videoTitle}' was published on ${new Date(videoPublished).toISOString()} old, oldest allowed is ${new Date(list.published).toISOString()}`);
        await this.skip({ video, feed, list }, 'expired published date');
        continue;
      }

      log(`[enqueuing] Enqueueing "${video.videoTitle}", Videos Queued: ${await this._downloadQueue.count()}`);
      this.enqueue({ video, feed, list });
    }

    this._emitter.emit('scanned', { feed: scannedFeed, list });
  }

  protected async work({ feed, video, list }: DownloadRequest): Promise<void> {
    try {
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
            notify(`Download started for ${video.videoTitle}`, video.thumbnails.sd);
          },
          progress: (prog) => {
            if (prog.indeterminate) return;
            let progChange = prog.percent - prevProg;
            if (progChange >= 0.1 || prog.percent >= 100) {
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
          notify(`Download completed for ${video.videoTitle}`, video.thumbnails.hd);
        }).catch(async err => {
          await this._videoRepo.markAsFailed(video);
          log(`Failed to download ${video.videoTitle} (${video.videoId}): ${err.toString()}`);

          this._emitter.emit('downloadfailed', { video, feed, list, err });
        });
    } catch (err) {
      log(`Failed to download ${video.videoTitle} (${video.videoId}): ${err.toString()}`);
      this._emitter.emit('downloadfailed', { video, feed, list, err });
    }
  }
}

function moveFile(oldPath: string, newPath: string) {
  return new Promise<void>((resolve, reject) => {
    mkdirp(extractDirName(newPath), function (err) {
      if (err) return reject(err);
      copyFile(oldPath, newPath, err => {
        if (err) return reject(err);
        deleteFile(oldPath, err => err ? reject(err) : resolve());
      });
    });
  });
}