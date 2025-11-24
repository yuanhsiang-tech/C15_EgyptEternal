/**
 * Locale 系統常數與設定
 */
export namespace LocaleDefine
{
    /** 文字資源設定 */
    export namespace TextResource
    {
        /** 找不到對應文字時的替代標記 */
        export const MISSING_TEXT_MARKER: string = "[UNKNOWN TEXT]"

        /** 文字檔案根目錄名稱 */
        export const ROOT_FOLDER: string = "Text"

        /** 預設的文字類別 */
        export const FALLBACK_CATEGORY: string = "String"
    }

    /** 檔案路徑相關 */
    export namespace PathConfig
    {
        /** 路徑段落連接符號 */
        export const SEGMENT_DELIMITER: string = "/"

        /** Bundle 識別符號 */
        export const BUNDLE_MARKER: string = ">>"
    }

    /** 支援的語言類型 */
    export namespace SupportedLanguage
    {
        /** 英語 */
        export const ENGLISH: string = "en"

        /** 簡體中文 */
        export const SIMPLIFIED_CHINESE: string = "cn"

        /** 繁體中文 */
        export const TRADITIONAL_CHINESE: string = "tw"

        /** 系統啟動預設語言 */
        export const SYSTEM_DEFAULT: string = ENGLISH
    }

    /** ISO 語言代碼對應 */
    export namespace ISOCode
    {
        /** 英語 ISO 代碼 */
        export const ENGLISH: string = "en-US"

        /** 簡體中文 ISO 代碼 */
        export const SIMPLIFIED_CHINESE: string = "zh-CN"

        /** 繁體中文 ISO 代碼 */
        export const TRADITIONAL_CHINESE: string = "zh-TW"
    }

    /** 快取管理設定 */
    export namespace CacheConfig
    {
        /** 快取識別碼分隔字元 */
        export const ID_DELIMITER: string = "::"

        /** 快取容器初始大小 */
        export const INITIAL_CAPACITY: number = 16
    }

    /** 群組設定 */
    export namespace Group
    {
        export const DEFAULT: string = "default"
    }
}
