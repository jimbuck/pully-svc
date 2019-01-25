import { h, Component } from 'ink';
const { Tabs, Tab } = require('ink-tab');
const Divider = require('ink-divider');

import { PullyService } from '../..';
import { PullySvcConfig, VideoRecord, WatchListItem, DownloadRequest } from '../../lib/models';

import { DashboardPage, CurrentDownload } from './tabs/dashboard';
import { QueuePage } from './tabs/queue';
import { DatabasePage } from './tabs/database';
import { LogsPage } from './tabs/logs';

const TabNames = {
  Dashboard: 'dashboard',
  Queue: 'queue',
  Database: 'database',
  Logs: 'logs',
  Settings: 'settings'
};


interface PullySvcAppProps {
  config: PullySvcConfig;
}

interface PullySvcAppState {
  activeTabName?: string;
  logs: string[];
  limit: number;
  currentDownload?: CurrentDownload;
  queue: DownloadRequest[]
}

interface PullySvcAppContext {

}

export class PullySvcApp extends Component<PullySvcAppProps, PullySvcAppState, PullySvcAppContext> {

  private _pullySvc: PullyService;

  constructor(props: PullySvcAppProps, context: PullySvcAppContext) {
    //@ts-ignore
    super(props, context);
    this.state = {
      logs: [],
      limit: 10,
      queue: []
    };
	}

	render() {
    return (
      <div>
        <Divider title={'PullySvc'} width={80} />
        <br/>
        <Tabs onChange={this.handleTabChange.bind(this)}>
          <Tab name={TabNames.Dashboard}>Dashboard</Tab>
          <Tab name={TabNames.Queue}>Queue</Tab>
          <Tab name={TabNames.Database}>Database</Tab>
          <Tab name={TabNames.Logs}>Logs</Tab>
        </Tabs><br />
        <br/>
        <div>
          {this.state.activeTabName === TabNames.Dashboard && <DashboardPage currentDownload={this.state.currentDownload} />}
          {this.state.activeTabName === TabNames.Queue && <QueuePage queue={this.state.queue} />}
          {this.state.activeTabName === TabNames.Database && <DatabasePage />}
          {this.state.activeTabName === TabNames.Logs && <LogsPage logs={this.state.logs} />}
        </div>
      </div>
    );
  }
  
  handleTabChange(name: string, activeTab: string) {
    this.setState({
      activeTabName: name,
    });
  }

	componentDidMount() {
    this._pullySvc = new PullyService(this.props.config);

    this._pullySvc.on('log', ({ message }) => {
      let logs = [...this.state.logs, message];
      logs = logs.slice(-1 * this.state.limit);
      this.setState({
        logs
      });
    });

    this._pullySvc.on('progress', async (currentDownload) => {
      let queue = await this._pullySvc.getQueue();
      if (currentDownload.prog.downloadedBytes === currentDownload.prog.totalBytes) {
        currentDownload = null;
      }
      this.setState({ currentDownload, queue });
    });

    const updateQueue = async () => {
      let queue = await this._pullySvc.getQueue();
      this.setState({ queue });
    }

    this._pullySvc.on('polled', updateQueue);
    this._pullySvc.on('queued', updateQueue);
    this._pullySvc.on('downloaded', updateQueue);
    this._pullySvc.on('downloadfailed', updateQueue);
    this._pullySvc.on('skipped', updateQueue);
    updateQueue();

    this._pullySvc.start();
	}

	componentWillUnmount() {
    this._pullySvc.stop();
    this._pullySvc.removeAllListeners('log');
    this._pullySvc.removeAllListeners('progress');
    this._pullySvc.removeAllListeners('polled');
    this._pullySvc.removeAllListeners('queued');
    this._pullySvc.removeAllListeners('downloaded');
    this._pullySvc.removeAllListeners('downloadfailed');
    this._pullySvc.removeAllListeners('skipped');
	}
}