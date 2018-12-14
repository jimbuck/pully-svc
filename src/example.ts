import { join as joinPath, dirname as extractDirName, resolve as resolvePath } from 'path';
import { rename as renameFile } from 'fs';
import * as mkdirp from 'mkdirp';

import { PullyService, Presets } from './';
import { WatchListItem } from './lib/models';
import { TaskScheduler } from './lib/task-scheduler';
import FlexelDatabase from 'flexel';
import { EventEmitter } from 'events';

import { scrubString } from 'pully-core';

(async () => {
  const str = 'Uploads from YOGSCAST Lewis & Simon [UUH-_hzb2ILSCo9ftVSnrCIQ]';
console.log(`Orig: ${str}
Scrb: ${scrubString(str)}`);

const src = 'C:\\Users\\james\\AppData\\Local\\Temp\\pully-119428Sa95UyOvJOkT.mp4';
const dest = 'C:\\Projects\\pully-server\\test\\downloads\\Uploads from YOGSCAST Lewis & Simon [UUH-_hzb2ILSCo9ftVSnrCIQ]\\ANIMALS vs HUMANS  Gmod TTT - 2018-12-13 - [sCKu-9hMTgE].mp4';
  console.log(`Moving '${src}'
    to '${dest}'`);
  
  await moveFile(src, dest);
})().catch(err => {
  console.error(err);
  process.exit(1);
});


function moveFile(oldPath: string, newPath: string) {
  return new Promise<void>((resolve, reject) => {
    mkdirp(extractDirName(newPath), function (err) {
      if (err) return reject(err);
      renameFile(oldPath, newPath, err => err ? reject(err) : resolve());
    });
  });
}


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