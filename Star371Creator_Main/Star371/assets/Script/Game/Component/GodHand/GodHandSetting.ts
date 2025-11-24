import { _decorator, Component, Node, Label, log, v3, UITransform } from 'cc';
import { Device } from '../../../Device/Device';
import { GOD_HAND } from './GodHandDefine';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import { GameApp } from '../../../App/GameApp';
const { ccclass, property } = _decorator;

@ccclass('GodHandSetting')
export class GodHandSetting extends Component {

    /** 儲存所有生成的內容節點 */
    protected m_contentNode: Node = null;

    /** 標題的 Label */
    protected m_titleLabel: Label = null;

    protected m_scrollViewNode: Node = null;

    protected m_viewNode: Node = null;

    /** 當前頁數  */
    private m_currentPageIndex: number = 0;

    private m_title: string = ""

    protected onLoad(): void {
        log("[GodHandSetting][onLoad] title:", this.m_title)
        this.m_contentNode = NodeUtils.GetUI(this.node, "content")
        this.m_titleLabel = NodeUtils.GetUI(this.node, "Title").getComponent(Label)
        this.m_scrollViewNode = NodeUtils.GetUI(this.node, "ScrollView")
        this.m_viewNode = NodeUtils.GetUI(this.node, "View")

        // 位置設定
        this.SetUITransform(this.node)
        this.SetUITransform(this.m_scrollViewNode)
        this.SetPosition(this.m_scrollViewNode)
    }

    protected onDisable(): void {
        log("[GodHandSetting][onDisable] title:", this.m_title)
        // 移除事件監聽
        EventDispatcher.Shared.Off(GOD_HAND.RESET, this.ResetPageSettings, this);
        EventDispatcher.Shared.Off(GOD_HAND.CONFIRM, this.ConfirmSettings, this);
    }

    protected onEnable(): void {
        log("[GodHandSetting][onEnable] title:", this.m_title)
        // 添加事件監聽
        EventDispatcher.Shared.On(GOD_HAND.RESET, this.ResetPageSettings, this);
        EventDispatcher.Shared.On(GOD_HAND.CONFIRM, this.ConfirmSettings, this);
    }

    protected onDestroy(): void {
        log("[GodHandSetting][onDestroy] title:", this.m_title)
    }

    /** 確認更新配置並分發事件 */
    protected ConfirmSettings(): void {
        log("[GodHandSetting][ConfirmSettings] pageIndex:", this.m_currentPageIndex)
    }

    /** 重設當前頁面為預設值 */
    protected ResetPageSettings(): void {
        log("[GodHandSetting][ResetPageSettings] pageIndex:", this.m_currentPageIndex)
    }

    /** 初始化設定頁面 */
    public Init(pageIndex: number, title: string = null): void {
        this.m_currentPageIndex = pageIndex;
        if (title) {
            this.m_title = title
            this.m_titleLabel.string = this.m_title;
        }
        log("[GodHandSetting][Init] pageIndex :", pageIndex, " title:", this.m_titleLabel.string)
    }

    private SetUITransform(node: Node) {
        let uITransform: UITransform = node.getComponent(UITransform)
        if (GameApp.Shared.StageManager.Current.Orientation == Device.Orientation.PORTRAIT) {
            uITransform.setContentSize(GOD_HAND.PORTRAIT_SIZE, uITransform.height)
        }
    }

    private SetPosition(node: Node) {
        if (GameApp.Shared.StageManager.Current.Orientation == Device.Orientation.PORTRAIT) {
            let pos = node.getPosition()
            node.setPosition(v3(GOD_HAND.PORTRAIT_SIZE / 2, pos.y, 0))
        }
    }
}
