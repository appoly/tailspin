import { app, ipcMain, dialog } from 'electron';
import * as fs from 'fs';

export default () => {
   ipcMain.handle('open-file-dialog', (event, options) => {
      return dialog.showOpenDialog(options);
   });
   ipcMain.handle('read-from-path', (event, path) => {
      return fs.readFileSync(path, 'utf-8');
   });
};
