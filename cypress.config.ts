import { execSync } from 'child_process';

import { defineConfig } from 'cypress';
import { cypressBrowserPermissionsPlugin } from 'cypress-browser-permissions';

const { CY_REQUEST_TIMEOUT, CY_RESPONSE_TIMEOUT, CY_DEFAULT_COMMAND_TIMEOUT } =
  process.env;

const requestTimeout = CY_REQUEST_TIMEOUT
  ? Number(CY_REQUEST_TIMEOUT)
  : 15000;
const responseTimeout = CY_RESPONSE_TIMEOUT
  ? Number(CY_RESPONSE_TIMEOUT)
  : 90000;
const defaultCommandTimeout = CY_DEFAULT_COMMAND_TIMEOUT
  ? Number(CY_DEFAULT_COMMAND_TIMEOUT)
  : 12000;

export default defineConfig({
  viewportWidth: 375,
  viewportHeight: 667,
  screenshotOnRunFailure: true,
  requestTimeout,
  responseTimeout,
  defaultCommandTimeout,
  e2e: {
    baseUrl: 'http://localhost:3000',
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
    }
  }
});
