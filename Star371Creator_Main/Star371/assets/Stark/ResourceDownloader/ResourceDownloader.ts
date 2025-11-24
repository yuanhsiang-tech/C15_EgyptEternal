import { IResourceHandler } from './ResourceHandler'
import { Texture2D, ImageAsset, SpriteFrame, log, warn, assetManager, Asset, JsonAsset, BufferAsset, TextAsset, AudioClip } from 'cc'
import {
    ResourceDownloaderErrorType,
    ResourceDownloaderErrorInfo,
    ResourceDownloaderProgressInfo,
    FileType,
    StorageOption,
    DownloadResult,
    DownloadOptions,
    ResourceDownloaderCallbackHelper,
    RESOURCE_DOWNLOADER_CONSTANTS,
    DownloadPriority,
    DetectFileType,
    IsImageType,
    GetFileWeight,
    TaskDetailInfo,
    DownloadTaskInfo,
    DownloadSpeedStats,
} from './ResourceDownloaderDefine'
import { Http } from '../../Script/Net/Network/Http'

/**
 * 資源下載器 - 統一下載介面，支援自動檔案類型偵測
 * 支援不同儲存選項和類型特定處理，具有全局併發控制
 */
export abstract class ResourceDownloader {
    private m_resourceHandler: IResourceHandler                   // 資源處理器委託

    // 全局下載隊列管理
    private m_downloadQueue: DownloadTaskInfo[] = []              // 下載任務隊列
    private m_activeDownloads: Set<string> = new Set()            // 活動下載任務 ID 集合
    private m_maxConcurrentDownloads: number = RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_MAX_CONCURRENT_DOWNLOADS  // 最大併發下載數
    private m_taskIdCounter: number = 0                           // 任務 ID 計數器

    // 速度統計相關
    private m_activeTasks: Map<string, DownloadTaskInfo> = new Map()   // 活動任務對應表
    private m_totalDownloadedBytes: number = 0                    // 總下載位元組數
    private m_overallStartTime: number = 0                        // 整體下載開始時間

    protected constructor() {
        this.m_resourceHandler = this.CreateResourceHandler()
    }

    protected abstract CreateResourceHandler(): IResourceHandler

    get ResourceHandler(): IResourceHandler {
        return this.m_resourceHandler
    }

    /**
     * 設定最大併發下載數
     * @param maxConcurrent 最大併發下載數
     */
    public SetMaxConcurrentDownloads(maxConcurrent: number): void {
        this.m_maxConcurrentDownloads = Math.max(RESOURCE_DOWNLOADER_CONSTANTS.MIN_CONCURRENT_DOWNLOADS, maxConcurrent)
        log(`🔧 ResourceDownloader: 設定最大併發下載數為 ${this.m_maxConcurrentDownloads}`)

        // 重新處理隊列，可能可以啟動更多下載
        this._processDownloadQueue()
    }

    /**
     * 取得目前下載狀態
     */
    public GetDownloadStatus(): { queueCount: number; activeCount: number; maxConcurrent: number } {
        return {
            queueCount: this.m_downloadQueue.length,
            activeCount: this.m_activeDownloads.size,
            maxConcurrent: this.m_maxConcurrentDownloads
        }
    }

    /**
     * 取得下載速度統計資訊
     */
    public GetDownloadSpeedStats(): DownloadSpeedStats {
        const currentTime = Date.now()
        let totalSpeed = 0
        let activeTaskCount = 0
        let weightedTaskCount = 0

        this.m_activeTasks.forEach(task => {
            if (task.startTime && task.currentSpeed > 0) {
                totalSpeed += task.currentSpeed
                activeTaskCount++
                weightedTaskCount += task.weight
            }
        })

        const overallElapsedTime = this.m_overallStartTime > 0 ? (currentTime - this.m_overallStartTime) / 1000 : 0
        const averageSpeed = overallElapsedTime > 0 ? this.m_totalDownloadedBytes / overallElapsedTime : 0

        return {
            totalSpeed,
            activeTaskCount,
            weightedTaskCount,
            totalDownloadedBytes: this.m_totalDownloadedBytes,
            averageSpeed
        }
    }

    /**
     * 取得個別任務的詳細資訊
     * @param taskId 任務 ID
     * @returns 任務資訊或 null（直接返回內部目標，通過類型視圖限制訪問）
     */
    public GetTaskDetail(taskId: string): TaskDetailInfo | null {
        const task = this.m_activeTasks.get(taskId)
        if (!task || !task.startTime) return null

        // 計算並填充計算字段
        const currentTime = Date.now()
        task.elapsedTime = (currentTime - task.startTime) / 1000
        task.progress = task.totalBytes > 0 ? (task.downloadedBytes / task.totalBytes) * 100 : 0

        // 直接返回同一個目標，TypeScript 類型系統會限制只能訪問 TaskDetailInfo 的字段
        return task as TaskDetailInfo
    }

    /**
     * 取得所有活動任務的詳細資訊
     */
    public GetAllActiveTaskDetails(): TaskDetailInfo[] {
        const details: TaskDetailInfo[] = []

        this.m_activeTasks.forEach((_, taskId) => {
            const detail = this.GetTaskDetail(taskId)
            if (detail) {
                details.push(detail)
            }
        })

        return details
    }

    /**
     * 清除所有隊列中的任務（不影響正在進行的下載）
     */
    public ClearDownloadQueue(): void {
        const queueCount = this.m_downloadQueue.length
        this.m_downloadQueue = []
        log(`🗑️ ResourceDownloader: 清除下載隊列，移除 ${queueCount} 個等待中的任務`)
    }

    /**
     * 統一下載方法，支援自動檔案類型偵測
     * @param opts - 下載選項 (必須包含 onSuccess, onError 回調)
     */
    public Download(opts: DownloadOptions): void {

        // 確保至少有成功回調
        if (!opts.onSuccess) {
            warn('ResourceDownloader: No onSuccess callback provided')
            return
        }

        // 確保至少有錯誤回調
        if (!opts.onError) {
            warn('ResourceDownloader: No onError callback provided')
            return
        }

        // 檢查是否使用 assetManager cache（預設為 true）
        const useCache = opts.useAssetCache !== false

        if (useCache && assetManager.assets.has(opts.url)) {
            // 從 cache 中取得已存在的 asset
            const cachedAsset = assetManager.assets.get(opts.url)
            if (cachedAsset) {
                log(`✅ ResourceDownloader: 從 cache 中取得資源: ${opts.url}`)

                // 構建返回結果
                const fileType = DetectFileType(opts.fileName)
                const result: DownloadResult = {
                    fileType,
                    asset: cachedAsset,
                    fromCache: true
                }

                // 根據檔案類型和實際 asset 類型設置對應屬性
                if (IsImageType(fileType) && cachedAsset instanceof ImageAsset) {
                    result.imageAsset = cachedAsset
                    // 從 ImageAsset 創建 Texture2D 和 SpriteFrame
                    const texture = new Texture2D()
                    texture.image = cachedAsset
                    result.texture = texture
                    const spriteFrame = new SpriteFrame()
                    spriteFrame.texture = texture
                    result.spriteFrame = spriteFrame
                } else if (fileType === FileType.DATA_JSON && cachedAsset instanceof JsonAsset) {
                    result.jsonObject = cachedAsset
                } else if (fileType === FileType.DATA_XML && cachedAsset instanceof TextAsset) {
                    result.textAsset = cachedAsset
                } else if ((fileType === FileType.AUDIO_MP3 || fileType === FileType.AUDIO_OGG) && cachedAsset instanceof AudioClip) {
                    result.audioData = cachedAsset
                } else if (cachedAsset instanceof BufferAsset) {
                    result.rawData = cachedAsset
                }

                // 直接呼叫成功回調
                ResourceDownloaderCallbackHelper.CallSuccess(opts, result)
                return
            }
        }

        // 使用隊列系統進行下載
        const priority = opts.priority || DownloadPriority.DEFAULT  // 使用 DownloadOptions 中的 priority
        this._enqueueDownloadTask(
            opts.fileName,
            opts,
            priority
        )
    }



    /**
     * 將下載任務加入全局隊列
     * @param fileName 檔案名稱
     * @param options 下載選項
     * @param priority 優先級（數字越大優先級越高）
     */
    private _enqueueDownloadTask(
        fileName: string,
        options: DownloadOptions,
        priority: number = 0
    ): string {
        const taskId = `${RESOURCE_DOWNLOADER_CONSTANTS.TASK_ID_PREFIX}${++this.m_taskIdCounter}_${Date.now()}`
        const currentTime = Date.now()

        const task: DownloadTaskInfo = {
            id: taskId,
            fileName,
            options,
            priority,
            createdTime: currentTime,
            totalBytes: 0,
            downloadedBytes: 0,
            currentSpeed: 0,
            lastUpdateTime: currentTime,
            weight: GetFileWeight(fileName)
        }

        // 插入隊列並按優先級排序（高優先級在前，同優先級按創建時間排序）
        this.m_downloadQueue.push(task)
        this.m_downloadQueue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority // 優先級高的在前
            }
            return a.createdTime - b.createdTime // 同優先級按創建時間排序
        })

        log(`📋 ResourceDownloader: 任務加入隊列 ${taskId} - ${fileName} (優先級: ${priority}, 權重: ${task.weight}, 隊列長度: ${this.m_downloadQueue.length})`)

        // 嘗試處理隊列
        this._processDownloadQueue()

        return taskId
    }

    /**
     * 處理下載隊列
     */
    private _processDownloadQueue(): void {
        // 檢查是否可以啟動更多下載
        while (this.m_activeDownloads.size < this.m_maxConcurrentDownloads && this.m_downloadQueue.length > 0) {
            const task = this.m_downloadQueue.shift()
            if (task) {
                this._startDownloadTask(task)
            }
        }

        if (this.m_downloadQueue.length > 0) {
            log(`⏳ ResourceDownloader: 隊列中等待 ${this.m_downloadQueue.length} 個任務，活動下載 ${this.m_activeDownloads.size}/${this.m_maxConcurrentDownloads}`)
        }
    }

    /**
     * 開始執行下載任務
     * @param task 下載任務
     */
    private _startDownloadTask(task: DownloadTaskInfo): void {
        const currentTime = Date.now()
        task.startTime = currentTime
        task.lastUpdateTime = currentTime

        // 如果這是第一個下載任務，記錄整體開始時間
        if (this.m_overallStartTime === 0) {
            this.m_overallStartTime = currentTime
        }

        this.m_activeDownloads.add(task.id)
        this.m_activeTasks.set(task.id, task)

        log(`🚀 ResourceDownloader: 開始下載任務 ${task.id} - ${task.fileName} (活動: ${this.m_activeDownloads.size}/${this.m_maxConcurrentDownloads}, 權重: ${task.weight})`)

        // 包裝回調函數以處理任務完成
        const wrappedOnSuccess = this._onTaskDownloadSuccess.bind(this, task.id, task.options)
        const wrappedOnError = this._onTaskDownloadError.bind(this, task.id, task.options)
        const wrappedOnProgress = this._onTaskDownloadProgress.bind(this, task.id, task.options)

        // 執行實際下載邏輯
        this._performActualDownload(task.options, wrappedOnSuccess, wrappedOnError, wrappedOnProgress)
    }

    /**
     * 任務下載成功回調
     */
    private _onTaskDownloadSuccess(taskId: string, taskOptions: DownloadOptions, result: DownloadResult): void {
        this._completeDownloadTask(taskId, true)
        taskOptions.onSuccess(result)
    }

    /**
     * 任務下載錯誤回調
     */
    private _onTaskDownloadError(taskId: string, taskOptions: DownloadOptions, error: ResourceDownloaderErrorInfo): void {
        this._completeDownloadTask(taskId, false)
        taskOptions.onError(error)
    }

    /**
     * 任務下載進度回調
     */
    private _onTaskDownloadProgress(taskId: string, taskOptions: DownloadOptions, progress: ResourceDownloaderProgressInfo): void {
        this._updateTaskProgress(taskId, progress)
        if (taskOptions.onProgress) {
            taskOptions.onProgress(progress)
        }
    }

    /**
     * 執行實際下載邏輯
     */
    private _performActualDownload(
        opts: DownloadOptions,
        onSuccess: (result: DownloadResult) => void,
        onError: (error: ResourceDownloaderErrorInfo) => void,
        onProgress?: (progress: ResourceDownloaderProgressInfo) => void
    ): void {
        const fileType = DetectFileType(opts.fileName)

        // 下載前檢查檔案是否已存在於儲存中 (Web/Native) - 除非是 NONE
        if (opts.savePath && opts.checkExistingFile && opts.storageOption !== StorageOption.NONE) {
            this._checkFileExists(opts.savePath, {
                onResult: this._onCheckFileExistsResult.bind(this, opts, fileType, onSuccess, onError, onProgress),
                onError,
                onProgress,
                target: opts.target
            })
        } else {
            // 未指定保存路徑或停用檢查，直接進行下載
            this._downloadRawData(opts.url, {
                onSuccess: this._onRawDataDownloaded.bind(this, opts, fileType, onSuccess, onError, onProgress),
                onError,
                onProgress,
                target: opts.target
            })
        }
    }

    /**
     * 檢查檔案存在結果回調
     */
    private _onCheckFileExistsResult(
        opts: DownloadOptions,
        fileType: FileType,
        onSuccess: (result: DownloadResult) => void,
        onError: (error: ResourceDownloaderErrorInfo) => void,
        onProgress: (progress: ResourceDownloaderProgressInfo) => void,
        exists: boolean,
        existingData?: ArrayBuffer
    ): void {
        if (exists && existingData) {
            // 檔案已存在，處理現有資料而非下載
            this._processDownloadedData(existingData, fileType, {
                ...opts,
                onSuccess,
                onError,
                onProgress
            })
        } else {
            // 檔案不存在，進行下載
            this._downloadRawData(opts.url, {
                onSuccess: this._onRawDataDownloaded.bind(this, opts, fileType, onSuccess, onError, onProgress),
                onError,
                onProgress,
                target: opts.target
            })
        }
    }

    /**
     * 原始資料下載完成回調
     */
    private _onRawDataDownloaded(
        opts: DownloadOptions,
        fileType: FileType,
        onSuccess: (result: DownloadResult) => void,
        onError: (error: ResourceDownloaderErrorInfo) => void,
        onProgress: (progress: ResourceDownloaderProgressInfo) => void,
        rawData: ArrayBuffer
    ): void {
        this._processDownloadedData(rawData, fileType, {
            ...opts,
            onSuccess,
            onError,
            onProgress
        })
    }

    /**
     * 更新任務進度和速度統計
     * @param taskId 任務 ID
     * @param progress 進度資訊
     */
    private _updateTaskProgress(taskId: string, progress: ResourceDownloaderProgressInfo): void {
        const task = this.m_activeTasks.get(taskId)
        if (!task) return

        const currentTime = Date.now()
        const previousDownloaded = task.downloadedBytes

        task.totalBytes = progress.total
        task.downloadedBytes = progress.loaded

        // 計算這次進度更新增加的位元組數
        const bytesIncrease = progress.loaded - previousDownloaded
        if (bytesIncrease > 0) {
            this.m_totalDownloadedBytes += bytesIncrease
        }

        // 計算目前速度（位元組/秒）
        if (task.startTime && currentTime > task.startTime) {
            const elapsedSeconds = (currentTime - task.startTime) / 1000
            task.currentSpeed = elapsedSeconds > 0 ? progress.loaded / elapsedSeconds : 0
        }

        task.lastUpdateTime = currentTime

        // 更新活動任務對應表
        this.m_activeTasks.set(taskId, task)
    }

    /**
     * 完成下載任務
     * @param taskId 任務 ID
     * @param success 是否成功
     */
    private _completeDownloadTask(taskId: string, success: boolean): void {
        const task = this.m_activeTasks.get(taskId)

        this.m_activeDownloads.delete(taskId)
        this.m_activeTasks.delete(taskId)

        // 如果沒有活動任務了，重置整體開始時間
        if (this.m_activeTasks.size === 0) {
            this.m_overallStartTime = 0
        }

        const speedInfo = task ? `權重: ${task.weight}, 速度: ${(task.currentSpeed / 1024).toFixed(2)} KB/s` : ''
        log(`${success ? '✅' : '❌'} ResourceDownloader: 任務完成 ${taskId} (活動: ${this.m_activeDownloads.size}/${this.m_maxConcurrentDownloads}, ${speedInfo})`)

        // 處理隊列中的下一個任務
        this._processDownloadQueue()
    }

    /**
     * Download raw data from URL
     */
    private _downloadRawData(
        url: string,
        options: {
            onSuccess?: (data: ArrayBuffer) => void,
            onError?: (error: ResourceDownloaderErrorInfo) => void,
            onProgress?: ((progress: ResourceDownloaderProgressInfo) => void) | null,
            target?: any
        }
    ): void {
        log(`🌐 開始下載: ${url}`)

        // 創建下載上下文
        const downloadContext = {
            url,
            options,
        }

        Http
            .Get(url)
            .ResponseType(Http.ResponseType.BUFFER) // 設置響應類型為 ArrayBuffer
            .Timeout(RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_TIMEOUT) // 150秒超時
            .OnProgress((u,e)=>this._onXhrProgress(downloadContext, e))
            .OnFinish((isSuccess:boolean)=>!isSuccess&&this._onXhrError(downloadContext))
            .OnRawResponse((xhr:XMLHttpRequest)=>this._onXhrLoad(xhr, downloadContext))
            .Resume();
    }

    /**
     * XHR 加載成功回調
     */
    private _onXhrLoad(xhr:XMLHttpRequest, context: { url: string; options: any; }): void {
        const { url, options } = context
        if (xhr.status === 200) {
            const arrayBuffer = xhr.response as ArrayBuffer
            if (arrayBuffer && arrayBuffer.byteLength > 0) {
                log(`✅ 下載成功: ${url} (${arrayBuffer.byteLength} bytes)`)
                this._callXhrSuccess(options, arrayBuffer)
            } else {
                log(`❌ 下載失敗: 空響應數據`)
                this._callXhrError(options, {
                    errorType: ResourceDownloaderErrorType.DOWNLOAD_FAILED,
                    message: 'Empty response data received'
                })
            }
        } else {
            log(`❌ 下載失敗: HTTP ${xhr.status}`)
            this._callXhrError(options, {
                errorType: ResourceDownloaderErrorType.DOWNLOAD_FAILED,
                message: `HTTP ${xhr.status}: ${xhr.statusText || 'Unknown error'}`
            })
        }
    }

    /**
     * XHR 錯誤回調
     */
    private _onXhrError(context: { url: string; options: any }): void {
        const { url, options } = context
        log(`❌ 網路錯誤: ${url}`)
        this._callXhrError(options, {
            errorType: ResourceDownloaderErrorType.DOWNLOAD_FAILED,
            message: `Network error occurred while downloading: ${url}`
        })
    }

    /**
     * XHR 超時回調
     */
    private _onXhrTimeout(context: { url: string; options: any }): void {
        const { url, options } = context
        log(`❌ 超時: ${url}`)
        this._callXhrError(options, {
            errorType: ResourceDownloaderErrorType.DOWNLOAD_FAILED,
            message: `Download timeout for URL: ${url}`
        })
    }

    /**
     * XHR 進度回調
     */
    private _onXhrProgress(context: { url: string; options: any }, event: ProgressEvent): void {
        const { url, options } = context
        if (event.lengthComputable && options.onProgress) {
            const progressInfo: ResourceDownloaderProgressInfo = {
                loaded: event.loaded,
                total: event.total,
                url: url
            }
            log(`📊 下載進度: ${url} (${event.loaded}/${event.total} bytes, ${Math.round((event.loaded / event.total) * 100)}%)`)
            this._callXhrProgress(options, progressInfo)
        }
    }

    /**
     * 呼叫 XHR 成功回調
     */
    private _callXhrSuccess(options: any, arrayBuffer: ArrayBuffer): void {
        if (options.onSuccess) {
            if (options.target) {
                options.onSuccess.apply(options.target, [arrayBuffer])
            } else {
                options.onSuccess(arrayBuffer)
            }
        }
    }

    /**
     * 呼叫 XHR 錯誤回調
     */
    private _callXhrError(options: any, errorInfo: ResourceDownloaderErrorInfo): void {
        if (options.onError) {
            if (options.target) {
                options.onError.apply(options.target, [errorInfo])
            } else {
                options.onError(errorInfo)
            }
        }
    }

    /**
     * 呼叫 XHR 進度回調
     */
    private _callXhrProgress(options: any, progressInfo: ResourceDownloaderProgressInfo): void {
        if (options.onProgress) {
            if (options.target) {
                options.onProgress.apply(options.target, [progressInfo])
            } else {
                options.onProgress(progressInfo)
            }
        }
    }

    /**
     * Process downloaded data based on file type and options
     */
    private _processDownloadedData(
        rawData: ArrayBuffer,
        fileType: FileType,
        options: DownloadOptions
    ): void {
        // 創建 BufferAsset 包裝原始資料
        const bufferAsset = new BufferAsset()
        bufferAsset._nativeAsset = rawData

        const result: DownloadResult = { fileType, rawData: bufferAsset }

        // 處理檔案保存 (如果需要且是 FILE_ONLY)
        if (options.savePath && options.storageOption === StorageOption.FILE_ONLY) {
            this._saveToFile(options.savePath, rawData, {
                onSuccess: this._onFileSaved.bind(this, result, options, rawData),
                onError: this._onFileSaveError.bind(this, options),
                onProgress: options.onProgress,
                target: options.target
            })
        } else {
            this._processTypeSpecific(result, options, rawData)
        }
    }

    /**
     * 檔案保存成功回調
     */
    private _onFileSaved(result: DownloadResult, options: DownloadOptions, rawData: ArrayBuffer, filePath: string): void {
        result.filePath = filePath
        this._processTypeSpecific(result, options, rawData)
    }

    /**
     * 檔案保存錯誤回調
     */
    private _onFileSaveError(options: DownloadOptions, error: ResourceDownloaderErrorInfo): void {
        ResourceDownloaderCallbackHelper.CallError(options, error)
    }

    /**
     * Process type-specific handling
     */
    private _processTypeSpecific(
        result: DownloadResult,
        options: DownloadOptions,
        rawArrayBuffer?: ArrayBuffer
    ): void {
        switch (result.fileType) {
            case FileType.IMAGE_JPG:
            case FileType.IMAGE_PNG:
                this._processImageData(result, options, rawArrayBuffer)
                break

            case FileType.DATA_JSON:
                this._processJsonData(result, options, rawArrayBuffer)
                break

            case FileType.DATA_XML:
                this._processXmlData(result, options, rawArrayBuffer)
                break

            case FileType.AUDIO_MP3:
            case FileType.AUDIO_OGG:
                this._processAudioData(result, options, rawArrayBuffer)
                break

            default:
                this._processOtherData(result, options)
                break
        }
    }

    /**
     * Process image data
     */
    private _processImageData(
        result: DownloadResult,
        options: DownloadOptions,
        rawArrayBuffer?: ArrayBuffer
    ): void {
        if (result.rawData && result.rawData._nativeAsset instanceof ArrayBuffer) {
            this._createImageAssetFromData(result.rawData._nativeAsset, {
                onSuccess: this._onImageAssetCreated.bind(this, result, options),
                onError: this._onImageAssetError.bind(this, options),
                target: options.target
            })
        } else {
            ResourceDownloaderCallbackHelper.CallSuccess(options, result)
        }
    }

    /**
     * 圖片資源創建成功回調
     */
    private _onImageAssetCreated(result: DownloadResult, options: DownloadOptions, imageAsset: ImageAsset): void {
        result.imageAsset = imageAsset

        // Create texture from image asset
        const texture = new Texture2D()
        texture.image = imageAsset
        result.texture = texture

        // Create SpriteFrame
        const spriteFrame = new SpriteFrame()
        spriteFrame.texture = texture
        result.spriteFrame = spriteFrame

        // Apply to target sprite if specified
        if (options.targetSprite) {
            options.targetSprite.spriteFrame = spriteFrame
        }

        // 設置 asset 為 imageAsset（用於 cache）
        result.asset = imageAsset

        // 加入 assetManager cache
        this._addToAssetCache(options.url, imageAsset, options)

        ResourceDownloaderCallbackHelper.CallSuccess(options, result)
    }

    /**
     * 圖片資源創建錯誤回調
     */
    private _onImageAssetError(options: DownloadOptions, error: ResourceDownloaderErrorInfo): void {
        ResourceDownloaderCallbackHelper.CallError(options, error)
    }

    /**
     * Process JSON data
     */
    private _processJsonData(
        result: DownloadResult,
        options: DownloadOptions,
        rawArrayBuffer?: ArrayBuffer
    ): void {
        if (rawArrayBuffer) {
            try {
                const textData = new TextDecoder().decode(rawArrayBuffer)
                const parsedObject = JSON.parse(textData)

                // 創建 JsonAsset
                const jsonAsset = new JsonAsset()
                jsonAsset.json = parsedObject

                result.jsonObject = jsonAsset
                result.asset = jsonAsset

                // 加入 assetManager cache
                this._addToAssetCache(options.url, jsonAsset, options)

                ResourceDownloaderCallbackHelper.CallSuccess(options, result)
            } catch (parseError) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.JSON_PARSE_FAILED,
                    originalError: parseError
                })
            }
        } else {
            ResourceDownloaderCallbackHelper.CallSuccess(options, result)
        }
    }

    /**
     * Process XML data
     */
    private _processXmlData(
        result: DownloadResult,
        options: DownloadOptions,
        rawArrayBuffer?: ArrayBuffer
    ): void {
        if (rawArrayBuffer) {
            try {
                const textData = new TextDecoder().decode(rawArrayBuffer)
                const parser = new DOMParser()
                const xmlDoc = parser.parseFromString(textData, RESOURCE_DOWNLOADER_CONSTANTS.MIME_TYPE_TEXT_XML)

                // Check for parsing errors
                const parseError = xmlDoc.getElementsByTagName(RESOURCE_DOWNLOADER_CONSTANTS.XML_PARSER_ERROR_TAG)
                if (parseError.length > 0) {
                    ResourceDownloaderCallbackHelper.CallError(options, {
                        errorType: ResourceDownloaderErrorType.XML_PARSE_FAILED,
                        message: 'Invalid XML format'
                    })
                    return
                }

                // 創建 TextAsset 包裝 XML 資料
                const textAsset = new TextAsset()
                textAsset.text = textData

                result.textAsset = textAsset
                result.asset = textAsset

                // 加入 assetManager cache
                this._addToAssetCache(options.url, textAsset, options)

                ResourceDownloaderCallbackHelper.CallSuccess(options, result)
            } catch (parseError) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.XML_PARSE_FAILED,
                    originalError: parseError
                })
            }
        } else {
            ResourceDownloaderCallbackHelper.CallSuccess(options, result)
        }
    }

    /**
     * Process audio data
     */
    private _processAudioData(
        result: DownloadResult,
        options: DownloadOptions,
        rawArrayBuffer?: ArrayBuffer
    ): void {
        // 音訊檔案使用現有的 rawData (已經是 BufferAsset)
        result.asset = result.rawData

        // 註記：AudioClip 需要特殊處理，建議使用 assetManager 的音訊載入功能
        // 這裡我們只提供 rawData (BufferAsset)，實際的 AudioClip 創建需要額外的處理
        log(`⚠️ ResourceDownloader: 音訊檔案已下載為 BufferAsset，需要額外處理才能轉換為 AudioClip: ${options.url}`)

        // 加入 assetManager cache
        if (result.asset) {
            this._addToAssetCache(options.url, result.asset, options)
        }

        ResourceDownloaderCallbackHelper.CallSuccess(options, result)
    }

    /**
     * Process other file types
     */
    private _processOtherData(
        result: DownloadResult,
        options: DownloadOptions
    ): void {
        // rawData 已經是 BufferAsset，可以直接作為 asset
        result.asset = result.rawData

        // 加入 assetManager cache
        if (result.asset) {
            this._addToAssetCache(options.url, result.asset, options)
        }

        ResourceDownloaderCallbackHelper.CallSuccess(options, result)
    }

    /**
     * Save data to file (using delegate)
     */
    private _saveToFile(
        filePath: string,
        data: ArrayBuffer,
        options: {
            onSuccess?: (savedPath: string) => void,
            onError?: (error: ResourceDownloaderErrorInfo) => void,
            onProgress?: ((progress: ResourceDownloaderProgressInfo) => void) | null,
            target?: any
        }
    ): void {
        this.m_resourceHandler.SaveToFile(filePath, data, {
            onSuccess: options.onSuccess,
            onError: options.onError,
            onProgress: options.onProgress,
            target: options.target
        })
    }

    /**
     * Create ImageAsset from raw data
     */
    private _createImageAssetFromData(
        imageData: ArrayBuffer,
        options: {
            onSuccess?: (imageAsset: ImageAsset) => void,
            onError?: (error: ResourceDownloaderErrorInfo) => void,
            target?: any
        }
    ): void {
        try {
            const blob = new Blob([imageData])
            const imageUrl = URL.createObjectURL(blob)
            const img = new Image()

            // 創建圖片載入上下文
            const imageContext = {
                img,
                imageUrl,
                options
            }

            img.onload = this._onImageLoad.bind(this, imageContext)
            img.onerror = this._onImageError.bind(this, imageContext)

            img.src = imageUrl
        } catch (error) {
            this._callImageError(options, {
                errorType: ResourceDownloaderErrorType.IMAGE_DECODE_FAILED,
                originalError: error
            })
        }
    }

    /**
     * 圖片載入成功回調
     */
    private _onImageLoad(context: { img: HTMLImageElement; imageUrl: string; options: any }): void {
        const { img, imageUrl, options } = context
        try {
            const imageAsset = new ImageAsset()
            imageAsset._nativeAsset = img
            URL.revokeObjectURL(imageUrl)
            this._callImageSuccess(options, imageAsset)
        } catch (error) {
            URL.revokeObjectURL(imageUrl)
            this._callImageError(options, {
                errorType: ResourceDownloaderErrorType.TEXTURE_CREATE_FAILED,
                originalError: error
            })
        }
    }

    /**
     * 圖片載入錯誤回調
     */
    private _onImageError(context: { imageUrl: string; options: any }): void {
        const { imageUrl, options } = context
        URL.revokeObjectURL(imageUrl)
        this._callImageError(options, {
            errorType: ResourceDownloaderErrorType.IMAGE_LOAD_FAILED
        })
    }

    /**
     * 呼叫圖片成功回調
     */
    private _callImageSuccess(options: any, imageAsset: ImageAsset): void {
        if (options.onSuccess) {
            if (options.target) {
                options.onSuccess.apply(options.target, [imageAsset])
            } else {
                options.onSuccess(imageAsset)
            }
        }
    }

    /**
     * 呼叫圖片錯誤回調
     */
    private _callImageError(options: any, errorInfo: ResourceDownloaderErrorInfo): void {
        if (options.onError) {
            if (options.target) {
                options.onError.apply(options.target, [errorInfo])
            } else {
                options.onError(errorInfo)
            }
        }
    }

    /**
     * Check if file exists in storage and load it if available (using delegate)
     */
    private _checkFileExists(
        filePath: string,
        options: {
            onResult: (exists: boolean, data?: ArrayBuffer) => void,
            onError: (error: ResourceDownloaderErrorInfo) => void,
            onProgress?: ((progress: ResourceDownloaderProgressInfo) => void) | null,
            target?: any
        }
    ): void {
        this.m_resourceHandler.LoadFromFile(filePath, {
            onSuccess: this._onFileExistsCheckSuccess.bind(this, options),
            onError: this._onFileExistsCheckError.bind(this, options),
            onProgress: options.onProgress,
            target: options.target
        })
    }

    /**
     * 檔案存在檢查成功回調
     */
    private _onFileExistsCheckSuccess(
        options: {
            onResult: (exists: boolean, data?: ArrayBuffer) => void
        },
        data: ArrayBuffer
    ): void {
        options.onResult(true, data)
    }

    /**
     * 檔案存在檢查錯誤回調
     */
    private _onFileExistsCheckError(
        options: {
            onResult: (exists: boolean, data?: ArrayBuffer) => void
            onError: (error: ResourceDownloaderErrorInfo) => void
        },
        error: ResourceDownloaderErrorInfo
    ): void {
        // File doesn't exist or failed to load
        if (error.errorType === ResourceDownloaderErrorType.FILE_NOT_FOUND) {
            options.onResult(false)
        } else {
            options.onError(error)
        }
    }

    /**
     * 將 asset 加入 assetManager cache
     * @param url 資源 URL（用作 cache key）
     * @param asset 資源物件（必須是 Asset 類型）
     * @param options 下載選項
     */
    private _addToAssetCache(url: string, asset: Asset, options: DownloadOptions): void {
        // 檢查是否使用 cache（預設為 true）
        const useCache = options.useAssetCache !== false

        if (useCache && asset && asset instanceof Asset) {
            try {
                assetManager.assets.add(url, asset)
                log(`📦 ResourceDownloader: 已將資源加入 cache: ${url}`)
            } catch (error) {
                warn(`⚠️ ResourceDownloader: 加入 cache 失敗: ${url}`, error)
            }
        } else if (useCache && asset) {
            log(`⚠️ ResourceDownloader: 無法加入 cache（非 Asset 類型）: ${url}`)
        }
    }
}
