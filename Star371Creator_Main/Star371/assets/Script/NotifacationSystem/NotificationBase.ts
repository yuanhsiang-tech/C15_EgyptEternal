import { INotification } from "./INotification"

/**
 * 通知基類
 * 提供通知的基本功能實現
 */
export abstract class NotificationBase<T = any> implements INotification<T> {
    protected m_data: T
    protected m_isShowing: boolean = false
    public onComplete?: () => void

    constructor(data: T) {
        this.m_data = data
    }

    public get data(): T {
        return this.m_data
    }

    public set data(value: T) {
        this.m_data = value
    }

    /**
     * 顯示通知
     * 子類需要實現具體的顯示邏輯
     */
    public abstract Show(): void

    /**
     * 隱藏通知
     * 子類需要實現具體的隱藏邏輯
     */
    public abstract Hide(): void

    /**
     * 是否正在顯示
     */
    public IsShowing(): boolean {
        return this.m_isShowing
    }

    /**
     * 標記為顯示狀態
     */
    protected _setShowing(showing: boolean): void {
        this.m_isShowing = showing
    }

    /**
     * 完成通知
     * 呼叫回調並清理狀態
     */
    protected _complete(): void {
        this.m_isShowing = false
        if (this.onComplete) {
            this.onComplete()
        }
    }
}

