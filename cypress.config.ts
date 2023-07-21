import { execSync } from 'child_process';

import { defineConfig } from 'cypress';
import { cypressBrowserPermissionsPlugin } from 'cypress-browser-permissions';

const { CY_REQUEST_TIMEOUT, CY_RESPONSE_TIMEOUT, CY_DEFAULT_COMMAND_TIMEOUT, CY_BASE_URL } =
  process.env;

const requestTimeout = CY_REQUEST_TIMEOUT
  ? Number(CY_REQUEST_TIMEOUT)
  : undefined;
const responseTimeout = CY_RESPONSE_TIMEOUT
  ? Number(CY_RESPONSE_TIMEOUT)
  : undefined;
const defaultCommandTimeout = CY_DEFAULT_COMMAND_TIMEOUT
  ? Number(CY_DEFAULT_COMMAND_TIMEOUT)
  : undefined;

const baseUrl = CY_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  viewportWidth: 375,
  viewportHeight: 667,
  screenshotOnRunFailure: true,
  video: false,
  requestTimeout,
  responseTimeout,
  defaultCommandTimeout,
  e2e: {
    baseUrl,
    experimentalSessionAndOrigin: true,
    env: {
      HTTP_CATCHER: 'http://localhost:3001/',
      browserPermissions: {
        geolocation: 'allow'
      }
    },
    setupNodeEvents(on, config) {
      config = cypressBrowserPermissionsPlugin(on, config);
      // implement node event listeners here
      on('task', {
        'db:reset'() {
          execSync('npx prisma db seed');
          return null;
        },
        clearDownloadFolder() {
          execSync('rm -rf ./cypress/downloads/*');
          return null;
        }
      });

      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push(
            '--unsafely-treat-insecure-origin-as-secure=http://172.18.0.1:3000'
          );
          launchOptions.args.push(
            '--allow-running-insecure-content'
          );
          launchOptions.args.push(
            '--reduce-security-for-testing'
          );
        }

        console.log('[PRINTING STUFF] ------> ', launchOptions.args); // print all current args
        return launchOptions;
      });
    }
  }
});
