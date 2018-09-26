import { VideoResult } from 'scany';

import { VideoRecord, DownloadStatus } from './models';
import { logger } from '../utils/logger';
import { FlexelDatabase } from 'flexel';

const log = logger('video-repo');

export class VideoRepository {

  private _db: FlexelDatabase;

  constructor(options: { db: FlexelDatabase }) {
    this._db = options.db;
  }

  public async getOrAddVideo(video: VideoResult): Promise<VideoRecord> {
    let record = await this._db.get<VideoRecord>(video.videoId);
    
    if (!record) {
      record = Object.assign({}, video, { status: DownloadStatus.New });
    } else {
      // Update the video data (views, description, etc. may have changed)
      Object.assign(record, video);
    }
    
    await this._db.put(record.videoId, record);

    return record;
  }

  public async markAsQueued(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get<VideoRecord>(record.videoId);
    record.queued = new Date();
    record.status = DownloadStatus.Queued;
    await this._db.put(record.videoId, record);
    log(`Marked ${record.videoId} as queued...`);
    return record;
  }

  public async markAsDownloading(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get<VideoRecord>(record.videoId);
    record.status = DownloadStatus.Downloading;
    await this._db.put(record.videoId, record);
    log(`Marked ${record.videoId} as downloading...`);
    return record;
  }

  public async markAsDownloaded(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get<VideoRecord>(record.videoId);
    record.downloaded = new Date();
    record.status = DownloadStatus.Downloaded;
    await this._db.put(record.videoId, record);
    log(`Marked ${record.videoId} as downloaded...`);
    return record;
  }

  public async resetDownloadingVideos(): Promise<void> {
    // TODO: Need a way to query the db...
  }
}