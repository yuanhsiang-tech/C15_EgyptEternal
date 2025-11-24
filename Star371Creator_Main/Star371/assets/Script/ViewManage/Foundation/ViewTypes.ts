import { Vec3, Prefab, Node } from "cc";
import { Bundle } from "../../Bundle/Bundle";

/**
 * 介面組合包
 */
export class ViewPack {
    public Instance:Prefab|Node;
    public IsLandscape:boolean;
    constructor(instance:Prefab|Node, isLandscape:boolean) {
        this.Instance = instance;
        this.IsLandscape = isLandscape;
    }
}

/**
 * 介面元素
 */
export class ViewElement {
    private m_path:string;              // 橫版資源路徑
    private m_portraitPath:string;      // 直版資源路徑
    private m_args:any[];               // 綁定的啟動參數
    public get Path():string { return this.m_path; }
    public get PortraitPath():string { return this.m_portraitPath; }
    public get LaunchArgs():any[] { return this.m_args; }
    constructor(path:string, portraitPath:string=null) {
        this.m_path = path;
        this.m_portraitPath = portraitPath;
    }

    /**
     * 綁定固定的啟動參數
     * @param args 固定的啟動參數
     * 備註：綁定的固定啟動參數會優先出現在啟動參數列表的最前面
     */
    public BindLaunchArgs(...args:any[]):ViewElement { this.m_args = args; return this; }
}

/**
 * 橫直版一致的介面元素
 */
export class ViewGenericElement extends ViewElement {
    constructor(path:string) {
        super(path, path);
    }
}

/**
 * 介面開啟失敗原因
 */
export enum ViewPresentFailReason {
    LOADING = 0,   // 資源載入失敗
    TIMEOUT = 1    // 介面準備逾時
}
(globalThis as any).ViewPresentFailReason = ViewPresentFailReason;

/**
 * 被觀察的介面狀態通知事件
 */
export interface ViewEventNotifier {
    /**
     * 介面完成開啟顯示
     * @param event 介面事件
     * 備註：這裡表示介面顯示於場上且正確開啟完成
     */
    OnViewPresent(event:IViewEvent):void;
    /**
     * 介面顯示失敗
     * @param event 介面事件
     * @param reason 失敗原因
     * @param error 錯誤訊息
     * 備註：error 物件只有當 reason 是 LOADING 時才會有值
     */
    OnViewPresentFail(event:IViewEvent, reason:ViewPresentFailReason, error?:Error):void;
    /**
     * 介面確認關閉
     * @param event 介面事件
     */
    OnViewDismiss(event:IViewEvent):void;
}

/**
 * 介面狀態事件
 */
export interface ViewStateDelegate {
    /**
     * 開始載入介面
     * @param event 介面事件
     * @param inBackground 是否為背景載入
     * @returns 是否繼續執行介面載入
     */
    OnViewLoadView(event:IViewEvent, inBackground:boolean): void|boolean;
    /**
     * 介面載入失敗
     * @param event 介面事件
     * @param error 錯誤物件
     */
    OnViewLoadViewFail(event:IViewEvent, error:Error);
    /**
     * 介面啟動失敗
     * @param event 介面事件
     */
    OnViewLaunchViewFail(event:IViewEvent);
    /**
     * 介面事件 Bundle 為 resources，須回傳對應的 ViewElement
     * @param event 介面事件
     */
    OnViewSelectViewElement(event:IViewEvent): ViewElement;
    /**
     * 介面事件 Bundle 為 null，亦指為 DynamicViewEvent，和預設對象索取 Prefab
     * @param event 介面事件
     * 備註：預設對象應自行決定好該回傳直版 Prefab 或橫版 Prefab
     */
    OnViewSelectViewInstance(event:IViewEvent): ViewPack;
    /**
     * 回應當前裝置是否為橫向
     * @param event 介面事件
     */
    OnViewSelectViewSourceLandscape(event:IViewEvent): boolean;
    /**
     * 介面載入 Bundle
     * @param event 介面事件
     * @param bundle 載入的 Bundle
     * @param error 錯誤訊息
     */
    OnViewBundleDidLoad(event:IViewEvent, bundle:Bundle, error:Error)
    /**
     * 介面顯示於場上
     * @param event 介面事件
     * @param isFirst 是否為本次第一個開啟的介面
     */
    OnViewPresent(event:IViewEvent, isFirst:boolean):void;
    /**
     * 介面準備逾時
     * @param event 介面事件
     * @param code 逾時代碼
     * @param silent 是否靜默處理
     * @param callStack 介面開啟歷程堆疊錯誤
     */
    OnViewPresentTimeout(event:IViewEvent, code:number, silent:boolean, callStack:Error):void;
    /**
     * 介面確認準備完成
     * @param event 介面事件
     */
    OnViewDidPresent(event:IViewEvent): void;
    /**
     * 介面進入主顯示
     * @param event 介面事件
     * @param isLandscape 是否為橫版
     */
    OnViewPresenting(event:IViewEvent, isLandscape:boolean): void;
    /**
     * 介面即將離開場上
     * @param event 介面事件
     * @param isLast 是否為最後一個介面
     */
    OnViewWillDismiss(event:IViewEvent, isLast:boolean): boolean;
    /**
     * 介面正在離開場上
     * @param event 介面事件
     * @param isLast 是否為最後一個介面
     * @param isTop 是否為最上層的主顯示介面
     */
    OnViewDismissing(event:IViewEvent, isLast:boolean, isTop:boolean): Vec3|void;
    /**
     * 介面離開場上
     * @param event 介面事件
     * @param isLast 是否為最後一個介面
     * @param isTop 是否為最上層的主顯示介面
     */
    OnViewDismiss(event:IViewEvent, isLast:boolean, isTop:boolean): void;
    /**
     * 介面進入全畫面顯示
     */
    OnViewEnterFullScreen(): void;
    /**
     * 介面離開全畫面顯示
     */
    OnViewExitFullScreen(): void;
}

/**
 * 內部使用的介面設定元件
 */
interface __Internal_ViewConfig<T> {
    readonly Identifier:string;
    readonly NeedNet:boolean;
    readonly Multi:boolean;
    readonly Priority:number;    
    readonly Hash:string;
    readonly Tag:any;
    readonly SilentLoading:boolean;
    readonly MultiTouch:boolean;
    Bundle:string;
    Disposable:boolean;
    Notifier:Partial<T>;
    ExternSelectSrouce:string;
    Layer:string;
}

/**
 * 介面設定元件
 */
export class ViewConfig<T extends ViewEventNotifier = ViewEventNotifier> {
    /**
     * 創建介面事件物件
     * @param bundle 介面所屬 Bundle 名稱
     * 備註：當 Bundle 名稱為預設 resources 時會轉發事件給預設對象以取對應的 ViewElement
     */
    public static Create<T extends ViewEventNotifier = ViewEventNotifier>(bundle:string=null): ViewConfig<T> { return new ViewConfig(bundle); }

    /**
     * 創建並建構介面事件物件
     * 備註：相當於 ViewConfig.Create().Build()，如果沒帶 bundle 名稱，則會預設為 resources
     */
    public static CreateBuild<T extends ViewEventNotifier = ViewEventNotifier>(bundle:string=null, tag:any=null): IViewEvent<T> { return new ViewConfig(bundle).SetTag(tag).Build(); }

    private m_hash:string;            // 唯一雜湊值
    private Bundle:string;            // bundle 名稱
    private Identifier:string;        // 唯一識別名稱
    private NeedNet:boolean;          // 是否需要網路
    private Multi:boolean;            // 是否可同一時間多次開啟
    private Priority:number;          // 優先級別順序，數字越大優先度越高
    private Notifier:Partial<T>;      // 狀態轉換通知對象
    private Layer:string;             // 指定的圖層名稱
    private Disposable:boolean;       // 是否為一次性不可重複利用的
    private ExternSelectSrouce:string;// 額外查找的 ViewSelect 來源名稱
    private Tag:any;                  // 任意額外參數
    private SilentLoading:boolean;    // 是否隱藏預設的載入提示
    private MultiTouch:boolean;       // 是否使用多點觸控
    private get Hash():string {       
        if (this.m_hash == null) {
            const length:number = 5;
            const hash:string = `${this.Bundle}_${this.Identifier}`.split("").reduce((a,b)=>{a=((a<<5)-a)+b.charCodeAt(0);return a&a},0).toString(16);
            this.m_hash = hash.substring(hash.length-length);
        }
        return this.m_hash;
    }

    protected constructor(bundle:string) {
        this.Bundle = bundle || "resources";
        this.NeedNet = true;
        this.Multi = true;
        this.Priority = 0;
        this.Disposable = false;
        this.SilentLoading = false;
        this.MultiTouch = false;
    }

    /**
     * 標示不需要網路
     */
    public Offline(): ViewConfig<T> { this.NeedNet=false; return this; }

    /**
     * 標示不可多開
     */
    public Unique(): ViewConfig<T> { this.Multi=false; return this; }

    /**
     * 指定優先順序，數字越大優先度越高
     * @param priority 優先順序
     */
    public SetPriority(priority:number): ViewConfig<T> { this.Priority=priority; return this; }

    /**
     * 是否為一次性不可重複利用的
     */
    public Dispose(): ViewConfig<T> { this.Disposable=true; return this; }

    /**
     * 額外指定真正的 ViewSelect 來源名稱
     * @param externName ViewSelect 來源名稱
     */
    public Extern(externName:string): ViewConfig<T> { this.ExternSelectSrouce = externName; return this; }

    /**
     * 指定任意額外參數
     * @param tag 額外參數
     */
    public SetTag(tag:any): ViewConfig<T> { this.Tag=tag; return this; }

    /**
     * 隱藏預設的載入提示
     */
    public SilentLoad(): ViewConfig<T> { this.SilentLoading=true; return this; }

    /**
     * 使用多點觸控
     */
    public UseMultiTouch(): ViewConfig<T> { this.MultiTouch=true; return this; }
    
    /**
     * 建立 ViewEvent 物件
     * 備註：強制關閉 persist 旗標，避免資源被別人釋放後而產生的缺圖等問題
     */
    public Build(): IViewEvent<T> {
        return new ViewEvent(this as any as __Internal_ViewConfig<T>, false);
    }

    /**
     * 建立 DynamicViewEvent 物件
     */
    public BuildDynamic(): IViewEvent<T> {
        return new DynamicViewEvent(this as any as __Internal_ViewConfig<T>);
    }
}

/**
 * 對外介面事件
 */
export interface IViewEvent<T extends ViewEventNotifier = ViewEventNotifier> {
    /**
     * bundle 名稱
     */
    readonly Bundle:string;
    /**
     * 唯一識別名稱
     */
    readonly Identifier:string;
    /**
     * 是否需要網路
     */
    readonly NeedNet:boolean;
    /**
     * 唯一雜湊值
     */
    readonly Hash:string;
    /**
     * 額外參數
     */
    readonly Tag:any;
    /**
     * 介面嘗試開啟次數
     */
    readonly Visists:number;
    /**
     * 介面成功開啟次數
     */
    readonly DidVisists:number;
    /**
     * 是否隱藏預設的載入提示
     */
    readonly SilentLoading:boolean;
    /**
     * 是否使用多點觸控
     */
    readonly MultiTouch:boolean;

    /**
     * 指定於特定的圖層中開啟
     * @param name 圖層名稱
     * 備註：這是執行期間動態指定使用
     */
    SetLayer(name:string): IViewEvent<T>;

    /**
     * 設定狀態轉換通知對象
     * @param notifier 通知對象
     * 備註：這是執行期間動態指定使用
     */
    SetNotifier(notifier:Partial<T>): IViewEvent<T>;
}

/**
 * 介面事件
 */
export class ViewEvent<T extends ViewEventNotifier = ViewEventNotifier> implements IViewEvent<T> {
    protected m_visits:number;
    protected m_didVisits:number;
    constructor(protected m_config:__Internal_ViewConfig<T>, protected m_persist:boolean) { this.m_visits=0; this.m_didVisits=0; }

    /**
     * bundle 名稱
     */
    public get Bundle():string { return this.m_config.Bundle; }
    /**
     * 唯一識別名稱
     */
    public get Identifier():string { return this.m_config.Identifier; }
    /**
     * 是否需要網路
     */
    public get NeedNet():boolean { return this.m_config.NeedNet; }
    /**
     * 是否可同一時間多次開啟
     */
    public get IsMulti():boolean { return this.m_config.Multi; }
    /**
     * 優先級別順序，數字越大優先度越高
     */
    public get Priority():number { return this.m_config.Priority; }
    /**
     * 狀態轉換通知對象
     */
    public get Notifier():Partial<T> { return this.m_config.Notifier; }
    /**
     * 指定的圖層名稱
     */
    public get Layer():string { return this.m_config.Layer; }
    /**
    * 是否為一次性不可重複利用的
    */
    public get IsDisposible():boolean { return this.m_config.Disposable; }
    /**
     * 唯一雜湊值
     */
    public get Hash():string { return this.m_config.Hash; }
    /**
     * 是否長期保留，轉場也不釋放
     */
    public get IsPersist():boolean { return this.m_persist; }
    /**
     * 額外查找的 ViewSelect 來源名稱
     */
    public get Extern():string { return this.m_config.ExternSelectSrouce; }
    /**
     * 額外參數
     */
    public get Tag():any { return this.m_config.Tag; }
    /**
     * 介面嘗試開啟次數
     */
    public get Visists():number { return this.m_visits; }
    /**
     * 介面成功開啟次數
     */
    public get DidVisists():number { return this.m_didVisits; }
    /**
     * 是否隱藏預設的載入提示
     */
    public get SilentLoading():boolean { return this.m_config.SilentLoading; };
    /**
     * 是否使用多點觸控
     */
    public get MultiTouch():boolean { return this.m_config.MultiTouch; };

    /**
     * 指定於特定的圖層中開啟
     * @param name 圖層名稱
     * 備註：這是執行期間動態指定使用
     */
    public SetLayer(name:string): ViewEvent<T> { this.m_config.Layer=name; return this; }

    /**
     * 設定狀態轉換通知對象
     * @param notifier 通知對象
     * 備註：這是執行期間動態指定使用
     */
    public SetNotifier(notifier:Partial<T>): ViewEvent<T> { this.m_config.Notifier=notifier; return this; }

    /**
     * 增加介面開啟次數
     * @param didPresent 是否成功開啟
     */
    public DoVisit(didPresent:boolean=false):void { !didPresent ? ++this.m_visits : ++this.m_didVisits; }
}

/**
 * 動態介面事件
 * 備註：(1) 主要用於類似遊戲主場等一次性、動態產生的非管控事件，此類事件不會被快取與重複利用
 *      (2) 此類型事件將一律轉發給預設對象以取得對應的 Prefab
 *      (3) 此類型事件的回傳對象須決定好應該回傳直版或橫版資源，介面中的是否為橫版旗標將會失效不具參考價值
 */
export class DynamicViewEvent<T extends ViewEventNotifier = ViewEventNotifier> extends ViewEvent<T> {
    constructor(config:__Internal_ViewConfig<T>) {
        super(config, false);
        this.m_config.Bundle = null;
        this.m_config.Disposable = true;
    }
}