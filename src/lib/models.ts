import { VideoResult } from 'scany';

export interface VideoRecord extends VideoResult {
  status: DownloadStatus;
  queued?: Date;
  downloaded?: Date;
  path?: string;
}

export enum DownloadStatus {
  Unknown,
  New,
  Queued,
  Downloaded
}