import { VideoResult, FeedResult } from 'scany';

export interface VideoRecord extends VideoResult {
  status: DownloadStatus;
  reason?: string;
  queued?: Date;
  downloaded?: Date;
  path?: string;
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
  list: ParsedWatchListItem;
}



export interface PullySvcConfig {
  log?: string | boolean;
  db?: string;
  pollMinDelay?: string;
  pollMaxDelay?: string;
  downloadDelay?: string;
  defaults?: DownloadDefaultConfig;
  watchlist: Array<WatchListItem>;
}

export interface ParsedPullySvcConfig
{
  log: string | false;
  db: string;
  pollMinDelay: number;
  pollMaxDelay: number;
  downloadDelay: number;
  defaults: ParsedDownloadDefaults;
  watchlist: Array<ParsedWatchListItem>;
}

export interface ParsedDownloadDefaults {
  enabled?: boolean;
  preset?: string;
  dir?: string;
  format?: string;
  match?: string[];
  published?: number;
}

export interface DownloadDefaultConfig {
  enabled?: boolean;
  preset?: string;
  dir?: string;
  format?: string;
  match?: string[];
  published?: string;
  lookupPlaylist?: boolean;
}

export interface WatchListItem extends DownloadDefaultConfig {
  feedUrl: string;
  desc?: string;
}

export interface ParsedWatchListItem {
  feedUrl: string;
  enabled: boolean;
  preset: string;
  dir: string;
  format: string;
  match?: string[];
  published: number;
  desc?: string;
  lookupPlaylist: boolean;
}