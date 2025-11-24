import { log, BufferAsset } from 'cc'
import { VersionedSingleFileDownloader } from './VersionedSingleFileDownloader'
import { ZipVersionPatcher } from './ZipVersionPatcher'
import {
    StorageOption,
    DownloadResult,
    CreateSimpleDownloadOptions,
    FileType,
} from '../../Stark/ResourceDownloader/ResourceDownloaderDefine'
import { Downloader } from './Downloader'
import { EnvConfig, GameConfig } from '../Define/ConfigDefine'
import { VersionedDownloadCategory, DownloadCallbacks } from './VersionedDownloaderDefine'

/**
 * 版本化下載服務 - 簡化版本
 * 提供 3 個核心下載介面，基於環境自動選擇 URL
 */
export class VersionedDownloaderService {
    private static s_instance: VersionedDownloaderService | null = null
    private m_singleFileDownloader: VersionedSingleFileDownloader
    private m_zipVersionPatcher: ZipVersionPatcher
    private m_downloader: Downloader
    private m_gameConfig: GameConfig | null = null

    private constructor() {
        this.m_singleFileDownloader = VersionedSingleFileDownloader.GetInstance()
        this.m_zipVersionPatcher = ZipVersionPatcher.GetInstance()
        this.m_downloader = Downloader.GetInstance()
        this._initializeConfig()
    }

    /** 取得單例實例 */
    public static GetInstance(): VersionedDownloaderService {
        if (!VersionedDownloaderService.s_instance) {
            VersionedDownloaderService.s_instance = new VersionedDownloaderService()
        }
        return VersionedDownloaderService.s_instance
    }

    /**
     * 1. 下載 ZIP 檔案（版本化）
     * @param fileName 檔案名稱（不包含 .zip 擴展名）
     * @param category 類別名稱
     * @param callbacks 回調函數
     */
    public DownloadZip(
        fileName: string,
        category: VersionedDownloadCategory,
        callbacks: DownloadCallbacks = {}
    ): void {
        const baseUrl = this._getBaseUrl()
        const zipFileName = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`

        log(`📦 VersionedDownloaderService: 下載 ZIP [${category}] - ${zipFileName}`)

        // 使用 ZipVersionPatcher 的自動更新功能
        this.m_zipVersionPatcher.AutoUpdateWithVersionCheck(
            baseUrl,
            category as string,
            {
                baseURL: baseUrl,
                storageOption: StorageOption.FILE_ONLY,
                onComplete: this._onZipDownloadComplete.bind(this, callbacks),
                onProgress: callbacks.onProgress ? this._onZipDownloadProgress.bind(this, callbacks) : undefined,
                target: callbacks.target
            },
            this._onZipUpdateComplete.bind(this),
            callbacks.onError,
            callbacks.target
        )
    }

    /**
     * ZIP 下載完成回調
     */
    private _onZipDownloadComplete(callbacks: DownloadCallbacks, successCount: number, failedCount: number, downloadedSize: number): void {
        const bufferAsset = new BufferAsset()
        bufferAsset._nativeAsset = new ArrayBuffer(downloadedSize)

        const result: DownloadResult = {
            fileType: FileType.OTHER,
            rawData: bufferAsset
        }
        if (callbacks.onSuccess) {
            callbacks.onSuccess(result, successCount > 0)
        }
    }

    /**
     * ZIP 下載進度回調
     */
    private _onZipDownloadProgress(callbacks: DownloadCallbacks, current: number, total: number, fileName: string): void {
        if (callbacks.onProgress) {
            callbacks.onProgress(current, total, fileName)
        }
    }

    /**
     * ZIP 更新完成回調
     */
    private _onZipUpdateComplete(hasUpdates: boolean, updateResult?: { successCount: number; failedCount: number; downloadedSize: number }): void {
        if (hasUpdates && updateResult) {
            log(`✅ VersionedDownloaderService: ZIP 更新完成 - 成功: ${updateResult.successCount}, 失敗: ${updateResult.failedCount}`)
        } else {
            log(`✅ VersionedDownloaderService: ZIP 已是最新版本`)
        }
    }

    /**
     * 2. 下載單一檔案（有版本控制）
     * @param fileName 檔案名稱
     * @param category 類別名稱
     * @param callbacks 回調函數
     */
    public DownloadVersionedFile(
        fileName: string,
        category: VersionedDownloadCategory,
        callbacks: DownloadCallbacks = {}
    ): void {
        const baseUrl = this._getBaseUrl()

        log(`📁 VersionedDownloaderService: 下載版本化檔案 [${category}] - ${fileName}`)

        // 使用 VersionedSingleFileDownloader 進行版本化下載
        this.m_singleFileDownloader.DownloadFileWithVersionCheck(
            baseUrl,
            fileName,
            {
                category: category,
                storageOption: StorageOption.FILE_ONLY,
                onSuccess: callbacks.onSuccess,
                onError: callbacks.onError,
                onProgress: callbacks.onProgress ? this._onVersionedFileDownloadProgress.bind(this, callbacks, fileName) : undefined,
                target: callbacks.target
            }
        )
    }

    /**
     * 版本化檔案下載進度回調
     */
    private _onVersionedFileDownloadProgress(callbacks: DownloadCallbacks, fileName: string, progress: any): void {
        if (callbacks.onProgress) {
            callbacks.onProgress(progress.loaded, progress.total, fileName)
        }
    }

    /**
     * 3. 下載單一檔案（無版本控制）
     * @param fileName 檔案名稱
     * @param callbacks 回調函數
     */
    public DownloadFile(
        fileName: string,
        callbacks: DownloadCallbacks = {}
    ): void {
        const baseUrl = this._getBaseUrl()
        const fileUrl = `${this._normalizeUrl(baseUrl)}${fileName}`

        log(`📄 VersionedDownloaderService: 下載檔案（無版本）- ${fileName}`)

        // 使用 ResourceDownloader 直接下載
        const downloadOptions = CreateSimpleDownloadOptions(
            fileUrl,
            fileName,
            StorageOption.FILE_ONLY,
            this._onFileDownloadSuccess.bind(this, callbacks),
            callbacks.onError,
            true,
            fileName,
            callbacks.target,
            undefined,
            3, // 預設重試 3 次
            fileName,
            null,
            callbacks.onProgress ? this._onFileDownloadProgress.bind(this, callbacks, fileName) : undefined
        )

        this.m_downloader.Download(downloadOptions)
    }

    /**
     * 檔案下載成功回調
     */
    private _onFileDownloadSuccess(callbacks: DownloadCallbacks, result: DownloadResult): void {
        if (callbacks.onSuccess) {
            callbacks.onSuccess(result, false)
        }
    }

    /**
     * 檔案下載進度回調
     */
    private _onFileDownloadProgress(callbacks: DownloadCallbacks, fileName: string, progress: any): void {
        if (callbacks.onProgress) {
            callbacks.onProgress(progress.loaded, progress.total, fileName)
        }
    }

    /**
     * 初始化配置
     */
    private _initializeConfig(): void {
        this.m_gameConfig = EnvConfig.Config
    }

    // ================= 輔助方法 =================

    /**
     * 取得基礎 URL
     */
    private _getBaseUrl(): string {
        // 優先使用遊戲配置中的下載 URL
        const gameConfig = this.m_gameConfig
        let baseUrl = gameConfig?.DownLoadingUrl || gameConfig?.CDNUrl || gameConfig?.COMMON

        // 如果是中國環境，嘗試使用中國專用 URL
        if (gameConfig?.DownLoadingUrlCN && this._isChinaEnvironment()) {
            baseUrl = gameConfig.DownLoadingUrlCN
        }

        return baseUrl
    }

    /**
     * 正規化 URL（確保以 / 結尾）
     */
    private _normalizeUrl(url: string): string {
        return url.endsWith('/') ? url : url + '/'
    }

    /**
     * 判斷是否為中國環境
     */
    private _isChinaEnvironment(): boolean {
        // 可以根據實際需求調整判斷邏輯
        return false
    }
}