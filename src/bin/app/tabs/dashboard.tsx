import { h, Component, Color, Fragment } from 'ink';
import { VideoRecord } from '../../../lib/models';
import { ProgressData } from 'pully';
import { FeedResult } from 'scany';

export interface CurrentDownload {
  video: VideoRecord;
  feed: FeedResult;
  prog: ProgressData;
}

export interface DashboardPageProps {
  currentDownload: CurrentDownload;
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
        Progress: {props.currentDownload.prog.percent}% ({props.currentDownload.prog.downloadedBytes}/{props.currentDownload.prog.totalBytes})<br/>
        Elapsed: {props.currentDownload.prog.elapsedStr} ETA: {props.currentDownload.prog.etaStr}<br/>
      </div> :
      <div>
        Currently downloading: Nothing<br />
      </div>;

    return (
      <div>
        {currentDownloadDisplay}
      </div>
    );
  }
}