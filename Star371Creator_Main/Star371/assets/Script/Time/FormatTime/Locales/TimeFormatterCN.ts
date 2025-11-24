import { TimeFormatConstants } from "../../TimeDefine"
import { TimeFormatterBase } from "../TimeFormatterBase"

/**
 * 簡體中文文本資源
 */
namespace TextResources {
    export const Text = {
        SEC: "秒",
        MIN: "分钟",
        MIN_SHORT: "分",
        HR: "小時",
        HR_SHORT: "時",
        DAY: "天",
        DATE_SUFFIX: "日",
        MONTH_SUFFIX: "月",
        REMAINING: "剩餘",
    }
}

/**
 * 簡體中文時間格式化器
 */
export class TimeFormatterCN extends TimeFormatterBase {
    protected GetDayText(dayCount: number, isShort?: boolean): string {
        return TextResources.Text.DAY
    }
    
    protected GetHourText(hourCount: number, isShort?: boolean): string {
        return isShort ? TextResources.Text.HR_SHORT : TextResources.Text.HR
    }
    
    protected GetMinuteText(minuteCount: number, isShort?: boolean): string {
        return isShort ? TextResources.Text.MIN_SHORT : TextResources.Text.MIN
    }
    
    protected GetSecondText(secondCount: number, isShort?: boolean): string {
        return TextResources.Text.SEC
    }
    
    public FormatCountdownWithRemaining(remainSeconds: number, maxSeconds?: number): string {
        return `${TextResources.Text.REMAINING} ${this.FormatCountdown(remainSeconds, maxSeconds)}`
    }
    
    public FormatDateTime(dateObject: Date, timezone: number = TimeFormatConstants.DEFAULT_TIMEZONE): string {
        const adjustedDate: Date = (timezone == 0) ? dateObject : new Date(dateObject.getTime() + timezone * 60 * 60 * 1000)
        const monthStr: string = `${adjustedDate.getUTCMonth() + 1}${TextResources.Text.MONTH_SUFFIX}`
        const dateStr: string = `${adjustedDate.getUTCDate()}${TextResources.Text.DATE_SUFFIX}`
        const hourStr: string = `${adjustedDate.getUTCHours()}`.padStart(2, '0')
        const minuteStr: string = `${adjustedDate.getUTCMinutes()}`.padStart(2, '0')
        
        return `${monthStr}${dateStr} ${hourStr}:${minuteStr}`
    }
}
