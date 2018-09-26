import { FlexelQueue, AbstractDatabase } from 'flexel';
import { DownloadRequest } from './models';
import { logger } from '../utils/logger';

const log = logger('download-queue');

export class DownloadQueue extends FlexelQueue<DownloadRequest> {
  constructor(db: AbstractDatabase) {
    super(db);
  }
}