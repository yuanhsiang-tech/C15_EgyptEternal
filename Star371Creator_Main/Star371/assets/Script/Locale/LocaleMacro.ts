import { LocaleDefine } from "./LocaleDefine"

/**
 * Locale 巨集定義
 */
export namespace LocaleMacro
{
    /** 語言枚舉 */
    export enum LANGUAGE
    {
        EN  = "en",
        CN  = "cn",
        TW  = "tw",
    }

    /** 語言代碼枚舉 */
    export enum LANG_CODE
    {
        EN  = "en-US",
        CN  = "zh-CN",
        TW  = "zh-TW",
    }

    /** 預設語言 */
    export const DEFAULT_LANGUAGE: LANGUAGE = LANGUAGE.TW
    export const DEFAULT_LANG_CODE: LANG_CODE = LANG_CODE.TW

    // 語言映射表 - 使用對象映射替代 switch
    const LANGUAGE_TO_CODE_MAP: Record<string, LANG_CODE> = {
        [LANGUAGE.EN]: LANG_CODE.EN,
        [LANGUAGE.CN]: LANG_CODE.CN,
        [LANGUAGE.TW]: LANG_CODE.TW,
    }

    const CODE_TO_LANGUAGE_MAP: Record<string, LANGUAGE> = {
        [LANG_CODE.EN]: LANGUAGE.EN,
        [LANG_CODE.CN]: LANGUAGE.CN,
        [LANG_CODE.TW]: LANGUAGE.TW,
    }

    /** 將 LANGUAGE 轉換成 LANG_CODE */
    export function LanguageToLangCode(language: LANGUAGE): LANG_CODE
    {
        return LANGUAGE_TO_CODE_MAP[language] || DEFAULT_LANG_CODE
    }

    /** 將 LANG_CODE 轉換成 LANGUAGE */
    export function LangCodeToLanguage(langCode: LANG_CODE): LANGUAGE
    {
        return CODE_TO_LANGUAGE_MAP[langCode] || DEFAULT_LANGUAGE
    }

    /** 將 LANGUAGE 轉換成字串 */
    export function LanguageToString(language: LANGUAGE): string
    {
        return String(language)
    }

    /** 檢查文字是否有效 */
    export function IsValidText(text: string): boolean
    {
        if (typeof text !== "string" || text.length === 0) {
            return false
        }
        return text.indexOf(LocaleDefine.TextResource.MISSING_TEXT_MARKER) === -1
    }
}
