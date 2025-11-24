import { Director, director, game, Node, UITransform, error, Vec3, ParticleSystem2D, ParticleAsset, NodePool } from 'cc';
import { DEBUG, EDITOR } from 'cc/env';
import { ViewBlock } from './ViewBlock';
import { Bundle } from '../../Bundle/Bundle';
import { ViewSection, ViewSectionDelegate } from './ViewSection';
import { ViewElement, ViewEvent, ViewEventNotifier, ViewStateDelegate, IViewEvent, ViewPack } from './ViewTypes';

function SafeCall(target:Object, func:Function, ...args:any[]) {
    if (DEBUG) {
        return func?.apply(target, args);
    } else {
        try { return func?.apply(target, args); }
        catch (err) { error(err); }
    }
}

/**
 * 多點觸控啟閉控制
 * @param enable 是否啟用多點觸控
 */
function MultiTouchEnabled(enable:boolean): void {
    globalThis.__MAX_TOUCHES__ = enable ? 0 : 1;
}

// 縮小特效的粒子噴發時間(單位：秒)
const MINIMIZE_PARTICLE_DURATION:number = 0.3;
// 縮小特效的單顆粒子生命時間(單位：秒)
const MINIMIZE_PARTICLE_LIFE:number = 1.5;

class PresentStatus {
    public Count:number;
    public Finish:boolean;
    constructor () { this.Clear(); }
    public Clear() {
        this.Count = 0;
        this.Finish = true;
    }
}

export interface ViewSystemDelegate {
    OnViewSystemUpdate(dt:number): void;
    ShouldEnableBlock(): boolean;
}

export class ViewSystem {
    private m_pause:number;
    private m_sectionList:ViewSection[];
    private m_sectionMap:Map<number, ViewSection>;
    private m_sectionDelegate:ViewSectionDelegate;
    private m_blockPool:NodePool;
    private m_presentStatus:PresentStatus;
    private m_delegate:Partial<ViewStateDelegate>;
    private m_fullPresentQueue:ViewEvent[];
    private m_fullPresentTimer:number;
    private m_deferFullPresentAffect:number;
    private m_minimizeEffectScope:Node;
    private m_systemDelegate:Partial<ViewSystemDelegate>;

    /**
     * 取得顯示中的數量
     */
    public get Count(): number {
        let count:number = 0;
        this.m_sectionList.forEach((section:ViewSection)=> { count += section.Count });
        return count;
    }

    /**
     * 取得顯示中與準備中的總數數量
     */
    public get Length(): number {
        let length:number = 0;
        this.m_sectionList.forEach((section:ViewSection)=> { length += section.Length });
        return length;
    }

    /**
     * 目前是否暫停中
     */
    public get IsPaused(): boolean {
        return this.m_pause > 1;
    }

    /**
     * 指定事件通知對象
     */
    public set Delegate(delegate:Partial<ViewStateDelegate>) {
        this.m_delegate = delegate;
    }

    constructor(systemDelegate?:Partial<ViewSystemDelegate>) {
        this.m_pause = 1;
        this.m_sectionList = [];
        this.m_sectionMap = new Map();
        this.m_presentStatus = new PresentStatus();
        this.m_fullPresentQueue = [];
        this.m_fullPresentTimer = null;
        this.m_deferFullPresentAffect = null;
        this.m_sectionDelegate = {
            IsViewSectionPending: this.IsViewSectionPending.bind(this),
            OnViewSectionLoadView: this.OnViewSectionLoadView.bind(this),
            OnViewSectionLoadViewFail: this.OnViewSectionLoadViewFail.bind(this),
            OnViewSectionLaunchViewFail: this.OnViewSectionLaunchViewFail.bind(this),
            OnViewSectionSelectViewSourceLandscape: this.OnViewSectionSelectViewSourceLandscape.bind(this),
            OnViewSectionBundleDidLoad: this.OnViewSectionBundleDidLoad.bind(this),
            OnViewSectionPresentView: this.OnViewSectionPresentView.bind(this),
            OnViewSectionWillDismissView: this.OnViewSectionWillDismissView.bind(this),
            OnViewSectionDismissingView: this.OnViewSectionDismissingView.bind(this),
            OnViewSectionDismissView: this.OnViewSectionDismissView.bind(this),
            OnViewSectionSelectViewElement: this.OnViewSectionSelectViewElement.bind(this),
            OnViewSectionSelectViewInstance: this.OnViewSectionSelectViewInstance.bind(this),
            OnViewSectionReplaceViewBlock: this.OnViewSectionReplaceViewBlock.bind(this),
            OnViewSectionDidPresentView: this.OnViewSectionDidPresentView.bind(this),
            OnViewSectionPresentViewTimeout: this.OnViewSectionPresentViewTimeout.bind(this),
            OnViewSectionPresentingView: this.OnViewSectionPresentingView.bind(this),
            OnViewSectionResignFullPresentView: this.OnViewSectionResignFullPresentView.bind(this),
        };
        if (!EDITOR) {
            // [預設創立一個]
            const preCreate:ViewBlock = this.CreateBlock();
            preCreate && this.m_blockPool.put(preCreate.node);
        }

        if (systemDelegate) {
            systemDelegate.OnViewSystemUpdate = this.Update.bind(this);
        } else {
            director.on(Director.EVENT_AFTER_UPDATE, this.Update, this);
        }
        this.m_systemDelegate = systemDelegate;
    }

    /**
     * 暫停運作
     */
    public Pause() {
        this.m_pause <<= 1;
    }

    /**
     * 恢復運作
     */
    public Resume() {
        this.m_pause >>= 1;
    }

    /**
     * 綁定 ViewSection 用以顯示介面的節點容器
     * @param sectionId ViewSection ID
     * @param scope 節點容器
     */
    public BindScope(sectionId:number, scope:Node) {
        let section:ViewSection = this.m_sectionMap.get(sectionId);
        if (!section) {
            section = new ViewSection(sectionId);
            this.m_sectionMap.set(sectionId, section);
            this.m_sectionList.push(section);
            this.m_sectionList.sort((f:ViewSection, l:ViewSection)=>f.Id<l.Id?-1:1);
        }
        section.Bind(scope);
        section.SetDelegate(this.m_sectionDelegate);
    }

    /**
     * 指定介面最小化的效果作用節點容器
     * @param scope 節點容器
     * @param bundle 粒子資源所在 Bundle
     * @param assetPath 粒子資源路徑
     */
    public SetMinimizeParticleEffect(scope:Node, bundle:string, assetPath:string) {
        this.m_minimizeEffectScope = scope;
        Bundle.Load(bundle, (bundleError:Error, bundle:Bundle)=>{
            if (bundleError) {
                error("ViewSystem.SetMinimizeParticleEffect.loadBundle fail:", bundleError.message);
                return;
            }

            bundle.Load(assetPath, ParticleAsset, (assetError:Error, asset:ParticleAsset)=>{
                if (assetError) {
                    error("ViewSystem.SetMinimizeParticleEffect.loadAsset fail:", assetError.message);
                    return;
                }

                asset.addRef();
                const effectNode = new Node("MinimizeEffect");
                const particle = effectNode.addComponent(ParticleSystem2D);
                particle.file = asset;
                effectNode.parent = this.m_minimizeEffectScope;
                particle.stopSystem();
            });
        });
    }

    /**
     * 移除貯列中尚未顯示的介面事件
     * @param event 介面事件
     */
    public Kick(event:ViewEvent<ViewEventNotifier>|IViewEvent) {
        this.m_sectionList.forEach((section:ViewSection)=>section.Kick(event));
    }

    /**
     * 清除設定
     * 備註：轉場前應先執行此方法避免錯誤釋放
     */
    public Clear() {
        MultiTouchEnabled(false);
        this.m_fullPresentQueue.length > 0 && SafeCall(this.m_delegate, this.m_delegate?.OnViewExitFullScreen);
        this.m_sectionList.forEach(this.ClearFunc);
        this.m_presentStatus.Clear();
        this.m_pause = 1;
        this.m_fullPresentQueue.length = 0;
        this.m_fullPresentTimer = null;
        this.m_deferFullPresentAffect = null;
    }

    /**
     * 查找目標介面是否已經開啟或準備開啟
     * @param event 介面事件
     */
    public Contains(event:ViewEvent<ViewEventNotifier>|IViewEvent): boolean {
        for (let section of this.m_sectionList) {
            if (section.Contains(event)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 批次關閉顯示中的介面
     * 備註：介面無權決定自己是否可被關閉
     */
    public DismissAll() {
        this.m_sectionList.forEach((section:ViewSection)=>section.DismissAll());
    }

    /**
     * 關閉單一介面
     * 備註：若未指定介面事件，則關閉最上層的介面
     * 注意：此方法為強制關閉，介面本身無權決定是否可跳過關閉行為，主要用於該介面外的機制、流程控制
     */
    public Dismiss(iEvent?:IViewEvent<ViewEventNotifier>|IViewEvent) {
        for (let i = this.m_sectionList.length-1; i >= 0; i--) {
            const section:ViewSection = this.m_sectionList[i];
            if (section.Count > 0 && section.Dismiss(iEvent)) {
                // [關閉最上層的介面、找到指定的介面]
                break;
            }
        }
    }

    /**
     * 於指定的 ViewSection 強行插入介面
     * @param sectionId ViewSection ID
     * @param iEvent 介面事件
     * @param args 介面開啟參數
     */
    public SectionInjectPush(sectionId:number, iEvent:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        const section:ViewSection = this.m_sectionMap.get(sectionId);
        return !section ? false : this.SectionAction(section, section.InjectPush, iEvent, ...args);
    }

    /**
     * 於指定的 ViewSection 貯列式開啟介面
     * @param sectionId ViewSection ID
     * @param iEvent 介面事件
     * @param args 參數陣列
     */
    public SectionPush(sectionId:number, iEvent:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        const section:ViewSection = this.m_sectionMap.get(sectionId);
        return !section ? false : this.SectionAction(section, section.Push, iEvent, ...args);
    }

    /**
     * 於指定的 ViewSection 堆疊式開啟介面
     * @param sectionId ViewSection ID
     * @param iEvent 介面事件
     * @param args 參數陣列
     */
    public SectionOpen(sectionId:number, iEvent:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        const section:ViewSection = this.m_sectionMap.get(sectionId);
        return !section ? false : this.SectionAction(section, section.Open, iEvent, ...args);
    }

    /**
     * 裝置介面方向改變
     * @param interfaceOrientation 裝置介面方向
     */
    public OnInterfaceOrientationChanged(interfaceOrientation:number): void {
        this.m_sectionList.forEach((section:ViewSection)=>section.OnInterfaceOrientationChanged(interfaceOrientation));
    }

    /**
     * 逐一返回處理
     * 備註：(1) 介面自己有權決定是否被關閉
     *      (2) 回傳 false 表示有介面接管處理流程，外部不可執行其餘操作
     *      (3) 回傳 true  表示沒有任何介面在處理私有流程，外部可以執行其餘操作
     * 注意：(1) 此方法為選擇性關閉，介面可以決定是否將自己關閉，主要用於 Android 返回鍵
     *      (2) 此方法原則上不對外直接開放使用，一般請使用 Dismiss
     */
    public NavigateBack(): boolean {
        for (let i = this.m_sectionList.length-1; i >= 0; i--) {
            const section:ViewSection = this.m_sectionList[i];
            if (section.Count > 0) {
                return section.NavigateBack();
            }
        }
        return true;
    }

    /**
     * 巡覽 ViewSection 列表
     * @param iterator 巡覽器
     */
    protected SectionIterate(iterator:(viewSection:ViewSection)=>boolean): void {
        if (iterator) {
            for (let i = 0; i < this.m_sectionList.length; i++) {
                if (!!iterator(this.m_sectionList[i])) {
                    break;
                }
            }
        }
    }

    /**
     * 客製化清除處理
     * @param section ViewSection 對象 
     */
    protected ClearFunc(section:ViewSection) {
        section.Clear();
    }

    /**
     * 取得目標 ViewSection
     * @param sectionId ViewSection ID
     */
    protected GetSection(sectionId:number): ViewSection {
        return this.m_sectionMap.get(sectionId);
    }

    /**
     * 執行 ViewSection 動作
     * @param section ViewSection 對象
     * @param action 動作函數
     * @param iEvent 介面事件
     * @param args 介面開啟參數
     */
    private SectionAction(section:ViewSection, action:(event:ViewEvent<ViewEventNotifier>, ...args:any)=>void, iEvent:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        const event:ViewEvent = iEvent as ViewEvent<ViewEventNotifier>;
        if ((this.IsPaused || !event.IsMulti) && this.Contains(event)) {
            // [暫停期間或不允許多開的介面]
            // ＊暫停期間以一個開啟為主
            return false;
        }

        action.call(section, event, ...args);
        this.ClearEvent(event);
        return true;
    }

    /**
     * 每幀步進更新
     */
    private Update() {
        const dt:number = game.deltaTime;
        for (let i = 0; i < this.m_sectionList.length; i++) {
            this.m_sectionList[i].Update(dt);
        }
        for (let j = this.m_sectionList.length-1; j >= 0; j--) {
            this.m_sectionList[j].PostUpdate(dt);
        }
        this.CheckFullPresent(dt);
    }

    /**
     * 檢查延遲全畫面顯示通知
     * @param dt 幀時間
     */
    private CheckFullPresent(dt:number) {
        if (this.m_fullPresentTimer != null && this.m_deferFullPresentAffect != null && this.m_fullPresentQueue.length > 0) {
            this.m_fullPresentTimer += dt;
            if (this.m_fullPresentTimer >= this.m_deferFullPresentAffect) {
                this.m_fullPresentTimer = null;
                this.m_deferFullPresentAffect = null;
                SafeCall(this.m_delegate, this.m_delegate?.OnViewEnterFullScreen);
            }
        }
    }

    /**
     * 清除事件中的動態設定參數
     */
    private ClearEvent(event:ViewEvent<ViewEventNotifier>) {
        event.SetLayer(null);
        event.SetNotifier(null);
    }

    /**
     * 建立遮黑元件
     */
    private CreateBlock(): ViewBlock {
        if (this.m_systemDelegate?.ShouldEnableBlock?.() === false) {
            return null;
        }
        const block:ViewBlock = (this.m_blockPool = this.m_blockPool || new NodePool()).get()?.getComponent(ViewBlock) || ViewBlock.Create();
        block.Reset();
        return block;
    }

    /**
     * 發射最小化效果
     * @param minimizeWorldCenter 最小化世界座標中心
     */
    private EmitMinimizeEffect(minimizeWorldCenter:Vec3) {
        if (minimizeWorldCenter && this.m_minimizeEffectScope && this.m_minimizeEffectScope.children.length > 0) {
            const effectNode:Node = this.m_minimizeEffectScope.children[0];
            const particle:ParticleSystem2D = effectNode.getComponent(ParticleSystem2D);
            particle.life = MINIMIZE_PARTICLE_LIFE;
            particle.duration = MINIMIZE_PARTICLE_DURATION;
            effectNode.setPosition(this.m_minimizeEffectScope.getComponent(UITransform).convertToNodeSpaceAR(minimizeWorldCenter));
            particle.stopSystem();
            particle.resetSystem();
        }
    }

//#region ViewSectionDelegate
    /**
     * 回傳 ViewSection 是否為暫停中
     * @param section 檢查是否暫停的 ViewSection
     */
    protected IsViewSectionPending(section:ViewSection): boolean {
        return this.IsPaused;
    }

    /**
     * 介面載入失敗
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param inBackground 是否為背景載入
     */
    protected OnViewSectionLoadView(section:ViewSection, event:ViewEvent, inBackground:boolean): void|boolean {
        return SafeCall(this.m_delegate, this.m_delegate?.OnViewLoadView, event, inBackground);
    }

    /**
     * 介面載入失敗
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param err 錯誤物件
     */
    protected OnViewSectionLoadViewFail(section:ViewSection, event:ViewEvent, err:Error) {
        if (DEBUG) error(err);
        director.once(Director.EVENT_BEFORE_UPDATE, () => SafeCall(this.m_delegate, this.m_delegate?.OnViewLoadViewFail, event, err));
    }

    /**
     * 介面啟動失敗
     * @param layer 介面所屬 ViewSection
     * @param event 介面事件
     */
    protected OnViewSectionLaunchViewFail(section:ViewSection, event:ViewEvent) {
        SafeCall(this.m_delegate, this.m_delegate?.OnViewLaunchViewFail, event);
    }

    /**
     * 介面事件 Bundle 為 resources，和預設對象索取 ViewElement
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     */
    protected OnViewSectionSelectViewElement(section:ViewSection, event:ViewEvent): ViewElement {
        return SafeCall(this.m_delegate, this.m_delegate?.OnViewSelectViewElement, event);
    }

    /**
     * 介面事件 Bundle 為 null，亦指為 DynamicViewEvent，和預設對象索取 Prefab
     * @param sectin 介面所屬 ViewSection
     * @param event 介面事件
     * 備註：預設對象應自行決定好該回傳直版 Prefab|Node 或橫版 Prefab|Node
     */
    protected OnViewSectionSelectViewInstance(sectin:ViewSection, event:ViewEvent): ViewPack {
        return SafeCall(this.m_delegate, this.m_delegate?.OnViewSelectViewInstance, event);
    }

    /**
     * 依據當前狀況回傳應載入直版或橫版介面
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     */
    protected OnViewSectionSelectViewSourceLandscape(section:ViewSection, event:ViewEvent): boolean {
        return SafeCall(this.m_delegate, this.m_delegate?.OnViewSelectViewSourceLandscape, event);
    }

    /**
     * 介面載入 Bundle
     * @param layer 介面所屬 ViewLayer
     * @param event 介面事件
     * @param bundle 載入的 Bundle
     * @param error 錯誤訊息
     */
    protected OnViewSectionBundleDidLoad(section:ViewSection, event:ViewEvent, bundle:Bundle, error:Error) {
        SafeCall(this.m_delegate, this.m_delegate?.OnViewBundleDidLoad, event, bundle, error);
    }

    /**
     * 介面顯示於場上
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     */
    protected OnViewSectionPresentView(section:ViewSection, event:ViewEvent) {
        let isFirst:boolean = false;

        this.m_sectionList.forEach((viewSection:ViewSection)=>{
            if (viewSection.Id < section.Id) {
                // 所有小於層級順序的 Section 一律進入背景
                viewSection.Background();
            }
        });

        if (this.m_presentStatus.Count++ <= 0 && this.m_presentStatus.Finish == true) {
            // [第一個介面開啟]
            this.m_presentStatus.Finish = false;
            isFirst = true;
        }

        SafeCall(this.m_delegate, this.m_delegate?.OnViewPresent, event, isFirst);
    }

    /**
     * 介面準備逾時
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param code 逾時代碼
     * @param silent 是否靜默處理
     * @param callStack 介面開啟歷程堆疊錯誤
     */
    protected OnViewSectionPresentViewTimeout(section:ViewSection, event:ViewEvent, code:number, silent:boolean, callStack:Error) {
        SafeCall(this.m_delegate, this.m_delegate?.OnViewPresentTimeout, event, code, silent, callStack);
    }

    /**
     * 介面確認準備完成
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param isFullPresent 是否為全畫面
     * @param deferFullPresentAffect 全畫面顯示時關閉背後其餘顯示的延遲時間(單位：秒)
     */
    protected OnViewSectionDidPresentView(section:ViewSection, event:ViewEvent, isFullPresent:boolean, deferFullPresentAffect:number): void {
        if (isFullPresent) {
            if (this.m_fullPresentQueue.length == 0) {
                this.m_fullPresentTimer = 0;
                this.m_deferFullPresentAffect = deferFullPresentAffect;
            }
            this.m_fullPresentQueue.push(event);
        }
        SafeCall(this.m_delegate, this.m_delegate?.OnViewDidPresent, event);
    }

    /**
     * 介面要求重置遮黑元件
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param opaqueBlock 是否使用不透明遮黑顯示
     * @param darkenBlock 是否使用深色的遮黑顯示
     */
    protected OnViewSectionReplaceViewBlock(section:ViewSection, event:ViewEvent, opaqueBlock:boolean, darkenBlock:boolean): Node {
        const block:ViewBlock = this.CreateBlock();
        if (block) {
            block.Opaque = opaqueBlock;
            darkenBlock ? block.Dark() : block.Light();
        }
        return block?.node;
    }

    /**
     * 介面進入主顯示
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param isLandscape 是否為橫版
     */
    protected OnViewSectionPresentingView(section:ViewSection, event:ViewEvent, isLandscape:boolean) {
        MultiTouchEnabled(event.MultiTouch);
        SafeCall(this.m_delegate, this.m_delegate?.OnViewPresenting, event, isLandscape);
    }

    /**
     * 介面主動退出全畫面顯示
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     */
    protected OnViewSectionResignFullPresentView(section:ViewSection, event:ViewEvent) {
        this.ResignFullPresent(event);
    }

    /**
     * 介面即將離開場上
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param block 介面遮黑元件
     * @param isFullPresent 是否為全畫面
     * @param animMinimize 是否使用動畫最小化
     */
    protected OnViewSectionWillDismissView(section:ViewSection, event:ViewEvent, block:Node, isFullPresent:boolean, animMinimize:boolean): boolean {
        const [isTopSection, isLastView]:[boolean, boolean] = this.CheckIsLastView(section, event, isFullPresent);
        isLastView && MultiTouchEnabled(false);
        !!block && (!animMinimize ? this.m_blockPool.put(block) : block.getComponent(ViewBlock).FadeOut(()=>this.m_blockPool.put(block)));
        return SafeCall(this.m_delegate, this.m_delegate?.OnViewWillDismiss, event, isLastView);
    }

    /**
     * 介面正在離開場上
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param isFullPresent 是否為全畫面
     * @param isTopLayerViewInSection 是否為該 Section 最上層的介面
     */
    protected OnViewSectionDismissingView(section:ViewSection, event:ViewEvent, isFullPresent:boolean, isTopLayerViewInSection:boolean): Vec3|void {
        const [isTopSection, isLastView]:[boolean, boolean] = this.CheckIsLastView(section, event, isFullPresent);
        const result:Vec3|void = SafeCall(this.m_delegate, this.m_delegate?.OnViewDismissing, event, isLastView, isTopSection&&isTopLayerViewInSection);

        if (!isTopSection) {
            // [當前 Section 不是目前最上層顯示順序] => 有可能是中間任意一個
            // 所有 Section 維持原狀，不做任何處理
        } else if (section.Count > 1) {
            // [當前 Section 是最上層但還有沒顯示完的介面要接續顯示]
            section.Foreground();
        } else {
            // [當前 Section 是最上層且已經沒有任何要顯示的介面] => 找出下一個用於主顯示的 Section
            const index:number = this.m_sectionList.findIndex((viewSection:ViewSection)=>viewSection.Id==section.Id);
            for (let j = index-1; j >= 0; j--) {
                const viewSection:ViewSection = this.m_sectionList[j];
                if (viewSection.Foreground()) {
                    break;
                }
            }
        }
        
        return result;
    }

    /**
     * 介面離開場上
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param isTopLayerViewInSection 是否為該 Section 最上層的介面
     */
    protected OnViewSectionDismissView(section:ViewSection, event:ViewEvent, isTopLayerViewInSection:boolean, minimizeWorldCenter:Vec3) {
        let isTopSection:boolean = true;
        let isLastView:boolean = false;

        // 檢查當 Section 是否為目前最上層顯示順序
        for (let i = this.m_sectionList.length-1; i >= 0; i--) {
            const viewSection:ViewSection = this.m_sectionList[i];
            if (viewSection.Id > section.Id) {
                isTopSection &&= viewSection.IsEmpty;
            }
        }

        if (--this.m_presentStatus.Count <= 0) {
            let length:number = 0;
            this.m_sectionList.forEach((viewSection:ViewSection)=>length += viewSection.Length);
            if (length == 0) {
                // [最後一個介面關閉]
                this.m_presentStatus.Finish = true;
                isLastView = true;
            }
        }

        SafeCall(this.m_delegate, this.m_delegate?.OnViewDismiss, event, isLastView, isTopSection&&isTopLayerViewInSection);
        this.EmitMinimizeEffect(minimizeWorldCenter);
    }
//#endregion

    /**
     * 檢查是否為最後一個介面
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param isFullPresent 是否為全畫面
     */
    private CheckIsLastView(section:ViewSection, event:ViewEvent, isFullPresent:boolean): [boolean, boolean] {
        let isTopSection:boolean = true;
        let isLastView:boolean = false;
        
        if (isFullPresent) {
            this.ResignFullPresent(event);
        }

        // 檢查當 Section 是否為目前最上層顯示順序
        for (let i = this.m_sectionList.length-1; i >= 0; i--) {
            const viewSection:ViewSection = this.m_sectionList[i];
            if (viewSection.Id > section.Id) {
                isTopSection &&= viewSection.IsEmpty;
            }
        }

        if (isTopSection) {
            let length:number = 0;
            this.m_sectionList.forEach((viewSection:ViewSection)=>length += viewSection.Length);
            isLastView = length <= 1;
        }

        return [isTopSection, isLastView];
    }

    /**
     * 退出介面全畫面顯示
     * @param event 介面事件
     */
    private ResignFullPresent(event:ViewEvent) {
        if (this.m_fullPresentQueue) {
            const index:number = this.m_fullPresentQueue.findIndex((e:ViewEvent)=>e.Hash==event.Hash);
            index >= 0 && this.m_fullPresentQueue.splice(index, 1);
            if (this.m_fullPresentQueue.length == 0) {
                this.m_fullPresentTimer = null;
                SafeCall(this.m_delegate, this.m_delegate?.OnViewExitFullScreen);
            }
        }
    }
}