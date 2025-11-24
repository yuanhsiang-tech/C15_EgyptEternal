import { _decorator,  Node, Label, EditBox, Prefab, instantiate, log} from 'cc';
import { GodHandSetting } from './GodHandSetting';
import { GOD_HAND } from './GodHandDefine';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import { CommonSpinnerSpeedConfig } from '../../Common/SlotSpinner/Utility/CommonSpinnerSpeedConfig';
const { ccclass, property } = _decorator;

@ccclass('GodHandReelSetting')
export class GodHandReelSetting extends GodHandSetting {

    @property({ type: Prefab, displayName: "Cell Prefab" })
    private m_cellPrefab: Prefab = null; // 用於生成子項節點的 Prefab

    /** 初始輪帶配置 */
    private m_initialReelSettings: CommonSpinnerSpeedConfig = null;

    /** 欄位名稱與描述對應表 */
    private m_reelFieldDescriptions: Record<string, string> = {};


    protected onLoad(): void {
        super.onLoad && super.onLoad();
    }

    protected onDisable(): void {
        super.onDisable && super.onDisable();
    }

    protected onEnable(): void {
        super.onEnable && super.onEnable();
        EventDispatcher.Shared.Dispatch(GOD_HAND.RESET_SHOW);
        EventDispatcher.Shared.Dispatch(GOD_HAND.CONFIRM_SHOW);
    }

    protected onDestroy(): void {
        super.onDestroy && super.onDestroy();
    }

    /** 確認更新配置並分發事件 */
    public ConfirmSettings(): void {
        const updatedReelSettings = this.GetUpdatedReelSettings();
        EventDispatcher.Shared.Dispatch(GOD_HAND.REEL_UPDATE, updatedReelSettings);
    }

    /** 重設當前頁面為預設值 */
    public ResetPageSettings(): void {
        this.UpdateReelSettings(this.m_initialReelSettings);
        EventDispatcher.Shared.Dispatch(GOD_HAND.REEL_UPDATE, null);
    }

    /** 初始化設定頁面 */
    public Init( pageIndex: number, title: string = null): void {
        super.Init && super.Init(pageIndex, title);
    }

    /** 重設當前頁面為預設值 */
    public OnReelSettings(config: CommonSpinnerSpeedConfig ): void {
        this.defineReelFieldDescriptions();
        this.m_initialReelSettings = config;

        this.UpdateReelSettings(this.m_initialReelSettings);
    }


    /** 定義欄位名稱與對應的描述文字 */
    private defineReelFieldDescriptions(): void {
        this.m_reelFieldDescriptions = {
            m_beginInterval: "每輪間啟動間隔 (秒)",
            m_chargeDist: "拉回距離 (像素)",
            m_chargeTime: "拉回時間 (秒)",
            m_moveSpeed: "移動速度 (像素/秒)",
            m_stopTriggerTime: "自動觸發停輪時間 (秒)",
            m_endedDelay: "停輪延遲 (秒)",
            m_endedInterval: "每輪間停輪間隔 (秒)",
            m_nearWinSpeed: "Near Win 速度 (像素/秒)",
            m_nearWinTime: "Near Win 持續時間 (秒)",
            m_stopSpeed: "觸發停輪後速度 (像素/秒)",
            m_stopMode: "停輪模式",
            m_reboundDist: "回彈距離 (像素)",
            m_reboundTime: "回彈時間 (秒)",
            m_hardStopSpeed: "強停速度 (像素/秒)",
            m_hardReboundDist: "強停回彈距離 (像素)",
            m_hardReboundTime: "強停回彈時間 (秒)"
        };
    }

    /** 更新頁面上的輪帶設置 */
    private UpdateReelSettings(reelSettings: CommonSpinnerSpeedConfig): void {
        log("[GodHandReelSetting] Updating reel settings:", reelSettings);

        for (const key in this.m_reelFieldDescriptions) {
            if (reelSettings.hasOwnProperty(key)) {
                this.CreateOrUpdateCell(this.m_reelFieldDescriptions[key], reelSettings[key], key);
            }
        }
    }

    /** 創建或更新單個設置項目節點 */
    private CreateOrUpdateCell(displayName: string, value: number, fieldKey: string): void {
        let cellNode: Node = NodeUtils.GetUI(this.m_contentNode, fieldKey);

        // 如果節點不存在，則實例化一個新的節點
        if (!cellNode) {
            cellNode = instantiate(this.m_cellPrefab);
            cellNode.name = fieldKey;
            this.m_contentNode.addChild(cellNode);
        }

        // 更新欄位名稱
        const nameLabel = NodeUtils.GetUI(cellNode, "ItemName").getComponent(Label);
        nameLabel.string = displayName;

        // 更新輸入框內容
        const editBox = NodeUtils.GetUI(cellNode, "EditBox").getComponent(EditBox);
        editBox.string = value.toString();
    }

    /** 獲取用戶更新後的輪帶配置 */
    private GetUpdatedReelSettings(): CommonSpinnerSpeedConfig {
        const updatedSettings: CommonSpinnerSpeedConfig = this.m_initialReelSettings.Clone();

        for (const key in this.m_reelFieldDescriptions) {
            const cellNode: Node = NodeUtils.GetUI(this.m_contentNode, key);
            const editBox = NodeUtils.GetUI(cellNode, "EditBox").getComponent(EditBox);
            updatedSettings[key] = Number(editBox.string);
        }
        log("[GodHandReelSetting] Updated settings:", updatedSettings);
        return updatedSettings;
    }

}
