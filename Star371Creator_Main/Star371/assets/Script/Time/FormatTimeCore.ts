import { LocaleMacro } from "../Locale/LocaleMacro"
import { TimeFormatterBase } from "./FormatTime/TimeFormatterBase"
import { TimeFormatterFactory } from "./FormatTime/TimeFormatterFactory"

const FALLBACK_LANGUAGE: LocaleMacro.LANGUAGE = LocaleMacro.DEFAULT_LANGUAGE

/**
 * 時間格式化系統核心類
 */
class FormatTimeCore {
    private static s_instance: FormatTimeCore = null
    
    /**
     * 取得單例實例
     */
    public static GetInstance(): FormatTimeCore {
        if (!this.s_instance) {
            this.s_instance = new FormatTimeCore()
        }
        return this.s_instance
    }
    
    //----------------------------------------------------------------
    private m_activeLanguage: LocaleMacro.LANGUAGE = null
    private m_activeFormatter: TimeFormatterBase = null
    
    //----------------------------------------------------------------
    private constructor() {
        this.SetupFormatter(FALLBACK_LANGUAGE)
    }
    
    //----------------------------------------------------------------
    /**
     * 初始化語言設置
     */
    public Init(language: LocaleMacro.LANGUAGE): void {
        this.SetupFormatter(language)
    }
    
    /**
     * 格式化為時:分:秒 (HH:MM:SS)
     */
    public FormatHMS(seconds: number): string {
        return this.GetFormatter().FormatHMS(seconds)
    }
    
    /**
     * 倒計時格式化
     */
    public FormatCountdown(remainSeconds: number, maxSeconds?: number): string {
        return this.GetFormatter().FormatCountdown(remainSeconds, maxSeconds)
    }
    
    /**
     * 帶"剩餘"後綴的倒計時格式化
     */
    public FormatCountdownWithRemaining(remainSeconds: number, maxSeconds?: number): string {
        return this.GetFormatter().FormatCountdownWithRemaining(remainSeconds, maxSeconds)
    }
    
    /**
     * 時區字符串格式化
     */
    public FormatTimezone(timezone?: number): string {
        return this.GetFormatter().FormatTimezone(timezone)
    }
    
    /**
     * 日期時間格式化
     */
    public FormatDateTime(dateObject: Date, timezone?: number): string {
        return this.GetFormatter().FormatDateTime(dateObject, timezone)
    }
    
    /**
     * 日期時間+時區格式化
     */
    public FormatDateTimeWithTZ(dateObject: Date, timezone?: number): string {
        return this.GetFormatter().FormatDateTimeWithTZ(dateObject, timezone)
    }
    
    //----------------------------------------------------------------
    private SetupFormatter(language: LocaleMacro.LANGUAGE): void {
        if (this.m_activeLanguage === language && this.m_activeFormatter) {
            return
        }
        
        this.m_activeLanguage = language
        this.m_activeFormatter = TimeFormatterFactory.CreateFormatter(this.m_activeLanguage)
        
        if (!this.m_activeFormatter) {
            this.m_activeLanguage = FALLBACK_LANGUAGE
            this.m_activeFormatter = TimeFormatterFactory.CreateFormatter(this.m_activeLanguage)
        }
    }
    
    private GetFormatter(): TimeFormatterBase {
        if (!this.m_activeFormatter) {
            this.SetupFormatter(FALLBACK_LANGUAGE)
        }
        return this.m_activeFormatter
    }
}

/**
 * 導出單例實例
 */
export const FormatTime = FormatTimeCore.GetInstance()

