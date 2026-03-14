const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve the shared package outside the app root
const sharedPackage = path.resolve(__dirname, "../packages/shared");
config.watchFolders = [...(config.watchFolders || []), sharedPackage];
config.resolver.extraNodeModules = {
  "@audioflash/shared": sharedPackage,
};

module.exports = withNativeWind(config, { input: "./global.css" });
