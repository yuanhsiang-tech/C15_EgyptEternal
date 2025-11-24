import { INotification } from "./INotification"

/**
 * 通知佇列
 * 管理通知的排隊和顯示
 */
export class NotificationQueue<T extends INotification = INotification> {
    private m_queue: T[] = []
    private m_currentNotification: T | null = null
    private m_isProcessing: boolean = false

    /**
     * 將通知推入佇列
     * @param notification 通知實例
     */
    public Push(notification: T): void {
        this.m_queue.push(notification)

        // 如果目前沒有正在處理的通知，開始處理佇列
        if (!this.m_isProcessing) {
            this._processNext()
        }
    }

    /**
     * 處理下一個通知
     */
    private _processNext(): void {
        // 如果佇列為空，停止處理
        this.m_currentNotification = null
        if (this.m_queue.length === 0) {
            this.m_isProcessing = false
            return
        }

        this.m_isProcessing = true

        // 從佇列中取出下一個通知
        const notification = this.m_queue.shift()
        if (!notification) {
            this.m_isProcessing = false
            return
        }

        this.m_currentNotification = notification

        // 設置完成回調
        notification.onComplete = this._onNotificationComplete.bind(this)

        // 顯示通知
        notification.Show()
    }

    /**
     * 目前通知完成時的回調
     */
    private _onNotificationComplete(): void {
        this.m_currentNotification = null

        // 繼續處理下一個通知
        this._processNext()
    }

    /**
     * 取得目前正在顯示的通知
     */
    public GetCurrentNotification(): T | null {
        return this.m_currentNotification
    }

    /**
     * 取得佇列中等待的通知數量
     */
    public GetQueueLength(): number {
        return this.m_queue.length
    }

    /**
     * 清空佇列
     */
    public Clear(): void {
        this.m_queue = []

        // 如果有正在顯示的通知，隱藏它
        if (this.m_currentNotification) {
            this.m_currentNotification.Hide()
            this.m_currentNotification = null
        }

        this.m_isProcessing = false
    }

    /**
     * 是否正在處理通知
     */
    public IsProcessing(): boolean {
        return this.m_isProcessing
    }

    /**
     * 手動觸發處理隊列
     * 用於 polling 系統確保隊列得到處理
     */
    public TriggerProcess(): void {
        // 如果目前沒有正在處理的通知且佇列不為空，開始處理
        if (!this.m_isProcessing && this.m_queue.length > 0) {
            this._processNext()
        }
    }
}

