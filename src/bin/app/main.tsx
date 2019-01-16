import { h, render } from 'ink';

import { PullySvcConfig } from '../../lib/models';
import { PullySvcApp } from './app';

export function bootstrap(config: PullySvcConfig) {
  process.stdout.write("\u001b[2J\u001b[0;0H");

  render(<PullySvcApp config={config} />);
}