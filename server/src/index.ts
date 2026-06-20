import { config } from './config.ts';
import { loadConfig } from './config/load.ts';
import { validateLayout } from './widgets/index.ts';
import { createApp } from './app.ts';

const appConfig = loadConfig();
validateLayout(appConfig);

createApp({ appConfig }).listen(config.port, () => {
  console.log(`server listening on :${config.port}`);
});
