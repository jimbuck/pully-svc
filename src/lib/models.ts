import { VideoResult } from 'scany';

export interface VideoRecord {
  id: string;
  data: VideoResult;
  status: VideoStatus;
}

export enum VideoStatus {
  New,
  Queued,
  Downloaded
}