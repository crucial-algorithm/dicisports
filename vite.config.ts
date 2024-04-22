import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';

const { createRoutesFromFolders } = require('@remix-run/v1-route-convention');

/**
 * @type {import('@remix-run/dev').AppConfig}
 */

installGlobals();

export default defineConfig({
  server: {
    port: 3000
  },
  plugins: [
    remix({
      appDirectory: 'app',
      ignoredRouteFiles: ['.*'],
      serverModuleFormat: 'cjs',

      routes(defineRoutes) {
        // uses the v1 convention, works in v1.15+ and v2
        return createRoutesFromFolders(defineRoutes);
      }
    }),
    tsconfigPaths()
  ],
  assetsInclude: ['**/*.md']
});
