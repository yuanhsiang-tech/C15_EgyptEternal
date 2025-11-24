import { VersionedDownloadCategory } from "../VersionedDownloaderDefine"

/**
 * 自動加載資源資料結構
 */
export interface IAutoLoadingData {
    /** 下載分類 */
    category: VersionedDownloadCategory
    /** 目錄路徑 */
    directory: string
    /** 檔案名 */
    filename: string
}

/**
 * 自動加載輔助函數
 */
export namespace AutoLoadingHelper {
    /**
     * 創建自動加載資料
     * @param category 下載分類
     * @param directory 目錄路徑
     * @param filename 檔案名
     * @returns 自動加載資料
     */
    export function CreateData(
        filename: string = "",
        category: VersionedDownloadCategory = VersionedDownloadCategory.DEFAULT,
        directory: string = ""
    ): IAutoLoadingData {
        return {
            category,
            directory,
            filename
        }
    }

    /**
     * 構建完整檔案路徑
     * @param data 自動加載資料
     * @returns 完整檔案路徑
     */
    export function BuildFilePath(data: IAutoLoadingData): string {
        if (data.directory) {
            return `${data.directory}/${data.filename}`
        }
        return data.filename
    }

    /**
     * 驗證自動加載資料
     * @param data 自動加載資料
     * @returns 是否有效
     */
    export function ValidateData(data: IAutoLoadingData): boolean {
        return !!(data && data.filename && data.category !== undefined)
    }

    /**
     * 複製自動加載資料
     * @param data 原始資料
     * @returns 複製的資料
     */
    export function CloneData(data: IAutoLoadingData): IAutoLoadingData {
        return {
            category: data.category,
            directory: data.directory,
            filename: data.filename
        }
    }
}
