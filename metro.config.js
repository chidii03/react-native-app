const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
const originalResolveRequest = config.resolver?.resolveRequest;

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (
      moduleName === "nodemailer" ||
      moduleName.startsWith("nodemailer/")
    ) {
      return { type: "empty" };
    }
    // Fall back to any existing custom resolver, then Metro's default
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

// ── NativeWind (must be the outermost wrapper) ───────────────────────────────
module.exports = withNativeWind(config, { input: "./app/global.css" });