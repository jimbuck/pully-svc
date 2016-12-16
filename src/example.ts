import { join } from 'path';

const level = require('level');

import { PullyServer } from './';

const ps = new PullyServer({
  urls: [
    'https://www.youtube.com/user/freddiew',
    'https://www.youtube.com/playlist?list=PLjHf9jaFs8XUXBnlkBAuRkOpUJosxJ0Vx'
  ],
  db: level(join(__dirname, '..', 'db'), {
    valueEncoding: 'json'
  }) as LevelUp,
  skedgyOptions: {
    pollMinDelay: 3,
    pollMaxDelay: 3,
    taskMinDelay: 5,
    taskMaxDelay: 10
  } as any
});

ps.start();