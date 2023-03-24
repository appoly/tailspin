import { app, ipcMain, dialog } from 'electron';

export default () => {
   ipcMain.handle('open-file-dialog', (event, options) => {
      return dialog.showOpenDialog(options);
   });
};
