import { EventDispatcher } from "../../Stark/Utility/EventDispatcher"
import { log, error } from "cc"
import { PlatformService, IPlatformServiceDelegate } from "../Service/PlatformService"

/**
 * 伺服器時間系統事件
 */
const TIME_SYSTEM_EVENTS = {
    SYNC_COMPLETED: "time_sync_completed",
} as const

/**
 * 時間配置常量
 */
namespace TimeConfig {
    /** 伺服器時區 (UTC+8) */
    export const TIMEZONE_OFFSET: string = "+0800"

    /** 每日重置時間 (HH:MM:SS 格式) */
    export const DAILY_RESET_HOUR: string = "06:00:00"

    /** 同步請求超時時間 (毫秒) */
    export const SYNC_TIMEOUT: number = 5000
}

/**
 * 日期時間工具函數
 */
namespace DateTimeHelper {
    /**
     * 將字符串轉換為日期物件
     */
    export function StringToDate(dateString: string): Date {
        // 處理 ISO 8601 格式的日期字符串
        const normalized = dateString.replace(/\s/g, 'T').replace(/[+-]\d{4}$/, '')
        return new Date(normalized)
    }

    /**
     * 格式化數字為兩位數
     */
    export function PadNumber(num: number): string {
        return num.toString().padStart(2, '0')
    }
}

/**
 * 伺服器時間核心類
 */
export class ServerTimeCore implements IPlatformServiceDelegate {
    //----------------------------------------------------------------

    private static s_eventBus: EventDispatcher = null
    public static get EventBus(): EventDispatcher {
        return this.s_eventBus || (this.s_eventBus = new EventDispatcher())
    }

    //----------------------------------------------------------------
    private static s_instance: ServerTimeCore = null

    /**
     * 取得單例實例
     */
    public static GetInstance(): ServerTimeCore {
        if (!this.s_instance) {
            this.s_instance = new ServerTimeCore()
        }
        return this.s_instance
    }

    public static get Instance(): ServerTimeCore {
        return this.GetInstance()
    }

    //----------------------------------------------------------------
    // 同步狀態標誌
    private m_syncInProgress: boolean = false

    // 本地時間偏移量
    private m_timeOffsetMs: number = 0

    // 下次重置時間戳
    private m_nextDailyReset: number = 0

    //----------------------------------------------------------------
    private constructor() {
    }

    //----------------------------------------------------------------
    /**
     * 執行伺服器時間同步
     */
    public PerformSync(): void {
        if (this.m_syncInProgress) {
            return
        }

        this.m_syncInProgress = true

        try {
            // 使用 PlatformService 進行時間同步
            PlatformService.Instance.SyncTime()
        } catch (err) {
            error("ServerTimeCore.PerformSync: 同步失敗", err)
            this.m_syncInProgress = false
        }
    }

    //----------------------------------------------------------------
    /**
     * 初始化 PlatformService delegate
     */
    public InitializePlatformServiceDelegate(): void {
        try {
            PlatformService.Instance.SetDelegate(this)
        } catch (err) {
            error("ServerTimeCore.InitializePlatformServiceDelegate: 初始化失敗", err)
        }
    }

    //----------------------------------------------------------------
    /**
     * IPlatformServiceDelegate 實現
     * 當收到伺服器時間時呼叫
     */
    public OnGetServerTimeAck(serverDate: Date): void {
        this.m_timeOffsetMs = serverDate.getTime() - Date.now()
        this.m_syncInProgress = false

        log("ServerTimeCore.OnGetServerTimeAck: 時間同步完成", serverDate.toISOString())
        ServerTimeCore.EventBus.Dispatch(TIME_SYSTEM_EVENTS.SYNC_COMPLETED, serverDate)
    }

    //----------------------------------------------------------------
    /**
     * 註冊同步完成事件監聽器
     */
    public RegisterSyncHandler(handler: (serverDate: Date) => void, context?: any): void {
        ServerTimeCore.EventBus.On(TIME_SYSTEM_EVENTS.SYNC_COMPLETED, handler, context)
    }

    //----------------------------------------------------------------
    /**
     * 移除同步完成事件監聽器
     */
    public UnregisterSyncHandler(handler: (serverDate: Date) => void, context?: any): void {
        ServerTimeCore.EventBus.Off(TIME_SYSTEM_EVENTS.SYNC_COMPLETED, handler, context)
    }

    //----------------------------------------------------------------
    /**
     * 取得目前伺服器時間戳 (毫秒)
     */
    public get CurrentTimeMs(): number {
        return Date.now() + this.m_timeOffsetMs
    }

    public get TimeOffsetMs(): number {
        return this.m_timeOffsetMs
    }

    public get Now(): Date {
        return this.GetTime()
    }

    public GetTime(offsetMs: number = 0): Date {
        return new Date(this.CurrentTimeMs + offsetMs)
    }

    //----------------------------------------------------------------
    /**
     * 取得下次每日重置時間戳 (毫秒)
     */
    public get DailyResetTimeMs(): number {
        // 如果已超過重置時間，需要重新計算
        if (this.CurrentTimeMs >= this.m_nextDailyReset) {
            this.m_nextDailyReset = this.CalculateNextResetTime()
        }

        return this.m_nextDailyReset
    }

    //----------------------------------------------------------------
    /**
     * 取得下次每日重置時間物件
     */
    public get DailyResetDateObj(): Date {
        return new Date(this.DailyResetTimeMs)
    }

    //----------------------------------------------------------------
    /**
     * 取得伺服器時區字符串
     */
    public get TimezoneStr(): string {
        return TimeConfig.TIMEZONE_OFFSET
    }

    //----------------------------------------------------------------
    /**
     * 取得伺服器日期字符串 (YYYY-MM-DD)
     */
    public get DateString(): string {
        const utcDate: Date = new Date(this.CurrentTimeMs - new Date().getTimezoneOffset() * 60 * 1000)
        const year: number = utcDate.getUTCFullYear()
        const month: string = DateTimeHelper.PadNumber(utcDate.getUTCMonth() + 1)
        const day: string = DateTimeHelper.PadNumber(utcDate.getUTCDate())
        return `${year}-${month}-${day}`
    }

    //----------------------------------------------------------------
    /**
     * 取得伺服器時間字符串 (HH:MM:SS)
     */
    public get TimeString(): string {
        const utcDate: Date = new Date(this.CurrentTimeMs - new Date().getTimezoneOffset() * 60 * 1000)
        const hours: string = DateTimeHelper.PadNumber(utcDate.getUTCHours())
        const minutes: string = DateTimeHelper.PadNumber(utcDate.getUTCMinutes())
        const seconds: string = DateTimeHelper.PadNumber(utcDate.getUTCSeconds())
        return `${hours}:${minutes}:${seconds}`
    }

    //----------------------------------------------------------------
    /**
     * 取得伺服器日期時間字符串 (YYYY-MM-DD HH:MM:SS)
     */
    public get DateTimeString(): string {
        return `${this.DateString} ${this.TimeString}`
    }

    //----------------------------------------------------------------
    /**
     * 計算下次每日重置時間
     */
    private CalculateNextResetTime(): number {
        const todayResetStr: string = `${this.DateString} ${TimeConfig.DAILY_RESET_HOUR}`
        const todayResetTime: number = DateTimeHelper.StringToDate(todayResetStr).getTime()
        // 加一天 (86400000 毫秒)
        return todayResetTime + 86400000
    }

    //----------------------------------------------------------------
}

/**
 * 導出單例實例
 */
export const ServerTime = ServerTimeCore.GetInstance()

