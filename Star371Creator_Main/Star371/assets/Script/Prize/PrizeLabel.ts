import { _decorator, Component, Label, isValid, error } from "cc"
import { Prize } from "../Proto/gt2/prize/prize_pb"
import { PrizeManager } from "./PrizeManager"

const { ccclass, menu, requireComponent } = _decorator

@ccclass("PrizeLabel")
@menu("Prize/PrizeLabel")
@requireComponent(Label)
export class PrizeLabel extends Component {

    //================================================================
    // 內部變數
    //================================================================

    private m_prize: Prize = null
    private m_label: Label = null

    //================================================================
    // 屬性訪問器
    //================================================================

    /** 取得獎勵數據 */
    public get Prize(): Prize {
        return this.m_prize
    }

    /** 取得 Label 組件 */
    public get LabelComponent(): Label {
        return this.m_label
    }

    //================================================================
    // 生命週期
    //================================================================

    public onLoad(): void {
        super.onLoad?.()
        this.m_label = this.getComponent(Label)

        if (!isValid(this.m_label, true)) {
            error("[PrizeLabel] 未找到 Label 組件")
            return
        }
    }

    //================================================================
    // 公共方法
    //================================================================

    /**
     * 設置獎勵數據
     * @param prize 獎勵數據
     */
    public SetPrize(prize: Prize): void {
        this.m_prize = prize
        this.UpdatePrizeName()
    }

    /**
     * 更新獎勵名稱顯示
     */
    public UpdatePrizeName(): void {
        if (!isValid(this.m_label, true)) {
            error("[PrizeLabel] Label 組件無效")
            return
        }

        if (!this.m_prize) {
            this.m_label.string = ""
            return
        }

        // 從 PrizeManager 取得獎勵名稱
        const prizeName: string = PrizeManager.Instance.RetrievePrizeDataName(this.m_prize)
        this.m_label.string = prizeName
    }

    /**
     * 清除標籤內容
     */
    public Clear(): void {
        if (isValid(this.m_label, true)) {
            this.m_label.string = ""
        }
        this.m_prize = null
    }

    /**
     * 重新更新顯示
     */
    public Refresh(): void {
        this.UpdatePrizeName()
    }
}

