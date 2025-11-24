<template>
  <div class="main-page">
    <div class="header">
      <div class="row-container">
        <i class="fa fa-folder-open" aria-hidden="true" style="margin-right: -5px; color: white"></i>
        <label class="basic-font" style="width: 100px; color: white; font-size: 14px">主要專案檔</label>
        <input
          class="input-area"
          type="text"
          style="flex-grow: 1; margin-right: 10px"
          readonly="true"
          placeholder="選擇或放入一個CCS檔"
          v-model="mainFile"
          @drop.prevent="dropMain"
          @dragover.prevent
        />
        <button class="small basic-font" style="margin-right: 5px" @click.prevent="clickMain">
          選擇
        </button>
        <button class="small basic-font" @click.prevent="clearMain">
          清空
        </button>
        <i class="fa fa-refresh" aria-hidden="true" style="color: white; font-size: 20px; margin-left: 10px" @click.prevent="refreshMain"></i>
      </div>
      <div class="row-container">
        <i class="fa fa-folder-open" aria-hidden="true" style="margin-right: -5px; color: white"></i>
        <label class="basic-font" style="width: 100px; color: white; font-size: 14px">素材專案檔</label>
        <input class="input-area" type="text" style="flex-grow: 1; margin-right: 10px" readonly="true" placeholder="選擇或放入一個CCS檔" v-model="subFile" @drop="dropSub" @dragover.prevent />
        <button class="small basic-font" style="margin-right: 5px" @click.prevent="clickSub">
          選擇
        </button>
        <button class="small basic-font" @click.prevent="clearSub">清空</button>
        <i class="fa fa-refresh" aria-hidden="true" style="color: white; font-size: 20px; margin-left: 10px" @click.prevent="refreshSub"></i>
      </div>
    </div>
    <div class="container">
      <div class="container2">
        <div class="board" style="height: 30px">
          <span class="basic-font" style="color: white">主要專案檔</span>
        </div>
        <div class="content" style="height: 100%">
          <ul style="line-height: 160%; list-style: none">
            <tree-item-s :item="mainData" :key="NaN"></tree-item-s>
          </ul>
        </div>
      </div>
      <div class="container2" style="">
        <div class="board" style="height: 30px">
          <span class="basic-font" style="color: white; margin-left: 20px">素材專案檔</span>
          <label
            class="basic-font checkbox-label"
            style="
              margin-top: 6px;
              color: #ffc600;
              font-size: 12px;
              font-weight: bold;
              margin-right: 5px;
            "
          >
            <input type="checkbox" v-model="overwrite" :disabled="!hasNametable" />覆蓋原路徑
          </label>
        </div>
        <div class="content" style="height: 100%">
          <ul style="line-height: 160%; list-style: none">
            <tree-item-s :item="subData" :key="NaN"></tree-item-s>
          </ul>
        </div>
        <!-- <div
          v-show="Object.keys(mainData).length > 0 && Object.keys(subData).length > 0 && (!hasNametable || !hasPlisttable)"
          id="warningContainer"
          class="row-container"
          style="margin-right:auto;height:none"
        >
          <div v-show="Object.keys(mainData).length > 0 && Object.keys(subData).length > 0 && !hasNametable" class="basic-font warning">
            <i class="fa fa-exclamation-triangle" aria-hidden="true" style="color:#FFD30A;margin-right:3px"></i>缺少檔案參照檔
          </div>
          <div v-show="Object.keys(mainData).length > 0 && Object.keys(subData).length > 0 && !hasPlisttable" class="basic-font warning">
            <i class="fa fa-exclamation-triangle" aria-hidden="true" style="color:#FFD30A;margin-right:3px"></i>缺少合圖參照檔
          </div>
        </div> -->
      </div>
    </div>
    <div class="footer">
      <div class="row-container" style="justify-content: flex-end">
        <div id="warningContainer" class="row-container" style="margin-right: auto">
          <div v-show="Object.keys(mainData).length > 0 && Object.keys(subData).length > 0 && !hasNametable" class="basic-font warning">
            <i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: #ffd30a; margin-right: 3px"></i>缺少檔案參照檔
          </div>
          <div v-show="Object.keys(mainData).length > 0 && Object.keys(subData).length > 0 && !hasPlisttable" class="basic-font warning">
            <i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: #ffd30a; margin-right: 3px"></i>缺少合圖參照檔
          </div>
        </div>
        <div id="exportLoader" class="loader" style="margin-right: 10px; display: none"></div>
        <button id="exportBtn" class="medium basic-font" @click.stop="importStart">
          導入
        </button>
      </div>
    </div>
    <div id="block" class="modal"></div>
  </div>
</template>
<style scoped>
.warning {
  font-size: 14px;
  margin-right: 5px;
  color: white;
  border-radius: 5px;
  background-color: #b91f1f;
  padding: 5px 8px;
}
</style>
<script>
import "@/assets/style.css";
import TreeItemS from "@/components/TreeItemS.vue";
export default {
  components: {
    TreeItemS,
  },
  methods: {
    dropMain: function(e) {
      var temp = e.dataTransfer.files[0].path;
      if (temp) {
        if (window.registerFuncs.compareExt(temp, ".ccs")) {
          this.mainFile = temp;
          this.mainData = {};
          this.$nextTick(() => {
            this.loadmainData();
          });
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
    },
    dropSub: function(e) {
      var temp = e.dataTransfer.files[0].path;
      if (temp) {
        if (window.registerFuncs.compareExt(temp, ".ccs")) {
          this.subFile = temp;
          this.subData = {};
          this.$nextTick(() => {
            this.loadsubData();
          });
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
    },
    refreshMain: function() {
      if (this.mainFile) {
        this.mainData = {};
        this.$nextTick(() => {
          this.loadmainData();
        });
      }
    },
    refreshSub: function() {
      if (this.subFile) {
        this.subData = {};
        this.$nextTick(() => {
          this.loadsubData();
        });
      }
    },
    importStart: async function() {
      if (!this.mainFile) {
        this.$bus.$emit("show-warn", "請指定主要檔案！", false);
      } else if (!this.subFile) {
        this.$bus.$emit("show-warn", "請指定素材檔案！", false);
      } else {
        this.$el.querySelector("#exportLoader").style.display = "block";
        this.$el.querySelector("#block").style.display = "block";
        var check = await window.registerFuncs.checkProcess(this.mainFile);
        // console.log(check);
        if (check) {
          this.$bus.$emit("show-warn", "主要專案檔開啟中！", false);
          this.$el.querySelector("#exportLoader").style.display = "none";
          this.$el.querySelector("#block").style.display = "none";
        } else {
          await window.registerFuncs.importData(this.mainFile, this.subFile, this.overwrite);
          this.$bus.$emit("show-warn", "導入完成！", true);
          this.$el.querySelector("#exportLoader").style.display = "none";
        }
      }
    },
    checkFormerpath: function() {
      if (this.hasNametable == false) {
        this.$nextTick(() => {
          this.overwrite = false;
        });
        // console.log("no formerpath");
      }
    },
    loadmainData: function() {
      var temp = window.registerFuncs.analyzeFolder(this.mainFile, false);
      if (temp !== false) {
        this.mainData = temp;
        this.checkTable();
      } else {
        this.$bus.$emit("show-warn", "檔案資料夾遺失！", false);
        this.mainFile = "";
      }
    },
    loadsubData: function() {
      this.overwrite = false;
      var temp = window.registerFuncs.analyzeFolder(this.subFile, false);
      if (temp !== false) {
        this.subData = temp;
        this.checkTable();
      } else {
        this.$bus.$emit("show-warn", "檔案資料夾遺失！", false);
        this.subFile = "";
      }
    },
    checkTable() {
      if (window.registerFuncs.isSource(this.mainFile, this.subFile) == true) {
        this.hasNametable = window.registerFuncs.hasNametable(this.subFile);
        this.hasPlisttable = window.registerFuncs.hasPlisttable(this.subFile);
      } else {
        this.overwrite = false;
        this.hasNametable = false;
        this.hasPlisttable = false;
      }
    },
    clickMain: function() {
      var temp = window.registerFuncs.selectFile();
      if (temp) {
        if (window.registerFuncs.compareExt(temp, ".ccs")) {
          this.mainFile = temp;
          this.mainData = {};
          this.$nextTick(() => {
            this.loadmainData();
          });
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
    },
    clickSub: function() {
      var temp = window.registerFuncs.selectFile();
      if (temp) {
        if (window.registerFuncs.compareExt(temp, ".ccs")) {
          this.subFile = temp;
          this.subData = {};
          this.$nextTick(() => {
            this.loadsubData();
          });
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
    },
    clearMain() {
      this.mainFile = "";
      this.mainData = {};
      this.hasNametable = false;
      this.hasPlisttable = false;
    },
    clearSub() {
      this.subFile = "";
      this.subData = {};
      this.overwrite = false;
      this.hasNametable = false;
      this.hasPlisttable = false;
    },
  },
  data() {
    return {
      openFolder: true,
      overwrite: false,
      hasNametable: false,
      hasPlisttable: false,
      mainFile: "",
      subFile: "",
      mainData: {},
      subData: {},
    };
  },
  created() {
    this.$bus.$on("import-end", () => {
      this.$el.querySelector("#block").style.display = "none";
      this.mainData = {};
      this.$nextTick(() => {
        this.loadmainData();
      });
      if (this.openFolder) {
        window.registerFuncs.openFolder(this.mainFile);
        // console.log("open");
      }
    });
  },
  beforeDestroy() {
    this.$bus.$off("import-end");
  },
};
</script>
