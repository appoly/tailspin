require("dotenv").config({ path: "./electron-builder.env" });
const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: "com.appoly.log-viewer",
    appPath: `${appOutDir}/${appName}.app`,
    teamId: process.env.APPLE_TEAM_ID,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASS,
  });
};
