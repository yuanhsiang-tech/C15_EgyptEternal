import Vue from "vue";
import Vuex from "vuex";
import App from "./App.vue";
import vuetify from "./plugins/vuetify";
import router from "./router";
// import VJstree from "vue-jstree";
// import ChromeTabs from "chrome-tabs";
// import {tab} from "chrome-tabs";
// import Tree from "vuejs-tree";
// import LiquorTree from "liquor-tree";
// import Tree from "tui-tree";
// import vZtree from "v-ztree";
// import SplitPane, { Pane } from "react-split-pane";
import "font-awesome/css/font-awesome.min.css";
// import "@/assets/style.css";
Vue.config.productionTip = false;
Vue.prototype.$bus = new Vue();
// Vue.component("v-jstree", VJstree);
Vue.use(Vuex);
const store = new Vuex.Store({
  state: {
    packageVersion: process.env.VUE_APP_VERSION,
  },
  getters: {
    appVersion: (state) => {
      return state.packageVersion;
    },
  },
});
new Vue({
  store: store,
  router,
  components: {},
  vuetify,
  render: (h) => h(App),
}).$mount("#app");
