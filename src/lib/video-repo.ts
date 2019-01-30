import { VideoResult } from 'scany';

import { VideoRecord, DownloadStatus } from './models';
import { logger } from '../utils/logger';
import { FlexelTable } from 'flexel';
import { EventEmitter } from 'events';
import jsonquery = require('jsonquery');

const log = logger('video-repo');

export class VideoRepository {

  private _db: FlexelTable<VideoRecord>;
  private _emitter: EventEmitter;

  constructor(options: {
    db: FlexelTable<VideoRecord>,
    emitter: EventEmitter
  }) {
    this._db = options.db;
    this._emitter = options.emitter;
  }

  public async query(query: jsonquery.Query<VideoRecord>): Promise<VideoRecord[]> {
    return await this._db.query(query);
  }

  public async getOrAddVideo(video: VideoResult): Promise<VideoRecord> {
    let record = await this._db.get(video.videoId);
    
    if (!record) {
      record = Object.assign({}, video, { status: DownloadStatus.New });
      await this._db.put(record);
    } else {
      // Update the video data (views, description, etc. may have changed)
      Object.assign(record, video);
    }

    return record;
  }

  public async markAsQueued(record: VideoRecord): Promise<VideoRecord> {
    record = await this.getOrAddVideo(record);
    record.queued = new Date();
    record.status = DownloadStatus.Queued;
    await this._db.put(record);
    log(`Marked '${record.videoTitle}' (${record.videoId}) as queued...`);
    return record;
  }

  public async markAsDownloading(record: VideoRecord): Promise<VideoRecord> {
    record = await this.getOrAddVideo(record);
    record.status = DownloadStatus.Downloading;
    await this._db.put(record);
    log(`Marked '${record.videoTitle}' (${record.videoId}) as downloading...`);
    return record;
  }

  public async markAsDownloaded(record: VideoRecord): Promise<VideoRecord> {
    record = await this.getOrAddVideo(record);
    record.downloaded = new Date();
    record.status = DownloadStatus.Downloaded;
    await this._db.put(record);
    log(`Marked '${record.videoTitle}' (${record.videoId}) as downloaded...`);
    return record;
  }

  public async markAsSkipped(record: VideoRecord, reason: string): Promise<VideoRecord> {
    record = await this.getOrAddVideo(record);
    let wasSkipped = record.status === DownloadStatus.Skipped;
    record.status = DownloadStatus.Skipped;
    record.reason = reason;
    await this._db.put(record);
    !wasSkipped && log(`Marked '${record.videoTitle}' as skipped: '${reason}'...`);
    return record;
  }

  public async markAsFailed(record: VideoRecord): Promise<VideoRecord> {
    record = await this.getOrAddVideo(record);
    record.status = DownloadStatus.Failed;
    await this._db.put(record);
    log(`Marked '${record.videoTitle}' (${record.videoId}) as failed...`);
    return record;
  }

  public async resetDownloadingVideos(): Promise<void> {
    let downloadingVideos = await this._db.query({ status: DownloadStatus.Downloading });
    for (let video of downloadingVideos) {
      video.status = DownloadStatus.New;
      await this._db.put(video);
    }
  }
}