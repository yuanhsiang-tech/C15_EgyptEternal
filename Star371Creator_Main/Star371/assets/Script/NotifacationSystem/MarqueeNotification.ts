import { log } from "cc"
import { NotificationBase } from "./NotificationBase"
import { GlobalFunc }from "../Global/GlobalFunc"

/**
 * 跑馬燈通知數據
 */
export interface MarqueeData {
    message: string      // 通知消息
    duration?: number    // 顯示時長（毫秒）
    speed?: number       // 滾動速度
    // 可以根據需要添加更多字段
}

/**
 * 跑馬燈通知
 * 用於顯示滾動的跑馬燈消息
 */
export class MarqueeNotification extends NotificationBase<MarqueeData> {
    private m_displayTimer: any = null

    constructor(data: MarqueeData) {
        super(data)
    }

    /**
     * 顯示跑馬燈
     */
    public Show(): void {
        if (this.m_isShowing) {
            return
        }

        this._setShowing(true)

        log(`[Marquee] 顯示跑馬燈: ${this.m_data.message}`)

        // TODO: 實現實際的跑馬燈顯示邏輯
        // 這裡只是示例，實際需要操作UI節點

        // 設置預設顯示時長
        const duration = this.m_data.duration || 5000

        // 模擬顯示完成
        this.m_displayTimer = GlobalFunc.SetTimeOut(() => {
            this.Hide()
        }, duration)
    }

    /**
     * 隱藏跑馬燈
     */
    public Hide(): void {
        if (!this.m_isShowing) {
            return
        }

        log(`[Marquee] 隱藏跑馬燈`)

        // 清除定時器
        if (this.m_displayTimer) {
            clearTimeout(this.m_displayTimer)
            this.m_displayTimer = null
        }

        // TODO: 實現實際的跑馬燈隱藏邏輯

        this._complete()
    }
}

