import { defineConfig } from 'vite';
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import tsconfigPaths from 'vite-tsconfig-paths';
import envOnly from 'vite-env-only';
import { cjsInterop } from 'vite-plugin-cjs-interop';
import { createRoutesFromFolders } from '@remix-run/v1-route-convention';
import { execSync } from 'child_process';
import mdx from '@mdx-js/rollup';


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
    mdx(),
    remix({
      ignoredRouteFiles: ['**/*.css'],
      routes(defineRoutes) {
        // uses the v1 convention, works in v1.15+ and v2
        return createRoutesFromFolders(defineRoutes);
      }
    }),
    tsconfigPaths(),
    {
      name: 'postbuild-commands',
      closeBundle: async () => {
        // transpile seed.ts so it can be used in node
        execSync(
          'npx tsc --resolveJsonModule --esModuleInterop prisma/seed.ts',
          { stdio: 'inherit' }
        );
        execSync('mv prisma/seed.js prisma/seed.cjs', { stdio: 'inherit' });
      }
    }
  ]
});
