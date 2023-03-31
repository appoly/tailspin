import { ipcMain } from "electron";

export default () => {
  ipcMain.handle("test-ssh-credentials", (event, options) => {
    console.log("test-ssh-credentials", options);
    return true;
  });
};
