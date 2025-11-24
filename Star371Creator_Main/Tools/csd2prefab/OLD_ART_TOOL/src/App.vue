<template>
  <div>
    <div style="height:30px;margin-top:5px;margin-bottom:-10px;margin-left:2px">
      <input type="radio" id="page1" name="page_tab" @change="$el.querySelector('#export_link').click()" style="display:none" value="page1" v-model="radioSelected" checked />
      <label for="page1" class="basic-font link" :style="{ backgroundColor: radioSelected == 'page1' ? '#066cc5' : '#8CAFCF' }">拆解</label>
      <router-link to="/export" id="export_link" class="basic-font" style="display:none"> </router-link>
      <input type="radio" id="page2" name="page_tab" @change="$el.querySelector('#import_link').click()" style="display:none" value="page2" v-model="radioSelected" />
      <label for="page2" class="basic-font link" :style="{ backgroundColor: radioSelected == 'page2' ? '#066cc5' : '#8CAFCF' }">合併</label>
      <router-link to="/import" id="import_link" class="basic-font" style="display:none"></router-link>
      <input type="radio" id="page3" name="page_tab" @change="$el.querySelector('#swap_link').click()" style="display:none" value="page3" v-model="radioSelected" />
      <label for="page3" class="basic-font link" :style="{ backgroundColor: radioSelected == 'page3' ? '#066cc5' : '#8CAFCF' }">轉換</label>
      <router-link to="/swap" id="swap_link" class="basic-font" style="display:none"> </router-link>
      <!-- <input type="radio" id="page4" name="page_tab" @change="$el.querySelector('#unity_link').click()" style="display:none" value="page4" v-model="radioSelected" />
      <label for="page4" class="basic-font link" :style="{ backgroundColor: radioSelected == 'page4' ? '#066cc5' : '#8CAFCF' }">轉換UNITY</label> -->
      <router-link to="/unity" id="unity_link" class="basic-font" style="display:none"> </router-link>
      <div class="basic-font" style="float:right;margin-right:10px;font-size:14px">版本：{{ $store.getters.appVersion }}</div>
    </div>
    <router-view style="height:calc(100vh - 30px)" />
    <div id="alertmenu" class="modal">
      <div class="modal-content2" style="height:180px;width:240px;border-radius:5px;">
        <span class="modal-text basic-font"
          ><i class="fa fa-exclamation-triangle" aria-hidden="true" style="color:#FFD30A"></i> 注意 <i class="fa fa-exclamation-triangle" aria-hidden="true" style="color:#FFD30A"></i
        ></span>
        <div style="display: table; height: 45px;width:80%; overflow: hidden;margin-top:10px">
          <div style="display: table-cell; vertical-align: middle;">
            <div class="basic-font" style="text-align:center;font-weight:bold">
              {{ errorText }}
            </div>
          </div>
        </div>
        <button class="medium" style="margin-top:15px" @click.stop="closeAlert">
          確認
        </button>
      </div>
    </div>
  </div>
</template>

<style>
html,
body {
  overflow: hidden !important;
}

/* .wrapper {
  display: grid;
  grid-template-rows: 30px 1fr;
} */

.link {
  font-size: 14px;
  min-width: 50px;
  border-radius: 5px;
  color: white;
  margin: 0 2px;
  padding: 3px 15px;
  padding-bottom: 8px;
  /* background-color: #094479; */
  text-decoration: none;
  transition: background-color 0.25s;
}
</style>

<script>
window.$ = window.jQuery = require("jquery");
import "@/assets/style.css";
// const electron = require("electron");
// const app = electron.app || electron.remote.app;

// const { remote } = require("electron");

export default {
  name: "App",
  // methods: {
  //   showVersionInfo: function() {
  //     // var a = window.registerFuncs.currentVersion();
  //     return 123;
  //   },
  // },
  methods: {
    closeAlert() {
      this.$el.querySelector("#alertmenu").style.display = "none";
      if (this.isend) {
        switch (this.radioSelected) {
          case "page1":
            this.$bus.$emit("export-end");
            break;
          case "page2":
            this.$bus.$emit("import-end");
            break;
          case "page3":
            this.$bus.$emit("swap-end");
            break;
        }
      }
    },
  },
  created() {
    this.$bus.$on("show-warn", (warntext, isend) => {
      this.isend = isend;
      this.errorText = warntext;
      this.$el.querySelector("#alertmenu").style.display = "block";
    });
  },
  data() {
    return {
      isend: false,
      // currentAppVersion: "",
      radioSelected: "page1",
      errorText: "我我我我我我我我",
    };
  },
  beforeDestroy() {
    this.$bus.$off("show-warn");
  },
};
</script>
