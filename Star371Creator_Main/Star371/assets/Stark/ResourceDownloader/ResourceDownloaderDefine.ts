import { Asset, AudioClip, BufferAsset, ImageAsset, JsonAsset, SpriteFrame, TextAsset, Texture2D } from "cc"

/**
 * ResourceDownloader Error Types
 * Defines error types that can occur during resource downloading operations
 */
export enum ResourceDownloaderErrorType {
    // Network related errors
    NETWORK_ERROR = 'NETWORK_ERROR',
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',

    // File system related errors
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    FILE_SAVE_FAILED = 'FILE_SAVE_FAILED',
    FILE_LOAD_FAILED = 'FILE_LOAD_FAILED',
    FILE_DELETE_FAILED = 'FILE_DELETE_FAILED',
    DIRECTORY_CREATE_FAILED = 'DIRECTORY_CREATE_FAILED',

    // Storage related errors
    LOCALSTORAGE_QUOTA_EXCEEDED = 'LOCALSTORAGE_QUOTA_EXCEEDED',
    CACHE_ACCESS_FAILED = 'CACHE_ACCESS_FAILED',

    // Image processing errors
    IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
    IMAGE_DECODE_FAILED = 'IMAGE_DECODE_FAILED',
    TEXTURE_CREATE_FAILED = 'TEXTURE_CREATE_FAILED',

    // Archive/ZIP related errors
    ZIP_EXTRACTION_FAILED = 'ZIP_EXTRACTION_FAILED',
    ZIP_EXTRACTION_NOT_IMPLEMENTED = 'ZIP_EXTRACTION_NOT_IMPLEMENTED',

    // Data parsing errors
    JSON_PARSE_FAILED = 'JSON_PARSE_FAILED',
    XML_PARSE_FAILED = 'XML_PARSE_FAILED',

    // Platform/Environment errors
    NATIVE_API_NOT_AVAILABLE = 'NATIVE_API_NOT_AVAILABLE',
    PLATFORM_NOT_SUPPORTED = 'PLATFORM_NOT_SUPPORTED'
}

/**
 * Error information interface
 */
export interface ResourceDownloaderErrorInfo {
    errorType: ResourceDownloaderErrorType
    message?: string
    originalError?: any
}

/**
 * Progress callback interface
 */
export interface ResourceDownloaderProgressInfo {
    loaded: number      // 已下載的位元組數
    total: number       // 總位元組數  
    url?: string        // 下載的 URL (可選)
}

/**
 * Callback options with target support for apply calls
 */
export interface CallbackOptions<T = any> {
    target?: T                          // 回調函數的目標目標，用於 apply 呼叫
}

/**
 * Success callback options
 */
export interface SuccessCallbackOptions<T = any> extends CallbackOptions<T> {
    onSuccess?: (...args: any[]) => void    // 成功回調
}

/**
 * Error callback options  
 */
export interface ErrorCallbackOptions<T = any> extends CallbackOptions<T> {
    onError?: (error: ResourceDownloaderErrorInfo) => void    // 錯誤回調
}

/**
 * Progress callback options
 */
export interface ProgressCallbackOptions<T = any> extends CallbackOptions<T> {
    onProgress?: (progress: ResourceDownloaderProgressInfo) => void    // 進度回調
}

/**
 * Combined callback options
 */
export interface CombinedCallbackOptions<T = any> extends SuccessCallbackOptions<T>, ErrorCallbackOptions<T>, ProgressCallbackOptions<T> {
}

/**
 * 批量操作進度回調選項
 */
export interface BatchProgressCallbackOptions<T = any> extends CallbackOptions<T> {
    onProgress?: (current: number, total: number, fileName: string) => void           // 整體進度回調
}

/**
 * 批量操作檔案回調選項
 */
export interface BatchFileCallbackOptions<T = any> extends CallbackOptions<T> {
    onFileProgress?: (fileName: string, progress: ResourceDownloaderProgressInfo) => void  // 單檔進度回調
    onFileSuccess?: (fileName: string, result: DownloadResult, updateInfo: FileUpdateInfo) => void  // 單檔成功回調
    onFileError?: (fileName: string, error: ResourceDownloaderErrorInfo, updateInfo: FileUpdateInfo) => void     // 單檔錯誤回調
}

/**
 * 批量操作完成回調選項
 */
export interface BatchCompleteCallbackOptions<T = any> extends CallbackOptions<T> {
    onComplete?: (successCount: number, failedCount: number, totalSize: number) => void  // 完成回調
}

/**
 * 批量更新選項 - 整合所有回調選項
 */
export interface BatchUpdateOptions extends
    BatchProgressCallbackOptions,
    BatchFileCallbackOptions,
    BatchCompleteCallbackOptions {
    baseURL: string                      // 基礎 URL
    storageOption?: StorageOption        // 儲存選項
    maxConcurrency?: number              // 最大並行下載數
    savePath?: string                    // 保存路徑前綴
    checkMD5?: boolean                   // 是否檢查 MD5
    priority?: number                    // 優先級
}

/**
 * Helper class for callback invocation with apply support
 */
export class ResourceDownloaderCallbackHelper {
    /**
     * 呼叫成功回調，支援 apply 方式
     */
    public static CallSuccess(options: SuccessCallbackOptions, ...args: any[]): void {
        if (options.onSuccess) {
            if (options.target) {
                options.onSuccess.apply(options.target, args)
            } else {
                options.onSuccess(...args)
            }
        }
    }

    /**
     * 呼叫錯誤回調，支援 apply 方式
     */
    public static CallError(options: ErrorCallbackOptions, error: ResourceDownloaderErrorInfo): void {
        if (options.onError) {
            if (options.target) {
                options.onError.apply(options.target, [error])
            } else {
                options.onError(error)
            }
        }
    }

    /**
     * 呼叫進度回調，支援 apply 方式
     */
    public static CallProgress(options: ProgressCallbackOptions, progress: ResourceDownloaderProgressInfo): void {
        if (options.onProgress) {
            if (options.target) {
                options.onProgress.apply(options.target, [progress])
            } else {
                options.onProgress(progress)
            }
        }
    }

    /**
     * 呼叫批量操作進度回調，支援 apply 方式
     */
    public static CallBatchProgress(options: BatchProgressCallbackOptions, current: number, total: number, fileName: string): void {
        if (options.onProgress) {
            if (options.target) {
                options.onProgress.apply(options.target, [current, total, fileName])
            } else {
                options.onProgress(current, total, fileName)
            }
        }
    }

    /**
     * 呼叫批量操作檔案進度回調，支援 apply 方式
     */
    public static CallBatchFileProgress(options: BatchFileCallbackOptions, fileName: string, progress: ResourceDownloaderProgressInfo): void {
        if (options.onFileProgress) {
            if (options.target) {
                options.onFileProgress.apply(options.target, [fileName, progress])
            } else {
                options.onFileProgress(fileName, progress)
            }
        }
    }

    /**
     * 呼叫批量操作檔案成功回調，支援 apply 方式
     */
    public static CallBatchFileSuccess(options: BatchFileCallbackOptions, fileName: string, result: DownloadResult, updateInfo: FileUpdateInfo): void {
        if (options.onFileSuccess) {
            if (options.target) {
                options.onFileSuccess.apply(options.target, [fileName, result, updateInfo])
            } else {
                options.onFileSuccess(fileName, result, updateInfo)
            }
        }
    }

    /**
     * 呼叫批量操作檔案錯誤回調，支援 apply 方式
     */
    public static CallBatchFileError(options: BatchFileCallbackOptions, fileName: string, error: ResourceDownloaderErrorInfo, updateInfo: FileUpdateInfo): void {
        if (options.onFileError) {
            if (options.target) {
                options.onFileError.apply(options.target, [fileName, error, updateInfo])
            } else {
                options.onFileError(fileName, error, updateInfo)
            }
        }
    }

    /**
     * 呼叫批量操作完成回調，支援 apply 方式
     */
    public static CallBatchComplete(options: BatchCompleteCallbackOptions, successCount: number, failedCount: number, totalSize: number): void {
        if (options.onComplete) {
            if (options.target) {
                options.onComplete.apply(options.target, [successCount, failedCount, totalSize])
            } else {
                options.onComplete(successCount, failedCount, totalSize)
            }
        }
    }
}

/**
 * Helper class for error message utilities
 */
export class ResourceDownloaderErrorHelper {
    /**
     * Get default error message for error type
     */
    public static GetDefaultMessage(errorType: ResourceDownloaderErrorType): string {
        switch (errorType) {
            case ResourceDownloaderErrorType.NETWORK_ERROR:
                return 'Network error occurred during operation'
            case ResourceDownloaderErrorType.DOWNLOAD_FAILED:
                return 'Failed to download resource'

            case ResourceDownloaderErrorType.FILE_NOT_FOUND:
                return 'File not found'
            case ResourceDownloaderErrorType.FILE_SAVE_FAILED:
                return 'Failed to save file'
            case ResourceDownloaderErrorType.FILE_LOAD_FAILED:
                return 'Failed to load file'
            case ResourceDownloaderErrorType.FILE_DELETE_FAILED:
                return 'Failed to delete file'
            case ResourceDownloaderErrorType.DIRECTORY_CREATE_FAILED:
                return 'Failed to create directory'

            case ResourceDownloaderErrorType.LOCALSTORAGE_QUOTA_EXCEEDED:
                return 'LocalStorage quota exceeded'
            case ResourceDownloaderErrorType.CACHE_ACCESS_FAILED:
                return 'Failed to access cache'

            case ResourceDownloaderErrorType.IMAGE_LOAD_FAILED:
                return 'Failed to load image'
            case ResourceDownloaderErrorType.IMAGE_DECODE_FAILED:
                return 'Failed to decode image'
            case ResourceDownloaderErrorType.TEXTURE_CREATE_FAILED:
                return 'Failed to create texture'

            case ResourceDownloaderErrorType.ZIP_EXTRACTION_FAILED:
                return 'Failed to extract ZIP file'
            case ResourceDownloaderErrorType.ZIP_EXTRACTION_NOT_IMPLEMENTED:
                return 'ZIP extraction not implemented'

            case ResourceDownloaderErrorType.JSON_PARSE_FAILED:
                return 'Failed to parse JSON'
            case ResourceDownloaderErrorType.XML_PARSE_FAILED:
                return 'Failed to parse XML'

            case ResourceDownloaderErrorType.NATIVE_API_NOT_AVAILABLE:
                return 'Native API not available'
            case ResourceDownloaderErrorType.PLATFORM_NOT_SUPPORTED:
                return 'Platform not supported'

            default:
                return 'Unhandled error type'
        }
    }
}

/**
 * (純 TS 實作) 將 Base64 編碼的字串轉換為 ArrayBuffer。
 * 此版本不使用 atob() 或 Buffer.from()，而是手動實現解碼演算法。
 *
 * @param base64 Base64 編碼的字串。
 * @returns 解碼後的 ArrayBuffer，如果輸入無效則返回空的 ArrayBuffer。
 */
export function Base64ToArrayBuffer(base64: string): ArrayBuffer {
    // Base64 字元集 -> 索引值 (0-63) 的對照表
    const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const B64_LOOKUP = new Map<string, number>()
    for (let i = 0; i < B64_CHARS.length; i++) {
        B64_LOOKUP.set(B64_CHARS[i], i)
    }

    // 1. 清理輸入字串：移除結尾的 padding '=' 以及任何非 Base64 字元 (如空白、換行符)
    let cleanBase64 = base64.trim().replace(/=/g, '')
    // 為了安全起見，再次過濾一次，確保只有 Base64 字元
    cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9\+\/]/g, '')

    const bytes: number[] = []

    // 2. 以 4 個 Base64 字元為一組進行處理
    for (let i = 0; i < cleanBase64.length; i += 4) {
        // 取出 4 個字元 (或在結尾時可能少於 4 個)
        const char1 = cleanBase64[i]
        const char2 = cleanBase64[i + 1]
        const char3 = cleanBase64[i + 2]
        const char4 = cleanBase64[i + 3]

        // 將字元轉換為 6-bit 的索引值
        const val1 = B64_LOOKUP.get(char1)!
        const val2 = B64_LOOKUP.get(char2)!
        const val3 = B64_LOOKUP.get(char3) // 結尾可能為 undefined
        const val4 = B64_LOOKUP.get(char4) // 結尾可能為 undefined

        // 3. 位元操作：將 4 個 6-bit 的值合併成一個 24-bit 的數字
        // val1 << 18  (6 bits, 左移 18 位)
        // val2 << 12  (6 bits, 左移 12 位)
        // val3 << 6   (6 bits, 左移 6 位)
        // val4        (6 bits)
        // 使用 | (OR) 運算符合併
        const combinedBits =
            (val1 << 18) |
            (val2 << 12) |
            ((val3 || 0) << 6) | // 如果是 undefined，當作 0 處理
            (val4 || 0)

        // 4. 從 24-bit 的數字中提取出 3 個 8-bit 的 byte
        // 第一個 byte 是最高的 8 bits
        const byte1 = (combinedBits >> 16) & 0xff
        bytes.push(byte1)

        // 如果 val3 存在，表示至少還有第二個 byte
        if (val3 !== undefined) {
            const byte2 = (combinedBits >> 8) & 0xff
            bytes.push(byte2)
        }

        // 如果 val4 存在，表示還有第三個 byte
        if (val4 !== undefined) {
            const byte3 = combinedBits & 0xff
            bytes.push(byte3)
        }
    }

    // 5. 將 byte 陣列轉換為 Uint8Array，再取得其底層的 ArrayBuffer
    return new Uint8Array(bytes).buffer
}

/**
 * Convert ArrayBuffer to base64 string (mobile-compatible version)
 * @param buffer - ArrayBuffer to convert
 * @returns Base64 string
 */
export function ArrayBufferToBase64(buffer: Uint8Array | ArrayBuffer): string {
    let base64 = ''
    const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer
    const byteLength = bytes.byteLength
    const byteRemainder = byteLength % 3
    const mainLength = byteLength - byteRemainder

    let a: number
    let b: number
    let c: number
    let d: number
    let chunk: number

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12   // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6      // 4032     = (2^6 - 1) << 6
        d = chunk & 63               // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
        chunk = bytes[mainLength]

        a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4   // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + '=='
    } else if (byteRemainder === 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

        a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4   // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2     // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + '='
    }

    return base64
}

/**
 * 下載優先級列舉（數字越大優先級越高）
 */
export enum DownloadPriority {
    VERSION_JSON = 10, // 版本清單
    CHECK_LIST = 8,
    DEFAULT = 1, // 預設值
    TITLE_IMAGE = 2, // 稱號
    SHINYCARD_IMAGE = 3, // 閃耀卡
    PROFILE_IMAGE = 4, // 玩家頭像
    PLATFORM_NECESSARY = 5, // 平台必要
    PLATFORM_NEWS = 4, // 平台新聞
    PLATFORM_RES = 3,
    GAME_RES = 2,
}

/**
 * ResourceDownloader 常數定義
 */
export const RESOURCE_DOWNLOADER_CONSTANTS = {
    // 重試設定
    DEFAULT_MAX_RETRY_COUNT: 3,

    // 併發設定
    DEFAULT_MAX_CONCURRENT_DOWNLOADS: 15,
    MIN_CONCURRENT_DOWNLOADS: 1,

    // 超時設定
    DEFAULT_TIMEOUT: 150000, // 150秒超時

    // 預設優先級

    // 檔案大小單位轉換
    BYTES_PER_KB: 1024,
    BYTES_PER_MB: 1024 * 1024,

    // ID 生成
    TASK_ID_PREFIX: 'task_',

    // JSON 格式化
    JSON_INDENT_SPACES: 2,

    // 快取相關
    DEFAULT_CACHE_KEY: '',

    // 進度相關
    PROGRESS_START: 0,
    PROGRESS_COMPLETE: 100,

    // URL 分割符
    URL_SEPARATOR: '/',

    // 檔案擴展名檢查
    URL_QUERY_SEPARATOR: '?',
    EXTENSION_DOT: '.',

    // 預設檔案名
    UNKNOWN_FILE_NAME: 'unknown_file',

    // VersionPatcher 相關常量
    DIFF_PATCH_VERSION_NUM_KEY: 'DiffPatch_VersionNum',
    HOSTNAME_PREFIX: 'hostname:',

    // 臨時文件相關
    TEMP_ZIP_FILE_NAME: 'temp_download.zip',

    // HTTP 相關常量
    RESPONSE_TYPE_ARRAYBUFFER: 'arraybuffer',
    MIME_TYPE_TEXT_XML: 'text/xml',

    // 錯誤名稱常量
    ERROR_NAME_QUOTA_EXCEEDED: 'QuotaExceededError',
    XML_PARSER_ERROR_TAG: 'parsererror',
} as const

/**
 * 檔案更新原因列舉
 */
export enum FileUpdateReason {
    MISSING = 'missing',                    // 檔案不存在
    MD5_MISMATCH = 'md5_mismatch',         // MD5 不符合
    VERSION_MISMATCH = 'version_mismatch', // 版本號不符合  
    SIZE_MISMATCH = 'size_mismatch'        // 檔案大小不符合
}

/**
 * 檔案類型列舉
 */
export enum FileType {
    IMAGE_JPG = 'jpg',      // JPG 圖片格式
    IMAGE_PNG = 'png',      // PNG 圖片格式
    DATA_JSON = 'json',     // JSON 資料格式
    DATA_XML = 'xml',       // XML 資料格式
    AUDIO_MP3 = 'mp3',      // MP3 音訊格式
    AUDIO_OGG = 'ogg',      // OGG 音訊格式
    OTHER = 'other'         // 其他檔案類型
}

/**
 * 儲存選項列舉
 */
export enum StorageOption {
    FILE_ONLY = 'file_only',           // 只存成檔案
    NONE = 'none'                      // 不儲存
}

/**
 * 下載任務資訊（完整內部資料）
 */
export interface DownloadTaskInfo {
    // 基本識別資訊
    id: string                      // 任務 ID
    fileName: string                // 檔案名稱
    
    // 內部管理資訊（不對外公開）
    options: DownloadOptions        // 下載選項
    priority: number                // 優先級（數字越大優先級越高）
    createdTime: number             // 創建時間（毫秒時間戳）
    lastUpdateTime: number          // 最後更新時間（毫秒時間戳）
    
    // 下載進度資訊
    startTime?: number              // 開始下載時間（毫秒時間戳）
    totalBytes: number              // 總位元組數
    downloadedBytes: number         // 已下載位元組數
    currentSpeed: number            // 目前速度（位元組/秒）
    weight: number                  // 權重（ZIP=3, 其他=1）
    
    // 計算字段（按需填充）
    elapsedTime?: number            // 已耗費時間（秒）
    progress?: number               // 進度百分比（0-100）
}

/**
 * 下載任務詳細資訊（對外公開的類型視圖）
 * 這是 DownloadTaskInfo 的公開子集，可直接返回同一個目標
 */
export type TaskDetailInfo = Pick<DownloadTaskInfo, 
    'id' | 
    'fileName' | 
    'currentSpeed' | 
    'downloadedBytes' | 
    'totalBytes' | 
    'weight' | 
    'elapsedTime' | 
    'progress'
> & {
    elapsedTime: number     // 必填（從可選改為必填）
    progress: number        // 必填（從可選改為必填）
}

/**
 * 下載速度統計資訊
 * 注意：這是聚合統計，不是單一任務的子集
 */
export interface DownloadSpeedStats {
    totalSpeed: number              // 總體下載速度（位元組/秒）
    activeTaskCount: number         // 活動任務數量
    weightedTaskCount: number       // 加權任務數量（ZIP檔案算3倍）
    totalDownloadedBytes: number    // 總下載位元組數
    averageSpeed: number            // 平均下載速度（位元組/秒）
}

/**
 * 檔案版本資訊 - 參考 VersionV2.json 格式
 */
export interface FileVersionInfo {
    md5: string      // MD5 校驗碼
    version: string  // 版本號
    size: number     // 檔案大小
}

/**
 * 版本資訊物件 - 對應 VersionV2.json 結構
 */
export interface VersionManifest {
    [fileName: string]: FileVersionInfo | any  // 檔案名稱對應版本資訊，或其他屬性如 DiffPatch_VersionNum
}

/**
 * 本地版本資訊儲存格式
 */
export interface LocalVersionInfo {
    [fileName: string]: {
        md5?: string
        version?: string
        size?: number
        lastModified?: number  // 最後修改時間
    }
}

/**
 * 檔案更新資訊
 */
export interface FileUpdateInfo {
    fileName: string                    // 檔案名稱
    currentMD5: string                  // 目前 MD5
    remoteMD5: string                   // 遠端 MD5
    currentVersion: string              // 目前版本
    remoteVersion: string               // 遠端版本
    remoteSize: number                  // 遠端檔案大小
    needsUpdate: boolean                // 是否需要更新
    reason: FileUpdateReason            // 更新原因
}

/**
 * 版本檢查結果
 */
export interface VersionCheckResult {
    totalFiles: number                    // 總檔案數量
    needUpdateFiles: FileUpdateInfo[]     // 需要更新的檔案列表
    upToDateFiles: FileUpdateInfo[]       // 已是最新的檔案列表
    hasUpdates: boolean                   // 是否有更新
    totalUpdateSize: number               // 需要更新的總檔案大小
}

/**
 * 下載結果介面
 */
export interface DownloadResult {
    fileType: FileType          // 檔案類型
    rawData?: BufferAsset       // 原始資料
    filePath?: string           // 檔案路徑
    imageAsset?: ImageAsset     // 圖片資產 (ImageAsset)
    texture?: Texture2D         // 圖片資產 (Texture2D)
    spriteFrame?: SpriteFrame   // 圖片資產 (SpriteFrame)
    jsonObject?: JsonAsset      // JSON 物件
    textAsset?: TextAsset       // Text 物件
    audioData?: AudioClip       // 音訊資料
    asset?: Asset               // 通用 Asset 物件（用於 assetManager cache）
    fromCache?: boolean         // 是否來自 cache
}

/**
 * 下載選項介面
 */
export interface DownloadOptions extends CombinedCallbackOptions {
    url: string                       // 下載 URL
    fileName: string                  // 檔案名稱（必要）
    storageOption: StorageOption       // 儲存選項，預設為 MEMORY_ONLY
    onSuccess: (result: DownloadResult) => void    // 成功回調
    onError: (error: ResourceDownloaderErrorInfo) => void    // 錯誤回調
    checkExistingFile?: boolean         // 是否檢查已存在的檔案，預設為 true
    savePath?: string                   // 保存路徑，預設為 '' (不保存)
    priority?: number                   // 下載優先級，數值越大優先級越高
    maxRetryCount?: number              // 最大重試次數
    cacheKey?: string                   // 快取鍵值，預設為檔案名稱
    targetSprite?: any                  // 目標 Sprite 組件，用於直接替換 spriteFrame (僅圖片)
    onProgress?: (progress: ResourceDownloaderProgressInfo) => void  // 進度回調
    useAssetCache?: boolean             // 是否使用 assetManager cache，預設為 true
}

/**
 * 建立簡單的下載選項
 */
export function CreateSimpleDownloadOptions(
    url: string,
    fileName: string,
    storageOption: StorageOption,
    onSuccess: (result: DownloadResult) => void,
    onError: (error: ResourceDownloaderErrorInfo) => void,
    checkExistingFile: boolean = true,
    savePath: string = RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_CACHE_KEY,
    target: any = null,
    priority: number = DownloadPriority.DEFAULT,
    maxRetryCount: number = RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_MAX_RETRY_COUNT,
    cacheKey: string = savePath,
    targetSprite: any = null,
    onProgress: (progress: ResourceDownloaderProgressInfo) => void = null,
    useAssetCache: boolean = true,
): DownloadOptions {
    return {
        url,
        fileName,
        storageOption,
        onSuccess,
        onError,
        checkExistingFile,
        savePath,
        target,
        priority,
        maxRetryCount,
        cacheKey,
        targetSprite,
        onProgress,
        useAssetCache,
    }
}

/**
 * 從檔案路徑中提取目錄路徑
 * @param filePath 完整檔案路徑
 * @returns 目錄路徑，如果無法提取則返回空字串
 */
export function GetDirectoryFromPath(filePath: string): string {
    const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
    if (lastSlashIndex > 0) {
        return filePath.substring(0, lastSlashIndex)
    }
    return ''
}

/**
 * 從 URL 或檔案名稱中提取副檔名
 * @param url URL 或檔案名稱
 * @returns 副檔名（不含點），如果沒有副檔名則返回空字串
 */
export function GetFileExtension(url: string): string {
    const urlWithoutQuery = url.split(RESOURCE_DOWNLOADER_CONSTANTS.URL_QUERY_SEPARATOR)[0]
    const lastDotIndex = urlWithoutQuery.lastIndexOf(RESOURCE_DOWNLOADER_CONSTANTS.EXTENSION_DOT)
    return lastDotIndex > -1 ? urlWithoutQuery.substring(lastDotIndex + 1) : ''
}

/**
 * 從 URL 中提取檔案名稱
 * @param url 完整 URL
 * @returns 檔案名稱，如果無法提取則返回預設檔案名
 */
export function GetFileNameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url)
        const pathname = urlObj.pathname
        const fileName = pathname.split(RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR).pop() || RESOURCE_DOWNLOADER_CONSTANTS.UNKNOWN_FILE_NAME
        return fileName
    } catch {
        // 如果 URL 解析失敗，使用 URL 的最後部分
        const parts = url.split(RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR)
        return parts[parts.length - 1] || RESOURCE_DOWNLOADER_CONSTANTS.UNKNOWN_FILE_NAME
    }
}

/**
 * 根據檔案擴展名檢測檔案類型
 * @param fileNameOrUrl 檔案名稱或 URL
 * @returns 檔案類型
 */
export function DetectFileType(fileNameOrUrl: string): FileType {
    const extension = GetFileExtension(fileNameOrUrl).toLowerCase()

    switch (extension) {
        case 'jpg':
        case 'jpeg':
            return FileType.IMAGE_JPG
        case 'png':
            return FileType.IMAGE_PNG
        case 'json':
            return FileType.DATA_JSON
        case 'xml':
            return FileType.DATA_XML
        case 'mp3':
            return FileType.AUDIO_MP3
        case 'ogg':
            return FileType.AUDIO_OGG
        default:
            return FileType.OTHER
    }
}

/**
 * 檢查檔案類型是否為圖片類型
 * @param fileType 檔案類型
 * @returns 是否為圖片類型
 */
export function IsImageType(fileType: FileType): boolean {
    return fileType === FileType.IMAGE_JPG || fileType === FileType.IMAGE_PNG
}

/**
 * 根據檔案名稱判斷檔案權重（ZIP 檔案為 3 倍，其他檔案為 1 倍）
 * @param fileName 檔案名稱
 * @returns 檔案權重
 */
export function GetFileWeight(fileName: string): number {
    const extension = GetFileExtension(fileName).toLowerCase()
    return extension === 'zip' ? 3 : 1
}

/**
 * 取得有效的檔案名稱列表（排除特殊屬性）
 * @param manifest 版本清單
 * @returns 有效檔案名稱陣列
 */
export function GetValidFileNames(manifest: VersionManifest): string[] {
    return Object.keys(manifest).filter(fileName => {
        // 排除特殊屬性
        if (fileName === RESOURCE_DOWNLOADER_CONSTANTS.DIFF_PATCH_VERSION_NUM_KEY ||
            fileName.includes(RESOURCE_DOWNLOADER_CONSTANTS.HOSTNAME_PREFIX)) {
            return false
        }

        const fileInfo = manifest[fileName]
        // 確保是有效的版本資訊物件
        return fileInfo && typeof fileInfo === 'object' &&
            'md5' in fileInfo && 'version' in fileInfo && 'size' in fileInfo
    })
}
