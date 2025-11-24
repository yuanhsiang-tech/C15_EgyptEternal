import { LocaleMacro } from "./LocaleMacro"

/**
 * 語言狀態管理器 - 使用閉包模式
 */
const LanguageStateManager = (() => {
    // 私有狀態
    let currentLang: LocaleMacro.LANGUAGE = LocaleMacro.DEFAULT_LANGUAGE
    let resourceReady: boolean = false

    return {
        SetLanguage(lang: LocaleMacro.LANGUAGE): void {
            currentLang = lang
        },
        
        GetLanguage(): LocaleMacro.LANGUAGE {
            return currentLang
        },
        
        ComputeLangCode(): LocaleMacro.LANG_CODE {
            return LocaleMacro.LanguageToLangCode(currentLang)
        },
        
        ComputeResourcePath(): string {
            return LocaleMacro.LanguageToString(currentLang)
        },
        
        SetResourceReady(ready: boolean): void {
            resourceReady = ready
        },
        
        IsResourceReady(): boolean {
            return resourceReady
        }
    }
})()

/**
 * 全局語言變數
 * 提供多語系系統的核心狀態管理
 */
export namespace LocaleVar
{
    /** 取得當前語言 */
    export function GetLanguage(): LocaleMacro.LANGUAGE {
        return LanguageStateManager.GetLanguage()
    }

    /** 設定當前語言 */
    export function SetLanguage(value: LocaleMacro.LANGUAGE): void {
        LanguageStateManager.SetLanguage(value)
    }

    /** 取得當前語言代碼 */
    export function GetLangCode(): LocaleMacro.LANG_CODE {
        return LanguageStateManager.ComputeLangCode()
    }

    /** 取得資源語言路徑 */
    export function GetResLang(): string {
        return LanguageStateManager.ComputeResourcePath()
    }

    /** 取得資源準備狀態 */
    export function GetResReady(): boolean {
        return LanguageStateManager.IsResourceReady()
    }

    /** 設定資源準備狀態 */
    export function SetResReady(value: boolean): void {
        LanguageStateManager.SetResourceReady(value)
    }
}
