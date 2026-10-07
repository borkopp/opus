const {
  validateReleaseEnvironment,
} = require("./scripts/release-environment.cjs");
const { nativeSnapshot } = require("./scripts/ota-native.cjs");

module.exports = ({ config }) => {
  const environment = process.env.APP_ENV || "development";
  const release = process.env.APP_ENV === "production";
  if (release) validateReleaseEnvironment(process.env);

  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  return {
    ...config,
    ios: {
      ...config.ios,
      ...(!release
        ? {
            infoPlist: {
              ...config.ios?.infoPlist,
              NSLocalNetworkUsageDescription:
                "Connect to the OPUS test server on your Mac while testing this app.",
            },
          }
        : {}),
    },
    android: {
      ...config.android,
      ...(process.env.GOOGLE_SERVICES_JSON
        ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
        : {}),
    },
    extra: {
      ...config.extra,
      environment,
      nativeRuntimeSignature: nativeSnapshot().nativeSignature,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
