import { h, Component } from 'ink';
const { Tabs, Tab } = require('ink-tab');
const Divider = require('ink-divider');

import { PullyService } from '../..';
import { PullySvcConfig, VideoRecord, WatchListItem, DownloadRequest, DownloadStatus } from '../../lib/models';

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
  recentDownloads: VideoRecord[],
  queue: DownloadRequest[]
  database: VideoRecord[]
}

interface PullySvcAppContext {

}

export class PullySvcApp extends Component<PullySvcAppProps, PullySvcAppState, PullySvcAppContext> {

  private _pullySvc: PullyService;

  constructor(props: PullySvcAppProps, context: PullySvcAppContext) {
    //@ts-ignore
    super(props, context);

    this._pullySvc = new PullyService(props.config);

    this.state = {
      logs: [],
      limit: 10,
      recentDownloads: [],
      queue: [],
      database: []
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
          {this.state.activeTabName === TabNames.Dashboard && <DashboardPage currentDownload={this.state.currentDownload} recentDownloads={this.state.recentDownloads} />}
          {this.state.activeTabName === TabNames.Queue && <QueuePage queue={this.state.queue} />}
          {this.state.activeTabName === TabNames.Database && <DatabasePage />}
          {this.state.activeTabName === TabNames.Logs && <LogsPage logs={this.state.logs} limit={this.state.limit} />}
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
    const updateLists = async () => {
      const [
        queue,
        database
      ] = await Promise.all([
        this._pullySvc.getQueue(),
        this._pullySvc.query()
      ]);
      this.setState({
        queue,
        database,
        recentDownloads: database.filter(v => v.status === DownloadStatus.Downloaded).sort((a, b) => b.downloaded.valueOf() - a.downloaded.valueOf()).slice(0, 5)
      });
    };

    this._pullySvc.on('log', ({ message }) => {
      let logs = [...this.state.logs, message];
      logs = logs.slice(-1 * this.state.limit * 10);
      this.setState({
        logs
      });
    });

    this._pullySvc.on('progress', async (currentDownload) => {
      if (currentDownload.prog.downloadedBytes === currentDownload.prog.totalBytes) {
        currentDownload = null;
      }
      this.setState({ currentDownload });
    });

    this._pullySvc.on('downloaded', updateLists);
    this._pullySvc.on('polled', updateLists);
    this._pullySvc.on('queued', updateLists);
    this._pullySvc.on('downloadfailed', updateLists);
    this._pullySvc.on('skipped', updateLists);

    updateLists();
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