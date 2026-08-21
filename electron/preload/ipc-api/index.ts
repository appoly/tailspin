import * as Application from "./Application";
import * as Store from "./Store";
import * as Ssh from "./Ssh";
import * as Forge from "./Forge";
import * as Updater from "./Updater";

// api exports functions that make up the frontend api, ie that in
// turn either do IPC calls to main for db communication or use
// allowed nodejs features like file i/o.
// Example `my-feature.ts`:
// export const fetchX = async (): Promise<X> => { ... }

export default {
  Application,
  Store,
  Ssh,
  Forge,
  Updater,
};
