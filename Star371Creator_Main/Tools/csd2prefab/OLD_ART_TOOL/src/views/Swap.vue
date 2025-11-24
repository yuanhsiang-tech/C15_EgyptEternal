<template>
  <div class="main-page">
    <div class="header">
      <div class="row-container">
        <i class="fa fa-folder-open" aria-hidden="true" style="margin-right: -5px; color: white"></i>
        <label class="basic-font" style="width: 100px; color: white; font-size: 14px">導出資料夾</label>
        <input class="input-area" type="text" style="flex-grow: 1; margin-right: 10px" readonly="true" placeholder="選擇或放入一個資料夾" v-model="desPath" />
        <button class="small basic-font" style="margin-right: 5px" @click.prevent="clickTarget(false)">
          選擇
        </button>
        <button class="small basic-font" @click.prevent="clearTarget">
          清空
        </button>
      </div>
      <div class="row-container">
        <i class="fa fa-folder-open" aria-hidden="true" style="margin-right: 10px; color: white"></i>
        <label class="basic-font" style="color: white; font-size: 14px">選擇CCS檔或ZIP檔進行轉換</label>
        <p style="flex-grow: 1"></p>
        <button class="small basic-font" style="margin-right: 5px" @click.prevent="clickSource">
          選擇
        </button>
        <button class="small basic-font" @click.prevent="clearAll">清空</button>
      </div>
    </div>
    <div class="container">
      <div class="container2" style="width: 100%">
        <div class="board" style="height: 30px">
          <span class="basic-font" style="color: white">Studio與Creator素材互轉</span>
        </div>
        <div class="content" style="height: 100%" @drop="dropFile" @dragover="allowDrop" @dragenter="allowDrop" multiple>
          <div class="basic-font drag-hint" v-show="convertFiles.length == 0">
            <span class="center">拖曳CCS檔或ZIP檔至此處</span>
          </div>
          <convert-item v-for="(child, index) in convertFiles" :key="index" :convertFile="child"></convert-item>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="row-container" style="justify-content: flex-end">
        <div id="exportLoader" class="loader" style="margin-right: 10px; display: none"></div>
        <!-- <div style="wide:200px">
          <select v-model="versionPick">
            <option selected>3.10.0.0</option>
            <option>2.3.2.3</option>
          </select>
          <span>CSD輸出版本: {{ versionPick }}</span>
        </div> -->
        <label class="basic-font checkbox-label" style="margin-right:5px"> <input type="checkbox" v-model="isArtTemp" />自動整理資料夾</label>
        <div style="padding:10px">
          <span>Studio版本: </span>
          <input type="radio" id="2323" value="2.3.2.3" v-model="versionPick" style="margin-right:5px" />
          <label for="2323" style="margin-right:10px">2323版本</label>
          <input type="radio" id="310" value="3.10.0.0" v-model="versionPick" style="margin-right:5px" />
          <label for="310">3100版本</label>
        </div>
        <button id="exportBtn" class="medium basic-font" @click.stop="swapStart">
          轉換
        </button>
      </div>
    </div>
    <div id="checkmenu" class="modal">
      <div class="modal-content2" style="height: 180px; width: 240px; border-radius: 5px">
        <span class="modal-text basic-font"
          ><i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: #ffd30a"></i>
          注意
          <i class="fa fa-exclamation-triangle" aria-hidden="true" style="color: #ffd30a"></i
        ></span>
        <div
          style="
            display: table;
            height: 45px;
            width: 80%;
            overflow: hidden;
            margin-top: 10px;
          "
        >
          <div style="display: table-cell; vertical-align: middle">
            <div class="basic-font" style="text-align: center; font-weight: bold">
              開始轉換檔案？
            </div>
          </div>
        </div>
        <div>
          <button class="medium" style="margin-top: 15px; margin-right: 10px" @click.stop="closeMenu(true)">
            確認
          </button>
          <button class="medium" style="margin-top: 15px; margin-left: 10px" @click.stop="closeMenu(false)">
            取消
          </button>
        </div>
      </div>
    </div>
    <!-- <div id="checkmenu" class="modal">
      <div class="modal-content">
        <span class="modal-text basic-font"
          ><i class="fa fa-exclamation-triangle" aria-hidden="true" style="color:#FFD30A"></i> 注意<i class="fa fa-exclamation-triangle" aria-hidden="true" style="color:#FFD30A"></i
        ></span>
        <div style="display: table; height: 45px;width:80%; overflow: hidden;margin-top:10px">
          <div style="display: table-cell; vertical-align: middle;">
            <div class="basic-font" style="text-align:center;font-weight:bold">
              123
            </div>
          </div>
        </div>
        <div>
          <button class="medium" style="margin-top:15px;margin-right:10px" @click.stop="closeMenu(true)">
            確認
          </button>
          <button class="medium" style="margin-top:15px;margin-left:10px" @click.stop="closeMenu(false)">
            取消
          </button>
        </div>
      </div>
    </div> -->
    <div id="block" class="modal"></div>
  </div>
</template>

<script>
import "@/assets/style.css";
import ConvertItem from "@/components/ConvertItem.vue";
export default {
  components: { ConvertItem },
  methods: {
    closeMenu: async function(check) {
      this.$el.querySelector("#checkmenu").style.display = "none";
      if (check) {
        this.$el.querySelector("#exportLoader").style.display = "block";
        this.$el.querySelector("#block").style.display = "block";
        await new Promise((r) => setTimeout(r, 200));
        for (var i = 0; i < this.convertFiles.length; i++) {
          this.convertFiles[i].complete = await window.registerFuncs.convertProjFile(this.desPath, this.convertFiles[i].path, this.versionPick, this.isArtTemp);
          // this.convertFiles[i].complete = true;
          await new Promise((r) => setTimeout(r, 200));
          // console.log("aa", i);
        }
        // this.startConvert = false;
        // this.convertFiles = [];
        await new Promise((r) => setTimeout(r, 300));
        this.$el.querySelector("#exportLoader").style.display = "none";
        this.$el.querySelector("#block").style.display = "none";
        this.$bus.$emit("show-warn", "轉換完成！", true);
      }
    },
    swapStart: function() {
      if (this.convertFiles.length > 0 && this.desPath !== "") {
        // this.startConvert = true;
        this.$el.querySelector("#checkmenu").style.display = "block";
        // window.registerFuncs.swapProjFiles(this.convertFiles);
      } else if (!this.desPath) {
        this.clickTarget(true);
      }
      // console.log("start");
    },
    allowDrop: function(ev) {
      ev.preventDefault();
      // console.log("aa2");
    },
    dropFile: function(ev) {
      ev.preventDefault();
      var files = ev.dataTransfer.files;
      for (var i = 0; i < files.length; i++) {
        if (window.registerFuncs.compareExt(files[i].path, ".ccs") || window.registerFuncs.compareExt(files[i].path, ".zip")) {
          var filename = window.registerFuncs.getFilename(files[i].path);
          if (!this.convertFiles.find((el) => el.path == files[i].path)) {
            this.convertFiles.push({
              path: files[i].path,
              name: filename,
              complete: false,
            });
          } else {
            this.$bus.$emit("show-warn", "該檔案已在駐列內！", false);
          }
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
      // console.log("aa");
    },
    clickTarget: function(recheck) {
      var temp = window.registerFuncs.selectFolder();
      if (temp) {
        this.desPath = temp;
        if (this.desPath !== "" && recheck) {
          this.swapStart();
          // this.exportSelect();
        }
      }
    },
    clearTarget: function() {
      this.desPath = "";
    },
    clickSource: function() {
      var temp = window.registerFuncs.selectFile();
      if (temp) {
        if (window.registerFuncs.compareExt(temp, ".ccs") || window.registerFuncs.compareExt(temp, ".zip")) {
          var filename = window.registerFuncs.getFilename(temp);
          if (!this.convertFiles.find((el) => el.path == temp)) {
            this.convertFiles.push({
              path: temp,
              name: filename,
              complete: false,
            });
          } else {
            this.$bus.$emit("show-warn", "該檔案已在駐列內！", false);
          }
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
    },
    clearAll: function() {
      this.convertFiles = [];
    },
  },
  data() {
    return {
      openFolder: true,
      // startConvert: false,
      desPath: "",
      convertFiles: [],
      versionPick: "3.10.0.0",
      isArtTemp: false,
    };
  },
  created() {
    this.$bus.$on("delete-item", (p) => {
      for (var i = 0; i < this.convertFiles.length; i++) {
        if (this.convertFiles[i].path == p) {
          this.convertFiles.splice(i, 1);
          break;
        }
      }
    });
    this.$bus.$on("swap-end", () => {
      this.convertFiles = [];
      this.$el.querySelector("#block").style.display = "none";
      if (this.openFolder) {
        window.registerFuncs.openFolder(this.desPath);
        // console.log("open");
      }
    });
    // this.$bus.$on("convert-done", (p) => {
    //   console.log(p);
    //   for (var i = 0; i < this.convertFiles.length; i++) {
    //     if (this.convertFiles[i].path == p) {
    //       this.convertFiles[i].complete = true;
    //       break;
    //     }
    //   }
    // });
  },
  beforeDestroy() {
    this.$bus.$off("delete-item");
    this.$bus.$off("swap-end");
  },
};
</script>
