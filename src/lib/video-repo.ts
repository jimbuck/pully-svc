import { VideoResult } from 'scany';

import { VideoRecord, DownloadStatus } from './models';
import { logger } from '../utils/logger';
import { FlexelTable } from 'flexel';

const log = logger('video-repo');

export class VideoRepository {

  private _db: FlexelTable<VideoRecord>;

  constructor(options: { db: FlexelTable<VideoRecord> }) {
    this._db = options.db;
  }

  public async getOrAddVideo(video: VideoResult): Promise<VideoRecord> {
    let record = await this._db.get(video.videoId);
    
    if (!record) {
      record = Object.assign({}, video, { status: DownloadStatus.New });
    } else {
      // Update the video data (views, description, etc. may have changed)
      Object.assign(record, video);
    }
    
    await this._db.put(record);

    return record;
  }

  public async markAsQueued(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get(record.videoId);
    record.queued = new Date();
    record.status = DownloadStatus.Queued;
    await this._db.put(record);
    log(`Marked ${record.videoId} as queued...`);
    return record;
  }

  public async markAsDownloading(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get(record.videoId);
    record.status = DownloadStatus.Downloading;
    await this._db.put(record);
    log(`Marked ${record.videoId} as downloading...`);
    return record;
  }

  public async markAsDownloaded(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get(record.videoId);
    record.downloaded = new Date();
    record.status = DownloadStatus.Downloaded;
    await this._db.put(record);
    log(`Marked ${record.videoId} as downloaded...`);
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