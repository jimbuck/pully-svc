import { FlexelQueue, AbstractDatabase } from 'flexel';
import { AsyncQueue } from 'skedgy';

import { VideoRecord } from './models';
import { logger } from '../utils/logger';

const log = logger('dl-queue');

export class DownloadQueue extends FlexelQueue<VideoRecord> {

  constructor(db: AbstractDatabase) {
    super(db);
  }
}