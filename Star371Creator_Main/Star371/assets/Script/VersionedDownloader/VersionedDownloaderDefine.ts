import {
    CombinedCallbackOptions, DownloadResult, ResourceDownloaderErrorInfo,
    StorageOption
} from "../../Stark/ResourceDownloader/ResourceDownloaderDefine"

/**
 * 版本化下载分类枚举
 */
export enum VersionedDownloadCategory {
    DEFAULT = "default",
    PROFILE_PIC = "profile_pic",
    UNION_PIC = "union_pic",
    SHINYCARD = "shiny_card",
    WORDCOLLECTION = "word_collection",
    NEWSAD = "news_ad",
    SCRATCHTICKET = "scratch_ticket",
    STARROLE = "star_role",
}

/**
 * 統一下載回調選項
 */
export interface DownloadCallbacks {
    onSuccess?: (result: any, wasUpdated?: boolean) => void
    onError?: (error: ResourceDownloaderErrorInfo) => void
    onProgress?: (current: number, total: number, fileName?: string) => void
    target?: any
}

/**
 * 版本化檔案資訊介面
 */
export interface VersionedFileInfo {
    file: string        // 檔案路徑
    version: number     // 版本號
}

/**
 * 本地版本化檔案資訊
 */
export interface LocalVersionedInfo {
    [filePath: string]: {
        version: number
        lastModified: number
    }
}

/**
 * 單一檔案下載選項
 */
export interface SingleFileDownloadOptions extends CombinedCallbackOptions {
    baseURL: string                                                    // 基礎 URL
    filePath: string                                                   // 檔案路徑
    category?: VersionedDownloadCategory                               // 類別，用於區分不同子目錄的版本檔案（預設：DEFAULT）
    storageOption?: StorageOption                                      // 儲存選項
    savePath?: string                                                  // 保存路徑
    priority?: number                                                  // 下載優先級
    onSuccess?: (result: DownloadResult, wasUpdated: boolean) => void  // 成功回調，wasUpdated 表示是否有更新
    forceDownload?: boolean                                            // 強制下載，忽略版本檢查
}

/**
 * VersionedDownloader 常數定義
 */
export const VERSIONED_DOWNLOADER_CONSTANTS = {

    // 檔案處理
    DEFAULT_VERSION: '0',
    DEFAULT_FILE_SIZE: 0,

    // 預設檔案名
    VERSION_MANIFEST_CACHE_KEY: 'version_manifest',

    // VersionPatcher 相關常量
    DIFF_PACKAGE_SEPARATOR: '__',
    VERSION_SEPARATOR: '_',
    ZIP_EXTENSION: '.zip',

    // 正則表達式相關
    REGEX_PREFIX_SLASH: /^\//,
    REGEX_ZIP_EXTENSION: /\.zip$/,
    REGEX_NON_DIGIT: /[^0-9]/g,

    // 數字解析相關
    PARSE_INT_RADIX: 10,
    DEFAULT_NUMERIC_VALUE: 0,

    // 版本號分隔符
    VERSION_DOT_SEPARATOR: '.',

    // Preview 相關
    PREVIEW_FIELD_KEY: 'Preview',

    // 字串空值
    EMPTY_STRING: '',
    EMPTY_MD5: '',
    DEFAULT_LAST_MODIFIED: 0,

    // VersionedSingleFileDownloader 相關常量
    VERSIONED_DEFAULT_CATEGORY: VersionedDownloadCategory.DEFAULT,
    VERSIONED_LOCAL_KEY_PREFIX: 'LocalVersionedFile_',
    VERSIONED_FILE_NAME_PREFIX: 'VersionedFile_',
    VERSIONED_FILE_NAME_SUFFIX: '.json',

    // ZipVersionPatcher 相關常量
    ZIP_VERSION_DEFAULT_CATEGORY: VersionedDownloadCategory.DEFAULT,
    ZIP_VERSION_FILE_PREFIX: 'VersionZip_',
    LOCAL_ZIP_VERSION_PREFIX: 'LocalVersionZip_',
} as const