import { join as joinPath } from 'path';

import { PullyServer } from './';

const ps = new PullyServer({
  watchList: {
    urls: [
      'https://www.youtube.com/user/freddiew',
      'https://www.youtube.com/playlist?list=PLjHf9jaFs8XUXBnlkBAuRkOpUJosxJ0Vx'
    ]
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