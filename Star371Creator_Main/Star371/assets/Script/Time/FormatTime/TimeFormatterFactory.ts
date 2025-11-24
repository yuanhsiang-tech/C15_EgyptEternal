import { LocaleMacro } from "../../Locale/LocaleMacro"
import { TimeFormatterBase } from "./TimeFormatterBase"
import { warn } from "cc"
import { TimeFormatterCN } from "./Locales/TimeFormatterCN"
import { TimeFormatterEN } from "./Locales/TimeFormatterEN"
import { TimeFormatterTW } from "./Locales/TimeFormatterTW"

// 存儲格式化器構造函數的映射表
let s_formatterRegistry: Map<LocaleMacro.LANGUAGE, Constructable<TimeFormatterBase>> = new Map()

/**
 * 時間格式化工廠
 */
export namespace TimeFormatterFactory {
    /**
     * 註冊語言對應的格式化器
     */
    export function RegisterFormatter(
        language: LocaleMacro.LANGUAGE,
        formatterConstructor: Constructable<TimeFormatterBase>
    ) {
        s_formatterRegistry.set(language, formatterConstructor)
    }

    /**
     * 根據語言創建格式化器實例
     */
    export function CreateFormatter(language: LocaleMacro.LANGUAGE): TimeFormatterBase {
        if (language?.length > 0) {
            const Constructor: Constructable<TimeFormatterBase> = s_formatterRegistry?.get(language)
            if (Constructor) {
                return new Constructor()
            }
        }

        warn(`[TimeFormatterFactory] Language formatter not found for (${language})`)
        return null
    }
}

// 自動註冊
(function () {
    TimeFormatterFactory.RegisterFormatter(LocaleMacro.LANGUAGE.CN, TimeFormatterCN)
    TimeFormatterFactory.RegisterFormatter(LocaleMacro.LANGUAGE.EN, TimeFormatterEN)
    TimeFormatterFactory.RegisterFormatter(LocaleMacro.LANGUAGE.TW, TimeFormatterTW)
})()
