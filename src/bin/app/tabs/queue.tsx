import { h, Component } from 'ink';
import { DownloadRequest } from '../../../lib/models';

export interface QueuePageProps {
  queue: DownloadRequest[];
}

export class QueuePage extends Component<QueuePageProps> {
  render(props: QueuePageProps) {
    return (
      <div>
    {props.queue.map((dr, i) => <div>#{i+1}) '{dr.video.videoTitle}' by {dr.video.channelName}</div>)}
      </div>
    );
  }
}