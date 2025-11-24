import { LocaleMacro } from "../../Locale/LocaleMacro"
import { TimeFormatConstants } from "../TimeDefine"

/**
 * 時間格式化基類
 */
export abstract class TimeFormatterBase {
    //----------------------------------------------------------------
    /**
     * 用於初始化語言設置，由外部重寫
     */
    public Init(language: LocaleMacro.LANGUAGE): any { }

    //----------------------------------------------------------------

    //================================================================
    // 時長格式化
    //================================================================

    //----------------------------------------------------------------
    /**
     * 格式化為時:分:秒 (HH:MM:SS)
     * @param seconds 秒數
     */
    public FormatHMS(seconds: number): string {
        if (seconds >= 0) {
            const hrs: string = `${Math.floor(seconds / 3600)}`.padStart(2, '0')
            const mins: string = `${Math.floor((seconds % 3600) / 60)}`.padStart(2, '0')
            const secs: string = `${Math.floor(seconds % 60)}`.padStart(2, '0')
            return `${hrs}:${mins}:${secs}`
        } else {
            return `-- : -- : --`
        }
    }

    //----------------------------------------------------------------
    /**
     * 倒計時格式化
     * 根據剩餘時間自動選擇最合適的顯示格式
     * - 超過 maxSeconds 且 maxSeconds >= 1天時顯示 "N 天(s)"
     * - 超過 1天時顯示 "N天 HH時"
     * - 超過 1小時時顯示 "HH時 MM分"
     * - 超過 1分鐘時顯示 "MM分 SS秒"
     * - 其他情況顯示 "SS秒"
     * 
     * @param remainSeconds 剩餘秒數
     * @param maxSeconds 最大秒數闾值
     */
    public FormatCountdown(remainSeconds: number, maxSeconds?: number): string {
        // 超過闾值時，顯示天數
        if (maxSeconds >= TimeFormatConstants.TimeUnit.D && remainSeconds >= maxSeconds) {
            const days: number = Math.floor(remainSeconds / TimeFormatConstants.TimeUnit.D)
            return `${days} ${this.GetDayText(days, false)}`
        }

        // 超過1天，顯示 天+小時
        if (remainSeconds >= TimeFormatConstants.TimeUnit.D) {
            const days: number = Math.floor(remainSeconds / TimeFormatConstants.TimeUnit.D)
            const hours: number = Math.floor((remainSeconds % TimeFormatConstants.TimeUnit.D) / TimeFormatConstants.TimeUnit.HR)
            return `${days}${this.GetDayText(days, true)} ${(hours + '').padStart(2, ' ')}${this.GetHourText(hours, true)}`
        }

        // 超過1小時，顯示 小時+分鐘
        if (remainSeconds >= TimeFormatConstants.TimeUnit.HR) {
            const hours: number = Math.floor(remainSeconds / TimeFormatConstants.TimeUnit.HR)
            const minutes: number = Math.floor((remainSeconds % TimeFormatConstants.TimeUnit.HR) / TimeFormatConstants.TimeUnit.MIN)
            return `${hours}${this.GetHourText(hours, true)} ${(minutes + '').padStart(2, ' ')}${this.GetMinuteText(minutes, true)}`
        }

        // 超過1分鐘，顯示 分鐘+秒
        if (remainSeconds >= TimeFormatConstants.TimeUnit.MIN) {
            const minutes: number = Math.floor(remainSeconds / TimeFormatConstants.TimeUnit.MIN)
            const seconds: number = Math.floor(remainSeconds % TimeFormatConstants.TimeUnit.MIN)
            return `${minutes}${this.GetMinuteText(minutes, true)} ${(seconds + '').padStart(2, ' ')}${this.GetSecondText(seconds, true)}`
        }

        // 只顯示秒
        if (remainSeconds >= 0) {
            const seconds: number = Math.floor(remainSeconds)
            return `${seconds}${this.GetSecondText(seconds, true)}`
        }

        return `---`
    }

    //----------------------------------------------------------------
    /** 取得"天"的文本表示 */
    protected abstract GetDayText(dayCount: number, isShort?: boolean): string

    /** 取得"小時"的文本表示 */
    protected abstract GetHourText(hourCount: number, isShort?: boolean): string

    /** 取得"分鐘"的文本表示 */
    protected abstract GetMinuteText(minuteCount: number, isShort?: boolean): string

    /** 取得"秒"的文本表示 */
    protected abstract GetSecondText(secondCount: number, isShort?: boolean): string

    //----------------------------------------------------------------
    /**
     * 帶"剩餘"後綴的倒計時格式化
     * @param remainSeconds 剩餘秒數
     * @param maxSeconds 最大秒數闾值
     */
    public abstract FormatCountdownWithRemaining(remainSeconds: number, maxSeconds?: number): string

    //----------------------------------------------------------------

    //================================================================
    // 日期時間格式化
    //================================================================

    //----------------------------------------------------------------
    /**
     * 時區字符串格式化 (UTC+8, UTC-8, UTC)
     * @param timezone 時區值 (-12 ~ 12)
     */
    public FormatTimezone(timezone: number = TimeFormatConstants.DEFAULT_TIMEZONE): string {
        if (typeof timezone !== "number") {
            return ''
        } else if (timezone > 0) {
            return `UTC+${timezone}`
        } else if (timezone < 0) {
            return `UTC${timezone}`
        } else {
            return 'UTC'
        }
    }

    //----------------------------------------------------------------
    /**
     * 日期時間格式化 (MMM DD HH:mm)
     * @param dateObject 日期物件
     * @param timezone 顯示時區
     */
    public abstract FormatDateTime(dateObject: Date, timezone?: number): string

    //----------------------------------------------------------------
    /**
     * 日期時間+時區格式化 (MMM DD HH:mm UTC+8)
     * @param dateObject 日期物件
     * @param timezone 顯示時區
     */
    public FormatDateTimeWithTZ(dateObject: Date, timezone: number = TimeFormatConstants.DEFAULT_TIMEZONE): string {
        return `${this.FormatDateTime(dateObject, timezone)} ${this.FormatTimezone(timezone)}`
    }

    //----------------------------------------------------------------
}

