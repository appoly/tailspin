import application from "./application";
import store from "./store";
import ssh from "./ssh";

export default () => {
  application();
  store();
  ssh();
};