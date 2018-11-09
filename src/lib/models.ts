import { VideoResult, FeedResult } from 'scany';

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
  Ignored,
  Queued,
  Downloading,
  Downloaded,
  Failed
}

export interface DownloadRequest {
  video: VideoRecord;
  feed: FeedResult;
  list: WatchListItem;
}

export interface PullyServiceConfig<TWatchlist=WatchListItem, TDelay=number> {
  logging?: string | boolean;
  db?: string;
  pollMinDelay?: TDelay;
  pollMaxDelay?: TDelay;
  downloadDelay?: TDelay;
  defaults?: DownloadDefaults;
  watchlist: Array<TWatchlist>;
}

export interface DownloadDefaults {
  preset?: string;
  dir?: string;
  format?: string;
  match?: string[];
}

export interface WatchListItem extends DownloadDefaults {
  feedUrl: string;
  enabled?: boolean;
}