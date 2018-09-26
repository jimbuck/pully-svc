import { VideoResult, FeedResult } from 'scany';
import { Pully } from 'pully';

export interface VideoRecord extends VideoResult {
  status: DownloadStatus;
  queued?: Date;
  downloaded?: Date;
  path?: string;
  watchlistName?: string;
}

export enum DownloadStatus {
  Unknown,
  New,
  Queued,
  Downloading,
  Downloaded
}

export interface DownloadRequest {
  video: VideoResult;
  feed: FeedResult;
}

export interface WatchList {
  [listName: string]: string|WatchListItem
}

export interface WatchListItem {
  feedUrl: string,
  dir?: string,
  preset?: string,
  template?: (video: VideoRecord, feed: FeedResult) => string,
  include?: string[],
  exclude?: string[]
}