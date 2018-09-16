import { join } from 'path';
import { FlexelDatabase } from 'flexel';

import { PullyServer } from './';

const ps = new PullyServer({
  urls: [
    'https://www.youtube.com/user/freddiew',
    'https://www.youtube.com/playlist?list=PLjHf9jaFs8XUXBnlkBAuRkOpUJosxJ0Vx'
  ],
  db: new FlexelDatabase(join(__dirname, '..', 'db')),
  skedgyOptions: {
    pollMinDelay: 3,
    pollMaxDelay: 3,
    taskMinDelay: 5,
    taskMaxDelay: 10
  } as any
});

ps.start();