import { VideoResult } from 'scany';

import { VideoRecord, VideoStatus } from './models';
import { logger } from '../utils/logger';
import { FlexelDatabase } from 'flexel';

const log = logger('video-repo');

export class VideoRepository {

  private _db: FlexelDatabase;

  constructor(options: { db: FlexelDatabase }) {
    this._db = options.db;
  }

  public async getOrAddVideo(video: VideoResult): Promise<VideoRecord> {
    let item = await this._db.get<VideoRecord>(video.videoId);
    
    if (!item) {
      item = {
        id: video.videoId,
        data: video,
        status: VideoStatus.New
      };
    } else {
      // Update the video data (views, ratings, description, etc. may have changed)
      item.data = video;
    }
    
    await this._db.set(item.id, item);

    return item;
  }

  public async markAsQueued(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get<VideoRecord>(record.id);
    record.status = VideoStatus.Queued;
    await this._db.set(record.id, record);

    return record;
  }

  public async markAsDownloaded(record: VideoRecord): Promise<VideoRecord> {
    record = await this._db.get<VideoRecord>(record.id);
    record.status = VideoStatus.Downloaded;
    await this._db.set(record.id, record);

    return record;
  }
}