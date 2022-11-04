/**
 * @type {import('@remix-run/dev/config').AppConfig}
 */
module.exports = {
  appDirectory: "app",
  assetsBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildDirectory: "build",
  devServerPort: 8002,
  ignoredRouteFiles: [".*"],
  routes: async (defineRoutes) => {
    return defineRoutes((route) => {
      route("/__e2e__/mailgun", "__e2e_routes__/mailgun.tsx");
    });
  }
};
