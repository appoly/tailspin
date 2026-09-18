import { BrowserWindow, ipcMain, screen } from "electron";

export default () => {
  const drags = new WeakMap<BrowserWindow, { x: number; y: number; cursor: Electron.Point; stop: () => void }>();

  ipcMain.on("window-drag-begin", event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || event.senderFrame !== event.sender.mainFrame) return;
    drags.get(win)?.stop();
    if (win.isMaximized() || win.isFullScreen()) return;

    const [x, y] = win.getPosition();
    const stop = () => {
      drags.delete(win);
      win.removeListener("blur", stop);
      win.removeListener("closed", stop);
      event.sender.removeListener("did-start-navigation", stop);
      event.sender.removeListener("render-process-gone", stop);
    };
    // Both positions use Electron's screen DIP coordinates, including Retina
    // and mixed-scale displays. Do not mix renderer pixels with window bounds.
    drags.set(win, { x, y, cursor: screen.getCursorScreenPoint(), stop });
    win.once("blur", stop);
    win.once("closed", stop);
    event.sender.once("did-start-navigation", stop);
    event.sender.once("render-process-gone", stop);
  });

  ipcMain.on("window-drag-move", event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || event.senderFrame !== event.sender.mainFrame) return;
    const drag = drags.get(win);
    if (!drag) return;
    if (win.isMaximized() || win.isFullScreen()) {
      drag.stop();
      return;
    }
    const cursor = screen.getCursorScreenPoint();
    win.setPosition(drag.x + cursor.x - drag.cursor.x, drag.y + cursor.y - drag.cursor.y);
  });

  ipcMain.on("window-drag-end", event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && event.senderFrame === event.sender.mainFrame) drags.get(win)?.stop();
  });
};
