import { execSync } from 'child_process';

import { defineConfig } from 'cypress';

export default defineConfig({
  viewportWidth: 375,
  viewportHeight: 667,
  screenshotOnRunFailure: true,
  // LENOVO 🤦‍♂️
  requestTimeout: 90000,
  responseTimeout: 90000,
  defaultCommandTimeout: 90000,
  e2e: {
    baseUrl: 'http://localhost:3000',
    experimentalSessionAndOrigin: true,
    env: {
      HTTP_CATCHER: 'http://localhost:3001/'
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
      on('task', {
        'db:reset'() {
          execSync('npx prisma db seed');
          return null;
        },
        'clearDownloadFolder'() {
          execSync('rm -rf ./cypress/downloads/*');
          return null;
        }
      });
    }
  }
});
