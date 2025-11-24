import { log } from "cc"
import { NotificationBase } from "./NotificationBase"
import { GlobalFunc }from "../Global/GlobalFunc"

/**
 * 大獎快訊通知數據
 */
export interface BigPrizeData {
    playerName: string      // 玩家名稱
    prizeName: string       // 獎品名稱
    prizeAmount: number     // 獎品金額/數量
    gameName?: string       // 遊戲名稱
    avatarPath?: string     // 玩家頭像路徑
    // 可以根據需要添加更多字段
}

/**
 * 大獎快訊通知
 * 用於顯示玩家獲得大獎的通知，通常位於畫面右上角
 */
export class BigPrizeNotification extends NotificationBase<BigPrizeData> {
    private m_displayTimer: any = null

    constructor(data: BigPrizeData) {
        super(data)
    }

    /**
     * 顯示大獎快訊
     */
    public Show(): void {
        if (this.m_isShowing) {
            return
        }

        this._setShowing(true)

        log(`[BigPrize] 顯示大獎快訊: ${this.m_data.playerName} 獲得 ${this.m_data.prizeName} x${this.m_data.prizeAmount}`)

        // TODO: 實現實際的大獎快訊顯示邏輯
        // 這裡只是示例，實際需要操作UI節點

        // 預設顯示4秒
        const duration = 4000

        // 模擬顯示完成
        this.m_displayTimer = GlobalFunc.SetTimeOut(() => {
            this.Hide()
        }, duration)
    }

    /**
     * 隱藏大獎快訊
     */
    public Hide(): void {
        if (!this.m_isShowing) {
            return
        }

        log(`[BigPrize] 隱藏大獎快訊`)

        // 清除定時器
        if (this.m_displayTimer) {
            clearTimeout(this.m_displayTimer)
            this.m_displayTimer = null
        }

        // TODO: 實現實際的大獎快訊隱藏邏輯

        this._complete()
    }
}

