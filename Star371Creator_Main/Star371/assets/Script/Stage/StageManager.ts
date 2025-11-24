import { _decorator, Director, director, Scene, SceneAsset, sys } from 'cc';
import { NATIVE } from 'cc/env';
import Stage, { IStage } from './Stage';
import { Device } from '../Device/Device';
import { Bundle } from '../Bundle/Bundle';
import { GameId } from '../Define/GameDefine';
import { StageInfo } from '../Define/StageInfoDefine';
import { StageId, StageInfoMap } from '../Define/StageDefine';

/**
 * 場景資料
 */
class StageData { 
    public Stage: Stage;
    constructor(public StageId: StageId|GameId, public Options?:any[]) {}
}

export interface IStageManager {
    /**
     * 取得當前的 Stage
     */
    readonly Current: IStage;

    /**
     * 載入並前往 Stage，並將 Stage 推入堆疊
     * @param stageId 要前往並推入堆疊的 Stage ID
     * @param options 傳遞給 Stage 的參數
     */
    Push(stageId:StageId|GameId, ...options:any): boolean;

    /**
     * 載入並前往堆疊頂部的 Stage
     * @param clearOptions 是否清除過往的啟動參數
     */
    Pop(clearOptions?:boolean): StageId|GameId;

    /**
     * 載入並前往 Stage，但不會將 Stage 推入堆疊
     * @param stageId 要前往的 Stage ID
     * @param options 傳遞給 Stage 的參數
     */
    Replace(stageId:StageId|GameId, ...options:any): boolean;
}

export class StageManager implements IStageManager {
    private m_current: StageData;
    private m_history: StageData[];
    private m_stack: StageData[];
    private m_isLoading: boolean;

    constructor() {
        this.m_current = null;
        this.m_history = [];
        this.m_stack = [];
        this.m_isLoading = false;
        Device.Helper.RegisterOrientationCallback(
            this.OnOrientationChanged.bind(this), 
            this.OnInterfaceOrientationChanged.bind(this));
    }

    /**
     * 取得當前的 Stage
     */
    public get Current(): IStage {
        return this.m_current?.Stage;
    }

    /**
     * 載入並前往 Stage，並將 Stage 推入堆疊
     * @param stageId 要前往並推入堆疊的 Stage ID
     * @param options 傳遞給 Stage 的參數
     */
    public Push(stageId:StageId|GameId, ...options:any): boolean {
        return this.ProcessStage(new StageData(stageId, options));
    }

    /**
     * 載入並前往堆疊頂部的 Stage
     * @param clearOptions 是否清除過往的啟動參數
     */
    public Pop(clearOptions:boolean=false): StageId|GameId {
        if (this.m_stack.length <= 0) {
            return null;
        }

        const stageData:StageData = this.m_stack.pop();
        if (stageData) {
            stageData.Options = !!clearOptions ? null : stageData.Options;
            this.ProcessStage(stageData, true);
        }

        return stageData.StageId;
    }

    /**
     * 載入並前往 Stage，但不會將 Stage 推入堆疊
     * @param stageId 要前往的 Stage ID
     * @param options 傳遞給 Stage 的參數
     */
    public Replace(stageId:StageId|GameId, ...options:any): boolean {
        return this.ProcessStage(new StageData(stageId, options), true);
    }

    /**
     * 當 App 進入背景
     */
    public OnEnterBackground(): void {
    }

    /**
     * 當 App 進入前景
     */
    public OnEnterForeground(): void {
    }

    /**
     * 每幀更新通知
     */
    public OnUpdate(): void {
    }

    /**
     * 當按下 Android 返回鍵
     * 說明： false 表示事件遭攔截處理，不再繼續往後傳遞；true 表示無處理事件，事件繼續往後傳遞
     */
    public OnNavigateBack(): boolean {
        if (this.m_isLoading) {
            return false;
        }
        
        if (this.m_current?.Stage?.OnNavigateBack() == false) {
            return false;
        } else if (this.m_stack.length > 0) {
            this.Pop(true);
            return false;
        } else {
            return true;
        }
    }

    /**
     * 處理 Stage 切換
     * @param stageData 要切換的 Stage 資料
     * @param replaced 是否是替換 Stage
     * 備註：stageId 負的表示進入子大廳，理論上每個遊戲最多只有一個子大廳
     */
    private ProcessStage(stageData:StageData, replaced:boolean=false): boolean {
        const stageId:StageId|GameId = stageData.StageId;
        const realStageId = stageId < 0 ? stageId * -1 : stageId;
        const stageInfo:StageInfo = StageInfoMap.get(realStageId as StageId);

        if (stageInfo) {
            const bundle:Bundle = Bundle.Find(stageInfo.Name);
            const sceneName:string = stageId == realStageId ? stageInfo.SceneName : bundle.SubLobby;

            this.m_isLoading = true;
            this.m_current?.Stage?.WillBeginTransition(stageId);

            director.emit(Director.EVENT_BEFORE_SCENE_LOADING, sceneName);
            bundle.Raw.loadScene(
                sceneName,
                (completedCount: number, totalCount: number)=>{
                    this.m_current?.Stage?.OnTransitionProgressing(stageId, completedCount, totalCount);
                },
                (error: null | Error, scene:SceneAsset)=>{
                    if (error) {
                        // [載入失敗]
                        this.m_isLoading = false;
                        this.m_current?.Stage?.OnTransitionFailed(stageId, error);
                    } else {
                        // [載入成功]
                        this.m_current?.Stage?.OnTransitionDidBegin(stageId);
                        
                        director.runSceneImmediate(
                            scene,
                            ()=>{
                                Bundle.Drain();
                                director.once(Director.EVENT_BEFORE_SCENE_LAUNCH, (scene: Scene)=>{
                                    NATIVE && sys.garbageCollect();
                                    this.m_isLoading = false;

                                    if (this.m_current) {
                                        this.m_current.Stage = null;
                                        this.m_history.push(this.m_current);
                                        !replaced && this.m_stack.push(this.m_current);
                                    }

                                    const lastStageId:StageId|GameId = this.m_current?.StageId;
                                    this.m_current = stageData;
                                    this.m_current.Stage = scene.getComponentInChildren(Stage);
                                    this.m_current.Stage.SetId(stageId, lastStageId);
                                    this.m_current.Stage.LaunchOption?.apply(this.m_current.Stage, this.m_current.Options);
                                })
                            }
                        )
                    }
                }
            )
        }

        return !!stageInfo;
    }

    /**
     * 裝置轉向通知
     * @param orientation 裝置方向
     */
    private OnOrientationChanged(orientation:Device.Orientation):void {
        this.m_current?.Stage?.OnOrientationChanged(orientation);
    }

    /**
     * 裝置介面轉向通知
     * @param interfaceOrientation 裝置介面方向
     */
    private OnInterfaceOrientationChanged(interfaceOrientation:Device.InterfaceOrientation):void {
        this.m_current?.Stage?.OnInterfaceOrientationChanged(interfaceOrientation);
    }
}
