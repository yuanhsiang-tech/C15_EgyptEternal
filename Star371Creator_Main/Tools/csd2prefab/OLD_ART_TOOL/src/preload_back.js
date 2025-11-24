// preload.js ,
const processlist = require("node-processlist");
// const processlist = require("process-list");
// const find = require("find-process");
const ps = require("ps-node");
const fs = require("fs-extra");
const path = require("path");
const { remote } = require("electron");
// const { shell } = require("electron");
// const { ipcRenderer } = require("electron");
// window.ipcRenderer = ipcRenderer;
const xmlBuilder = require("xmlbuilder2");
const sizeOf = require("image-size");
const eu_to_qua = require("euler-to-quaternion");
const bling = require("bling-hashes-js");
let JSZip = require("jszip");
const { readlink } = require("fs");
const { type } = require("os");
let zip;
let scale9Table = {};
let uuidTable = {};
let fileTable = {};
let actiontagTable = {};
// const zl = require("zip-lib");
// const { existsSync } = require("fs");
// const { first } = require("lodash");
// const { x } = require("bowser");
// const { ipcRenderer } = require("electron");
// window.ipcRenderer = ipcRenderer;
// const dirTree = require("directory-tree");
// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.

// const { contextBridge, ipcRenderer } = require("electron");
// const validChannels = ["READ_FILE", "WRITE_FILE"];
// contextBridge.exposeInMainWorld("ipc", {
//   send: (channel, data) => {
//     if (validChannels.includes(channel)) {
//       ipcRenderer.send(channel, data);
//     }
//   },
//   on: (channel, func) => {
//     if (validChannels.includes(channel)) {
//       // Strip event as it includes `sender` and is a security risk
//       ipcRenderer.on(channel, (event, ...args) => func(...args));
//     }
//   },
// });
Number.prototype.zeroPad =
  Number.prototype.zeroPad ||
  function (base) {
    var nr = this,
      len = String(base).length - String(nr).length + 1;
    return len > 0 ? new Array(len).join("0") + nr : nr;
  };

function defaultNumber(number, def) {
  // console.log(number, def);
  if (typeof number === "number" && number != undefined && number != null && number != NaN) {
    // console.log(number);
    return number;
  }
  return def;
}

function cleanEmptyFoldersRecursively(folder) {
  var isDir = fs.statSync(folder).isDirectory();
  if (!isDir) {
    return;
  }
  var files = fs.readdirSync(folder);
  if (files.length > 0) {
    files.forEach(function (file) {
      var fullPath = path.join(folder, file);
      cleanEmptyFoldersRecursively(fullPath);
    });
    files = fs.readdirSync(folder);
  }

  if (files.length == 0) {
    // console.log("removing: ", folder);
    fs.rmdirSync(folder);
    return;
  }
}

function RemoveUnusedNode(header, startnode) {
  var temppath = path.join(header, startnode.getAttribute("Name"));
  if (fs.existsSync(temppath) && fs.lstatSync(temppath).isDirectory() && startnode.children.length > 0) {
    Array.from(startnode.children).forEach((node) => {
      RemoveUnusedNode(temppath, node);
    });
  }
  if (!fs.existsSync(temppath)) {
    startnode.parentNode.removeChild(startnode);
  } else if (fs.existsSync(temppath) && fs.lstatSync(temppath).isDirectory() && startnode.children.length == 0) {
    fs.removeSync(temppath); //移除資料夾
    startnode.parentNode.removeChild(startnode);
  }
}

async function processExist(pid, projname) {
  var processinfo = await processlist.getProcessById(pid, { verbose: true });
  // console.log(projname, pid, processinfo.windowTitle);
  var title = processinfo.windowTitle;
  if (title.includes(projname)) {
    return true;
  } else {
    return false;
  }
}

function checkZipDupName(_name, _ext, _folder) {
  //偵測資料夾內是否有重複檔案名
  let index = 1;
  let finalname = _name;
  // let p = _folder + "/" + finalname;
  function checkName(newname) {
    var check = false;
    zip.folder(_folder).forEach(function (relativePath, file) {
      // Editor.log(newname, file.name);
      if (newname.localeCompare(path.parse(file.name).base, undefined, { sensitivity: "base" }) == 0) {
        check = true;
      }
    });
    return check;
  }
  while (checkName(finalname + _ext) == true) {
    finalname = _name + "_" + index.zeroPad(10);
    p = _folder + "/" + finalname + _ext;
    index++;
  }
  return finalname;
}

function getObjUniqueName(obj, newhead, pa) {
  var filename = path.parse(pa).name;
  var newname = filename;
  var fileext = path.parse(pa).ext;
  var index = 1;
  var newpath = newhead + newname + fileext;
  while (Object.values(obj).indexOf(newpath) > -1) {
    newname = filename + "_" + index.toString().padStart(2, "0");
    newpath = newhead + newname + fileext;
    index++;
  }
  return newname + fileext;
}

function getFolderUniqueName(folder, file) {
  var filename = path.parse(file).name;
  var fileext = path.parse(file).ext;
  var newname = filename;
  var index = 1;
  var newpath = path.join(folder, newname + fileext);
  while (fs.existsSync(newpath)) {
    newname = filename + "_" + index.toString().padStart(2, "0");
    newpath = path.join(folder, newname + fileext);
    index++;
  }
  return newname + fileext;
}

function getUniqueDirectory(dir, oldname) {
  // var filename = path.parse(oldname).name;
  var newname = oldname;
  // var fileext = path.parse(oldname).ext;
  var index = 1;
  // var newpath = path.join(dir, newname);
  // var newname = newname + fileext;
  while (fs.readdirSync(dir).some((name) => path.parse(name).ext == "" && path.parse(name).name == newname)) {
    newname = oldname + "_" + index.toString().padStart(2, "0");
    index++;
  }
  // while (Object.values(obj).indexOf(newpath) > -1) {
  //   newname = filename + "_" + index.toString().padStart(2, "0");
  //   newpath = header + newname + fileext;
  //   index++;
  // }
  return newname;
}

function getPrefabNodeData(nodedata, datatype) {
  var data = [];
  switch (datatype) {
    case "Position":
      if (nodedata._trs) {
        data = [nodedata._trs.array[0], nodedata._trs.array[1]]
      }
      else if (nodedata._position) {
        data = [nodedata._position.x, nodedata._position.y];
      }
      else {
        data = [0, 0];
      }
      break;
    case "Scale":
      if (nodedata._trs) {
        data = [nodedata._trs.array[7], nodedata._trs.array[8]]
      }
      else {
        data = [1, 1];
        if (nodedata._scaleX) {
          data[0] = nodedata._scaleX;
        }
        if (nodedata._scaleY) {
          data[1] = nodedata._scaleY;
        }
      }
      break;
    case "Rotation":
      data = [0];
      if (nodedata._eulerAngles) {
        data[0] = nodedata._eulerAngles.z;
      }
      else if (nodedata._rotationX) {
        data[0] = nodedata._rotationX;
      }
      break;
  }
  return data;
}
// function getImgMeta(url) {
//   var img = new Image();
//   img.onload = function() {
//     return this;
//   };
//   img.src = url;
// }

// function skewtoEular(x, y) {
//   var rotation = { x: 0, y: 0, z: 0 };
//   return rotation;
// }

// function skewtoQuaternion(x, y) {
//   var rotation = { x: 0, y: 0, z: 0, w: 1 };
//   return rotation;
// }

function testLoop() {
  var arr = [1, 2, 3, 4, 5];
  var arr2 = ["a", "b", "c"];
  arr.forEach((element, index) => {
    arr.splice(index + 1, 0, "a");
  });
  // for (var i = 0; i < arr.length; i++) {
  //   if (i > 0) {
  //     arr.splice(i - 1, 0, "a");
  //   }
  // }
  console.log(arr);
}

function patchFrame(timelines, animations) {
  const closestIndex = (num, arr) => {
    let curr = parseFloat(arr[0].getAttribute("FrameIndex")),
      diff = Math.abs(num - curr);
    let index = 0;
    for (let val = 0; val < arr.length; val++) {
      let newdiff = Math.abs(num - parseFloat(arr[val].getAttribute("FrameIndex")));
      if (newdiff < diff) {
        diff = newdiff;
        curr = parseFloat(arr[val].getAttribute("FrameIndex"));
        index = val;
      }
    }
    return index;
  };
  // var xmlString = "<root></root>";
  // var parser = new DOMParser();
  // var xmlDoc = parser.parseFromString(xmlString, "text/xml");
  // var fakedata = xmlDoc.createElement("AnimationInfo");
  var newtimelines = [...timelines];
  var keyindex = [];
  for (var i = 0; i < animations.length; i++) {
    keyindex.push(parseFloat(animations[i].getAttribute("StartIndex")), parseFloat(animations[i].getAttribute("EndIndex")));
  }
  keyindex = [...new Set(keyindex)];
  for (var j = 0; j < keyindex.length; j++) {
    for (var i = 0; i < newtimelines.length; i++) {
      var frames = Array.from(newtimelines[i].children);
      var closest = closestIndex(keyindex[j], frames);
      // if (closest >= frames.length) {
      //   console.log(frames.length, closest);
      // }
      if (parseFloat(frames[closest].getAttribute("FrameIndex")) != keyindex[j]) {
        var insert = parseFloat(frames[closest].getAttribute("FrameIndex")) > keyindex[j] ? closest : closest + 1;
        // console.log(closest, insert);
        var nodedata = frames[closest].cloneNode(true);
        var nextdata = parseFloat(frames[closest].getAttribute("FrameIndex")) > keyindex[j] ? frames[closest - 1] : frames[closest + 1];

        // console.log(newtimelines[i].getAttribute("ActionTag"), nodedata);
        if (nextdata) {
          // console.log(nodedata.getAttribute("FrameIndex"), keyindex[j], nextdata.getAttribute("FrameIndex"));
          switch (nodedata.tagName) {
            case "PointFrame":
            case "ScaleFrame":
              var index1 = parseFloat(nodedata.getAttribute("FrameIndex"));
              var index2 = parseFloat(nextdata.getAttribute("FrameIndex"));
              var x1 = parseFloat(nodedata.getAttribute("X"));
              var y1 = parseFloat(nodedata.getAttribute("Y"));
              var x2 = parseFloat(nextdata.getAttribute("X"));
              var y2 = parseFloat(nextdata.getAttribute("Y"));
              var newx = x1 + ((x2 - x1) / (index2 - index1)) * (keyindex[j] - index1);
              var newy = y1 + ((y2 - y1) / (index2 - index1)) * (keyindex[j] - index1);
              nodedata.setAttribute("X", newx);
              nodedata.setAttribute("Y", newy);
              // console.log(index1, keyindex[j], index2);
              break;
            case "IntFrame":
              var index1 = parseFloat(nodedata.getAttribute("FrameIndex"));
              var index2 = parseFloat(nextdata.getAttribute("FrameIndex"));
              var value1 = parseFloat(nodedata.getAttribute("Value"));
              var value2 = parseFloat(nextdata.getAttribute("Value"));
              var newvalue = value1 + ((value2 - value1) / (index2 - index1)) * (keyindex[j] - index1);
              nodedata.setAttribute("Value", newvalue);
              // console.log(index1, keyindex[j], index2);
              break;
            case "BoolFrame":
              var index1 = parseFloat(nodedata.getAttribute("FrameIndex"));
              var index2 = parseFloat(nextdata.getAttribute("FrameIndex"));
              var value1 = nodedata.getAttribute("Value");
              var value2 = nextdata.getAttribute("Value");
              var newvalue = index2 > index1 ? value1 : value2;
              nodedata.setAttribute("Value", newvalue);
              break;
          }
        }
        nodedata.setAttribute("FrameIndex", keyindex[j]);
        newtimelines[i].insertBefore(nodedata, frames[insert]);
        // newtimelines[i].splice(insert, 0, nodedata);
      }
    }
  }
  return newtimelines;
}

function createCCMeta(header, filepath, newname) {
  var obj = {};
  var type = path.parse(filepath).ext;
  // var name = path.parse(filepath).name;
  var mainuuid = generateUUID();
  if (uuidTable[filepath]) {
    mainuuid = uuidTable[filepath];
    // console.log("check3", mainuuid);
  } else {
    uuidTable[filepath] = mainuuid;
  }
  switch (type) {
    case ".png":
    case ".jpg":
      var scale9Data = [0, 0, 0, 0];
      if (scale9Table[filepath]) {
        scale9Data = scale9Table[filepath];
      }
      var imgMeta = sizeOf(path.join(header, filepath));
      var subuuid = generateUUID();
      obj = {
        ver: "2.3.3",
        uuid: subuuid,
        type: "sprite",
        wrapMode: "clamp",
        filterMode: "bilinear",
        premultiplyAlpha: false,
        genMipmaps: false,
        packable: true,
        platformSettings: {},
        subMetas: {},
      };
      obj.subMetas[newname] = {
        ver: "1.0.4",
        uuid: mainuuid,
        rawTextureUuid: subuuid,
        trimType: "auto",
        trimThreshold: 1,
        rotated: false,
        offsetX: 0,
        offsetY: 0,
        trimX: 0,
        trimY: 0,
        width: imgMeta.width,
        height: imgMeta.height,
        rawWidth: imgMeta.width,
        rawHeight: imgMeta.height,
        borderTop: scale9Data[0],
        borderBottom: scale9Data[1],
        borderLeft: scale9Data[2],
        borderRight: scale9Data[3],
        subMetas: {},
      };
      break;
    case ".fnt":
      var oldpath = path.join(header, filepath);
      var fntfile = fs.readFileSync(oldpath, "utf-8");
      var reg = /(?<=(file=")).*(?=")/;
      var reg2 = /(?:size=)(.*)/;
      var pngname = fntfile.match(reg)[0];
      var fontsize = parseInt(fntfile.match(reg2)[1]);
      var subuuid;
      if (pngname) {
        var pngpath = path.join(path.dirname(oldpath), pngname);
        if (fs.existsSync(pngpath)) {
          var p = path.join(path.dirname(filepath), pngname);
          var metafile = createCCMeta(header, p, path.parse(pngname).name);
          subuuid = metafile.uuid;
          uuidTable[p] = subuuid;
          zip.folder("ArtTemp/Fnt").file(pngname, fs.readFileSync(pngpath));
          zip.folder("ArtTemp/Fnt").file(pngname + ".meta", JSON.stringify(metafile, null, 2));
        }
      }
      obj = {
        ver: "2.1.2",
        uuid: mainuuid,
        importer: "bitmap-font",
        textureUuid: subuuid,
        fontSize: fontsize,
        subMetas: {},
      };
      break;
    case ".csd":
      obj = {
        ver: "1.2.5",
        uuid: mainuuid,
        optimizationPolicy: "AUTO",
        asyncLoadAssets: false,
        readonly: false,
        subMetas: {},
      };
      break;
    case ".plist":
      //已在全檔案中實做，這邊預備使用
      // var oldpath = path.join(header, filepath);
      // var plisttext = fs.readFileSync(oldpath, "utf-8");
      // var xmlPlist = parser.parseFromString(plisttext, "text/xml");
      // var plistEles = xmlPlist.getElementsByTagName("*");
      // for (var x = 0; x < plistEles.length; x++) {
      //   if (plistEles[x].childNodes[0] && plistEles[x].childNodes[0].nodeValue == "textureFileName") {
      //     if (!plistEles[x + 2] || (plistEles[x + 3] && !plistEles[x + 3].childNodes[0])) {
      //       var pngname = plistEles[x + 1].childNodes[0].nodeValue;
      //       var pngnowpath = path.join(path.dirname(oldpath), pngname);
      //       // var pngnewpath = path.join(path.dirname(newpath), pngname);
      //       if (fs.existsSync(pngnowpath)) {
      //         var p = path.join(path.dirname(allFiles[i]), pngname);
      //         var pngmeta = createCCMeta(header, p,pngname, uuidTable);
      //         zip.folder("ArtTemp/Particle").file(pngname, fs.readFileSync(pngnowpath));
      //         zip.folder("ArtTemp/Particle").file(pngname + ".meta", JSON.stringify(pngmeta, null, 2));
      //         // fs.copySync(pngnowpath, pngnewpath);
      //       }
      //     }
      //   }
      // }
      obj = {
        ver: "2.0.3",
        uuid: mainuuid,
        importer: "particle",
        subMetas: {},
      };
      break;
    case ".anim":
      obj = {
        ver: "2.1.2",
        uuid: mainuuid,
        importer: "animation-clip",
        subMetas: {},
      };
      break;
  }
  return obj;
}

function createCCObject(type) {
  var obj = {}; //__id__泛該物件位於陣列中位置
  switch (type) {
    case "cc.Prefab":
      obj = {
        __type__: "cc.Prefab",
        _name: "",
        _objFlags: 0,
        _native: "",
        data: {
          __id__: 1, //Prefab資料開始的 array index（※待查證）
        },
        optimizationPolicy: 0,
        asyncLoadAssets: false,
        readonly: false,
      };
      break;
    case "cc.Node":
      obj = {
        __type__: "cc.Node",
        _name: "Node",
        _objFlags: 0,
        _parent: null, //父節點 array index {__id__:}
        _children: [], //子節點 array index {__id__:}
        _active: true,
        _components: [], //掛在這個節點下的組件 array index {__id__:}
        _prefab: {
          __id__: 2, //PrefabInfo所在 array index（※重要資訊，宣告後必須修改，否則會產生重大錯誤）
        },
        _opacity: 255,
        _color: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        _contentSize: {
          __type__: "cc.Size",
          width: 0,
          height: 0,
        },
        _anchorPoint: {
          __type__: "cc.Vec2",
          x: 0.5,
          y: 0.5,
        },
        _trs: {
          __type__: "TypedArray",
          ctor: "Float64Array",
          array: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
        },
        _eulerAngles: {
          __type__: "cc.Vec3",
          x: 0,
          y: 0,
          z: 0,
        },
        _skewX: 0,
        _skewY: 0,
        _is3DNode: false,
        _groupIndex: 0,
        groupIndex: 0,
        _id: "",
      };
      break;
    case "cc.Color":
      obj = {
        __type__: "cc.Color",
        r: 255,
        g: 255,
        b: 255,
        a: 255,
      };
      break;
    case "cc.Size":
      obj = {
        __type__: "cc.Size",
        width: 0,
        height: 0,
      };
      break;
    case "cc.Vec2":
      obj = {
        __type__: "cc.Vec2",
        x: 0,
        y: 0,
      };
      break;
    case "cc.Vec3":
      obj = {
        __type__: "cc.Vec3",
        x: 0,
        y: 0,
        z: 0,
      };
      break;
    case "cc.PrefabInfo":
      obj = {
        __type__: "cc.PrefabInfo",
        root: {
          __id__: 1,
        },
        asset: {
          __id__: 0,
        },
        fileId: "", //暫時沒用處，可以不用修改
        sync: false,
      };
      break;
    case "cc.Button": //組件
      obj = {
        __type__: "cc.Button",
        _name: "",
        _objFlags: 0,
        node: {
          __id__: 1, //所在節點的 array index（※重要資訊，宣告後必須修改，否則會產生重大錯誤）
        },
        _enabled: true,
        _normalMaterial: null,
        _grayMaterial: null,
        duration: 0.1,
        zoomScale: 1.2,
        clickEvents: [],
        _N$interactable: true,
        _N$enableAutoGrayEffect: false,
        _N$transition: 2,
        transition: 2,
        _N$normalColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        _N$pressedColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        pressedColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        _N$hoverColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        hoverColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        _N$disabledColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        _N$normalSprite: {},
        _N$pressedSprite: {},
        pressedSprite: {},
        _N$hoverSprite: {},
        hoverSprite: {},
        _N$disabledSprite: {},
        _N$target: null,
        _id: "",
      };
      break;
    case "cc.Sprite":
      obj = {
        __type__: "cc.Sprite",
        _name: "",
        _objFlags: 0,
        node: {
          __id__: 1, //所屬節點編號（※重要資訊，宣告後必須修改，否則會產生重大錯誤）
        },
        _enabled: true,
        _materials: [],
        _srcBlendFactor: 770,
        _dstBlendFactor: 771,
        _spriteFrame: null,
        _type: 0,
        _sizeMode: 0,
        _fillType: 0,
        _fillCenter: {
          __type__: "cc.Vec2",
          x: 0,
          y: 0,
        },
        _fillStart: 0,
        _fillRange: 0,
        _isTrimmedMode: false,
        _atlas: null,
        _id: "",
      };
      break;
    case "cc.Animation":
      obj = {
        __type__: "cc.Animation",
        _name: "",
        _objFlags: 0,
        node: {
          __id__: 1, //（※重要資訊，宣告後必須修改，否則會產生重大錯誤）
        },
        _enabled: true,
        _defaultClip: null,
        _clips: [],
        playOnLoad: false,
        _id: "",
      };
      break;
    case "cc.AnimationClip":
      obj = {
        __type__: "cc.AnimationClip",
        _name: "",
        _objFlags: 0,
        _native: "",
        _duration: 0,
        sample: 60,
        speed: 1,
        wrapMode: 2,
        curveData: {},
        events: [],
      };
      break;
    case "cc.Mask":
      obj = {
        __type__: "cc.Mask",
        _name: "",
        _objFlags: 0,
        node: {
          __id__: 1, //※重要資訊，宣告後必須修改，否則會產生重大錯誤
        },
        _enabled: true,
        _materials: [],
        _spriteFrame: null,
        _type: 0,
        _segments: 64,
        _N$alphaThreshold: 0.1,
        _N$inverted: false,
        _id: "",
      };
      break;
    case "cc.Label":
      obj = {
        __type__: "cc.Label",
        _name: "",
        _objFlags: 0,
        node: {
          __id__: 1, //（※重要資訊，宣告後必須修改，否則會產生重大錯誤）
        },
        _enabled: true,
        _materials: [],
        _srcBlendFactor: 770,
        _dstBlendFactor: 771,
        _string: "",
        _N$string: "",
        _fontSize: 14,
        _lineHeight: 40,
        _enableWrapText: true,
        _N$file: null,
        _isSystemFontUsed: true,
        _spacingX: 0,
        _batchAsBitmap: false,
        _styleFlags: 0,
        _underlineHeight: 0,
        _N$horizontalAlign: 0,
        _N$verticalAlign: 0,
        _N$fontFamily: "Arial",
        _N$overflow: 0,
        _N$cacheMode: 0,
        _id: "",
      };
      break;
    case "cc.ParticleSystem":
      obj = {
        __type__: "cc.ParticleSystem",
        _name: "",
        _objFlags: 0,
        node: {
          __id__: 2,
        },
        _enabled: true,
        _materials: [],
        _srcBlendFactor: 770,
        _dstBlendFactor: 771,
        _custom: false,
        _file: null,
        _spriteFrame: null,
        _texture: null,
        _stopped: true,
        playOnLoad: true,
        autoRemoveOnFinish: false,
        totalParticles: 150,
        duration: -1,
        emissionRate: 10,
        life: 1,
        lifeVar: 0,
        _startColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 255,
        },
        _startColorVar: {
          __type__: "cc.Color",
          r: 0,
          g: 0,
          b: 0,
          a: 0,
        },
        _endColor: {
          __type__: "cc.Color",
          r: 255,
          g: 255,
          b: 255,
          a: 0,
        },
        _endColorVar: {
          __type__: "cc.Color",
          r: 0,
          g: 0,
          b: 0,
          a: 0,
        },
        angle: 90,
        angleVar: 20,
        startSize: 50,
        startSizeVar: 0,
        endSize: 0,
        endSizeVar: 0,
        startSpin: 0,
        startSpinVar: 0,
        endSpin: 0,
        endSpinVar: 0,
        sourcePos: {
          __type__: "cc.Vec2",
          x: 0,
          y: 0,
        },
        posVar: {
          __type__: "cc.Vec2",
          x: 0,
          y: 0,
        },
        _positionType: 0,
        positionType: 0,
        emitterMode: 0,
        gravity: {
          __type__: "cc.Vec2",
          x: 0,
          y: 0,
        },
        speed: 180,
        speedVar: 50,
        tangentialAccel: 80,
        tangentialAccelVar: 0,
        radialAccel: 0,
        radialAccelVar: 0,
        rotationIsDir: false,
        startRadius: 0,
        startRadiusVar: 0,
        endRadius: 0,
        endRadiusVar: 0,
        rotatePerS: 0,
        rotatePerSVar: 0,
        _N$preview: true,
        _id: "",
      };
      break;
  }
  return obj;
}

// async function generateCCStoPrefabFolder(desPath, xmlElement) {
//   if (xmlElement.tagName == "RootFolder") {
//     desPath = path.join(desPath, "ArtTemp");
//     if (!fs.existsSync(desPath)) {
//       await fs.promises.mkdir(desPath);
//     }
//   } else if (xmlElement.tagName == "Folder") {
//     desPath = path.join(desPath, xmlElement.getAttribute("Name"));
//     if (!fs.existsSync(desPath)) {
//       await fs.promises.mkdir(desPath);
//     }
//   }
//   if (xmlElement.children.length > 0) {
//     for (var i = 0; i < xmlElement.children.length; i++) {
//       await generateCCStoPrefabFolder(desPath, xmlElement.children[i]);
//     }
//   }
//   return;
// }

function createTagTable(entrynode, data) {
  var table = {};
  var pa = data.path;
  var c_offsetx = 0;
  var c_offsety = 0;
  if (entrynode.tagName == "AbstractNodeData") {
    var actiontag = entrynode.getAttribute("ActionTag");
    var children = Array.from(entrynode.children);
    if (children.some((el) => el.tagName == "Size")) {
      var size = children.find((el) => el.tagName == "Size");
      var anchor = children.find((el) => el.tagName == "AnchorPoint");
      var anchorX = anchor.getAttribute("ScaleX") ? parseFloat(anchor.getAttribute("ScaleX")) : 0;
      var anchorY = anchor.getAttribute("ScaleY") ? parseFloat(anchor.getAttribute("ScaleY")) : 0;
      var width = parseFloat(size.getAttribute("X"));
      var height = parseFloat(size.getAttribute("Y"));
      c_offsetx = width * anchorX;
      c_offsety = height * anchorY;
    }
    if (pa != "") {
      pa = pa + "/" + entrynode.getAttribute("Name");
    } else {
      pa = entrynode.getAttribute("Name");
    }
    table[actiontag] = { path: pa, offsetX: data.offsetX, offsetY: data.offsetY };
  }
  if (entrynode.getElementsByTagName("Children").length > 0) {
    var children = entrynode.getElementsByTagName("Children")[0].children;
    for (var i = 0; i < children.length; i++) {
      table = Object.assign(table, createTagTable(children[i], { path: pa, offsetX: c_offsetx, offsetY: c_offsety }));
    }
  }
  return table;
}

function createAnimTable(animnode, animlist, tagtable, prefabname) {
  var animtable = [];
  var timelines = Array.from(animnode.getElementsByTagName("Timeline"));
  if (timelines.length > 0) {
    var anims = [];
    if (animlist) {
      var anims = Array.from(animlist.getElementsByTagName("AnimationInfo"));
    }
    if (anims.length == 0) {
      var xmlString = "<root></root>";
      var parser = new DOMParser();
      var xmlDoc = parser.parseFromString(xmlString, "text/xml");
      var fakedata = xmlDoc.createElement("AnimationInfo");
      fakedata.setAttribute("Name", "animation0");
      fakedata.setAttribute("StartIndex", 0);
      fakedata.setAttribute("EndIndex", parseInt(animnode.getAttribute("Duration")));
      anims.push(fakedata);
    }
    timelines = patchFrame(timelines, anims); //補足缺少的頭尾幀數
    for (var i = 0; i < anims.length; i++) {
      var animdata = createCCObject("cc.AnimationClip");
      var startframe = parseInt(anims[i].getAttribute("StartIndex"));
      var endframe = parseInt(anims[i].getAttribute("EndIndex"));
      var offset = startframe;
      animdata._name = prefabname + "_" + anims[i].getAttribute("Name");
      animdata._duration = (endframe - startframe) / 60;
      animdata.speed = parseFloat(animnode.getAttribute("Speed"));
      animdata.curveData.paths = {};
      for (var j = 0; j < timelines.length; j++) {
        var actiontag = timelines[j].getAttribute("ActionTag");
        var filepath = tagtable[actiontag].path;
        var type = timelines[j].getAttribute("Property");
        if (!animdata.curveData.paths[filepath]) {
          animdata.curveData.paths[filepath] = {};
        }
        if (!animdata.curveData.paths[filepath]["props"]) {
          animdata.curveData.paths[filepath]["props"] = {};
        }
        switch (type) {
          case "Position":
            if (!animdata.curveData.paths[filepath]["props"]["position"]) {
              animdata.curveData.paths[filepath]["props"]["position"] = [];
            }
            var frames = Array.from(timelines[j].getElementsByTagName("PointFrame"));
            for (var k = 0; k < frames.length; k++) {
              var frameindex = frames[k].getAttribute("FrameIndex");
              var framedata = {
                frame: (parseFloat(frameindex) - offset) / 60,
                value: [parseFloat(frames[k].getAttribute("X")) - tagtable[actiontag].offsetX, parseFloat(frames[k].getAttribute("Y")) - tagtable[actiontag].offsetY, 0],
              };
              if (frameindex >= startframe && frameindex <= endframe) {
                animdata.curveData.paths[filepath]["props"]["position"].push(framedata);
              }
            }
            break;
          case "RotationSkew":
            if (!animdata.curveData.paths[filepath]["props"]["eulerAngles"]) {
              animdata.curveData.paths[filepath]["props"]["eulerAngles"] = [];
            }
            var frames = Array.from(timelines[j].getElementsByTagName("ScaleFrame"));
            for (var k = 0; k < frames.length; k++) {
              var frameindex = frames[k].getAttribute("FrameIndex");
              var framedata = {
                frame: (parseFloat(frameindex) - offset) / 60,
                value: {
                  __type__: "cc.Vec3",
                  x: 0,
                  y: 0,
                  z: -parseFloat(frames[k].getAttribute("X")),
                },
              };
              if (frameindex >= startframe && frameindex <= endframe) {
                animdata.curveData.paths[filepath]["props"]["eulerAngles"].push(framedata);
              }
            }
            break;
          case "Alpha":
            if (!animdata.curveData.paths[filepath]["props"]["opacity"]) {
              animdata.curveData.paths[filepath]["props"]["opacity"] = [];
            }
            var frames = Array.from(timelines[j].getElementsByTagName("IntFrame"));
            for (var k = 0; k < frames.length; k++) {
              var frameindex = frames[k].getAttribute("FrameIndex");
              var framedata = {
                frame: (parseFloat(frameindex) - offset) / 60,
                value: parseFloat(frames[k].getAttribute("Value")),
              };
              if (frameindex >= startframe && frameindex <= endframe) {
                animdata.curveData.paths[filepath]["props"]["opacity"].push(framedata);
              }
            }
            break;
          case "Scale":
            if (!animdata.curveData.paths[filepath]["props"]["scale"]) {
              animdata.curveData.paths[filepath]["props"]["scale"] = [];
            }
            var frames = Array.from(timelines[j].getElementsByTagName("ScaleFrame"));
            for (var k = 0; k < frames.length; k++) {
              var frameindex = frames[k].getAttribute("FrameIndex");
              var framedata = {
                frame: (parseFloat(frameindex) - offset) / 60,
                value: { __type__: "cc.Vec2", x: parseFloat(frames[k].getAttribute("X")), y: parseFloat(frames[k].getAttribute("Y")) },
              };
              if (frameindex >= startframe && frameindex <= endframe) {
                animdata.curveData.paths[filepath]["props"]["scale"].push(framedata);
              }
            }
            break;
          case "AnchorPoint":
            if (!animdata.curveData.paths[filepath]["props"]["anchorX"]) {
              animdata.curveData.paths[filepath]["props"]["anchorX"] = [];
            }
            if (!animdata.curveData.paths[filepath]["props"]["anchorY"]) {
              animdata.curveData.paths[filepath]["props"]["anchorY"] = [];
            }
            var frames = Array.from(timelines[j].getElementsByTagName("ScaleFrame"));
            for (var k = 0; k < frames.length; k++) {
              var frameindex = frames[k].getAttribute("FrameIndex");
              var framedata = {
                frame: (parseFloat(frameindex) - offset) / 60,
                value: parseFloat(frames[k].getAttribute("X")),
              };
              if (frameindex >= startframe && frameindex <= endframe) {
                animdata.curveData.paths[filepath]["props"]["anchorX"].push(framedata);
              }
              framedata = {
                frame: (parseFloat(frameindex) - offset) / 60,
                value: parseFloat(frames[k].getAttribute("Y")),
              };
              if (frameindex >= startframe && frameindex <= endframe) {
                animdata.curveData.paths[filepath]["props"]["anchorY"].push(framedata);
              }
            }
            break;
          case "VisibleForFrame":
            if (!animdata.curveData.paths[filepath]["props"]["active"]) {
              animdata.curveData.paths[filepath]["props"]["active"] = [];
            }
            var frames = Array.from(timelines[j].getElementsByTagName("BoolFrame"));
            for (var k = 0; k < frames.length; k++) {
              var frameindex = frames[k].getAttribute("FrameIndex");
              var framedata = {
                frame: (parseFloat(frameindex) - offset) / 60,
                value: frames[k].getAttribute("Value") == "True" ? true : false,
              };
              if (frameindex >= startframe && frameindex <= endframe) {
                animdata.curveData.paths[filepath]["props"]["active"].push(framedata);
              }
            }
            break;
          case "FileData": //序列動畫, 需輸出節點圖片
            if (!animdata.curveData.paths[filepath]["comps"]) {
              animdata.curveData.paths[filepath]["comps"] = {};
              animdata.curveData.paths[filepath]["comps"]["cc.Sprite"] = {};
              animdata.curveData.paths[filepath]["comps"]["cc.Sprite"]["spriteFrame"] = [];
            }
            var frames = Array.from(timelines[j].getElementsByTagName("TextureFrame"));
            for (var k = 0; k < frames.length; k++) {
              if (frames[k].getElementsByTagName("TextureFile").length > 0) {
                var frameindex = frames[k].getAttribute("FrameIndex");
                var framedata = {
                  frame: (parseFloat(frameindex) - offset) / 60,
                  value: {
                    __uuid__: frames[k].getElementsByTagName("TextureFile")[0].getAttribute("Path"),
                  },
                };
                if (frameindex >= startframe && frameindex <= endframe) {
                  animdata.curveData.paths[filepath]["comps"]["cc.Sprite"]["spriteFrame"].push(framedata);
                }
              }
            }
            break;
        }
      }
      animtable.push(animdata);
    }
  }
  return animtable;
}
function generateUUID() {
  var d = Date.now();
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    d += performance.now(); //use high-precision timer if available
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function setImgInAnim(data) {
  for (var key in data) {
    if (data[key] !== null && typeof data[key] == "object") {
      setImgInAnim(data[key]);
    } else if (data[key] != null && key === "__uuid__") {
      var pa = data.__uuid__;
      if (uuidTable[pa]) {
        data.__uuid__ = uuidTable[pa];
      } else {
        var uuid = generateUUID();
        data.__uuid__ = uuid;
        uuidTable[pa] = uuid;
      }
    }
  }
  return data;
}

function setPrefabUUID(nodelist) {
  for (var i = 0; i < nodelist.length; i++) {
    if (nodelist[i].__type__ == "cc.PrefabInfo" && nodelist[i].asset.__uuid__) {
      var path = nodelist[i].asset.__uuid__;
      if (!uuidTable[path]) {
        var uuid = generateUUID();
        uuidTable[path] = uuid;
        nodelist[i].asset = {};
        nodelist[i].asset.__uuid__ = uuid;
      } else {
        nodelist[i].asset = {};
        nodelist[i].asset.__uuid__ = uuidTable[path];
      }
      // console.log(nodelist[i].asset.__uuid__);
      // var metapath = path.join(header, path.parse(nodelist[i].asset.__uuid__).name + ".prefab.meta");
    } else if (nodelist[i].__type__ == "cc.Sprite" && nodelist[i]._spriteFrame !== null) {
      var path = nodelist[i]._spriteFrame.__uuid__;
      if (!uuidTable[path]) {
        var uuid = generateUUID();
        uuidTable[path] = uuid;
        nodelist[i]._spriteFrame.__uuid__ = uuid;
      } else {
        nodelist[i]._spriteFrame.__uuid__ = uuidTable[path];
        // console.log("check2", uuidTable[path]);
      }
    } else if (nodelist[i].__type__ == "cc.Label" && nodelist[i]._N$file !== null) {
      var path = nodelist[i]._N$file.__uuid__;
      if (!uuidTable[path]) {
        var uuid = generateUUID();
        uuidTable[path] = uuid;
        nodelist[i]._N$file.__uuid__ = uuid;
      } else {
        nodelist[i]._N$file.__uuid__ = uuidTable[path];
        // console.log("check2", uuidTable[path]);
      }
    } else if (nodelist[i].__type__ == "cc.ParticleSystem" && nodelist[i]._file !== null) {
      var path = nodelist[i]._file.__uuid__;
      if (!uuidTable[path]) {
        var uuid = generateUUID();
        uuidTable[path] = uuid;
        nodelist[i]._file.__uuid__ = uuid;
      } else {
        nodelist[i]._file.__uuid__ = uuidTable[path];
      }
      if (nodelist[i]._spriteFrame !== null) {
        path = nodelist[i]._spriteFrame.__uuid__;
        if (!uuidTable[path]) {
          uuid = generateUUID();
          uuidTable[path] = uuid;
          nodelist[i]._spriteFrame.__uuid__ = uuid;
        } else {
          nodelist[i]._spriteFrame.__uuid__ = uuidTable[path];
        }
      }
    }
  }
}

function walkthourghCSD(entrynode, parentindex, offset, animTable, parentsize, header) {
  var scale9Data = [];
  var scale9 = false;
  var embeded = false;
  var hascontent = false;
  var sizedata = [0, 0];
  var index = parentindex + offset + 1;
  var head = createCCObject("cc.Node");
  var children = Array.from(entrynode.children);
  head._opacity = entrynode.getAttribute("Alpha") ? parseFloat(entrynode.getAttribute("Alpha")) : 255;
  if (entrynode.getAttribute("VisibleForFrame")) {
    head._active = false;
  }
  if (children.find((el) => el.tagName == "CColor")) {
    var color = children.find((el) => el.tagName == "CColor");
    head._color.r = parseFloat(color.getAttribute("R"));
    head._color.g = parseFloat(color.getAttribute("G"));
    head._color.b = parseFloat(color.getAttribute("B"));
    head._color.a = parseFloat(color.getAttribute("A"));
  }
  if (children.find((el) => el.tagName == "AnchorPoint")) {
    var anchor = children.find((el) => el.tagName == "AnchorPoint");
    head._anchorPoint.x = anchor.getAttribute("ScaleX") ? parseFloat(anchor.getAttribute("ScaleX")) : 0;
    head._anchorPoint.y = anchor.getAttribute("ScaleY") ? parseFloat(anchor.getAttribute("ScaleY")) : 0;
  }
  if (children.find((el) => el.tagName == "Size")) {
    var size = children.find((el) => el.tagName == "Size");
    head._contentSize.width = parseFloat(size.getAttribute("X"));
    head._contentSize.height = parseFloat(size.getAttribute("Y"));
    // if (entrynode.getAttribute("ctype") == "SpriteObjectData" || entrynode.getAttribute("ctype") == "ImageViewObjectData") {
    sizedata = [head._contentSize.width * head._anchorPoint.x, head._contentSize.height * head._anchorPoint.y];
    // }
  }
  if (children.find((el) => el.tagName == "Position")) {
    var pos = children.find((el) => el.tagName == "Position");
    head._trs.array[0] = pos.getAttribute("X") ? parseFloat(pos.getAttribute("X")) : 0;
    head._trs.array[1] = pos.getAttribute("Y") ? parseFloat(pos.getAttribute("Y")) : 0;
    head._trs.array[0] -= parentsize[0];
    head._trs.array[1] -= parentsize[1];
  }
  if (children.find((el) => el.tagName == "Scale")) {
    var scale = children.find((el) => el.tagName == "Scale");
    head._trs.array[7] = parseFloat(scale.getAttribute("ScaleX"));
    head._trs.array[8] = parseFloat(scale.getAttribute("ScaleY"));
  }
  if (entrynode.getAttribute("RotationSkewX") || entrynode.getAttribute("RotationSkewY")) {
    var skewX = entrynode.getAttribute("RotationSkewX") ? entrynode.getAttribute("RotationSkewX") : 0;
    // var skewY = entrynode.getAttribute("RotationSkewY") ? entrynode.getAttribute("RotationSkewY") : 0;
    head._eulerAngles.z = -skewX;
    var rotation = eu_to_qua([0, 0, -skewX]);
    head._trs.array[3] = rotation[0];
    head._trs.array[4] = rotation[1];
    head._trs.array[5] = rotation[2];
    head._trs.array[6] = rotation[3];
  }
  if (entrynode.getAttribute("Scale9Enable") && entrynode.getAttribute("Scale9Enable") == "True") {
    scale9 = true;
    scale9Data = [
      entrynode.getAttribute("TopEage") == null ? 0 : parseInt(entrynode.getAttribute("TopEage")),
      entrynode.getAttribute("BottomEage") == null ? 0 : parseInt(entrynode.getAttribute("BottomEage")),
      entrynode.getAttribute("LeftEage") == null ? 0 : parseInt(entrynode.getAttribute("LeftEage")),
      entrynode.getAttribute("RightEage") == null ? 0 : parseInt(entrynode.getAttribute("RightEage")),
    ];
  }
  var childlist = [];
  var componentlist = [];
  var info = createCCObject("cc.PrefabInfo");
  //檢查並增加組件
  if (entrynode.getAttribute("ctype")) {
    var type = entrynode.getAttribute("ctype");
    switch (type) {
      case "SpriteObjectData":
      case "ImageViewObjectData":
      case "ButtonObjectData":
      case "PanelObjectData":
        // console.log(entrynode.getAttribute("ClipAble"));
        if (entrynode.getAttribute("ClipAble") == "True") {
          var mask = createCCObject("cc.Mask");
          mask.node.__id__ = index;
          componentlist.push(mask);
        } else {
          if (entrynode.getAttribute("FlipX") && entrynode.getAttribute("FlipX") == "True") {
            head._trs.array[7] *= -1;
            if (type == "SpriteObjectData") {
              head._anchorPoint.x = 1 - head._anchorPoint.x;
            }
          }
          if (entrynode.getAttribute("FlipY") && entrynode.getAttribute("FlipY") == "True") {
            head._trs.array[8] *= -1;
            if (type == "SpriteObjectData") {
              head._anchorPoint.y = 1 - head._anchorPoint.y;
            }
          }
          var sprite = createCCObject("cc.Sprite");
          sprite.node.__id__ = index;
          if (type == "SpriteObjectData") {
            sprite._sizeMode = 2;
          }
          if (scale9 == true) {
            sprite._type = 1;
          }
          var datatext = "FileData";
          if (type == "ButtonObjectData") {
            datatext = "NormalFileData";
          }
          var filedata = children.find((el) => el.tagName == datatext);
          if (filedata && filedata.getAttribute("Type") != "Default") {
            sprite._spriteFrame = {};
            sprite._spriteFrame.__uuid__ = filedata.getAttribute("Path");
            if (scale9) {
              scale9Table[sprite._spriteFrame.__uuid__] = scale9Data;
            }
          }
          var blendfactor = children.find((el) => el.tagName == "BlendFunc");
          if (blendfactor) {
            // sprite._srcBlendFactor = blendfactor.getAttribute("Src");
            sprite._dstBlendFactor = parseInt(blendfactor.getAttribute("Dst"));
          }

          componentlist.push(sprite);
        }
        break;
      case "ProjectNodeObjectData": //內嵌csd
        var filedata = children.find((el) => el.tagName == "FileData");
        if (filedata) {
          embeded = true;
        }
        break;
      case "TextObjectData":
      case "TextBMFontObjectData":
        var label = createCCObject("cc.Label");
        label.node.__id__ = index;
        var text = entrynode.getAttribute("LabelText");
        label._string = text;
        label._N$string = text;
        if (entrynode.getAttribute("HorizontalAlignmentType")) {
          var ht = entrynode.getAttribute("HorizontalAlignmentType");
          if (ht == "HT_Center") {
            label._N$horizontalAlign = 1;
          } else if (ht == "HT_Right") {
            label._N$horizontalAlign = 2;
          }
        }
        if (entrynode.getAttribute("VerticalAlignmentType")) {
          var vt = entrynode.getAttribute("VerticalAlignmentType");
          if (vt == "VT_Center") {
            label._N$verticalAlign = 1;
          } else if (ht == "VT_Bottom") {
            label._N$verticalAlign = 2;
          }
        }
        if (type == "TextBMFontObjectData") {
          var filedata = children.find((el) => el.tagName == "LabelBMFontFile_CNB");
          if (filedata) {
            label._isSystemFontUsed = false;
            label._N$file = {};
            label._N$file["__uuid__"] = filedata.getAttribute("Path");
            var oldpath = path.join(header, filedata.getAttribute("Path"));
            var fntfile = fs.readFileSync(oldpath, "utf-8");
            var reg = /(?:size=)(.*)/;
            label._fontSize = parseInt(fntfile.match(reg)[1]);
          }
        } else {
          label._fontSize = entrynode.getAttribute("FontSize");
        }
        componentlist.push(label);
        break;
      case "ParticleObjectData":
        var particle = createCCObject("cc.ParticleSystem");
        var filedata = children.find((el) => el.tagName == "FileData");
        if (filedata) {
          var filepath = filedata.getAttribute("Path");
          var blendfactor = children.find((el) => el.tagName == "BlendFunc");
          particle.node.__id__ = index;
          particle._file = {};
          particle._file["__uuid__"] = filepath;
          particle._dstBlendFactor = parseInt(blendfactor.getAttribute("Dst"));
          var parser = new DOMParser();
          var oldpath = path.join(header, filepath);
          var plisttext = fs.readFileSync(oldpath, "utf-8");
          var xmlPlist = parser.parseFromString(plisttext, "text/xml");
          var plistEles = xmlPlist.getElementsByTagName("*");
          for (var x = 0; x < plistEles.length; x++) {
            if (plistEles[x].childNodes[0] && plistEles[x].childNodes[0].nodeValue == "textureFileName") {
              if (!plistEles[x + 2] || (plistEles[x + 3] && !plistEles[x + 3].childNodes[0])) {
                var pngname = plistEles[x + 1].childNodes[0].nodeValue;
                var pngnowpath = path.join(path.dirname(oldpath), pngname);
                if (fs.existsSync(pngnowpath)) {
                  particle._spriteFrame = {};
                  particle._spriteFrame["__uuid__"] = path.join(path.dirname(filepath), pngname);
                }
              }
            }
          }
        }
        componentlist.push(particle);
        break;
      case "ScrollViewObjectData":
        hascontent = true;
        if (entrynode.getAttribute("ClipAble") == "True") {
          var mask = createCCObject("cc.Mask");
          mask.node.__id__ = index;
          componentlist.push(mask);
        }
        break;
    }
  }
  if (parentindex == 0 && animTable.length > 0) {
    var animtion = createCCObject("cc.Animation");
    animtion.node.__id__ = index;
    for (var i = 0; i < animTable.length; i++) {
      var animpath = path.join("ArtTemp", "Animation", animTable[i]._name + ".anim");
      var uuid = generateUUID();
      // var filepath = path.join(desheader, animpath);
      var animdata = setImgInAnim(animTable[i]);
      if (uuidTable[animpath]) {
        uuid = uuidTable[animpath];
      } else {
        uuidTable[animpath] = uuid;
        var metafile = createCCMeta(header, animpath, animTable[i]._name);
        zip.folder("ArtTemp/Animation").file(animTable[i]._name + ".anim", JSON.stringify(animdata, null, 2));
        zip.folder("ArtTemp/Animation").file(animTable[i]._name + ".anim" + ".meta", JSON.stringify(metafile, null, 2));
      }
      animtion._clips.push({ __uuid__: uuid });
    }
    componentlist.push(animtion);
  }
  //增加組件結束
  if (parentindex >= 1) {
    head._parent = { __id__: parentindex };
  }
  head._name = entrynode.getAttribute("Name") ? entrynode.getAttribute("Name") : "Node";
  var childindex = index + 1;
  var childoffset = 0;
  // var childcount = entrynode.children[1].children.length;

  if (embeded) {
    head._children.push({ __id__: childindex });
    var embHead = createCCObject("cc.Node");
    embHead._parent = { __id__: index };
    embHead._prefab.__id__ = index + 2;
    var embInfo = createCCObject("cc.PrefabInfo");
    embInfo.root.__id__ = index + 1;
    var filedata = children.find((el) => el.tagName == "FileData");
    embInfo.asset.__uuid__ = filedata.getAttribute("Path");
    embInfo.sync = true;
    embHead._name = path.parse(embInfo.asset.__uuid__).name;
    childlist.push(embHead);
    childlist.push(embInfo);
    childindex += 2;
    childoffset += 2;
  }
  if (hascontent) {
    var tempchildlist = [];
    head._children.push({ __id__: childindex });
    var contentHead = createCCObject("cc.Node");
    var contentInfo = createCCObject("cc.PrefabInfo");
    childindex += 1;
    // childoffset += 1;
    contentHead._parent = { __id__: index };
    if (children.find((el) => el.tagName == "Children")) {
      var childcount = entrynode.children[1].children.length;
      for (var i = 0; i < childcount; i++) {
        contentHead._children.push({ __id__: childindex });
        var childnode = walkthourghCSD(entrynode.children[1].children[i], index + 1, childoffset, animTable, sizedata, header);
        tempchildlist = tempchildlist.concat(childnode);
        childindex = childindex + childnode.length;
        childoffset = childoffset + childnode.length;
      }
    }
    contentHead._prefab.__id__ = index + tempchildlist.length + 1;
    contentHead._name = "content";
    childlist.push(contentHead, ...tempchildlist, contentInfo);
    // console.log(index, tempchildlist.length, contentHead._prefab.__id__);
  } else {
    if (children.find((el) => el.tagName == "Children")) {
      var childcount = entrynode.children[1].children.length;
      for (var i = 0; i < childcount; i++) {
        head._children.push({ __id__: childindex });
        var childnode = walkthourghCSD(entrynode.children[1].children[i], index, childoffset, animTable, sizedata, header);
        childlist = childlist.concat(childnode);
        childindex = childindex + childnode.length;
        childoffset = childoffset + childnode.length;
      }
    }
  }
  // if (hascontent) {
  //   head._children.push({ __id__: childindex });
  //   var contenthead = createCCObject("cc.Node");
  //   contenthead._parent = { __id__: index };
  //   contenthead._prefab.__id__ = index + 2;
  //   childlist.push(contenthead);
  //   childindex += 1;
  //   childoffset += 1;
  // }


  for (var i = 0; i < componentlist.length; i++) {
    head._components.push({ __id__: index + childlist.length + i + 1 });
  }
  head._prefab.__id__ = index + componentlist.length + childlist.length + 1;
  var nodelist = [];
  nodelist.push(head, ...childlist, ...componentlist, info);
  // nodelist.splice(1, 0, );
  return nodelist;
}
function walkthourghPrefab(nodelist, entryindex, nodedata, parentname, parentoffsetX, parentoffsetY, isArtTemp) {
  var width = 0;
  var height = 0;
  var offsetX = 0;
  var offsetY = 0;
  var scaleX_adj = 1;
  var scaleY_adj = 1;
  var namepath = (entryindex == 1) ? nodelist[entryindex]._name : parentname + '/' + nodelist[entryindex]._name;
  var actionTag = bling.bkdr(namepath);
  actiontagTable[actionTag] = { Path: namepath, OffsetX: parentoffsetX, OffsetY: parentoffsetY };
  var ctype = "SingleNodeObjectData";
  var spriteuuid = "";
  var spriteIndex = -1;
  // var width = nodelist[entryindex]._contentSize.width;
  if (nodelist[entryindex]._components && nodelist[entryindex]._components.length > 0) {//檢查組件決定節點類別
    var count = nodelist[entryindex]._components.length;
    // console.log('start');
    // for (var i = 0; i < count; i++) {
    //   console.log(nodelist[nodelist[entryindex]._components[i].__id__].__type__);
    // }
    // if (nodelist[entryindex]._components.find((component) => nodelist[component.__id__].__type__ == "cc.Animation")) {
    //   var componentIndex = nodelist[entryindex]._components.findIndex((component) => nodelist[component.__id__].__type__ == "cc.Animation");
    //   var animIndex = nodelist[entryindex]._components[componentIndex].__id__;
    //   if (animIndex >= 0 && nodelist[animIndex]._clips != null) {
    //     for (var i = 0; i < nodelist[animIndex]._clips.length; i++) {
    //       var animuuid = nodelist[animIndex]._clips[i].__uuid__;
    //       console.log("anim");
    //       // if (animTable[animuuid]) {
    //       //   console.log("anim");
    //       // }
    //     }
    //   }
    // }
    if (nodelist[entryindex]._components.find((component) => nodelist[component.__id__].__type__ == "cc.Button")) {
      ctype = "ButtonObjectData";
      width = nodelist[entryindex]._contentSize.width;
      height = nodelist[entryindex]._contentSize.height;
      var componentIndex = nodelist[entryindex]._components.findIndex((component) => nodelist[component.__id__].__type__ == "cc.Sprite");
      if (componentIndex >= 0) {
        spriteIndex = nodelist[entryindex]._components[componentIndex].__id__;
        if (spriteIndex >= 0 && nodelist[spriteIndex]._spriteFrame != null) {
          spriteuuid = nodelist[spriteIndex]._spriteFrame.__uuid__;
        }
      }
    }
    else if (nodelist[entryindex]._components.find((component) => nodelist[component.__id__].__type__ == "cc.Mask")) {
      ctype = "PanelObjectData";
      width = nodelist[entryindex]._contentSize.width;
      height = nodelist[entryindex]._contentSize.height;
      offsetX = width * nodelist[entryindex]._anchorPoint.x;
      offsetY = height * nodelist[entryindex]._anchorPoint.y;
    }
    else if (nodelist[entryindex]._components.find((component) => nodelist[component.__id__].__type__ == "cc.ParticleSystem")) {
      ctype = "ParticleObjectData";
    }
    else if (nodelist[entryindex]._components.find((component) => nodelist[component.__id__].__type__ == "cc.Label")) {
      ctype = "TextBMFontObjectData";
      width = nodelist[entryindex]._contentSize.width;
      height = nodelist[entryindex]._contentSize.height;
    }
    else if (nodelist[entryindex]._components.find((component) => nodelist[component.__id__].__type__ == "cc.RichText")) {
      ctype = "TextObjectData";
      width = nodelist[entryindex]._contentSize.width;
      height = nodelist[entryindex]._contentSize.height;
    }
    else if (nodelist[entryindex]._components.find((component) => nodelist[component.__id__].__type__ == "cc.Sprite")) {
      width = nodelist[entryindex]._contentSize.width;
      height = nodelist[entryindex]._contentSize.height;
      var componentIndex = nodelist[entryindex]._components.findIndex((component) => nodelist[component.__id__].__type__ == "cc.Sprite");
      spriteIndex = nodelist[entryindex]._components[componentIndex].__id__;
      if (spriteIndex >= 0 && nodelist[spriteIndex]._spriteFrame != null) {
        spriteuuid = nodelist[spriteIndex]._spriteFrame.__uuid__;
      }
      if (nodelist[spriteIndex]._type == 1) {
        ctype = "ImageViewObjectData";
      }
      else {
        ctype = "SpriteObjectData";
        if (spriteIndex >= 0 && nodelist[spriteIndex]._spriteFrame != null) {
          if (fileTable[spriteuuid] && fs.existsSync(fileTable[spriteuuid].Path)) {
            var dimensions = sizeOf(fileTable[spriteuuid].Path);
            width = dimensions.width;
            height = dimensions.height;
          }
        }
      }
      // if (nodelist[spriteIndex]._dstBlendFactor == 1) {

      // }
      // else {
      //   ctype = "ImageViewObjectData";
      // }
      offsetX = width * nodelist[entryindex]._anchorPoint.x;
      offsetY = height * nodelist[entryindex]._anchorPoint.y;
    }
    // console.log('end');
  }
  var active = nodelist[entryindex]._active == true ? "True" : "False";
  var currentnode = nodedata.ele("AbstractNodeData", { Name: nodelist[entryindex]._name, ActionTag: actionTag, Tag: 167 + entryindex, IconVisible: active, VisibleForFrame: active, ctype: ctype });
  currentnode.ele("Size", { X: width.toFixed(4).toString(), Y: height.toFixed(4).toString() });
  if (nodelist[entryindex]._children.length > 0) {
    var childrendata = currentnode.ele("Children");
    for (var i = 0; i < nodelist[entryindex]._children.length; i++) {
      if (nodelist[nodelist[entryindex]._children[i].__id__].__type__ && nodelist[nodelist[entryindex]._children[i].__id__].__type__ != "cc.PrivateNode") {//Creator內部使用的節點，不須轉換
        walkthourghPrefab(nodelist, nodelist[entryindex]._children[i].__id__, childrendata, namepath, offsetX, offsetY, isArtTemp);
      }
    }
  }
  var pos = getPrefabNodeData(nodelist[entryindex], "Position");
  var scale = getPrefabNodeData(nodelist[entryindex], "Scale");
  var rotation = getPrefabNodeData(nodelist[entryindex], "Rotation");
  var anchorElement = currentnode.ele("AnchorPoint");
  var posElement = currentnode.ele("Position", { X: (pos[0] + parentoffsetX).toFixed(4).toString(), Y: (pos[1] + parentoffsetY).toFixed(4).toString() });
  currentnode.ele("Scale", { ScaleX: scale[0].toFixed(4).toString(), ScaleY: scale[1].toFixed(4).toString() });
  currentnode.ele("CColor", { A: nodelist[entryindex]._color.a.toFixed(0).toString(), R: nodelist[entryindex]._color.r.toFixed(0).toString(), G: nodelist[entryindex]._color.g.toFixed(0).toString(), B: nodelist[entryindex]._color.b.toFixed(0).toString() });
  currentnode.att("Alpha", nodelist[entryindex]._opacity.toFixed(0).toString());
  currentnode.att("RotationSkewX", (-rotation[0]).toFixed(4).toString());
  currentnode.att("RotationSkewY", (-rotation[0]).toFixed(4).toString());
  var preposition = currentnode.ele("PrePosition");
  var presize = currentnode.ele("PreSize", { X: "0.0000", Y: "0.0000" });
  switch (ctype) {
    case "ImageViewObjectData":
    case "SpriteObjectData":
      anchorElement.att("ScaleX", nodelist[entryindex]._anchorPoint.x.toFixed(4).toString());
      anchorElement.att("ScaleY", nodelist[entryindex]._anchorPoint.y.toFixed(4).toString());
      if (ctype == "SpriteObjectData") {
        currentnode.ele("BlendFunc", { Src: "1", Dst: nodelist[spriteIndex]._dstBlendFactor.toFixed(0).toString() });
      }
      if (fileTable[spriteuuid]) {
        var filepath = fileTable[spriteuuid].Url
        // var filepath = path.join("ArtTemp", "Img", fileTable[spriteuuid].New);
        // if (!isArtTemp) {
        //   filepath = fileTable[spriteuuid].Url;
        // }
        filepath = filepath.replace(/\\/g, "/");//更換路徑格式
        currentnode.ele("FileData", { Type: "Normal", Path: filepath, Plist: "" });
        if (ctype == "ImageViewObjectData" && nodelist[spriteIndex]._type == 1 && scale9Table[spriteuuid]) {
          currentnode.att("Scale9Enable", "True");
          if (scale9Table[spriteuuid].Top > 0) {
            currentnode.att("TopEage", scale9Table[spriteuuid].Top.toFixed(0).toString());
            currentnode.att("Scale9OriginY", scale9Table[spriteuuid].Top.toFixed(0).toString());
          }
          if (scale9Table[spriteuuid].Bottom > 0) {
            currentnode.att("BottomEage", scale9Table[spriteuuid].Bottom.toFixed(0).toString());
          }
          if (scale9Table[spriteuuid].Left > 0) {
            currentnode.att("LeftEage", scale9Table[spriteuuid].Left.toFixed(0).toString());
            currentnode.att("Scale9OriginX", scale9Table[spriteuuid].Left.toFixed(0).toString());
          }
          if (scale9Table[spriteuuid].Right > 0) {
            currentnode.att("RightEage", scale9Table[spriteuuid].Right.toFixed(0).toString())
          }
          currentnode.att("Scale9Width", (scale9Table[spriteuuid].rawWidth - scale9Table[spriteuuid].Left - scale9Table[spriteuuid].Right).toFixed(0).toString());
          currentnode.att("Scale9Height", (scale9Table[spriteuuid].rawHeight - scale9Table[spriteuuid].Top - scale9Table[spriteuuid].Bottom).toFixed(0).toString());
        }
      }
      else {
        currentnode.ele("FileData", { Type: "Default", Path: "Default/Sprite.png", Plist: "" });//Studio預設圖片路徑
      }
      break;
    case "ButtonObjectData":
      anchorElement.att("ScaleX", nodelist[entryindex]._anchorPoint.x.toFixed(4).toString());
      anchorElement.att("ScaleY", nodelist[entryindex]._anchorPoint.y.toFixed(4).toString());
      if (fileTable[spriteuuid]) {
        var filepath = fileTable[spriteuuid].Url
        // var filepath = path.join("ArtTemp", "Img", fileTable[spriteuuid].New);
        // if (!isArtTemp) {
        //   filepath = fileTable[spriteuuid].Url;
        // }
        filepath = filepath.replace(/\\/g, "/");//更換路徑格式
        currentnode.ele("NormalFileData", { Type: "Normal", Path: filepath, Plist: "" });
      }
      else {
        currentnode.att("Alpha", "0");
        currentnode.ele("NormalFileData", { Type: "Default", Path: "Default/Button_Normal.png", Plist: "" });
      }
      currentnode.ele("TextColor", { A: "255", R: "0", G: "0", B: "0" });
      currentnode.ele("DisabledFileData", { Type: "Default", Path: "Default/Button_Disable.png", Plist: "" });
      currentnode.ele("PressedFileData", { Type: "Default", Path: "Default/Button_Press.png", Plist: "" });
      currentnode.ele("OutlineColor", { A: "255", R: "255", G: "0", B: "0" });
      currentnode.ele("ShadowColor", { A: "255", R: "110", G: "110", B: "110" });
      break;
    case "PanelObjectData":
      currentnode.att("ClipAble", "True");
      currentnode.att("BackColorAlpha", "0");
      anchorElement.att("ScaleX", nodelist[entryindex]._anchorPoint.x.toFixed(4).toString());
      anchorElement.att("ScaleY", nodelist[entryindex]._anchorPoint.y.toFixed(4).toString());
      currentnode.ele("CColor", { A: "255", R: "255", G: "255", B: "255" });
      currentnode.ele("SingleColor", { A: "255", R: "255", G: "255", B: "255" });
      currentnode.ele("FirstColor", { A: "255", R: "255", G: "255", B: "255" });
      currentnode.ele("EndColor", { A: "255", R: "255", G: "255", B: "255" });
      currentnode.ele("ColorVector", { ScaleY: "1.0000" });
      break;
    // case "ProjectNodeObjectData":
    //   break;
    case "TextBMFontObjectData":
      anchorElement.att("ScaleX", nodelist[entryindex]._anchorPoint.x.toFixed(4).toString());
      anchorElement.att("ScaleY", nodelist[entryindex]._anchorPoint.y.toFixed(4).toString());
      var componentIndex = nodelist[entryindex]._components.findIndex((component) => nodelist[component.__id__].__type__ == "cc.Label");
      var labelIndex = nodelist[entryindex]._components[componentIndex].__id__;
      if (labelIndex >= 0) {
        currentnode.att("LabelText", nodelist[labelIndex]._N$string);
        if (nodelist[labelIndex]._N$file != null) {
          var fontuuid = nodelist[labelIndex]._N$file.__uuid__;
          if (fileTable[fontuuid]) {
            var filepath = fileTable[fontuuid].Url
            // var filepath = path.join("ArtTemp", "Fnt", fileTable[fontuuid].New);
            // if (!isArtTemp) {
            //   filepath = fileTable[fontuuid].Url;
            // }
            filepath = filepath.replace(/\\/g, "/");
            currentnode.ele("LabelBMFontFile_CNB", { Type: "Normal", Path: filepath, Plist: "" });
          }
        }
      }
      break;
    case "TextObjectData":
      anchorElement.att("ScaleX", nodelist[entryindex]._anchorPoint.x.toFixed(4).toString());
      anchorElement.att("ScaleY", nodelist[entryindex]._anchorPoint.y.toFixed(4).toString());
      var componentIndex = nodelist[entryindex]._components.findIndex((component) => nodelist[component.__id__].__type__ == "cc.RichText");
      var labelIndex = nodelist[entryindex]._components[componentIndex].__id__;
      if (labelIndex >= 0) {
        currentnode.att("LabelText", nodelist[labelIndex]._N$string);
        currentnode.att("FontSize", nodelist[labelIndex]._N$fontSize.toFixed(0).toString());
        if (nodelist[labelIndex]._N$font != null) {
          var fontuuid = nodelist[labelIndex]._N$font.__uuid__;
          if (fileTable[fontuuid]) {
            var filepath = fileTable[fontuuid].Url
            // var filepath = path.join("ArtTemp", "Fnt", fileTable[fontuuid].New);
            // if (!isArtTemp) {
            //   filepath = fileTable[fontuuid].Path;
            // }
            filepath = filepath.replace(/\\/g, "/");
            currentnode.ele("FontResource", { Type: "Normal", Path: filepath, Plist: "" });
          }
        }
      }
      break;
    case "ParticleObjectData":
      var componentIndex = nodelist[entryindex]._components.findIndex((component) => nodelist[component.__id__].__type__ == "cc.ParticleSystem");
      var particleIndex = nodelist[entryindex]._components[componentIndex].__id__;
      if (particleIndex >= 0) {
        currentnode.ele("BlendFunc", { Src: "1", Dst: nodelist[particleIndex]._dstBlendFactor.toFixed(0).toString() });
        if (nodelist[particleIndex]._file != null) {
          var fileuuid = nodelist[particleIndex]._file.__uuid__;
          if (fileTable[fileuuid]) {
            var filepath = fileTable[fileuuid].Url
            // var filepath = path.join("ArtTemp", "Particle", fileTable[fileuuid].New);
            // if (!isArtTemp) {
            //   filepath = fileTable[fileuuid].Path;
            // }
            filepath = filepath.replace(/\\/g, "/");
            currentnode.ele("FileData", { Type: "Normal", Path: filepath, Plist: "" });
          }
        }
        else {
          currentnode.ele("FileData", { Type: "Default", Path: "Default/defaultParticle.plist", Plist: "" });
        }
      }
      break;
    // case "ScrollViewObjectData":
    //   break;
  }
}
function checkDupName(filename, ext, folder) {
  var newname = filename;
  // var ext = path.parse(filename).ext;
  var index = 1;
  while (fs.existsSync(path.join(folder, newname + ext))) {
    newname = filename + "_" + index.zeroPad(10);
    index++;
  }
  return newname;
}
function getCCSFilePath(ele) {
  var _path = ele.getAttribute("Name");
  if (ele.parentNode && ele.parentNode.tagName !== "RootFolder") {
    _path = getCCSFilePath(ele.parentNode) + "/" + _path;
  }
  return _path;
}
function getCCSFiles(xmlDoc, ext) {
  var files = [];
  var eles = Array.from(xmlDoc.getElementsByTagName("*"));
  eles.forEach((ele) => {
    if ((ele.tagName == "Project" || ele.tagName == "Image" || ele.tagName == "Fnt" || ele.tagName == "PlistParticleFile") && (path.parse(ele.getAttribute("Name")).ext == ext || ext == "")) {
      // if (ele.getAttribute("Name") !== null && ele.getAttribute("Name") !== "" && (path.parse(ele.getAttribute("Name")).ext == ext || ext == "")) {
      files.push(getCCSFilePath(ele));
    }
  });
  // console.log(files.length);
  return files;
}

function getFolderFiles(folderpath, ext, issubdir) {
  var files = [];
  fs.readdirSync(folderpath).forEach((name) => {
    var newpath = path.join(folderpath, name);
    if (!fs.lstatSync(newpath).isDirectory() && (path.parse(name).ext == ext || (ext == "" && path.parse(name).ext != ".udf"))) {
      files.push(newpath);
    } else if (fs.lstatSync(newpath).isDirectory() && issubdir) {
      files = files.concat(getFolderFiles(newpath, ext, issubdir));
    }
  });
  // console.log(files.length);
  return files;
}
//--------------Use fs.mkdirsync recursive------------------
// function createFolder(folderarray, header) {
//   if (folderarray.length > 0) {
//     var newfolder = folderarray.shift();
//     var p = path.join(header, newfolder);
//     if (!fs.existsSync(p)) {
//       fs.mkdirSync(p);
//     }
//     return createFolder(folderarray, p);
//   }
// }
//-----------------------------------------------------------

function xmlAddFolder(xmlDoc, xmlEle, pathArray) {
  if (pathArray.length > 0) {
    var foldername = pathArray.shift();
    var ele;
    if (xmlEle.children.length > 0) {
      for (var i = 0; i < xmlEle.children.length; i++) {
        if (xmlEle.children[i].getAttribute("Name") == foldername) {
          ele = xmlEle.children[i];
          break;
        }
      }
    }
    if (!ele) {
      ele = xmlDoc.createElement("Folder");
      ele.setAttribute("Name", foldername);
      ele = xmlEle.appendChild(ele);
    }
    return xmlAddFolder(xmlDoc, ele, pathArray);
  } else {
    return xmlEle;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  // setting many function on windows
  const registerFuncs = {};
  registerFuncs.exportData = (expath, srcpath, despath) => {
    // console.log("aaa");
    return new Promise((resolve, reject) => {
      var srcheader = path.join(path.dirname(srcpath), "cocosstudio");
      var parser = new DOMParser();
      var serializer = new XMLSerializer();
      for (var i = 0; i < expath.length; i++) {
        var nameTable = {};
        var plistTable = {};
        var index = 1;
        var name = path.parse(expath[i][0]).name;
        var data = xmlBuilder
          .create({ version: "1.0" })
          .ele("Solution")
          .ele("PropertyGroup", { Name: name, Version: "3.10.0.0", Type: "CocosStudio" })
          .up()
          .ele("SolutionFolder")
          .ele("Group", { ctype: "ResourceGroup" })
          .ele("RootFolder", { Name: "." })
          .ele("Folder", { Name: "ArtTemp" });
        var csdFolder = data.ele("Folder", { Name: "Csd" });
        var imgFolder = data.ele("Folder", { Name: "Img" });
        var fntFolder = data.ele("Folder", { Name: "Fnt" });
        var plistFolder = data.ele("Folder", { Name: "Particle" });
        var root = path.join(despath, name);
        while (fs.existsSync(root)) {
          root = path.join(despath, name + "_" + index.toString().padStart(2, "0"));
          index++;
        }
        fs.mkdirSync(root);
        var header = path.join(root, "cocosstudio");
        fs.mkdirSync(header);
        header = path.join(header, "ArtTemp");
        fs.mkdirSync(header);
        fs.mkdirSync(path.join(header, "Csd"));
        fs.mkdirSync(path.join(header, "Img"));
        fs.mkdirSync(path.join(header, "Fnt"));
        fs.mkdirSync(path.join(header, "Particle"));
        // console.log(datas[expath[i][0]][0]);
        for (var j = 0; j < expath[i].length; j++) {
          var csdname = path.parse(expath[i][j]).base;
          // csdname = getFolderUniqueName(header, pa);
          var csdpath = path.join(header, "Csd", csdname);
          var fulltext = fs.readFileSync(expath[i][j], "utf-8");
          var xmlDoc = parser.parseFromString(fulltext, "text/xml");
          var part = expath[i][j].match(/[\/\\]cocosstudio[\/\\](.+)$/)[1];
          part = part.replace(/\\/g, "/");
          if (!nameTable[part]) {
            nameTable[part] = "ArtTemp/Csd/" + csdname;
            var el = xmlDoc.getElementsByTagName("PropertyGroup");
            var t = el[0].getAttribute("Type");
            fs.copyFileSync(expath[i][j], csdpath, fs.COPYFILE_FICLONE);
            csdFolder.ele("Project", { Name: csdname, Type: t });
          }
          var elements = xmlDoc.getElementsByTagName("*");
          for (var k = 0; k < elements.length; k++) {
            var temppath = elements[k].getAttribute("Path");
            if (temppath) {
              var filepath = path.join(srcheader, temppath);
              if (fs.existsSync(filepath)) {
                var ext = path.parse(temppath).ext;
                if (ext === ".csd") {
                  // console.log("csd");
                  var newname = path.parse(temppath).base;
                  if (nameTable[temppath]) {
                    newname = path.parse(nameTable[temppath]).base;
                  }
                  elements[k].setAttribute("Path", "ArtTemp/Csd/" + newname);
                } else if (ext === ".png" || ext === ".jpg") {
                  var tempplist = elements[k].getAttribute("Plist");
                  if (tempplist) {
                    plistTable[temppath] = tempplist;
                  }
                  // console.log("img");
                  var newname = path.parse(temppath).base;
                  if (!nameTable[temppath]) {
                    newname = getObjUniqueName(nameTable, "ArtTemp/Img/", temppath);
                    fs.copyFileSync(filepath, path.join(header, "Img", newname), fs.COPYFILE_FICLONE);
                    imgFolder.ele("Image", { Name: newname });
                    nameTable[temppath] = "ArtTemp/Img/" + newname;
                  }
                  elements[k].setAttribute("Path", "ArtTemp/Img/" + newname);
                } else if (ext === ".plist") {
                  // console.log("plist");
                  var newname = path.parse(temppath).base;
                  if (!nameTable[temppath]) {
                    newname = getObjUniqueName(nameTable, "ArtTemp/Particle/", temppath);
                    fs.copyFileSync(filepath, path.join(header, "Particle", newname), fs.COPYFILE_FICLONE);
                    plistFolder.ele("PlistParticleFile", { Name: newname });
                    var temptext = fs.readFileSync(filepath, "utf-8");
                    var xmlPlist = parser.parseFromString(temptext, "text/xml");
                    var plistEles = xmlPlist.getElementsByTagName("*");
                    for (var x = 0; x < plistEles.length; x++) {
                      // console.log(plistEles[x].childNodes[0]);
                      if (plistEles[x].childNodes[0] && plistEles[x].childNodes[0].nodeValue == "textureFileName") {
                        if (!plistEles[x + 2] || (plistEles[x + 3] && !plistEles[x + 3].childNodes[0])) {
                          var pngname = plistEles[x + 1].childNodes[0].nodeValue;
                          var pngpath = path.join(path.dirname(filepath), pngname);
                          if (fs.existsSync(pngpath)) {
                            fs.copyFileSync(pngpath, path.join(header, "Particle", pngname), fs.COPYFILE_FICLONE);
                          }
                        }
                      }
                    }
                    // var stringEles = xmlPlist.getElementsByTagName("string");
                    nameTable[temppath] = "ArtTemp/Particle/" + newname;
                  }
                  elements[k].setAttribute("Path", "ArtTemp/Particle/" + newname);
                } else if (ext === ".fnt") {
                  // console.log("fnt");
                  var newname = path.parse(temppath).base;
                  if (!nameTable[temppath]) {
                    newname = getObjUniqueName(nameTable, "ArtTemp/Fnt/", temppath);
                    nameTable[temppath] = "ArtTemp/Fnt/" + newname;
                    // fs.copyFileSync(filepath, path.join(header, "Fnt", newname), fs.COPYFILE_FICLONE);
                    fntFolder.ele("Fnt", { Name: newname });
                    var fntfile = fs.readFileSync(filepath, "utf-8");
                    var re = /(?<=(file=")).*(?=")/;
                    var p2 = fntfile.match(re)[0];
                    if (p2) {
                      // var newname2 = path.parse(p2).base;
                      var newname2 = getObjUniqueName(nameTable, "ArtTemp/Fnt/", p2);
                      // var temppath2 = path.dirname(temppath) + "/" + newname2;
                      // if (!nameTable[temppath2]) {
                      filepath = path.join(srcheader, path.dirname(temppath) + "/" + p2);
                      if (fs.existsSync(filepath)) {
                        fs.copyFileSync(filepath, path.join(header, "Fnt", newname2), fs.COPYFILE_FICLONE);
                      }
                      // nameTable[temppath2] = "ArtTemp/Fnt/" + newname2;
                      // }
                      fntfile = fntfile.replace(p2, newname2);
                    }
                    fs.writeFileSync(path.join(header, "Fnt", newname), fntfile);
                  }
                  elements[k].setAttribute("Path", "ArtTemp/Fnt/" + newname);
                }
              }
            }
          }
          fs.writeFileSync(csdpath, serializer.serializeToString(xmlDoc));
        }
        data = data.end({ prettyPrint: true, headless: true });
        fs.writeFileSync(path.join(root, name + ".ccs"), data);
        var exp = false;
        var exportdetail = {};
        exportdetail.srcname = path.parse(srcpath).name;
        exportdetail.nameTable = {};
        exportdetail.plistTable = {};
        if (Object.keys(nameTable).length > 0) {
          exp = true;
          exportdetail.nameTable = nameTable;
        }
        if (Object.keys(plistTable).length > 0) {
          exp = true;
          exportdetail.plistTable = plistTable;
          // fs.writeFileSync(path.join(root, "_formerpaths.txt"), JSON.stringify(plistTable, null, 2));
          // fs.writeFileSync(path.join(root, "_plisttable.txt"), JSON.stringify(plistTable, null, 2));
        }
        if (exp) {
          fs.writeFileSync(path.join(root, "_exportdetail.txt"), JSON.stringify(exportdetail, null, 2));
        }
        // for (var p in datas[expath[i]]) {
        //   console.log(p);
        // }
        // var arttemp = path.join(root, "cocosstudio", "ArtTemp", "Img");
        // fs.mkdirSync(arttemp);
      }
      resolve(false);
    });
  };

  registerFuncs.checkProcess = async function (mainpath) {
    return new Promise((resolve, reject) => {
      ps.lookup(
        {
          command: "CocosStudio.exe",
        },
        function (err, resultList) {
          if (err) {
            throw new Error(err);
          }
          var check = false;
          (async () => {
            await Promise.all(
              resultList.map(async (process) => {
                var exist = await processExist(Number(process.pid), path.parse(mainpath).name);
                if (exist) {
                  check = true;
                }
              })
            );
            resolve(check);
          })();
        }
      );
    });
  };

  registerFuncs.importData = (mainpath, subpath, overwrite) => {
    return new Promise((resolve, reject) => {
      var parser = new DOMParser();
      var serializer = new XMLSerializer();
      var fulltext1 = fs.readFileSync(mainpath, "utf-8");
      var fulltext2 = fs.readFileSync(subpath, "utf-8");
      var xmlDoc1 = parser.parseFromString(fulltext1, "text/xml");
      var xmlDoc2 = parser.parseFromString(fulltext2, "text/xml");
      var mainheader = path.join(path.dirname(mainpath), "cocosstudio");
      var subheader = path.join(path.dirname(subpath), "cocosstudio");
      var newfoldername = getUniqueDirectory(mainheader, "ArtTemp_Import");
      var targetpath = path.join(mainheader, newfoldername);
      var newfolderEle = xmlDoc1.createElement("Folder");
      var nameTable = {};
      var plistTable = {};
      var p = fs.readdirSync(path.dirname(subpath)).find((name) => path.parse(name).name == "_exportdetail");
      if (p) {
        var obj = JSON.parse(fs.readFileSync(path.join(path.dirname(subpath), p), "utf-8"));
        nameTable = obj.nameTable;
        plistTable = obj.plistTable;
        // console.log("plisttable ready");
      }
      newfolderEle.setAttribute("Name", newfoldername);
      newfolderEle = xmlDoc1.getElementsByTagName("RootFolder")[0].appendChild(newfolderEle);
      if (overwrite && fs.existsSync(path.join(subheader, "ArtTemp"))) {
        fs.copySync(path.join(subheader, "ArtTemp"), targetpath);
        var nodes = xmlDoc2.getElementsByTagName("RootFolder")[0].children;
        for (var i = 0; i < nodes.length; i++) {
          if (nodes[i].getAttribute("Name") == "ArtTemp") {
            Array.from(nodes[i].children).forEach((element) => {
              var el = element.cloneNode(true);
              newfolderEle.appendChild(el);
            });
          }
        }
        var csdfiles = getFolderFiles(targetpath, ".csd", true);
        csdfiles.forEach((file) => {
          var text = fs.readFileSync(file, "utf-8");
          var xmlCsd = parser.parseFromString(text, "text/xml");
          var elements = xmlCsd.getElementsByTagName("*");
          for (var i = 0; i < elements.length; i++) {
            var temppath = elements[i].getAttribute("Path");
            if (temppath) {
              var formerpath = Object.keys(nameTable).find((key) => nameTable[key] === temppath);
              if (formerpath) {
                elements[i].setAttribute("Path", formerpath);
                var plistpath = plistTable[formerpath];
                if (plistpath) {
                  // console.log(plistpath);
                  elements[i].setAttribute("Type", "MarkedSubImage");
                  elements[i].setAttribute("Plist", plistpath);
                }
                // formerpath = temppath.substring(temppath.indexOf("/") + 1);
                // formerpath = newfoldername + "/" + temppath;
              } else {
                temppath = temppath.substring(temppath.indexOf("/") + 1);
                formerpath = newfoldername + "/" + temppath;
                elements[i].setAttribute("Path", formerpath);
              }
            } //修改CSD內的關聯路徑
          }
          fs.writeFileSync(file, serializer.serializeToString(xmlCsd));
        });
        for (var key in nameTable) {
          // console.log(key);
          var dirs = key.split("/");
          dirs.pop();
          var lastEle = xmlAddFolder(xmlDoc1, xmlDoc1.getElementsByTagName("RootFolder")[0], dirs);
          var oldfolder = dirs.join("/");
          oldfolder = path.join(mainheader, oldfolder);
          fs.mkdirSync(oldfolder, { recursive: true });
          var formerpath = nameTable[key].substring(nameTable[key].indexOf("/") + 1);
          var nowpath = path.join(mainheader, newfoldername, formerpath);
          var movepath = path.join(mainheader, key);
          // console.log(nowpath + "  " + movepath);
          if (fs.existsSync(nowpath) && nowpath != movepath) {
            if (!fs.existsSync(movepath)) {
              var filename = path.parse(key).base;
              var ext = path.parse(key).ext;
              switch (ext) {
                case ".csd":
                  var fulltext = fs.readFileSync(nowpath, "utf-8");
                  var csdDoc = parser.parseFromString(fulltext, "text/xml");
                  var el = csdDoc.getElementsByTagName("PropertyGroup");
                  var t = el[0].getAttribute("Type");
                  var newEle = xmlDoc1.createElement("Project");
                  newEle.setAttribute("Name", filename);
                  newEle.setAttribute("Type", t);
                  lastEle.appendChild(newEle);
                  break;
                case ".png":
                case ".jpg":
                  var newEle = xmlDoc1.createElement("Image");
                  newEle.setAttribute("Name", filename);
                  lastEle.appendChild(newEle);
                  break;
                case ".fnt":
                  var newEle = xmlDoc1.createElement("Fnt");
                  newEle.setAttribute("Name", filename);
                  lastEle.appendChild(newEle);
                  var fntfile = fs.readFileSync(nowpath, "utf-8");
                  var re = /(?<=(file=")).*(?=")/;
                  var pngname = fntfile.match(re)[0];
                  if (pngname) {
                    var pngpath = path.join(path.dirname(nowpath), pngname);
                    if (fs.existsSync(pngpath)) {
                      // console.log(pngpath);
                      var pngformer = path.join(path.dirname(movepath), pngname);
                      // console.log(pngformer);
                      fs.moveSync(pngpath, pngformer, { overwrite: true });
                    }
                  }
                  break;
                case ".plist":
                  var newEle = xmlDoc1.createElement("PlistParticleFile");
                  newEle.setAttribute("Name", filename);
                  lastEle.appendChild(newEle);
                  var temptext = fs.readFileSync(nowpath, "utf-8");
                  var xmlPlist = parser.parseFromString(temptext, "text/xml");
                  var plistEles = xmlPlist.getElementsByTagName("*");
                  for (var x = 0; x < plistEles.length; x++) {
                    if (plistEles[x].childNodes[0] && plistEles[x].childNodes[0].nodeValue == "textureFileName") {
                      if (!plistEles[x + 2] || (plistEles[x + 3] && !plistEles[x + 3].childNodes[0])) {
                        var pngname = plistEles[x + 1].childNodes[0].nodeValue;
                        var pngnowpath = path.join(path.dirname(nowpath), pngname);
                        var pngnewpath = path.join(path.dirname(movepath), pngname);
                        if (fs.existsSync(pngnowpath)) {
                          fs.moveSync(pngnowpath, pngnewpath, { overwrite: true });
                        }
                      }
                    }
                  }
                  break;
              }
            }
            fs.moveSync(nowpath, movepath, { overwrite: true });
          } //搬移資源
        }
        RemoveUnusedNode(mainheader, newfolderEle);
        // var remainfiles = getFolderFiles(targetpath, "", true);
        // console.log(remainfiles.length);
        // if (remainfiles.length == 0) {
        //   fs.removeSync(targetpath);
        // }
        // if (remainfiles.length > 0) {
        //   var remainnodes = xmlDoc2.getElementsByTagName("*");
        //   Array.from(remainnodes).forEach((node) => {});
        // }
      } else {
        if (Object.keys(nameTable).length > 0 && fs.existsSync(path.join(subheader, "ArtTemp"))) {
          fs.copySync(path.join(subheader, "ArtTemp"), targetpath);
          var nodes = xmlDoc2.getElementsByTagName("RootFolder")[0].children;
          for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].getAttribute("Name") == "ArtTemp") {
              Array.from(nodes[i].children).forEach((element) => {
                var el = element.cloneNode(true);
                newfolderEle.appendChild(el);
              });
            }
          }
          var files = getFolderFiles(targetpath, ".csd", true);
          files.forEach((file) => {
            var text = fs.readFileSync(file, "utf-8");
            var xmlCsd = parser.parseFromString(text, "text/xml");
            var elements = xmlCsd.getElementsByTagName("*");
            for (var i = 0; i < elements.length; i++) {
              var temppath = elements[i].getAttribute("Path");
              if (temppath) {
                temppath = temppath.substring(temppath.indexOf("/") + 1);
                temppath = newfoldername + "/" + temppath;
                elements[i].setAttribute("Path", temppath);
              }
            }
            fs.writeFileSync(file, serializer.serializeToString(xmlCsd));
          });
        } else {
          fs.copySync(subheader, targetpath);
          var nodes = xmlDoc2.getElementsByTagName("RootFolder")[0].children;
          Array.from(nodes).forEach((element) => {
            var el = element.cloneNode(true);
            newfolderEle.appendChild(el);
          });
          var files = getFolderFiles(targetpath, ".csd", true);
          files.forEach((file) => {
            var text = fs.readFileSync(file, "utf-8");
            var xmlCsd = parser.parseFromString(text, "text/xml");
            var elements = xmlCsd.getElementsByTagName("*");
            for (var i = 0; i < elements.length; i++) {
              var temppath = elements[i].getAttribute("Path");
              if (temppath) {
                temppath = newfoldername + "/" + temppath;
                elements[i].setAttribute("Path", temppath);
              }
            }
            fs.writeFileSync(file, serializer.serializeToString(xmlCsd));
          });
        }
      }
      // if (isformerpaths) {
      //   if (remainfiles.length > 0) {
      //     remainfiles.forEach((remainfile) => {
      //       var filename = path.parse(remainfile).base;
      //       var ext = path.parse(remainfile).ext;
      //       switch (ext) {
      //         case ".csd":
      //           var fulltext = fs.readFileSync(nowpath, "utf-8");
      //           var csdDoc = parser.parseFromString(fulltext, "text/xml");
      //           var el = csdDoc.getElementsByTagName("PropertyGroup");
      //           var t = el[0].getAttribute("Type");
      //           var newEle = xmlDoc1.createElement("Project");
      //           newEle.setAttribute("Name", filename);
      //           newEle.setAttribute("Type", t);
      //           lastEle.appendChild(newEle);
      //           break;
      //         case ".png":
      //         case ".jpg":
      //           var newEle = xmlDoc1.createElement("Image");
      //           newEle.setAttribute("Name", filename);
      //           lastEle.appendChild(newEle);
      //           break;
      //         case ".fnt":
      //           var newEle = xmlDoc1.createElement("Fnt");
      //           newEle.setAttribute("Name", filename);
      //           lastEle.appendChild(newEle);
      //           var fntfile = fs.readFileSync(nowpath, "utf-8");
      //           var re = /(?<=(file=")).*(?=")/;
      //           var pngname = fntfile.match(re)[0];
      //           if (pngname) {
      //             var pngpath = path.join(path.dirname(nowpath), pngname);
      //             if (fs.existsSync(pngpath)) {
      //               // console.log(pngpath);
      //               var pngformer = path.join(path.dirname(movepath), pngname);
      //               // console.log(pngformer);
      //               fs.moveSync(pngpath, pngformer, { overwrite: true });
      //             }
      //           }
      //           break;
      //         case ".plist":
      //           var newEle = xmlDoc1.createElement("PlistParticleFile");
      //           newEle.setAttribute("Name", filename);
      //           lastEle.appendChild(newEle);
      //           var temptext = fs.readFileSync(nowpath, "utf-8");
      //           var xmlPlist = parser.parseFromString(temptext, "text/xml");
      //           var plistEles = xmlPlist.getElementsByTagName("*");
      //           for (var x = 0; x < plistEles.length; x++) {
      //             if (plistEles[x].childNodes[0] && plistEles[x].childNodes[0].nodeValue == "textureFileName") {
      //               if (!plistEles[x + 2] || (plistEles[x + 3] && !plistEles[x + 3].childNodes[0])) {
      //                 var pngname = plistEles[x + 1].childNodes[0].nodeValue;
      //                 var pngnowpath = path.join(path.dirname(remainfile), pngname);
      //                 var pngnewpath = path.join(path.dirname(movepath), pngname);
      //                 if (fs.existsSync(pngnowpath)) {
      //                   fs.moveSync(pngnowpath, pngnewpath, { overwrite: true });
      //                 }
      //               }
      //             }
      //           }
      //           break;
      //       }
      //     });
      //   } else {
      //     fs.rmdirSync(targetpath, { recursive: true });
      //     newfolderEle.parentNode.removeChild(newfolderEle);
      //   }
      // }
      fs.writeFileSync(mainpath, serializer.serializeToString(xmlDoc1));
      resolve();
    });
  };
  registerFuncs.currentVersion = () => {
    var a = remote.app.getVersion();
    return a;
  };
  registerFuncs.appendText = (text) => {
    const newPath = path.resolve(__dirname, "the-text.txt");
    // console.log("saving start at path=", newPath, ";text=", text);
    fs.writeFileSync(newPath, text + "\n", {
      encoding: "utf8",
      flag: "a", // append text to the end of text file
    });
  };
  registerFuncs.getFilename = (temppath) => {
    return path.parse(temppath).base;
  };
  registerFuncs.studioPaths = (src, p) => {
    // src = path.normalize(src);
    // p = path.normalize(p);
    var p2 = path.dirname(src);
    return path.join(p2, "cocosstudio", p);
  };
  registerFuncs.compareExt = (temppath, ext) => {
    return path.parse(temppath).ext == ext;
  };
  registerFuncs.isDirectory = (temppath) => {
    return fs.lstatSync(temppath).isDirectory();
  };
  registerFuncs.readXML = (temppath) => {
    return fs.readFileSync(temppath, "utf-8");
    // return fs.lstatSync(temppath).isDirectory();
  };
  registerFuncs.isSource = (mainpath, subpath) => {
    var dirpath = path.dirname(subpath);
    var p = fs.readdirSync(dirpath).find((name) => path.parse(name).name == "_exportdetail");
    if (p) {
      var filepath = path.join(dirpath, p);
      var file = fs.readFileSync(filepath, "utf-8");
      try {
        JSON.parse(file);
      } catch (e) {
        return false;
      }
      var obj = JSON.parse(file);
      if (obj.srcname == path.parse(mainpath).name) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  };
  registerFuncs.hasNametable = (temppath) => {
    var dirpath = path.dirname(temppath);
    var p = fs.readdirSync(dirpath).find((name) => path.parse(name).name == "_exportdetail");
    if (p) {
      var filepath = path.join(dirpath, p);
      var file = fs.readFileSync(filepath, "utf-8");
      try {
        JSON.parse(file);
      } catch (e) {
        return false;
      }
      var obj = JSON.parse(file);
      if (obj.nameTable && Object.keys(obj.nameTable).length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  };
  registerFuncs.hasPlisttable = (temppath) => {
    var dirpath = path.dirname(temppath);
    var p = fs.readdirSync(dirpath).find((name) => path.parse(name).name == "_exportdetail");
    if (p) {
      var filepath = path.join(dirpath, p);
      var file = fs.readFileSync(filepath, "utf-8");
      try {
        JSON.parse(file);
      } catch (e) {
        return false;
      }
      var obj = JSON.parse(file);
      if (obj.plistTable && Object.keys(obj.plistTable).length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  };
  registerFuncs.selectFolder = () => {
    let dialog = remote.dialog;
    var p = dialog.showOpenDialogSync(remote.getCurrentWindow(), {
      properties: ["openDirectory"],
    });
    if (p) {
      return p[0];
    } else {
      return "";
    }
  };
  registerFuncs.selectFile = () => {
    let dialog = remote.dialog;
    var p = dialog.showOpenDialogSync(remote.getCurrentWindow(), {
      properties: ["openFile"],
    });
    if (p) {
      return p[0];
    } else {
      return "";
    }
  };
  registerFuncs.openFolder = (p) => {
    if (path.parse(p).ext != "") {
      p = path.dirname(p);
    }
    // shell.openPath(p);
    // remote.getCurrentWindow().blur();
  };
  // registerFuncs.analyzeCCS = (ccspath) => {
  //   if (path.parse(ccspath).ext !== ".ccs") {
  //     return false;
  //   }
  //   var parser = new DOMParser();
  //   var oldpaths = [];
  //   var ccsfile = fs.readFileSync(ccspath, "utf-8");
  //   var xmlDoc = parser.parseFromString(ccsfile, "text/xml");
  //   var root = xmlDoc.getElementsByTagName("RootFolder")[0];
  //   function getPath(node, oldpaths) {
  //     var name = node.getAttribute("Name");
  //     if (node.children.length > 0) {
  //       for (var i = 0; i < node.children.length; i++) {
  //         var pa = path.join(name, getPath(node.children[i], oldpaths));
  //         if (node.children[i].nodeName !== "Folder") {
  //           oldpaths.push(pa);
  //         } else {
  //           name = pa;
  //         }
  //       }
  //     }
  //     return name;
  //   }
  //   getPath(root, oldpaths);
  //   // paths.forEach((name, index) => (paths[index] = path.join(header, name)));
  //   // console.log(paths);
  // };
  // function parseXmlToJson(p) {
  //   // var parser = new DOMParser();
  //   var xml = fs.readFileSync(p, "utf-8");
  //   // var xml = parser.parseFromString(file, "text/xml");
  //   const json = {};
  //   for (const res of xml.matchAll(/(?:<(\w*)(?:\s[^>]*)*>)((?:(?!<\1).)*)(?:<\/\1>)|<(\w*)(?:\s*)*\/>/gm)) {
  //     const key = res[1] || res[3];
  //     const value = res[2] && parseXmlToJson(res[2]);
  //     json[key] = (value && Object.keys(value).length ? value : res[2]) || null;
  //   }
  //   return json;
  // }
  registerFuncs.analyzeFolder = (ccspath, hideResource) => {
    if (!fs.existsSync(path.join(path.dirname(ccspath), "cocosstudio"))) {
      return false;
    }
    var folderpath = path.dirname(ccspath);
    // if (fs.readdirSync(folderpath).every((name) => path.parse(name).ext !== ".ccs")) {
    //   return false;
    // }
    // var t = fs.readdirSync(folderpath).find((name) => path.parse(name).ext == ".ccs");
    // var ccspath = path.join(folderpath, t);
    // registerFuncs.analyzeCCS(p);
    // function walkSync(currentPath) {
    //   var filename = path.parse(currentPath).base;
    //   var obj = {
    //     text: filename,
    //     enabled: true,
    //     path: currentPath,
    //     selected: true,
    //     show: true,
    //   };
    //   if (fs.lstatSync(currentPath).isDirectory()) {
    //     obj.children = [];
    //     obj.enabled = false;
    //     obj.show = false;
    //     fs.readdirSync(currentPath).forEach(function(name) {
    //       var p = path.join(currentPath, name);
    //       var tempobj = walkSync(p);
    //       if (tempobj.enabled == true) {
    //         obj.enabled = true;
    //         obj.show = true;
    //       }
    //       obj.children.push(tempobj);
    //     });
    //   } else if (path.parse(currentPath).ext !== ".csd") {
    //     obj.enabled = false;
    //     obj.show = false;
    //     // if (path.parse(currentPath).ext == ".ccs") {
    //     //   obj.extract = true;
    //     // }
    //   }
    //   return obj;
    // }
    var parser = new DOMParser();
    var ccsfile = fs.readFileSync(ccspath, "utf-8");
    var xmlDoc = parser.parseFromString(ccsfile, "text/xml");
    var root = xmlDoc.getElementsByTagName("RootFolder")[0];
    function walkSync2(currentpath, node) {
      var name = node.getAttribute("Name");
      if (name == ".") {
        name = "cocosstudio";
      }
      var newpath = path.join(currentpath, name);
      var obj = {
        text: name,
        enabled: true,
        path: newpath,
        selected: true,
        show: true,
        isDir: false,
      };
      if (!fs.existsSync(newpath)) {
        obj.enabled = false;
        obj.show = false;
      } else if (fs.lstatSync(newpath).isDirectory()) {
        obj.isDir = true;
        obj.children = [];
        obj.enabled = false;
        obj.show = false;
        for (var i = 0; i < node.children.length; i++) {
          var tempobj = walkSync2(newpath, node.children[i]);
          if (tempobj.enabled == true) {
            obj.enabled = true;
            obj.show = true;
          }
          obj.children.push(tempobj);
        }
        if (!hideResource) {
          obj.enabled = true;
          obj.show = true;
        }
      } else if (hideResource && path.parse(name).ext !== ".csd") {
        obj.enabled = false;
        obj.show = false;
      }
      return obj;
    }
    // var obj1 = walkSync(folderpath);
    var obj2 = walkSync2(folderpath, root);
    // console.log(obj2.show);
    return obj2;
  };
  registerFuncs.convertProjFile = (desPath, filePath, version, isArtTemp) => {
    return new Promise((resolve, reject) => {
      scale9Table = {};
      uuidTable = {};
      zip = new JSZip();
      var creatorFileType = {};
      var parser = new DOMParser();
      if (path.parse(filePath).ext == ".zip") {
        try {
          // var nameTable = {};
          var mainTag = "GameFile";
          switch (version) {
            case "2.3.2.3":
              mainTag = "GameProjectFile";
              break;
          }
          fileTable = {};//儲存prefab和動畫以外的檔案解壓縮後的連結
          moveTable = [];//儲存有額外圖檔的資料
          var animTable = {};//儲存動畫資料等待合併
          var prefabTable = {};//儲存預製檔案資料
          var serializer = new XMLSerializer();
          var zipfile = fs.readFileSync(filePath);
          var mainfolderName = path.parse(filePath).name;
          var newfolderName = mainfolderName;
          var desheader = path.join(desPath, mainfolderName);
          // var tempheader = path.join(desPath, "_tempfolder");

          var index = 1;
          while (fs.existsSync(desheader)) {
            newfolderName = mainfolderName + "_" + index.zeroPad(10);
            desheader = path.join(desPath, newfolderName);
            index++;
          }
          // var cocosheader = path.join(desheader, "cocosstudio");
          var mainHeader = path.join(desPath, newfolderName);
          var csdHeader = path.join(desheader, "ArtTemp", "Csd");
          var imgHeader = path.join(desheader, "ArtTemp", "Img");
          var fntHeader = path.join(desheader, "ArtTemp", "Fnt");
          var particleHeader = path.join(desheader, "ArtTemp", "Particle");
          var spineHeader = path.join(desheader, "ArtTemp", "Spine");
          // if (fs.existsSync(tempheader)) {
          //   fs.removeSync(tempheader);
          // }
          fs.mkdirSync(desheader);
          if (isArtTemp) {
            // fs.mkdirSync(cocosheader);
            fs.mkdirSync(path.join(desheader, "ArtTemp"));
            fs.mkdirSync(path.join(desheader, "ArtTemp", "Img"));
            fs.mkdirSync(path.join(desheader, "ArtTemp", "Csd"));
            fs.mkdirSync(path.join(desheader, "ArtTemp", "Particle"));
            fs.mkdirSync(path.join(desheader, "ArtTemp", "Fnt"));
            fs.mkdirSync(path.join(desheader, "ArtTemp", "Spine"));
          }
          (async () => {
            // var ccsData = xmlBuilder
            //   .create({ version: "1.0" })
            //   .ele("Solution")
            //   .ele("PropertyGroup", { Name: mainfolderName, Version: version, Type: "CocosStudio" })
            //   .up()
            //   .ele("SolutionFolder")
            //   .ele("Group", { ctype: "ResourceGroup" })
            //   .ele("RootFolder", { Name: "." })
            //   .ele("Folder", { Name: "ArtTemp" });
            // var csdFolder = ccsData.ele("Folder", { Name: "Csd" });
            // var imgFolder = ccsData.ele("Folder", { Name: "Img" });
            // var fntFolder = ccsData.ele("Folder", { Name: "Fnt" });
            // var plistFolder = ccsData.ele("Folder", { Name: "Particle" });
            var zipdata = await zip.loadAsync(zipfile);
            var filenames = Object.keys(zipdata.files);
            for (var i = 0; i < filenames.length; i++) {
              var ext = path.parse(filenames[i]).ext;
              if (ext == ".meta") {
                var filepath = path.join(path.dirname(filenames[i]), path.parse(filenames[i]).name);
                var realpath = filepath.replace(/\\/g, "/");
                if (await zipdata.files[realpath]) {
                  var text = await zipdata.files[filenames[i]].async("string");
                  var metadata = JSON.parse(text);
                  var uuid = metadata.uuid;
                  // console.log(uuid, filepath, realpath);
                  // uuidTable[metadata.uuid] = "ArtTemp/Csd/" + path.parse(filepath).base;
                  if (path.parse(filepath).ext == ".prefab") {
                    var prefabtext = await zipdata.files[realpath].async("string");
                    prefabTable[uuid] = { Name: path.parse(filepath).name, Data: JSON.parse(prefabtext), Path: filepath };
                  }
                  else if (path.parse(filepath).ext == ".anim") {
                    var animtext = await zipdata.files[realpath].async("string");
                    animTable[uuid] = JSON.parse(animtext);
                  }
                  else if (path.parse(filepath).ext == ".png" || path.parse(filepath).ext == ".jpg") {
                    var newname = getFolderUniqueName(imgHeader, path.parse(filepath).base);
                    var newpath = path.join(imgHeader, newname);
                    var url = path.join(newfolderName, "ArtTemp", "Img", newname);
                    if (!isArtTemp) {
                      newpath = path.join(mainHeader, filepath);
                      url = filepath;
                    }
                    var content = await zipdata.files[realpath].async("nodebuffer");
                    // console.log("name : " + path.parse(filepath).name);
                    if (metadata.subMetas != null) {
                      var spriteuuid = metadata.subMetas[path.parse(filepath).name].uuid;
                      fileTable[spriteuuid] = { Old: path.parse(filepath).base, New: newname, Path: newpath, Url: url };
                      fileTable[uuid] = { Old: path.parse(filepath).base, New: newname, Path: newpath, Url: url };
                      scale9Table[spriteuuid] = {
                        rawWidth: metadata.subMetas[path.parse(filepath).name].rawWidth,
                        rawHeight: metadata.subMetas[path.parse(filepath).name].rawHeight,
                        Top: metadata.subMetas[path.parse(filepath).name].borderTop,
                        Bottom: metadata.subMetas[path.parse(filepath).name].borderBottom,
                        Left: metadata.subMetas[path.parse(filepath).name].borderLeft,
                        Right: metadata.subMetas[path.parse(filepath).name].borderRight
                      };
                    }
                    fs.mkdirSync(path.dirname(newpath), { recursive: true });
                    fs.writeFileSync(newpath, content);
                    // console.log(spriteuuid, path.join(imgHeader, newname));                 
                    // imgFolder.ele("Image", { Name: newname });
                  }
                  else if (path.parse(filepath).ext == ".fnt") {
                    var newname = getFolderUniqueName(fntHeader, path.parse(filepath).base);
                    var newpath = path.join(fntHeader, newname);
                    var url = path.join(newfolderName, "ArtTemp", "Fnt", newname);
                    if (!isArtTemp) {
                      newpath = path.join(mainHeader, filepath);
                      url = filepath;
                    }
                    var fnttext = await zipdata.files[realpath].async("string");
                    // var fntuuid = metadata.uuid;
                    var imguuid = metadata.textureUuid;
                    var re = /(?<=(file=")).*(?=")/;
                    var imgname = fnttext.match(re)[0];
                    fileTable[uuid] = { Old: path.parse(filepath).base, New: newname, Path: newpath, Url: url };
                    moveTable[imguuid] = { Name: imgname, desHeader: path.dirname(newpath) };
                    fs.mkdirSync(path.dirname(newpath), { recursive: true });
                    fs.writeFileSync(newpath, fnttext);
                    // fntFolder.ele("Fnt", { Name: newname });                    
                  }
                  else if (path.parse(filepath).ext == ".TTF" || path.parse(filepath).ext == ".ttf") {
                    var newname = getFolderUniqueName(fntHeader, path.parse(filepath).base);
                    var newpath = path.join(fntHeader, newname);
                    var url = path.join(newfolderName, "ArtTemp", "Fnt", newname);
                    if (!isArtTemp) {
                      newpath = path.join(mainHeader, filepath);
                      url = filepath;
                    }
                    var content = await zipdata.files[realpath].async("nodebuffer");
                    // var fntuuid = metadata.uuid;
                    fileTable[uuid] = { Old: path.parse(filepath).base, New: newname, Path: newpath, Url: url };
                    fs.mkdirSync(path.dirname(newpath), { recursive: true });
                    fs.writeFileSync(newpath, content);
                    // fntFolder.ele("Fnt", { Name: newname });                    
                  }
                  else if (path.parse(filepath).ext == ".plist") {
                    var newname = getFolderUniqueName(particleHeader, path.parse(filepath).base);
                    var newpath = path.join(particleHeader, newname);
                    var url = path.join(newfolderName, "ArtTemp", "Particle", newname);
                    if (!isArtTemp) {
                      newpath = path.join(mainHeader, filepath);
                      url = filepath;
                    }
                    var particletext = await zipdata.files[realpath].async("string");
                    var particleuuid = metadata.uuid;
                    // var imguuid = metadata.textureUuid;
                    fileTable[particleuuid] = { Old: path.parse(filepath).base, New: newname, Path: newpath, Url: url };
                    // moveTable[imguuid] = particleHeader;
                    fs.mkdirSync(path.dirname(newpath), { recursive: true });
                    fs.writeFileSync(newpath, particletext);
                    // plistFolder.ele("PlistParticleFile", { Name: newname });                    
                  }
                  else if (path.parse(filepath).ext == ".skel" || path.parse(filepath).ext == ".json") {
                    var newname = path.parse(filepath).base;
                    var newpath = path.join(spineHeader, newname);
                    var url = path.join(newfolderName, "ArtTemp", "Spine", newname);
                    if (!isArtTemp) {
                      newpath = path.join(mainHeader, filepath);
                      url = filepath;
                    }
                    var content = await zipdata.files[realpath].async("nodebuffer");
                    var imguuid = metadata.textureUuid;
                    fileTable[uuid] = { Old: path.parse(filepath).base, New: newname, Path: newpath, Url: url };
                    moveTable[imguuid] = { Name: imgname, desHeader: path.dirname(newpath) };
                    fs.mkdirSync(path.dirname(newpath), { recursive: true });
                    fs.writeFileSync(newpath, content);
                  }
                  // else if (path.parse(filepath).ext == ".spine") {//暫時不做名稱重複判斷，只放置檔案不須重連
                  // }
                  else if (path.parse(filepath).ext == ".atlas") {//暫時不做名稱重複判斷，只放置檔案不須重連
                    var newname = path.parse(filepath).base;
                    var newpath = path.join(spineHeader, newname);
                    if (!isArtTemp) {
                      newpath = path.join(mainHeader, filepath);
                    }
                    var content = await zipdata.files[realpath].async("nodebuffer");
                    fs.mkdirSync(path.dirname(newpath), { recursive: true });
                    fs.writeFileSync(newpath, content);
                  }
                  // else if (path.parse(filepath).ext != "") {
                  //   var newname = getFolderUniqueName(tempheader, path.parse(filepath).base);
                  //   var content = await zipdata.files[realpath].async("nodebuffer");
                  //   fs.writeFileSync(path.join(tempheader, newname), content);
                  //   fileTable[uuid] = path.join(tempheader, newname);
                  // }
                }
              }
            }
            // console.log(animTable);
            for (var key in moveTable) {
              if (fileTable[key]) {
                if (fs.existsSync(fileTable[key].Path)) {
                  // var folder = imgFolder;
                  // console.log("move", fileTable[key].Path, "to", path.join(moveTable[key].Header, fileTable[key].New));
                  // switch (moveTable[key].Type) {
                  //   case "Fnt":
                  //     break;
                  // }
                  // folder.ele(moveTable[key].Type, { Name: moveTable[key].newname });
                  // var removenode = imgFolder.find(n => n.node.getAttribute("Name") == moveTable[key].Name);
                  // if (removenode) {
                  //   removenode.remove();
                  // }
                  fs.moveSync(fileTable[key].Path, path.join(moveTable[key].desHeader, fileTable[key].New), { overwrite: true });
                }
              }
            }
            for (var key in prefabTable) {
              actiontagTable = {};//儲存節點標籤號用在動畫上
              var prefabData = prefabTable[key];
              var csdname = prefabData.Name;
              // console.log(csdname);
              var csdData = xmlBuilder
                .create({ version: "1.0" })
                .ele(mainTag)
                .ele("PropertyGroup", { Name: csdname, Type: "Node", ID: key, Version: version })
                .up()
                .ele("Content", { ctype: "GameProjectContent" })
                .ele("Content")
              var animationData = csdData.ele("Animation", { Duration: "0", Speed: "1.000" });
              var animlist = csdData.ele("AnimationList");
              var nodeData = csdData.ele("ObjectData", { Name: "Node", Tag: "165", ctype: "GameNodeObjectData" });
              nodeData.ele("Size", { X: "0.0000", Y: "0.0000" });
              if (prefabData.Data[1]._children.length > 0) {
                var childrendata = nodeData.ele("Children");
                for (var i = 0; i < prefabData.Data[1]._children.length; i++) {
                  // console.log(prefabTable[key].Data[1]._children[i]);
                  walkthourghPrefab(prefabData.Data, prefabData.Data[1]._children[i].__id__, childrendata, "Node", 0, 0, isArtTemp);
                }
              }
              for (var key in actiontagTable) {
                actiontagTable[key].Path = actiontagTable[key].Path.substring(5);
              }
              if (prefabData.Data[1]._components.length > 0) {
                if (prefabData.Data[1]._components.find((component) => prefabData.Data[component.__id__].__type__ == "cc.Animation")) {
                  var componentIndex = prefabData.Data[1]._components.findIndex((component) => prefabData.Data[component.__id__].__type__ == "cc.Animation");
                  var animIndex = prefabData.Data[1]._components[componentIndex].__id__;
                  if (animIndex >= 0 && prefabData.Data[animIndex]._clips != null) {
                    let offsetLength = 0;
                    for (var j = 0; j < prefabData.Data[animIndex]._clips.length; j++) {
                      var animlength = 0;
                      if (prefabData.Data[animIndex]._clips[j] != null) {
                        var animuuid = prefabData.Data[animIndex]._clips[j].__uuid__;
                        if (animTable[animuuid]) {
                          animlength = Math.floor(animTable[animuuid]._duration * 60);
                          animlist.ele("AnimationInfo", { Name: animTable[animuuid]._name, StartIndex: offsetLength.toString(), EndIndex: (offsetLength + animlength).toString() })
                            .ele("RenderColor", { A: 150, R: Math.floor(Math.random() * 255).toString(), G: Math.floor(Math.random() * 255).toString(), B: Math.floor(Math.random() * 255).toString() });
                          // offsetLength += parseInt(animTable[animuuid]._duration * 60);
                          for (var nodepath in animTable[animuuid].curveData.paths) {
                            var actiontag = Object.keys(actiontagTable).find(tag => actiontagTable[tag].Path == nodepath)
                            if (actiontag) {
                              for (var prop in animTable[animuuid].curveData.paths[nodepath].props) {
                                // console.log(prop);
                                var arraylength = animTable[animuuid].curveData.paths[nodepath].props[prop].length;
                                if (arraylength > 0) {
                                  var startframe = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][0].frame * 60);
                                  var endframe = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].frame * 60);
                                  var timelength = endframe - startframe;
                                  // console.log(nodepath, startframe, endframe, animlength, timelength, prop);
                                  switch (prop) {
                                    case "position":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") == "Position" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "Position" })
                                      }
                                      if (startframe > 0) {
                                        // console.log(animTable[animuuid].curveData.paths[nodepath].props[prop][0].value[0], actiontagTable[actiontag].OffsetX);
                                        var startX = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value[0] + actiontagTable[actiontag].OffsetX;
                                        var startY = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value[1] + actiontagTable[actiontag].OffsetY;
                                        // console.log(startX, startY);
                                        if (!animTable[animuuid].curveData.paths[nodepath].props[prop][0]["value"].length) {
                                          startX = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value["x"] + actiontagTable[actiontag].OffsetX;
                                          startY = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value["y"] + actiontagTable[actiontag].OffsetY;
                                        }
                                        // console.log(startX, startY);
                                        startX = defaultNumber(startX, 0);
                                        startY = defaultNumber(startY, 0);
                                        // console.log(startX, startY);
                                        // console.log(startX, startY);
                                        timeline.ele("PointFrame", { FrameIndex: offsetLength.toString(), X: startX.toFixed(4).toString(), Y: startY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60);
                                        // console.log(animTable[animuuid].curveData.paths[nodepath].props[prop][p].value[0], actiontagTable[actiontag].OffsetX);
                                        var x = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value[0] + actiontagTable[actiontag].OffsetX;
                                        var y = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value[1] + actiontagTable[actiontag].OffsetY;
                                        if (!animTable[animuuid].curveData.paths[nodepath].props[prop][p]["value"].length) {
                                          x = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value['x'] + actiontagTable[actiontag].OffsetX;
                                          y = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value['y'] + actiontagTable[actiontag].OffsetY;
                                        }
                                        x = defaultNumber(x, 0);
                                        y = defaultNumber(y, 0);
                                        // console.log(x, y)
                                        timeline.ele("PointFrame", { FrameIndex: (frame + offsetLength).toString(), X: x.toFixed(4).toString(), Y: y.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        if (animTable[animuuid].curveData.paths[nodepath].props[prop][p].motionPath && animTable[animuuid].curveData.paths[nodepath].props[prop][p].motionPath.length > 0) {
                                          var frameNext = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p + 1].frame * 60);
                                          for (var m = 0; m < animTable[animuuid].curveData.paths[nodepath].props[prop][p].motionPath.length; m++) {
                                            var m_x = animTable[animuuid].curveData.paths[nodepath].props[prop][p].motionPath[m][0] + actiontagTable[actiontag].OffsetX;
                                            var m_y = animTable[animuuid].curveData.paths[nodepath].props[prop][p].motionPath[m][1] + actiontagTable[actiontag].OffsetY;
                                            // if (typeof animTable[animuuid].curveData.paths[nodepath].props[prop][p].value == 'object') {
                                            //   m_x = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value['x'] + actiontagTable[actiontag].OffsetX;
                                            //   m_y = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value['y'] + actiontagTable[actiontag].OffsetY;
                                            // }
                                            m_x = defaultNumber(m_x, 0);
                                            m_x = defaultNumber(m_x, 0);
                                            timeline.ele("PointFrame", { FrameIndex: Math.floor((frame + (frameNext - frame) / 2) + offsetLength).toString(), X: m_x.toFixed(4).toString(), Y: m_y.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                          }
                                        }
                                      }
                                      if (animlength > timelength) {
                                        // console.log(animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value[0], actiontagTable[actiontag].OffsetX);
                                        var endX = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value[0] + actiontagTable[actiontag].OffsetX;
                                        var endY = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value[1] + actiontagTable[actiontag].OffsetY;
                                        if (!animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1]["value"].length) {
                                          endX = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value['x'] + actiontagTable[actiontag].OffsetX;
                                          endY = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value['y'] + actiontagTable[actiontag].OffsetY;
                                        }
                                        endX = defaultNumber(endX, 0);
                                        endY = defaultNumber(endY, 0);
                                        // console.log(endX, endY);
                                        timeline.ele("PointFrame", { FrameIndex: (offsetLength + animlength).toString(), X: endX.toFixed(4).toString(), Y: endY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      break;
                                    case "eulerAngles":
                                    case "angle":
                                    case "rotation":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "RotationSkew" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "RotationSkew" });
                                      }
                                      if (startframe > 0) {
                                        var value = -defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][0].value, 0);
                                        if (prop == "eulerAngles") {
                                          value = -animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.z;
                                        }
                                        timeline.ele("ScaleFrame", { FrameIndex: offsetLength.toString(), X: value.toFixed(4).toString(), Y: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60);
                                        var value = -defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][p].value, 0);
                                        if (prop == "eulerAngles") {
                                          value = -defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.z, 0);
                                        }
                                        timeline.ele("ScaleFrame", { FrameIndex: (frame + offsetLength).toString(), X: value.toFixed(4).toString(), Y: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      if (animlength > timelength) {
                                        var value = -defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value, 0);
                                        if (prop == "eulerAngles") {
                                          value = -defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.z, 0);
                                        }
                                        timeline.ele("ScaleFrame", { FrameIndex: (offsetLength + animlength).toString(), X: value.toFixed(4).toString(), Y: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      break;
                                    case "opacity":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") == "Alpha" && n.node.getAttribute("ActionTag") == actiontag)
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "Alpha" });
                                      }
                                      if (startframe > 0) {
                                        var startvalue = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][0].value, 255);
                                        timeline.ele("IntFrame", { FrameIndex: offsetLength.toString(), Value: startvalue.toFixed(0).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60);
                                        var value = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][p].value, 255);
                                        timeline.ele("IntFrame", { FrameIndex: (frame + offsetLength).toString(), Value: value.toFixed(0).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      if (animlength > timelength) {
                                        var endvalue = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value, 255);
                                        timeline.ele("IntFrame", { FrameIndex: (offsetLength + animlength).toString(), Value: endvalue.toFixed(0).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      break;
                                    case "scale":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "Scale" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "Scale" });
                                      }
                                      if (startframe > 0) {
                                        var startX = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.x || 0.1;
                                        var startY = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.y || 0.1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props[prop][0].value == 0) {
                                          startX = 0;
                                          startY = 0;
                                        }
                                        timeline.ele("ScaleFrame", { FrameIndex: offsetLength.toString(), X: startX.toFixed(4).toString(), Y: startY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60);
                                        var x = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value.x || 0.1;
                                        var y = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value.y || 0.1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props[prop][p].value == 0) {
                                          x = 0;
                                          y = 0;
                                        }
                                        // console.log(x, y);
                                        timeline.ele("ScaleFrame", { FrameIndex: (frame + offsetLength).toString(), X: x.toFixed(4).toString(), Y: y.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      if (animlength > timelength) {
                                        var endX = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value.x || 0.1;
                                        var endY = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value.y || 0.1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value == 0) {
                                          endX = 0;
                                          endY = 0;
                                        }
                                        timeline.ele("ScaleFrame", { FrameIndex: (offsetLength + animlength).toString(), X: endX.toFixed(4).toString(), Y: endY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                      }
                                      break;
                                    case "scaleX":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "Scale" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "Scale" });
                                      }
                                      if (startframe > 0) {
                                        var valueX = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value || 0.1;
                                        var valueY = 1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props["scaleY"] && animTable[animuuid].curveData.paths[nodepath].props["scaleY"][0]) {
                                          valueY = animTable[animuuid].curveData.paths[nodepath].props["scaleY"][0].value;
                                        }
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === "0");
                                        if (framedata) {
                                          framedata.att("X", valueX.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: offsetLength.toString(), X: valueX.toFixed(4).toString(), Y: valueY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60) + offsetLength;
                                        var valueX = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value || 0.1;
                                        var valueY = 1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props["scaleY"] && animTable[animuuid].curveData.paths[nodepath].props["scaleY"][p]) {
                                          valueY = animTable[animuuid].curveData.paths[nodepath].props["scaleY"][p].value;
                                        }
                                        // console.log(nodepath, prop, frame, offsetLength, value);
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        if (framedata) {
                                          // console.log(nodepath, prop, frame, value);
                                          framedata.att("X", valueX.toFixed(4).toString());
                                        }
                                        else {
                                          var tempY = valueY.toFixed(4).toString()
                                          if (p - 1 >= 0) {
                                            var prevframe = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p - 1].frame * 60) + offsetLength;
                                            var tempframedata = timeline.find(n => n.node.getAttribute("FrameIndex") === prevframe.toString());
                                            if (tempframedata) {
                                              tempY = tempframedata.node.getAttribute("Y");
                                              // console.log(tempY, "Y");
                                            }
                                          }
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), X: valueX.toFixed(4).toString(), Y: tempY }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      if (animlength > timelength) {
                                        var frame = offsetLength + animlength;
                                        var valueX = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value || 0.1;
                                        var valueY = 1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props["scaleY"] && animTable[animuuid].curveData.paths[nodepath].props["scaleY"][arraylength - 1]) {
                                          valueY = animTable[animuuid].curveData.paths[nodepath].props["scaleY"][arraylength - 1].value;
                                        }
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        if (framedata) {
                                          framedata.att("X", valueX.toFixed(4).toString());
                                        }
                                        else {
                                          // var tempY = "1.0000";
                                          // var tempframedata = timeline.find(n => n.node.getAttribute("FrameIndex") === (frame - 1).toString());
                                          // if (tempframedata) {
                                          //   tempY = tempframedata.node.getAttribute("Y");
                                          // }
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), X: valueX.toFixed(4).toString(), Y: valueY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      break;
                                    case "scaleY":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "Scale" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "Scale" });
                                      }
                                      if (startframe > 0) {
                                        var valueY = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value || 0.1;
                                        var valueX = 1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props["scaleX"] && animTable[animuuid].curveData.paths[nodepath].props["scaleX"][0]) {
                                          valueX = animTable[animuuid].curveData.paths[nodepath].props["scaleX"][0].value;
                                        }
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === "0");
                                        if (framedata) {
                                          framedata.att("Y", valueY.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: offsetLength.toString(), X: "1.0000", Y: valueY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60) + offsetLength;
                                        var valueY = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value || 0.1;
                                        var valueX = 1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props["scaleX"] && animTable[animuuid].curveData.paths[nodepath].props["scaleX"][p]) {
                                          valueX = animTable[animuuid].curveData.paths[nodepath].props["scaleX"][p].value;
                                        }
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        // console.log(nodepath, prop, frame, offsetLength, value);
                                        if (framedata) {
                                          // console.log(nodepath, prop, frame, value);
                                          framedata.att("Y", valueY.toFixed(4).toString());
                                        }
                                        else {
                                          var tempX = valueX.toFixed(4).toString()
                                          if (p - 1 >= 0) {
                                            var prevframe = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p - 1].frame * 60) + offsetLength;
                                            var tempframedata = timeline.find(n => n.node.getAttribute("FrameIndex") === prevframe.toString());
                                            if (tempframedata) {
                                              tempX = tempframedata.node.getAttribute("X");
                                              // console.log(tempX, "X");
                                            }
                                          }
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), X: tempX, Y: valueY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }

                                      }
                                      if (animlength > timelength) {
                                        var frame = offsetLength + animlength;
                                        var valueY = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value || 0.1;
                                        var valueX = 1;
                                        if (animTable[animuuid].curveData.paths[nodepath].props["scaleX"] && animTable[animuuid].curveData.paths[nodepath].props["scaleX"][arraylength - 1]) {
                                          valueX = animTable[animuuid].curveData.paths[nodepath].props["scaleX"][arraylength - 1].value;
                                        }
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        if (framedata) {
                                          framedata.att("Y", valueY.toFixed(4).toString());
                                        }
                                        else {
                                          // var tempX = "1.0000";
                                          // var tempframedata = timeline.find(n => n.node.getAttribute("FrameIndex") === (frame - 1).toString());
                                          // if (tempframedata) {
                                          //   tempX = tempframedata.node.getAttribute("X");
                                          // }
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), X: valueX.toFixed(4).toString(), Y: valueY.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      break;
                                    case "anchorX":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "AnchorPoint" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "AnchorPoint" });
                                      }
                                      if (startframe > 0) {
                                        var value = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][0].value, 0.5);
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === "0");
                                        if (framedata) {
                                          framedata.att("X", value.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: offsetLength.toString(), X: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60) + offsetLength;
                                        var value = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][p].value, 0.5);
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        if (framedata) {
                                          framedata.att("X", value.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), X: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      if (animlength > timelength) {
                                        var frame = offsetLength + animlength;
                                        var value = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value, 0.5);
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        if (framedata) {
                                          framedata.att("X", value.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), X: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      break;
                                    case "anchorY":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "AnchorPoint" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "AnchorPoint" });
                                      }
                                      if (startframe > 0) {
                                        var value = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][0].value, 0.5);
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === "0");
                                        if (framedata) {
                                          framedata.att("Y", value.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: offsetLength.toString(), Y: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60) + offsetLength;
                                        var value = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][p].value, 0.5);
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        if (framedata) {
                                          framedata.att("Y", value.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), Y: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      if (animlength > timelength) {
                                        var frame = offsetLength + animlength;
                                        var value = defaultNumber(animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value, 0.5);
                                        var framedata = timeline.find(n => n.node.getAttribute("FrameIndex") === frame.toString());
                                        if (framedata) {
                                          framedata.att("Y", value.toFixed(4).toString());
                                        }
                                        else {
                                          timeline.ele("ScaleFrame", { FrameIndex: frame.toString(), Y: value.toFixed(4).toString() }).ele("EasingData", { Type: "0" });
                                        }
                                      }
                                      break;
                                    case "active":
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "VisibleForFrame" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "VisibleForFrame" });
                                      }
                                      if (startframe > 0) {
                                        var startvalue = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value == true ? "True" : "False";
                                        timeline.ele("BoolFrame", { FrameIndex: offsetLength.toString(), Value: startvalue });
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60);
                                        var value = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value == true ? "True" : "False";
                                        timeline.ele("BoolFrame", { FrameIndex: (frame + offsetLength).toString(), Value: value });
                                      }
                                      if (animlength > timelength) {
                                        var endvalue = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value == true ? "True" : "False";
                                        timeline.ele("BoolFrame", { FrameIndex: (offsetLength + animlength).toString(), Value: endvalue });
                                      }
                                      break;
                                    case "color":
                                      console.log("color: ");
                                      var timeline = animationData.find(n => n.node.getAttribute("Property") === "CColor" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!timeline) {
                                        timeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "CColor" });
                                      }
                                      if (startframe > 0) {
                                        var startA = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.a || 0;
                                        var startR = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.r || 0;
                                        var startG = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.g || 0;
                                        var startB = animTable[animuuid].curveData.paths[nodepath].props[prop][0].value.b || 0;
                                        var keyframe = timeline.ele("ColorFrame", { FrameIndex: offsetLength.toString(), Alpha: startA.toString() });
                                        keyframe.ele("EasingData", { Type: "0" });
                                        keyframe.ele("Color", { A: startA.toString(), R: startR.toString(), G: startG.toString(), B: startB.toString() });
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].props[prop][p].frame * 60);
                                        var a = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value.a || 0;
                                        var r = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value.r || 0;
                                        var g = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value.g || 0;
                                        var b = animTable[animuuid].curveData.paths[nodepath].props[prop][p].value.b || 0;
                                        var keyframe = timeline.ele("ColorFrame", { FrameIndex: (frame + offsetLength).toString(), Alpha: a.toString() });
                                        keyframe.ele("EasingData", { Type: "0" });
                                        keyframe.ele("Color", { A: a.toString(), R: r.toString(), G: g.toString(), B: b.toString() });
                                      }
                                      if (animlength > timelength) {
                                        var endA = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value.a || 0;
                                        var endR = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value.r || 0;
                                        var endG = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value.g || 0;
                                        var endB = animTable[animuuid].curveData.paths[nodepath].props[prop][arraylength - 1].value.b || 0;
                                        var keyframe = timeline.ele("ColorFrame", { FrameIndex: (offsetLength + animlength).toString(), Alpha: endA.toString() });
                                        keyframe.ele("EasingData", { Type: "0" });
                                        keyframe.ele("Color", { A: endA.toString(), R: endR.toString(), G: endG.toString(), B: endB.toString() });
                                      }
                                      break;
                                  }
                                }
                              }
                              if (animTable[animuuid].curveData.paths[nodepath].comps) {
                                if (animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"]) {
                                  if (animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame) {
                                    var arraylength = animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame.length;
                                    if (arraylength > 0) {
                                      var startframe = Math.floor(animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame[0].frame * 60);
                                      var endframe = Math.floor(animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame[arraylength - 1].frame * 60);
                                      var timelength = endframe - startframe;
                                      var fileTimeline = animationData.find(n => n.node.getAttribute("Property") === "FileData" && n.node.getAttribute("ActionTag") == actiontag);
                                      var blendTimeline = animationData.find(n => n.node.getAttribute("Property") === "BlendFunc" && n.node.getAttribute("ActionTag") == actiontag);
                                      if (!fileTimeline) {
                                        fileTimeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "FileData" });
                                      }
                                      if (!blendTimeline) {
                                        blendTimeline = animationData.ele("Timeline", { ActionTag: actiontag, Property: "BlendFunc" });
                                      }
                                      if (startframe > 0) {
                                        var spriteuuid = animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame[0].value.__uuid__;
                                        if (spriteuuid && fileTable[spriteuuid]) {
                                          var filepath = path.join("ArtTemp", "Img", fileTable[spriteuuid].New);
                                          if (!isArtTemp) {
                                            filepath = fileTable.Path;
                                          }
                                          if (filepath) {
                                            filepath = filepath.replace(/\\/g, "/");//更換路徑格式                                
                                            fileTimeline.ele("TextureFrame", { FrameIndex: offsetLength.toString(), Tween: "False" })
                                              .ele("TextureFile", { Type: "Normal", Path: filepath, Plist: "" });
                                            blendTimeline.ele("BlendFuncFrame", { FrameIndex: offsetLength.toString(), Tween: "False", Src: "1", Dst: "771" });
                                          }
                                        }
                                      }
                                      for (var p = 0; p < arraylength; p++) {
                                        var frame = Math.floor(animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame[p].frame * 60);
                                        var spriteuuid = animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame[p].value.__uuid__;
                                        if (spriteuuid && fileTable[spriteuuid]) {
                                          var filepath = path.join("ArtTemp", "Img", fileTable[spriteuuid].New);
                                          if (!isArtTemp) {
                                            filepath = fileTable.Path;
                                          }
                                          if (filepath) {
                                            filepath = filepath.replace(/\\/g, "/");//更換路徑格式                                 
                                            fileTimeline.ele("TextureFrame", { FrameIndex: (frame + offsetLength).toString(), Tween: "False" })
                                              .ele("TextureFile", { Type: "Normal", Path: filepath, Plist: "" });
                                            blendTimeline.ele("BlendFuncFrame", { FrameIndex: (frame + offsetLength).toString(), Tween: "False", Src: "1", Dst: "771" });
                                          }
                                        }
                                      }
                                      if (animlength > timelength) {
                                        var spriteuuid = animTable[animuuid].curveData.paths[nodepath].comps["cc.Sprite"].spriteFrame[arraylength - 1].value.__uuid__;
                                        if (spriteuuid && fileTable[spriteuuid]) {
                                          var filepath = path.join("ArtTemp", "Img", fileTable[spriteuuid].New);
                                          if (!isArtTemp) {
                                            filepath = fileTable.Path;
                                          }
                                          if (filepath) {
                                            filepath = filepath.replace(/\\/g, "/");//更換路徑格式                                
                                            fileTimeline.ele("TextureFrame", { FrameIndex: (animlength + offsetLength).toString(), Tween: "False" })
                                              .ele("TextureFile", { Type: "Normal", Path: filepath, Plist: "" });
                                            blendTimeline.ele("BlendFuncFrame", { FrameIndex: (animlength + offsetLength).toString(), Tween: "False", Src: "1", Dst: "771" });
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                      offsetLength = offsetLength + animlength + ((j < prefabData.Data[animIndex]._clips.length - 1) ? 5 : 0);
                      animationData.att("Duration", offsetLength.toString());
                    }
                  }
                }
              }
              csdData = csdData.end({ prettyPrint: true, headless: true });
              if (isArtTemp) {
                fs.writeFileSync(path.join(csdHeader, csdname + ".csd"), csdData);
                // csdFolder.ele("Project", { Name: csdname + ".csd", Type: "Node" });
              }
              else {
                fs.writeFileSync(path.join(mainHeader, prefabTable.Path), csdData);
              }
            }
            // ccsData = ccsData.end({ prettyPrint: true, headless: true });
            // fs.writeFileSync(path.join(desheader, mainfolderName + ".ccs"), ccsData);
            // console.log(uuidTable);
            resolve(true);
          })();
        } catch (e) {
          console.log(e);
          resolve(false);
        }
        // console.log("zip");
      } else if (path.parse(filePath).ext == ".ccs") {
        try {
          var fulltext = fs.readFileSync(filePath, "utf-8");
          var xmlDoc = parser.parseFromString(fulltext, "text/xml");
          var folderRoot = zip.folder("ArtTemp");
          var folderAnim = folderRoot.folder("Animation");
          var folderPrefab = folderRoot.folder("Prefab");
          var folderImg = folderRoot.folder("Img");
          var folderFnt = folderRoot.folder("Fnt");
          var folderParticle = folderRoot.folder("Particle");
          var prefabCheck = false;
          var imgCheck = false;
          var fntCheck = false;
          var particleCheck = false;
          //產生基本資料夾>>
          var mainfolder = xmlDoc.getElementsByTagName("PropertyGroup")[0];
          var rootfolder = xmlDoc.getElementsByTagName("RootFolder")[0];
          var mainfolderName = mainfolder.getAttribute("Name");
          var newname = mainfolderName;
          var finalPath = path.join(desPath, mainfolderName + ".zip");
          var index = 1;
          while (fs.existsSync(finalPath)) {
            newname = mainfolderName + "_" + index.zeroPad(10);
            finalPath = path.join(desPath, newname + ".zip");
            index++;
          }
          // 取得ccs內所有檔案>>
          var header = path.join(path.dirname(filePath), "cocosstudio");
          var csdFiles = getCCSFiles(xmlDoc, ".csd");
          var allFiles = getCCSFiles(xmlDoc, "");
          // console.log(csdFiles);
          // 根據檔案類型放置到對應的資料夾
          for (var i = 0; i < csdFiles.length; i++) {
            var oldpath = path.join(header, csdFiles[i]);
            if (fs.existsSync(oldpath)) {
              var filename = path.parse(csdFiles[i]).name;
              var newname = checkZipDupName(filename, ".prefab", "ArtTemp/Prefab");
              if (!creatorFileType[newname + ".prefab"]) {
                creatorFileType[newname + ".prefab"] = "prefab";
              }
              var csdfile = parser.parseFromString(fs.readFileSync(oldpath, "utf-8"), "text/xml");
              var entrynode = csdfile.getElementsByTagName("ObjectData")[0];
              var prefabstart = createCCObject("cc.Prefab");
              var prefabData = [prefabstart];
              var tagTable = createTagTable(entrynode, { path: "", offsetX: 0, offsetY: 0 });
              var animTable = createAnimTable(csdfile.getElementsByTagName("Animation")[0], csdfile.getElementsByTagName("AnimationList")[0], tagTable, path.parse(csdFiles[i]).name);
              prefabData = prefabData.concat(walkthourghCSD(entrynode, 0, 0, animTable, [0, 0], header));
              setPrefabUUID(prefabData);
              var metafile = createCCMeta(header, csdFiles[i], newname);
              folderPrefab.file(newname + ".prefab", JSON.stringify(prefabData, null, 2));
              folderPrefab.file(newname + ".prefab" + ".meta", JSON.stringify(metafile, null, 2));
              for (var j = 0; j < animTable.length; j++) {
                if (!creatorFileType[animTable[j]._name + ".anim"]) {
                  creatorFileType[animTable[j]._name + ".anim"] = "animation-clip";
                }
              }
              prefabCheck = true;
              // console.log(scale9Table);
            }
          }
          for (var i = 0; i < allFiles.length; i++) {
            // var filebase = path.parse(allFiles[i]).base;
            var oldpath = path.join(header, allFiles[i]);
            if (fs.existsSync(oldpath)) {
              var filename = path.parse(allFiles[i]).name;
              var ext = path.parse(allFiles[i]).ext;
              switch (ext) {
                case ".png":
                case ".jpg":
                  var newname = checkZipDupName(filename, ext, "ArtTemp/Img");
                  if (!creatorFileType[newname + ext]) {
                    creatorFileType[newname + ext] = "texture";
                  }
                  var metafile = createCCMeta(header, allFiles[i], newname);
                  folderImg.file(newname + ext, fs.readFileSync(oldpath));
                  folderImg.file(newname + ext + ".meta", JSON.stringify(metafile, null, 2));
                  imgCheck = true;
                  break;
                case ".fnt":
                  var newname = checkZipDupName(filename, ext, "ArtTemp/Fnt");
                  if (!creatorFileType[newname + ext]) {
                    creatorFileType[newname + ext] = "bitmap-font";
                  }
                  var metafile = createCCMeta(header, allFiles[i], newname);
                  folderFnt.file(newname + ext, fs.readFileSync(oldpath));
                  folderFnt.file(newname + ext + ".meta", JSON.stringify(metafile, null, 2));
                  var fntfile = fs.readFileSync(oldpath, "utf-8");
                  var re = /(?<=(file=")).*(?=")/;
                  var pngname = fntfile.match(re)[0];
                  if (pngname) {
                    var pngpath = path.join(path.dirname(oldpath), pngname);
                    if (fs.existsSync(pngpath)) {
                      if (!creatorFileType[pngname]) {
                        creatorFileType[pngname] = "texture";
                      }
                    }
                  }
                  fntCheck = true;
                  break;
                case ".plist":
                  var newname = checkZipDupName(filename, ext, "ArtTemp/Particle");
                  if (!creatorFileType[newname + ext]) {
                    creatorFileType[newname + ext] = "particle";
                  }
                  var metafile = createCCMeta(header, allFiles[i], newname);
                  folderParticle.file(newname + ext, fs.readFileSync(oldpath));
                  folderParticle.file(newname + ext + ".meta", JSON.stringify(metafile, null, 2));
                  var plisttext = fs.readFileSync(oldpath, "utf-8");
                  var xmlPlist = parser.parseFromString(plisttext, "text/xml");
                  var plistEles = xmlPlist.getElementsByTagName("*");
                  for (var x = 0; x < plistEles.length; x++) {
                    if (plistEles[x].childNodes[0] && plistEles[x].childNodes[0].nodeValue == "textureFileName") {
                      if (!plistEles[x + 2] || (plistEles[x + 3] && !plistEles[x + 3].childNodes[0])) {
                        var pngname = plistEles[x + 1].childNodes[0].nodeValue;
                        var pngnowpath = path.join(path.dirname(oldpath), pngname);
                        if (fs.existsSync(pngnowpath)) {
                          if (!creatorFileType[pngname]) {
                            creatorFileType[pngname] = "texture";
                          }
                          var p = path.join(path.dirname(allFiles[i]), pngname);
                          var pngmeta = createCCMeta(header, p, path.parse(pngname).name);
                          folderParticle.file(pngname, fs.readFileSync(pngnowpath));
                          folderParticle.file(pngname + ".meta", JSON.stringify(pngmeta, null, 2));
                        }
                      }
                    }
                  }
                  particleCheck = true;
                  break;
              }
            }
          }
          //刪除空資料夾
          if (Object.keys(zip.files).some((file) => path.parse(file).ext == ".anim") == false) {
            zip.remove("ArtTemp/Animation");
          }
          if (prefabCheck == false) {
            zip.remove("ArtTemp/Prefab");
          }
          if (imgCheck == false) {
            zip.remove("ArtTemp/Img");
          }
          if (fntCheck == false) {
            zip.remove("ArtTemp/Fnt");
          }
          if (particleCheck == false) {
            zip.remove("ArtTemp/Particle");
          }
          zip.file("&asset&type&.json", JSON.stringify(creatorFileType, null, 2));
          zip
            .generateNodeStream({ type: "nodebuffer", streamFiles: true })
            .pipe(fs.createWriteStream(finalPath))
            .on("finish", function () {
              resolve(true);
            });
          // console.log(pathTable);
          // console.log(uuidTable);
          // console.log(csdFiles);
        } catch (e) {
          console.log(e);
          resolve(false);
        }
      }
    });
  };
  // 將設定的 function 掛載到 window 上
  window.registerFuncs = registerFuncs;
});
