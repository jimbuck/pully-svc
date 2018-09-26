import { FlexelQueue, AbstractDatabase } from 'flexel';
import { VideoRecord } from './models';
import { logger } from '../utils/logger';

const log = logger('download-queue');

export class DownloadQueue extends FlexelQueue<VideoRecord> {
  constructor(db: AbstractDatabase) {
    super(db);
  }
}