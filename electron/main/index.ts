// Must be first: redirects userData in dev before any Store is constructed.
import "./user-data";
import { app, BrowserWindow, shell, ipcMain } from "electron";
import { release } from "node:os";
import { join } from "node:path";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import ipcHandlers from "./ipc-handlers";
import setupAutoUpdater from "./updater";

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, "..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL ? join(process.env.DIST_ELECTRON, "../public") : process.env.DIST;

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

// Opt-in DevTools protocol endpoint so scripts/capture.mjs can drive the app
// and grab README screenshots/GIFs. Dev only, and off unless asked for.
if (!app.isPackaged && process.env.TAILSPIN_CAPTURE) {
  app.commandLine.appendSwitch("remote-debugging-port", process.env.TAILSPIN_CAPTURE_PORT ?? "9222");
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

async function createWindow() {
  win = new BrowserWindow({
    title: "Tailspin",
    // Fixed window size while capturing so screenshots are reproducible.
    ...(process.env.TAILSPIN_CAPTURE ? { width: 1280, height: 800 } : {}),
    icon: join(process.env.PUBLIC, "tailspin-min.png"),
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      // While capturing, the window sits behind the terminal driving it; without
      // this Chromium throttles frames and page transitions freeze mid-fade.
      ...(process.env.TAILSPIN_CAPTURE ? { backgroundThrottling: false } : {}),
    },
    autoHideMenuBar: true,
    // The renderer draws its own titlebar (tabs live in it), so hide the native
    // one on macOS but keep the traffic lights.
    ...(process.platform === "darwin"
      ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 12, y: 12 } }
      : {}),
  });

  // An occluded window stops painting and stops firing animation frames, which
  // freezes Vue's page transitions mid-swap and yields blank screenshots. Keep
  // the capture window on top and unthrottled.
  if (process.env.TAILSPIN_CAPTURE) {
    win.setAlwaysOnTop(true);
    win.webContents.setBackgroundThrottling(false);
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    // electron-vite-vue#298
    win.loadURL(url);
    // Open devTool if the app is not packaged — but not while capturing
    // screenshots, where a docked inspector gets in the way.
    if (!process.env.TAILSPIN_CAPTURE) win.webContents.openDevTools();
    // Install vue devtools
    installExtension(VUEJS_DEVTOOLS)
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log("An error occurred: ", err));
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});

// Initialize ipcHandlers
ipcHandlers();

setupAutoUpdater(() => win);
