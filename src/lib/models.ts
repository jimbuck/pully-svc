import { FlatVideoData } from 'scany';

export interface VideoRecord {
  id: string;
  data: FlatVideoData;
  status: VideoStatus;
}

export enum VideoStatus {
  New,
  Queued,
  Downloaded
}