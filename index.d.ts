declare const api: typeof import("./electron/preload/ipc-api").default;

interface Window {
  api: typeof import("./electron/preload/ipc-api").default;
}
