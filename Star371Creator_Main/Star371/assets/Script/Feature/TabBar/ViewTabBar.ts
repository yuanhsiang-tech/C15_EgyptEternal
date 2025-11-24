import { _decorator, Component, easing, Node, tween, v3, Vec3, view, Widget } from 'cc';
import { TabBarView, TabBarViewDelegate } from './TabBarView';
import { ResourcesViewElements, ViewDefine } from '../../Define/ViewDefine';
import { ViewElement } from '../../ViewManage/Foundation/ViewTypes';
import { ViewTabMaster } from '../../ViewManage/Foundation/ViewTabMaster';
const { ccclass, property } = _decorator;

const TITLE:Map<IViewEvent, string> = new Map([
    [ViewDefine.STAR_STAGE, "明星舞台"],
]);

// 滑入動畫時間
const SLIDE_IN_DURATION:number = 0.2;
// 滑出動畫時間
const SLIDE_OUT_DURATION:number = 0.18;

@ccclass('ViewTabBar')
export class ViewTabBar extends ViewTabMaster<TabBarView> implements TabBarViewDelegate {
    private m_invisiblePos:Vec3;
    private m_isDismissing:boolean;

    protected onLoad(): void {
        super.onLoad?.();
        this.m_invisiblePos = v3(view.getDesignResolutionSize().width, 0, 0);
    }

    /**
     * 介面(重新)進入場景
     * @param reused 是否為重複利用
     */
    protected override OnAwake(reused: boolean) {
        super.OnAwake?.(reused);
        this.m_isDismissing = false;
        this.TabBar.getComponentsInChildren(Widget).forEach(widget=>widget.updateAlignment());
        this.node.setPosition(this.m_invisiblePos);
    }

    /**
     * 是否為全畫面顯示
     */
    protected override IsFullPresent(): boolean {
        return true;
    }

    /**
     * 是否使用不透明遮黑顯示
     * 說明：預設會為每個介面背後加上一層不透明或半透明的黑色點擊阻擋，如需使用完全透明的點擊阻擋方式則只需回傳 false 即可
     */
    protected override OpaqueBlock(): boolean {
        return false;
    }

    /**
     * 介面準備完成，確認開始顯示
     */
    public override Present(): boolean {
        tween(this.node)
            .to(SLIDE_IN_DURATION, { position: Vec3.ZERO }, { easing: easing.circOut })
            .start();
        return super.Present?.();
    }

    /**
     * 按下返回鍵
     */
    public OnBackClicked(): void {
        this.Dismiss();
    }

    /**
     * 介面事件 Bundle 為 resources，須回傳對應的 ViewElement
     * @param event 介面事件
     */
    public OnViewSelectViewElement(event:IViewEvent): ViewElement {
        return ResourcesViewElements.get(event);
    }

    /**
     * 取得頁籤標題
     * @param tabBar 頁籤
     * @param index 頁籤索引
     */
    public override TabBarTitleForTab(tabBar: TabBarView, index: number): string {
        return TITLE.get(this.Tabs[index]);
    }

    /**
     * 關閉介面
     */
    public override Dismiss(): void {
        if (this.m_isDismissing) return;
        
        this.m_isDismissing = true;
        this.ResignFullPresent();
        tween(this.node)
            .to(SLIDE_OUT_DURATION, { position: this.m_invisiblePos }, { easing: easing.circIn })
            .call(()=>super.Dismiss())
            .start();
    }
}