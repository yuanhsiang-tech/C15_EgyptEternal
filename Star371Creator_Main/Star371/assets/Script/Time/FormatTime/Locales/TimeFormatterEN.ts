import { NumberUtils } from "../../../../Stark/FuncUtils/NumberUtils"
import { TimeFormatConstants } from "../../TimeDefine"
import { TimeFormatterBase } from "../TimeFormatterBase"

/**
 * 英文文本資源
 */
namespace TextResources {
    /**
     * 可數名詞類（處理單複數）
     */
    class CountableWord {
        constructor(public singularForm: string, public pluralForm: string) { }

        public GetForm(count: BigValuable): string {
            if (typeof count === 'number') {
                return count > 1 ? this.pluralForm : this.singularForm
            } else {
                const bigCount: any = NumberUtils.ParseBigNumber(count)
                return bigCount.gt(1) ? this.pluralForm : this.singularForm
            }
        }
    }

    export const Text = {
        SEC: new CountableWord("Second", "Seconds"),
        SEC_SHORT: "S",
        MIN: new CountableWord("Minute", "Minutes"),
        MIN_SHORT: "M",
        HR: new CountableWord("Hour", "Hours"),
        HR_SHORT: "H",
        DAY: new CountableWord("Day", "Days"),
        DAY_SHORT: "D",
        REMAINING: "Left",
    }

    export const MonthAbbr = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]
}

/**
 * 英文時間格式化器
 */
export class TimeFormatterEN extends TimeFormatterBase {
    protected GetDayText(dayCount: number, isShort?: boolean): string {
        return isShort ? TextResources.Text.DAY_SHORT : TextResources.Text.DAY.GetForm(dayCount)
    }

    protected GetHourText(hourCount: number, isShort?: boolean): string {
        return isShort ? TextResources.Text.HR_SHORT : TextResources.Text.HR.GetForm(hourCount)
    }

    protected GetMinuteText(minuteCount: number, isShort?: boolean): string {
        return isShort ? TextResources.Text.MIN_SHORT : TextResources.Text.MIN.GetForm(minuteCount)
    }

    protected GetSecondText(secondCount: number, isShort?: boolean): string {
        return isShort ? TextResources.Text.SEC_SHORT : TextResources.Text.SEC.GetForm(secondCount)
    }

    public FormatCountdownWithRemaining(remainSeconds: number, maxSeconds?: number): string {
        return `${this.FormatCountdown(remainSeconds, maxSeconds)} ${TextResources.Text.REMAINING}`
    }

    public FormatDateTime(dateObject: Date, timezone: number = TimeFormatConstants.DEFAULT_TIMEZONE): string {
        const adjustedDate: Date = (timezone == 0) ? dateObject : new Date(dateObject.getTime() + timezone * 60 * 60 * 1000)
        const monthStr: string = TextResources.MonthAbbr[adjustedDate.getUTCMonth()]
        const dateStr: string = `${adjustedDate.getUTCDate()}`.padStart(2, '0')
        const hourStr: string = `${adjustedDate.getUTCHours()}`.padStart(2, '0')
        const minuteStr: string = `${adjustedDate.getUTCMinutes()}`.padStart(2, '0')

        return `${monthStr} ${dateStr} ${hourStr}:${minuteStr}`
    }
}