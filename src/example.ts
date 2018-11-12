import { join as joinPath } from 'path';

import { PullyService, Presets } from './';
import { WatchListItem } from './lib/models';
import { TaskScheduler } from './lib/task-scheduler';
import FlexelDatabase from 'flexel';
import { EventEmitter } from 'events';

let taskScheduler = new TaskScheduler({
  rootDb: new FlexelDatabase(),
  config: {
    watchlist: []
  },
  emitter: new EventEmitter()
});


//taskScheduler['work']();



// const ps = new PullyService({
//   logging: true,
//   db: joinPath(__dirname, '..', 'temp', 'pully-db'),
//   pollMinDelay: '5 seconds',
//   pollMaxDelay: '10 seconds',
//   downloadDelay: '3 seconds',
//   defaults: {
//     dir: joinPath(__dirname, '..', 'temp', 'videos')
//   },
//   watchlist: [
//     'https://www.youtube.com/user/freddiew',
//     {
//       feedUrl: 'https://www.youtube.com/playlist?list=PLjHf9jaFs8XUXBnlkBAuRkOpUJosxJ0Vx',
//       preset: Presets.FourK,
//       template: '${feed.channelName}/${video.videoTitle}'
//     } as WatchListItem
//   ]
// });

// ps.start();