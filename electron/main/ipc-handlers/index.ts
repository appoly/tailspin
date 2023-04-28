import application from "./application";
import store from "./store";
import ssh from "./ssh";
import forge from "./forge";

export default () => {
  application();
  store();
  ssh();
  forge();
};
