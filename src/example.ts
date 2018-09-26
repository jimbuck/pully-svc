import { join as joinPath } from 'path';

import { PullyService, Presets } from './';
import { WatchListItem } from './lib/models';

const ps = new PullyService({
  watchlist: {
    'FreddieW': 'https://www.youtube.com/user/freddiew',
    'Smarter Every Day in 4K': {
      feedUrl: 'https://www.youtube.com/playlist?list=PLjHf9jaFs8XUXBnlkBAuRkOpUJosxJ0Vx',
      preset: Presets.FourK,
      template: (video, feed) => `${feed.channelName}/${video.videoTitle}`
    } as WatchListItem
  },
  db: joinPath(__dirname, '..', 'db'),
  skedgyOptions: {
    pollMinDelay: 3,
    pollMaxDelay: 3,
    taskMinDelay: 5,
    taskMaxDelay: 10
  } as any
});

ps.start();