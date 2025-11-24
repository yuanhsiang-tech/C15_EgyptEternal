import { IResourceHandler } from '../../Stark/ResourceDownloader/ResourceHandler'
import {
    ResourceDownloaderErrorType,
    ResourceDownloaderErrorInfo,
    StorageOption,
    DownloadResult,
    CreateSimpleDownloadOptions,
    DownloadPriority,
    RESOURCE_DOWNLOADER_CONSTANTS,
    ResourceDownloaderCallbackHelper,
    CombinedCallbackOptions,
    GetFileNameFromUrl,
    DetectFileType,
} from '../../Stark/ResourceDownloader/ResourceDownloaderDefine'
import { log, warn, error, BufferAsset } from 'cc'
import {
    LocalVersionedInfo, SingleFileDownloadOptions, VERSIONED_DOWNLOADER_CONSTANTS,
    VersionedDownloadCategory, VersionedFileInfo
} from './VersionedDownloaderDefine'
import { Downloader } from './Downloader'

/**
 * 版本化單一檔案下載器
 * 用於管理單一檔案的版本化下載，先檢查 VersionedFile.json 決定是否需要下載
 */
export class VersionedSingleFileDownloader {
    private static s_instance: VersionedSingleFileDownloader | null = null
    private m_versionedFileManifestMap: Map<string, VersionedFileInfo[]> = new Map() // 版本化檔案清單（按 category 分類）
    private m_localVersionedInfoMap: Map<string, LocalVersionedInfo> = new Map()     // 本地版本化檔案資訊（按 category 分類）
    private m_downloader: Downloader                   // 資源下載器實例
    private m_resourceHandler: IResourceHandler                       // 資源處理器委託
    private m_loadedCategoriesSet: Set<string> = new Set()             // 已載入的版本清單 categories
    private m_initializedCategoriesSet: Set<string> = new Set()        // 已初始化的本地版本資訊 categories


    private constructor() {
        this.m_downloader = Downloader.GetInstance()
        this.m_resourceHandler = this.m_downloader.ResourceHandler
    }

    /**
     * 取得單例實例
     */
    public static GetInstance(): VersionedSingleFileDownloader {
        if (!VersionedSingleFileDownloader.s_instance) {
            VersionedSingleFileDownloader.s_instance = new VersionedSingleFileDownloader()
        }
        return VersionedSingleFileDownloader.s_instance
    }

    /**
     * 載入版本化檔案清單 (VersionedFile_category.json)
     * @param versionedFileURL VersionedFile_category.json 的 URL
     * @param category 類別名稱（預設：DEFAULT）
     * @param onSuccess 成功回調
     * @param onError 錯誤回調
     * @param target 回調目標目標
     */
    public LoadVersionedFileManifest(
        versionedFileURL: string,
        category: VersionedDownloadCategory = VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY,
        onSuccess?: (manifest: VersionedFileInfo[]) => void,
        onError?: (error: ResourceDownloaderErrorInfo) => void,
        target?: any
    ): void {
        log(`🔍 VersionedSingleFileDownloader: 開始載入版本化檔案清單 [${category}] - ${versionedFileURL}`)

        // 先檢查是否已載入版本清單快取
        if (this.m_loadedCategoriesSet.has(category) && this.m_versionedFileManifestMap.has(category)) {
            const cachedManifest = this.m_versionedFileManifestMap.get(category)!
            log(`🎯 VersionedSingleFileDownloader: 使用快取的版本化檔案清單 [${category}]，共 ${cachedManifest.length} 個檔案`)

            if (onSuccess) {
                if (target) {
                    onSuccess.apply(target, [cachedManifest])
                } else {
                    onSuccess(cachedManifest)
                }
            }
            return
        }

        const downloadOptions = CreateSimpleDownloadOptions(
            versionedFileURL,
            GetFileNameFromUrl(versionedFileURL),
            StorageOption.NONE, // 版本檔案不需要保存到本地，只需暫存在記憶體
            this._onVersionManifestDownloaded.bind(this, category, onSuccess, onError, target),
            this._onVersionManifestDownloadError.bind(this, category, onError, target),
            false,
            '',
            target,
            DownloadPriority.VERSION_JSON,
            RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_MAX_RETRY_COUNT,
            `${VERSIONED_DOWNLOADER_CONSTANTS.VERSION_MANIFEST_CACHE_KEY}_${category}`
        )

        this.m_downloader.Download(downloadOptions)
    }

    /**
     * 版本清單下載成功回調
     */
    private _onVersionManifestDownloaded(
        category: VersionedDownloadCategory,
        onSuccess: ((manifest: VersionedFileInfo[]) => void) | undefined,
        onError: ((error: ResourceDownloaderErrorInfo) => void) | undefined,
        target: any,
        result: DownloadResult
    ): void {
        if (result.jsonObject && result.jsonObject.json && Array.isArray(result.jsonObject.json)) {
            const manifest = result.jsonObject.json as VersionedFileInfo[]
            this.m_versionedFileManifestMap.set(category, manifest)
            this.m_loadedCategoriesSet.add(category)

            log(`✅ VersionedSingleFileDownloader: 版本化檔案清單 [${category}] 載入成功，共 ${manifest.length} 個檔案`)

            if (onSuccess) {
                if (target) {
                    onSuccess.apply(target, [manifest])
                } else {
                    onSuccess(manifest)
                }
            }
        } else {
            const errorInfo: ResourceDownloaderErrorInfo = {
                errorType: ResourceDownloaderErrorType.JSON_PARSE_FAILED,
                message: `版本化檔案清單 [${category}] 格式錯誤，應為陣列格式`
            }
            error(`❌ VersionedSingleFileDownloader: 版本化檔案清單 [${category}] 格式錯誤`)

            if (onError) {
                if (target) {
                    onError.apply(target, [errorInfo])
                } else {
                    onError(errorInfo)
                }
            }
        }
    }

    /**
     * 版本清單下載錯誤回調
     */
    private _onVersionManifestDownloadError(
        category: VersionedDownloadCategory,
        onError: ((error: ResourceDownloaderErrorInfo) => void) | undefined,
        target: any,
        downloadError: ResourceDownloaderErrorInfo
    ): void {
        error(`❌ VersionedSingleFileDownloader: 載入版本化檔案清單 [${category}] 失敗 - ${downloadError.message}`)
        if (onError) {
            if (target) {
                onError.apply(target, [downloadError])
            } else {
                onError(downloadError)
            }
        }
    }

    /**
     * 下載單一檔案（推薦使用 DownloadFileWithVersionCheck）
     * @param options 下載選項
     */
    public DownloadSingleFile(options: SingleFileDownloadOptions): void {
        const category = options.category || VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY
        log(`🔽 VersionedSingleFileDownloader: 準備下載檔案 [${category}] - ${options.filePath}`)

        // 確保本地版本資訊已載入
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersionedInfo(category)
        }

        // 如果強制下載，直接下載檔案
        if (options.forceDownload) {
            log(`🚀 VersionedSingleFileDownloader: 強制下載模式，直接下載檔案`)
            this._performFileDownload(options, true)
            return
        }

        // 如果版本化檔案清單尚未載入，先載入版本清單
        if (!this.m_loadedCategoriesSet.has(category)) {
            log(`📋 VersionedSingleFileDownloader: 版本化檔案清單 [${category}] 尚未載入，先載入版本清單`)
            this._autoLoadVersionedFileManifest(options.baseURL, category, {
                onSuccess: this._continueFileDownloadProcess.bind(this, options),
                onError: this._onAutoLoadManifestError.bind(this, options),
                target: options.target
            })
        } else {
            // 版本清單已載入，直接繼續處理
            this._continueFileDownloadProcess(options)
        }
    }

    /**
     * 自動載入版本清單錯誤回調
     */
    private _onAutoLoadManifestError(options: SingleFileDownloadOptions, error: ResourceDownloaderErrorInfo): void {
        // 載入失敗，直接下載檔案（可能沒有版本控制）
        warn(`⚠️ VersionedSingleFileDownloader: 載入版本清單失敗，直接下載檔案 - ${error.message}`)
        this._continueFileDownloadProcess(options)
    }

    /**
     * 清除本地版本化資訊
     * @param category 類別名稱（預設：DEFAULT）
     * @param filePaths 要清除的檔案路徑列表，如果為空則清除該 category 下的所有資訊
     */
    public ClearLocalVersionedInfo(category: VersionedDownloadCategory = VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY, filePaths?: string[]): void {
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersionedInfo(category)
        }

        const localVersionedInfo = this.m_localVersionedInfoMap.get(category) || {}

        if (filePaths && filePaths.length > 0) {
            filePaths.forEach(filePath => {
                delete localVersionedInfo[filePath]
                log(`🗑️ VersionedSingleFileDownloader: 清除本地版本化資訊 [${category}] - ${filePath}`)
            })
        } else {
            this.m_localVersionedInfoMap.set(category, {})
            log(`🗑️ VersionedSingleFileDownloader: 清除所有本地版本化資訊 [${category}]`)
        }

        this._saveLocalVersionedInfo(category)
    }

    /**
     * 取得本地版本化資訊
     * @param category 類別名稱（預設：DEFAULT）
     */
    public GetLocalVersionedInfo(category: VersionedDownloadCategory = VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY): LocalVersionedInfo {
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersionedInfo(category)
        }
        const info = this.m_localVersionedInfoMap.get(category) || {}
        return { ...info }
    }

    /**
     * 取得版本化檔案清單
     * @param category 類別名稱（預設：DEFAULT）
     */
    public GetVersionedFileManifest(category: VersionedDownloadCategory = VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY): VersionedFileInfo[] {
        const manifest = this.m_versionedFileManifestMap.get(category) || []
        return [...manifest]
    }

    /**
     * 檢查版本化檔案清單是否已載入
     * @param category 類別名稱（預設：DEFAULT）
     */
    public IsVersionedFileLoaded(category: VersionedDownloadCategory = VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY): boolean {
        return this.m_loadedCategoriesSet.has(category)
    }

    /**
     * 檢查本地版本化資訊是否已載入
     * @param category 類別名稱（預設：DEFAULT）
     */
    public IsLocalVersionedLoaded(category: VersionedDownloadCategory = VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY): boolean {
        return this.m_initializedCategoriesSet.has(category)
    }

    /**
     * 清除版本化檔案清單快取
     * @param category 類別名稱，如果未指定則清除所有類別
     */
    public ClearVersionedFileManifestCache(category?: VersionedDownloadCategory): void {
        if (category) {
            this.m_versionedFileManifestMap.delete(category)
            this.m_loadedCategoriesSet.delete(category)
            log(`🗑️ VersionedSingleFileDownloader: 清除版本化檔案清單快取 [${category}]`)
        } else {
            this.m_versionedFileManifestMap.clear()
            this.m_loadedCategoriesSet.clear()
            log(`🗑️ VersionedSingleFileDownloader: 清除所有版本化檔案清單快取`)
        }
    }

    /**
     * 強制重新載入版本化檔案清單
     * @param versionedFileURL VersionedFile_category.json 的 URL
     * @param category 類別名稱（預設：DEFAULT）
     * @param onSuccess 成功回調
     * @param onError 錯誤回調  
     * @param target 回調目標目標
     */
    public ForceReloadVersionedFileManifest(
        versionedFileURL: string,
        category: VersionedDownloadCategory = VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY,
        onSuccess?: (manifest: VersionedFileInfo[]) => void,
        onError?: (error: ResourceDownloaderErrorInfo) => void,
        target?: any
    ): void {
        // 先清除快取
        this.ClearVersionedFileManifestCache(category)
        // 重新載入
        this.LoadVersionedFileManifest(versionedFileURL, category, onSuccess, onError, target)
    }

    /**
     * 下載檔案並自動進行版本檢查（推薦使用此方法）
     * 此方法會自動載入 VersionedFile.json 並進行版本比較
     * @param baseURL 基礎 URL（例如: "https://example.com/resources/"）
     * @param filePath 檔案路徑（例如: "ShinyCard/ShinyCard_12021.png"）
     * @param options 額外選項
     */
    public DownloadFileWithVersionCheck(
        baseURL: string,
        filePath: string,
        options?: Partial<SingleFileDownloadOptions>
    ): void {
        const fullOptions: SingleFileDownloadOptions = {
            category: VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY, // 預設類別
            storageOption: StorageOption.FILE_ONLY,  // 預設儲存選項，檔案存至本地
            ...options,                         // 用戶自定義的可選配置
            baseURL: baseURL,                   // 顯式參數，不可被覆蓋
            filePath: filePath,                 // 顯式參數，不可被覆蓋
        }

        this.DownloadSingleFile(fullOptions)
    }

    /**
     * 自動載入版本化檔案清單
     * @param baseURL 基礎 URL
     * @param category 類別名稱
     * @param options 回調選項
     */
    private _autoLoadVersionedFileManifest(
        baseURL: string,
        category: VersionedDownloadCategory,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
            onError?: (error: ResourceDownloaderErrorInfo) => void
        }
    ): void {
        const versionedFileName = `${VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_FILE_NAME_PREFIX}${category}${VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_FILE_NAME_SUFFIX}`
        const versionedFileURL = this._buildFileURL(baseURL, versionedFileName)
        log(`🔍 VersionedSingleFileDownloader: 自動載入版本化檔案清單 [${category}] - ${versionedFileURL}`)

        this.LoadVersionedFileManifest(
            versionedFileURL,
            category,
            (manifest: VersionedFileInfo[]) => {
                ResourceDownloaderCallbackHelper.CallSuccess(options)
            },
            (error: ResourceDownloaderErrorInfo) => {
                ResourceDownloaderCallbackHelper.CallError(options, error)
            },
            options.target
        )
    }

    /**
     * 繼續檔案下載處理流程
     * @param options 下載選項
     */
    private _continueFileDownloadProcess(options: SingleFileDownloadOptions): void {
        // 檢查檔案是否存在於本地
        this._checkFileExists(options.filePath, {
            onSuccess: (exists: boolean) => {
                if (!exists) {
                    // 檔案不存在，直接下載
                    log(`📥 VersionedSingleFileDownloader: 檔案不存在，直接下載 - ${options.filePath}`)
                    this._performFileDownload(options, true)
                } else {
                    // 檔案存在，檢查版本
                    this._checkVersionAndDownload(options)
                }
            },
            onError: (errorInfo: ResourceDownloaderErrorInfo) => {
                warn(`⚠️ VersionedSingleFileDownloader: 檢查檔案存在時發生錯誤，直接下載 - ${errorInfo.message}`)
                this._performFileDownload(options, true)
            },
            onProgress: options.onProgress,
            target: options.target
        })
    }

    /**
     * 檢查版本並決定是否下載
     * @param options 下載選項
     */
    private _checkVersionAndDownload(options: SingleFileDownloadOptions): void {
        const category = options.category || VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY

        if (!this.m_loadedCategoriesSet.has(category)) {
            warn(`⚠️ VersionedSingleFileDownloader: 版本化檔案清單 [${category}] 尚未載入，直接下載檔案`)
            this._performFileDownload(options, true)
            return
        }

        // 在版本化檔案清單中查找檔案
        const versionedFileManifest = this.m_versionedFileManifestMap.get(category) || []
        const versionedFile = versionedFileManifest.find(item => item.file === options.filePath)

        if (!versionedFile) {
            // 檔案不在版本化清單中，直接下載（可能是普通檔案）
            log(`📄 VersionedSingleFileDownloader: 檔案不在版本化清單 [${category}] 中，直接下載 - ${options.filePath}`)
            this._performFileDownload(options, true)
            return
        }

        // 檢查本地版本資訊
        const localVersionedInfo = this.m_localVersionedInfoMap.get(category) || {}
        const localVersionInfo = localVersionedInfo[options.filePath]
        const remoteVersion = versionedFile.version
        const localVersion = localVersionInfo?.version || 0

        log(`🔍 VersionedSingleFileDownloader: 版本檢查 [${category}] ${options.filePath} - 本地: v${localVersion}, 遠端: v${remoteVersion}`)

        if (localVersion >= remoteVersion) {
            // 本地版本已是最新，不需要下載
            log(`✅ VersionedSingleFileDownloader: 檔案已是最新版本，不需要下載 - ${options.filePath}`)

            // 載入本地檔案並回調
            this._loadExistingFile(options, false)
        } else {
            // 需要下載更新
            log(`📦 VersionedSingleFileDownloader: 檔案需要更新 (v${localVersion} -> v${remoteVersion}) - ${options.filePath}`)
            this._performFileDownload(options, true, remoteVersion)
        }
    }

    /**
     * 執行實際的檔案下載
     * @param options 下載選項
     * @param wasUpdated 是否為更新
     * @param remoteVersion 遠端版本號（可選）
     */
    private _performFileDownload(options: SingleFileDownloadOptions, wasUpdated: boolean, remoteVersion?: number): void {
        const fileURL = this._buildFileURL(options.baseURL, options.filePath)
        const fileName = GetFileNameFromUrl(options.filePath)
        const storageOption = options.storageOption || StorageOption.FILE_ONLY
        const savePath = options.savePath || options.filePath

        log(`🚀 VersionedSingleFileDownloader: 開始下載 - ${fileURL}`)

        const downloadOptions = CreateSimpleDownloadOptions(
            fileURL,
            fileName,
            storageOption,
            (result: DownloadResult) => {
                log(`✅ VersionedSingleFileDownloader: 檔案下載成功 - ${options.filePath}`)

                // 更新本地版本資訊（如果有遠端版本號）
                if (remoteVersion !== undefined) {
                    const category = options.category || VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_DEFAULT_CATEGORY
                    this._updateLocalVersionInfo(category, options.filePath, remoteVersion)
                }

                // 呼叫成功回調
                ResourceDownloaderCallbackHelper.CallSuccess(options, result, wasUpdated)
            },
            (downloadError: ResourceDownloaderErrorInfo) => {
                error(`❌ VersionedSingleFileDownloader: 檔案下載失敗 - ${options.filePath} - ${downloadError.message}`)
                ResourceDownloaderCallbackHelper.CallError(options, downloadError)
            },
            true,
            savePath,
            options.target,
            options.priority || DownloadPriority.DEFAULT,
            RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_MAX_RETRY_COUNT,
            fileName,
            null,
            options.onProgress
        )

        this.m_downloader.Download(downloadOptions)
    }

    /**
     * 載入現有檔案
     * @param options 下載選項
     * @param wasUpdated 是否為更新
     */
    private _loadExistingFile(options: SingleFileDownloadOptions, wasUpdated: boolean): void {
        const filePath = options.savePath || options.filePath

        this.m_resourceHandler.LoadFromFile(filePath, {
            onSuccess: (data: ArrayBuffer) => {
                const bufferAsset = new BufferAsset()
                bufferAsset._nativeAsset = data

                const result: DownloadResult = {
                    fileType: DetectFileType(options.filePath),
                    rawData: bufferAsset,
                    filePath: filePath
                }
                ResourceDownloaderCallbackHelper.CallSuccess(options, result, wasUpdated)
            },
            onError: (errorInfo: ResourceDownloaderErrorInfo) => {
                warn(`⚠️ VersionedSingleFileDownloader: 載入本地檔案失敗，重新下載 - ${errorInfo.message}`)
                this._performFileDownload(options, true)
            },
            onProgress: options.onProgress,
            target: options.target
        })
    }

    /**
     * 檢查檔案是否存在
     * @param filePath 檔案路徑
     * @param options 回調選項
     */
    private _checkFileExists(filePath: string, options: CombinedCallbackOptions & { onSuccess?: (exists: boolean) => void }): void {
        this.m_resourceHandler.LoadFromFile(filePath, {
            onSuccess: () => {
                ResourceDownloaderCallbackHelper.CallSuccess(options, true)
            },
            onError: (errorInfo: ResourceDownloaderErrorInfo) => {
                if (errorInfo.errorType === ResourceDownloaderErrorType.FILE_NOT_FOUND) {
                    ResourceDownloaderCallbackHelper.CallSuccess(options, false)
                } else {
                    ResourceDownloaderCallbackHelper.CallError(options, errorInfo)
                }
            },
            onProgress: options.onProgress,
            target: options.target
        })
    }

    /**
     * 初始化本地版本化資訊（使用 delegate）
     * @param category 類別名稱
     */
    private _initializeLocalVersionedInfo(category: VersionedDownloadCategory): void {
        if (this.m_initializedCategoriesSet.has(category)) {
            return
        }

        const localVersionedKey = `${VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_LOCAL_KEY_PREFIX}${category}`

        // 使用 delegate 載入本地版本化資訊
        this.m_resourceHandler.LoadJsonData(localVersionedKey, {
            onSuccess: (jsonData: any) => {
                const localVersionedInfo = jsonData || {}
                this.m_localVersionedInfoMap.set(category, localVersionedInfo)
                this.m_initializedCategoriesSet.add(category)
                if (Object.keys(localVersionedInfo).length > 0) {
                    log(`✅ VersionedSingleFileDownloader: 載入本地版本化資訊 [${category}] 成功，共 ${Object.keys(localVersionedInfo).length} 個檔案`)
                } else {
                    log(`📝 VersionedSingleFileDownloader: 無版本化資訊 [${category}]，建立新的版本資訊`)
                }
            },
            onError: (errorInfo: ResourceDownloaderErrorInfo) => {
                if (errorInfo.errorType === ResourceDownloaderErrorType.FILE_NOT_FOUND) {
                    log(`📝 VersionedSingleFileDownloader: 本地版本化檔案 [${category}] 不存在，建立新的版本資訊`)
                } else {
                    error(`❌ VersionedSingleFileDownloader: 載入本地版本化資訊 [${category}] 失敗 - ${errorInfo.message}`)
                }
                this.m_localVersionedInfoMap.set(category, {})
                this.m_initializedCategoriesSet.add(category)
            }
        })
    }

    /**
     * 保存本地版本化資訊（使用 delegate）
     * @param category 類別名稱
     */
    private _saveLocalVersionedInfo(category: VersionedDownloadCategory): void {
        if (!this.m_initializedCategoriesSet.has(category)) {
            warn(`⚠️ VersionedSingleFileDownloader: 本地版本化資訊 [${category}] 尚未初始化，無法保存`)
            return
        }

        const localVersionedKey = `${VERSIONED_DOWNLOADER_CONSTANTS.VERSIONED_LOCAL_KEY_PREFIX}${category}`
        const localVersionedInfo = this.m_localVersionedInfoMap.get(category) || {}

        // 使用 delegate 保存本地版本化資訊
        this.m_resourceHandler.SaveJsonData(localVersionedKey, localVersionedInfo, {
            onSuccess: () => {
                log(`💾 VersionedSingleFileDownloader: 本地版本化資訊 [${category}] 已保存`)
            },
            onError: (errorInfo: ResourceDownloaderErrorInfo) => {
                error(`❌ VersionedSingleFileDownloader: 保存本地版本化資訊 [${category}] 失敗 - ${errorInfo.message}`)
            }
        })
    }


    /**
     * 更新本地版本化資訊
     * @param category 類別名稱
     * @param filePath 檔案路徑
     * @param version 版本號
     */
    private _updateLocalVersionInfo(category: VersionedDownloadCategory, filePath: string, version: number): void {
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersionedInfo(category)
        }

        const localVersionedInfo = this.m_localVersionedInfoMap.get(category) || {}
        localVersionedInfo[filePath] = {
            version: version,
            lastModified: Date.now()
        }
        this.m_localVersionedInfoMap.set(category, localVersionedInfo)

        this._saveLocalVersionedInfo(category)
        log(`📋 VersionedSingleFileDownloader: 更新檔案版本資訊 [${category}] ${filePath} -> v${version}`)
    }

    /**
     * 建構檔案下載 URL
     * @param baseURL 基礎 URL
     * @param filePath 檔案路徑
     * @returns 完整的檔案 URL
     */
    private _buildFileURL(baseURL: string, filePath: string): string {
        const cleanFilePath = filePath.startsWith(RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR) ? filePath.substring(1) : filePath
        const separator = baseURL.endsWith(RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR) ? VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_STRING : RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR
        return `${baseURL}${separator}${cleanFilePath}`
    }
}
