import { _decorator, Asset, Texture2D, AudioClip, isValid, director, Sprite, SpriteFrame, AudioSource, ImageAsset, Scheduler, assetManager, JsonAsset, Component, error, sp, native, log, warn } from 'cc';
import { JSB ,NATIVE} from 'cc/env';
import { Http } from '../../Script/Net/Network/Http';
const { ccclass, property } = _decorator;




const B64STR_DIV_COUNT = 5;

function dataURL2Image(base64String:string, callback) {
  let image = new Image();
  image.onload = function() {
    callback(image);
  };
  image.src = base64String;
}

function blob2DataUrl(blob:Blob, callback) {
  var reader = new FileReader();
  reader.onload = function () {
    callback(reader.result);
  };
  reader.readAsDataURL(blob);
}

/*
MIT LICENSE
Copyright 2011 Jon Leighton
https://gist.github.com/jonleighton/958841
*/
function base64ArrayBuffer(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  
  return base64
}

const MAX_RETRIES = 3;

/**
 * 檔案存儲幫助類別 - 用於手機環境下的檔案存儲
 * 注意：版本管理現在由 ResourceLoader 的記憶體快取和 localStorage/version.json 系統處理
 */
class FileStorageHelper {
    private static readonly CACHE_DIR = "resource_cache";

    /**
     * 儲存資源到檔案（純檔案存儲，不處理版本）
     * @param fileKey 檔案鍵名
     * @param data 原始資料（NATIVE 環境）或 Base64 編碼的資料（web 環境）
     */
    static saveResource(fileKey: string, data: string | ArrayBuffer): void {
        if (!NATIVE) return;

        try {
            const cacheDir = native.fileUtils.getWritablePath() + this.CACHE_DIR + "/";
            const resourceFile = cacheDir + fileKey;

            // 確保目錄存在
            if (!native.fileUtils.isDirectoryExist(cacheDir)) {
                native.fileUtils.createDirectory(cacheDir);
            }

            // NATIVE 環境：根據資料類型選擇儲存方法
            let success: boolean;
            if (data instanceof ArrayBuffer) {
                // 二進制資料：直接寫入檔案
                success = native.fileUtils.writeDataToFile(new Uint8Array(data), resourceFile);
            } else {
                // 字串資料：寫入字串
                success = native.fileUtils.writeStringToFile(data, resourceFile);
            }

            if (!success) {
                error("儲存資源檔案失敗:", resourceFile);
                return;
            }

        } catch (error) {
            error("檔案儲存失敗:", error);
        }
    }

    /**
     * 從檔案載入資源
     * @param fileKey 檔案鍵名
     * @returns 原始資料（NATIVE 環境）或 null
     */
    static loadResource(fileKey: string): string | ArrayBuffer | null {
        if (!NATIVE) return null;

        try {
            const cacheDir = native.fileUtils.getWritablePath() + this.CACHE_DIR + "/";
            const resourceFile = cacheDir + fileKey;

            if (!native.fileUtils.isFileExist(resourceFile)) {
                return null;
            }

            // NATIVE 環境：根據檔案類型選擇讀取方法
            // 對於圖片檔案，我們需要讀取二進制資料
            if (fileKey.toLowerCase().includes('.png') ||
                fileKey.toLowerCase().includes('.jpg') ||
                fileKey.toLowerCase().includes('.jpeg') ||
                fileKey.toLowerCase().includes('.gif') ||
                fileKey.toLowerCase().includes('.webp')) {
                // 讀取二進制資料
                log(`[FileStorageHelper] 讀取二進制檔案: ${resourceFile}`);
                const data = native.fileUtils.getDataFromFile(resourceFile);
                log(`[FileStorageHelper] 二進制資料類型: ${typeof data}, 長度: ${data ? (data as any).length || (data as any).byteLength : 'null'}`);
                return data ? data : null;
            } else {
                // 讀取字串資料
                log(`[FileStorageHelper] 讀取字串檔案: ${resourceFile}`);
                const data = native.fileUtils.getStringFromFile(resourceFile);
                log(`[FileStorageHelper] 字串資料長度: ${data ? data.length : 'null'}`);
                return data;
            }

        } catch (error) {
            error("檔案讀取失敗:", error);
            return null;
        }
    }


    /**
     * 檢查檔案是否存在
     * @param fileKey 檔案鍵名
     * @returns 是否存在
     */
    static isResourceExist(fileKey: string): boolean {
        if (!NATIVE) return false;

        try {
            const cacheDir = native.fileUtils.getWritablePath() + this.CACHE_DIR + "/";
            const resourceFile = cacheDir + fileKey;
            return native.fileUtils.isFileExist(resourceFile);
        } catch (error) {
            return false;
        }
    }

    /**
     * 測試檔案存儲功能（僅測試檔案讀寫，版本管理由 ResourceLoader 處理）
     */
    static testFileStorage(): void {
        if (!NATIVE) {
            log("[FileStorageHelper] 非手機環境，跳過檔案存儲測試");
            return;
        }

        log("[FileStorageHelper] 開始測試檔案存儲功能...");

        const testKey = "test_resource_file_only";
        const testData = "這是測試資料，包含中文和特殊字符！@#$%^&*()";

        try {
            // 測試儲存（不包含版本）
            this.saveResource(testKey, testData);
            log("[FileStorageHelper] ✅ 測試資料儲存成功");

            // 測試讀取
            const loadedData = this.loadResource(testKey);
            if (loadedData === testData) {
                log("[FileStorageHelper] ✅ 測試資料讀取成功");
            } else {
                log("[FileStorageHelper] ❌ 測試資料讀取失敗");
                log("[FileStorageHelper] 期望:", testData);
                log("[FileStorageHelper] 實際:", loadedData);
            }

            // 測試檔案存在檢查
            if (this.isResourceExist(testKey)) {
                log("[FileStorageHelper] ✅ 檔案存在檢查成功");
            } else {
                log("[FileStorageHelper] ❌ 檔案存在檢查失敗");
            }

            log("[FileStorageHelper] 檔案存儲測試完成");

        } catch (error) {
            error("[FileStorageHelper] 檔案存儲測試失敗:", error);
        }
    }
}

enum LoaderState {
    Idle,
    Loading,
    Error, // Optional, for handling errors
}



interface FileDescriptor {
    key: string;
    url: string;
    priority: number;
    type: 'image' | 'music' | 'json' | 'spine';
    useComp?: Component;
    retryCount: number;
    saveToLocal: boolean;
    callBack?: (err: Error, asset: any) => void;
}
  
@ccclass('ResourceLoader')
export class ResourceLoader{
    private state: LoaderState = LoaderState.Idle;
    private queue: FileDescriptor[] = [];
    private cache: Map<string, any> = new Map(); // Cache in memory
    private versionInfo: JsonAsset = null;
    
    private constructor() {
      this.ScheduleQueueProcessing();
    }

    private static m_instance:ResourceLoader = null;
    static get Instance (){
        if(!isValid(this.m_instance)){
          this.m_instance = new ResourceLoader();
          // 移除自動載入版本資料，改為在每次下載前動態載入
        }
        if(!director.getScheduler().isScheduled(this.m_instance.update, this.m_instance)){
          this.m_instance.ScheduleQueueProcessing();
        }
        return this.m_instance;
    }
    

    private CheckVersion(key:string, localVersion:string){
      if(!isValid(this.versionInfo) || !isValid(localVersion)) return false; // 沒有版本資訊時，視為版本不同
      let remoteVersion = this.versionInfo.json[key];
      if(remoteVersion === null || remoteVersion === undefined) return false; // 沒有遠端版本，視為版本不同
      
      const versionMatch = remoteVersion === localVersion;
      log(`🔍 版本檢查: ${key}`)
      log(`   本地版本: ${localVersion}`)
      log(`   遠端版本: ${remoteVersion}`)
      log(`   結果: ${versionMatch ? '版本相同' : '版本不同'}`)
      
      return versionMatch; // true = 版本相同，false = 版本不同（需要下載）
    }

    private GetVersion(key:string){
      if( isValid(this.versionInfo) && isValid(this.versionInfo.json) ){
        return isValid(this.versionInfo.json[key])? this.versionInfo.json[key].toString() : '0';
      }
      return '0';
    }

    private ScheduleQueueProcessing() {
      // Schedule the CheckQueue function to be called periodically
      Scheduler.enableForTarget(this)
      director.getScheduler().scheduleUpdate(this, Scheduler.Priority.MEDIUM, false);
    }
    
    // Ensure to unschedule the process when it's no longer needed
    public UnscheduleQueueProcessing() {
      director.getScheduler().unscheduleUpdate(this);
    }

    update(dt:number) {
      try{
        this.CheckQueue();
      }catch(e){
        this.state = LoaderState.Idle;
        error(e)
      }
    }
    



    
    /**
     * 創建簡單檔案描述符（接受完整 URL，用於新架構）
     * @param key 檔案鍵名
     * @param fullURL 完整的 URL
     * @param type 檔案類型
     * @param useComp 使用的元件
     * @param callback 回調函數
     * @param saveToLocal 是否保存到本地
     * @param priority 優先級
     */
    static CreateSimpleFileDescriptor(key: string, fullURL: string, type:'image'|'music'|'json'|'spine', useComp?:Component, callback?:(err,ast)=>void, saveToLocal:boolean = true, priority:number = 1):FileDescriptor{
      let data = {} as FileDescriptor;
        data.key = key;
        data.url = fullURL;
        data.priority = priority;
        data.type = type;
        data.useComp = useComp;
        data.retryCount = 0;
        data.saveToLocal = saveToLocal;
        data.callBack = callback;
      return data;
    }
    
    /**
     * 檢查快取中是否有指定的資源
     * @param key 資源鍵名
     * @returns 快取的資源或 null
     */
    GetCachedAsset(key: string): any | null {
        return this.cache.get(key) || null;
    }
    
    /**
     * 設置版本資料
     * @param versionData 版本資料
     */
    SetVersionInfo(versionData: JsonAsset): void {
        this.versionInfo = versionData;
    }
    
    /**
     * 檢查本地資源
     * @param fileName 檔案名稱
     * @param callback 回調函數
     */
    CheckLocalResource(fileName: string, callback: (localAsset: any) => void): void {
        try {
            // 🔍 NATIVE 環境：檢查本地檔案系統
            if (typeof native !== 'undefined' && native.fileUtils) {
                const cacheDir: string = native.fileUtils.getWritablePath() + "resource_cache/"
                const localFilePath: string = cacheDir + fileName
                const fileExists: boolean = native.fileUtils.isFileExist(localFilePath)
                
                if (fileExists) {
                    log(`📁 找到本地檔案: ${localFilePath}`)
                    
                    // 根據檔案類型載入本地資源
                    this.LoadLocalAsset(fileName, localFilePath, callback)
                } else {
                    log(`❌ 本地檔案不存在: ${localFilePath}`)
                    callback(null)
                }
            } else {
                // WEB 環境：無本地檔案系統
                log(`🌐 WEB 環境：無本地檔案系統檢查`)
                callback(null)
            }
        } catch (errorMsg) {
            error(`❌ 檢查本地資源時發生錯誤: ${errorMsg}`)
            callback(null)
        }
    }
    
    /**
     * 載入本地資產
     * @param fileName 檔案名稱
     * @param filePath 檔案路徑
     * @param callback 回調函數
     */
    private LoadLocalAsset(fileName: string, filePath: string, callback: (localAsset: any) => void): void {
        try {
            const fileExtension: string = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
            
            // 根據檔案類型處理
            if (fileExtension === '.png' || fileExtension === '.jpg' || fileExtension === '.jpeg') {
                this.LoadLocalImageAsset(fileName, filePath, callback)
            } else if (fileExtension === '.json') {
                this.LoadLocalJsonAsset(fileName, filePath, callback)
            } else if (fileExtension === '.atlas' || fileExtension === '.skel') {
                this.LoadLocalSpineAsset(fileName, filePath, callback)
            } else {
                warn(`⚠️ 不支援的檔案類型: ${fileExtension}`)
                callback(null)
            }
        } catch (errorMsg) {
            error(`❌ 載入本地資產時發生錯誤: ${errorMsg}`)
            callback(null)
        }
    }
    
    /**
     * 載入本地圖片資產
     * @param fileName 檔案名稱
     * @param filePath 檔案路徑
     * @param callback 回調函數
     */
    private LoadLocalImageAsset(fileName: string, filePath: string, callback: (localAsset: any) => void): void {
        try {
            // 讀取本地圖片檔案
            const imageData: ArrayBuffer = native.fileUtils.getDataFromFile(filePath)
            
            if (!imageData || imageData.byteLength === 0) {
                error(`❌ 無法讀取本地圖片檔案: ${filePath}`)
                callback(null)
                return
            }
            
            // 建立簡化的本地圖片資產物件
            // 注意：這裡返回原始數據，實際的 SpriteFrame 創建需要進一步處理
            const localAsset = {
                name: fileName,
                type: 'image',
                source: 'local',
                filePath: filePath,
                rawData: imageData,
                dataSize: imageData.byteLength,
                // 標記為本地資源，可以被 ResourceManager 識別
                isLocalFile: true
            }
            
            log(`✅ 本地圖片資產載入成功: ${fileName}`)
            callback(localAsset)
        } catch (errorMsg) {
            error(`❌ 載入本地圖片資產失敗: ${errorMsg}`)
            callback(null)
        }
    }
    
    /**
     * 載入本地 JSON 資產
     * @param fileName 檔案名稱
     * @param filePath 檔案路徑
     * @param callback 回調函數
     */
    private LoadLocalJsonAsset(fileName: string, filePath: string, callback: (localAsset: any) => void): void {
        try {
            // 讀取本地 JSON 檔案
            const jsonString: string = native.fileUtils.getStringFromFile(filePath)
            
            if (!jsonString) {
                error(`❌ 無法讀取本地 JSON 檔案: ${filePath}`)
                callback(null)
                return
            }
            
            const jsonData = JSON.parse(jsonString)
            
            const localAsset = {
                name: fileName,
                type: 'json',
                source: 'local',
                filePath: filePath,
                json: jsonData
            }
            
            log(`✅ 本地 JSON 資產載入成功: ${fileName}`)
            callback(localAsset)
        } catch (errorMsg) {
            error(`❌ 載入本地 JSON 資產失敗: ${errorMsg}`)
            callback(null)
        }
    }
    
    /**
     * 載入本地 Spine 資產
     * @param fileName 檔案名稱
     * @param filePath 檔案路徑
     * @param callback 回調函數
     */
    private LoadLocalSpineAsset(fileName: string, filePath: string, callback: (localAsset: any) => void): void {
        try {
            // Spine 資產需要多個檔案，這裡簡化處理
            // 實際使用中需要檢查 .atlas、.png、.skel 等檔案
            const localAsset = {
                name: fileName,
                type: 'spine',
                source: 'local',
                filePath: filePath,
                skeletonData: null // 需要進一步實現 Spine 資料載入
            }
            
            log(`✅ 本地 Spine 資產標記成功: ${fileName}`)
            callback(localAsset)
        } catch (errorMsg) {
            error(`❌ 載入本地 Spine 資產失敗: ${errorMsg}`)
            callback(null)
        }
    }

    Enqueue(file: FileDescriptor) {
      if(this.cache.has(file.key)){
        log(`💾 記憶體快取命中，直接使用: ${file.key}`);
        this.OnFileLoaded(null, file, this.cache.get(file.key), false);
        return;
      }
      this.queue.push(file);
      this.queue.sort((a, b) => b.priority - a.priority); // Sort by priority
      if ( this.state === LoaderState.Idle ) {
        try{
          this.CheckQueue();
        }catch(e){
          this.state = LoaderState.Idle;
          error(e)
        }
      }
    }
  
    private CheckQueue() {
      if ( this.state === LoaderState.Idle ) {
        if (this.queue.length > 0) {
          this.LoadNextInQueue();
        }
      }
    }
  
    private LoadNextInQueue() {
      if (this.queue.length === 0) {
        this.state = LoaderState.Idle;
        return;
      }
  
      const fileDescriptor = this.queue.shift();
      if (!fileDescriptor) {
        this.state = LoaderState.Idle;
        return;
      }
      
      this.state = LoaderState.Loading;
      this.loadFile(fileDescriptor);
    }
  
    private loadFile(file: FileDescriptor) {
      // Simulate loading
      // log(`Loading ${file.url}...`);

      // This is where you'd integrate with Cocos' loading mechanisms,
      // such as cc.assetManager for assets or XMLHttpRequest for other files.
      // Determine the load method based on the file type
      
      let localData = this.LoadFromLocal(file);
      let localVersion = this.LoadVersionFromLocal(file);
      
      // 檢查版本：true = 版本相同（可以使用本地資料），false = 版本不同（需要網路下載）
      const versionMatches = this.CheckVersion(file.key, localVersion);
      
      if(isValid(localData) && versionMatches){
        log(`✅ 版本相同且有本地資料: ${file.key}`)

        if(file.type == 'image'){
          if(NATIVE){
            // NATIVE 環境：將本地二進制資料轉換為可用格式
            log(`📱 [NATIVE] 使用本地檔案: ${file.key}`);
            try {
              if(localData instanceof ArrayBuffer && localData.byteLength > 0){
                // 在 NATIVE 環境中，我們仍需轉換為 base64 以確保 JSB 兼容性
                log(`📱 [NATIVE] 處理本地二進制資料: ${file.key} (${localData.byteLength} bytes)`);
                let base64String = 'data:image/png;base64,' + base64ArrayBuffer(localData);
                log(`📱 [NATIVE] 本地檔案轉換為 DataURL: ${file.key}`);
                
                // 使用 assetManager.loadRemote 來處理 DataURL，這是最安全的方式
                assetManager.loadRemote<ImageAsset>(base64String, {ext:'.png'}, (err, imageAsset)=>{
                  if (!err && imageAsset) {
                    try {
                      let tex = new Texture2D();
                      tex.image = imageAsset;
                      
                      let sp = new SpriteFrame();
                      sp.texture = tex;
                      
                      log(`✅ [NATIVE] 本地檔案載入成功: ${file.key}`);
                      this.OnFileLoaded(null, file, sp.addRef());
                    } catch (e) {
                      error(`❌ [NATIVE] SpriteFrame 創建失敗: ${file.key}`, e);
                      warn(`⚠️ [NATIVE] 本地檔案處理失敗，改用網路下載: ${file.key}`);
                      this.loadFromNetwork(file);
                    }
                  } else {
                    error(`❌ [NATIVE] assetManager.loadRemote 失敗: ${file.key}`, err);
                    warn(`⚠️ [NATIVE] 本地檔案處理失敗，改用網路下載: ${file.key}`);
                    this.loadFromNetwork(file);
                  }
                })
                return;
              } else {
                throw new Error("本地資料無效或為空");
              }
            } catch (e) {
              warn(`⚠️ [NATIVE] 本地檔案處理失敗，改用網路下載: ${file.key}`, e);
              this.loadFromNetwork(file);
              return;
            }
          }else{
            // 非 NATIVE 環境：使用 base64 資料
            log(`💾 [WEB] 使用本地快取資料: ${file.key}`);
            if(typeof localData === 'string'){
              dataURL2Image(localData, (image:HTMLImageElement)=>{
                let img = new ImageAsset(image);
                let tex = new Texture2D();
                tex.image = img;
                let sp = new SpriteFrame();
                sp.texture = tex;
                this.OnFileLoaded(null, file, sp.addRef());
              })
            }
          }
        }
        else if(file.type == 'music'){
          if(NATIVE){
            // NATIVE 環境：將本地二進制資料轉換為可用格式
            log(`📱 [NATIVE] 使用本地音樂檔案: ${file.key}`);
            try {
              if(localData instanceof ArrayBuffer && localData.byteLength > 0){
                // 在 NATIVE 環境中，我們仍需轉換為 base64 以確保 JSB 兼容性
                log(`📱 [NATIVE] 處理本地音樂二進制資料: ${file.key} (${localData.byteLength} bytes)`);
                let base64String = 'data:audio/mpeg;base64,' + base64ArrayBuffer(localData);
                log(`📱 [NATIVE] 本地音樂檔案轉換為 DataURL: ${file.key}`);
                
                assetManager.loadRemote<AudioClip>(base64String, {ext:'.mp3'}, (err, audioClip)=>{
                  if (!err) {
                    log(`✅ [NATIVE] 本地音樂檔案載入成功: ${file.key}`);
                  } else {
                    warn(`⚠️ [NATIVE] 本地音樂檔案載入失敗: ${file.key}`, err);
                  }
                  this.OnFileLoaded(err, file, audioClip);
                })
                return;
              } else {
                throw new Error("本地音樂資料無效或為空");
              }
            } catch (e) {
              warn(`⚠️ [NATIVE] 本地音樂檔案處理失敗，改用網路下載: ${file.key}`, e);
              this.loadFromNetwork(file);
              return;
            }
          }else{
            // 非 NATIVE 環境：使用 base64 資料
            log(`💾 [WEB] 使用本地快取音樂: ${file.key}`);
            if(typeof localData === 'string'){
              assetManager.loadRemote<AudioClip>(localData, {ext:'.mp3'}, (err, audioClip)=>{
                this.OnFileLoaded(null, file, audioClip);
              })
            }
          }
        }
        else if(file.type == 'json'){
          if(NATIVE){
            // NATIVE 環境：從檔案讀取字串資料
            log(`📱 [NATIVE] 使用本地檔案讀取 JSON: ${file.key}`);
            let rawData = FileStorageHelper.loadResource(file.key);
            if(rawData && typeof rawData === 'string'){
              try {
                let ja = new JsonAsset();
                ja.json = JSON.parse(rawData);
                log(`✅ [NATIVE] 本地 JSON 解析成功: ${file.key}`);
                this.OnFileLoaded(null, file, ja);
              } catch (e) {
                error(`❌ [NATIVE] JSON 解析失敗，改用網路下載: ${file.key}`, e);
                // 如果解析失敗，繼續網路載入
                this.loadFromNetwork(file);
                return;
              }
            }else{
              // 如果讀取失敗，繼續網路載入
              log(`⚠️ [NATIVE] 本地 JSON 讀取失敗，改用網路下載: ${file.key}`);
              this.loadFromNetwork(file);
              return;
            }
          }else{
            // 非 NATIVE 環境：使用 base64 資料
            log(`💾 [WEB] 使用本地快取 JSON: ${file.key}`);
            if(typeof localData === 'string'){
              let ja = new JsonAsset();
              ja.json = JSON.parse(localData);
              log(`✅ [WEB] 本地 JSON 解析成功: ${file.key}`);
              this.OnFileLoaded(null, file, ja);
            }
          }
        }
        return ;
      }

      // 網路載入
      log(`🌐 版本不同或無本地資料，開始網路下載: ${file.key}`);
      this.loadFromNetwork(file);
    }

    private loadFromNetwork(file: FileDescriptor) {
      // Ask Through HTTP
      log(`🌐 開始網路下載: ${file.key} from ${file.url}`);


      Http
        .Get(file.url)
        .Timeout(8000)
        .ResponseType(file.type == 'json'? Http.ResponseType.TEXT : Http.ResponseType.BUFFER) // Use blob for binary data like images and music
        .OnFinish((isSuccess:boolean)=>{
          if (!isSuccess) {
            this.state = LoaderState.Idle;
            error(`Failed to download: ${file.url}`);
            this.RunCallBack(new Error('Network error'), file, null);    
          }
        })
        .OnResponse((resp:any)=>{
          log(`✅ 網路下載成功: ${file.key} (${resp?.byteLength || resp?.length || 'unknown'} bytes)`);
          if(file.type == 'json'){
            let ja = new JsonAsset();
            try {
              ja.json = JSON.parse(resp);
              log(`📄 JSON 解析成功: ${file.key}`);
            } catch (e) {
              this.state = LoaderState.Idle;
              error(`❌ JSON 解析失敗: ${file.url}`, e);
              this.RunCallBack(new Error('JSON parse error'), file, null);
              return;
            }
            this.SaveToLocal(file, resp);
            this.OnFileLoaded(null, file, ja);
          }else{
            if(NATIVE){
              // NATIVE 環境：直接儲存原始二進制資料
              log(`💾 [NATIVE] 儲存原始二進制資料到本地: ${file.key}`);
              this.SaveToLocal(file, resp);
              if(file.type == 'image'){
                // NATIVE 環境：使用 assetManager.loadRemote 處理 DataURL
                log(`🖼️ [NATIVE] 網路下載圖片轉換為 SpriteFrame: ${file.key}`);
                let base64String = 'data:image/png;base64,' + base64ArrayBuffer(resp);
                assetManager.loadRemote<ImageAsset>(base64String, {ext:'.png'}, (err, imageAsset)=>{
                  if (!err && imageAsset) {
                    let tex = new Texture2D();
                    tex.image = imageAsset;
                    let sp = new SpriteFrame();
                    sp.texture = tex;
                    log(`✅ [NATIVE] 圖片 SpriteFrame 創建成功: ${file.key}`);
                    this.OnFileLoaded(null, file, sp.addRef());
                  } else {
                    error(`❌ [NATIVE] 網路圖片處理失敗: ${file.key}`, err);
                    this.OnFileLoaded(new Error('Image processing failed'), file, null);
                  }
                })
              }
              else if(file.type == 'music'){
                // NATIVE 環境：使用 base64 創建 AudioClip 以確保 JSB 兼容性
                log(`🎵 [NATIVE] 網路下載音樂轉換為 AudioClip: ${file.key}`);
                let base64String = 'data:audio/mpeg;base64,' + base64ArrayBuffer(resp);
                assetManager.loadRemote<AudioClip>(base64String, {ext:'.mp3'}, (err, audioClip)=>{
                  if (!err) {
                    log(`✅ [NATIVE] 音樂 AudioClip 創建成功: ${file.key}`);
                  }
                  this.OnFileLoaded(err, file, audioClip);
                })
              }
            }else{
              // 非 NATIVE 環境：保持原有 base64 編碼方式
              log(`💾 [WEB] 儲存 base64 資料到本地: ${file.key}`);
              let base64String = 'data:image/png;base64,' + base64ArrayBuffer(resp);
              this.SaveToLocal(file, base64String);
              if(file.type == 'image'){
                log(`🖼️ [WEB] 網路下載圖片轉換為 SpriteFrame: ${file.key}`);
                dataURL2Image(base64String, (image:HTMLImageElement)=>{
                  // Create a new image asset
                  let img = new ImageAsset(image);
                  let tex = new Texture2D();
                  tex.image = img;
                  let sp = new SpriteFrame();
                  sp.texture = tex;
                  log(`✅ [WEB] 圖片 SpriteFrame 創建成功: ${file.key}`);
                  this.OnFileLoaded(null, file, sp.addRef());
                })
              }
              else if(file.type == 'music'){
                log(`🎵 [WEB] 網路下載音樂轉換為 AudioClip: ${file.key}`);
                assetManager.loadRemote<AudioClip>(base64String, {ext:'.mp3'}, (err, audioClip)=>{
                  if (!err) {
                    log(`✅ [WEB] 音樂 AudioClip 創建成功: ${file.key}`);
                  }
                  this.OnFileLoaded(null, file, audioClip);
                })
              }
            }
          }
        })
        .Resume();
    }
  
    
    private OnFileLoaded(err: Error, file: FileDescriptor, asset:SpriteFrame|AudioClip|JsonAsset|Asset|sp.SkeletonData, changeFlag:boolean = true) {
        // Handle loaded file
        // log("File loaded", file);
        if (err) {
            error(`Failed to load ${file.url}`, err);
            this.state = LoaderState.Error; // Transition to an error state
            // Optionally, trigger retry logic or notify the user/application
            if (file.retryCount < MAX_RETRIES) {
              file.retryCount++;
              this.queue.unshift(file); // Re-add the file at the start of the queue for a retry
              // Optionally, implement a backoff strategy before retrying
              this.LoadNextInQueue()
            } else {
              // Max retries reached, handle as a permanent failure
              this.HandlePermanentFailure(err, file);
              // Move to next file or idle state
              this.state = LoaderState.Idle;
            }
        } else {
            // log("File loaded successfully:", file.url);
            switch (file.type) {
              case 'image':
                  if(!err){
                    this.CacheAsset(file.key, asset);
                    if(isValid(file.useComp) && file.useComp instanceof Sprite){
                      file.useComp.spriteFrame = (asset as SpriteFrame);
                    }
                  }
                  break;
              case 'music':
                  if(!err){
                    this.CacheAsset(file.key, asset);
                    if(isValid(file.useComp) && file.useComp instanceof AudioSource){
                      file.useComp.clip = (asset as AudioClip);
                    }
                  }
                  break;
              case 'json':
                  if(!err){
                    this.CacheAsset(file.key, asset);
                  }
                  break;
              case 'spine':
                  if(!err){
                    this.CacheAsset(file.key, asset);
                    if(isValid(file.useComp) && file.useComp instanceof sp.Skeleton){
                      file.useComp.skeletonData = (asset as sp.SkeletonData);
                    }
                  }
                  break;
              default:
                  error("Unsupported file type:", file.type);
                  if(changeFlag) this.state = LoaderState.Idle; // Reset state on error
            }
            // You could process or cache the loaded asset here. For example:
            this.RunCallBack(err, file, asset);
            if(changeFlag) this.state = LoaderState.Idle; // Ready to load the next item
        }
    }

    private CacheAsset(key: string, asset:ImageAsset|AudioClip|Asset|sp.SkeletonData) {
        // Example: caching the asset in memory
        this.cache.set(key, asset);
    }

    private SaveToLocal(file: FileDescriptor, data: string | ArrayBuffer){
      if(NATIVE && file.saveToLocal){
        // NATIVE 環境：直接儲存原始資料（版本由 ResourceLoader 記憶體快取管理）
        FileStorageHelper.saveResource(file.key, data);
      }
      else if(file.saveToLocal && JSB){
        // 網頁環境（JSB）：使用 localStorage，分片存儲 base64 編碼資料
        if(typeof data === 'string'){
          let strSliceLength = Math.floor(data.length/B64STR_DIV_COUNT);
          let parseIdx = [];
          for(let i=0;i<B64STR_DIV_COUNT;i++){
            parseIdx.push(i*strSliceLength);
          }
          parseIdx.push(data.length);
          for(let i=0;i<B64STR_DIV_COUNT;i++){
            localStorage.setItem(file.key + '_' + i, data.substring(parseIdx[i], parseIdx[i+1]));
          }
        }
      }
      
      // 所有環境：儲存版本資訊到 localStorage（用於下次版本比較）
      if(file.saveToLocal){
        const currentVersion = this.GetVersion(file.key);
        if(currentVersion){
          localStorage.setItem(file.key + '_' + 'version', currentVersion);
          log(`💾 儲存版本資訊: ${file.key} v${currentVersion}`);
        }
      }
    }

    private LoadFromLocal(file: FileDescriptor){
      if(!file.saveToLocal) return null;

      if(NATIVE){
        // 手機環境：從檔案讀取
        return FileStorageHelper.loadResource(file.key);
      }
      else {
        // 網頁環境：從 localStorage 讀取
        let str = '';
        for(let i=0;i<B64STR_DIV_COUNT;i++){
          if(!localStorage.getItem(file.key + '_' + i)){
            return null;
          }
          str += localStorage.getItem(file.key + '_' + i);
        }
        return str;
      }
    }

    private LoadVersionFromLocal(file: FileDescriptor){
      if(!file.saveToLocal) return null;

      // 版本資訊現在統一存在 localStorage 中（包括 NATIVE 環境）
      // 因為版本資訊來自 version.json 檔案，已經由 ResourceManager 載入並快取
      return localStorage.getItem(file.key + '_' + 'version');
    }

    private HandlePermanentFailure(err: Error, file: FileDescriptor){
      // Can implement a failure notify here
      this.RunCallBack(err, file, null)
    }

    private RunCallBack(err: Error, file: FileDescriptor, asset:SpriteFrame|AudioClip|JsonAsset|Asset|sp.SkeletonData){
      if(isValid(file.callBack) && file.callBack instanceof Function ){
        try{
          file.callBack(err, asset)
        }catch(e){
          error(e); 
        }
      }
    }

  
  }