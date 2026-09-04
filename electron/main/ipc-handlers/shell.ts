import { ipcMain, shell } from "electron";

export default () => {
  // Only ssh:// is allowed through: openExternal hands the string to the OS,
  // so an unrestricted handler would let the renderer launch arbitrary
  // protocol handlers (file:, and on Windows anything registered).
  ipcMain.handle("open-external", async (event, url: string) => {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { success: false, message: "Not a valid URL" };
    }

    if (parsed.protocol !== "ssh:") {
      return { success: false, message: "Only ssh:// URLs can be opened" };
    }

    try {
      await shell.openExternal(parsed.toString());
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error?.message ?? "Could not open the URL" };
    }
  });
};
