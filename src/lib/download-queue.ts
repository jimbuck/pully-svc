import { PromiseQueue } from 'skedgy';

import { VideoRecord } from './models';
import { logger } from '../utils/logger';
import { LevelWrapper } from '../utils/level-wrapper';

const log = logger('dl-queue');

const FRONT_ID = 'front';
const BACK_ID = 'back';

interface DownloadQueueItem {
  id: string;
  data: VideoRecord;
  nextItem: string;
}

export class DownloadQueue implements PromiseQueue<VideoRecord> {

  private _db: LevelWrapper;

  constructor(options: {
    db: LevelWrapper
  }) {
    this._db = options.db;
  }

  public async peek(): Promise<VideoRecord> {
    const frontId = await this._db.get<string>(FRONT_ID);
    const item = await this._db.get<DownloadQueueItem>(frontId);

    return item && item.data;
  }

  public async enqueue(video: VideoRecord): Promise<void> {

    const item: DownloadQueueItem = {
      id: video.id,
      data: video,
      nextItem: null
    };

    await this._db.put(item.id, item);
     
    await this._updateBack(item.id);
  }

  public async dequeue(): Promise<VideoRecord> {
    const item = await this._getFront();

    await this._updateFront(item.nextItem);    
    await this._db.del(item.id);

    return item.data;
  }

  private _getFrontId(): Promise<string> {
    return this._db.get<string>(FRONT_ID);
  }

  private _getBackId(): Promise<string> {
    return this._db.get<string>(BACK_ID);
  }

  private async _getFront(): Promise<DownloadQueueItem> {
    const frontId = await this._getFrontId();
    return this._db.get<DownloadQueueItem>(frontId);
  }

  private async _getBack(): Promise<DownloadQueueItem> {
    const backId = await this._getBackId();
    return this._db.get<DownloadQueueItem>(backId);
  }

  private _updateFront(id: string): Promise<void> {
    return this._db.put(FRONT_ID, id);
  }

  private async _updateBack(id: string): Promise<void> {
    const back = await this._getBack();
    const frontId = await this._getFrontId();

    if (!frontId) {
      await this._updateFront(id);
    }

    if (back) {
      back.nextItem = id;
      await this._db.put(back.id, back);
    }

    return this._db.put(BACK_ID, id);
  }
}