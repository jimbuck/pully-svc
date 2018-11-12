import { VideoResult, FeedResult } from 'scany';

export interface VideoRecord extends VideoResult {
  status: DownloadStatus;
  reason?: string;
  queued?: Date;
  downloaded?: Date;
  path?: string;
  watchlistName?: string;
}

export enum DownloadStatus {
  Unknown,
  New,
  Skipped,
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



export interface PullyServiceConfig<TWatchlist=WatchListItem, TDuration=number> {
  logging?: string | boolean;
  db?: string;
  pollMinDelay?: TDuration;
  pollMaxDelay?: TDuration;
  downloadDelay?: TDuration;
  maxRetroDownload?: TDuration,
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