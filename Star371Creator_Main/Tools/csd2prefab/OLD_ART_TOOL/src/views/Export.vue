<template>
  <div class="main-page" @mouseover.stop="triggerHover" @click.stop="triggerClick">
    <div class="header">
      <div class="row-container">
        <i class="fa fa-folder-open" aria-hidden="true" style="margin-right: -5px; color: white"></i>
        <label class="basic-font" style="width: 100px; color: white; font-size: 14px">導出資料夾</label>
        <input class="input-area" type="text" style="flex-grow: 1; margin-right: 10px" readonly="true" placeholder="選擇或放入一個資料夾" v-model="desPath" @drop="dropTarget" @dragover.prevent />
        <!-- <input id="target" type="file" style="display: none" webkitdirectory /> -->
        <button class="small basic-font" style="margin-right: 5px" @click.prevent="clickTarget(false)">
          選擇
        </button>
        <button class="small basic-font" @click.prevent="clearTarget">清空</button>
      </div>
      <div class="row-container">
        <i class="fa fa-folder-open" aria-hidden="true" style="margin-right: -5px; color: white"></i>
        <label class="basic-font" style="width: 100px; color: white; font-size: 14px">拆解專案檔</label>
        <input class="input-area" type="text" style="flex-grow: 1; margin-right: 10px" readonly="true" placeholder="選擇或放入一個CCS檔" v-model="srcPath" @drop.prevent="dropSrc" @dragover.prevent />
        <!-- <input id="source" type="file" style="display: none" /> -->
        <button class="small basic-font" style="margin-right: 5px" @click.prevent="clickSource">
          選擇
        </button>
        <button class="small basic-font" @click.prevent="clearSrc">清空</button>
      </div>
    </div>
    <div class="container">
      <div class="container2">
        <div class="board" style="height:30px"><span class="basic-font" style="color:white;">CSD檔案列表</span></div>
        <div class="content" style="height:100%">
          <ul style="line-height:160%;  list-style: none;">
            <tree-item v-for="(child, index) in treeData" :key="index" :item="child"></tree-item>
            <!-- <tree-item :item="treeData" :key="NaN"></tree-item> -->
          </ul>
        </div>
        <div class="search">
          <i class="fa fa-search" aria-hidden="true" style="font-size:18px;position:relative;top:5px;left:5px;color:#10528d"></i>
          <input id="search-input" class="input-area2" type="text" placeholder="篩選檔案" spellcheck="false" v-model.lazy="searchtext" @change="searchText($event)" />
          <i class="fa fa-times" aria-hidden="true" style="font-size:22px;position:relative;top:3px;left:-5px;color:#BBD0E3" @click.stop="clearSearch"></i>
        </div>
      </div>
      <div class="container2">
        <div class="board" style="height:30px">
          <span class="basic-font" style="color:white;margin-left:20px">CSD內嵌列表</span>
          <label class="basic-font checkbox-label" style="margin-top:6px; color: #ffc600;font-size: 12px;font-weight: bold;margin-right:5px">
            <input type="checkbox" v-model="csdHideAll" @change="toggleShowAll" />隱藏
          </label>
          <!-- <label class="basic-font" style="user-select:none;color:#FFC600;font-size:14px;margin-top:6px;margin-right:5px;font-weight:bold">
            <input type="checkbox" v-model="csdHideAll" @change="toggleShowAll" />隱藏</label
          > -->
        </div>
        <div class="content" style="height:100%;">
          <ul style="line-height:160%;  list-style: none;">
            <csd-item v-for="(child, index) in csdHierarchy" :key="index" :item="child"></csd-item>
          </ul>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="row-container" style="justify-content: flex-end">
        <div id="exportLoader" class="loader" style="margin-right:10px;display:none"></div>
        <button id="exportBtn" class="medium basic-font" @click.stop="exportSelect">導出</button>
      </div>
    </div>
    <div id="checkmenu" class="modal">
      <div class="modal-content">
        <span class="modal-text basic-font"
          ><i class="fa fa-exclamation-triangle" aria-hidden="true" style="color:#FFD30A"></i> 打包以下檔案與其關聯資源？<i
            class="fa fa-exclamation-triangle"
            aria-hidden="true"
            style="color:#FFD30A"
          ></i
        ></span>
        <div class="content" style="width:100%;height:100%">
          <div class="basic-font" v-for="(group, index) in exportNames" :key="index" style="background-color:#D8EBF7;margin-bottom:5px; border-radius: 3px;padding:5px;padding-bottom:5px;">
            <i class="fa fa-folder close" aria-hidden="true" style="color:#D9AA00;font-size:18px">
              <span class="basic-font" style="font-weight:bold;color:#D9AA00"> {{ group[0].replace(/\.[^/.]+$/, "") }}</span></i
            >
            <div class="basic-font export" v-for="na in group" :key="na">{{ na }}</div>
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
    </div>
    <div id="block" class="modal"></div>
  </div>
</template>

<script>
import "@/assets/style.css";
window.$ = window.jQuery = require("jquery");
import CsdItem from "@/components/CsdItem.vue";
import TreeItem from "@/components/TreeItem.vue";
// import CsdItem from "./components/CsdItem.vue";
// import TreeItem from "./components/TreeItem.vue";
// import VueSplitter from "@rmp135/vue-splitter";
// import splitPanel from "vue-panel-split";
// var el = document.querySelector(".chrome-tabs");
// var chromeTabs = new ChromeTabs();
// chromeTabs.init(el);

export default {
  components: {
    TreeItem,
    CsdItem,
    // VueSplitter,
    // splitPanel,
    // Multipane,
    // MultipaneResizer,
  },
  // mounted() {
  //   // handle reply from the backend
  //   window.ipc.on("TEST_IPC", (index) => {
  //     console.log(index);
  //   });
  // },
  methods: {
    loadpathData: function() {
      var temp = window.registerFuncs.analyzeFolder(this.srcPath, true);
      if (temp !== false) {
        this.treeData = [temp];
        this.pathData = {};
        this.csdHierarchy = [];
        this.csdTable = [];
        this.idCounter = 1;
        this.scrollRight = [];
        this.indexRight = 0;
        this.scrollLeft = [];
        this.indexLeft = 0;
        this.searchtext = "";
        var filepaths = this.walkThrough(this.treeData);
        var parser = new DOMParser();
        for (var i = 0; i < filepaths.length; i++) {
          this.pathData[filepaths[i]] = [];
          var fulltext = window.registerFuncs.readXML(filepaths[i]);
          var xmlDoc = parser.parseFromString(fulltext, "text/xml");
          var elements = xmlDoc.getElementsByTagName("*");
          if (this.csdTable.findIndex((el) => el.path == filepaths[i]) < 0) {
            this.csdTable.push({
              filename: window.registerFuncs.getFilename(filepaths[i]),
              path: filepaths[i],
              ppath: "none",
              id: this.idCounter,
              pid: 0,
              children: [],
              show: true,
              blur: false,
              associated: false,
            });
            this.idCounter++;
          }
          for (var j = 0; j < elements.length; j++) {
            var temppath = elements[j].getAttribute("Path");
            if (temppath != null) {
              var temppath2 = window.registerFuncs.studioPaths(this.srcPath, temppath);
              if (!this.pathData[filepaths[i]].includes(temppath2)) {
                this.pathData[filepaths[i]].push(temppath2);
              }
              if (window.registerFuncs.compareExt(temppath, ".csd")) {
                var pid = 0;
                var ppath = filepaths[i];
                var count2s = this.csdTable.filter((el) => el.path == temppath2);
                var count1 = this.csdTable.findIndex((el) => el.path == filepaths[i]);
                if (count1 >= 0) {
                  pid = this.csdTable[count1].id;
                  ppath = this.csdTable[count1].path;
                } else {
                  pid = this.idCounter;
                  this.csdTable.push({
                    filename: window.registerFuncs.getFilename(filepaths[i]),
                    path: filepaths[i],
                    ppath: "none",
                    id: this.idCounter,
                    pid: 0,
                    children: [],
                    show: true,
                    blur: false,
                    associated: true,
                  });
                  this.idCounter++;
                }
                if (count2s.length > 0 && count2s.some((el) => el.pid === 0)) {
                  count2s.forEach(function(el) {
                    if (el.pid === 0) {
                      el.pid = pid;
                      el.ppath = ppath;
                      el.associated = true;
                    }
                  });
                } else if (count2s.length == 0 || (count2s.length > 0 && count2s.every((el) => el.pid !== pid))) {
                  this.csdTable.push({
                    filename: window.registerFuncs.getFilename(temppath2),
                    path: temppath2,
                    ppath: ppath,
                    id: this.idCounter,
                    pid: pid,
                    children: [],
                    show: true,
                    blur: false,
                    associated: true,
                  });
                  this.idCounter++;
                }
              }
            }
          }
        }
        this.csdMapping = this.csdTable.reduce((acc, el, i) => {
          acc[el.id] = i;
          return acc;
        }, {});
        let root = this.csdTable;
        root.forEach((el) => {
          if (el.pid !== 0) {
            let parentEl = root[this.csdMapping[el.pid]];
            parentEl.children = [...(parentEl.children || []), el];
          }
        });
        this.csdHierarchy = root.filter((item) => item.pid == 0);
        // this.csdHierarchy.forEach((el) => this.$bus.$emit("associate-left", el.path, true));
        // for (var k = 0; k < this.csdHierarchy.length; k++) {
        //   this.$bus.$emit("associate-left", this.csdHierarchy[k].path, true);
        // }
        // console.log(this.csdTable);
        // console.log(this.csdHierarchy);
        // console.log(this.pathData);
      } else {
        this.$bus.$emit("show-warn", "檔案資料夾遺失！", false);
        this.srcPath = "";
        // console.log("require CSS file");
      }
    },
    walkThrough: function(data) {
      var temppath = [];
      data.forEach((e) => {
        if (e.children) {
          temppath = temppath.concat(this.walkThrough(e.children));
        } else if (e.enabled && e.selected) {
          temppath.push(e.path);
        }
      });
      return temppath;
      // if (data.children) {
      //   data.children.forEach((e) => {
      //     temppath = temppath.concat(this.walkThrough(e));
      //   });
      // } else if (data.enabled && data.selected) {
      //   temppath.push(data.path);
      // }
      // return temppath;
    },
    walkThrough2: function(data) {
      var temppath = [];
      temppath.push(data.path);
      if (data.children) {
        data.children.forEach((e) => {
          temppath = temppath.concat(this.walkThrough2(e));
        });
      }
      return temppath;
    },
    closeMenu: async function(check) {
      if (check) {
        this.$el.querySelector("#exportLoader").style.display = "block";
        this.$el.querySelector("#block").style.display = "block";
        this.$el.querySelector("#checkmenu").style.display = "none";
        this.startExport = true;
        // console.log(this.exportDatas);
        // console.log("export");
        await new Promise((r) => setTimeout(r, 500));
        this.startExport = await window.registerFuncs.exportData(this.exportPaths, this.srcPath, this.desPath);
        // await new Promise((r) => setTimeout(r, 2000));
        // while (this.startExport === true) {
        //   await new Promise((r) => setTimeout(r, 1000));
        // }
        this.$el.querySelector("#exportLoader").style.display = "none";
        this.$bus.$emit("show-warn", "導出完成！", true);
      } else {
        this.$el.querySelector("#checkmenu").style.display = "none";
      }
    },
    exportComplete: function() {
      this.startExport = false;
      this.$el.querySelector("#alertmenu").style.display = "block";
    },
    exportSelect: function() {
      if (this.srcPath !== undefined && this.desPath !== "" && !this.startExport) {
        this.exportDatas = this.getExportFiles(this.csdHierarchy);
        this.exportPaths = this.getExportPaths(this.exportDatas); //攤平
        this.exportPaths.forEach((chunk, idx) => {
          //轉換成可比較
          this.exportPaths[idx] = JSON.stringify(chunk);
        });
        this.exportPaths = [...new Set(this.exportPaths)]; //比較
        this.exportPaths.forEach((chunk, idx) => {
          //轉換回原資料
          this.exportPaths[idx] = JSON.parse(chunk);
        });
        this.exportNames = [];
        if (this.exportPaths.length > 0) {
          for (var i = 0; i < this.exportPaths.length; i++) {
            var temp = [];
            for (var j = 0; j < this.exportPaths[i].length; j++) {
              temp.push(window.registerFuncs.getFilename(this.exportPaths[i][j]));
            }
            this.exportNames.push(temp);
          }
          this.$el.querySelector("#checkmenu").style.display = "block";
        } else {
          this.$bus.$emit("show-warn", "請勾選檔案！", false);
        }
      } else if (!this.srcPath) {
        this.$bus.$emit("show-warn", "請指定來源！", false);
      } else if (!this.desPath) {
        this.clickTarget(true);
      }
    },
    dropSrc: function(e) {
      var temp = e.dataTransfer.files[0].path;
      if (temp) {
        if (window.registerFuncs.compareExt(temp, ".ccs")) {
          this.srcPath = temp;
          this.treeData = [];
          this.csdHierarchy = [];
          this.$nextTick(() => {
            this.loadpathData();
          });
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
    },
    dropTarget: function(e) {
      if (window.registerFuncs.isDirectory(e.dataTransfer.files[0].path)) {
        var temp = e.dataTransfer.files[0].path;
        if (temp) {
          this.desPath = e.dataTransfer.files[0].path;
        }
      } else {
        this.$bus.$emit("show-warn", "需要資料夾路徑！", false);
      }
    },
    clearSrc() {
      this.srcPath = "";
      this.treeData = [];
      this.csdHierarchy = [];
      // this.pathData = {};
    },
    clearTarget() {
      this.desPath = "";
    },
    clickSource: function() {
      var temp = window.registerFuncs.selectFile();
      if (temp) {
        if (window.registerFuncs.compareExt(temp, ".ccs")) {
          this.srcPath = temp;
          this.treeData = [];
          this.csdHierarchy = [];
          this.$nextTick(() => {
            this.loadpathData();
          });
          // setTimeout(this.loadpathData(), 5000);
        } else {
          this.$bus.$emit("show-warn", "檔案格式錯誤！", false);
        }
      }
    },
    clickTarget: function(recheck) {
      // this.desPath = "";
      var temp = window.registerFuncs.selectFolder();
      if (temp) {
        this.desPath = temp;
        if (this.desPath !== "" && recheck) {
          this.exportSelect();
        }
      }
      // if (temppath !== this.srcPath) {
      //   this.desPath = temp;
      // } else {
      //   this.errorText = "來源與目的地不可相同！";
      //   this.$el.querySelector("#alertmenu").style.display = "block";
      // }
    },
    // filteData: function() {},
    toggleSelect: function(data, temppath, selected) {
      for (var key in data) {
        if (data[key] !== null && typeof data[key] == "object") {
          this.toggleSelect(data[key], temppath, selected);
        } else if (key == "path" && data[key] == temppath) {
          data.blur = !selected;
          // if (data.children.length > 0) {
          //   if (data.show && data.children.every((el) => !el.show || el.blur)) {
          //     data.show = false;
          //   } else {
          //     data.show = true;
          //     for (var i = 0; i < data.children.length; i++) {
          //       data.children[i].show = data.show;
          //     }
          //   }
          // } else {
          //   data.show = true;
          // }
          // for (var i = 0; i < data.children.length; i++) {
          //   data.children[i].show = data.show;
          // }
          // if (data.blur == true) {
          //   if (!selected || data.children.every((el) => !el.show)) {
          //     data.show = selected;
          //     data.blur = false;
          //   } else {
          //     data.blur = false;
          //   }
          // } else if (!selected && data.children.some((el) => el.show)) {
          //   data.show = true;
          //   data.blur = true;
          // } else {
          //   data.show = selected;
          //   data.blur = false;
          // }
        }
      }
      // return data;
    },
    recheckHierarchy: function() {
      for (var i = 0; i < this.csdHierarchy.length; i++) {
        if (this.csdHierarchy[i].children.length === 0) {
          if (!this.csdHideAll) {
            this.csdHierarchy[i].show = true;
          } else {
            this.csdHierarchy[i].show = !this.csdHierarchy[i].blur;
          }
        } else {
          if (!this.csdHideAll) {
            this.csdHierarchy[i].show = true;
          } else {
            this.csdHierarchy[i].show = this.checkChildren(this.csdHierarchy[i]) ? true : false;
          }
        }
      }
    },
    recheckClickable: function(data) {
      for (var key in data) {
        if (data[key] !== null && typeof data[key] == "object") {
          this.recheckClickable(data[key]);
        } else if (key == "path" && data.children.length > 0) {
          this.setAllChildren(data.children);
          for (var i = 0; i < data.children.length; i++) {
            this.$bus.$emit("associate-left", data.children[i].path, !data.blur);
          }
        }
      }
    },
    setAllChildren: function(data) {
      for (var key in data) {
        if (data[key] !== null && typeof data[key] == "object") {
          this.setAllChildren(data[key]);
        } else if (key == "path") {
          data.blur = false;
          this.$bus.$emit("associate-left", data.path, true);
        }
      }
    },
    checkChildren: function(data) {
      var check = false;
      if (!data.blur) {
        check = true;
      } else if (data.children.length > 0) {
        for (var i = 0; i < data.children.length; i++) {
          check = this.checkChildren(data.children[i]) ? true : check;
        }
      }
      return check;
    },
    checkparentHierarchy: function(data, temppath) {
      for (var key in data) {
        if (data[key] !== null && typeof data[key] == "object") {
          this.checkparentHierarchy(data[key], temppath);
        } else if (key == "path" && data[key] == temppath) {
          if (data.blur == true && data.children.every((el) => el.blur)) {
            data.show = false;
            data.blur = false;
          } else if (!data.show && data.children.some((el) => el.show || el.blur)) {
            data.blur = true;
            data.show = true;
          }
        }
      }
      // return data;
    },
    getExportFiles: function(data) {
      // console.log(data.length);
      var temparray = [];
      for (var i = 0; i < data.length; i++) {
        if (data[i].blur === true && data[i].children.length > 0) {
          temparray = temparray.concat(this.getExportFiles(data[i].children));
        } else if (data[i].blur === false) {
          temparray.push(data[i]);
        }
      }
      return temparray;
      // for (var key in data) {
      //   if (data[key] !== null && typeof data[key] == "object") {
      //     datas = datas.concat(this.getExportFiles(data[key]));
      //   } else if (key == "blur" && data.blur === false) {
      //     datas.push(data);
      //   }
      // }
      // return datas;
    },
    getExportPaths: function(data) {
      var temparray = [];
      for (var i = 0; i < data.length; i++) {
        var a = this.walkThrough2(data[i]);
        a = [...new Set(a)];
        temparray.push(a);
      }
      return temparray;
    },
    // getChildData: function(data) {
    //   for (var key in data) {
    //     if (data[key] !== null && typeof data[key] == "object") {
    //       this.getChildData(data[key]);
    //     } else if (key == "path") {

    //     }
    //   }
    // },
    findRoot: function(id) {
      if (this.csdTable[this.csdMapping[id]].pid == 0) {
        return id;
      } else {
        return this.findRoot(this.csdTable[this.csdMapping[id]].pid);
      }
    },
    getAllParent: function(id) {
      var temp = [];
      if (this.csdTable[this.csdMapping[id]].pid != 0) {
        temp.push(this.csdTable[this.csdMapping[id]].pid);
        return temp.concat(this.getAllParent(this.csdTable[this.csdMapping[id]].pid));
      }
      return temp;
    },
    clearSearch: function() {
      if (this.searchtext !== "") {
        this.searchtext = "";
        this.searchTree(this.treeData, "");
      }
    },
    searchText: function(e) {
      e.target.blur();
      this.searchTree(this.treeData, this.searchtext);
    },
    searchTree: function(data, text) {
      data.forEach((e) => {
        if (e.children && e.children.length > 0) {
          this.searchTree(e.children, text);
          if (e.enabled) {
            if (e.text.toUpperCase().includes(text.toUpperCase())) {
              e.show = true;
            } else if (e.children.every((el) => el.show === false)) {
              e.show = false;
            } else if (text === "") {
              e.show = true;
            }
          }
        } else if (e.enabled) {
          if (text === "") {
            e.show = true;
          } else {
            if (e.text.toUpperCase().includes(text.toUpperCase())) {
              e.show = true;
            } else {
              e.show = false;
            }
          }
        }
      });
      // if (data.children && data.children.length > 0) {
      //   data.children.forEach((e) => {
      //     this.searchTree(e, text);
      //   });
      //   if (data.enabled) {
      //     if (data.text.toUpperCase().includes(text.toUpperCase())) {
      //       data.show = true;
      //     } else if (data.children.every((el) => el.show === false)) {
      //       data.show = false;
      //     } else if (text === "") {
      //       data.show = true;
      //     }
      //   }
      // } else if (data.enabled) {
      //   if (text === "") {
      //     data.show = true;
      //   } else {
      //     if (data.text.toUpperCase().includes(text.toUpperCase())) {
      //       data.show = true;
      //     } else {
      //       data.show = false;
      //     }
      //   }
      // }
    },
    triggerHover: function() {
      this.$bus.$emit("check-right", "");
      this.$bus.$emit("check-left", "");
      // console.log("aaff");
    },
    triggerClick: function() {
      this.$bus.$emit("mark-right", "");
      this.$bus.$emit("mark-left", "");
    },
    toggleShowAll: function() {
      this.recheckHierarchy();
    },
  },
  data() {
    return {
      // startAction: false,
      openFolder: true,
      showingpath: "",
      srcPath: "",
      desPath: "",
      treeData: [],
      pathData: {},
      csdMapping: {},
      csdHierarchy: [],
      csdTable: [],
      idCounter: 1,
      scrollRight: [],
      indexRight: 0,
      scrollLeft: [],
      indexLeft: 0,
      searchtext: "",
      exportPaths: [],
      exportNames: [],
      exportDatas: [],
      csdHideAll: false,
      startExport: false,
    };
  },
  // watch() {
  //   return {
  //     treeData: function() {},
  //   };
  // },
  created() {
    this.$bus.$on("recheck-file", (pa, selected) => {
      // var paths = this.csdTable.filter((el) => el.path == pa);
      this.toggleSelect(this.csdHierarchy, pa, selected);
      // this.recheckClickable(this.csdHierarchy, pa, selected);
      this.recheckHierarchy();
      // var tempdata = this.getExportFiles(this.csdHierarchy);
      // for (var i = 0; i < tempdata.length; i++) {
      //   if (tempdata[i].children.length > 0) {
      //     tempdata[i].children.forEach((el) => this.$bus.$emit("associate-left", el.path, selected));
      //   }
      // }
      // if (paths.length > 0) {
      //   var roots = [];
      //   for (var j = 0; j < paths.length; j++) {
      //     roots.push(this.findRoot(paths[j].id));
      //   }
      //   for (var i = 0; i < roots.length; i++) {
      //     this.recheckHierarchy(this.csdTable[this.csdMapping[roots[i]]].path);
      //   }
      //   // var allparent = [];
      //   // for (var j = 0; j < paths.length; j++) {
      //   //   allparent = allparent.concat(this.getAllParent(paths[j].id));
      //   // }
      //   // for (var i = 0; i < allparent.length; i++) {
      //   //   this.checkparentHierarchy(this.csdHierarchy, this.csdTable[this.csdMapping[allparent[i]]].path);
      //   // }
      // }
    });
    this.$bus.$on("recheck-LR", () => {
      this.recheckHierarchy();
      this.recheckClickable(this.csdHierarchy);
    });

    this.$bus.$on("add-right", (el) => {
      this.scrollRight.push(el);
      // console.log("right: " + this.scrollRight.length);
    });
    this.$bus.$on("add-left", (el) => {
      this.scrollLeft.push(el);
      // console.log("left: " + this.scrollLeft.length);
      // console.log(this.scrollLeft);
    });
    this.$bus.$on("scroll-right", () => {
      // console.log("left: " + this.indexRight);
      if (this.scrollRight.length > 0) {
        this.scrollRight[this.indexRight].scrollIntoView({ behavior: "smooth", block: "center" });
        if (this.scrollRight.length > this.indexRight + 1) {
          this.indexRight++;
        } else {
          this.indexRight = 0;
        }
      }
      // console.log("right: " + this.scrollRight.length);
    });
    this.$bus.$on("scroll-left", () => {
      // console.log("left: " + this.indexLeft);
      if (this.scrollLeft.length > 0) {
        this.scrollLeft[this.indexLeft].scrollIntoView({ behavior: "smooth", block: "center" });
        if (this.scrollLeft.length > this.indexLeft + 1) {
          this.indexLeft++;
        } else {
          this.indexLeft = 0;
        }
      }
    });
    this.$bus.$on("reset-right", () => {
      // console.log("resetright");
      this.scrollRight = [];
      this.indexRight = 0;
    });
    this.$bus.$on("reset-left", () => {
      // console.log("resetleft");
      this.scrollLeft = [];
      this.indexLeft = 0;
    });
    this.$bus.$on("export-end", () => {
      this.$el.querySelector("#block").style.display = "none";
      if (this.openFolder) {
        window.registerFuncs.openFolder(this.desPath);
        // console.log("open");
        // require("electron").openPath(this.desPath);
      }
    });
  },
  beforeDestroy() {
    this.$bus.$off("recheck-file");
    this.$bus.$off("add-right");
    this.$bus.$off("add-left");
    this.$bus.$off("scroll-right");
    this.$bus.$off("scroll-left");
    this.$bus.$off("reset-right");
    this.$bus.$off("reset-left");
    this.$bus.$off("recheck-LR");
    this.$bus.$off("export-end");
  },
};
</script>
