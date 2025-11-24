import { _decorator, Component, Label, Enum, isValid, error } from "cc"
import { TimeManager } from "../TimeManager"
import { FormatTime } from "../Time"
import { TimeConverter } from "../TimeDefine"
import { Timestamp } from "@bufbuild/protobuf/wkt"

const { ccclass, property, menu, requireComponent } = _decorator

/**
 * 倒計時顯示類型
 */
export enum CountdownDisplayType {
    /** HH:MM:SS 格式 */
    HHMMSS = 0,
    /** 單一單位格式（自動選擇最合適的單位） */
    SINGLE = 1,
}

/**
 * 倒計時選項接口
 */
export interface ICountdownOptions {
    /** 更新回調，每幀呼叫 */
    onUpdate?: (remainingSeconds: number) => void
    /** 完成回調 */
    onComplete?: () => void
}

//================================================================================================
/**
 * CountdownLabel - 倒計時標籤組件
 * 
 * 使用方式：
 * ```typescript
 * const countdownLabel = node.getComponent(CountdownLabel);
 * const targetTime = Date.now() + 3600000; // 1小時後
 * countdownLabel.SetTargetTime(targetTime);
 * ```
 */
//================================================================================================

@ccclass("CountdownLabel")
@menu("Time/CountdownLabel")
@requireComponent(Label)
export class CountdownLabel extends Component {

    //================================================================
    // 属性
    //================================================================

    @property({
        type: Enum(CountdownDisplayType),
        displayName: "顯示類型",
        tooltip: "倒計時的顯示格式\nHHMMSS: 00:00:00 格式\nSINGLE: 剩餘 23 小時 格式"
    })
    protected m_displayType: CountdownDisplayType = CountdownDisplayType.HHMMSS

    @property({
        displayName: "顯示前綴",
        tooltip: "顯示在倒計時前的文字，例如：'剩餘 '"
    })
    protected m_prefix: string = ""

    @property({
        displayName: "顯示後綴",
        tooltip: "顯示在倒計時後的文字"
    })
    protected m_suffix: string = ""

    @property({
        displayName: "倒計時結束文字",
        tooltip: "當倒計時結束時顯示的文字"
    })
    protected m_completedText: string = "00:00:00"

    //================================================================
    // 內部變數
    //================================================================

    private m_label: Label = null
    private m_targetTimeMs: number = 0
    private m_countdownId: string = null
    private m_isCompleted: boolean = false
    private m_timeManager: TimeManager = null
    private m_userCallbacks: ICountdownOptions = null

    //================================================================
    // 屬性訪問器
    //================================================================

    /** 顯示類型 */
    public get DisplayType(): CountdownDisplayType {
        return this.m_displayType
    }
    public set DisplayType(value: CountdownDisplayType) {
        if (this.m_displayType !== value) {
            this.m_displayType = value
            this.UpdateDisplay()
        }
    }

    /** 顯示前綴 */
    public get Prefix(): string {
        return this.m_prefix
    }
    public set Prefix(value: string) {
        if (this.m_prefix !== value) {
            this.m_prefix = value
            this.UpdateDisplay()
        }
    }

    /** 顯示後綴 */
    public get Suffix(): string {
        return this.m_suffix
    }
    public set Suffix(value: string) {
        if (this.m_suffix !== value) {
            this.m_suffix = value
            this.UpdateDisplay()
        }
    }

    /** 倒計時結束文字 */
    public get CompletedText(): string {
        return this.m_completedText
    }
    public set CompletedText(value: string) {
        if (this.m_completedText !== value) {
            this.m_completedText = value
            if (this.m_isCompleted) {
                this.UpdateDisplay()
            }
        }
    }

    /** 目標時間（毫秒時間戳） */
    public get TargetTimeMs(): number {
        return this.m_targetTimeMs
    }

    /** 是否已完成 */
    public get IsCompleted(): boolean {
        return this.m_isCompleted
    }

    /** 取得 Label 組件 */
    public get Label(): Label {
        if (!isValid(this.m_label, true)) {
            this.m_label = this.getComponent(Label)
        }
        return this.m_label
    }

    //================================================================
    // 生命週期
    //================================================================

    public onLoad(): void {
        super.onLoad?.()
        this.m_timeManager = TimeManager.GetInstance()
    }

    public onEnable(): void {
        super.onEnable?.()
        // 如果之前設置過目標時間，重新註冊倒計時
        if (this.m_targetTimeMs > 0) {
            this.RegisterCountdown()
        }
    }

    public onDisable(): void {
        super.onDisable?.()
        this.UnregisterCountdown()
    }

    public onDestroy(): void {
        super.onDestroy?.()
        this.UnregisterCountdown()
    }

    //================================================================
    // 公共方法
    //================================================================

    /**
     * 設置目標時間（毫秒時間戳）
     * @param targetTimeMs 目標時間（毫秒時間戳）
     */
    public SetTargetTime(targetTimeMs: number): void {
        this.m_targetTimeMs = targetTimeMs
        this.m_isCompleted = false

        // 重新註冊倒計時
        this.UnregisterCountdown()
        this.RegisterCountdown()

        // 立即更新顯示
        this.UpdateDisplay()
    }

    /**
     * 倒數幾秒
     * @param seconds 剩餘秒數
     * @param options 可選參數，包含 onUpdate 和 onComplete 回調
     * 
     * @example
     * ```typescript
     * countdownLabel.CountdownSeconds(60, {
     *     onUpdate: (remainingSeconds) => {
     *         console.log(`剩餘 ${remainingSeconds} 秒`)
     *     },
     *     onComplete: () => {
     *         console.log("倒計時完成！")
     *     }
     * })
     * ```
     */
    public CountdownSeconds(seconds: number, options?: ICountdownOptions): void {
        const targetTimeMs: number = this.m_timeManager.GetCurrentTimeMs() + (seconds * 1000)
        this.m_userCallbacks = options ?? null
        this.SetTargetTime(targetTimeMs)
    }

    /**
     * 
     * @param targetDate 日期時間
     * @param options 
     */
    public CountdownToDate(targetDate: Date, options?: ICountdownOptions): void {
        const targetTimeMs: number = targetDate.getTime()
        this.m_userCallbacks = options ?? null
        this.SetTargetTime(targetTimeMs)
    }

    /**
     * 倒數至 Protobuf Timestamp
     * @param timestamp Protobuf Timestamp 物件
     * @param options 可選參數，包含 onUpdate 和 onComplete 回調
     * 
     * @example
     * ```typescript
     * // 倒數至 Protobuf Timestamp
     * const timestamp = { seconds: 1703980799n, nanos: 0 }
     * countdownLabel.CountdownToTimestamp(timestamp, {
     *     onUpdate: (remainingSeconds) => {
     *         console.log(`剩餘 ${remainingSeconds} 秒`)
     *     },
     *     onComplete: () => {
     *         console.log("倒計時完成！")
     *     }
     * })
     * ```
     */
    public CountdownToTimestamp(timestamp: Timestamp, options?: ICountdownOptions): void {
        // 將 Protobuf Timestamp 轉換為 Date 對象
        const targetDate: Date = TimeConverter.TimestampToDate(timestamp)
        const targetTimeMs: number = targetDate.getTime()
        this.m_userCallbacks = options ?? null
        this.SetTargetTime(targetTimeMs)
    }

    /**
     * 設置剩餘秒數
     * @param remainingSeconds 剩餘秒數
     * @deprecated 請使用 CountdownSeconds 方法
     */
    public SetRemainingSeconds(remainingSeconds: number): void {
        this.CountdownSeconds(remainingSeconds)
    }

    /**
     * 清除倒計時
     */
    public Clear(): void {
        this.m_targetTimeMs = 0
        this.m_isCompleted = false
        this.m_userCallbacks = null
        this.UnregisterCountdown()
        this.UpdateDisplay()
    }

    /**
     * 取得剩餘秒數
     */
    public GetRemainingSeconds(): number {
        if (this.m_targetTimeMs <= 0) {
            return 0
        }
        return this.m_timeManager.GetRemainingSeconds(this.m_targetTimeMs)
    }

    //================================================================
    // 內部方法
    //================================================================

    /**
     * 註冊倒計時
     */
    private RegisterCountdown(): void {
        if (this.m_targetTimeMs <= 0) {
            return
        }

        this.m_countdownId = this.m_timeManager.RegisterCountdown(this.m_targetTimeMs, {
            onUpdate: this.OnCountdownUpdate.bind(this),
            onComplete: this.OnCountdownComplete.bind(this)
        })
    }

    /**
     * 取消註冊倒計時
     */
    private UnregisterCountdown(): void {
        if (this.m_countdownId) {
            this.m_timeManager.RemoveCountdown(this.m_countdownId)
            this.m_countdownId = null
        }
    }

    /**
     * 倒計時更新回調
     */
    private OnCountdownUpdate(remainingSeconds: number): void {
        this.UpdateDisplay()

        // 呼叫用戶提供的 onUpdate 回調
        if (this.m_userCallbacks?.onUpdate) {
            this.m_userCallbacks.onUpdate(remainingSeconds)
        }
    }

    /**
     * 倒計時完成回調
     */
    private OnCountdownComplete(): void {
        this.m_isCompleted = true
        this.UpdateDisplay()

        // 呼叫用戶提供的 onComplete 回調
        if (this.m_userCallbacks?.onComplete) {
            this.m_userCallbacks.onComplete()
        }
    }

    /**
     * 更新顯示
     */
    private UpdateDisplay(): void {
        if (!isValid(this.Label, true)) {
            return
        }

        let displayText: string = ""

        if (this.m_isCompleted) {
            // 已完成
            displayText = this.m_completedText
        } else if (this.m_targetTimeMs <= 0) {
            // 未设置目標時間
            displayText = this.m_completedText
        } else {
            // 計算剩餘時間
            const remainingSeconds: number = this.GetRemainingSeconds()

            if (remainingSeconds <= 0) {
                displayText = this.m_completedText
            } else {
                // 根据顯示类型格式化
                switch (this.m_displayType) {
                    case CountdownDisplayType.HHMMSS:
                        displayText = this.FormatHHMMSS(remainingSeconds)
                        break
                    case CountdownDisplayType.SINGLE:
                        displayText = this.FormatSingle(remainingSeconds)
                        break
                    default:
                        displayText = this.FormatHHMMSS(remainingSeconds)
                        break
                }
            }
        }

        // 添加前缀和後缀
        this.Label.string = `${this.m_prefix}${displayText}${this.m_suffix}`
    }

    /**
     * 格式化為 HH:MM:SS
     */
    private FormatHHMMSS(seconds: number): string {
        return FormatTime.DurationHMS(seconds)
    }

    /**
     * 格式化為單一單位（自动选择最合适的單位）
     */
    private FormatSingle(seconds: number): string {
        const days: number = Math.floor(seconds / 86400)
        const hours: number = Math.floor(seconds / 3600)
        const minutes: number = Math.floor(seconds / 60)

        if (days > 0) {
            return `${days} 天`
        } else if (hours > 0) {
            return `${hours} 小時`
        } else if (minutes > 0) {
            return `${minutes} 分鐘`
        } else {
            return `${seconds} 秒`
        }
    }
}

