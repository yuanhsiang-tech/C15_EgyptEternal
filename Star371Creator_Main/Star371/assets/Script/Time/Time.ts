import { ServerTime as ServerTimeInstance, ServerTimeCore } from "./ServerTimeCore"
import { FormatTime as FormatTimeInstance } from "./FormatTimeCore"
import { LocaleMacro } from "../Locale/LocaleMacro"
import { TimeConverter } from "./TimeDefine"

/**
 * 伺服器時間模組
 * 提供与 VF 项目一致的接口
 */
export namespace ServerTime {
    const core: ServerTimeCore = ServerTimeInstance

    /** 進行伺服器時間同步 */
    export function Sync(): void {
        core.PerformSync()
    }

    /** 註冊伺服器時間同步完成事件 */
    export function OnSynced(callback: (serverDate: Date) => void, target?: any): void {
        core.RegisterSyncHandler(callback, target)
    }

    /** 取消註冊伺服器時間同步完成事件 */
    export function OffSynced(callback: (serverDate: Date) => void, target?: any): void {
        core.UnregisterSyncHandler(callback, target)
    }

    /** 取得伺服器時間 (從 1970/1/1 00:00:00 開始的毫秒數) */
    export function TimeNow(): number {
        return core.CurrentTimeMs
    }

    /** 取得伺服器時間 (Date 物件) */
    export function DateNow(): Date {
        return core.Now
    }

    /** 取得下一次 Server 機制每日重置時間 (從 1970/1/1 00:00:00 開始的毫秒數) */
    export function NextResetTime(): number {
        return core.DailyResetTimeMs
    }

    /** 取得下一次 Server 機制每日重置時間 (Date 物件) */
    export function NextResetDate(): Date {
        return core.DailyResetDateObj
    }

    /** 取得伺服器時區字符串 (+0800) */
    export function TimezoneString(): string {
        return core.TimezoneStr
    }

    /** 取得伺服器日期字符串(UTC+8) (yyyy-MM-DD) */
    export function ServerDateString(): string {
        return core.DateString
    }

    /** 取得伺服器時間字符串(UTC+8) (HH:mm:ss) */
    export function ServerTimeString(): string {
        return core.TimeString
    }

    /** 取得伺服器日期時間字符串(UTC+8) (yyyy-MM-DD HH:mm:ss) */
    export function ServerDateTimeString(): string {
        return core.DateTimeString
    }

    /** 将 Protobuf Timestamp 转换為 Date 目標 */
    export function TimestampToDate(timestamp: any): Date {
        return TimeConverter.TimestampToDate(timestamp)
    }

    /** 将 Date 目標转换為 Protobuf Timestamp */
    export function DateToTimestamp(date: Date): any {
        return TimeConverter.DateToTimestamp(date)
    }
}

/**
 * 時間格式化模組
 * 提供与 VF 项目一致的接口
 */
export namespace FormatTime {
    const core: any = FormatTimeInstance

    /**
     * 初始化
     * @param language 語言
     */
    export function Init(language: LocaleMacro.LANGUAGE): void {
        core.Init(language)
    }

    /**
     * 取得時間字符串 (hh:mm:ss)
     * @param second 秒數
     */
    export function DurationHMS(second: number): string {
        return core.FormatHMS(second)
    }

    /**
     * 倒數計時
     * 格式為 `**D **H`, `**H **M`, `**M **S`, `**S`
     * - maxSecond 大於等於 1 天 (86400 秒) 且 remainSecond 大於等於 maxSecond 將顯示為 `N Day(s)`
     * 
     * @param remainSecond 剩餘秒數
     * @param maxSecond 最大秒數，超過此秒數将顯示為 `N Day(s)`
     */
    export function CountDown(remainSecond: number, maxSecond?: number): string {
        return core.FormatCountdown(remainSecond, maxSecond)
    }

    /**
     * 倒數計時
     * 格式為 `**D **H Left`, `**H **M Left`, `**M **S Left`, `**S Left`
     * - maxSecond 大于等于 1 天 (86400 秒) 且 remainSecond 大于等于 maxSecond 将顯示為 `N Day(s) Left`
     * 
     * @param remainSecond 剩餘秒數
     * @param maxSecond 最大秒數，超過此秒數将顯示為 `N Day(s) Left`
     */
    export function CountDownWithLeft(remainSecond: number, maxSecond?: number): string {
        return core.FormatCountdownWithRemaining(remainSecond, maxSecond)
    }

    /**
     * 時區字符串 (UTC+8, UTC-8, UTC)
     * @param timezone 時區 (-12 ~ 12)
     */
    export function Timezone(timezone?: number): string {
        return core.FormatTimezone(timezone)
    }

    /**
     * 日期時間字符串 (MMM DD HH:mm)
     * @param dateObj 時間物件
     * @param timezone 顯示時區 (-12 ~ 12)
     */
    export function DateTime(dateObj: Date, timezone?: number): string {
        return core.FormatDateTime(dateObj, timezone)
    }

    /**
     * 日期時間字符串 (MMM DD HH:mm UTC+8)
     * @param dateObj 時間物件
     * @param timezone 顯示時區 (-12 ~ 12)
     */
    export function DateTimeWithTimezone(dateObj: Date, timezone?: number): string {
        return core.FormatDateTimeWithTZ(dateObj, timezone)
    }
}

