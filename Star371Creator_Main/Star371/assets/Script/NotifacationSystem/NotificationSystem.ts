import { NotificationQueue } from "./NotificationQueue"
import { MarqueeNotification, MarqueeData } from "./MarqueeNotification"
import { YuruyiNotification, YuruyiNotificationView } from "./YuruyiNotification"
import { YuruyiData } from "./YuruyiDefine"
import { BigPrizeNotification, BigPrizeData } from "./BigPrizeNotification"
import { NotificationType } from "./INotification"
import { StarkScheduler } from "../../Stark/Scheduler/StarkScheduler"
import { log, warn } from "cc"

/**
 * 通知系統
 * 統一管理所有類型的通知
 */
export class NotificationSystem {
    private static s_instance: NotificationSystem = null

    // 三個獨立的通知佇列
    private m_marqueeQueue: NotificationQueue<MarqueeNotification>
    private m_yuruyiQueue: NotificationQueue<YuruyiNotification>
    private m_bigPrizeQueue: NotificationQueue<BigPrizeNotification>

    // Polling 控制標誌
    private m_marqueeEnabled: boolean = true
    private m_yuruyiEnabled: boolean = true
    private m_bigPrizeEnabled: boolean = true

    // 視圖實例引用
    private m_yuruyiViewInstance: YuruyiNotificationView = null

    // Polling 調度鍵
    private static readonly POLLING_SCHEDULER_KEY: string = "NotificationSystemPolling"

    private constructor() {
        this.m_marqueeQueue = new NotificationQueue<MarqueeNotification>()
        this.m_yuruyiQueue = new NotificationQueue<YuruyiNotification>()
        this.m_bigPrizeQueue = new NotificationQueue<BigPrizeNotification>()

        // 啟動定時 polling
        this._startPolling()
    }

    /**
     * 取得單例實例
     */
    public static GetInstance(): NotificationSystem {
        if (!NotificationSystem.s_instance) {
            NotificationSystem.s_instance = new NotificationSystem()
        }
        return NotificationSystem.s_instance
    }

    /**
     * 推送跑馬燈通知
     * @param data 跑馬燈數據
     */
    public static PushMarquee(data: MarqueeData): void {
        const instance = NotificationSystem.GetInstance()
        const notification = new MarqueeNotification(data)
        instance.m_marqueeQueue.Push(notification)
        log(`[NotificationSystem] 推送跑馬燈通知，佇列長度: ${instance.m_marqueeQueue.GetQueueLength()}`)
    }

    /**
     * 推送玉如意通知
     * @param data 玉如意數據
     */
    public static PushYuruyi(data: YuruyiData): void {
        const instance = NotificationSystem.GetInstance()
        const notification = new YuruyiNotification(data)
        instance.m_yuruyiQueue.Push(notification)
        log(`[NotificationSystem] 推送玉如意通知，佇列長度: ${instance.m_yuruyiQueue.GetQueueLength()}`)
    }

    /**
     * 推送大獎快訊通知
     * @param data 大獎快訊數據
     */
    public static PushBigPrize(data: BigPrizeData): void {
        const instance = NotificationSystem.GetInstance()
        const notification = new BigPrizeNotification(data)
        instance.m_bigPrizeQueue.Push(notification)
        log(`[NotificationSystem] 推送大獎快訊通知，佇列長度: ${instance.m_bigPrizeQueue.GetQueueLength()}`)
    }

    /**
     * 統一的Push接口
     * 根據通知類型自動路由到對應的佇列
     * @param type 通知類型
     * @param data 通知數據
     */
    public static Push(type: NotificationType, data: MarqueeData | YuruyiData | BigPrizeData): void {
        switch (type) {
            case NotificationType.Marquee:
                NotificationSystem.PushMarquee(data as MarqueeData)
                break
            case NotificationType.Yuruyi:
                NotificationSystem.PushYuruyi(data as YuruyiData)
                break
            case NotificationType.BigPrize:
                NotificationSystem.PushBigPrize(data as BigPrizeData)
                break
            default:
                warn(`[NotificationSystem] 未知的通知類型: ${type}`)
        }
    }

    /**
     * 清空指定類型的通知佇列
     * @param type 通知類型
     */
    public static Clear(type: NotificationType): void {
        const instance = NotificationSystem.GetInstance()
        switch (type) {
            case NotificationType.Marquee:
                instance.m_marqueeQueue.Clear()
                break
            case NotificationType.Yuruyi:
                instance.m_yuruyiQueue.Clear()
                break
            case NotificationType.BigPrize:
                instance.m_bigPrizeQueue.Clear()
                break
        }
    }

    /**
     * 清空所有通知佇列
     */
    public static ClearAll(): void {
        const instance = NotificationSystem.GetInstance()
        instance.m_marqueeQueue.Clear()
        instance.m_yuruyiQueue.Clear()
        instance.m_bigPrizeQueue.Clear()
    }

    /**
     * 取得指定類型佇列的長度
     * @param type 通知類型
     */
    public static GetQueueLength(type: NotificationType): number {
        const instance = NotificationSystem.GetInstance()
        switch (type) {
            case NotificationType.Marquee:
                return instance.m_marqueeQueue.GetQueueLength()
            case NotificationType.Yuruyi:
                return instance.m_yuruyiQueue.GetQueueLength()
            case NotificationType.BigPrize:
                return instance.m_bigPrizeQueue.GetQueueLength()
            default:
                return 0
        }
    }

    /**
     * 取得指定類型佇列是否正在處理通知
     * @param type 通知類型
     */
    public static IsProcessing(type: NotificationType): boolean {
        const instance = NotificationSystem.GetInstance()
        switch (type) {
            case NotificationType.Marquee:
                return instance.m_marqueeQueue.IsProcessing()
            case NotificationType.Yuruyi:
                return instance.m_yuruyiQueue.IsProcessing()
            case NotificationType.BigPrize:
                return instance.m_bigPrizeQueue.IsProcessing()
            default:
                return false
        }
    }

    /**
     * Polling 功能實現
     * 定時檢查並處理各類型通知隊列
     */
    public static Polling(type: NotificationType = NotificationType.ALL): void {
        const instance = NotificationSystem.GetInstance()
        instance._processPolling(type)
    }

    /**
     * 內部 Polling 處理邏輯
     */
    private _processPolling(type: NotificationType): void {
        // 處理跑馬燈隊列
        if ((type === NotificationType.ALL || type === NotificationType.Marquee) && this.m_marqueeEnabled) {
            if (!this.m_marqueeQueue.IsProcessing() && this.m_marqueeQueue.GetQueueLength() > 0) {
                log(`[NotificationSystem] Processing marquee queue, length: ${this.m_marqueeQueue.GetQueueLength()}`)
                this.m_marqueeQueue.TriggerProcess()
            }
        }

        // 處理玉如意隊列
        if ((type === NotificationType.ALL || type === NotificationType.Yuruyi) && this.m_yuruyiEnabled) {
            if (!this.m_yuruyiQueue.IsProcessing() && this.m_yuruyiQueue.GetQueueLength() > 0) {
                log(`[NotificationSystem] Processing yuruyi queue, length: ${this.m_yuruyiQueue.GetQueueLength()}`)
                this.m_yuruyiQueue.TriggerProcess()
            }
        }

        // 處理大獎快訊隊列
        if ((type === NotificationType.ALL || type === NotificationType.BigPrize) && this.m_bigPrizeEnabled) {
            if (!this.m_bigPrizeQueue.IsProcessing() && this.m_bigPrizeQueue.GetQueueLength() > 0) {
                log(`[NotificationSystem] Processing big prize queue, length: ${this.m_bigPrizeQueue.GetQueueLength()}`)
                this.m_bigPrizeQueue.TriggerProcess()
            }
        }
    }

    /**
     * 啟動定時 Polling
     */
    private _startPolling(): void {
        StarkScheduler.Schedule(
            NotificationSystem.POLLING_SCHEDULER_KEY,
            () => {
                this._processPolling(NotificationType.ALL)
            },
            {
                priority: 0,
                interval: 1.0, // 1秒間隔
                isSelfHandle: false
            }
        )
        log(`[NotificationSystem] Polling started with 1 second interval`)
    }

    /**
     * 停止定時 Polling
     */
    public static StopPolling(): void {
        StarkScheduler.Unschedule(NotificationSystem.POLLING_SCHEDULER_KEY)
        log(`[NotificationSystem] Polling stopped`)
    }

    /**
     * 設置跑馬燈 polling 開關
     */
    public static SetMarqueeEnabled(enabled: boolean): void {
        const instance = NotificationSystem.GetInstance()
        instance.m_marqueeEnabled = enabled
        log(`[NotificationSystem] Marquee polling enabled: ${enabled}`)
    }

    /**
     * 設置玉如意 polling 開關
     */
    public static SetYuruyiEnabled(enabled: boolean): void {
        const instance = NotificationSystem.GetInstance()
        instance.m_yuruyiEnabled = enabled
        log(`[NotificationSystem] Yuruyi polling enabled: ${enabled}`)
    }

    /**
     * 設置大獎快訊 polling 開關
     */
    public static SetBigPrizeEnabled(enabled: boolean): void {
        const instance = NotificationSystem.GetInstance()
        instance.m_bigPrizeEnabled = enabled
        log(`[NotificationSystem] BigPrize polling enabled: ${enabled}`)
    }

    /**
     * 取得跑馬燈 polling 狀態
     */
    public static GetMarqueeEnabled(): boolean {
        const instance = NotificationSystem.GetInstance()
        return instance.m_marqueeEnabled
    }

    /**
     * 取得玉如意 polling 狀態
     */
    public static GetYuruyiEnabled(): boolean {
        const instance = NotificationSystem.GetInstance()
        return instance.m_yuruyiEnabled
    }

    /**
     * 取得大獎快訊 polling 狀態
     */
    public static GetBigPrizeEnabled(): boolean {
        const instance = NotificationSystem.GetInstance()
        return instance.m_bigPrizeEnabled
    }

    /**
     * 設置玉如意視圖實例引用
     */
    public static SetYuruyiViewInstance(instance: YuruyiNotificationView): void {
        const systemInstance = NotificationSystem.GetInstance()
        systemInstance.m_yuruyiViewInstance = instance
    }

    /**
     * 取得玉如意視圖實例
     */
    public static GetYuruyiViewInstance(): YuruyiNotificationView | null {
        const instance = NotificationSystem.GetInstance()
        return instance.m_yuruyiViewInstance
    }

    /**
     * 銷毀通知系統
     */
    public static Destroy(): void {
        if (NotificationSystem.s_instance) {
            NotificationSystem.StopPolling()
            NotificationSystem.s_instance = null
        }
    }
}

