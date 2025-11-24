import { _decorator, Node } from 'cc';
import { ViewBase } from './ViewBase';
import { IViewEvent, ViewStateDelegate } from './ViewTypes';
import { TabBar, TabBarDelegate } from '../TabBar/TabBar';
import { ViewSystem, ViewSystemDelegate } from './ViewSystem';
const { ccclass, property } = _decorator;

const VIEW_SECTION_ID:number = 0;

@ccclass('ViewTabMaster')
export class ViewTabMaster<Bar extends TabBar> extends ViewBase implements Partial<ViewStateDelegate>, TabBarDelegate {
    private m_system:ViewSystem;
    private m_systemDelegate:ViewSystemDelegate;
    private m_tabState:Map<IViewEvent, boolean>;
    private m_launchArgs:any[];
    private m_tabs:[IViewEvent];
    private m_first:IViewEvent;

    /**
     * 頁籤列表
     */
    protected get Tabs():[IViewEvent] { return this.m_tabs; }

    @property({
        type: TabBar,
        displayName: "TabBar"
    })
    private m_tabBar: Bar = null;
    protected get TabBar(): Bar { return this.m_tabBar; }

    @property({
        type: Node,
        displayName: "Root"
    })
    private m_root: Node = null;

    protected override LaunchOption(tabs:[IViewEvent], event:IViewEvent, ...args:any[]): boolean | void {
        this.m_tabs = tabs;
        this.m_tabState = new Map();
        this.m_tabs.forEach(tab => this.m_tabState.set(tab, true));
        this.m_launchArgs = [event, ...args];
    }

    protected override onLoad(): void {
        super.onLoad?.();
        this.m_systemDelegate = { OnViewSystemUpdate: null, ShouldEnableBlock: ()=>false };
        this.m_system = new ViewSystem(this.m_systemDelegate);
        this.m_system.Delegate = this;
        this.m_system.BindScope(VIEW_SECTION_ID, this.m_root);
        this.m_tabBar.Delegate = this;
        this.m_tabBar.DataSource = this;
    }

    /**
     * 介面(重新)進入場景
     * @param reused 是否為重複利用
     */
    protected override OnAwake(reused: boolean) {
        super.OnAwake?.(reused);
        this.m_first = null;
        this.m_tabBar.ReloadData();
        this.m_tabBar.SelectTab(this.m_tabs.indexOf(this.m_launchArgs.shift()));
    }

    protected override lateUpdate(dt: number): void {
        super.lateUpdate?.(dt);
        this.m_systemDelegate.OnViewSystemUpdate(dt);
    }

    /**
     * 裝置介面方向改變
     * @param interfaceOrientation 裝置介面方向
     */
    protected override OnInterfaceOrientationChanged(interfaceOrientation:number): void {
        super.OnInterfaceOrientationChanged?.(interfaceOrientation);
        this.m_system.OnInterfaceOrientationChanged(interfaceOrientation);
    }

    /**
     * 關閉介面
     */
    public override Dismiss(): void {
        this.m_system?.DismissAll();
        super.Dismiss();
    }

    /**
     * 頁籤選取事件
     * @param tabBar 頁籤元件
     * @param index 新頁籤索引
     * @param from 舊頁籤索引
     */
    public TabBarDidSelectTab(tabBar: Bar, index: number, from: number): void {
        const isTabFirstSelect:boolean = this.m_tabState.get(this.m_tabs[index]);
        this.m_tabState.set(this.m_tabs[index], false);
        this.m_system.DismissAll();
        this.m_system.SectionOpen(VIEW_SECTION_ID, this.m_tabs[index], isTabFirstSelect, ...this.m_launchArgs);
        this.m_launchArgs.length = 0;
    }

    /**
     * 取得頁籤數量
     * @param tabBar 頁籤元件
     */
    public TabBarNumberOfTabs(tabBar: Bar): number {
        return this.m_tabs.length;
    }

    /**
     * 取得頁籤標題
     * @param tabBar 頁籤元件
     * @param index 頁籤索引
     */
    public TabBarTitleForTab(tabBar: Bar, index: number): string {
        return this.m_tabs[index].Identifier;
    }

    /**
     * 介面顯示於場上
     * @param event 介面事件
     * @param isFirst 是否為本次第一個開啟的介面
     */
    public OnViewPresent(event:IViewEvent, isFirst:boolean):void {
        isFirst && (this.m_first = event);
    }

    /**
     * 介面確認準備完成
     * @param event 介面事件
     */
    public OnViewDidPresent(event: IViewEvent): void {
        if (this.m_first == event) {
            this.m_first = null;
            this.Present();
        }
    }

    /**
     * 回應當前裝置是否為橫向
     * @param event 介面事件
     */
    public OnViewSelectViewSourceLandscape(event:IViewEvent): boolean {
        return this.LaunchInLandscape;
    }

    /**
     * 介面載入失敗
     * @param event 介面事件
     * @param error 錯誤物件
     */
    public OnViewLoadViewFail(event:IViewEvent, error:Error) {
    }

    /**
     * 介面啟動失敗
     * @param event 介面事件
     */
    public OnViewLaunchViewFail(event:IViewEvent) {
    }
}


