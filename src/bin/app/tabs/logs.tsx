import { h, Component, InkNode } from 'ink';

export interface LogsPageProps {
  children?: InkNode;
  logs: string[];
  limit: number;
}

export interface LogsPageState {
  scrollIndex: number;
}

export class LogsPage extends Component<LogsPageProps, LogsPageState> {

  private _handleKeyPress: (ch: any, key: any) => void;

  constructor(...args: any[]) {
    //@ts-ignore
    super(...args);

    this.state.scrollIndex = 0;
    
    this._handleKeyPress = (e, key) => {
      switch (key.name) {
        case 'down':
          let maxScrollIndex = this.props.logs.length - this.props.limit;
          this.setState({
            scrollIndex: (this.state.scrollIndex < maxScrollIndex) ? (this.state.scrollIndex + 1) : Math.max(0, maxScrollIndex)
          });
          break;
        case 'up':
          this.setState({
            scrollIndex: (this.state.scrollIndex > 0) ? (this.state.scrollIndex - 1) : 0
          });
          break;
      }
    }
  }

  render(props: LogsPageProps) {
    let logsToRender = props.logs.slice(this.state.scrollIndex, this.state.scrollIndex + props.limit)
    return (<div>
      <div>Logs: {props.logs.length} Scroll: {this.state.scrollIndex}</div>
      <div>{logsToRender.map(log => <div>{log}</div>)}</div>
    </div>);
  }

  componentDidMount() {
    super.componentDidMount();
    
    process.stdin.on('keypress', this._handleKeyPress);
  }

  componentWillUnmount() {
    super.componentWillUnmount();

    process.stdin.removeListener('keypress', this._handleKeyPress);
  }
}
