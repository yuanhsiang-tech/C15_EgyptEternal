import { IResourceHandler } from '../../Stark/ResourceDownloader/ResourceHandler'
import {
    ResourceDownloaderErrorType,
    ResourceDownloaderErrorInfo,
    ResourceDownloaderProgressInfo,
    StorageOption,
    DownloadResult,
    CreateSimpleDownloadOptions,
    DownloadPriority,
    RESOURCE_DOWNLOADER_CONSTANTS,
    FileVersionInfo,
    VersionManifest,
    LocalVersionInfo,
    FileUpdateInfo,
    VersionCheckResult,
    BatchUpdateOptions,
    FileUpdateReason,
    ResourceDownloaderCallbackHelper,
    GetFileNameFromUrl,
    GetValidFileNames,
} from '../../Stark/ResourceDownloader/ResourceDownloaderDefine'
import { log, warn, error } from 'cc'
import { VERSIONED_DOWNLOADER_CONSTANTS } from './VersionedDownloaderDefine'
import { Downloader } from './Downloader'

/**
 * 下載上下文介面
 */
interface DownloadContext {
    updateInfo: FileUpdateInfo
    options: BatchUpdateOptions
    storageOption: StorageOption
    targetVersion: string
    totalFiles: number
    category: string
    successCount: () => number
    failedCount: () => number
    completedCount: () => number
    downloadedSize: () => number
    incrementSuccess: () => void
    incrementFailed: () => void
    checkBatchComplete: () => void
}


/**
 * 版本修補器 - 負責版本管理、檔案更新檢查和批量更新
 * 基於 VersionZip_category.json 格式和 ResourceDownloader 系統
 */
export class ZipVersionPatcher {
    private static s_instance: ZipVersionPatcher | null = null
    private m_localVersionInfoMap: Map<string, LocalVersionInfo> = new Map()        // 本地版本資訊（按 category 分組）
    private m_remoteVersionManifestMap: Map<string, VersionManifest> = new Map()   // 遠端版本清單（按 category 分組）
    private m_diffPatchVersionNumMap: Map<string, { [fileName: string]: number[] }> = new Map() // DiffPatch 版本號資訊（按 category 分組）
    private m_downloader: Downloader            // 資源下載器實例
    private m_resourceHandler: IResourceHandler                 // 資源處理器委託
    private m_loadedCategoriesSet: Set<string> = new Set()      // 已載入的版本清單 categories
    private m_initializedCategoriesSet: Set<string> = new Set() // 已初始化的本地版本資訊 categories
    private m_isUsePreview: boolean = false                     // 是否使用 Preview 版本

    private constructor() {
        this.m_downloader = Downloader.GetInstance()
        this.m_resourceHandler = this.m_downloader.ResourceHandler
    }

    /**
     * 取得單例實例
     */
    public static GetInstance(): ZipVersionPatcher {
        if (!ZipVersionPatcher.s_instance) {
            ZipVersionPatcher.s_instance = new ZipVersionPatcher()
        }
        return ZipVersionPatcher.s_instance
    }

    /**
     * 設置是否使用 Preview 版本
     * @param usePreview 是否使用 Preview 版本
     */
    public SetUsePreview(usePreview: boolean): void {
        this.m_isUsePreview = usePreview
        log(`🔧 ZipVersionPatcher: Preview 模式 ${usePreview ? '啟用' : '停用'}`)
    }

    /**
     * 取得是否使用 Preview 版本
     */
    public IsUsePreview(): boolean {
        return this.m_isUsePreview
    }

    /**
     * 清除所有隊列中的任務（委派給 ResourceDownloader）
     */
    public ClearDownloadQueue(): void {
        this.m_downloader.ClearDownloadQueue()
    }

    /**
     * 便捷方法：自動載入版本清單並檢查更新，如有差異則進行批量更新
     * @param baseURL 基礎 URL（例如: "https://example.com/resources/"）
     * @param category 類別名稱（預設："DEFAULT"）
     * @param options 批量更新選項
     * @param onComplete 完成回調（包含是否有更新的資訊）
     * @param onError 錯誤回調
     * @param target 回調目標目標
     */
    public AutoUpdateWithVersionCheck(
        baseURL: string,
        category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY,
        options: BatchUpdateOptions,
        onComplete?: (hasUpdates: boolean, updateResult?: { successCount: number; failedCount: number; downloadedSize: number }) => void,
        onError?: (error: ResourceDownloaderErrorInfo) => void,
        target?: any
    ): void {
        log(`🚀 ZipVersionPatcher: 開始自動版本檢查與更新 [${category}] - ${baseURL}`)

        // 構建版本檔案 URL
        const versionFileName = `${VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_FILE_PREFIX}${category}.json`
        const versionURL = this._buildFileURL(baseURL, versionFileName)

        // 步驟 1: 載入版本清單
        this.LoadVersionManifest(
            versionURL,
            category,
            (manifest: VersionManifest) => {
                log(`✅ ZipVersionPatcher: 版本清單載入成功，開始檢查更新 [${category}]`)

                // 步驟 2: 檢查版本更新
                const versionCheckResult = this.CheckVersionUpdates(category)

                if (!versionCheckResult.hasUpdates) {
                    // 沒有需要更新的檔案
                    log(`✅ ZipVersionPatcher: 所有檔案已是最新版本 [${category}]`)
                    if (onComplete) {
                        if (target) {
                            onComplete.apply(target, [false])
                        } else {
                            onComplete(false)
                        }
                    }
                    return
                }

                // 步驟 3: 執行批量更新
                log(`🔄 ZipVersionPatcher: 發現 ${versionCheckResult.needUpdateFiles.length} 個檔案需要更新 [${category}]`)

                // 建立增強的批量更新選項
                const enhancedOptions: BatchUpdateOptions = {
                    ...options,
                    baseURL: baseURL,
                    onComplete: (successCount: number, failedCount: number, downloadedSize: number) => {
                        log(`🏁 ZipVersionPatcher: 自動更新完成 [${category}] - 成功: ${successCount}, 失敗: ${failedCount}`)

                        // 呼叫原始的批量完成回調（如果有）
                        if (options.onComplete) {
                            if (options.target) {
                                options.onComplete.apply(options.target, [successCount, failedCount, downloadedSize])
                            } else {
                                options.onComplete(successCount, failedCount, downloadedSize)
                            }
                        }

                        // 呼叫便捷方法的完成回調
                        if (onComplete) {
                            const updateResult = { successCount, failedCount, downloadedSize }
                            if (target) {
                                onComplete.apply(target, [true, updateResult])
                            } else {
                                onComplete(true, updateResult)
                            }
                        }
                    }
                }

                this.BatchUpdateFiles(versionCheckResult.needUpdateFiles, enhancedOptions, category)
            },
            (loadError: ResourceDownloaderErrorInfo) => {
                error(`❌ ZipVersionPatcher: 載入版本清單失敗 [${category}] - ${loadError.message}`)
                if (onError) {
                    if (target) {
                        onError.apply(target, [loadError])
                    } else {
                        onError(loadError)
                    }
                }
            },
            target
        )
    }

    /**
     * 載入版本清單（VersionZip_category.json 格式）
     * @param versionURL 版本檔案 URL
     * @param category 類別名稱（預設："DEFAULT"）
     * @param onSuccess 成功回調
     * @param onError 錯誤回調
     * @param target 回調目標目標
     */
    public LoadVersionManifest(
        versionURL: string,
        category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY,
        onSuccess?: (manifest: VersionManifest) => void,
        onError?: (error: ResourceDownloaderErrorInfo) => void,
        target?: any
    ): void {
        log(`🔍 ZipVersionPatcher: 開始載入版本清單 [${category}] - ${versionURL}`)

        // 先檢查是否已載入版本清單快取
        if (this.m_loadedCategoriesSet.has(category) && this.m_remoteVersionManifestMap.has(category)) {
            const cachedManifest = this.m_remoteVersionManifestMap.get(category)!
            const validFiles = GetValidFileNames(cachedManifest)
            log(`🎯 ZipVersionPatcher: 使用快取的版本清單 [${category}]，共 ${validFiles.length} 個檔案`)

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
            versionURL,
            GetFileNameFromUrl(versionURL),  // 從 URL 提取檔案名稱
            StorageOption.NONE,  // 版本清單不保存到本地，只暫存在記憶體 map
            (result: DownloadResult) => {
                if (result.jsonObject && result.jsonObject.json) {
                    const rawManifest = result.jsonObject.json

                    // 處理 DiffPatch_VersionNum
                    if (rawManifest[RESOURCE_DOWNLOADER_CONSTANTS.DIFF_PATCH_VERSION_NUM_KEY]) {
                        this.m_diffPatchVersionNumMap.set(category, rawManifest[RESOURCE_DOWNLOADER_CONSTANTS.DIFF_PATCH_VERSION_NUM_KEY])
                        log(`📦 ZipVersionPatcher: DiffPatch 版本資訊 [${category}] 載入成功，共 ${Object.keys(rawManifest[RESOURCE_DOWNLOADER_CONSTANTS.DIFF_PATCH_VERSION_NUM_KEY]).length} 個包體`)
                    }

                    // 處理 Preview 資料（如果啟用 Preview 且存在 Preview 欄位）
                    let manifestData = rawManifest
                    if (this.m_isUsePreview && rawManifest[VERSIONED_DOWNLOADER_CONSTANTS.PREVIEW_FIELD_KEY]) {
                        log(`🔄 ZipVersionPatcher: 使用 Preview 版本資料 [${category}]`)
                        // 合併 Preview 資料，Preview 優先
                        manifestData = { ...rawManifest, ...rawManifest[VERSIONED_DOWNLOADER_CONSTANTS.PREVIEW_FIELD_KEY] }

                        // 移除特殊欄位，避免被當作檔案處理
                        delete manifestData[VERSIONED_DOWNLOADER_CONSTANTS.PREVIEW_FIELD_KEY]
                        delete manifestData[RESOURCE_DOWNLOADER_CONSTANTS.DIFF_PATCH_VERSION_NUM_KEY]
                    } else {
                        // 移除特殊欄位
                        delete manifestData[RESOURCE_DOWNLOADER_CONSTANTS.DIFF_PATCH_VERSION_NUM_KEY]
                    }

                    this.m_remoteVersionManifestMap.set(category, manifestData)
                    this.m_loadedCategoriesSet.add(category)

                    // 計算有效檔案數量
                    const validFiles = GetValidFileNames(manifestData)
                    log(`✅ ZipVersionPatcher: 版本清單 [${category}] 載入成功，共 ${validFiles.length} 個檔案${this.m_isUsePreview ? ' (Preview 模式)' : ''}`)

                    if (onSuccess) {
                        if (target) {
                            onSuccess.apply(target, [manifestData])
                        } else {
                            onSuccess(manifestData)
                        }
                    }
                } else {
                    const errorInfo: ResourceDownloaderErrorInfo = {
                        errorType: ResourceDownloaderErrorType.JSON_PARSE_FAILED,
                        message: `版本清單 [${category}] 格式錯誤`
                    }
                    error(`❌ ZipVersionPatcher: 版本清單 [${category}] 格式錯誤`)

                    if (onError) {
                        if (target) {
                            onError.apply(target, [errorInfo])
                        } else {
                            onError(errorInfo)
                        }
                    }
                }
            },
            (downloadError: ResourceDownloaderErrorInfo) => {
                error(`❌ ZipVersionPatcher: 載入版本清單 [${category}] 失敗 - ${downloadError.message}`)
                if (onError) {
                    if (target) {
                        onError.apply(target, [downloadError])
                    } else {
                        onError(downloadError)
                    }
                }
            },
            false,
            '',
            target,
            DownloadPriority.VERSION_JSON, // 版本清單具有最高優先級
            RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_MAX_RETRY_COUNT,
            `${VERSIONED_DOWNLOADER_CONSTANTS.VERSION_MANIFEST_CACHE_KEY}_${category}`,
            false,
            true
        )

        // 使用全局隊列系統
        this.m_downloader.Download(downloadOptions)
    }

    /**
     * 初始化本地版本資訊（使用 delegate 載入）
     * @param category 類別名稱
     */
    private _initializeLocalVersions(category: string): void {
        if (this.m_initializedCategoriesSet.has(category)) {
            return // 已經載入過了
        }

        const localVersionKey = `${VERSIONED_DOWNLOADER_CONSTANTS.LOCAL_ZIP_VERSION_PREFIX}${category}`

        // 使用 delegate 載入本地版本資訊
        this.m_resourceHandler.LoadJsonData(localVersionKey, {
            onSuccess: (jsonData: any) => {
                const localVersionInfo = jsonData || {}
                this.m_localVersionInfoMap.set(category, localVersionInfo)
                this.m_initializedCategoriesSet.add(category)
                if (Object.keys(localVersionInfo).length > 0) {
                    log(`✅ ZipVersionPatcher: 載入本地版本資訊 [${category}] 成功，共 ${Object.keys(localVersionInfo).length} 個檔案`)
                } else {
                    log(`📝 ZipVersionPatcher: 無版本資訊 [${category}]，建立新的版本資訊`)
                }
            },
            onError: (errorInfo: ResourceDownloaderErrorInfo) => {
                if (errorInfo.errorType === ResourceDownloaderErrorType.FILE_NOT_FOUND) {
                    log(`📝 ZipVersionPatcher: 本地版本檔案 [${category}] 不存在，建立新的版本資訊`)
                } else {
                    warn(`⚠️ ZipVersionPatcher: 載入本地版本資訊 [${category}] 失敗 - ${errorInfo.message}`)
                }
                this.m_localVersionInfoMap.set(category, {})
                this.m_initializedCategoriesSet.add(category)
            }
        })
    }

    /**
     * 保存本地版本資訊（使用 delegate）
     * @param category 類別名稱
     */
    private _saveLocalVersions(category: string): void {
        if (!this.m_initializedCategoriesSet.has(category)) {
            warn(`⚠️ ZipVersionPatcher: 本地版本資訊 [${category}] 尚未初始化，無法保存`)
            return
        }

        const localVersionKey = `${VERSIONED_DOWNLOADER_CONSTANTS.LOCAL_ZIP_VERSION_PREFIX}${category}`
        const localVersionInfo = this.m_localVersionInfoMap.get(category) || {}

        // 使用 delegate 保存本地版本資訊
        this.m_resourceHandler.SaveJsonData(localVersionKey, localVersionInfo, {
            onSuccess: () => {
                log(`💾 ZipVersionPatcher: 本地版本資訊 [${category}] 已保存`)
            },
            onError: (errorInfo: ResourceDownloaderErrorInfo) => {
                error(`❌ ZipVersionPatcher: 保存本地版本資訊 [${category}] 失敗 - ${errorInfo.message}`)
            }
        })
    }


    /**
     * 更新本地檔案版本資訊
     * @param category 類別名稱
     * @param fileName 檔案名稱
     * @param versionInfo 新版本資訊
     */
    private _updateLocalFileVersion(category: string, fileName: string, versionInfo: FileVersionInfo): void {
        // 確保本地版本已經初始化
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersions(category)
        }

        const localVersionInfo = this.m_localVersionInfoMap.get(category) || {}

        // 更新記憶體中的版本資訊
        localVersionInfo[fileName] = {
            md5: versionInfo.md5,
            version: versionInfo.version,
            size: versionInfo.size,
            lastModified: Date.now()
        }

        this.m_localVersionInfoMap.set(category, localVersionInfo)

        // 保存到本地儲存
        this._saveLocalVersions(category)

        log(`📋 ZipVersionPatcher: 更新檔案版本資訊 [${category}] ${fileName} -> v${versionInfo.version} (${versionInfo.md5})`)
    }

    /**
     * 檢查版本更新（基於 MD5 和版本號）
     * @param category 類別名稱（預設："DEFAULT"）
     * @param fileNames 要檢查的檔案名稱列表，如果為空則檢查所有遠端檔案
     * @returns 版本檢查結果
     */
    public CheckVersionUpdates(category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY, fileNames?: string[]): VersionCheckResult {
        if (!this.m_loadedCategoriesSet.has(category)) {
            warn(`⚠️ ZipVersionPatcher: 版本清單 [${category}] 尚未載入，請先呼叫 LoadVersionManifest`)
            return {
                totalFiles: 0,
                needUpdateFiles: [],
                upToDateFiles: [],
                hasUpdates: false,
                totalUpdateSize: 0
            }
        }

        // 確保本地版本已經初始化
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersions(category)
        }

        const remoteVersionManifest = this.m_remoteVersionManifestMap.get(category) || {}
        const localVersionInfo = this.m_localVersionInfoMap.get(category) || {}
        const validFiles = GetValidFileNames(remoteVersionManifest)
        const filesToCheck = fileNames ? fileNames.filter(name => validFiles.includes(name)) : validFiles

        const needUpdateFiles: FileUpdateInfo[] = []
        const upToDateFiles: FileUpdateInfo[] = []
        let totalUpdateSize = 0

        for (const fileName of filesToCheck) {
            const remoteFileInfo = remoteVersionManifest[fileName] as FileVersionInfo
            const localFileInfo = localVersionInfo[fileName]

            if (!remoteFileInfo) {
                warn(`⚠️ ZipVersionPatcher: 檔案 ${fileName} 在遠端版本清單 [${category}] 中不存在`)
                continue
            }

            const currentMD5 = localFileInfo?.md5 || VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_MD5
            const currentVersion = localFileInfo?.version || VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_VERSION
            const remoteMD5 = remoteFileInfo.md5
            const remoteVersion = remoteFileInfo.version
            const remoteSize = remoteFileInfo.size

            // 檢查是否需要更新
            const updateCheck = this._checkFileNeedsUpdate(
                currentMD5, currentVersion, localFileInfo?.size || VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_FILE_SIZE,
                remoteMD5, remoteVersion, remoteSize
            )

            const updateInfo: FileUpdateInfo = {
                fileName,
                currentMD5,
                remoteMD5,
                currentVersion,
                remoteVersion,
                remoteSize,
                needsUpdate: updateCheck.needsUpdate,
                reason: updateCheck.reason
            }

            if (updateCheck.needsUpdate) {
                needUpdateFiles.push(updateInfo)
                totalUpdateSize += remoteSize
                log(`📦 需要更新 [${category}]: ${fileName} (${updateCheck.reason}) - ${(remoteSize / RESOURCE_DOWNLOADER_CONSTANTS.BYTES_PER_MB).toFixed(2)}MB`)
            } else {
                upToDateFiles.push(updateInfo)
            }
        }

        const result: VersionCheckResult = {
            totalFiles: filesToCheck.length,
            needUpdateFiles,
            upToDateFiles,
            hasUpdates: needUpdateFiles.length > 0,
            totalUpdateSize
        }

        log(`🔍 ZipVersionPatcher: 版本檢查完成 [${category}]`)
        log(`   總檔案數: ${result.totalFiles}`)
        log(`   需要更新: ${result.needUpdateFiles.length}`)
        log(`   已是最新: ${result.upToDateFiles.length}`)
        log(`   更新大小: ${(totalUpdateSize / RESOURCE_DOWNLOADER_CONSTANTS.BYTES_PER_MB).toFixed(2)}MB`)

        return result
    }

    /**
     * 檢查單一檔案是否需要更新
     * @param currentMD5 目前檔案 MD5
     * @param currentVersion 目前檔案版本
     * @param currentSize 目前檔案大小
     * @param remoteMD5 遠端檔案 MD5
     * @param remoteVersion 遠端檔案版本
     * @param remoteSize 遠端檔案大小
     * @returns 更新檢查結果
     */
    private _checkFileNeedsUpdate(
        currentMD5: string,
        currentVersion: string,
        currentSize: number,
        remoteMD5: string,
        remoteVersion: string,
        remoteSize: number
    ): { needsUpdate: boolean; reason: FileUpdateReason } {
        // 檔案不存在
        if (!currentMD5 || currentMD5 === VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_MD5) {
            return { needsUpdate: true, reason: FileUpdateReason.MISSING }
        }

        // MD5 相同，檔案完全一致，不需要更新
        if (currentMD5 === remoteMD5) {
            return { needsUpdate: false, reason: FileUpdateReason.MD5_MISMATCH }  // reason 在不需要更新時不重要
        }

        // MD5 不同，檢查版本號是否需要更新
        if (this._compareVersions(remoteVersion, currentVersion) > 0) {
            // 遠端版本號大於目前版本號，需要更新
            return { needsUpdate: true, reason: FileUpdateReason.VERSION_MISMATCH }
        }

        // MD5 不同但版本號沒有更新（可能是回滾或相同版本的不同構建）
        // 根據業務需求決定是否要更新，這裡選擇不更新
        log(`⚠️ ZipVersionPatcher: 檔案 MD5 不同但版本號未更新 - 目前版本: ${currentVersion}, 遠端版本: ${remoteVersion}`)
        return { needsUpdate: false, reason: FileUpdateReason.MD5_MISMATCH }
    }

    /**
     * 比較兩個版本號的大小
     * @param version1 版本號1
     * @param version2 版本號2
     * @returns 1 if version1 > version2, -1 if version1 < version2, 0 if equal
     */
    private _compareVersions(version1: string, version2: string): number {
        // 處理空版本號的情況
        if (!version1 && !version2) return 0
        if (!version1) return -1
        if (!version2) return 1

        // 將版本號分割成數字陣列
        const v1Parts = version1.split(VERSIONED_DOWNLOADER_CONSTANTS.VERSION_DOT_SEPARATOR).map(part => {
            const num = parseInt(part.replace(VERSIONED_DOWNLOADER_CONSTANTS.REGEX_NON_DIGIT, VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_STRING), VERSIONED_DOWNLOADER_CONSTANTS.PARSE_INT_RADIX)
            return isNaN(num) ? VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_NUMERIC_VALUE : num
        })

        const v2Parts = version2.split(VERSIONED_DOWNLOADER_CONSTANTS.VERSION_DOT_SEPARATOR).map(part => {
            const num = parseInt(part.replace(VERSIONED_DOWNLOADER_CONSTANTS.REGEX_NON_DIGIT, VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_STRING), VERSIONED_DOWNLOADER_CONSTANTS.PARSE_INT_RADIX)
            return isNaN(num) ? VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_NUMERIC_VALUE : num
        })

        // 確保兩個版本號有相同的長度，短的用 0 補充
        const maxLength = Math.max(v1Parts.length, v2Parts.length)
        while (v1Parts.length < maxLength) v1Parts.push(VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_NUMERIC_VALUE)
        while (v2Parts.length < maxLength) v2Parts.push(VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_NUMERIC_VALUE)

        // 逐個比較版本號的各個部分
        for (let i = 0; i < maxLength; i++) {
            if (v1Parts[i] > v2Parts[i]) {
                return 1
            } else if (v1Parts[i] < v2Parts[i]) {
                return -1
            }
        }

        return 0
    }

    /**
     * 批量更新檔案
     * @param updateFiles 需要更新的檔案列表
     * @param options 批量更新選項
     * @param category 類別名稱（預設："DEFAULT"）
     */
    public BatchUpdateFiles(updateFiles: FileUpdateInfo[], options: BatchUpdateOptions, category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): void {
        if (updateFiles.length === 0) {
            log(`✅ ZipVersionPatcher: 沒有檔案需要更新`)
            ResourceDownloaderCallbackHelper.CallBatchComplete(options, 0, 0, 0)
            return
        }

        const totalSize = updateFiles.reduce((sum, file) => sum + file.remoteSize, 0)
        log(`🚀 ZipVersionPatcher: 開始批量更新 [${category}] ${updateFiles.length} 個檔案，總大小: ${(totalSize / RESOURCE_DOWNLOADER_CONSTANTS.BYTES_PER_MB).toFixed(2)}MB`)

        const storageOption = options.storageOption || StorageOption.FILE_ONLY

        let completedCount = 0
        let successCount = 0
        let failedCount = 0
        let downloadedSize = 0
        const totalFiles = updateFiles.length

        // 檢查批量更新是否完成的內部函數
        const checkBatchComplete = () => {
            if (completedCount === totalFiles) {
                log(`🏁 ZipVersionPatcher: 批量更新 [${category}] 完成`)
                log(`   成功: ${successCount}`)
                log(`   失敗: ${failedCount}`)
                log(`   下載大小: ${(downloadedSize / RESOURCE_DOWNLOADER_CONSTANTS.BYTES_PER_MB).toFixed(2)}MB`)

                // 呼叫完成回調
                ResourceDownloaderCallbackHelper.CallBatchComplete(options, successCount, failedCount, downloadedSize)
            }
        }

        // 將所有檔案加入下載隊列（直接嘗試差分包，失敗後回退到完整包）
        updateFiles.forEach((updateInfo, index) => {
            const fileName = updateInfo.fileName
            const currentVersion = updateInfo.currentVersion || VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_VERSION
            const targetVersion = updateInfo.remoteVersion

            // 構建實際下載的檔案名稱（可能是差分包）
            const downloadFileName = this._buildDownloadFileName(category, fileName, targetVersion, currentVersion)
            const isDiffPackage = downloadFileName.includes(VERSIONED_DOWNLOADER_CONSTANTS.DIFF_PACKAGE_SEPARATOR)

            // 創建下載上下文
            const downloadContext = {
                updateInfo,
                options,
                storageOption,
                targetVersion,
                totalFiles,
                category,
                successCount: () => successCount,
                failedCount: () => failedCount,
                completedCount: () => completedCount,
                downloadedSize: () => downloadedSize,
                incrementSuccess: () => { successCount++; completedCount++; downloadedSize += updateInfo.remoteSize },
                incrementFailed: () => { failedCount++; completedCount++ },
                checkBatchComplete
            }

            // 直接嘗試下載（優先差分包，失敗後自動回退完整包）
            if (isDiffPackage) {
                // 直接嘗試下載差分包，失敗時會自動回退到完整包
                this._processFileDownload(downloadFileName, true, downloadContext)
            } else {
                // 直接下載完整包
                this._processFileDownload(downloadFileName, false, downloadContext)
            }
        })

        log(`📋 ZipVersionPatcher: ${updateFiles.length} 個檔案已加入下載隊列`)
    }

    /**
     * 取得本地版本資訊
     * @param category 類別名稱（預設："DEFAULT"）
     */
    public GetLocalVersionInfo(category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): LocalVersionInfo {
        // 確保本地版本已經初始化
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersions(category)
        }
        const localVersionInfo = this.m_localVersionInfoMap.get(category) || {}
        return { ...localVersionInfo }
    }

    /**
     * 取得遠端版本清單
     * @param category 類別名稱（預設："DEFAULT"）
     */
    public GetRemoteVersionManifest(category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): VersionManifest {
        const remoteVersionManifest = this.m_remoteVersionManifestMap.get(category) || {}
        return { ...remoteVersionManifest }
    }

    /**
     * 檢查版本清單是否已載入
     * @param category 類別名稱（預設："DEFAULT"）
     */
    public IsVersionLoaded(category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): boolean {
        return this.m_loadedCategoriesSet.has(category)
    }

    /**
     * 檢查本地版本資訊是否已載入到記憶體
     * @param category 類別名稱（預設："DEFAULT"）
     */
    public IsLocalVersionLoaded(category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): boolean {
        return this.m_initializedCategoriesSet.has(category)
    }

    /**
     * 取得指定檔案的版本資訊
     * @param fileName 檔案名稱
     * @param category 類別名稱（預設："DEFAULT"）
     * @returns 版本資訊或 null
     */
    public GetFileVersionInfo(fileName: string, category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): { local: LocalVersionInfo[string]; remote: FileVersionInfo } | null {
        // 確保本地版本已經初始化
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersions(category)
        }

        const localVersionInfo = this.m_localVersionInfoMap.get(category) || {}
        const remoteVersionManifest = this.m_remoteVersionManifestMap.get(category) || {}
        const localVersion = localVersionInfo[fileName]
        const remoteVersion = remoteVersionManifest[fileName] as FileVersionInfo

        if (!remoteVersion || typeof remoteVersion !== 'object' || !('md5' in remoteVersion)) {
            return null
        }

        return {
            local: localVersion || {
                md5: VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_MD5,
                version: VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_VERSION,
                size: VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_FILE_SIZE,
                lastModified: VERSIONED_DOWNLOADER_CONSTANTS.DEFAULT_LAST_MODIFIED
            },
            remote: remoteVersion
        }
    }

    /**
     * 強制更新檔案版本資訊（不檢查版本號）
     * @param fileName 檔案名稱
     * @param versionInfo 新版本資訊
     * @param category 類別名稱（預設："DEFAULT"）
     */
    public ForceUpdateFileVersion(fileName: string, versionInfo: FileVersionInfo, category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): void {
        this._updateLocalFileVersion(category, fileName, versionInfo)
        log(`🔧 ZipVersionPatcher: 強制更新檔案版本 [${category}] ${fileName} -> ${versionInfo.version} (${versionInfo.md5})`)
    }

    /**
     * 清除本地版本資訊
     * @param category 類別名稱（預設："DEFAULT"）
     * @param fileNames 要清除的檔案名稱列表，如果為空則清除該 category 下的所有
     */
    public ClearLocalVersions(category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY, fileNames?: string[]): void {
        // 確保本地版本已經初始化
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersions(category)
        }

        const localVersionInfo = this.m_localVersionInfoMap.get(category) || {}

        if (fileNames && fileNames.length > 0) {
            fileNames.forEach(fileName => {
                delete localVersionInfo[fileName]
                log(`🗑️ ZipVersionPatcher: 清除本地版本資訊 [${category}] - ${fileName}`)
            })
        } else {
            this.m_localVersionInfoMap.set(category, {})
            log(`🗑️ ZipVersionPatcher: 清除所有本地版本資訊 [${category}]`)
        }

        // 保存到本地（檔案 + localStorage）
        this._saveLocalVersions(category)
    }

    /**
     * 取得版本清單統計資訊
     * @param category 類別名稱（預設："DEFAULT"）
     */
    public GetVersionStats(category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY): { totalFiles: number; localFiles: number; remoteFiles: number } {
        // 確保本地版本已經初始化
        if (!this.m_initializedCategoriesSet.has(category)) {
            this._initializeLocalVersions(category)
        }

        const remoteVersionManifest = this.m_remoteVersionManifestMap.get(category) || {}
        const localVersionInfo = this.m_localVersionInfoMap.get(category) || {}
        const validRemoteFiles = GetValidFileNames(remoteVersionManifest)
        const localFileCount = Object.keys(localVersionInfo).length

        return {
            totalFiles: validRemoteFiles.length,
            localFiles: localFileCount,
            remoteFiles: validRemoteFiles.length
        }
    }

    /**
     * 建構檔案下載 URL
     * @param baseURL 基礎 URL
     * @param fileName 檔案名稱
     * @returns 完整的檔案 URL
     */
    private _buildFileURL(baseURL: string, fileName: string): string {
        // 處理檔案名稱中的前綴斜線
        const cleanFileName = fileName.startsWith(RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR) ? fileName.substring(1) : fileName
        const separator = baseURL.endsWith(RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR) ? VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_STRING : RESOURCE_DOWNLOADER_CONSTANTS.URL_SEPARATOR
        return `${baseURL}${separator}${cleanFileName}`
    }

    /**
     * 處理單一檔案下載
     * @param actualFileName 實際下載的檔案名稱
     * @param isDiff 是否為差分包
     * @param context 下載上下文
     */
    private _processFileDownload(actualFileName: string, isDiff: boolean, context: DownloadContext): void {
        const fileName = context.updateInfo.fileName
        const fileURL = this._buildFileURL(context.options.baseURL, actualFileName)
        const savePath = context.options.savePath ? `${context.options.savePath}${fileName}` : fileName

        log(`🔽 ZipVersionPatcher: 開始下載 ${isDiff ? '差分包' : '完整包'}: ${actualFileName}`)

        const downloadOptions = CreateSimpleDownloadOptions(
            fileURL,
            actualFileName,  // 使用實際的檔案名稱
            context.storageOption,
            (result: DownloadResult) => {
                context.incrementSuccess()

                // 更新本地版本資訊（無論是差分包還是完整包，都更新到目標版本）
                this._updateLocalFileVersion(context.category, fileName, {
                    md5: context.updateInfo.remoteMD5,
                    version: context.updateInfo.remoteVersion,
                    size: context.updateInfo.remoteSize
                })

                log(`✅ ZipVersionPatcher: ${isDiff ? '差分包' : '完整包'}更新成功 (${context.completedCount()}/${context.totalFiles}): ${fileName} -> v${context.targetVersion}`)

                // 呼叫單檔成功回調
                ResourceDownloaderCallbackHelper.CallBatchFileSuccess(context.options, fileName, result, context.updateInfo)

                // 呼叫整體進度回調
                ResourceDownloaderCallbackHelper.CallBatchProgress(context.options, context.completedCount(), context.totalFiles, fileName)

                context.checkBatchComplete()
            },
            (downloadError: ResourceDownloaderErrorInfo) => {
                if (isDiff) {
                    // 差分包下載失敗，回退到完整包
                    log(`⚠️ ZipVersionPatcher: 差分包下載失敗，回退到完整包: ${fileName}`)
                    const fullPackageName = this._buildDownloadFileName(context.category, fileName, context.targetVersion)
                    this._processFileDownload(fullPackageName, false, context)
                } else {
                    // 完整包下載失敗
                    context.incrementFailed()

                    error(`❌ ZipVersionPatcher: 檔案更新失敗 (${context.completedCount()}/${context.totalFiles}): ${fileName} - ${downloadError.message}`)

                    // 呼叫單檔錯誤回調
                    ResourceDownloaderCallbackHelper.CallBatchFileError(context.options, fileName, downloadError, context.updateInfo)

                    // 呼叫整體進度回調
                    ResourceDownloaderCallbackHelper.CallBatchProgress(context.options, context.completedCount(), context.totalFiles, fileName)

                    context.checkBatchComplete()
                }
            },
            true,
            savePath,
            context.options.target,
            DownloadPriority.PLATFORM_NECESSARY, // 批量更新檔案具有平台必要優先級
            RESOURCE_DOWNLOADER_CONSTANTS.DEFAULT_MAX_RETRY_COUNT,
            fileName,
            true,
            true,
            null,
            (progress: ResourceDownloaderProgressInfo) => {
                ResourceDownloaderCallbackHelper.CallBatchFileProgress(context.options, fileName, progress)
            }
        )

        // 使用全局隊列系統
        this.m_downloader.Download(downloadOptions)
    }

    /**
     * 根據檔案資訊構建實際下載的檔案名稱
     * @param category 類別名稱
     * @param fileName 原始檔案名稱（如 "/GameResource.zip"）
     * @param version 檔案版本號
     * @param currentVersion 目前本地版本號（用於差分包）
     * @returns 實際下載的檔案名稱
     */
    private _buildDownloadFileName(category: string, fileName: string, version: string, currentVersion?: string): string {
        // 移除前綴斜線並去除 .zip 擴展名
        const cleanName = fileName.replace(VERSIONED_DOWNLOADER_CONSTANTS.REGEX_PREFIX_SLASH, VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_STRING).replace(VERSIONED_DOWNLOADER_CONSTANTS.REGEX_ZIP_EXTENSION, VERSIONED_DOWNLOADER_CONSTANTS.EMPTY_STRING)

        // 檢查是否可以使用差分包
        if (currentVersion) {
            const diffPatchVersionNum = this.m_diffPatchVersionNumMap.get(category) || {}
            if (diffPatchVersionNum[fileName]) {
                const diffVersions = diffPatchVersionNum[fileName]
                const currentVersionNum = parseInt(currentVersion, VERSIONED_DOWNLOADER_CONSTANTS.PARSE_INT_RADIX)
                const targetVersionNum = parseInt(version, VERSIONED_DOWNLOADER_CONSTANTS.PARSE_INT_RADIX)

                // 檢查差分包是否存在（目前版本在差分版本列表中）
                if (!isNaN(currentVersionNum) && !isNaN(targetVersionNum) &&
                    diffVersions.includes(currentVersionNum)) {
                    log(`🔄 ZipVersionPatcher: 嘗試使用差分包 [${category}] ${cleanName}${VERSIONED_DOWNLOADER_CONSTANTS.DIFF_PACKAGE_SEPARATOR}${currentVersion}${VERSIONED_DOWNLOADER_CONSTANTS.VERSION_SEPARATOR}${version}${VERSIONED_DOWNLOADER_CONSTANTS.ZIP_EXTENSION}`)
                    return `${cleanName}${VERSIONED_DOWNLOADER_CONSTANTS.DIFF_PACKAGE_SEPARATOR}${currentVersion}${VERSIONED_DOWNLOADER_CONSTANTS.VERSION_SEPARATOR}${targetVersionNum}${VERSIONED_DOWNLOADER_CONSTANTS.ZIP_EXTENSION}`
                }
            }
        }

        // 使用完整包格式：包體_版本.zip
        return `${cleanName}${VERSIONED_DOWNLOADER_CONSTANTS.VERSION_SEPARATOR}${version}${VERSIONED_DOWNLOADER_CONSTANTS.ZIP_EXTENSION}`
    }

    /**
     * 清除版本清單快取
     * @param category 類別名稱，如果未指定則清除所有類別
     */
    public ClearVersionManifestCache(category?: string): void {
        if (category) {
            this.m_remoteVersionManifestMap.delete(category)
            this.m_loadedCategoriesSet.delete(category)
            this.m_diffPatchVersionNumMap.delete(category)
            log(`🗑️ ZipVersionPatcher: 清除版本清單快取 [${category}]`)
        } else {
            this.m_remoteVersionManifestMap.clear()
            this.m_loadedCategoriesSet.clear()
            this.m_diffPatchVersionNumMap.clear()
            log(`🗑️ ZipVersionPatcher: 清除所有版本清單快取`)
        }
    }

    /**
     * 強制重新載入版本清單
     * @param versionURL 版本檔案 URL
     * @param category 類別名稱（預設："DEFAULT"）
     * @param onSuccess 成功回調
     * @param onError 錯誤回調
     * @param target 回調目標目標
     */
    public ForceReloadVersionManifest(
        versionURL: string,
        category: string = VERSIONED_DOWNLOADER_CONSTANTS.ZIP_VERSION_DEFAULT_CATEGORY,
        onSuccess?: (manifest: VersionManifest) => void,
        onError?: (error: ResourceDownloaderErrorInfo) => void,
        target?: any
    ): void {
        // 先清除快取
        this.ClearVersionManifestCache(category)
        // 重新載入
        this.LoadVersionManifest(versionURL, category, onSuccess, onError, target)
    }


}
