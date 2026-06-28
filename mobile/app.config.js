const appJson = require("./app.json");

const isDevelopmentVariant = process.env.APP_VARIANT === "development";

module.exports = ({ config }) => {
  const baseConfig = {
    ...appJson.expo,
    ...config,
  };

  return {
    ...baseConfig,
    name: isDevelopmentVariant ? "AudioFlash Dev" : baseConfig.name,
    scheme: isDevelopmentVariant ? "audioflash-dev" : baseConfig.scheme,
    plugins: Array.from(new Set([...(baseConfig.plugins ?? []), "expo-web-browser"])),
    ios: {
      ...baseConfig.ios,
      bundleIdentifier: isDevelopmentVariant
        ? "ai.audioflash.mobile.dev"
        : baseConfig.ios?.bundleIdentifier,
    },
    android: {
      ...baseConfig.android,
      package: isDevelopmentVariant
        ? "com.audioflash.app.dev"
        : baseConfig.android?.package,
    },
  };
};
