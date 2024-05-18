import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';
import envOnly from 'vite-env-only';
import { cjsInterop } from 'vite-plugin-cjs-interop';
import { createRoutesFromFolders } from '@remix-run/v1-route-convention';

/**
 * @type {import('@remix-run/dev').AppConfig}
 */

installGlobals();

export default defineConfig({
  server: {
    port: 3000
  },
  plugins: [
    cjsInterop({
      dependencies: [
        'file-saver',
        'react-dropzone',
        '@radix-ui/react-dialog',
        'primereact'
      ]
    }),
    envOnly(),
    remix({
      appDirectory: 'app',
      ignoredRouteFiles: ['**/.*'],

      buildDirectory: 'build',
      serverBuildFile: 'index.js',

      routes(defineRoutes) {
        // uses the v1 convention, works in v1.15+ and v2
        return createRoutesFromFolders(defineRoutes);
      }
    }),
    tsconfigPaths()
  ],
  assetsInclude: ['**/*.md']
});
