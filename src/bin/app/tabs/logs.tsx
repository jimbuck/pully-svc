import { h, Component } from 'ink';

export interface LogsPageProps {
  logs: string[];
}

export class LogsPage extends Component<LogsPageProps> {

  render(props: LogsPageProps) {
    return (<div>
      {props.logs.map(log => <div>{log}</div>)}
    </div>);
  }
}