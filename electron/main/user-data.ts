import { app } from "electron";
import { join } from "node:path";

// Dev runs use the same app name as the installed build, so by default both
// read and write the same electron-store config — testing in dev would edit
// (and can corrupt) the real connections. Give dev its own userData directory.
//
// This must run before anything constructs a Store, hence the side-effecting
// module imported first in index.ts.
if (!app.isPackaged) {
  app.setPath("userData", join(app.getPath("appData"), `${app.getName()} (dev)`));
  app.setPath("sessionData", app.getPath("userData"));
}
