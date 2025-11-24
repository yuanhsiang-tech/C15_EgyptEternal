import { _decorator, Component, director, error, js, log, math, Node, UITransform, Vec3, view, warn } from 'cc';
import { ViewElement, ViewStateDelegate } from '../ViewManage/Foundation/ViewTypes';
import { ViewManager } from '../ViewManage/ViewManager';
import { ResourcesViewElements } from '../Define/ViewDefine';
import { Device } from '../Device/Device';
import { Bundle } from '../Bundle/Bundle';
import { StageId, StageInfoMap } from '../Define/StageDefine';
import { GameId } from '../Define/GameDefine';
import Controllable from '../../Stark/Controllable/Controllable';
import { UISystem } from '../../Stark/UIKit/UISystem';
import { EventDispatcher } from '../../Stark/Utility/EventDispatcher';
import { EventDefine } from '../Define/EventDefine';
import { StageInfo } from '../Define/StageInfoDefine';
import { LoadingView } from '../Loading/LoadingView';
import { StateManager } from '../../Stark/Utility/StateManager/StateManager';
import { AnyPreparation, Preparation } from '../Scene/Preparation/Preparation';
import { Preparations } from '../Scene/Preparation/PreparationMacro';
import { PreparationFactory } from '../Scene/Preparation/PreparationFactory';
import { NATIVE } from 'cc/env';
import { EnvConfig } from '../Define/ConfigDefine';
import { AnyEasyPreperation, EasyPreparation } from '../Scene/Preparation/EasyPreparation';

const { ccclass } = _decorator;

export interface IStage {
    /**
     * 取得 Stage 的 ID
     */
    readonly Id:StageId|GameId;

    /**
     * 取得 Stage 設定的方向
     */
    readonly Orientation:Device.Orientation;
}

/**
 * 資源載入格式化字串訊息
 * @param formatStr 格式化字串訊息
 */
export function ResourceLoadedCheck<Enum>(type:Enum, mask:number, flag:number, formatStr:string):void {
    for (let i = 0; i < mask; i++) {
        const key:number = 1<<i;
        if (!(flag&key)) {
            warn(js.formatStr(formatStr, type[key]));
        }
    }
}

enum PREPARE_STATE {
    NONE,
    WAIT_LOAD_SCENE,
    PREPARATION_BEGIN,
    PREPARATION_WAIT,
    PREPARATION_FAIL,
    PREPARATION_TIMEOUT,
    SETTLE_WAIT,
    SETTLE_TIMEOUT,
    READY,
}

type PreparationSet = [string, AnyPreparation];
class PreparationCollecton implements Iterable<PreparationSet> {
    [Symbol.iterator](): IterableIterator<PreparationSet> { return this.m_map.entries(); }

    private m_triggerList: string[];
    private m_map: Map<string, AnyPreparation>;

    public get Size(): number { return this.m_map.size; }
    public get Trigger(): string[] { return this.m_triggerList; }

    constructor() {
        this.m_triggerList = [];
        this.m_map = new Map();
    }

    public Keys(): MapIterator<string> {
        return this.m_map.keys();
    }

    public Values(): MapIterator<AnyPreparation> {
        return this.m_map.values();
    }

    public Has(key:string): boolean {
        return this.m_map.has(key);
    }

    public Clear(): void {
        this.m_map.clear();
    }

    public Add(prep:AnyPreparation): boolean {
        const key:string = prep?.Key;
        if (key != null && key.length > 0 && !this.m_map.has(key)) {
            this.m_map.set(key, prep);
            this.m_triggerList.push(key);
            return true;
        }
        return false;
    }

    public Find(key:string): AnyPreparation {
        return this.m_map?.get(key);
    }

    public Delete(key:string): boolean {
        return this.m_map.delete(key);
    }
}

class PreparationCollector {
    public Elapsed:number;
    public Collection:PreparationCollecton;
    public Resolved:AnyPreparation[];

    public get TotalCount(): number {
        return this.Collection.Size + this.Resolved.length;
    }

    public get FinishCount(): number {
        return this.Resolved.length;
    }

    constructor() {
        this.Elapsed = 0;
        this.Resolved = [];
        this.Collection = new PreparationCollecton();
    }

    public MergeAll(): AnyPreparation[] {
        return Array.from(this.Collection).map(x=>x[1]).concat(this.Resolved);
    }
}

@ccclass("Stage")
export default class Stage extends Controllable implements IStage, Partial<ViewStateDelegate> {
    private m_Id:StageId|GameId;
    private m_transitionDidBegin:boolean;
    private m_fromId:StageId|GameId;
    private m_prepareState: StateManager;
    private m_preparation:PreparationCollector;

    /**
     * 是否已經全部準備就緒
     * 備註：當回傳 true 表示用 Preparation 準備的項目全數完成且 IsPreparationFinished 回傳 true
     */
    protected get DidFinishPreparation(): boolean {
        return this.m_prepareState == null && this.IsPreparationFinished();
    }

    /**
     * 是否正在切換 Stage 中
     */
    protected get IsTransitioning():boolean {
        return this.m_transitionDidBegin;
    }

    /**
     * 取得場景名稱
     */
    public get SceneName(): string {
        return director.getScene().name;
    }

    /**
     * 取得 Stage 的 ID
     */
    public get Id():StageId|GameId {
        return this.m_Id;
    }

    /**
     * 是否為遊戲 Stage
     */
    public get IsGame():boolean {
        return this.m_Id >= StageId.GAME;
    }

    /**
     * Stage 是否為直版
     */
    public get IsPortrait(): boolean {
        return StageInfoMap.get(this.m_Id)?.IsPortrait || false;
    }

    /**
     * 取得 Stage 設定的方向
     */
    public get Orientation(): Device.Orientation {
        return this.IsPortrait ? Device.Orientation.PORTRAIT : Device.Orientation.LANDSCAPE;
    }

    /**
     * 取得 Stage 是否為從登入畫面進入
     */
    public get CameFromLogin():boolean {
        return this.m_fromId < StageId.LOBBY;
    }

    /**
     * 取得 Stage 的顯示範圍大小
     */
    public get ContentSize():math.Size {
        return this.getComponent(UITransform).contentSize;
    }

    /**
     * 啟動通知
     * @param options 啟動時帶入的參數
     * 備註：在 onLoad 前被呼叫
     */
    public LaunchOption?(...options:any): void;

    protected onLoad(): void {
        super.onLoad?.();
        this.m_transitionDidBegin = false;
        this.m_prepareState = new StateManager();
        this.m_preparation = new PreparationCollector();
        ViewManager.Instance.Delegate = this;
        this.getComponent(UITransform).setContentSize(view.getDesignResolutionSize());
        this.InitPrepareState();
    }

    protected onDisable(): void {
        super.onDisable?.();
        ViewManager.Instance.Clear();
    }

    protected onDestroy(): void {
        super.onDestroy?.();

        // 終止所有準備工作
        for (const it of this.m_preparation.Collection) {
            it[1].Resolve?.(Preparations.RESULT_TYPE.CANCEL);
        }
    }

    /**
     * 逐幀更新
     * @param dt 當前這個 frame 與前一個 frame 的間隔時間
     */
    protected update (dt:number) {
        this.m_prepareState?.Tick();
    }

//#region Stage 相關
    /**
     * 設定 Stage 的 ID
     */
    public SetId(id:StageId|GameId, fromId:StageId|GameId): void {
        this.m_Id = id;
        this.m_fromId = fromId;
    }

    /**
     * 即將開始載入 Stage
     */
    public WillBeginTransition(stageId:StageId|GameId): void {
        const nextStageInfo:StageInfo = StageInfoMap.get(stageId);
        Device.Current.ChangeOrientation(nextStageInfo?.IsPortrait ? Device.Orientation.PORTRAIT : Device.Orientation.LANDSCAPE);
        this.ShowLoading(stageId);
    }

    /**
     * Stage 載入進度
     */
    public OnTransitionProgressing(stageId:StageId|GameId, completedCount: number, totalCount: number): void {
        LoadingView.Instance && LoadingView.Instance.UpdateDownloadPercent(completedCount / totalCount)
    }

    /**
     * Stage 載入失敗
     */
    public OnTransitionFailed(stageId:StageId|GameId, error: Error): void {
        Device.Current.ChangeOrientation(this.IsPortrait ? Device.Orientation.PORTRAIT : Device.Orientation.LANDSCAPE);
        this.HideLoading();
    }

    /**
     * Stage 載入完成，開始轉換 Stage
     * 備註：舊 Stage 不會收到轉換完成的通知，因為舊 Stage 會在新 Stage 執行起來前就被銷毀了
     */
    public OnTransitionDidBegin(stageId:StageId|GameId): void {
        this.m_transitionDidBegin = true;
    }

    /**
     * 當按下 Android 返回鍵
     * 說明： false 表示事件遭攔截處理，不再繼續往後傳遞；true 表示無處理事件，事件繼續往後傳遞
     */
    public OnNavigateBack(): boolean {
        if (ViewManager.Instance.Length > 0) {
            // [有介面機制]
            ViewManager.Instance.NavigateBack();
            return false;
        }
        return true;
    }
//#endregion

//#region 介面事件
    /**
     * 開始載入介面
     * @param event 介面事件
     * @param inBackground 是否為背景載入
     * @returns 是否繼續執行介面載入
     */
    public OnViewLoadView(event: IViewEvent, inBackground:boolean): void|boolean {
        let shouldLoad:boolean;

        switch (event) {
            default: {
                shouldLoad = true;
                break;
            }
        }

        // shouldLoad && !ViewManager.Instance.IsPaused && !inBackground && Loading.ViewInstance.Show();
        return shouldLoad;
    }

    /**
     * 介面載入失敗
     * @param event 介面事件
     * @param error 錯誤物件
     */
    public OnViewLoadViewFail(event:IViewEvent, error:Error) {
        // Loading.ViewInstance.Hide();
        ViewManager.Alert("介面開啟失敗" + "\n" + `(${event.Hash})`);
    }

    /**
     * 介面啟動失敗
     * @param event 介面事件
     */
    public OnViewLaunchViewFail(event:IViewEvent) {
        // Loading.ViewInstance.Hide();
    }

    /**
     * 介面事件 Bundle 為 resources，須回傳對應的 ViewElement
     * @param event 介面事件
     */
    public OnViewSelectViewElement(event:IViewEvent): ViewElement {
        return ResourcesViewElements.get(event);
    }

    /**
     * 回應當前裝置是否為橫向
     * @param event 介面事件
     */
    public OnViewSelectViewSourceLandscape(event:IViewEvent): boolean {
        return Device.Current.Orientation == Device.Orientation.LANDSCAPE;
    }

    /**
     * 介面載入 Bundle
     * @param event 介面事件
     * @param bundle 載入的 Bundle
     * @param error 錯誤訊息
     */
    public OnViewBundleDidLoad(event:IViewEvent, bundle:Bundle, err:Error) {
        if (!err) {
            // // [設定語系資源搜尋路徑]
            // SearchPathManager.Instance.AddBundle(bundle.name);

            // // 載入語系文檔
            // LocaleText.LoadJson(bundle.name, {directory: "Text"}, (success:boolean) => {
            //     !success && error(`[SceneBase] OnViewBundleDidLoad Bundle(${bundle.name}) 語系文檔載入失敗`);
            // });
        }
        else {
            // Loading.ViewInstance.Hide();
            // ViewManager.Alert(`${LocaleText.GetString(StringKeys.DEFAULT.VIEW_LOADING_FAIL)}` + "\n" + `(B${event.Hash})`);
            error(`[Scene] OnViewBundleDidLoad Bundle(${event.Bundle}) 載入失敗`, err);
        }
    }

    /**
     * 介面顯示於場上
     * @param event 介面事件
     * @param isFirst 是否為本次第一個開啟的介面
     */
    public OnViewPresent(event:IViewEvent, isFirst:boolean):void {
        if (isFirst) {
            // if (!Loading.ViewInstance.node.active) {
            //     // [還沒開啟過 Loading] => 依據對應的設定顯示載入提示
            //     event.SilentLoading ? Loading.ViewInstance.ClearShow() : Loading.ViewInstance.Show()
            // } else if (event.SilentLoading) {
            //     // [Loading 已經開啟，但介面使用安靜型載入(或是說有自定義的載入提示)]
            //     Loading.ViewInstance.Hide();
            //     Loading.ViewInstance.ClearShow();
            // }
        }
    }

    /**
     * 介面準備逾時
     * @param event 介面事件
     * @param code 逾時代碼
     * @param silent 是否靜默處理
     * @param callStack 介面開啟歷程堆疊錯誤
     */
    public OnViewPresentTimeout(event:IViewEvent, code:number, silent:boolean, callStack:Error):void {
        // Loading.ViewInstance.Hide();
        // !silent && ViewManager.Alert(LocaleText.GetString(StringKeys.DEFAULT.VIEW_LOADING_TIMEOUT) + "\n" + `(${event.Hash + (code!=null?":"+code:"")})`);
    }

    /**
     * 介面確認準備完成
     * @param event 介面事件
     */
    public OnViewDidPresent(event:IViewEvent): void {
        // Loading.ViewInstance.Hide();
        EventDispatcher.Shared.Dispatch(EventDefine.System.ON_VIEW_PRESENT, event);
    }

    /**
     * 介面進入主顯示
     * @param event 介面事件
     * @param isLandscape 是否為橫版
     */
    public OnViewPresenting(event:IViewEvent, isLandscape:boolean): void {
        // Loading.ViewInstance.Hide(); 

        const targetOrientation = isLandscape ? Device.Orientation.LANDSCAPE : Device.Orientation.PORTRAIT;
        if (Device.Current.Orientation != targetOrientation) {
            Device.Current.ChangeOrientation(targetOrientation);
        }
    }

    /**
     * 介面即將離開場上
     * @param event 介面事件
     * @param isLast 是否為最後一個介面
     */
    public OnViewWillDismiss(event:IViewEvent, isLast:boolean): boolean {
        let changeOrientation:boolean = false;
        if (isLast && Device.Current.Orientation !== this.Orientation && !this.m_transitionDidBegin) {
            Device.Current.ChangeOrientation(this.Orientation);
            changeOrientation = true;
        }
        return changeOrientation;
    }

    /**
     * 介面正在離開場上
     * @param event 介面事件
     * @param isLast 是否為最後一個介面
     * @param isTop 是否為最上層的主顯示介面
     */
    public OnViewDismissing(event:IViewEvent, isLast:boolean, isTop:boolean): Vec3|void {
        // !isLast && isTop && (event.SilentLoading ? Loading.ViewInstance.ClearShow() : Loading.ViewInstance.Show());
        return UISystem.Find(event.Tag)?.Center.worldPosition;
    }

    /**
     * 介面離開場上
     * @param event 介面事件
     * @param isLast 是否為最後一個介面
     * @param isTop 是否為最上層的主顯示介面
     */
    public OnViewDismiss(event:IViewEvent, isLast:boolean, isTop:boolean): void {
        // isLast && Loading.ViewInstance.Hide();
        EventDispatcher.Shared.Dispatch(EventDefine.System.ON_VIEW_DISMISS, event, isLast);
    }

    /**
     * 介面進入全畫面顯示
     */
    public OnViewEnterFullScreen(): void {
        EventDispatcher.Shared.Dispatch(EventDefine.System.ON_VIEW_ENTER_FULL_SCREEN);
    }

    /**
     * 介面離開全畫面顯示
     */
    public OnViewExitFullScreen(): void {
        EventDispatcher.Shared.Dispatch(EventDefine.System.ON_VIEW_EXIT_FULL_SCREEN);
    }
//#endregion

//#region 裝置轉向通知
    /**
     * 裝置轉向通知
     * @param orientation 裝置方向
     */
    public OnOrientationChanged(orientation:Device.Orientation):void {
        EventDispatcher.Shared.Dispatch(EventDefine.System.ORIENTATION_CHANGED, orientation);
    }

    /**
     * 裝置介面轉向通知
     * @param interfaceOrientation 裝置介面方向
     */
    public OnInterfaceOrientationChanged(interfaceOrientation:Device.InterfaceOrientation):void {
        ViewManager.Instance.OnInterfaceOrientationChanged(interfaceOrientation);
        EventDispatcher.Shared.Dispatch(EventDefine.System.INTERFACE_ORIENTATION_CHANGED, interfaceOrientation);
        this.LayoutSubViews();
    }
//#endregion

//#region 資源載入

    /**
     * 檢查是否準備完成
     * 備註：這是讓繼承的子 Stage 可以有額外的控制權決定是否已經準備就緒，如果沒有額外的準備需求則無需覆寫
     */
    protected IsPreparationFinished(): boolean {
        return true;
    }

//#endregion

//#region Preparation 處理、事件
    /**
     * Preparation 初始化
     */
    protected InitPrepareState(): void {
        this.m_prepareState.Init( PREPARE_STATE.NONE, 0, {

            // 等待場景載入完成
            [PREPARE_STATE.WAIT_LOAD_SCENE]: {
                OnEnter: () => {
                    this.m_prepareState.NextState(PREPARE_STATE.PREPARATION_BEGIN);
                },
            },

            // 開始準備工作
            [PREPARE_STATE.PREPARATION_BEGIN]: {
                OnEnter: () => {
                    this.WillBeginPreparations();
                    this.OnPreparationsBegin();
                    this.PreparationsStateLog();
                    this.m_prepareState.NextState(PREPARE_STATE.PREPARATION_WAIT);
                },
            },

            // 等待所有準備工作結束
            [PREPARE_STATE.PREPARATION_WAIT]: {
                OnProcess: (dt: number) => {
                    this.m_preparation.Elapsed += dt;
                    this.OnPreparationsProcess(dt);

                    const result = this.CheckPreparations();
                    switch (result) {
                        case Preparations.RESULT_TYPE.SUCCESS:{
                            this.OnPreparationsSuccess();
                            this.m_prepareState.NextState(PREPARE_STATE.SETTLE_WAIT, this.PreparationTimeoutTime());
                            break;
                        }
                        case Preparations.RESULT_TYPE.TIMEOUT:{
                            this.m_prepareState.NextState(PREPARE_STATE.PREPARATION_TIMEOUT);
                            break;
                        }
                        case Preparations.RESULT_TYPE.FAIL:{
                            this.m_prepareState.NextState(PREPARE_STATE.PREPARATION_FAIL);
                            break;
                        }
                    }
                },
            },

            // 準備工作逾時
            [PREPARE_STATE.PREPARATION_TIMEOUT]: {
                OnEnter: () => {
                    this.OnPreparationsFailed(true);
                    this.OnPreparationsFinish(false);
                },
            },

            // 準備工作失敗
            [PREPARE_STATE.PREPARATION_FAIL]: {
                OnEnter: () => {
                    this.OnPreparationsFailed(false);
                    this.OnPreparationsFinish(false);
                },
            },

            // 等待場景準備完成
            [PREPARE_STATE.SETTLE_WAIT]: {
                OnEnter: () => {
                },

                OnProcess: () => {
                    if (this.m_preparation.Collection.Size == 0 && this.IsPreparationFinished()) {
                        this.m_prepareState.NextState( PREPARE_STATE.READY );
                    } else if (this.m_prepareState.IsTimeout) {
                        this.m_prepareState.NextState( PREPARE_STATE.SETTLE_TIMEOUT );
                    }
                },
            },

            // 等待場景準備逾時
            [PREPARE_STATE.SETTLE_TIMEOUT]: {
                OnEnter: () => {
                    // 列出所有不成功的準備工作 (包含 LENIENT 的準備工作)
                    const mergedPreparationList = this.m_preparation.MergeAll();
                    const brokenPreparationList = mergedPreparationList.filter( p => ((p?.ResultType >= Preparations.RESULT_TYPE.SUCCESS) !== true) );
                    const brokenPreparationMsgs = brokenPreparationList.map( p => `[${p.Key.padEnd(30, ' ')}] --${Preparations.RESULT_TYPE[p.ResultType]}` );

                    // 列出所有未準備完成的 Key 並印出錯誤訊息
                    const notPreparedKeys = Array.from(this.m_preparation.Collection.Keys());
                    error( `[!] Scene[ ${this.SceneName} ] settle timeout:` );
                    error( `[!] NOT PREPARED KEYS:\n${notPreparedKeys.join( '\n' )}` );
                    error( `[!] BROKEN PREPARATIONS:\n${brokenPreparationMsgs.join( '\n' )}` );

                    const couldPass = this.OnPreparationsTimeout(notPreparedKeys);
                    if (couldPass) {
                        this.m_prepareState.NextState(PREPARE_STATE.READY);
                    } else {
                        this.OnPreparationsFinish(false);
                    }
                },
            },

            // 準備完成
            [PREPARE_STATE.READY]: {
                OnEnter: () => {
                    this.m_prepareState = null;
                    this.OnPreparationsFinish(true);
                },
            },
        });

        this.m_prepareState.NextState(PREPARE_STATE.WAIT_LOAD_SCENE);
    }

    /** 
     * 開始準備工作之前
     */
    protected WillBeginPreparations(): void {
    }

    /**
     * Preparation 狀態輸出
     */
    private PreparationsStateLog(): void {
        if (!NATIVE || EnvConfig.IS_DEV) {
            const contents: string[] = [];
            for (const pKey of this.m_preparation.Collection.Trigger) {
                const shortKey = pKey.replace( "preparation.", '' );
                const symbol = this.m_preparation.Collection.Has(pKey) ? '🔴' : '🟢';
                contents.push( `${symbol}[${shortKey}]` );
            }
            log( `[ ${this.SceneName} ] preparations: ${contents.join( ' ' )}` );
        }
    }

    /** 
     * 開始準備工作 
     */
    protected OnPreparationsBegin(): void {
        // Do something when preparations begin.
    }

    /** 
     * 處理準備工作 
     */
    protected OnPreparationsProcess(dt: number): void {
        let isTerminated = false;

        const deleteKeys:string[] = [];
        for (const it of this.m_preparation.Collection) {
            const preparation = it[1];
            preparation.Process?.(dt);

            if (preparation.IsTimeout(this.m_preparation.Elapsed)) {
                preparation.Resolve(Preparations.RESULT_TYPE.TIMEOUT);
            }

            if (preparation.IsResolved) {
                if (!preparation.IsReady) {
                    isTerminated = true;
                    error(`Preparation[ ${preparation.Key} ] failed with message: ${preparation.Message}`);
                }

                // Remove preparation from running list.
                this.m_preparation.Resolved.push(preparation);
                deleteKeys.push(preparation.Key);
            }
        }
        deleteKeys.forEach((key)=>{
            this.m_preparation.Collection.Delete(key);
            this.OnPreparationResolved(this.m_preparation.Collection.Find(key));
        });

        // Terminate all preparations if any preparation failed.
        if (isTerminated) {
            for (const it of this.m_preparation.Collection) {
                const preparation = it[1];
                preparation.Resolve(Preparations.RESULT_TYPE.CANCEL);
                this.m_preparation.Resolved.push(preparation);
                this.OnPreparationResolved(preparation);
            }
            this.m_preparation.Collection.Clear();
        }
    }

    /** 
     * 一項準備工作完成通知 
     */
    protected OnPreparationResolved(preparation: Preparation<any, any>): void {
        const runningCount  = this.m_preparation.Collection.Size;
        const resolveCount  = this.m_preparation.Resolved.length;
        const totalCount    = runningCount + resolveCount;
        const progress      = (totalCount > 0) ? (resolveCount / totalCount) : 1;
        this.PreparationsStateLog();
    }

    /** 
     * 準備工作失敗通知 
     */
    protected OnPreparationsFailed(isTimeout: boolean): void {
    }

    /** 
     * 準備工作成功通知 
     * 注意：這個通知僅表示使用 Preparation 的項目都準備完成，但不代表其餘載入(例如自行手動載入，未使用 Preparation 的項目)準備完畢。
     *      如果是要接收全部準備完畢的通知請改於 OnPreparationsFinish 參數為 true 的時候進行處理。
     */
    protected OnPreparationsSuccess(): void {
    }

    /**
     * 準備工作完成通知(無論成功或失敗)
     * @param success 是否成功
     */
    protected OnPreparationsFinish(success:boolean): void {
        if (!success) {
            // [準備失敗]
        } else {
            // [全部準備完成]
            this.HideLoading();
        }
    }

    /**
     * 場景準備逾時
     * @param notPreparedKeys 未準備完成的識別鍵
     * @returns 是否可以當作準備完成並進入場景
     */
    protected OnPreparationsTimeout(notPreparedKeys: string[]): boolean {
        return false;
    }

    protected PreparationTimeoutTime(): number {
        return 10 * 1000;
    }

    /** 
     * 檢查準備工作 
     */
    private CheckPreparations(): Preparations.RESULT_TYPE {
        // 有準備工作正在執行
        if (this.m_preparation.Collection.Size > 0) {
            return Preparations.RESULT_TYPE.UNKNOWN;
        }

        // 沒有任何準備工作
        if (this.m_preparation.Resolved.length == 0) {
            return Preparations.RESULT_TYPE.SUCCESS;
        }

        // 檢查所有準備工作的結果
        const resultTypes: Preparations.RESULT_TYPE[] = [];
        for (const preparation of this.m_preparation.Resolved) {
            if (preparation.IsReady) {
                resultTypes.push( Preparations.RESULT_TYPE.SUCCESS );
            } else if (preparation.IsResolved) {
                preparation.PrintLog();
                resultTypes.push( preparation.ResultType );
            } else {
                preparation.PrintLog();
                resultTypes.push( Preparations.RESULT_TYPE.UNKNOWN );
            }
        }

        // 確定沒有任何準備工作失敗
        const invalidTypes = resultTypes.filter( result => result < Preparations.RESULT_TYPE.SUCCESS );
        if (invalidTypes.length == 0) {
            return Preparations.RESULT_TYPE.SUCCESS;
        } else if (invalidTypes.includes( Preparations.RESULT_TYPE.FAIL)) {
            return Preparations.RESULT_TYPE.FAIL;
        } else if (invalidTypes.includes( Preparations.RESULT_TYPE.TIMEOUT)) {
            return Preparations.RESULT_TYPE.TIMEOUT;
        } else {
            return Preparations.RESULT_TYPE.UNKNOWN;
        }
    }

    //----------------------------------------------------------------
    /** 添加準備工作 */
    public AddPreparation<T, U>(key: string, initConfig?: T, resolvedCb?: Preparations.ResolveCallback<U>): AnyPreparation {
        if (this.m_preparation.Collection.Has(key)) {
            warn(`Preparation: ${key} already exists`);
            return null;
        }

        const preparation = PreparationFactory.Create(key, initConfig, resolvedCb);
        if (preparation) {
            this.m_preparation.Collection.Add(preparation);
            preparation.Prepare(this.Orientation);
            return preparation;
        }

        return null;
    }

    //----------------------------------------------------------------
    /**
     * 開始簡易準備工作
     * @param key 準備工作的 Key
     * @param option 初始化選項
     * @returns 是否成功開始準備工作
     */
    public AddEasyPreparation(key: string, option?: EasyPreparation.CreateOption): AnyEasyPreperation {
        if (this.m_preparation.Collection.Has(key)) {
            warn(`EasyPrepare: ${key} already exists`);
            return null;
        }

        const preparation = EasyPreparation.Create(key, option);
        if (preparation) {
            this.m_preparation.Collection.Add(preparation);
            preparation.Prepare(this.Orientation);
            return preparation;
        }

        return null;
    }
//#endregion

    /**
     * 重新配置節點
     */
    protected LayoutSubViews(): void {
        EventDispatcher.Shared.Dispatch(EventDefine.System.LAYOUT_STAGE_UI);
    }

    /**
     * 顯示 Loading 介面
     * @param stageId 
     */
    protected ShowLoading(stageId:StageId|GameId): void {
        let gameId = GameId.UNDEF;
        if (stageId >= StageId.GAME) {
            gameId = stageId as GameId;
        }
        LoadingView.Instance && LoadingView.Instance.Loading(gameId)
    }

    /**
     * 關閉 Loading 介面
     */
    protected HideLoading() {
        LoadingView.Instance?.UnLoading();
    }
}
