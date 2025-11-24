import { Director, director, Game, game, instantiate, Node, Prefab, error, Vec3, UITransform, macro, tween } from 'cc';
import { DEBUG } from 'cc/env';
import { ViewBase } from './ViewBase';
import { Bundle } from '../../Bundle/Bundle';
import { ViewElement, ViewEvent, ViewEventNotifier, ViewPack, ViewPresentFailReason } from './ViewTypes';

// 等待轉向完成的時間(單位：秒)
const WAIT_ORIETATION_COMPLETE:number = 0.18;

// 介面開啟逾時的時候是否直接銷毀
const DESTROY_NODE_IMMEDIATELY_ON_TIMEOUT:boolean = true;

// 臨時最高 z-order
const TEMP_HIGHEST_ZORDER:number = 99;

function SafeCall(target:Object, func:Function, ...args:any[]) {
    if (DEBUG) {
        return func?.apply(target, args);
    } else {
        try { return func?.apply(target, args); }
        catch (err) { error(err); }
    }
}

enum ViewState {
    UNKNOWN,                // 未知
    WAITING_READY,          // 等待準備完成
    TIMEOUT,                // 等待逾時
    WILL_BECOME_ACTIVE,     // 將成為畫面主要的顯示面板
    RUNNING,                // 面板開啟中
    BECOME_INACTIVE,        // 將從主要的顯示面板退出，可能緊接著關閉或是因為有別的面板開啟壓在自己的上面而造成
    WILL_DISMISS,           // 面板即將關閉
    DISMISS,                // 面板關閉
    FORCE_DISMISS           // 面板強制關閉
}

enum ViewProxyState {
    UNLOAD,                 // 尚未載入
    BUNDLE_LOADING,         // Bundle 載入中
    BUNDLE_LOAD_FAIL,       // Bundle 載入失敗
    INVALID_ELEMENT,        // 無效的 ViewElement
    PREFAB_LOADING,         // Prefab 載入中
    PREFAB_LOAD_FAIL,       // Prefab 載入失敗
    LOADED,                 // Bundle、Prefab 載入完成
}

/**
 * function 使用說明可參考 ViewBase.ts
 */
interface __Private_ViewBase {
    readonly node: __Private_Node;
    readonly DidPresent: boolean;
    readonly DidDismiss: boolean;
    readonly DidMinimize: boolean;
    readonly AnimMinimize: boolean;
    readonly MinimizeWorldCenter: Vec3;
    readonly WantResignFullPresent: boolean;
    readonly DidResignFullPresent: boolean;

    // 直接操作的方法
    RotateOrientation(launchInLandscape:boolean, ...options:any): boolean;
    ConfirmViewLaunchInLandscape(confirm:boolean): void;
    OnNavigateBack(): boolean;
    Dismiss(): void;
    SetViewEventNotifier(notifier:Partial<ViewEventNotifier>|undefined): void;
    SetBundleName(name:string): void;
    Reset(): void;
    IsFullPresent(): boolean;
    DeferFullPresentAffect(): number;
    OpaqueBlock(): boolean;
    DarkenBlock(): boolean;
    Minimize(animated:boolean, localCenter:Vec3, worldCenter:Vec3): void;
    SetViewAnchor(viewAnchor:Node): void;
    ShouldAnimMinimize(): boolean;
    MinimizeWorldLocation(): Vec3|undefined;
    ConfirmResignFullPresent(): boolean;
    OnInterfaceOrientationChanged(interfaceOrientation:number): void;

    // 類 interface 方法
    ViewSelfPrepareTime(): number;
    ViewSelfSilentTimeout?(): boolean;
    OnViewSelfPrepareTimeout?(): number;
    OnViewSelfWillBecomeActive?(): void;
    OnViewSelfDidBecomeActive?(): void;
    OnViewSelfWillBecomeInActive?(): void;
    OnViewSelfDidBecomeInActive?(): void;
    OnViewSelfWillDismiss?(): void;
    OnViewSelfDidDismiss?(): void;

    // 階段狀態通知
    LaunchOption?(...options:any): boolean|void;
    OnAwake?(reused:boolean): void;
    OnSleep?(): void;
}

interface __Private_Node extends Node {
    __supportOrientation: number; // 1:直版, 2:橫版, 3:直版+橫版
}

class SourceState {
    private m_curr : number = null;
    private m_next : number = null;
    private m_prev : number = null;
    private m_timeElapse : number = 0;
    private m_entering : boolean = false;
    private m_timeout : number = 0;

    public get Current(): number|undefined { return this.m_curr; }
    public get Next(): number|undefined { return this.m_next; }
    public get Prev(): number|undefined { return this.m_prev; }

    /**
     * 每幀步進執行
     */
    public Tick() {
        this.m_entering = this.m_next != null;
        
        if (this.m_entering) {
            this.m_prev = this.m_curr;
            this.m_curr = this.m_next;
            this.m_next = null;
            this.m_timeElapse = 0;
        }
        
        if (this.m_timeout > 0 && this.m_timeElapse <= this.m_timeout) {
            this.m_timeElapse += game.deltaTime;
        }

        return this.m_curr;
    }

    /**
     * 指定下一個轉換的階段，可額外指定進入該階段後若多少時間內未切換階段被認定為逾時
     * @param state 要轉入的階段
     * @param timeout 逾時時間(單位：毫秒)，0 表示不會逾時
     */
    public Forward(state:number, timeout:number=0) {
        this.m_next = state;
        this.m_timeout = timeout / 1000.0;
    }

    /**
     * 是否為首次進入此階段
     */
    public IsEntering(): boolean {
        return this.m_entering;
    }

    /**
     * 是否階段停留逾時
     */
    public IsTimeout(): boolean {
        return this.m_timeout > 0 && this.m_timeElapse > this.m_timeout;
    }
}

class Pool<T> {
    private m_unused:T[];
    private m_using:T[];

    constructor() {
        this.m_unused = [];
        this.m_using = [];
    }

    public Get(): T {
        return this.m_using.push(this.m_unused.pop() || this.Create()), this.m_using[this.m_using.length-1];
    }

    public Put(obj:T) {
        const index:number = this.m_using.findIndex(o=>o==obj);
        [this.m_using[index], this.m_using[this.m_using.length-1]] = [this.m_using[this.m_using.length-1], this.m_using[index]];
        this.m_unused.push(this.m_using.pop());
    }

    protected Create?(): T;
}

class ViewProxy {
    private static SeedId:number = 0;
    
    private m_id:number;
    private m_state:ViewProxyState;
    private m_viewState:SourceState;
    private m_error:Error;
    private m_prefab:Prefab;
    private m_node:__Private_Node;
    private m_launchOrientation:number;
    private m_view:ViewBase;
    private m_inBackground:boolean;
    private m_event:ViewEvent<ViewEventNotifier>;
    private m_notifier:Partial<ViewEventNotifier>;
    private m_args:any[];
    private m_reference:boolean;
    private m_element:ViewElement;
    private m_callStack:Error;
    private m_injected:boolean;

    public SortIndex:number;
    public get State(): ViewProxyState { return this.m_state; }
    public get IsLandscape(): boolean { return this.m_launchOrientation==macro.ORIENTATION_LANDSCAPE; }
    public get View(): __Private_ViewBase { return this.m_view as unknown as __Private_ViewBase; }
    public get ViewState(): SourceState { return this.m_viewState; }
    public get ID(): number { return this.m_id; }
    public get InBackground(): boolean { return this.m_inBackground; }
    public get Event():ViewEvent<ViewEventNotifier> { return this.m_event; }
    public get Notifier():Partial<ViewEventNotifier> { return this.m_notifier; }
    public get Args():any[] { return !Array.isArray(this.m_element.LaunchArgs) || this.m_element.LaunchArgs.length == 0 ? this.m_args : [...this.m_element.LaunchArgs, ...this.m_args]; }
    public get Reuse():boolean { return !!(this.m_node && !this.m_prefab); }
    public get CanRotateLaunchOrientation():boolean { return this.m_element && this.m_element.Path == this.m_element.PortraitPath; }
    public get CallStack():Error { return this.m_callStack; }
    public get IsInjected():boolean { return this.m_injected; }

    constructor() {
        this.m_id = ViewProxy.SeedId++;
        this.m_viewState = new SourceState();
        this.Clear();
    }

    /**
     * 綁定介面事件及啟動參數
     * @param event 介面事件
     * @param args 啟動參數
     */
    public Bind(event:ViewEvent<ViewEventNotifier>, args:any[]) {
        this.m_event = event;
        this.m_notifier = event.Notifier;
        this.m_args = args;
        this.m_callStack = new Error(`open view '${event.Identifier}' fail`);
    }

    /**
     * 強行插入式介面
     */
    public Inject() {
        this.m_injected = true;
    }

    /**
     * 載入資源
     * @param elementSelector 資源直橫版選擇器
     * @param externalSelectView 外部 ViewElement 選擇器
     * @param externalLoadInstance 外部 Prefab|Node 選擇器
     */
    public LoadAsset(elementSelector:(event:ViewEvent)=>boolean, externalSelectView:(event:ViewEvent)=>ViewElement, externalLoadInstance:(event:ViewEvent)=>ViewPack, onBundleDidLoad:(event:ViewEvent, bundle:Bundle, error:Error)=>void) {
        if (this.m_state == ViewProxyState.UNLOAD) {
            this.m_state = ViewProxyState.BUNDLE_LOADING;

            const proxyLib:ViewProxyLib = ViewProxyLib.Cache.get(this.Event.Hash);
            if (!proxyLib || proxyLib.Storage.length <= 0) {
                // [完全沒有相關紀錄或沒有可用的節點] => 直接走載入流程
            } else if (!proxyLib.Valid()) {
                // [節點已不適合重複利用] => 清除快取紀錄
                proxyLib?.Clear();
                ViewProxyLib.Cache.delete(this.Event.Hash);
            } else {
                // [可能有重複利用的節點] => 查找可重複利用的節點
                const preferLandscape:boolean = elementSelector(this.Event as ViewEvent);
                this.m_node = proxyLib.FindSupport(preferLandscape);
                if (this.m_node) {
                    this.m_launchOrientation = preferLandscape ? macro.ORIENTATION_LANDSCAPE : macro.ORIENTATION_PORTRAIT;
                    this.m_state = ViewProxyState.LOADED;
                }
            }
            
            if (this.m_state == ViewProxyState.LOADED) {
                // [已經從 Cache 裡取得]
                this.m_element = this.FetchElement(externalSelectView, Bundle.Find(this.Event.Bundle)?.Name);
            } else if (this.Event.Bundle == null) {
                // [一次性的動態對象] => 轉發給預設對象以取得對應的 Prefab
                // ＊外部需要自行決定好是橫版還是直版
                this.m_element = this.FetchElement(externalSelectView);
                this.m_state = ViewProxyState.PREFAB_LOADING;
                const viewPack:ViewPack = externalLoadInstance(this.Event);
                const instance:Prefab|Node = viewPack.Instance;
                if (!instance) {
                    this.m_error = new Error(`null Prefab|Node for ViewEvent(${this.Event.Identifier})`);
                    this.m_state = ViewProxyState.PREFAB_LOAD_FAIL;
                } else if (instance instanceof Prefab) {
                    this.m_reference = true;
                    this.m_prefab = instance;
                    this.m_state = ViewProxyState.LOADED;
                } else {
                    this.m_reference = true
                    this.m_node = instance as __Private_Node;
                    this.m_state = ViewProxyState.LOADED;
                }
            } else if (this.Event.Bundle == Bundle.Resources.Name) {
                // [未知的 Bundle 對象] => 轉發事件給預設對象以取對應的 ViewElement
                // ＊這個檢查順序必定排在第二位，否則當 assetManager.resources 是 null 時會產生誤判
                const element:ViewElement = this.FetchElement(externalSelectView);
                this.LoadPrefab(Bundle.Resources, element, elementSelector);
            } else {
                // [有指定 Bundle 對象] => 載入 Bundle 和 Prefab
                Bundle.Load(this.Event.Bundle, (err:Error, bundle:Bundle)=>{
                    onBundleDidLoad(this.Event, bundle, err);
                    if (this.m_state != ViewProxyState.BUNDLE_LOADING) {
                        // [狀態錯誤]
                        this.m_error = new Error(`無效的 ViewProxy State: ${this.m_state}`);
                        this.m_state = ViewProxyState.BUNDLE_LOAD_FAIL;
                    } else if (err) {
                        // [載入錯誤]
                        this.m_error = err;
                        this.m_state = ViewProxyState.BUNDLE_LOAD_FAIL;
                    } else {
                        // [載入成功]
                        const element:ViewElement = this.FetchElement(externalSelectView, bundle.Name);
                        this.LoadPrefab(bundle, element, elementSelector);
                    }
                });
            }
        }
    }

    /**
     * 實體化資源項目
     */
    public Instantiate(): Node {
        const node:__Private_Node = this.m_node || instantiate(this.m_prefab) as __Private_Node;
        const view:ViewBase = node.getComponent(ViewBase) as ViewBase;
        if (!view) {
            // ＊直接拋出錯誤中斷執行，理論上在開發期間就應該修正而非等到正式時產生 runtime error
            throw new Error(`===== ${this.Event.Bundle}.${this.Event.Identifier} Prefab(${this.m_prefab.name}) 建立失敗，無法找到 ViewBase 等相關繼承元件。 =====`);
        }
        node.__supportOrientation = this.m_launchOrientation;
        this.m_view = view;
        return node;
    }

    /**
     * 變更啟動方向
     */
    public RotateLaunchOrientation() {
        this.m_launchOrientation = this.m_launchOrientation == macro.ORIENTATION_LANDSCAPE ? macro.ORIENTATION_PORTRAIT : macro.ORIENTATION_LANDSCAPE;
        (this.m_view.node as __Private_Node).__supportOrientation = this.m_launchOrientation;
    }

    /**
     * 取得資源載入的錯誤
     */
    public GetError(): Error {
        return this.m_error;
    }

    /**
     * 進入背景
     */
    public Background() {
        this.m_inBackground = true;
    }

    /**
     * 進入前景
     */
    public Foreground() {
        this.m_inBackground = false;
    }

    /**
     * 清除設定
     */
    public Clear() {
        this.SortIndex = Number.MAX_SAFE_INTEGER;
        this.m_state = ViewProxyState.UNLOAD;
        this.m_viewState.Forward(ViewState.UNKNOWN);
        this.m_viewState.Tick();
        this.m_error = null;
        this.m_prefab = null;
        this.m_node = null;
        this.m_launchOrientation = macro.ORIENTATION_LANDSCAPE;
        this.m_view = null;
        this.m_inBackground = false;
        this.m_event = null;
        this.m_notifier = null;
        this.m_args = null;
        this.m_reference = false;
        this.m_callStack = null;
        this.m_element = null;
        this.m_injected = false;
    }

    /**
     * 回收可用資訊
     */
    public Recycle() {
        if (!this.m_reference) {
            const proxyLib:ViewProxyLib = ViewProxyLib.Cache.get(this.Event.Hash) || ViewProxyLib.New(this.Event.Bundle, this.Event.IsPersist);
            proxyLib.Storage.push(this.View.node);
            ViewProxyLib.Cache.set(this.Event.Hash, proxyLib);
        }
    }

    /**
     * 載入 Prefab
     * @param bundle 目標 Bundle
     * @param element 介面 ViewElement
     * @param elementSelector 資源直橫版選擇器
     */
    private LoadPrefab(bundle:Bundle, element:ViewElement, elementSelector:(event:ViewEvent,)=>boolean) {
        if (!element) {
            this.m_error = new Error(`Invalid ViewElement for ViewEvent(${this.Event.Identifier})`);
            this.m_state = ViewProxyState.INVALID_ELEMENT;
        } else {
            this.m_element = element;
            this.m_state = ViewProxyState.PREFAB_LOADING;
            this.m_launchOrientation = macro.ORIENTATION_LANDSCAPE;

            let path:string = element.Path;
            if (!elementSelector(this.Event as ViewEvent) && element.PortraitPath) {
                // [裝置是垂直方向且有直版 Prefab]
                path = element.PortraitPath;
                this.m_launchOrientation = macro.ORIENTATION_PORTRAIT;
            }

            bundle.Load(path, (err:Error, prefab:Prefab)=>{
                if (this.m_state != ViewProxyState.PREFAB_LOADING) {
                    // [狀態錯誤] => 不處理
                } else if (err) {
                    this.m_error = err;
                    this.m_state = ViewProxyState.PREFAB_LOAD_FAIL;
                } else {
                    this.m_prefab = prefab;
                    this.m_state = ViewProxyState.LOADED;
                }
            });
        }
    }

    /**
     * 取得 ViewElement
     * @param externalSelectView 外部 ViewElement 選擇器
     * @param bundleName 目標 Bundle 名稱
     */
    private FetchElement(externalSelectView:(event:ViewEvent)=>ViewElement, bundleName:string=null): ViewElement {
        const selectSource:string = this.Event.Extern || bundleName;
        const viewSelect:(_:ViewEvent<ViewEventNotifier>)=>ViewElement = window[selectSource]?.();
        return viewSelect?.(this.Event) || externalSelectView(this.Event);
    }
}

class ViewProxyPool extends Pool<ViewProxy> {
    private static s_pool:ViewProxyPool = new ViewProxyPool();
    public static get Default(): ViewProxyPool { return ViewProxyPool.s_pool; }
    protected Create(): ViewProxy { return new ViewProxy(); }
}

class ViewAnchorPool extends Pool<Node> {
    private static s_pool:ViewAnchorPool = new ViewAnchorPool();
    public static get Default(): ViewAnchorPool { return ViewAnchorPool.s_pool; }
    protected Create(): Node { 
        const viewAnchorRoot:Node = new Node();
        const viewAnchor:Node = new Node("ViewAnchor");
        viewAnchorRoot.addComponent(UITransform);
        viewAnchor.addComponent(UITransform);
        viewAnchorRoot.addChild(viewAnchor);
        return viewAnchorRoot; 
    }
}

export class ViewLayerPool extends Pool<ViewLayer> {
    private static s_pool:ViewLayerPool = new ViewLayerPool();
    public static get Default(): ViewLayerPool { return ViewLayerPool.s_pool; }
    protected Create(): ViewLayer { return new ViewLayer(); }
}

class ViewProxyLib {
    public static Cache:Map<string, ViewProxyLib> = new Map(); // key-value => ViewEvent.Hash-ViewProxyLib
    public static Pool:ViewProxyLib[] = [];
    public static New(bundle:string, persist:boolean): ViewProxyLib { 
        const lib:ViewProxyLib = ViewProxyLib.Pool.pop() || new ViewProxyLib();
        lib.Bundle = bundle;
        lib.Persist = persist;
        return lib; 
    }
    private constructor(public Bundle:string="", public Persist:boolean=false, public Storage:__Private_Node[]=[]) {}

    /**
     * 檢查是否仍然有效
     */
    public Valid(): boolean {
        return !!Bundle.Find(this.Bundle);
    }

    /**
     * 找出支持方向的節點
     * @param isLandscape 預期支持的方向
     */
    public FindSupport(isLandscape:boolean): __Private_Node {
        const orientation:number = isLandscape ? macro.ORIENTATION_LANDSCAPE : macro.ORIENTATION_PORTRAIT;
        for (let i = this.Storage.length-1; i >= 0; i--) {
            const node:__Private_Node = this.Storage[i];
            if (!!(node.__supportOrientation&orientation)) {
                this.Storage.splice(i, 1);
                return node;
            }
        }
        return null;
    }

    /**
     * 清除快取資料
     */
    public Clear() {
        this.Bundle = "";
        this.Persist = false;
        this.Storage.forEach((node:Node)=>node.destroy());
        this.Storage.length = 0;
    }
}

/**
 * 轉場清除快取紀錄
 */
game.once(Game.EVENT_ENGINE_INITED, ()=>{
    director.on(Director.EVENT_BEFORE_SCENE_LAUNCH, ()=>{
        ViewProxyLib.Cache.forEach((proxyLib:ViewProxyLib, key:string, map:Map<string, ViewProxyLib>)=>{
            if (!proxyLib.Persist) {
                proxyLib.Clear();
                map.delete(key);
                ViewProxyLib.Pool.push(proxyLib);
            }
        });
    });
});

export interface ViewLayerDelegate {
    GetViewLayerScope(layer:ViewLayer): Node;
    IsViewLayerPending(layer:ViewLayer): boolean;
    OnViewLayerSelectViewElement(layer:ViewLayer, event:ViewEvent): ViewElement;
    OnViewLayerSelectViewInstance(layer:ViewLayer, event:ViewEvent): ViewPack;
    OnViewLayerBundleDidLoad(layer:ViewLayer, event:ViewEvent, bundle:Bundle, error:Error): void;
    OnViewLayerLoadView(layer:ViewLayer, event:ViewEvent, inBackground:boolean): void|boolean;
    OnViewLayerLoadViewFail(layer:ViewLayer, event:ViewEvent, error:Error): void;
    OnViewLayerLaunchViewFail(layer:ViewLayer, event:ViewEvent): void;
    OnViewLayerSelectViewSourceLandscape(layer:ViewLayer, event:ViewEvent):boolean;

    OnViewLayerPresentView(layer:ViewLayer, event:ViewEvent): void;
    OnViewLayerDidPresentView(layer:ViewLayer, event:ViewEvent, isFullPresent:boolean, deferFullPresentAffect:number): void;
    OnViewLayerPresentViewTimeout(layer:ViewLayer, event:ViewEvent, code:number, silent:boolean, callStack:Error): void;
    OnViewLayerReplaceViewBlock(layer:ViewLayer, event:ViewEvent, opaqueBlock:boolean, darkenBlock:boolean): Node;
    OnViewLayerPresentingView(layer:ViewLayer, event:ViewEvent, isLandscape:boolean): void;
    OnViewLayerResignFullPresentView(layer:ViewLayer, event:ViewEvent): void;
    OnViewLayerWillDismissView(layer:ViewLayer, event:ViewEvent, block:Node, isFullPresent:boolean, animMinimize:boolean): boolean;
    OnViewLayerDismissingView(layer:ViewLayer, event:ViewEvent, isFullPresent:boolean, isTopView:boolean): Vec3|void;
    OnViewLayerDismissView(layer:ViewLayer, event:ViewEvent, isTopView:boolean, minimizeWorldCenter:Vec3): void;
}

export class ViewLayer {
    private m_delegate:ViewLayerDelegate;
    private m_container:Node;

    private m_deferQueue:ViewProxy[];
    private m_lineUpQueue:ViewProxy[];
    private m_viewStack:ViewProxy[];
    private m_inBackground:boolean;

    /**
     * 取得名稱
     */
    public get Name():string { return this.m_container.name; }

    /**
     * 取得顯示中的數量
     */
    public get Count(): number { return this.m_viewStack.length; }

    /**
     * 取得顯示中與準備中的總數數量
     */
    public get Length(): number { return this.m_viewStack.length + this.m_deferQueue.length + this.m_lineUpQueue.length; }

    /**
     * 檢查是否在背景
     */
    public get InBackground(): boolean { return this.m_inBackground; }

    /**
     * 檢查是否完全沒有要顯示的項目
     */
    public get IsEmpty(): boolean { return this.Length==0; }

    constructor() {
        this.m_container = new Node().addComponent(UITransform).node;
        this.m_deferQueue = [];
        this.m_lineUpQueue = [];
        this.m_viewStack = [];
        this.Clear();
    }
    
    /**
     * 指定名稱
     * @param name 名稱
     */
    public SetName(name:string) { 
        this.m_container.name = name;
    }

    /**
     * 指定事件監聽對象
     * @param delegate 監聽對象
     */
    public SetDelegate(delegate:ViewLayerDelegate) { 
        this.m_delegate = delegate; 
    }

    /**
     * 清除設定
     */
    public Clear() {
        this.DrainViewProxy(this.m_deferQueue);
        this.DrainViewProxy(this.m_lineUpQueue);
        this.DrainViewProxy(this.m_viewStack);
        this.m_container.removeFromParent();
        this.m_delegate = null;
        this.m_inBackground = false;
    }

    /**
     * 移除貯列中尚未顯示的介面事件
     * @param event 介面事件
     */
    public Kick(event:ViewEvent<ViewEventNotifier>|IViewEvent) {
        this.KickViewProxy(this.m_deferQueue, event);
        this.KickViewProxy(this.m_lineUpQueue, event);
    }

    /**
     * 強行插入介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public InjectPush(event:ViewEvent<ViewEventNotifier>, ...args:any) {
        this.Prepare(this.m_lineUpQueue, event, ...args)?.Inject();
        this.SortLineUpQueue();
    }

    /**
     * 貯列式開啟介面
     * @param event 介面事件
     * @param args 參數陣列
     */
    public Push(event:ViewEvent<ViewEventNotifier>, ...args:any) {
        this.Prepare(this.m_lineUpQueue, event, ...args);
        this.SortLineUpQueue();
    }

    /**
     * 堆疊式開啟介面
     * @param event 介面事件
     * @param args 參數陣列
     */
    public Open(event:ViewEvent<ViewEventNotifier>, ...args:any) {
        this.Prepare(this.m_deferQueue, event, ...args);
    }

    /**
     * 每幀步進更新
     * @param dt 幀時間
     */
    public Update(dt:number) {
        !this.m_container.parent && this.m_delegate.GetViewLayerScope(this).addChild(this.m_container);

        // 檢查載入狀況
        this.CheckLoading(this.m_deferQueue);
        this.CheckLoading(this.m_lineUpQueue);

        // 試著取得下一個顯示介面
        const next:ViewProxy = this.FetchNext();

        // 試著啟動顯示介面
        this.LaunchNext(next);

        // 更新所有顯示介面
        this.UpdateState();
    }

    /**
     * 每幀的後步進更新
     * @param dt 幀時間
     */
    public PostUpdate(dt:number) {
        this.PostUpdateState();
    }

    /**
     * 進入前景
     */
    public Foreground(): boolean {
        this.m_inBackground = false;
        return this.BlockReplace();
    }

    /**
     * 進入背景
     */
    public Background() {
        this.m_inBackground = true;
    }

    /**
     * 查找目標介面是否已經開啟或準備開啟
     * @param event 介面事件
     */
    public Contains(event:ViewEvent<ViewEventNotifier>|IViewEvent): boolean {
        return !!(
                this.m_viewStack.find(((viewProxy:ViewProxy)=>viewProxy.Event.Hash == event.Hash)) ||
                this.m_deferQueue.find(((viewProxy:ViewProxy)=>viewProxy.Event.Hash == event.Hash)) ||
                this.m_lineUpQueue.find(((viewProxy:ViewProxy)=>viewProxy.Event.Hash == event.Hash))
            );
    }

    /**
     * 逐一返回處理
     * 備註：(1) 介面自己有權決定是否被關閉
     *      (2) 回傳 false 表示有介面接管處理流程，外部不可執行其餘操作
     *      (3) 回傳 true  表示沒有任何介面在處理私有流程，外部可以執行其餘操作
     */
    public NavigateBack(): boolean {
        for (let i = this.m_viewStack.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = this.m_viewStack[i];
            if (!SafeCall(viewProxy.View, viewProxy.View.OnNavigateBack)) {
                // [介面內部私自處理] => 等待介面處理
                return false;
            } else {
                // [介面內部無私自處理的項目] => 直接關閉介面
                SafeCall(viewProxy.View, viewProxy.View.Dismiss);
                return true;
            }
        }
        return true;
    }

    /**
     * 批次關閉顯示中的介面
     * 備註：介面無權決定自己是否可被關閉
     */
    public DismissAll() {
        this.m_viewStack.forEach((viewProxy:ViewProxy)=>viewProxy.View.Dismiss());
    }

    /**
     * 關閉單一介面
     * 備註：若未指定介面事件，則關閉最上層的介面
     */
    public Dismiss(iEvent?:IViewEvent<ViewEventNotifier>|IViewEvent): boolean {
        for (let i = this.m_viewStack.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = this.m_viewStack[i];
            if (!this.IsViewDismiss(viewProxy)) {
                if (!iEvent) {
                    // [關閉最上層的介面]
                    viewProxy.View.Dismiss();
                    return true;
                } else if (viewProxy.Event.Hash == iEvent.Hash) {
                    // [指定關閉介面]
                    viewProxy.View.Dismiss();
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 取得最上層的介面
     */
    public GetTopView(): IViewEvent {
        const storage:ViewProxy[] = this.m_viewStack.length   > 0 ? this.m_viewStack : 
                                    this.m_deferQueue.length  > 0 ? this.m_deferQueue : 
                                    this.m_lineUpQueue.length > 0 ? this.m_lineUpQueue : 
                                    null;

        return storage?.[storage?.length-1]?.Event;
    }

    /**
     * 裝置介面方向改變
     * @param interfaceOrientation 裝置介面方向
     */
    public OnInterfaceOrientationChanged(interfaceOrientation:number): void {
        for (let i = this.m_viewStack.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = this.m_viewStack[i];
            const view:__Private_ViewBase = viewProxy.View;
            if (viewProxy.ViewState.Current < ViewState.WILL_DISMISS && 
               (viewProxy.ViewState.Next == null || viewProxy.ViewState.Next < ViewState.WILL_DISMISS)) {
                SafeCall(view, view.OnInterfaceOrientationChanged, interfaceOrientation);
            }
        }
    }

    /**
     * 排序貯列式介面
     */
    private SortLineUpQueue() {
        this.m_lineUpQueue.sort((f, l)=>{
            if (f.IsInjected && !l.IsInjected) {
                // [前項是強行插入式，後項非強行插入式]
                return -1;
            } else if (!f.IsInjected && l.IsInjected) {
                // [前項非強行插入式，後項是強行插入式]
                return 1;
            } else if (f.Event.Priority != l.Event.Priority) {
                // [前項和後項都不是強行插入式]
                return f.Event.Priority > l.Event.Priority ? -1 : 1;
            } else {
                // [依據索引排序]
                return f.SortIndex - l.SortIndex;
            }
        });
        this.m_lineUpQueue.forEach((viewProxy:ViewProxy, index:number)=>viewProxy.SortIndex = index);
    }

    /**
     * 準備介面開啟資料並塞入容器內
     * @param storage 目標容器
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    private Prepare(storage:ViewProxy[], event:ViewEvent<ViewEventNotifier>, ...args:any): ViewProxy {
        const shouldContinue:void|boolean = this.m_delegate.OnViewLayerLoadView(this, event, this.InBackground || (storage == this.m_lineUpQueue && (storage.length > 0 || this.m_viewStack.length > 0)));
        if (shouldContinue == null ? true : !!shouldContinue) {
            const viewProxy:ViewProxy = ViewProxyPool.Default.Get();
            viewProxy.Bind(event, args);
            viewProxy.LoadAsset(
                (event:ViewEvent)=>{
                    const result:boolean = this.m_delegate?.OnViewLayerSelectViewSourceLandscape(this, event);
                    return result == null ? true : !!result;
                },
                (event:ViewEvent)=>this.m_delegate?.OnViewLayerSelectViewElement(this, event),
                (event:ViewEvent)=>this.m_delegate?.OnViewLayerSelectViewInstance(this, event),
                (event:ViewEvent, bundle:Bundle, error:Error)=>this.m_delegate?.OnViewLayerBundleDidLoad(this, event, bundle, error));
            storage.push(viewProxy);
            return viewProxy
        }
        return null;
    }

    /**
     * 檢查介面資源載入狀況
     * @param storage 目標容器
     */
    private CheckLoading(storage:ViewProxy[]) {
        for (let i = storage.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = storage[i];
            if (viewProxy.GetError()) {
                // 向外通知發生錯誤並移除錯誤項目
                SafeCall(viewProxy.Notifier, viewProxy.Notifier?.OnViewPresentFail, viewProxy.Event, ViewPresentFailReason.LOADING, viewProxy.GetError());
                this.m_delegate.OnViewLayerLoadViewFail(this, viewProxy.Event as ViewEvent, viewProxy.GetError());
                storage.splice(i, 1);
            }
        }
    }

    /**
     * 檢查介面是否即將關閉或為關閉中的狀態
     * @param viewProxy ViewProxy 元件
     */
    private IsViewDismiss(viewProxy:ViewProxy): boolean {
        return viewProxy.ViewState.Current >= ViewState.WILL_DISMISS || viewProxy.ViewState.Next >= ViewState.WILL_DISMISS;
    }

    /**
     * 取得下一個顯示項目
     */
    private FetchNext(): ViewProxy {
        let next:ViewProxy;
        if (!this.m_delegate.IsViewLayerPending(this)) {
            // [開啟準備]
            if (this.m_deferQueue.length > 0) {
                // [處理堆疊中] => 堆疊中的要依序開啟，前項沒有完成前後項不能挑出
                if (this.m_deferQueue[0].State == ViewProxyState.LOADED) {
                    // [載入完成] => 移至準備開啟
                    next = this.m_deferQueue.shift();
                }
            } else if (this.m_lineUpQueue.length > 0) {
                // [處理排隊中]

                // 沒有正在顯示中的介面 => 直接算是準備完成
                let isReady:boolean = this.m_viewStack.length <= 0;

                if (!isReady) {
                    // [有正在顯示中的介面] => 檢查是不是其實都在準備關閉中，如果是的話也可以當作準備完成
                    isReady = true;
                    for (let i = 0; i < this.m_viewStack.length; i++) {
                        isReady &&= this.IsViewDismiss(this.m_viewStack[i]);
                        if (!isReady) {
                            break;
                        }
                    }
                }

                if (isReady && this.m_lineUpQueue[0].State == ViewProxyState.LOADED) {
                    // [載入完成] => 移至準備開啟
                    next = this.m_lineUpQueue.shift();
                }
            }
        }
        return next;
    }

    /**
     * 更新介面階段狀態
     */
    private UpdateState() {
        let findForeground:boolean = false;
        for (let i = this.m_viewStack.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = this.m_viewStack[i];
            const view:__Private_ViewBase = viewProxy.View;

            if (this.m_inBackground) {
                // [Layer 在背景] => 所有介面都進入背景
                viewProxy.Background();
            } else if (findForeground) {
                // [Layer 在前景且已經找到最上層顯示的介面] => 其餘介面都進入背景
                viewProxy.Background();
            } else {
                // [Layer 在前景且還沒找到最上層顯示的介面] => 找出適合的介面並將其進入前景
                viewProxy.Foreground();
                findForeground = true;
            }

            switch (viewProxy.ViewState.Tick()) {
                case ViewState.WAITING_READY: {
                    if (viewProxy.ViewState.IsEntering()) {
                        const viewAnchorRoot:Node = ViewAnchorPool.Default.Get();
                        const viewAnchor:Node = viewAnchorRoot.children[0];
                        SafeCall(view, view.SetViewAnchor, viewAnchor);
                        viewAnchorRoot.name = view.node.name;
                        viewAnchor.addChild(view.node);
                        this.m_container.addChild(viewAnchorRoot);
                        viewAnchorRoot.setSiblingIndex(0);
                        viewProxy.Event.DoVisit();
                        SafeCall(view, view.OnAwake, viewProxy.Reuse);
                        this.m_delegate.OnViewLayerPresentView(this, viewProxy.Event as ViewEvent);
                    }
                    if (view.DidDismiss) {
                        // [介面要求關閉]
                        SafeCall(view, view.OnViewSelfWillDismiss);
                        viewProxy.ViewState.Forward(ViewState.WILL_DISMISS);
                    } else if (viewProxy.ViewState.IsTimeout()) {
                        // [準備逾時]
                        viewProxy.ViewState.Forward(ViewState.TIMEOUT);
                    } else if (view.DidPresent) {
                        // [準備完成]
                        viewProxy.Event.DoVisit(true);
                        this.BlockReplace(viewProxy);
                        SafeCall(viewProxy.Notifier, viewProxy.Notifier?.OnViewPresent, viewProxy.Event);
                        this.m_delegate.OnViewLayerDidPresentView(this, viewProxy.Event as ViewEvent, viewProxy.View.IsFullPresent(), viewProxy.View.DeferFullPresentAffect());
                        viewProxy.ViewState.Forward(ViewState.WILL_BECOME_ACTIVE);
                    }
                    break;
                }
                case ViewState.TIMEOUT: {
                    const code:number = SafeCall(view, view.OnViewSelfPrepareTimeout);
                    const silent:boolean = SafeCall(view, view.ViewSelfSilentTimeout);
                    SafeCall(viewProxy.Notifier, viewProxy.Notifier?.OnViewPresentFail, viewProxy.Event, ViewPresentFailReason.TIMEOUT);
                    this.m_delegate.OnViewLayerPresentViewTimeout(this, viewProxy.Event as ViewEvent, code, silent == true, viewProxy.CallStack);
                    SafeCall(view, view.OnViewSelfWillDismiss);
                    viewProxy.ViewState.Forward(ViewState.WILL_DISMISS);
                    break;
                }
                case ViewState.WILL_BECOME_ACTIVE: {
                    if (viewProxy.ViewState.IsEntering()) {
                        SafeCall(view, view.OnViewSelfWillBecomeActive);
                    }
                    if (view.DidDismiss) {
                        // [介面要求關閉]
                        SafeCall(view, view.OnViewSelfWillBecomeInActive);
                        viewProxy.ViewState.Forward(ViewState.BECOME_INACTIVE);
                    } else if (viewProxy.InBackground) {
                        // [進入背景]
                        SafeCall(view, view.OnViewSelfWillBecomeInActive);
                        viewProxy.ViewState.Forward(ViewState.BECOME_INACTIVE);
                    } else {
                        viewProxy.ViewState.Forward(ViewState.RUNNING);
                    }
                    break;
                }
                case ViewState.RUNNING: {
                    if (viewProxy.ViewState.IsEntering()) {
                        SafeCall(view, view.OnViewSelfDidBecomeActive);
                        this.BlockReplace(viewProxy);
                        this.m_delegate.OnViewLayerPresentingView(this, viewProxy.Event as ViewEvent, viewProxy.IsLandscape);
                    }
                    if (view.WantResignFullPresent && !view.DidResignFullPresent) {
                        SafeCall(view, view.ConfirmResignFullPresent);
                        this.m_delegate.OnViewLayerResignFullPresentView(this, viewProxy.Event as ViewEvent);
                    }
                    if (view.DidDismiss) {
                        // [介面要求關閉]
                        SafeCall(view, view.OnViewSelfWillBecomeInActive);
                        viewProxy.ViewState.Forward(ViewState.BECOME_INACTIVE);
                    } else if (viewProxy.InBackground) {
                        // [進入背景]
                        SafeCall(view, view.OnViewSelfWillBecomeInActive);
                        viewProxy.ViewState.Forward(ViewState.BECOME_INACTIVE);
                    }
                    break;
                }
                case ViewState.BECOME_INACTIVE: {
                    if (viewProxy.ViewState.IsEntering()) {
                        SafeCall(view, view.OnViewSelfDidBecomeInActive);
                    }
                    if (view.DidDismiss) {
                        // [介面要求關閉]
                        SafeCall(view, view.OnViewSelfWillDismiss);
                        viewProxy.ViewState.Forward(ViewState.WILL_DISMISS);
                    } else if (!viewProxy.InBackground) {
                        // [回到前景]
                        viewProxy.ViewState.Forward(ViewState.WILL_BECOME_ACTIVE);
                    }
                    break;
                }
            }
        }
    }

    /**
     * 後更新介面階段狀態
     */
    private PostUpdateState(force:boolean=false) {
        for (let i = this.m_viewStack.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = this.m_viewStack[i];
            const view:__Private_ViewBase = viewProxy.View;
            const viewAnchor:Node = view.node.parent;
            const viewAnchorRoot:Node = viewAnchor.parent;

            if (viewProxy.ViewState.Current >= ViewState.WILL_DISMISS) {
                // [確認是要關閉的介面]
                switch (viewProxy.ViewState.Current) {
                    case ViewState.WILL_DISMISS: {
                        if (viewProxy.ViewState.IsEntering()) {
                            const presentFail:boolean = viewProxy.ViewState.Prev == ViewState.WAITING_READY || viewProxy.ViewState.Prev == ViewState.TIMEOUT;
                            const shouldAnimMinimize:boolean = !ViewBase.ANIMATED_MINIMIZE ? false : SafeCall(view, view.ShouldAnimMinimize);
                            const changeOrientation:boolean = this.m_delegate.OnViewLayerWillDismissView(this, viewProxy.Event as ViewEvent, viewAnchorRoot.children.length == 1 ? null : viewAnchorRoot.children[0], viewProxy.View.IsFullPresent()&&!viewProxy.View.DidResignFullPresent, shouldAnimMinimize);
                            const isVisiualTopView:boolean = i == this.m_viewStack.length-1;
                            const isLogicalTopView:boolean = !isVisiualTopView && this.IsLogicalTopView(i);

                            if (isLogicalTopView) {
                                // [邏輯上的最上層] => 將介面視覺上的移到最上層
                                viewAnchorRoot.setSiblingIndex(TEMP_HIGHEST_ZORDER);
                            }

                            if (force || !shouldAnimMinimize || presentFail || !changeOrientation) {
                                // [強制結束或沒有要到話關閉或沒有轉向處理] => 直接關閉
                                viewProxy.ViewState.Forward(presentFail ? ViewState.FORCE_DISMISS : ViewState.DISMISS);
                            } else {
                                // [等待轉向完成]
                                tween(viewAnchorRoot)
                                    .delay(WAIT_ORIETATION_COMPLETE)
                                    .call(()=>viewProxy.ViewState.Forward(ViewState.DISMISS))
                                    .start();
                            }
                        }
                        break;
                    }
                    case ViewState.DISMISS:
                    case ViewState.FORCE_DISMISS: {
                        if (viewProxy.ViewState.IsEntering()) {
                            const isVisiualTopView:boolean = i == this.m_viewStack.length-1;
                            const isLogicalTopView:boolean = !isVisiualTopView && this.IsLogicalTopView(i);
                            const isTopView:boolean = isVisiualTopView || isLogicalTopView;
                            const presentFail:boolean = viewProxy.ViewState.Current == ViewState.FORCE_DISMISS;
                            const defaultWorldMinimizeCenter:Vec3 = this.m_delegate.OnViewLayerDismissingView(this, viewProxy.Event as ViewEvent, viewProxy.View.IsFullPresent()&&!viewProxy.View.DidResignFullPresent, isTopView) as Vec3;
                            const worldMinimizeCenter:Vec3 = SafeCall(view, view.MinimizeWorldLocation) ?? defaultWorldMinimizeCenter;                        
                            const minimizeCenter:Vec3 = !worldMinimizeCenter ? null : viewAnchor.parent.getComponent(UITransform).convertToNodeSpaceAR(worldMinimizeCenter);
                            const shouldAnimMinimize:boolean = ViewBase.ANIMATED_MINIMIZE && !force && !presentFail && isTopView;
                            SafeCall(view, view.Minimize, shouldAnimMinimize, minimizeCenter, worldMinimizeCenter);
                        }
                        if (view.DidMinimize) {
                            const isVisiualTopView:boolean = i == this.m_viewStack.length-1;
                            const isLogicalTopView:boolean = !isVisiualTopView && this.IsLogicalTopView(i);
                            const isTopView:boolean = isVisiualTopView || isLogicalTopView;

                            viewAnchorRoot.children.forEach((child:Node)=>child != viewAnchor && child.removeFromParent());
                            viewAnchorRoot.removeFromParent();
                            ViewAnchorPool.Default.Put(viewAnchorRoot);

                            const minimizeWorldCenter:Vec3 = view.MinimizeWorldCenter;
                            this.m_viewStack.splice(i, 1);

                            SafeCall(view, view.OnViewSelfDidDismiss);
                            SafeCall(viewProxy.Notifier, viewProxy.Notifier?.OnViewDismiss, viewProxy.Event);

                            SafeCall(view, view.OnSleep);
                            SafeCall(view, view.Reset);
                            viewAnchor.removeAllChildren();
                            this.ReleaseViewProxy(viewProxy, !DESTROY_NODE_IMMEDIATELY_ON_TIMEOUT ? false : viewProxy.ViewState.Current == ViewState.FORCE_DISMISS);

                            this.m_delegate.OnViewLayerDismissView(this, viewProxy.Event as ViewEvent, isTopView, minimizeWorldCenter);
                            viewProxy.Clear();
                            ViewProxyPool.Default.Put(viewProxy);
                        }
                        break;
                    }
                }
            }
        }
    }

    /**
     * 啟動指定的介面
     * @param next 將啟動的介面
     */
    private LaunchNext(next:ViewProxy) {
        if (next) {
            next.Instantiate();
            next.ViewState.Forward(ViewState.WAITING_READY, next.View.ViewSelfPrepareTime?.());
            if (next.CanRotateLaunchOrientation &&
                SafeCall(next.View, next.View.RotateOrientation, ...[next.IsLandscape, ...next.Args])
            ) {
                next.RotateLaunchOrientation();
            }
            SafeCall(next.View, next.View.SetBundleName, next.Event.Bundle);
            SafeCall(next.View, next.View.ConfirmViewLaunchInLandscape, next.IsLandscape);
            SafeCall(next.View, next.View.SetViewEventNotifier, next.Notifier);
            if (SafeCall(next.View, next.View.LaunchOption, ...next.Args) === false) {
                // [啟動失敗] => 直接關閉並回收相關資源
                SafeCall(next.View, next.View.Reset);
                this.m_delegate.OnViewLayerLaunchViewFail(this, next.Event);
                this.ReleaseViewProxy(next);
                next.Clear();
                ViewProxyPool.Default.Put(next);
            } else {
                // [啟動成功]
                this.m_viewStack.push(next);
            }
        }
    }

    /**
     * 回收 ViewProxy 元件
     * @param storage 目標容器
     */
    private DrainViewProxy(storage:ViewProxy[]) {
        for (let i = storage.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = storage[i];
            if (viewProxy.ViewState.Current != ViewState.UNKNOWN) {
                // [顯示中的介面] => 執行關閉並等待回收處理
                viewProxy.View.Dismiss();
            } else {
                // [還沒在場上顯示]
                if (viewProxy.ViewState.Next != null) {
                    // [載入完成且準備要顯示] => 要把 node 銷毀
                    this.ReleaseViewProxy(viewProxy);
                }
                storage.splice(i, 1);
                viewProxy.Clear();
                ViewProxyPool.Default.Put(viewProxy);
            }
        }

        while (storage.length > 0) {
            // [有正在運作的介面] => 強制跑完生命週期
            this.UpdateState();
            this.PostUpdateState(true);
        }

        storage.length = 0;
    }

    /**
     * 剔除 ViewProxy 元件
     * @param storage 目標容器
     * @param event 介面事件
     */
    private KickViewProxy(storage:ViewProxy[], event:ViewEvent<ViewEventNotifier>|IViewEvent) {
        for (let i = storage.length-1; i >= 0; i--) {
            const viewProxy:ViewProxy = storage[i];
            if (viewProxy.Event.Hash == event.Hash) {
                storage.splice(i, 1);
                viewProxy.Clear();
                ViewProxyPool.Default.Put(viewProxy);
            }
        }
    }

    /**
     * ViewProxy 內容釋放處理
     * @param viewProxy ViewProxy 元件
     * @param force 強制銷毀
     */
    private ReleaseViewProxy(viewProxy:ViewProxy, force:boolean=false) {
        if (viewProxy.Event.IsDisposible || force) {
            // [不可重複利用] => 直接銷毀
            viewProxy.View.node.destroy();
        } else {
            // [可重複利用的]
            viewProxy.Recycle();
        }
    }

    /**
     * 計算遮黑介面應該所在的層級
     * @param view 當前主顯示介面
     */
    private BlockReplace(viewProxy:ViewProxy=null): boolean {
        if (!viewProxy) {
            // [沒有指定的 ViewProxy] => 從最上層開始往下找一個還沒要關閉的
            for (let i = this.m_viewStack.length-1; i >= 0; i--) {
                const nextViewProxy:ViewProxy = this.m_viewStack[i];
                if (!this.IsViewDismiss(nextViewProxy)) {
                    viewProxy = nextViewProxy;
                    break;
                }
            }
        }

        if (viewProxy) {
            const viewAnchorRoot:Node = viewProxy.View.node.parent.parent;
            if (viewAnchorRoot.children.length == 1) {
                const block:Node = this.m_delegate.OnViewLayerReplaceViewBlock(this, viewProxy.Event, viewProxy.View.IsFullPresent() ? false : viewProxy.View.OpaqueBlock(), viewProxy.View.DarkenBlock());
                if (block) {
                    viewAnchorRoot.addChild(block);
                    block.setSiblingIndex(-1);
                }
            }

            // 重新排列所有節點
            let index:number = 0;
            this.m_viewStack.forEach((proxy:ViewProxy)=>{
                const viewAnchorRoot:Node = proxy.View.node.parent.parent;
                if (viewAnchorRoot.getSiblingIndex() != TEMP_HIGHEST_ZORDER) {
                    viewAnchorRoot.setSiblingIndex(index++);
                }
            });
        }

        return !!viewProxy;
    }

    /**
     * 判斷指定索引位置的 ViewProxy 是否為邏輯上的最上層
     * @param fromIndex 指定索引位置
     */
    private IsLogicalTopView(fromIndex:number) {
        let isTopView = true;

        for (let i = fromIndex+1; i < this.m_viewStack.length; i++) {
            const viewProxyAbove:ViewProxy = this.m_viewStack[i];
            isTopView &&= viewProxyAbove.ViewState.Current <= ViewState.WILL_BECOME_ACTIVE;
            if (!isTopView) {
                break;
            }
        }

        return isTopView;
    }
}