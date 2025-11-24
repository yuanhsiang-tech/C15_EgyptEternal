/**
 * 通知接口
 * 所有通知類型的基礎接口
 */
export interface INotification<T = any> {
    /**
     * 通知數據
     */
    data: T

    /**
     * 顯示通知
     */
    Show(): void

    /**
     * 隱藏通知
     */
    Hide(): void

    /**
     * 是否正在顯示
     */
    IsShowing(): boolean

    /**
     * 通知顯示完成的回調
     */
    onComplete?: () => void
}

/**
 * 通知類型枚舉
 */
export enum NotificationType {
    Marquee = "Marquee",       // 跑馬燈
    Yuruyi = "Yuruyi",         // 玉如意
    BigPrize = "BigPrize",     // 大獎快訊
    ALL = "ALL",
}

