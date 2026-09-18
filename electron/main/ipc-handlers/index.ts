import application from "./application";
import store from "./store";
import ssh from "./ssh";
import forge from "./forge";
import shell from "./shell";
import mcp from "./mcp";

export default () => {
  application();
  store();
  ssh();
  forge();
  shell();
  mcp();
};
