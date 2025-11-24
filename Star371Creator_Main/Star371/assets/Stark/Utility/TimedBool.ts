import { game } from "cc"

const DEFAULT_DURATION: number = 10 // 預設10秒

/**
 * 時間布爾計時器元件
 * 提供基於時間的布爾值檢查功能
 * 可以設定倒數時間，並檢查是否已到期
 */
export class TimedBool {
    private m_startTime: number = 0
    private m_duration: number = DEFAULT_DURATION   // 毫秒
    private m_isExpired: boolean = false
    private m_isRunning: boolean = false

    /**
     * 構造函數
     * @param defaultTime 預設時間（秒)
     */
    constructor(defaultTime: number = DEFAULT_DURATION) {
        if (typeof defaultTime === 'number' && defaultTime > 0) {
            this.m_duration = defaultTime * 1000;
        }
    }

    /**
     * 開始倒數計時
     * @param time 倒數時間（秒)
     */
    public Start(time?: number): void {
        if (typeof time === 'number' && time > 0) {
            this.m_duration = time * 1000;
        }
        
        this.m_startTime = game.totalTime;
        this.m_isExpired = false
        this.m_isRunning = true
    }

    /**
     * 判斷時間是否已到期
     * @returns 如果時間已到期返回 true，否則返回 false
     */
    public ToBool(): boolean {
        if (!this.m_isRunning) {
            return this.m_isExpired
        }

        const currentTime = game.totalTime;
        const elapsedTime = currentTime - this.m_startTime
        if (elapsedTime >= this.m_duration) {
            this.m_isExpired = true
            this.m_isRunning = false
            return true
        }

        return false
    }

    /**
     * 重新開始計時
     * 使用上一次設定的時間重新開始倒數
     */
    public Restart(): void {
        this.m_startTime = game.totalTime
        this.m_isExpired = false
        this.m_isRunning = true
    }

    /**
     * 檢查是否到期，如果到期則返回 true 並重新開始
     * @returns 如果時間已到期返回 true，否則返回 false
     */
    public TakeAndRestart(): boolean {
        const isExpired = this.ToBool()
        if (isExpired) {
            this.Restart()
            return true
        }
        return false
    }

    /**
     * 立即讓時間過期
     */
    public ExpireNow(): void {
        this.m_isExpired = true
        this.m_isRunning = false
    }

    /**
     * 清除計時器，重置所有狀態
     * 將計時器恢復到初始狀態
     */
    public Clear(): void {
        this.m_startTime = 0
        this.m_duration = DEFAULT_DURATION
        this.m_isExpired = false
        this.m_isRunning = false
    }

    /**
     * 獲取剩餘時間（秒）
     * @returns 剩餘時間，如果已過期則返回 0
     */
    public GetRemainingTime(): number {
        if (!this.m_isRunning || this.m_isExpired) {
            return 0
        }

        const currentTime = game.totalTime
        const elapsedTime = currentTime - this.m_startTime
        const remainingTime = (this.m_duration - elapsedTime) / 1000
        return Math.max(0, remainingTime)
    }

    /**
     * 檢查計時器是否正在運行
     * @returns 如果計時器正在運行返回 true，否則返回 false
     */
    public IsRunning(): boolean {
        return this.m_isRunning && !this.m_isExpired
    }

    /**
     * 獲取設定的持續時間
     * @returns 設定的持續時間（秒）
     */
    public GetDuration(): number {
        return this.m_duration / 1000;
    }

    /**
     * 獲取已經過的時間（秒）
     * @returns 已經過的時間，如果未開始則返回 0
     */
    public GetElapsedTime(): number {
        if (!this.m_isRunning && !this.m_isExpired) {
            return 0
        }

        const currentTime = game.totalTime
        const elapsedTime = (currentTime - this.m_startTime) / 1000
        return Math.min(elapsedTime, this.m_duration)
    }

    /**
     * 設定是否使用 DT 模式
     * @param value true 表示使用 DT 模式，false 表示使用一般模式
     * @deprecated 不需要再指定是否使用 DT 模試
     */
    public UseDT(value: boolean): void {
    }

    /**
     * 更新 DT 時間（僅在 DT 模式下有效）
     * @param dt Delta Time，以秒為單位
     * @deprecated 不需要再自行呼叫 Update
     */
    public Update(dt: number): void {
    }
} 