import { _decorator, Component, easing, Node, tween, v3, Vec3, view } from 'cc';
import { SyncNode } from '../../../Stark/SyncNode/SyncNode';
import { EventDefine } from '../../../Script/Define/EventDefine';
import { UIButtonItem } from '../../../Script/UISystem/UIButtonItem';
import { EventDispatcher } from '../../../Stark/Utility/EventDispatcher';
import { ViewBase } from '../../../Script/ViewManage/Foundation/ViewBase';
import Touchable, { TouchableEvent } from '../../../Stark/Interactive/Touchable';
const { ccclass, property } = _decorator;

// 滑入動畫時間
const SLIDE_IN_DURATION:number = 0.4;
// 滑出動畫時間
const SLIDE_OUT_DURATION:number = 0.18;

@ccclass('MoreSettingView')
export class MoreSettingView extends ViewBase {
    private m_invisiblePos:Vec3;
    private m_isDismissing:boolean;

    @property({
        type: Node,
        displayName: 'Target',
        tooltip: "目標位置",
    })
    private m_target: Node = null;

    @property({
        type: Node,
        displayName: 'Container',
        tooltip: "內容容器",
    })
    private m_container: Node = null;

    protected override onLoad(): void {
        super.onLoad?.();

        // 點擊空白處關閉
        this.getComponent(Touchable).On(TouchableEvent.Clicked, this.Dismiss, this);

        // 畫面外起始位置
        this.m_invisiblePos = v3(view.getDesignResolutionSize().width, 0, 0);
    }

    protected override onEnable(): void {
        super.onEnable?.();
        EventDispatcher.Shared.On(EventDefine.System.UI_ITEM_EVENT_CLICKED, this.OnItemClicked, this);
    }

    protected override onDisable(): void {
        super.onDisable?.();
        EventDispatcher.Shared.Off(EventDefine.System.UI_ITEM_EVENT_CLICKED, this.OnItemClicked, this);
    }

    protected override OnAwake(reused: boolean) {
        super.OnAwake?.(reused);
        this.m_isDismissing = false;
        this.m_container.setPosition(this.m_invisiblePos);
        this.Present();
    }

    protected override Present(): boolean {
        tween(this.m_container)
            .to(SLIDE_IN_DURATION, { position: this.m_target.position }, { easing: easing.backOut })
            .start();
        return super.Present();
    }

    /**
     * 關閉介面
     */
    public override Dismiss(): void {
        if (this.m_isDismissing) return;
        
        this.m_isDismissing = true;
        tween(this.m_container)
            .to(SLIDE_OUT_DURATION, { position: this.m_invisiblePos }, { easing: easing.circIn })
            .call(()=>super.Dismiss())
            .start();
    }

    /**
     * 介面項目點擊事件
     * @param item 被點擊的項目
     */
    private OnItemClicked(item:UIButtonItem) {
        if (item.node.parent?.parent == this.m_container) {
            // [確認點擊到子項目] => 關閉介面
            this.Dismiss();
        }
    }
}


