import { h, Component, InkNode } from 'ink';
import { DownloadRequest } from '../../../lib/models';

export interface QueuePageProps {
  children?: InkNode;
  queue: DownloadRequest[];
}

export class QueuePage extends Component<QueuePageProps> {
  render(props: QueuePageProps) {
    if ((props.queue || []).length === 0) {
      return <div>The queue is currently empty...</div>
    }
    
    return (
      <div>
    {props.queue.map((dr, i) => <div>#{i+1}) '{dr.video.videoTitle}' by {dr.video.channelName}</div>)}
      </div>
    );
  }
}