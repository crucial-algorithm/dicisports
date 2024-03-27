/**
 * @type {import('@remix-run/dev').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildPath: "build/index.js",
  dev: { port: 4004 },
  ignoredRouteFiles: [".*"],
  serverModuleFormat: "cjs",
  serverNodeBuiltinsPolyfill: {
    modules: {
      buffer: true
    },
    globals: {
      Buffer: true,
    },
  },

  serverDependenciesToBundle: [/.*/],

  tailwind: false,
  postcss: false
};