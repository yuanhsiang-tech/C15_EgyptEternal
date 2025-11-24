import { _decorator, EventTouch, Label, Node } from 'cc';
import Touchable from '../../../Stark/Interactive/Touchable';
const { ccclass, property } = _decorator;

@ccclass('Tab')
export class Tab extends Touchable {
    private m_cancel:boolean;

    @property({
        type: Label,
        displayName: 'Title',
        tooltip: '頁籤標題，非必要'
    })
    private m_title:Label;

    @property({
        type: Node,
        displayName: 'Selected',
        tooltip: '選取狀態的節點'
    })
    private m_selected:Node;

    protected onLoad(): void {
        this.m_cancel = false;
    }

    /**
     * 設定頁籤
     * @param index 索引
     * @param title 標題文字
     */
    public Setup(index:number, title?:string): void {
        if (title && this.m_title) {
            this.m_title.string = title;
        }
    }

    /**
     * 選取頁籤的處理
     */
    public Select(): void {
        if (this.m_selected) {
            this.m_selected.active = true;
        }
    }

    /**
     * 取消選取頁籤的處理
     */
    public Deselect(): void {
        if (this.m_selected) {
            this.m_selected.active = false;
        }
    }

    /** 事件: TouchableEvent.Cancel */
    protected override OnTouchCancel(event: EventTouch): void {
        super.OnTouchCancel(event);
        this.m_cancel = true;
    }

    /** 事件: TouchableEvent.Release */
    protected override OnTouchRelease(event: EventTouch) {
        super.OnTouchRelease(event);
        if (!this.m_cancel) {
            this.Select();
        }
        this.m_cancel = false;
    }
}


