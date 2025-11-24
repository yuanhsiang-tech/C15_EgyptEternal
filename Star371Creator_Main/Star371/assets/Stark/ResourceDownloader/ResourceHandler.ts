import {
    CombinedCallbackOptions
} from './ResourceDownloaderDefine'

/**
 * 資源處理器介面 - 定義統一的檔案操作方法
 * 用於不同平台的資源處理實現（Native/Web）
 */
export interface IResourceHandler {
    /**
     * 保存檔案資料
     * @param filePath 檔案路徑
     * @param data 檔案資料
     * @param options 回調選項
     */
    SaveToFile(
        filePath: string,
        data: ArrayBuffer,
        options: CombinedCallbackOptions & {
            onSuccess?: (savedPath: string) => void
        }
    ): void

    /**
     * 載入檔案資料
     * @param filePath 檔案路徑
     * @param options 回調選項
     */
    LoadFromFile(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (data: ArrayBuffer) => void
        }
    ): void

    /**
     * 解壓縮ZIP檔案
     * @param zipData ZIP檔案資料
     * @param targetDirectory 目標目錄
     * @param options 回調選項
     */
    ExtractZipFile(
        zipData: ArrayBuffer,
        targetDirectory: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (extractedFiles: string[]) => void
        }
    ): void

    /**
     * 刪除檔案
     * @param filePath 檔案路徑
     * @param options 回調選項
     */
    DeleteFile(
        filePath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void

    /**
     * 列出檔案
     * @param directoryPath 目錄路徑（Native）或儲存前綴（Web）
     * @param options 回調選項
     */
    ListFiles(
        directoryPath: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (filePaths: string[]) => void
        }
    ): void

    /**
     * 載入JSON資料
     * @param key 儲存鍵值
     * @param options 回調選項
     */
    LoadJsonData(
        key: string,
        options: CombinedCallbackOptions & {
            onSuccess?: (jsonData: any) => void
        }
    ): void

    /**
     * 保存JSON資料
     * @param key 儲存鍵值
     * @param jsonData JSON資料
     * @param options 回調選項
     */
    SaveJsonData(
        key: string,
        jsonData: any,
        options: CombinedCallbackOptions & {
            onSuccess?: () => void
        }
    ): void
}
