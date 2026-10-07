const path = require("node:path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname, {
  includeWebReplay: false,
  annotateReactComponents: false,
});

// The apps are independent packages; include the shared, React-free contracts.
config.watchFolders = [
  ...config.watchFolders,
  path.resolve(__dirname, "../shared"),
];

module.exports = config;
