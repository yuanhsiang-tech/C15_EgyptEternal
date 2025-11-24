process.env.VUE_APP_VERSION = require("./package.json").version;
module.exports = {
  // pages: {
  //   page1: {
  //     entry: "./src/page1/main.js",
  //     template: "public/index.html",
  //     title: "page1",
  //     chunk: ["chunk-vender", "chunk-common", "page1"],
  //   },
  //   page2: {
  //     entry: "./src/page2/main.js",
  //     template: "public/import.html",
  //     title: "page2",
  //     chunk: ["chunk-vender", "chunk-common", "page2"],
  //   },
  //   // page3: {
  //   //   entry: "./src/page1/main.js",
  //   //   template: "public/index.html",
  //   //   title: "page1",
  //   //   chunk: ["chunk-vender", "chunk-common", "page1"],
  //   // },
  // },

  transpileDependencies: ["vuetify"],
  pluginOptions: {
    electronBuilder: {
      preload: "src/preload.js",
      builderOptions: {
        productName: 'CocosStudio資源工具'
      }
      // Or, for multiple preload files:
      // preload: { preload: 'src/preload.js', otherPreload: 'src/preload2.js' }
      // builderOptions: {
      //   productName: "CocosStudio Resource Tool",
      //   appId: 'studioresourcetool.com',
      //   win: {
      //     "target": [
      //       "nsis"
      //     ],
      //     icon: 'public/svg.png',
      //     "requestedExecutionLevel": "requireAdministrator"
      //   },
      //   "nsis": {
      //     "installerIcon": "public/favicon.ico",
      //     "uninstallerIcon": "public/favicon.ico",
      //     "uninstallDisplayName": "CPU Monitor",
      //     "license": "license.txt",
      //     "oneClick": false,
      //     "allowToChangeInstallationDirectory": true
      //   }
      // },
    },
  },
};
