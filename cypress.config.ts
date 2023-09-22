import { execSync } from 'child_process';

import { defineConfig } from 'cypress';
import { cypressBrowserPermissionsPlugin } from 'cypress-browser-permissions';

import dotenv from 'dotenv';

dotenv.config();

const {
  CY_BASE_URL,
  MAILGUN_ENDPOINT,
  CY_REQUEST_TIMEOUT,
  CY_RESPONSE_TIMEOUT,
  CY_DEFAULT_COMMAND_TIMEOUT,
  SIBS_WEBHOOK_SECRET
} =
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
const baseUrl = CY_BASE_URL ? CY_BASE_URL : 'http://localhost:3000';
const HTTP_CATCHER = MAILGUN_ENDPOINT ? MAILGUN_ENDPOINT : 'http://localhost:3001/';

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
      HTTP_CATCHER,
      SIBS_WEBHOOK_SECRET,
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

      // Found this fix here - https://github.com/cypress-io/cypress/issues/27804#issuecomment-1719882404
      // TODO: Remove this after bumping cypress version
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome' && browser.isHeadless) {
          launchOptions.args = launchOptions.args.map((arg) => {
            if (arg === '--headless') {
              return '--headless=new';
            }

            return arg;
          });
        }

        return launchOptions;
      });
    }
  }
});
