import { native } from 'cc'
import { NATIVE } from 'cc/env'
import {
    ResourceDownloaderErrorType,
    ResourceDownloaderErrorInfo,
    ResourceDownloaderCallbackHelper,
    CombinedCallbackOptions,
    RESOURCE_DOWNLOADER_CONSTANTS,
    GetDirectoryFromPath,
} from '../../../Stark/ResourceDownloader/ResourceDownloaderDefine'
import { IResourceHandler } from '../../../Stark/ResourceDownloader/ResourceHandler'

/**
 * Native 資源處理器 - 實現 IResourceHandler 介面
 * 使用原生檔案系統 API 進行檔案儲存和 ZIP 解壓縮
 */
export class NativeResourceHandler implements IResourceHandler {

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
     * 解壓縮ZIP檔案
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
     * 列出目錄中的檔案
     */
    public ListFiles(
        directoryPath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (filePaths: string[]) => void
        }
    ): void {
        this._listFilesInDirectoryWithOptions(directoryPath, options)
    }

    /**
     * 載入JSON資料（Native環境從檔案載入）
     */
    public LoadJsonData(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (jsonData: any) => void
        }
    ): void {
        const fullPath = `${this._getWritablePath()}${filePath}`

        this.LoadFromFile(fullPath, {
            onSuccess: this._onJsonFileLoaded.bind(this, options),
            onError: this._onJsonFileLoadError.bind(this, options),
            onProgress: options.onProgress,
            target: options.target
        })
    }

    /**
     * JSON 檔案載入成功回調
     */
    private _onJsonFileLoaded(options: CombinedCallbackOptions & { onSuccess?: (jsonData: any) => void }, data: ArrayBuffer): void {
        try {
            const jsonString = new TextDecoder().decode(data)
            const jsonData = JSON.parse(jsonString) || {}
            ResourceDownloaderCallbackHelper.CallSuccess(options, jsonData)
        } catch (parseError) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.JSON_PARSE_FAILED,
                message: 'Failed to parse JSON data from file',
                originalError: parseError
            })
        }
    }

    /**
     * JSON 檔案載入錯誤回調
     */
    private _onJsonFileLoadError(options: CombinedCallbackOptions & { onSuccess?: (jsonData: any) => void }, errorInfo: ResourceDownloaderErrorInfo): void {
        if (errorInfo.errorType === ResourceDownloaderErrorType.FILE_NOT_FOUND) {
            // 檔案不存在，返回空物件
            ResourceDownloaderCallbackHelper.CallSuccess(options, {})
        } else {
            ResourceDownloaderCallbackHelper.CallError(options, errorInfo)
        }
    }

    /**
     * 保存JSON資料（Native環境保存到檔案）
     */
    public SaveJsonData(
        filePath: string,
        jsonData: any,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void {
        try {
            const jsonString = JSON.stringify(jsonData, null, RESOURCE_DOWNLOADER_CONSTANTS.JSON_INDENT_SPACES)
            const jsonDataBuffer = new TextEncoder().encode(jsonString)
            const fullPath = `${this._getWritablePath()}${filePath}`

            this.SaveToFile(fullPath, jsonDataBuffer.buffer, {
                onSuccess: this._onJsonFileSaved.bind(this, options),
                onError: options.onError,
                onProgress: options.onProgress,
                target: options.target
            })
        } catch (stringifyError) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.JSON_PARSE_FAILED,
                message: 'Failed to stringify JSON data',
                originalError: stringifyError
            })
        }
    }

    /**
     * JSON 檔案保存成功回調
     */
    private _onJsonFileSaved(options: CombinedCallbackOptions & { onSuccess?: () => void }, savedPath: string): void {
        ResourceDownloaderCallbackHelper.CallSuccess(options)
    }

    /**
     * 取得可寫入路徑
     * @returns 可寫入路徑字串
     */
    private _getWritablePath(): string {
        if (NATIVE && native.fileUtils) {
            return native.fileUtils.getWritablePath()
        }
        return ''
    }

    /**
     * Save file data to native file system (private implementation)
     * @param filePath - File path on native file system
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
            if (!NATIVE || !native.fileUtils) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.NATIVE_API_NOT_AVAILABLE
                })
                return
            }

            // 報告開始進度
            ResourceDownloaderCallbackHelper.CallProgress(options, {
                loaded: RESOURCE_DOWNLOADER_CONSTANTS.PROGRESS_START,
                total: data.byteLength
            })

            // Ensure directory exists
            const directory = GetDirectoryFromPath(filePath)
            if (directory && !native.fileUtils.isDirectoryExist(directory)) {
                const dirCreated = native.fileUtils.createDirectory(directory)
                if (!dirCreated) {
                    ResourceDownloaderCallbackHelper.CallError(options, {
                        errorType: ResourceDownloaderErrorType.DIRECTORY_CREATE_FAILED,
                        message: directory
                    })
                    return
                }
            }

            // Convert ArrayBuffer to Uint8Array for native
            const uint8Array = new Uint8Array(data)

            // Write file using native
            const success = native.fileUtils.writeDataToFile(uint8Array, filePath)

            if (success) {
                // 報告完成進度
                ResourceDownloaderCallbackHelper.CallProgress(options, {
                    loaded: data.byteLength,
                    total: data.byteLength
                })
                ResourceDownloaderCallbackHelper.CallSuccess(options, filePath)
            } else {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_SAVE_FAILED,
                    message: filePath
                })
            }

        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.FILE_SAVE_FAILED,
                originalError: error
            })
        }
    }

    /**
     * Load file data from native file system (private implementation)
     * @param filePath - File path on native file system
     * @param options - Callback options with target support
     */
    private _loadFromFileWithOptions(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (data: ArrayBuffer) => void
        }
    ): void {
        try {
            if (!NATIVE || !native.fileUtils) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.NATIVE_API_NOT_AVAILABLE
                })
                return
            }

            if (!native.fileUtils.isFileExist(filePath)) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_NOT_FOUND,
                    message: filePath
                })
                return
            }

            // Read file data using native
            const data = native.fileUtils.getDataFromFile(filePath)

            if (data && data.byteLength > 0) {
                // 報告進度
                ResourceDownloaderCallbackHelper.CallProgress(options, {
                    loaded: data.byteLength,
                    total: data.byteLength
                })
                // Convert to ArrayBuffer
                ResourceDownloaderCallbackHelper.CallSuccess(options, data)
            } else {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_LOAD_FAILED,
                    message: filePath
                })
            }

        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.FILE_LOAD_FAILED,
                originalError: error
            })
        }
    }

    /**
     * Extract ZIP file using native APIs (private implementation)
     * @param zipData - ZIP file data
     * @param targetDirectory - Target directory for extraction
     * @param options - Callback options with target support
     */
    private _extractZipFileWithOptions(
        zipData: ArrayBuffer,
        targetDirectory: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (extractedFiles: string[]) => void
        }
    ): void {
        try {
            if (!NATIVE || !native.fileUtils) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.NATIVE_API_NOT_AVAILABLE
                })
                return
            }

            // Create temporary ZIP file
            const tempZipPath = `${this._getWritablePath()}${RESOURCE_DOWNLOADER_CONSTANTS.TEMP_ZIP_FILE_NAME}`

            // Save ZIP data to temporary file first
            this._saveToFileWithOptions(tempZipPath, zipData, {
                onSuccess: this._onZipFileSavedForExtraction.bind(this, targetDirectory, options),
                onError: options.onError,
                onProgress: options.onProgress,
                target: options.target
            })

        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.ZIP_EXTRACTION_FAILED,
                originalError: error
            })
        }
    }

    /**
     * ZIP 檔案保存成功後準備解壓縮
     */
    private _onZipFileSavedForExtraction(
        targetDirectory: string,
        options: CombinedCallbackOptions & { onSuccess?: (extractedFiles: string[]) => void },
        savedZipPath: string
    ): void {
        // Extract ZIP file using native API
        this._extractZipWithNativeAPI(savedZipPath, targetDirectory, options)
    }

    /**
     * Delete file from native file system (private implementation)
     * @param filePath - File path to delete
     * @param options - Callback options with target support
     */
    private _deleteFileWithOptions(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void {
        try {
            if (!NATIVE || !native.fileUtils) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.NATIVE_API_NOT_AVAILABLE
                })
                return
            }

            if (!native.fileUtils.isFileExist(filePath)) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_NOT_FOUND,
                    message: filePath
                })
                return
            }

            const success = native.fileUtils.removeFile(filePath)
            if (success) {
                ResourceDownloaderCallbackHelper.CallSuccess(options)
            } else {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_DELETE_FAILED,
                    message: filePath
                })
            }

        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.FILE_DELETE_FAILED,
                originalError: error
            })
        }
    }

    /**
     * List files in directory (private implementation)
     * @param directoryPath - Directory path to list
     * @param options - Callback options with target support
     */
    private _listFilesInDirectoryWithOptions(
        directoryPath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (filePaths: string[]) => void
        }
    ): void {
        try {
            if (!NATIVE || !native.fileUtils) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.NATIVE_API_NOT_AVAILABLE
                })
                return
            }

            if (!native.fileUtils.isDirectoryExist(directoryPath)) {
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.FILE_NOT_FOUND,
                    message: `Directory not found: ${directoryPath}`
                })
                return
            }

            // Check if native directory listing is available
            if (typeof native.fileUtils.listFiles === 'function') {
                try {
                    const files = native.fileUtils.listFiles(directoryPath)
                    ResourceDownloaderCallbackHelper.CallSuccess(options, files || [])
                } catch (listError) {
                    ResourceDownloaderCallbackHelper.CallError(options, {
                        errorType: ResourceDownloaderErrorType.CACHE_ACCESS_FAILED,
                        originalError: listError
                    })
                }
            } else {
                // Fallback - directory listing not available
                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.PLATFORM_NOT_SUPPORTED,
                    message: 'Directory listing API not available'
                })
            }

        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.CACHE_ACCESS_FAILED,
                originalError: error
            })
        }
    }

    /**
     * Extract ZIP file using native API (private implementation)
     * @param zipFilePath - Path to ZIP file
     * @param targetDirectory - Target extraction directory
     * @param options - Callback options with target support
     */
    private _extractZipWithNativeAPI(
        zipFilePath: string,
        targetDirectory: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (extractedFiles: string[]) => void
        }
    ): void {
        try {
            // Ensure target directory exists
            if (!native.fileUtils.isDirectoryExist(targetDirectory)) {
                const dirCreated = native.fileUtils.createDirectory(targetDirectory)
                if (!dirCreated) {
                    ResourceDownloaderCallbackHelper.CallError(options, {
                        errorType: ResourceDownloaderErrorType.DIRECTORY_CREATE_FAILED,
                        message: targetDirectory
                    })
                    return
                }
            }

            // Use native ZIP extraction if available
            if (typeof native.fileUtils.decompressZip === 'function') {
                // 報告開始進度
                ResourceDownloaderCallbackHelper.CallProgress(options, {
                    loaded: RESOURCE_DOWNLOADER_CONSTANTS.PROGRESS_START,
                    total: RESOURCE_DOWNLOADER_CONSTANTS.PROGRESS_COMPLETE  // 使用百分比
                })

                native.fileUtils.decompressZip(
                    zipFilePath,
                    targetDirectory,
                    this._onZipDecompressed.bind(this, targetDirectory, options),
                    true
                )
            } else {
                // Fallback if decompressZip is not available - clean up temp file
                this._deleteFileWithOptions(zipFilePath, { onSuccess: this._onEmptySuccess, onError: this._onEmptyError })

                ResourceDownloaderCallbackHelper.CallError(options, {
                    errorType: ResourceDownloaderErrorType.ZIP_EXTRACTION_NOT_IMPLEMENTED,
                    message: 'Native ZIP extraction API not available'
                })
            }

        } catch (error) {
            ResourceDownloaderCallbackHelper.CallError(options, {
                errorType: ResourceDownloaderErrorType.ZIP_EXTRACTION_FAILED,
                originalError: error
            })
        }
    }

    /**
     * ZIP 解壓縮完成回調
     */
    private _onZipDecompressed(targetDirectory: string, options: CombinedCallbackOptions & { onSuccess?: (extractedFiles: string[]) => void }): void {
        // 報告完成進度
        ResourceDownloaderCallbackHelper.CallProgress(options, {
            loaded: RESOURCE_DOWNLOADER_CONSTANTS.PROGRESS_COMPLETE,
            total: RESOURCE_DOWNLOADER_CONSTANTS.PROGRESS_COMPLETE
        })
        const extractedFiles = [targetDirectory]
        ResourceDownloaderCallbackHelper.CallSuccess(options, extractedFiles)
    }

    /**
     * 空成功回調（用於不需要處理的情況）
     */
    private _onEmptySuccess(): void {
        // 不做任何事
    }

    /**
     * 空錯誤回調（用於不需要處理的情況）
     */
    private _onEmptyError(): void {
        // 不做任何事
    }
}