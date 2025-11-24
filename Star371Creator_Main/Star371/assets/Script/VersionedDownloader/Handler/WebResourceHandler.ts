import {
    ResourceDownloaderErrorType,
    ResourceDownloaderCallbackHelper,
    CombinedCallbackOptions,
    ArrayBufferToBase64,
    Base64ToArrayBuffer,
    RESOURCE_DOWNLOADER_CONSTANTS,
} from '../../../Stark/ResourceDownloader/ResourceDownloaderDefine'
import { IResourceHandler } from '../../../Stark/ResourceDownloader/ResourceHandler'

const STORAGE_PREFIX = "WebResourceDownloader_"

/**
 * Web 資源處理器 - 實現 IResourceHandler 介面
 * 使用 localStorage 進行檔案存儲和瀏覽器 API 進行 ZIP 解壓縮
 */
export class WebResourceHandler implements IResourceHandler {

    /**
     * 保存檔案資料
     */
    public SaveToFile(
        filePath: string,
        data: ArrayBuffer,
        options: CombinedCallbackOptions & {
            onSuccess?: (savedPath: string) => void
        }
    ): void {
        this._saveToFileWithOptions(filePath, data, options)
    }

    /**
     * 載入檔案資料
     */
    public LoadFromFile(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (data: ArrayBuffer) => void
        }
    ): void {
        this._loadFromFileWithOptions(filePath, options)
    }

    /**
     * 解壓縮ZIP檔案（Web環境未實現）
     */
    public ExtractZipFile(
        zipData: ArrayBuffer,
        targetDirectory: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (extractedFiles: string[]) => void
        }
    ): void {
        this._extractZipFileWithOptions(zipData, targetDirectory, options)
    }

    /**
     * 刪除檔案
     */
    public DeleteFile(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void {
        this._deleteFileWithOptions(filePath, options)
    }

    /**
     * 列出儲存的檔案
     */
    public ListFiles(
        directoryPath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (filePaths: string[]) => void
        }
    ): void {
        // Web環境使用 ListStoredFiles，忽略 directoryPath 參數
        this._listStoredFilesWithOptions(options)
    }

    /**
     * 載入JSON資料
     */
    public LoadJsonData(
        key: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (jsonData: any) => void
        }
    ): void {
        this._loadJsonFromStorageWithOptions(key, options)
    }

    /**
     * 保存JSON資料
     */
    public SaveJsonData(
        key: string,
        jsonData: any,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void {
        this._saveJsonToStorageWithOptions(key, jsonData, options)
    }

    /**
     * Save file data to localStorage (private implementation)
     * @param filePath - Virtual file path as key
     * @param data - File data as ArrayBuffer
     * @param options - Callback options with target support
     */
    private _saveToFileWithOptions(
        filePath: string,
        data: ArrayBuffer,
        options: CombinedCallbackOptions & {
            onSuccess?: (savedPath: string) => void
        }
    ): void {
        try {
            // 報告開始進度
            ResourceDownloaderCallbackHelper.CallProgress(options, {
                loaded: RESOURCE_DOWNLOADER_CONSTANTS.PROGRESS_START,
                total: data.byteLength
            })

            // Convert ArrayBuffer to base64 string for localStorage
            const uint8Array = new Uint8Array(data)
            const base64String = ArrayBufferToBase64(uint8Array)

            // Create storage key
            const storageKey = STORAGE_PREFIX + filePath

            // Save to localStorage
            localStorage.setItem(storageKey, base64String)

            // 報告完成進度
            ResourceDownloaderCallbackHelper.CallProgress(options, {
                loaded: data.byteLength,
                total: data.byteLength
            })

            ResourceDownloaderCallbackHelper.CallSuccess(options, storageKey)
        } catch (error) {
            if (error.name === RESOURCE_DOWNLOADER_CONSTANTS.ERROR_NAME_QUOTA_EXCEEDED) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.LOCALSTORAGE_QUOTA_EXCEEDED,
                    originalError: error
                })
            } else {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_SAVE_FAILED,
                    originalError: error
                })
            }
        }
    }

    /**
     * Load file data from localStorage (private implementation)
     * @param filePath - Virtual file path as key
     * @param options - Callback options with target support
     */
    private _loadFromFileWithOptions(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (data: ArrayBuffer) => void
        }
    ): void {
        try {
            const storageKey = STORAGE_PREFIX + filePath
            const base64String = localStorage.getItem(storageKey)

            if (!base64String) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_NOT_FOUND,
                    message: filePath
                })
                return
            }

            // Convert base64 back to ArrayBuffer
            const arrayBuffer = Base64ToArrayBuffer(base64String)

            // 報告進度
            ResourceDownloaderCallbackHelper.CallProgress(options, {
                loaded: arrayBuffer.byteLength,
                total: arrayBuffer.byteLength
            })

            ResourceDownloaderCallbackHelper.CallSuccess(options, arrayBuffer)
        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.FILE_LOAD_FAILED,
                originalError: error
            })
        }
    }

    /**
     * Extract ZIP file using browser APIs (private implementation)
     * @param zipData - ZIP file data
     * @param targetDirectory - Virtual target directory
     * @param options - Callback options with target support
     */
    private _extractZipFileWithOptions(
        zipData: ArrayBuffer,
        targetDirectory: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (extractedFiles: string[]) => void
        }
    ): void {
        ResourceDownloaderCallbackHelper.CallError(options, {
            errorType: ResourceDownloaderErrorType.ZIP_EXTRACTION_NOT_IMPLEMENTED
        })
    }

    /**
     * Delete file from localStorage (private implementation)
     * @param filePath - Virtual file path
     * @param options - Callback options with target support
     */
    private _deleteFileWithOptions(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void {
        try {
            const storageKey = STORAGE_PREFIX + filePath
            localStorage.removeItem(storageKey)
            ResourceDownloaderCallbackHelper.CallSuccess(options)
        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.FILE_DELETE_FAILED,
                originalError: error
            })
        }
    }

    /**
     * List all stored files (private implementation)
     * @param options - Callback options with target support
     */
    private _listStoredFilesWithOptions(
        options: CombinedCallbackOptions & {
            onSuccess?: (filePaths: string[]) => void
        }
    ): void {
        try {
            const filePaths: string[] = []
            const prefixLength = STORAGE_PREFIX.length

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i)
                if (key && key.startsWith(STORAGE_PREFIX)) {
                    filePaths.push(key.substring(prefixLength))
                }
            }

            ResourceDownloaderCallbackHelper.CallSuccess(options, filePaths)
        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.CACHE_ACCESS_FAILED,
                originalError: error
            })
        }
    }

    /**
     * Load JSON data from localStorage (private implementation)
     * @param storageKey - Storage key for JSON data
     * @param options - Callback options with target support
     */
    private _loadJsonFromStorageWithOptions(
        storageKey: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (jsonData: any) => void
        }
    ): void {
        try {
            const storedData = localStorage.getItem(storageKey)
            if (storedData) {
                const jsonData = JSON.parse(storedData) || {}
                ResourceDownloaderCallbackHelper.CallSuccess(options, jsonData)
            } else {
                // 沒有存儲的資料，返回空物件
                ResourceDownloaderCallbackHelper.CallSuccess(options, {})
            }
        } catch (parseError) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.JSON_PARSE_FAILED,
                message: 'Failed to parse stored JSON data',
                originalError: parseError
            })
        }
    }

    /**
     * Save JSON data to localStorage (private implementation)
     * @param storageKey - Storage key for JSON data
     * @param jsonData - JSON data to save
     * @param options - Callback options with target support
     */
    private _saveJsonToStorageWithOptions(
        storageKey: string,
        jsonData: any,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void {
        try {
            const jsonString = JSON.stringify(jsonData, null, RESOURCE_DOWNLOADER_CONSTANTS.JSON_INDENT_SPACES)
            localStorage.setItem(storageKey, jsonString)
            ResourceDownloaderCallbackHelper.CallSuccess(options)
        } catch (storageError) {
            if (storageError.name === RESOURCE_DOWNLOADER_CONSTANTS.ERROR_NAME_QUOTA_EXCEEDED) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.LOCALSTORAGE_QUOTA_EXCEEDED,
                    originalError: storageError
                })
            } else {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.CACHE_ACCESS_FAILED,
                    message: 'Failed to save JSON data to localStorage',
                    originalError: storageError
                })
            }
        }
    }
}