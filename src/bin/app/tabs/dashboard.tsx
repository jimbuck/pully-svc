import { h, Component, Color, Fragment } from 'ink';
const Divider = require('ink-divider');

import { ProgressData } from 'pully';
import { FeedResult } from 'scany';

import { VideoRecord } from '../../../lib/models';
import { timestamp } from '../../../utils/dates-helpers';

export interface CurrentDownload {
  video: VideoRecord;
  feed: FeedResult;
  prog: ProgressData;
}

export interface DashboardPageProps {
  currentDownload: CurrentDownload;
  recentDownloads: VideoRecord[];
}


export class DashboardPage extends Component<DashboardPageProps> {

  constructor(props: DashboardPageProps) {
    //@ts-ignore
    super(props);
  }

  render(props: DashboardPageProps) {
       
    let currentDownloadDisplay = props.currentDownload ?
      <div>
        Currently downloading: '{props.currentDownload.video.videoTitle}' from '{props.currentDownload.feed.playlistTitle}' by {props.currentDownload.video.channelName}<br/>
        Progress: {props.currentDownload.prog.percent}% ({props.currentDownload.prog.downloadedBytes}/{props.currentDownload.prog.totalBytes})  Elapsed: {props.currentDownload.prog.elapsedStr} ETA: {props.currentDownload.prog.etaStr}<br/>
      </div> :
      <div>Currently downloading: Nothing</div>;
    
    let recentDownloadsDisplay = 
        <div>
        <div>Recent Downloads:</div>
        {props.recentDownloads.map(video => <div>{timestamp(video.downloaded)} - '{video.videoTitle}' by {video.channelName}</div>)}
        </div>
      ;

    return (
      <div>
        <div>{currentDownloadDisplay}</div>
        <Divider width={80} />
        <div>{recentDownloadsDisplay}</div>
      </div>
    );
  }
}