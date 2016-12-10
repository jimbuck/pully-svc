
import { Scheduler } from 'skedgy';
import { Scany } from 'scany';
import { Pully } from 'pully';

import { VideoRecord } from './lib/models';

export class PullyServer {

  private _scheduler: Scheduler<VideoRecord>;
  private _scany: Scany;
  private _pully: Pully;

  constructor(options: {}) {

    this._scheduler = new Scheduler<VideoRecord>({
      pollMinDelay: 60 * 5,
      pollMaxDelay: 60 * 30,
      taskMinDelay: 60 * 5,
      taskMaxDelay: 60 * 90,
      poll: async (enqueue) => {
        //this._scany.fetch()
      },
      task: async (video) => {
        return this._pully
          .download(video.url)
          .then(results => {
            // Do something...
          });
      }
    });
    this._scany = new Scany();
    this._pully = new Pully({
      // hmmm....
    });
  }

  public start(): void {
    this._scheduler && this._scheduler.start();
  }

  public stop(): void {
    this._scheduler && this._scheduler.stop();
  }
}