import Vue from "vue";
import Router from "vue-router";
import Export from "./views/Export.vue";
import Import from "./views/Import.vue";
import Swap from "./views/Swap.vue";
import SwapUnity from "./views/SwapUnity.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      redirect: "/export",
    },
    {
      path: "/export",
      name: "export",
      component: Export,
    },
    {
      path: "/import",
      name: "import",
      component: Import,
    },
    {
      path: "/swap",
      name: "swap",
      component: Swap,
    },
    {
      path: "/unity",
      name: "unity",
      component: SwapUnity,
    },
  ],
});
