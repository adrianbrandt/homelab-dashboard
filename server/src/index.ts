import { config } from './config.ts';
import { loadConfig } from './config/load.ts';
import { validateLayout } from './widgets/index.ts';
import { resolveAuth } from './auth/presets.ts';
import { createApp } from './app.ts';

const appConfig = loadConfig();
validateLayout(appConfig);

const auth = resolveAuth(appConfig.auth);
let authLog: string;
if (auth.provider === 'forward-header') {
  authLog = `auth: provider=forward-header required=${auth.required} header=${auth.header} trustedProxies=${auth.trustedProxies.length > 0}`;
} else if (auth.provider === 'cf-access-jwt') {
  authLog = `auth: provider=cf-access-jwt required=${auth.required} issuer=${auth.issuer} aud=${auth.aud.length}`;
} else {
  authLog = 'auth: provider=none (open)';
}
console.log(authLog);

createApp({ appConfig }).listen(config.port, () => {
  console.log(`server listening on :${config.port}`);
});
