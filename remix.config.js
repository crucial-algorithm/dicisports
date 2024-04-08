const { createRoutesFromFolders } = require('@remix-run/v1-route-convention');

/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: 'app',
  assetsBuildDirectory: 'public/build',
  publicPath: '/build/',
  serverBuildPath: 'build/index.js',
  dev: { port: 4004 },
  ignoredRouteFiles: ['.*'],
  serverModuleFormat: 'cjs',
  serverNodeBuiltinsPolyfill: {
    modules: {
      buffer: true
    },
    globals: {
      Buffer: true
    }
  },

  browserNodeBuiltinsPolyfill: { modules: { events: true, stream: true } },

  serverDependenciesToBundle: [/.*/],

  routes(defineRoutes) {
    // uses the v1 convention, works in v1.15+ and v2
    return createRoutesFromFolders(defineRoutes);
  },

  tailwind: true,
  postcss: true
};