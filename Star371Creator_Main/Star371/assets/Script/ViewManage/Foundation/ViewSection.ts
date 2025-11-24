import { Node, Vec3 } from 'cc';
import { Bundle } from '../../Bundle/Bundle';
import { ViewLayerDelegate, ViewLayer, ViewLayerPool } from './ViewLayer';
import { ViewElement, ViewEvent, ViewEventNotifier, ViewPack } from './ViewTypes';

export interface ViewSectionDelegate {
    IsViewSectionPending(section:ViewSection): boolean;
    OnViewSectionLoadView(section:ViewSection, event:ViewEvent, inBackground:boolean): void|boolean;
    OnViewSectionLoadViewFail(section:ViewSection, event:ViewEvent, error:Error): void;
    OnViewSectionLaunchViewFail(section:ViewSection, event:ViewEvent): void;
    OnViewSectionSelectViewElement(section:ViewSection, event:ViewEvent): ViewElement;
    OnViewSectionSelectViewInstance(sectin:ViewSection, event:ViewEvent): ViewPack;
    OnViewSectionSelectViewSourceLandscape(section:ViewSection, event:ViewEvent): boolean;
    OnViewSectionBundleDidLoad(section:ViewSection, event:ViewEvent, bundle:Bundle, error:Error): void;

    OnViewSectionPresentView(section:ViewSection, event:ViewEvent): void;
    OnViewSectionWillDismissView(section:ViewSection, event:ViewEvent, block:Node, isFullPresent:boolean, animMinimize:boolean): boolean;
    OnViewSectionDismissingView(section:ViewSection, event:ViewEvent, isFullPresent:boolean, isTopLayerViewInSection:boolean): Vec3|void;
    OnViewSectionDismissView(section:ViewSection, event:ViewEvent, isTopLayerViewInSection:boolean, minimizeWorldCenter:Vec3): void;
    OnViewSectionReplaceViewBlock(section:ViewSection, event:ViewEvent, opaqueBlock:boolean, darkenBlock:boolean): Node;
    OnViewSectionDidPresentView(section:ViewSection, event:ViewEvent, isFullPresent:boolean, deferFullPresentAffect:number): void;
    OnViewSectionPresentViewTimeout(section:ViewSection, event:ViewEvent, code:number, silent:boolean, callStack:Error): void;
    OnViewSectionPresentingView(section:ViewSection, event:ViewEvent, isLandscape:boolean): void;
    OnViewSectionResignFullPresentView(section:ViewSection, event:ViewEvent): void;
}

export class ViewSection {
    private static SeedId:number = 0;

    private m_id:number;
    private m_scope:Node;
    private m_layers:ViewLayer[];
    private m_layerDelegate:ViewLayerDelegate;
    private m_delegate:ViewSectionDelegate;
    private m_inBackground:boolean;

    /**
     * 取得 ViewSection 獨有 ID
     */
    public get Id(): number { return this.m_id; }

    /**
     * 檢查是否在背景
     */
    public get InBackground(): boolean { return this.m_inBackground; }

    /**
     * 檢查是否完全沒有要顯示的項目
     */
    public get IsEmpty(): boolean { 
        for (let layer of this.m_layers) {
            if (!layer.IsEmpty) {
                return false;
            }
        }
        return true;
    }

    /**
     * 取得顯示中的數量
     */
    public get Count(): number {
        let count:number = 0;
        this.m_layers.forEach((layer:ViewLayer)=> { count += layer.Count });
        return count;
    }

    /**
     * 取得顯示中與準備中的總數數量
     */
    public get Length(): number {
        let length:number = 0;
        this.m_layers.forEach((layer:ViewLayer)=> { length += layer.Length });
        return length;
    }

    constructor(id:number) {
        this.m_id = id;
        this.m_layers = [];
        this.m_inBackground = false;
        this.m_layerDelegate = {
            GetViewLayerScope: this.GetViewLayerScope.bind(this),
            IsViewLayerPending: this.IsViewLayerPending.bind(this),
            OnViewLayerLoadView: this.OnViewLayerLoadView.bind(this),
            OnViewLayerLoadViewFail: this.OnViewLayerLoadViewFail.bind(this),
            OnViewLayerLaunchViewFail: this.OnViewLayerLaunchViewFail.bind(this),
            OnViewLayerSelectViewSourceLandscape: this.OnViewLayerSelectViewSourceLandscape.bind(this),
            OnViewLayerBundleDidLoad: this.OnViewLayerBundleDidLoad.bind(this),
            OnViewLayerPresentView: this.OnViewLayerPresentView.bind(this),
            OnViewLayerWillDismissView: this.OnViewLayerWillDismissView.bind(this),
            OnViewLayerDismissingView: this.OnViewLayerDismissingView.bind(this),
            OnViewLayerDismissView: this.OnViewLayerDismissView.bind(this),
            OnViewLayerSelectViewElement: this.OnViewLayerSelectViewElement.bind(this),
            OnViewLayerSelectViewInstance: this.OnViewLayerSelectViewInstance.bind(this),
            OnViewLayerReplaceViewBlock: this.OnViewLayerReplaceViewBlock.bind(this),
            OnViewLayerDidPresentView: this.OnViewLayerDidPresentView.bind(this),
            OnViewLayerPresentViewTimeout: this.OnViewLayerPresentViewTimeout.bind(this),
            OnViewLayerPresentingView: this.OnViewLayerPresentingView.bind(this),
            OnViewLayerResignFullPresentView: this.OnViewLayerResignFullPresentView.bind(this)
        }
    }

    /**
     * 綁定用以顯示介面的節點容器
     * @param scope 節點容器
     */
    public Bind(scope:Node) {
        this.m_scope = scope;
    }

    /**
     * 指定事件監聽對象
     * @param delegate 監聽對象
     */
    public SetDelegate(delegate:ViewSectionDelegate) { 
        this.m_delegate = delegate; 
    }

    /**
     * 強行插入介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public InjectPush(event:ViewEvent<ViewEventNotifier>, ...args:any) {
        this.PrepareLayer(event).InjectPush(event, ...args);
    }

    /**
     * 貯列式開啟介面
     * @param event 介面事件
     * @param args 參數陣列
     */
    public Push(event:ViewEvent<ViewEventNotifier>, ...args:any) {
        this.PrepareLayer(event).Push(event, ...args);
    }

    /**
     * 堆疊式開啟介面
     * @param event 介面事件
     * @param args 參數陣列
     */
    public Open(event:ViewEvent<ViewEventNotifier>, ...args:any) {
        this.PrepareLayer(event).Open(event, ...args);
    }

    /**
     * 移除貯列中尚未顯示的介面事件
     * @param event 介面事件
     */
    public Kick(event:ViewEvent<ViewEventNotifier>|IViewEvent) {
        this.m_layers.forEach((layer:ViewLayer)=>layer.Kick(event));
    }

    /**
     * 清除設定
     */
    public Clear() {
        for (let i = 0; i < this.m_layers.length; i++) {
            const layer:ViewLayer = this.m_layers[i];
            layer.Clear();
            ViewLayerPool.Default.Put(layer);
        }
        this.m_layers.length = 0;
        this.m_inBackground = false;
    }

    /**
     * 進入前景
     */
    public Foreground(): boolean {
        let foregroundLayer:ViewLayer = null;

        // 外部影響：別的 Section 的 Layer 關介面導致此 Section 進入 Foreground
        // 只有最上層的 Layer 恢復 Foreground
        for (let i = this.m_layers.length-1; i >= 0; i--) {
            const layer:ViewLayer = this.m_layers[i];
            if (layer.Foreground()) {
                foregroundLayer = layer;
                break;
            }
        }
        this.m_inBackground = false;

        return !!foregroundLayer;
    }

    /**
     * 進入背景
     */
    public Background() {
        // 外部影響：別的 Section 的 Layer 開新介面導致此 Section 進入 Background
        this.m_layers.forEach((layer:ViewLayer)=>layer.Background());
        this.m_inBackground = true;
    }

    /**
     * 每幀步進更新
     * @param dt 幀時間
     */
    public Update(dt:number) {
        for (let i = 0; i < this.m_layers.length; i++) {
            const layer:ViewLayer = this.m_layers[i];
            layer.Update(dt);
            if (layer.IsEmpty) {
                layer.Clear();
                ViewLayerPool.Default.Put(layer);
                this.m_layers.splice(i, 1);
            }
        }
    }

    /**
     * 每幀的後步進更新
     * @param dt 幀時間
     */
    public PostUpdate(dt:number) {
        for (let i = this.m_layers.length-1; i >= 0; i--) {
            const layer:ViewLayer = this.m_layers[i];
            layer.PostUpdate(dt);
            if (layer.IsEmpty) {
                layer.Clear();
                ViewLayerPool.Default.Put(layer);
                this.m_layers.splice(i, 1);
            }
        }
    }

    /**
     * 查找目標介面是否已經開啟或準備開啟
     * @param event 介面事件
     */
    public Contains(event:ViewEvent<ViewEventNotifier>|IViewEvent): boolean {
        for (let layer of this.m_layers) {
            if (layer.Contains(event)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 逐一返回處理
     * 備註：(1) 介面自己有權決定是否被關閉
     *      (2) 回傳 false 表示有介面接管處理流程，外部不可執行其餘操作
     *      (3) 回傳 true  表示沒有任何介面在處理私有流程，外部可以執行其餘操作
     */
    public NavigateBack(): boolean {
        for (let i = this.m_layers.length-1; i >= 0; i--) {
            const layer:ViewLayer = this.m_layers[i];
            if (layer.Count > 0) {
                return layer.NavigateBack();
            }
        }
        return true;
    }

    /**
     * 批次關閉顯示中的介面
     * 備註：介面無權決定自己是否可被關閉
     */
    public DismissAll() {
        this.m_layers.forEach((layer:ViewLayer)=>layer.DismissAll());
    }

    /**
     * 關閉單一介面
     * 備註：若未指定介面事件，則關閉最上層的介面
     */
    public Dismiss(iEvent?:IViewEvent<ViewEventNotifier>|IViewEvent) {
        for (let i = this.m_layers.length-1; i >= 0; i--) {
            const layer:ViewLayer = this.m_layers[i];
            if (layer.Count > 0 && layer.Dismiss(iEvent)) {
                // [關閉最上層的介面、找到指定的介面]
                return true;
            }
        }
        return false;
    }

    /**
     * 取得最上層的介面
     */
    public GetTopView(): IViewEvent {
        return this.IsEmpty ? null : this.m_layers[this.m_layers.length-1]?.GetTopView();
    }

    /**
     * 裝置介面方向改變
     * @param interfaceOrientation 裝置介面方向
     */
    public OnInterfaceOrientationChanged(interfaceOrientation:number): void {
        this.m_layers.forEach((layer:ViewLayer)=>layer.OnInterfaceOrientationChanged(interfaceOrientation));
    }

    /**
     * 準備圖層以開啟介面
     * @param event 介面事件
     */
    private PrepareLayer(event:ViewEvent<ViewEventNotifier>): ViewLayer {
        const name:string = typeof event.Layer != "string" || event.Layer.trim() == "" ? `l_${ViewSection.SeedId++}` : event.Layer;
        let layer:ViewLayer = this.m_layers.find(l=>l.Name==event.Layer);
        if (!layer) {
            // [開新圖層]
            layer = ViewLayerPool.Default.Get();
            layer.SetName(name);
            layer.SetDelegate(this.m_layerDelegate);
            this.m_inBackground ? layer.Background() : layer.Foreground();
            this.m_layers.push(layer);
        }
        return layer;
    }

//#region ViewLayerDelegate
    /**
     * 回傳 ViewLayer 是否為暫停中
     * @param layer 檢查是否暫停的 ViewLayer
     */
    protected IsViewLayerPending(layer:ViewLayer): boolean {
        return this.m_delegate.IsViewSectionPending(this);
    }

    /**
     * 開始載入介面
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param inBackground 是否為背景載入
     */
    protected OnViewLayerLoadView(layer:ViewLayer, event:ViewEvent, inBackground:boolean): void|boolean {
        return this.m_delegate.OnViewSectionLoadView(this, event, inBackground);
    }

    /**
     * 介面載入失敗
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param error 錯誤物件
     */
    protected OnViewLayerLoadViewFail(layer:ViewLayer, event:ViewEvent, error:Error) {
        this.m_delegate.OnViewSectionLoadViewFail(this, event, error);
    }

    /**
     * 介面啟動失敗
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     */
    protected OnViewLayerLaunchViewFail(layer:ViewLayer, event:ViewEvent) {
        this.m_delegate.OnViewSectionLaunchViewFail(this, event);
    }

    /**
     * 介面事件 Bundle 為 resources，和預設對象索取 ViewElement
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     */
    protected OnViewLayerSelectViewElement(layer:ViewLayer, event:ViewEvent): ViewElement {
        return this.m_delegate.OnViewSectionSelectViewElement(this, event);
    }

    /**
     * 介面事件 Bundle 為 null，亦指為 DynamicViewEvent，和預設對象索取 Prefab
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * 備註：預設對象應自行決定好該回傳直版 Prefab|Node 或橫版 Prefab|Node
     */
    protected OnViewLayerSelectViewInstance(layer:ViewLayer, event:ViewEvent): ViewPack {
        return this.m_delegate.OnViewSectionSelectViewInstance(this, event);
    }

    /**
     * 回傳 ViewLayer 顯示節點範圍
     * @param layer 
     */
    protected GetViewLayerScope(layer:ViewLayer): Node {
        return this.m_scope;
    }

    /**
     * 依據當前狀況回傳應載入直版或橫版介面
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     */
    protected OnViewLayerSelectViewSourceLandscape(layer:ViewLayer, event:ViewEvent): boolean {
        return this.m_delegate.OnViewSectionSelectViewSourceLandscape(this, event);
    }

    /**
     * 介面載入 Bundle
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param bundle 載入的 Bundle
     * @param error 錯誤訊息
     */
    protected OnViewLayerBundleDidLoad(layer:ViewLayer, event:ViewEvent, bundle:Bundle, error:Error) {
        this.m_delegate.OnViewSectionBundleDidLoad(this, event, bundle, error);
    }

    /**
     * 介面顯示於場上
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     */
    protected OnViewLayerPresentView(layer:ViewLayer, event:ViewEvent) {
        this.m_delegate.OnViewSectionPresentView(this, event);

        {
            // 內部影響：同 Section 內不同 Layer 開新介面
            const index:number = this.m_layers.indexOf(layer);
            for (let i = index-1; i >= 0; i--) {
                this.m_layers[i].Background();
            }
        }
    }

    /**
     * 介面準備逾時
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param code  逾時代碼
     * @param silent 是否靜默處理
     * @param callStack 介面開啟歷程堆疊錯誤
     */
    protected OnViewLayerPresentViewTimeout(layer:ViewLayer, event:ViewEvent, code:number, silent:boolean, callStack:Error) {
        this.m_delegate.OnViewSectionPresentViewTimeout(this, event, code, silent, callStack);
    }

    /**
     * 介面確認準備完成
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param isFullPresent 是否為全畫面
     * @param deferFullPresentAffect 全畫面顯示時關閉背後其餘顯示的延遲時間(單位：秒)
     */
    protected OnViewLayerDidPresentView(layer:ViewLayer, event:ViewEvent, isFullPresent:boolean, deferFullPresentAffect:number): void {
        this.m_delegate.OnViewSectionDidPresentView(this, event, isFullPresent, deferFullPresentAffect);
    }

    /**
     * 介面要求重置遮黑元件
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param opaqueBlock 是否使用不透明遮黑顯示
     * @param darkenBlock 是否使用深色的遮黑顯示
     */
    protected OnViewLayerReplaceViewBlock(layer:ViewLayer, event:ViewEvent, opaqueBlock:boolean, darkenBlock:boolean): Node {
        return this.m_delegate.OnViewSectionReplaceViewBlock(this, event, opaqueBlock, darkenBlock);
    }

    /**
     * 介面進入主顯示
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param isLandscape 是否為橫版
     */
    protected OnViewLayerPresentingView(layer:ViewLayer, event:ViewEvent, isLandscape:boolean) {
        this.m_delegate.OnViewSectionPresentingView(this, event, isLandscape);
    }

    /**
     * 介面主動退出全畫面顯示
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     */
    protected OnViewLayerResignFullPresentView(layer:ViewLayer, event:ViewEvent) {
        this.m_delegate.OnViewSectionResignFullPresentView(this, event);
    }

    /**
     * 介面即將離開場上
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param block 介面遮黑元件
     * @param isFullPresent 是否為全畫面
     * @param animMinimize 是否使用動畫最小化
     */
    protected OnViewLayerWillDismissView(layer:ViewLayer, event:ViewEvent, block:Node, isFullPresent:boolean, animMinimize:boolean): boolean {
        return this.m_delegate.OnViewSectionWillDismissView(this, event, block, isFullPresent, animMinimize);
    }

    /**
     * 介面即將離開場上
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param isFullPresent 是否為全畫面
     * @param isTopView 是否為最上層的主顯示介面
     */
    protected OnViewLayerDismissingView(layer:ViewLayer, event:ViewEvent, isFullPresent:boolean, isTopView:boolean): Vec3|void {
        let isTopLayer:boolean = true;

        // 檢查當對象是否為目前最上層顯示順序
        const index:number = this.m_layers.indexOf(layer);
        for (let i = index+1; i < this.m_layers.length; i++) {
            isTopLayer &&= this.m_layers[i].IsEmpty;
        }

        return this.m_delegate.OnViewSectionDismissingView(this, event, isFullPresent, isTopLayer&&isTopView);
    }

    /**
     * 介面離開場上
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param isTopView 是否為最上層的主顯示介面
     */
    protected OnViewLayerDismissView(layer:ViewLayer, event:ViewEvent, isTopView:boolean, minimizeWorldCenter:Vec3) {
        let isTopLayer:boolean = true;

        // 檢查當對象是否為目前最上層顯示順序
        const index:number = this.m_layers.indexOf(layer);
        for (let i = index+1; i < this.m_layers.length; i++) {
            isTopLayer &&= this.m_layers[i].IsEmpty;
        }

        this.m_delegate.OnViewSectionDismissView(this, event, isTopLayer&&isTopView, minimizeWorldCenter);

        // 內部影響：同 Section 內不同 Layer 關介面
        if (!isTopLayer) {
            // [當前對象不是目前最上層顯示順序] => 有可能是中間任意一個項目
            // 所有項目維持原狀，不做任何處理
        } else if (!layer.IsEmpty) {
            // [當前對象還有沒顯示完的介面要接續顯示]
            // 所有項目維持原狀，不做任何處理
        } else {
            // [當前對象已經沒有任何要顯示的介面] => 找出下一個用於主顯示的對象
            for (let i = index-1; i >= 0; i--) {
                const viewLayer:ViewLayer = this.m_layers[index];
                viewLayer.Foreground();
                if (!viewLayer.IsEmpty) {
                    break;
                }
            }
        }
    }
//#endregion
}