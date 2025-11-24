import { _decorator, log, warn, error, isValid, Vec3, Node, Component, UITransform, Tween, /*Label, LabelOutline, Color*/ } from "cc";
import { CommonSpinner as CommonSpinner } from "./CommonSpinnerMacros";
import CommonSpinnerTrackConfig from "./Utility/CommonSpinnerTrackConfig";
import CommonSpinnerTrackStatus from "./Utility/CommonSpinnerTrackStatus";
import { CommonSpinnerDefine } from "./CommonSpinnerDefine";
import { CommonSpinnerSpeedConfig, ReadableCommonSpinnerSpeedConfig } from "./Utility/CommonSpinnerSpeedConfig";
import { TimedBool } from "db://assets/Stark/Utility/TimedBool";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import { StateManager } from "db://assets/Stark/Utility/StateManager/StateManager";


const { ccclass, property } = _decorator;

//================================================================================================
//================================================================================================
/**
 * 通用輪帶控制元件
 * 
 * @description
 * 名詞定義
 * - `Plate`  : 轉盤本身，底下包含一至數個軌道 `Track`
 * - `Track`  : 軌道，轉盤啟動後 `Symbol 節點` 會在軌道由上往下移動，停止移動時會卡進插槽 `Socket`
 * - `Symbol` : `Symbol 節點`，會在軌道上移動的顯示元件 `Node`，生成時會被賦予索引 `nodeIndex`
 * - `Socket` : 在軌道上供 `Symbol` 停止的位置，索引 `socketIndex` 順序由 `IndexOrigin` 決定
 * - {@link CommonSpinnerControl.IndexOrigin} : {@link CommonSpinner.ORIGIN}
 * > - `TOP_LEFT`    : 主要插槽上面開始第一個 `socketIndex` 為 `0` (往下為正)
 * > - `BOTTOM_LEFT` : 主要插槽下面開始第一個 `socketIndex` 為 `0` (往上為正)
 * 
 * @abstract
 * 必須要實作的方法
 * - {@link CommonSpinnerControl.CreateSymbol}
 * - {@link CommonSpinnerControl.OnSymbolEntering}
 * 
 * 可選實作的方法
 * - {@link CommonSpinnerControl.CreateRandomData}
 * - {@link CommonSpinnerControl.OnSymbolRemoved}
 * - {@link CommonSpinnerControl.OnSymbolLeaving}
 * - {@link CommonSpinnerControl.OnSymbolReachBottom}
 * - {@link CommonSpinnerControl.OnSymbolJustStopped}
 * - {@link CommonSpinnerControl.OnSymbolForceSetData}
 * - {@link CommonSpinnerControl.OnTrackConfigReloading}
 * - {@link CommonSpinnerControl.OnTrackConfigReloaded}
 * - {@link CommonSpinnerControl.CanStopReel}
 * 
 * ... 其他說明待補 ...
 */
//================================================================================================
//================================================================================================

@ccclass
export default abstract class CommonSpinnerControl extends Component {
    //----------------------------------------------------------------

    /**
        * @deprecated Use `CommonSpinner.PLATE_STATE` instead
        * @see {@link CommonSpinner.PLATE_STATE}
        */
    public static readonly PlateState = CommonSpinner.PLATE_STATE;

    /**
        * @deprecated Use `CommonSpinner.TRACK_STATE` instead
        * @see {@link CommonSpinner.TRACK_STATE}
        */
    public static readonly TrackState = CommonSpinner.TRACK_STATE;

    //----------------------------------------------------------------

    //================================================================
    // Component's properties
    //================================================================

    //----------------------------------------------------------------

    @property({
        type: [CommonSpinnerTrackConfig],
        displayName: "輪帶配置",
    })
    protected m_trackConfigs: CommonSpinnerTrackConfig[] = [];

    //----------------------------------------------------------------

    //================================================================
    // Member variables
    //================================================================

    //----------------------------------------------------------------
    // Members of control and settings (Won't change a lot in runtime)
    //----------------------------------------------------------------

    protected m_initPrepared: boolean = false;                           // 是否完成基本初始化
    protected m_eventManager: EventDispatcher = new EventDispatcher;              // 事件管理器
    protected m_plateState: StateManager = new StateManager(CommonSpinner.PLATE_STATE.UNKNOWN);             // 盤面狀態機
    protected m_trackState: StateManager[] = [];                         // 軌道狀態機
    protected m_trackTimer: TimedBool[] = [];                            // 軌道計時器
    protected m_trackReloadFlag: boolean[] = [];                         // 軌道重載旗標

    //----------------------------------------------------------------

    protected m_viewNodes: Node[] = [];             // 各軌道顯示節點
    protected m_trackOffset: Vec3[] = [];           // 軌道在顯示節點上的偏移

    protected m_loftSockets: number[] = [];         // 頂層插槽數量
    protected m_mainSockets: number[] = [];         // 主要插槽數量 (可見)
    protected m_baseSockets: number[] = [];         // 底層插槽數量
    protected m_totalSockets: number[] = [];        // 插槽總數

    protected m_socketSizeX: number[] = [];         // 插槽寬度
    protected m_socketSizeY: number[] = [];         // 插槽高度
    protected m_socketBiasY: number[] = [];         // 插槽在軌道上的 Y 軸偏移 (正中央為0)
    protected m_upperBound: number[] = [];          // 軌道的上界
    protected m_lowerBound: number[] = [];          // 軌道的下界
    protected m_totalHeight: number[] = [];         // 軌道總長度

    //----------------------------------------------------------------

    protected m_settingNormal: ReadableCommonSpinnerSpeedConfig = CommonSpinnerDefine.DEFAULT_NORMAL_SPIN_SETTING; // 設定值: 一般
    protected m_settingFaster: ReadableCommonSpinnerSpeedConfig = CommonSpinnerDefine.DEFAULT_FASTER_SPIN_SETTING; // 設定值: 快速
    protected m_settingTurbo: ReadableCommonSpinnerSpeedConfig = CommonSpinnerDefine.DEFAULT_TURBO_SPIN_SETTING;   // 設定值: Turbo

    //----------------------------------------------------------------
    // Members of nodes of symbols
    //----------------------------------------------------------------

    protected m_symbolNodes: Node[][] = [];         // Symbol 節點
    protected m_symbolIndex: number[][] = [];       // 目前的 Node Index 順序 ( Map of socketIndex -> nodeIndex )
    protected m_symbolTween: Tween<Node>[][] = [];  // Symbol Tween 動畫
    protected m_movingFlag: number[] = [];          // 目前 Symbol 是否在移動中

    //----------------------------------------------------------------
    // Members of cache and flag for each spin
    //----------------------------------------------------------------

    protected m_trackStatus: CommonSpinnerTrackStatus[] = [];   // 軌道狀態
    protected m_trackIsIdle: boolean[] = [];        // 軌道是否閒置中

    protected m_stopTriggerTime: number = 0;        // 自動觸發停輪時間 (秒)
    protected m_fixedStopTime: number = -1;         // 固定停輪時間
    protected m_isReadyToStop: boolean = false;     // 是否準備停輪
    protected m_triggerToStop: boolean = false;     // 是否觸發停輪
    protected m_isHardStop: boolean = false;        // 是否為快停/同停/強停
    protected m_isStopRoughly: boolean = false;     // 是否為粗暴停輪 (自動停輪中再觸發快停)
    protected m_skipNearWin: boolean = false;       // 是否跳過 NearWin
    protected m_spinSetting: ReadableCommonSpinnerSpeedConfig = null;                // 轉動所需的設定值
    protected m_speedMode: CommonSpinner.SPEED_MODE = CommonSpinner.SPEED_MODE.NORMAL;  // 速度模式

    protected m_beforeData: any[][] = null;         // 停輪前置資料
    protected m_finalData: any[][] = null;          // 最終盤面資料
    protected m_afterData: any[][] = null;          // 後續盤面資料
    protected m_startData: any[][] = [];            // 轉動時優先使用的資料

    //----------------------------------------------------------------

    //================================================================
    // Getters and Setters
    //================================================================

    //----------------------------------------------------------------

    /**
        * 軌道總數
        */
    public get TotalTracks(): number {
        return this.m_trackConfigs.length;
    }

    /**
        * 是否為快停 / 同停 / 強停
        */
    public get IsHardStop(): boolean {
        return this.m_isHardStop;
    }

    /**
        * Spin 速度設定
        */
    protected get SpeedConfig(): ReadableCommonSpinnerSpeedConfig {
        return this.m_spinSetting ?? CommonSpinnerDefine.DEFAULT_NORMAL_SPIN_SETTING;
    }

    /**
        * 停輪速度
        */
    protected get StopSpeed(): number {
        return this.m_isHardStop ? this.SpeedConfig.hardStopSpeed : this.SpeedConfig.stopSpeed;
    }

    //----------------------------------------------------------------
    /**
        * 速度模式
        * @see {@link CommonSpinner.SPEED_MODE}
        */
    public get SpeedMode(): CommonSpinner.SPEED_MODE {
        return this.m_speedMode;
    }

    /**
        * @deprecated Use `SpeedMode` instead
        * @see {@link CommonSpinnerControl.SpeedMode}
        */
    public get IsFastMode(): boolean {
        return this.m_speedMode >= CommonSpinner.SPEED_MODE.FAST;
    }

    //----------------------------------------------------------------
    /**
        * 轉盤是否停止移動
        */
    public get IsPlateStopped(): boolean {
        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            if (!this.m_trackIsIdle[trackIndex]) {
                return false;
            }
        }

        return true;
    }

    //----------------------------------------------------------------

    protected m_indexOrigin: CommonSpinner.ORIGIN = CommonSpinner.ORIGIN.TOP_LEFT;

    /**
        * 索引原點
        * @see {@link CommonSpinner.ORIGIN}
        */
    public get IndexOrigin(): CommonSpinner.ORIGIN {
        return this.m_indexOrigin;
    }
    public set IndexOrigin(value: CommonSpinner.ORIGIN) {
        this.m_indexOrigin = value;
    }

    /**
        * 原點是否在左上角
        * @see {@link CommonSpinnerControl.IndexOrigin}
        */
    public get IsTopLeftOrigin(): boolean {
        return this.m_indexOrigin === CommonSpinner.ORIGIN.TOP_LEFT;
    }

    //----------------------------------------------------------------

    protected m_speedEasingTime: number = 0;

    /**
        * 速度變換緩衝時間 (秒)
        */
    public get SpeedEasingTime(): number {
        return this.m_speedEasingTime;
    }
    public set SpeedEasingTime(value: number) {
        this.m_speedEasingTime = value;
    }

    //----------------------------------------------------------------

    //================================================================
    // 必須要實作的方法
    //================================================================

    //----------------------------------------------------------------
    /**
        * 創建 Symbol 節點
        * @param trackIndex 軌道索引
        * @param nodeIndex 節點索引
        * @param data 自訂資料
        */
    protected abstract CreateSymbol(trackIndex: number, nodeIndex: number, data?: any): Node;

    //----------------------------------------------------------------
    /**
        * Symbol 節點正在進入
        * @param trackIndex 軌道索引
        * @param nodeIndex 節點索引
        * @param node 節點
        * @param data 自訂資料
        */
    protected abstract OnSymbolEntering(trackIndex: number, nodeIndex: number, node: Node, data?: any): void;

    //----------------------------------------------------------------

    //================================================================
    // 可選實作的方法
    //================================================================

    //----------------------------------------------------------------
    /**
        * 產生 Symbol 隨機資料 ( Symbol 進入盤面若沒有可用 data 時被調用 )
        */
    protected CreateRandomData?(trackIndex: number, nodeIndex: number): any;

    //----------------------------------------------------------------
    /**
        * Symbol 節點被移除 ( 回傳是否已經處理完畢，未處理會在最後被 destroy )
        */
    protected OnSymbolRemoved?(trackIndex: number, nodeIndex: number, node: Node): boolean;

    //----------------------------------------------------------------
    /**
        * Symbol 正要離開盤面 ( Symbol 節點從下方離開時被調用 )
        */
    protected OnSymbolLeaving?(trackIndex: number, nodeIndex: number, node: Node): void;

    //----------------------------------------------------------------
    /**
        * 停輪時 Symbol 抵達最低點 ( Symbol 節點要開始回彈前觸發 )
        */
    protected OnSymbolReachBottom?(trackIndex: number, nodeIndex: number, node: Node): void;

    //----------------------------------------------------------------
    /**
        * Symbol 完全停止 ( Symbol 節點完成回彈之後觸發 )
        */
    protected OnSymbolJustStopped?(trackIndex: number, nodeIndex: number, node: Node): void;

    //----------------------------------------------------------------
    /**
        * 使用 `ForceSetData` 時 Symbol 會從這裡取得資料 ( 使用 `ForceSetData` 時被調用 )
        */
    protected OnSymbolForceSetData?(trackIndex: number, nodeIndex: number, node: Node, data: any): void;

    //----------------------------------------------------------------
    /**
        * 重讀輪帶設定開始 ( 回傳 Symbol 節點重建時使用的資料列 )
        */
    protected OnTrackConfigReloading?(trackIndex: number): any[];

    //----------------------------------------------------------------
    /**
        * 重讀輪帶設定完成
        */
    protected OnTrackConfigReloaded?(trackIndex: number): void;

    //----------------------------------------------------------------
    /**
        * 提供給子類別回傳是否可以停輪 (回傳 true 依舊要等到觸發停輪並且資料準備就緒才會真的停)
        */
    protected CanStopReel(): boolean {
        return true;
    }

    //----------------------------------------------------------------

    //================================================================
    // Life Cycle of Component
    //================================================================

    //----------------------------------------------------------------

    protected __preload(): void {
        this.InitPrepare();
    }

    //----------------------------------------------------------------

    protected onDestroy(): void {
        //this.m_eventManager.Clear();
        this.m_eventManager = null;

        this.m_debugTextMap = null;
        this.m_startData = null;
        this.m_afterData = null;
        this.m_finalData = null;
        this.m_beforeData = null;
        this.m_spinSetting = null;
        this.m_trackIsIdle = null;
        this.m_trackStatus = null;
        this.m_movingFlag = null;
        this.m_symbolTween = null;
        this.m_symbolIndex = null;
        this.m_symbolNodes = null;
        this.m_settingTurbo = null;
        this.m_settingFaster = null;
        this.m_settingNormal = null;
        this.m_totalHeight = null;
        this.m_lowerBound = null;
        this.m_upperBound = null;
        this.m_socketBiasY = null;
        this.m_socketSizeY = null;
        this.m_socketSizeX = null;
        this.m_totalSockets = null;
        this.m_baseSockets = null;
        this.m_mainSockets = null;
        this.m_loftSockets = null;
        this.m_trackOffset = null;
        this.m_viewNodes = null;
        this.m_trackReloadFlag = null;
        this.m_trackTimer = null;
        this.m_trackState = null;
        this.m_plateState = null;
        this.m_trackConfigs = null;
    }

    //----------------------------------------------------------------

    protected update(dt: number): void {
        // 盤面狀態機更新
        const plateState = this.m_plateState.Tick();
        this.PlateProcess(plateState, this.m_plateState.IsEntering, dt);

        // 各軌道計時器與狀態機更新
        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            this.m_trackTimer[trackIndex].Update(dt);
            const trackState = this.m_trackState[trackIndex].Tick();
            this.TrackProcess(trackIndex, trackState, this.m_trackState[trackIndex].IsEntering, dt);
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 基本初始化處理
    //================================================================

    //----------------------------------------------------------------
    /**
        * 元件基本初始化處理
        */
    protected InitPrepare() {
        if (!this.m_initPrepared) {
            // 檢查必要方法是否實作: CreateSymbol
            if (typeof this.CreateSymbol !== "function") {
                error("CommonSpinnerControl: CreateSymbol method is not implemented!");
            }

            // 檢查必要方法是否實作: OnSymbolEntering
            if (typeof this.OnSymbolEntering !== "function") {
                error("CommonSpinnerControl: OnSymbolEntering method is not implemented!");
            }

            // 初始化盤面狀態機
            this.m_plateState
                .SetHandler(this.CreatePlateStateHandlerMap())
                .Init(CommonSpinner.PLATE_STATE.UNKNOWN);

            // 各軌道依序初始化
            for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
                // 初始化狀態機
                this.m_trackState[trackIndex] = new StateManager(CommonSpinner.TRACK_STATE.UNKNOWN);
                this.m_trackState[trackIndex].Init(CommonSpinner.TRACK_STATE.UNKNOWN, 0, this.CreateTrackStateHandlerMap(trackIndex));

                // 初始化計時器
                this.m_trackTimer[trackIndex] = new TimedBool;
                this.m_trackTimer[trackIndex].UseDT(true);
                this.m_trackTimer[trackIndex].Clear();

                // 初始化重載旗標
                this.m_trackReloadFlag[trackIndex] = false;

                // 取得軌道配置
                const trackConfig = this.m_trackConfigs[trackIndex];

                // 取得顯示根節點
                this.m_viewNodes[trackIndex] = trackConfig.ViewNode ?? this.node;

                // 計算顯示位置 ( 使用參考節點 ) 或 直接使用設定的位置
                this.m_trackOffset[trackIndex] = trackConfig.UseRefNode
                    ? ConvertNodeSpacePosition(trackConfig.RefNode, this.m_viewNodes[trackIndex])
                    : trackConfig.Position;

                // 取得各軌道基本資訊
                this.m_loftSockets[trackIndex] = trackConfig.LoftSockets;
                this.m_mainSockets[trackIndex] = trackConfig.MainSockets;
                this.m_baseSockets[trackIndex] = trackConfig.BaseSockets;
                this.m_totalSockets[trackIndex] = trackConfig.TotalSockets;
                this.m_socketSizeX[trackIndex] = trackConfig.SocketSize.x;
                this.m_socketSizeY[trackIndex] = trackConfig.SocketSize.y;
                this.m_socketBiasY[trackIndex] = trackConfig.SocketBiasY;
                this.m_upperBound[trackIndex] = trackConfig.UpperBound + this.m_trackOffset[trackIndex].y;
                this.m_lowerBound[trackIndex] = trackConfig.LowerBound + this.m_trackOffset[trackIndex].y;
                this.m_totalHeight[trackIndex] = trackConfig.TotalHeight;

                // 初始化 Symbol 節點相關
                this.m_symbolNodes[trackIndex] = [];
                this.m_symbolIndex[trackIndex] = [];
                this.m_symbolTween[trackIndex] = [];
                this.m_movingFlag[trackIndex] = 0x0;

                // 初始化狀態元件
                this.m_trackStatus[trackIndex] = new CommonSpinnerTrackStatus(trackIndex);
                this.m_trackIsIdle[trackIndex] = true;
            }

            // 標記初始化準備就緒
            this.m_initPrepared = true;
        }
    }

    //----------------------------------------------------------------
    /**
        * 初始化
        * @param initData 初始盤面資料
        * @warning 注意! 每次呼叫都會重建所有的節點，如果只是要替換目前盤面的資料請改用 `ForceSetData` 減少資源消耗
        */
    public Init(initData?: any[][], ...args: any[]) {
        this.InitPrepare();

        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            // [Symbol 節點生成]
            for (let nodeIndex = 0; nodeIndex < this.m_totalSockets[trackIndex]; nodeIndex++) {
                // 把舊的 Symbol 移除
                this._removeSymbolNode(trackIndex, nodeIndex);

                // 生成新的 Symbol
                const socketIndex = nodeIndex - this.m_baseSockets[trackIndex];
                const socketPos = this.GetSocketLocationOnTrack(trackIndex, socketIndex);
                const dataIndex = this.IsTopLeftOrigin ? (this.m_mainSockets[trackIndex] + this.m_baseSockets[trackIndex] - 1 - nodeIndex) : socketIndex;
                const data = this.ValidateSymbolData(trackIndex, dataIndex, initData?.[trackIndex]?.[dataIndex]);
                const node = this._createSymbolNode(trackIndex, nodeIndex, data);
                node.position = socketPos.add(this.m_trackOffset[trackIndex]);
                node.parent = this.m_viewNodes[trackIndex];

                this.m_symbolNodes[trackIndex][nodeIndex] = node;
                this.m_symbolIndex[trackIndex][nodeIndex] = nodeIndex;
            }

            // 清掉各類旗標
            this.m_movingFlag[trackIndex] = 0x0;
            this.m_symbolTween[trackIndex] = [];

            // 刷新 Symbol 索引
            this.RefreshSymbolIndexMap(trackIndex);

            // 切狀態與重置計時器
            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.IDLE);
            this.m_trackTimer[trackIndex].Clear();
        }

        // 清掉除錯用文字並更新
        this.ClearDebugText();
        this.OnDebugModeChanged();

        // 準備就緒
        this.m_plateState.Transit(CommonSpinner.PLATE_STATE.IDLE);
    }

    //----------------------------------------------------------------

    //================================================================
    // 事件處理
    //================================================================

    //----------------------------------------------------------------
    /**
        * 註冊事件
        * @see {@link CommonSpinner.EVENT}
        */
    public On(event: string, callback: Function, target?: any) {
        this.m_eventManager.On(event, callback, target);
    }

    /**
        * 註銷事件
        * @see {@link CommonSpinner.EVENT}
        */
    public Off(event: string, callback: Function, target?: any) {
        this.m_eventManager.Off(event, callback, target);
    }

    /**
        * 註冊單次事件
        * @see {@link CommonSpinner.EVENT}
        */
    public Once(event: string, callback: Function, target?: any) {
        this.m_eventManager.Once(event, callback, target);
    }

    /**
        * 派發事件
        */
    protected Dispatch(event: string, ...args: any[]) {
        this.m_eventManager.Dispatch(event, ...args);
    }

    //----------------------------------------------------------------

    //================================================================
    // 客製化設定
    //================================================================

    //----------------------------------------------------------------
    /**
        * 替換速度設定
        * @see {@link CommonSpinnerSpeedConfig}
        * @see {@link CommonSpinnerDefine.DEFAULT_SETTINGS}
        */
    public ConfigureSettings(settings: {
        NORMAL?: ReadableCommonSpinnerSpeedConfig,
        FASTER?: ReadableCommonSpinnerSpeedConfig,
        TURBO?: ReadableCommonSpinnerSpeedConfig,
    }) {
        if (isValid(settings?.NORMAL)) {
            this.m_settingNormal = settings.NORMAL;
        }

        if (isValid(settings?.FASTER)) {
            this.m_settingFaster = settings.FASTER;
        }

        if (isValid(settings?.TURBO)) {
            this.m_settingTurbo = settings.TURBO;
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 取得盤面與節點資訊
    //================================================================

    //----------------------------------------------------------------
    /**
        * 取得目前軌道上第 `socketIndex` 個插槽的 Symbol 節點索引 ( `nodeIndex` )
        * 
        * @description
        * - {@link CommonSpinnerControl.IsTopLeftOrigin}
        * > - `true` 時 主要插槽上面開始第一個 `socketIndex` 為 `0`
        * > - `false` 時 主要插槽下面開始第一個 `socketIndex` 為 `0`
        */
    public GetSymbolIndex(trackIndex: number, socketIndex: number): number {
        return this.IsTopLeftOrigin
            ? this.m_symbolIndex[trackIndex][this.m_baseSockets[trackIndex] + (this.m_mainSockets[trackIndex] - 1 - socketIndex)]
            : this.m_symbolIndex[trackIndex][this.m_baseSockets[trackIndex] + socketIndex];
    }

    //----------------------------------------------------------------
    /**
        * 取得目前軌道上第 `socketIndex` 個插槽的 Symbol 節點
        * 
        * @description
        * - {@link CommonSpinnerControl.IsTopLeftOrigin}
        * > - `true` 時 主要插槽上面開始第一個 `socketIndex` 為 `0`
        * > - `false` 時 主要插槽下面開始第一個 `socketIndex` 為 `0`
        */
    public GetSymbolNode(trackIndex: number, socketIndex: number): Node {
        const nodeIndex = this.GetSymbolIndex(trackIndex, socketIndex);
        return this.m_symbolNodes[trackIndex][nodeIndex];
    }

    //----------------------------------------------------------------
    /**
        * 取得指定索引的 Symbol 節點目前在軌道上的位置座標，移動後會改變
        * @param trackIndex 軌道索引 (0, 1, 2, 3...)
        * @param nodeIndex Symbol 節點索引
        */
    public GetSymbolPositionOnTrack(trackIndex: number, nodeIndex: number): Vec3 {
        return new Vec3(0, this.m_symbolNodes[trackIndex][nodeIndex].position.y);
    }

    //----------------------------------------------------------------
    /**
        * 取得指定索引的 Symbol 節點目前在盤面上的位置座標，移動後會改變
        * @param trackIndex 軌道索引 (0, 1, 2, 3...)
        * @param nodeIndex Symbol 節點索引
        */
    public GetSymbolPositionOnPlate(trackIndex: number, nodeIndex: number): Vec3 {
        const position = this.GetSymbolPositionOnTrack(trackIndex, nodeIndex);
        return this.m_trackConfigs[trackIndex].Position.clone().add(position);
    }

    //----------------------------------------------------------------
    /**
        * 取得軌道上第 `socketIndex` 個插槽在軌道上的座標 (固定值)
        * @param trackIndex 軌道索引 (0, 1, 2, 3...)
        * @param socketIndex 插槽索引
        * 
        * @description
        * - {@link CommonSpinnerControl.IsTopLeftOrigin}
        * > - `true` 時 主要插槽上面開始第一個 `socketIndex` 為 `0`
        * > - `false` 時 主要插槽下面開始第一個 `socketIndex` 為 `0`
        */
    public GetSocketPositionOnTrack(trackIndex: number, socketIndex: number): Vec3 {
        const index = this.IsTopLeftOrigin ? (this.m_mainSockets[trackIndex] - 1 - socketIndex) : socketIndex;
        return new Vec3(0, this.m_socketSizeY[trackIndex] * index + this.m_socketBiasY[trackIndex]);
    }

    //----------------------------------------------------------------
    /**
        * 取得軌道上第 `socketIndex` 個插槽在盤面上的座標
        * @param trackIndex 軌道索引 (0, 1, 2, 3...)
        * @param socketIndex 插槽索引 (0, 1, 2, 3...)
        * 
        * @description
        * - {@link CommonSpinnerControl.IsTopLeftOrigin}
        * > - `true` 時 主要插槽上面開始第一個 `socketIndex` 為 `0`
        * > - `false` 時 主要插槽下面開始第一個 `socketIndex` 為 `0`
        */
    public GetSocketPositionOnPlate(trackIndex: number, socketIndex: number): Vec3 {
        const position = this.GetSocketPositionOnTrack(trackIndex, socketIndex);
        return this.m_trackConfigs[trackIndex].Position.clone().add(position);
    }

    //----------------------------------------------------------------
    /**
        * 取得軌道上第 `socketIndex` 個插槽在軌道上的座標 (由下至上)
        */
    protected GetSocketLocationOnTrack(trackIndex: number, socketIndex: number): Vec3 {
        return new Vec3(0, this.m_socketSizeY[trackIndex] * socketIndex + this.m_socketBiasY[trackIndex]);
    }

    //----------------------------------------------------------------
    /**
        * 取得目前第 `trackIndex` 個軌道最下方插槽的 Symbol 節點索引
        */
    protected IndexOfLowestSocketInTrack(trackIndex: number): number {
        let lowestNodeIndex = 0;

        for (let nodeIndex = 0; nodeIndex < this.m_totalSockets[trackIndex]; nodeIndex++) {
            if (this.m_symbolNodes[trackIndex][nodeIndex].position.y < this.m_symbolNodes[trackIndex][lowestNodeIndex].position.y) {
                lowestNodeIndex = nodeIndex;
            }
        }

        return lowestNodeIndex;
    }

    //----------------------------------------------------------------
    /**
        * 刷新 Symbol 節點索引 MAP
        */
    protected RefreshSymbolIndexMap(trackIndex: number) {
        const lowestNodeIndex = this.IndexOfLowestSocketInTrack(trackIndex);

        if (this.m_symbolIndex[trackIndex][0] != lowestNodeIndex) {
            const totalSockets = this.m_totalSockets[trackIndex];
            for (let nodeIndex = 0; nodeIndex < totalSockets; nodeIndex++) {
                this.m_symbolIndex[trackIndex][nodeIndex] = (nodeIndex + lowestNodeIndex) % totalSockets;
            }
        }
    }

    //----------------------------------------------------------------
    /**
        * 檢查 Data 是否有效，無效時會使用 `CreateRandomData` 產生新的資料
        */
    protected ValidateSymbolData(trackIndex: number, nodeIndex: number, inputData: any): any {
        return isValid(inputData)
            ? inputData
            : this.CreateRandomData?.(trackIndex, nodeIndex) ?? null;
    }

    //----------------------------------------------------------------

    //================================================================
    // Spin 控制
    //================================================================

    //----------------------------------------------------------------
    /**
        * 啟動輪帶
        * @param speedMode 自定義本次速度模式
        * @param speedConfig 自定義本次速度設定
        */
    public SpinReel(speedMode: boolean | CommonSpinner.SPEED_MODE = CommonSpinner.SPEED_MODE.NORMAL, speedConfig?: CommonSpinnerSpeedConfig) {
        // 未初始化
        if (this.m_plateState.Current == CommonSpinner.PLATE_STATE.UNKNOWN) {
            warn("Has not been initialized. Please run Init() first.");
            return;
        }

        // 輪帶非閒置狀態
        if (this.m_plateState.Current != CommonSpinner.PLATE_STATE.IDLE && this.m_plateState.Next != CommonSpinner.PLATE_STATE.IDLE) {
            warn("Reel must be in idle state.");
            return;
        }

        // 輪帶正在轉動
        if (!this.IsPlateStopped) {
            warn("Reel must be stopped");
            return;
        }

        // 設定速度模式
        if (typeof speedMode == "boolean") {
            this.m_speedMode = speedMode
                ? CommonSpinner.SPEED_MODE.FAST
                : CommonSpinner.SPEED_MODE.NORMAL;
        }
        else {
            this.m_speedMode = speedMode;
        }

        // 自定義速度設定
        if (isValid(speedConfig)) {
            this.m_spinSetting = speedConfig;
        }
        // 使用模式選擇速度設定
        else {
            switch (this.m_speedMode) {
                case CommonSpinner.SPEED_MODE.NORMAL:
                    this.m_spinSetting = this.m_settingNormal;
                    break;
                case CommonSpinner.SPEED_MODE.FAST:
                    this.m_spinSetting = this.m_settingFaster;
                    break;
                case CommonSpinner.SPEED_MODE.TURBO:
                    this.m_spinSetting = this.m_settingTurbo;
                    break;
                default:
                    this.m_spinSetting = this.m_settingNormal;
                    this.m_speedMode = CommonSpinner.SPEED_MODE.NORMAL;
                    break;
            }
        }

        // 設定輪帶初始狀態
        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            this.m_trackIsIdle[trackIndex] = false;
            this.m_trackStatus[trackIndex].DelayToRun = this.SpeedConfig.beginInterval * trackIndex;
            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.WAIT_TO_RUN);
        }

        // 輪帶，啟動
        this.m_plateState.Transit(CommonSpinner.PLATE_STATE.SPINNING);
    }

    //----------------------------------------------------------------
    /**
        * 依序停輪
        */
    public StopReel() {
        if (this.m_plateState.Current != CommonSpinner.PLATE_STATE.IDLE) {
            this.m_triggerToStop = true;
        }
    }

    //----------------------------------------------------------------
    /**
        * 快停 / 同停 / 強停
        * @param skipNearWin 是否跳過 NearWin 階段
        */
    public StopHard(skipNearWin: boolean = false) {
        if (this.m_plateState.Current == CommonSpinner.PLATE_STATE.IDLE || this.m_isHardStop) {
            return;
        }

        // 設定旗標
        this.m_skipNearWin = skipNearWin;
        this.m_isHardStop = true;
        this.m_triggerToStop = true;

        // 判斷是否依序停輪中再觸發快停
        this.m_isStopRoughly = (
            this.m_plateState.Current == CommonSpinner.PLATE_STATE.GENTLY_STOP
            || this.m_plateState.Next == CommonSpinner.PLATE_STATE.GENTLY_STOP
        );

        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            const currState = this.m_trackState[trackIndex].Current;
            const trackStatus = this.m_trackStatus[trackIndex];

            // 等待中，跳過並直接開始停輪
            if (currState == CommonSpinner.TRACK_STATE.WAIT_TO_STOP) {
                trackStatus.DelayToStop = 0;
                this.m_trackTimer[trackIndex].ExpireNow();
            }

            // 非 NearWin 狀態且已經準備好停輪，進入停輪階段
            if (currState != CommonSpinner.TRACK_STATE.NEAR_WIN && this.m_isReadyToStop) {
                trackStatus.SpeedTo(this.StopSpeed, this.SpeedEasingTime);
            }

            // 跳過 NearWin 階段處理
            if (skipNearWin && trackStatus.IsNearWin) {
                trackStatus.IsNearWin = false;
                trackStatus.DelayToNearWin = 0;

                // 以下階段將計時器歸零
                switch (currState) {
                    case CommonSpinner.TRACK_STATE.WAIT_TO_STOP:
                    case CommonSpinner.TRACK_STATE.WAIT_TO_NEAR_WIN:
                    case CommonSpinner.TRACK_STATE.NEAR_WIN:
                        this.m_trackTimer[trackIndex].ExpireNow();
                        break;
                }
            }
        }
    }

    //----------------------------------------------------------------
    /**
        * 重置停輪觸發時間
        * @param second 新觸發時間
        */
    public ResetStopTriggerTime(second?: number) {
        if (this.m_plateState.Current == CommonSpinner.PLATE_STATE.SPINNING) {
            this.m_stopTriggerTime = second >= 0 ? second : this.SpeedConfig.stopTriggerTime;
            this.m_triggerToStop = false;
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // Symbol 資料設定
    //================================================================

    //----------------------------------------------------------------
    /**
        * 設定停輪後盤面資料
        * @param dataArray 自定義資料
        * @param nearWinConfig 各個軌道的 NearWin 情形
        * - 使用 `boolean[]` 時會使用 `SpeedConfig` 的時間
        * - 使用 `number[]`  時表示 NearWin 的表演時間 ( 秒 )，不大於 0 時不表演 NearWin
        */
    public SetFinalData(dataArray: any[][], nearWinConfig?: boolean[] | number[]) {
        this.m_finalData = dataArray;

        // 設定 NearWin 狀態
        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            const trackStatus = this.m_trackStatus[trackIndex];
            const nearWinAttr = nearWinConfig?.[trackIndex];

            if (typeof nearWinAttr == 'boolean') {
                trackStatus.IsNearWin = nearWinAttr;
                trackStatus.NearWinTime = nearWinAttr ? this.SpeedConfig?.nearWinTime : 0;
            }
            else if (typeof nearWinAttr == 'number') {
                trackStatus.IsNearWin = nearWinAttr > 0;
                trackStatus.NearWinTime = Math.max(0, nearWinAttr);
            }
            else {
                trackStatus.IsNearWin = false;
                trackStatus.NearWinTime = 0;
            }
        }

        this.m_isReadyToStop = true;
    }

    //----------------------------------------------------------------
    /**
        * 設定停輪前置資料 (非必要)
        * @param dataArray 自定義資料
        */
    public SetBeforeData(dataArray: any[][]) {
        this.m_beforeData = dataArray;
    }

    //----------------------------------------------------------------
    /**
        * 設定後續盤面資料 (非必要)
        * @param dataArray 自定義資料
        */
    public SetAfterData(dataArray: any[][]) {
        this.m_afterData = dataArray;
    }

    //----------------------------------------------------------------
    /**
        * 當轉輪靜止時直接替換目前盤面的資料
        * @param dataArray 自定義資料
        * @notice 需要實作 {@link CommonSpinnerControl.OnSymbolForceSetData} 方法
        */
    public ForceSetData(dataArray: any[][]) {
        if (typeof this.OnSymbolForceSetData !== "function") {
            error("CommonSpinnerControl: OnSymbolForceSetData method is not implemented!", this, dataArray);
            return;
        }

        if (this.m_plateState.Current != CommonSpinner.PLATE_STATE.IDLE && this.m_plateState.Next != CommonSpinner.PLATE_STATE.IDLE) {
            error("CommonSpinnerControl.ForceSetData: Reel is not in idle state.", this, dataArray);
            return;
        }

        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            for (let socketIndex = 0; socketIndex < this.m_mainSockets[trackIndex]; socketIndex++) {
                const nodeIndex = this.GetSymbolIndex(trackIndex, socketIndex);
                const node = this.m_symbolNodes[trackIndex][nodeIndex];
                const data = this.ValidateSymbolData(trackIndex, nodeIndex, dataArray?.[trackIndex]?.[socketIndex]);
                this.OnSymbolForceSetData?.(trackIndex, nodeIndex, node, data);
            }
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 狀態機處理
    //================================================================

    //----------------------------------------------------------------
    /**
        * 轉盤 Process
        */
    protected PlateProcess(state: number, isEntering: boolean, dt: number) {
        if (this.DebugMode && isEntering) {
            log(`CommonSpinnerControl.PlateProcess.IsEntering: ${state}`);
        }
    }

    //----------------------------------------------------------------
    /**
        * 軌道 Process
        */
    protected TrackProcess(index: number, state: number, isEntering: boolean, dt: number) {
        if (this.DebugMode && isEntering) {
            log(`CommonSpinnerControl.TrackProcess[ ${index} ].IsEntering: ${state}`);
        }
    }

    //----------------------------------------------------------------
    /**
        * 建立盤面狀態機處理器 Map
        * 可以覆寫此方法來自訂盤面狀態機處理器
        * 或在 {@link CommonSpinnerControl.PlateProcess} 中處理自訂的狀態
        */
    protected CreatePlateStateHandlerMap() {
        return {
            //----------------------------------------------------------
            // [閒置中]
            [CommonSpinner.PLATE_STATE.IDLE]: {
                OnEnter: () => {
                    this.PlateReset();
                    this.Dispatch(CommonSpinner.EVENT.PLATE_ENTER_IDLE);
                },
            },

            //----------------------------------------------------------
            // [轉動中]
            [CommonSpinner.PLATE_STATE.SPINNING]: {
                OnEnter: () => {
                    this.m_stopTriggerTime = this.SpeedConfig.stopTriggerTime;
                    this.Dispatch(CommonSpinner.EVENT.PLATE_START_SPINNING);
                },

                OnProcess: (dt: number) => {
                    if (this.m_stopTriggerTime > 0) {
                        this.m_stopTriggerTime -= dt;
                    }
                    else {
                        this.m_stopTriggerTime = 0;
                        this.m_triggerToStop = true;
                    }

                    if (this.m_triggerToStop && this.m_isReadyToStop && this.CanStopReel()) {
                        this.PlateStop();
                    }
                },
            },

            //----------------------------------------------------------
            // [依序停輪中]
            [CommonSpinner.PLATE_STATE.GENTLY_STOP]: {
                OnEnter: () => {
                    this.Dispatch(CommonSpinner.EVENT.PLATE_START_STOPPING);
                },

                OnProcess: (dt: number) => {
                    if (this.IsPlateStopped && !this.m_plateState.IsEntering) {
                        this.Dispatch(CommonSpinner.EVENT.PLATE_JUST_STOPPED);
                        this.m_plateState.Transit(CommonSpinner.PLATE_STATE.IDLE);
                    }
                    else if (this.m_isStopRoughly) {
                        this.PlateStop();
                    }
                },
            },

            //----------------------------------------------------------
            // [停輪中]
            [CommonSpinner.PLATE_STATE.STOPPING]: {
                OnEnter: () => {
                    this.Dispatch(CommonSpinner.EVENT.PLATE_START_STOPPING);
                },

                OnProcess: (dt: number) => {
                    if (this.IsPlateStopped && !this.m_plateState.IsEntering) {
                        this.Dispatch(CommonSpinner.EVENT.PLATE_JUST_STOPPED);
                        this.m_plateState.Transit(CommonSpinner.PLATE_STATE.IDLE);
                    }
                },
            },

            //----------------------------------------------------------
        };
    }

    //----------------------------------------------------------------
    /**
        * 建立軌道狀態機處理器 Map
        * 可以覆寫此方法來自訂軌道狀態機處理器
        * 或在 {@link CommonSpinnerControl.TrackProcess} 中處理自訂的狀態
        */
    protected CreateTrackStateHandlerMap(trackIndex: number) {
        return {
            //----------------------------------------------------------
            // [閒置中]
            [CommonSpinner.TRACK_STATE.IDLE]: {
                OnEnter: () => {
                    this.m_trackIsIdle[trackIndex] = true;
                    this.m_trackStatus[trackIndex].Reset();
                    this.m_trackReloadFlag[trackIndex] && this.ReloadTrackConfig(trackIndex);
                    this.Dispatch(CommonSpinner.EVENT.TRACK_ENTER_IDLE, trackIndex);
                },
            },

            //----------------------------------------------------------
            // [等待啟動]
            [CommonSpinner.TRACK_STATE.WAIT_TO_RUN]: {
                OnEnter: () => {
                    const delayTime = this.m_trackStatus[trackIndex].DelayToRun;
                    this.StartTrackTimer(trackIndex, delayTime);
                    this.Dispatch(CommonSpinner.EVENT.TRACK_WAIT_TO_RUN, trackIndex, (delayTime > 0 ? delayTime : 0));
                },

                OnProcess: () => {
                    if (this.CheckTrackTimer(trackIndex)) {
                        this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.CHARGING);
                    }
                },
            },

            //----------------------------------------------------------
            // [拉回中]
            [CommonSpinner.TRACK_STATE.CHARGING]: {
                OnEnter: () => {
                    const chargeTime = this.SpeedConfig.chargeTime;
                    this.StartTrackTimer(trackIndex, chargeTime);
                    this.TrackCharge(trackIndex);
                    this.Dispatch(CommonSpinner.EVENT.TRACK_START_CHARGING, trackIndex, (chargeTime > 0 ? chargeTime : 0));
                },

                OnProcess: (dt: number) => {
                    if (this.CheckTrackTimer(trackIndex)) {
                        this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.SPINNING);
                    }
                },
            },

            //----------------------------------------------------------
            // [轉動中]
            [CommonSpinner.TRACK_STATE.SPINNING]: {
                OnEnter: () => {
                    this.m_trackReloadFlag[trackIndex] && this.ReloadTrackConfig(trackIndex);
                    this.m_trackStatus[trackIndex].SpeedTo(this.SpeedConfig.moveSpeed, this.SpeedEasingTime);
                    this.Dispatch(CommonSpinner.EVENT.TRACK_START_SPINNING, trackIndex);
                },

                OnProcess: (dt: number) => {
                    if (this.m_triggerToStop && this.m_isReadyToStop && this.CanStopReel()) {
                        this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.WAIT_TO_STOP);
                    }

                    this.TrackMove(trackIndex, this.m_trackStatus[trackIndex].Speed * dt);
                },
            },

            //----------------------------------------------------------
            // [等待進入停輪]
            [CommonSpinner.TRACK_STATE.WAIT_TO_STOP]: {
                OnEnter: () => {
                    const delayTime = this.m_trackStatus[trackIndex].DelayToStop;
                    const easeTime = Math.min(this.SpeedEasingTime, delayTime);
                    this.m_trackStatus[trackIndex].SpeedTo(this.StopSpeed, easeTime);
                    this.StartTrackTimer(trackIndex, delayTime);
                    this.Dispatch(CommonSpinner.EVENT.TRACK_WAIT_TO_STOP, trackIndex, (delayTime > 0 ? delayTime : 0));
                },

                OnProcess: (dt: number) => {
                    if (this.CheckTrackTimer(trackIndex)) {
                        if (this.m_trackStatus[trackIndex].DelayToNearWin > 0) {
                            // [等待前面輪 NearWin 結束]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.WAIT_TO_NEAR_WIN);
                        }
                        else if (this.m_trackStatus[trackIndex].IsNearWin) {
                            // [不用等直接開始 NearWin 表演]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.NEAR_WIN);
                        }
                        else if (this.m_beforeData?.[trackIndex]?.length > 0) {
                            // [停輪前置作業]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.PRE_STOP);
                        }
                        else {
                            // [開始停輪]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.STOPPING);
                        }
                    }

                    this.TrackMove(trackIndex, this.m_trackStatus[trackIndex].Speed * dt);
                },
            },

            //----------------------------------------------------------
            // [等待進入 Near Win]
            [CommonSpinner.TRACK_STATE.WAIT_TO_NEAR_WIN]: {
                OnEnter: () => {
                    const delayTime = this.m_trackStatus[trackIndex].DelayToNearWin;
                    this.StartTrackTimer(trackIndex, delayTime);
                    this.Dispatch(CommonSpinner.EVENT.TRACK_WAIT_TO_NEAR_WIN, trackIndex, (delayTime > 0 ? delayTime : 0));
                },

                OnProcess: (dt: number) => {
                    if (this.CheckTrackTimer(trackIndex)) {
                        if (this.m_trackStatus[trackIndex].IsNearWin) {
                            // [進行 NearWin 表演]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.NEAR_WIN);
                        }
                        else if (this.m_beforeData?.[trackIndex]?.length > 0) {
                            // [停輪前置作業]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.PRE_STOP);
                        }
                        else {
                            // [開始停輪]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.STOPPING);
                        }
                    }

                    this.TrackMove(trackIndex, this.m_trackStatus[trackIndex].Speed * dt);
                },
            },

            //----------------------------------------------------------
            // [Near Win 效果中]
            [CommonSpinner.TRACK_STATE.NEAR_WIN]: {
                OnEnter: () => {
                    const nearWinTime = this.m_trackStatus[trackIndex].NearWinTime;
                    const easeTime = Math.min(this.SpeedEasingTime, nearWinTime);
                    this.m_trackStatus[trackIndex].SpeedTo(this.SpeedConfig.nearWinSpeed, easeTime);
                    this.StartTrackTimer(trackIndex, nearWinTime);
                    this.Dispatch(CommonSpinner.EVENT.TRACK_START_NEAR_WIN, trackIndex, (nearWinTime > 0 ? nearWinTime : 0));
                },

                OnProcess: (dt: number) => {
                    if (this.CheckTrackTimer(trackIndex)) {
                        if (this.m_beforeData?.[trackIndex]?.length > 0) {
                            // [停輪前置作業]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.PRE_STOP);
                        }
                        else {
                            // [開始停輪]
                            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.STOPPING);
                        }
                    }

                    this.TrackMove(trackIndex, this.m_trackStatus[trackIndex].Speed * dt);
                },
            },

            //----------------------------------------------------------
            // [停輪前置作業]
            [CommonSpinner.TRACK_STATE.PRE_STOP]: {
                OnEnter: () => {
                    this.Dispatch(CommonSpinner.EVENT.TRACK_PREPARING_STOP, trackIndex);
                },

                OnProcess: (dt: number) => {
                    this.TrackMoveInPreStop(trackIndex, this.m_trackStatus[trackIndex].Speed * dt);

                    // 停輪前置資料用盡 進入實際停輪
                    if (!(this.m_beforeData?.[trackIndex]?.length > 0)) {
                        this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.STOPPING);
                    }
                },
            },

            //----------------------------------------------------------
            // [停輪中]
            [CommonSpinner.TRACK_STATE.STOPPING]: {
                OnEnter: () => {
                    if (this.SpeedConfig.stopMode == CommonSpinner.STOP_MODE.FIXED_TIME) {
                        if (trackIndex == 0) {
                            // 第一輪存下停輪時間
                            this.m_fixedStopTime = this.TrackLanding(trackIndex);
                        }
                        else if (this.m_fixedStopTime > 0 && !this.m_trackStatus[trackIndex].IsNearWin) {
                            // 其他輪使用第一輪的停輪時間
                            this.TrackLanding(trackIndex, this.m_fixedStopTime);
                        }
                        else {
                            // 其他輪自己停輪
                            this.TrackLanding(trackIndex);
                        }
                    }
                    else {
                        // 定速停輪 (不同輪帶可能有不同的停輪時間)
                        this.TrackLanding(trackIndex);
                    }
                },

                OnProcess: () => {
                    if (this.m_isStopRoughly) {
                        this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.STOPPING_HARD);
                    }
                },
            },

            //----------------------------------------------------------
            // [強停中]
            [CommonSpinner.TRACK_STATE.STOPPING_HARD]: {
                OnEnter: () => {
                    // 中斷目前的停輪動作
                    for (let nodeIndex = 0; nodeIndex < this.m_symbolTween[trackIndex].length; nodeIndex++) {
                        this.m_symbolTween[trackIndex][nodeIndex]?.stop();
                        this.m_symbolTween[trackIndex][nodeIndex] = null;
                    }

                    // 調整輪速
                    const delay = this.m_trackStatus[trackIndex].DelayToStop;
                    const easeTime = Math.min(this.SpeedEasingTime, delay);
                    this.m_trackStatus[trackIndex].SpeedTo(this.StopSpeed, easeTime);
                    this.StartTrackTimer(trackIndex, delay);

                    // 重新表演停輪
                    if (this.SpeedConfig.stopMode == CommonSpinner.STOP_MODE.FIXED_TIME) {
                        if (trackIndex == 0) {
                            // 第一輪存下停輪時間
                            this.m_fixedStopTime = this.TrackLanding(trackIndex);
                        }
                        else if (this.m_fixedStopTime > 0 && !this.m_trackStatus[trackIndex].IsNearWin) {
                            // 其他輪使用第一輪的停輪時間
                            this.TrackLanding(trackIndex, this.m_fixedStopTime);
                        }
                        else {
                            // 其他輪自己停輪
                            this.TrackLanding(trackIndex);
                        }
                    }
                    else {
                        // 定速停輪 (不同輪帶可能有不同的停輪時間)
                        this.TrackLanding(trackIndex);
                    }
                },
            },

            //----------------------------------------------------------
            // [回彈中]
            [CommonSpinner.TRACK_STATE.REBOUND]: {
                OnEnter: () => {
                    this.TrackRebound(trackIndex);
                },
            },

            //----------------------------------------------------------
        };
    }

    //----------------------------------------------------------------

    //================================================================
    // 計時器控制
    //================================================================

    //----------------------------------------------------------------
    /**
        * 起始軌道計時器
        * @param trackIndex 軌道索引
        * @param second 秒數
        */
    protected StartTrackTimer(trackIndex: number, second: number): void {
        if (this.m_trackTimer[trackIndex]) {
            (second > 0)
                ? this.m_trackTimer[trackIndex].Start(second)
                : this.m_trackTimer[trackIndex].ExpireNow();
        }
    }

    //----------------------------------------------------------------
    /**
        * 檢查軌道計時器是否逾時並清除
        * @param trackIndex 軌道索引
        * @returns 是否逾時
        */
    protected CheckTrackTimer(trackIndex: number): boolean {
        if (this.m_trackTimer[trackIndex]?.ToBool()) {
            this.m_trackTimer[trackIndex].Clear();
            return true;
        }

        return false;
    }

    //----------------------------------------------------------------

    //================================================================
    // 盤面 Spin 控制
    //================================================================

    //----------------------------------------------------------------
    /**
        * 重置轉盤狀態
        */
    protected PlateReset() {
        this.m_stopTriggerTime = 0;
        this.m_fixedStopTime = -1;
        this.m_isReadyToStop = false;
        this.m_triggerToStop = false;
        this.m_isHardStop = false;
        this.m_isStopRoughly = false;
        this.m_skipNearWin = false;
        this.m_beforeData = null;
        this.m_finalData = null;
        this.m_afterData = null;
        this.m_spinSetting = null;
    }

    //----------------------------------------------------------------
    /**
        * 設定停輪時間差
        */
    protected PlateStop() {
        // 延遲幾秒後開始停輪
        let delayToStop = this.m_isHardStop ? 0 : this.SpeedConfig.endedDelay;

        // 累積的 NearWin 時間 (秒)
        let delayToNearWin = 0;

        // 前一輪的停輪時間 (秒)
        let prevStopTime = 0;

        for (let trackIndex = 0; trackIndex < this.TotalTracks; trackIndex++) {
            const trackStatus = this.m_trackStatus[trackIndex];

            // 等前一輪停輪結束
            trackStatus.DelayToStop = delayToStop;

            // 正常情況下 NearWin 快停不能跳過，另外紀錄起來
            trackStatus.DelayToNearWin = delayToNearWin;

            // 特殊需求跳過 NearWin 階段
            if (this.m_skipNearWin) {
                trackStatus.IsNearWin = false;
            }
            // 等前面輪停後開始 NearWin，並且計算下一輪要等多久
            else if (trackStatus.IsNearWin) {
                trackStatus.DelayToNearWin += prevStopTime;
                delayToNearWin += trackStatus.NearWinTime + prevStopTime;
            }

            // 不是快停或 NearWin 加上停輪間隔時間
            if (!this.m_isHardStop && !trackStatus.IsNearWin) {
                delayToStop += this.SpeedConfig.endedInterval;
            }

            // 計算這輪停輪時間 (近似值)，並累積時間
            const moveSpeed = trackStatus.IsNearWin ? this.SpeedConfig.nearWinSpeed : this.StopSpeed;
            const reboundTime = this.m_isHardStop ? this.SpeedConfig.hardReboundTime : this.SpeedConfig.reboundTime;
            prevStopTime = (this.m_socketSizeY[trackIndex] * (this.m_mainSockets[trackIndex] + this.m_loftSockets[trackIndex]) / moveSpeed) + reboundTime;
        }

        // 快停直接開始停輪 / 依序停輪，可再觸發快停
        this.m_plateState.Transit(
            this.m_isHardStop
                ? CommonSpinner.PLATE_STATE.STOPPING
                : CommonSpinner.PLATE_STATE.GENTLY_STOP
        );
    }

    //----------------------------------------------------------------

    //================================================================
    // Symbol 節點動作控制
    //================================================================

    //----------------------------------------------------------------
    /**
        * 指定軌道上的 Symbol 節點起步往上拉回
        * @param trackIndex 軌道索引
        */
    protected TrackCharge(trackIndex: number) {
        const chargeDist = this.SpeedConfig.chargeDist;  // 拉回距離
        const chargeTime = this.SpeedConfig.chargeTime;  // 拉回時間 (sec)

        for (let nodeIndex = 0; nodeIndex < this.m_totalSockets[trackIndex]; nodeIndex++) {
            // 設定 Symbol 移動旗標
            this.m_movingFlag[trackIndex] |= (1 << nodeIndex);

            // 取得 Symbol 節點
            const node = this.m_symbolNodes[trackIndex][nodeIndex];

            // 設定目標座標
            const targetPos = new Vec3(node.position.x, node.position.y + chargeDist);

            // 跑動畫
            if (chargeTime > 0) {
                new Tween(node)
                    .to(chargeTime, { position: targetPos })
                    .start();
            }
            // 直接設定座標
            else {
                node.position = targetPos;
            }
        }
    }

    //----------------------------------------------------------------
    /**
        * 指定軌道上的 Symbol 節點往下移動
        * @param trackIndex 軌道索引
        */
    protected TrackMove(trackIndex: number, dy: number) {
        // 移動距離限制
        dy = Math.min(dy, this.m_totalHeight[trackIndex]);

        // 移動 Symbol
        for (let nodeIndex = 0; nodeIndex < this.m_totalSockets[trackIndex]; nodeIndex++) {
            const node = this.m_symbolNodes[trackIndex][nodeIndex];
            let positionY = node.position.y;
            positionY -= dy;

            // 移動後是否超過下界
            if (positionY < this.m_lowerBound[trackIndex]) {
                // Symbol 正要離開盤面
                this._onSymbolLeaving(trackIndex, nodeIndex, node);

                // 跳至頂端
                positionY += this.m_totalHeight[trackIndex];

                // 移動節點
                node.position = new Vec3(node.position.x, positionY);

                // 設定進入的 Symbol 資料
                let data = null;

                // 先用起始資料填補
                if (this.m_startData[trackIndex]?.length > 0) {
                    data = this.IsTopLeftOrigin
                        ? this.m_startData[trackIndex].pop()
                        : this.m_startData[trackIndex].shift();
                }

                // 檢查資料是否有效
                data = this.ValidateSymbolData(trackIndex, nodeIndex, data);

                // 通知 Symbol 進入盤面
                this._onSymbolEntering(trackIndex, nodeIndex, node, data);
            }
            // 移動節點
            else {
                node.position = new Vec3(node.position.x, positionY);
            }
        }
    }

    //----------------------------------------------------------------
    /**
        * 指定軌道上的 Symbol 節點往下移動 (停輪前置)
        * @param trackIndex 軌道索引
        * @param dy 移動距離
        */
    protected TrackMoveInPreStop(trackIndex: number, dy: number) {
        // 確保移動指定距離後必定有資料
        const dataLength = this.m_beforeData[trackIndex].length;
        const maxDy = this.m_socketSizeY[trackIndex] * dataLength;
        dy = Math.min(dy, this.m_totalHeight[trackIndex], maxDy);

        // 移動 Symbol
        for (let nodeIndex = 0; nodeIndex < this.m_totalSockets[trackIndex]; nodeIndex++) {
            const node = this.m_symbolNodes[trackIndex][nodeIndex];
            let positionY = node.position.y;
            positionY -= dy;

            // 移動後是否超過下界
            if (positionY < this.m_lowerBound[trackIndex]) {
                // Symbol 正要離開盤面
                this._onSymbolLeaving(trackIndex, nodeIndex, node);

                // 跳至頂端
                positionY += this.m_totalHeight[trackIndex];

                // 移動節點
                node.position = new Vec3(node.position.x, positionY);

                // 取得前置資料
                const data = this.IsTopLeftOrigin
                    ? this.m_beforeData[trackIndex].pop()
                    : this.m_beforeData[trackIndex].shift();

                // 通知 Symbol 進入盤面
                this._onSymbolEntering(trackIndex, nodeIndex, node, data);
            }
            // 移動節點
            else {
                node.position = new Vec3(node.position.x, positionY);
            }
        }
    }

    //----------------------------------------------------------------
    /**
        * 指定軌道上的 Symbol 節點停輪至最終位置
        * @param trackIndex 軌道索引
        * @param time 停輪時間 (秒)
        */
    protected TrackLanding(trackIdx: number, time?: number): number {
        // 取得基本輪帶資料
        const trackIndex = trackIdx;
        const trackStatus = this.m_trackStatus[trackIndex];
        const loftSockets = this.m_loftSockets[trackIndex];
        const mainSockets = this.m_mainSockets[trackIndex];
        const totalSockets = this.m_totalSockets[trackIndex];

        // 停止速度平滑並取得回彈距離與時間
        trackStatus.SpeedEnd();
        trackStatus.ReboundDist = this.m_isHardStop ? this.SpeedConfig.hardReboundDist : this.SpeedConfig.reboundDist;
        trackStatus.ReboundTime = this.m_isHardStop ? this.SpeedConfig.hardReboundTime : this.SpeedConfig.reboundTime;

        // 取盤面資料
        const finalDataList: any[] = [];
        for (let socketIndex = 0; socketIndex < mainSockets; socketIndex++) {
            const dataIndex = this.IsTopLeftOrigin ? (mainSockets - 1 - socketIndex) : socketIndex;
            const data = this.m_finalData[trackIndex][dataIndex];
            finalDataList[socketIndex] = isValid(data) ? data : null;
        }

        // 取得後續資料
        const afterData: any[] = Array.isArray(this.m_afterData?.[trackIndex])
            ? this.m_afterData[trackIndex].slice(0)
            : null;

        // 補齊盤面資料
        for (let socketIndex = mainSockets; socketIndex < mainSockets + loftSockets; socketIndex++) {
            let data = null;

            if (afterData?.length > 0) {
                data = this.IsTopLeftOrigin
                    ? afterData.pop()
                    : afterData.shift();
            }

            finalDataList[socketIndex] = isValid(data) ? data : null;
        }

        // 多的資料放到下一次 spin
        if (afterData?.length > 0) {
            this.m_startData[trackIndex] = afterData;
        }

        // 軌道上界 / 下界 / Y軸偏移 / 回彈距離(px)
        const upperBound = this.m_upperBound[trackIndex];
        const lowerBound = this.m_lowerBound[trackIndex];
        const trackOffsetY = this.m_trackOffset[trackIndex].y;
        const reboundDist = trackStatus.ReboundDist;

        // 最下方的 Symbol 的 ID
        const lowestIndex = this.IndexOfLowestSocketInTrack(trackIndex);

        // 最下方 Symbol 與下界的偏移 (負值表示已經出界)
        const diffToLower = this.m_symbolNodes[trackIndex][lowestIndex].position.y - lowerBound;

        // 停輪距離 (計算目前最下方的 Symbol 節點移動到下界 + 從上界移動到第 0 個 Socket 位置 + 回彈距離 + 與下界的偏移)
        const landingDist = this.m_socketSizeY[trackIndex] * (mainSockets + loftSockets) + reboundDist + diffToLower;

        // 停輪總時間
        const landingTime = isValid(time) ? time : (landingDist / trackStatus.Speed);

        // 設定節點移動
        for (let nodeIdx = 0; nodeIdx < totalSockets; nodeIdx++) {
            const nodeIndex = nodeIdx;
            const node = this.m_symbolNodes[trackIndex][nodeIndex];

            // 終點位置(可見區域由下至上 0, 1, ..., n)
            let targetSocket = (nodeIndex - lowestIndex + totalSockets) % totalSockets;
            if (targetSocket > (mainSockets + loftSockets - 1)) {
                targetSocket -= totalSockets;
            }

            // 終點座標
            const finalPosX = node.position.x;
            const finalPosY = this.GetSocketLocationOnTrack(trackIndex, targetSocket).y - reboundDist + trackOffsetY;

            // 節點與下界的偏移
            const nodePosY = node.position.y;
            const lowerBias = nodePosY - lowerBound;

            // [節點在下界之下(已經出界)]
            if (lowerBias < 0) {
                // 停輪後的資料
                const data = this.ValidateSymbolData(trackIndex, nodeIndex, finalDataList?.[targetSocket]);

                // 設定停輪路徑
                this.m_symbolTween[trackIndex][nodeIndex] = new Tween(node)
                    .call(() => this._onSymbolLeaving(trackIndex, nodeIndex, node))         // Symbol 正要離開盤面
                    .to(0, { position: new Vec3(finalPosX, upperBound + lowerBias) })       // 跳至上界
                    .call(() => this._onSymbolEntering(trackIndex, nodeIndex, node, data))  // Symbol 正在進入盤面 & 設定最後資料
                    .to(landingTime, { position: new Vec3(finalPosX, finalPosY) })          // 移動到底部
                    .call(() => this._onSymbolReachBottom(trackIndex, nodeIndex, node))     // Symbol 抵達底部
                    .start();

            }
            // [需要移到上界 && 換圖]
            else if ((nodePosY - landingDist) < (lowerBound - reboundDist - CommonSpinner.EPSILON)) {
                // 停輪後的資料
                const data = this.ValidateSymbolData(trackIndex, nodeIndex, finalDataList?.[targetSocket]);

                const t1 = landingTime * (lowerBias / landingDist);                         // 移動到下界時間(秒)
                const t2 = landingTime * ((upperBound - finalPosY) / landingDist);          // 移動到停止位置時間(秒)

                // 設定停輪路徑
                this.m_symbolTween[trackIndex][nodeIndex] = new Tween(node)
                    .to(t1, { position: new Vec3(finalPosX, lowerBound) })                  // 移動到下界
                    .call(() => this._onSymbolLeaving(trackIndex, nodeIndex, node))         // Symbol 正要離開盤面
                    .to(0, { position: new Vec3(finalPosX, upperBound) })                   // 跳至上界
                    .call(() => this._onSymbolEntering(trackIndex, nodeIndex, node, data))  // Symbol 正在進入盤面 & 設定最後資料
                    .to(t2, { position: new Vec3(finalPosX, finalPosY) })                   // 移動到底部
                    .call(() => this._onSymbolReachBottom(trackIndex, nodeIndex, node))     // Symbol 抵達底部
                    .start();

            }
            // [在上界之上，還沒被看到，直接到定點]
            else {
                this.m_symbolTween[trackIndex][nodeIndex] = new Tween(node)
                    .to(landingTime, { position: new Vec3(finalPosX, finalPosY) })          // 移動到底部
                    .call(() => this._onSymbolReachBottom(trackIndex, nodeIndex, node))     // Symbol 抵達底部
                    .start();
            }
        }

        // 開始停輪事件
        this.Dispatch(CommonSpinner.EVENT.TRACK_START_STOPPING, trackIndex, landingTime);

        return landingTime;
    }

    //----------------------------------------------------------------
    /**
        * 指定軌道上的 Symbol 節點從底部回彈一段距離
        * @param trackIndex 軌道索引
        */
    protected TrackRebound(trackIndex: number): void {
        const reboundDist = this.m_trackStatus[trackIndex].ReboundDist;  // 回彈距離 (px)
        const reboundTime = this.m_trackStatus[trackIndex].ReboundTime;  // 回彈時間 (sec)

        for (let nodeIdx = 0; nodeIdx < this.m_totalSockets[trackIndex]; nodeIdx++) {
            const nodeIndex = nodeIdx;

            // 設定 Symbol 移動旗標
            this.m_movingFlag[trackIndex] |= (1 << nodeIndex);

            // 取得 Symbol 節點
            const node = this.m_symbolNodes[trackIndex][nodeIndex];

            // 設定目標座標
            const targetPos = new Vec3(node.position.x, node.position.y + reboundDist);

            // 跑動畫
            if (reboundTime > 0) {
                new Tween(node)
                    .to(reboundTime, { position: targetPos })
                    .call(() => this._onSymbolJustStopped(trackIndex, nodeIndex, node))
                    .start();
            }
            // 直接設定座標
            else {
                node.position = targetPos;
                this._onSymbolJustStopped(trackIndex, nodeIndex, node);
            }
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 重讀輪帶配置相關
    //================================================================

    //----------------------------------------------------------------
    /**
        * 重讀指定輪帶配置，並重新生成 Symbol 節點
        * @param trackIndex 軌道索引
        */
    public ReloadTrackConfig(trackIndex: number) {
        // 可以重置的狀態直接重置
        if (this.CanReloadTrackConfig(trackIndex)) {
            // 取得軌道設定
            const trackConfig = this.m_trackConfigs[trackIndex];
            const reloadDataList = this._onTrackConfigReloading(trackIndex);

            // 計算目前位置偏移
            const lowestIndex = this.IndexOfLowestSocketInTrack(trackIndex);
            const nodePos = this.GetSymbolPositionOnTrack(trackIndex, lowestIndex);
            const location = this.GetSocketLocationOnTrack(trackIndex, -this.m_baseSockets[trackIndex]);
            const biasPosY = nodePos.y - (this.m_trackOffset[trackIndex].y + location.y);

            // 取得顯示根節點
            this.m_viewNodes[trackIndex] = trackConfig.ViewNode ?? this.node;

            // 計算顯示位置 ( 使用參考節點 ) 或 直接使用設定的位置
            const trackOffset = this.m_trackOffset[trackIndex] = trackConfig.UseRefNode
                ? ConvertNodeSpacePosition(trackConfig.RefNode, this.m_viewNodes[trackIndex])
                : trackConfig.Position;

            // 初始化基本設定
            this.m_loftSockets[trackIndex] = trackConfig.LoftSockets;
            this.m_mainSockets[trackIndex] = trackConfig.MainSockets;
            this.m_baseSockets[trackIndex] = trackConfig.BaseSockets;
            this.m_totalSockets[trackIndex] = trackConfig.TotalSockets;
            this.m_socketSizeX[trackIndex] = trackConfig.SocketSize.x;
            this.m_socketSizeY[trackIndex] = trackConfig.SocketSize.y;
            this.m_socketBiasY[trackIndex] = trackConfig.SocketBiasY;
            this.m_upperBound[trackIndex] = trackConfig.UpperBound + trackOffset.y;
            this.m_lowerBound[trackIndex] = trackConfig.LowerBound + trackOffset.y;
            this.m_totalHeight[trackIndex] = trackConfig.TotalHeight;

            // 計算顯示位置
            const offsetWithBias = new Vec3(trackOffset.x, trackOffset.y + biasPosY);

            // 清掉除錯用文字
            this.ClearDebugText(trackIndex);

            // 把舊的 Symbol 移除
            const totalLength = this.m_symbolNodes[trackIndex].length;
            for (let nodeIndex = 0; nodeIndex < totalLength; nodeIndex++) {
                this._removeSymbolNode(trackIndex, nodeIndex);
            }

            // 重置 Symbol 索引
            this.m_symbolIndex[trackIndex].length = 0;

            // 重整移動標記
            this.m_movingFlag[trackIndex] &= (1 << this.m_totalSockets[trackIndex]) - 1;

            // 生成新的 Symbol
            for (let nodeIndex = 0; nodeIndex < this.m_totalSockets[trackIndex]; nodeIndex++) {
                const socketPos = this.GetSocketLocationOnTrack(trackIndex, nodeIndex - this.m_baseSockets[trackIndex]);
                const data = this.ValidateSymbolData(trackIndex, nodeIndex, reloadDataList?.[nodeIndex]);
                const node = this._createSymbolNode(trackIndex, nodeIndex, data);
                node.position = offsetWithBias.clone().add(socketPos);
                node.parent = this.m_viewNodes[trackIndex];

                this.m_symbolNodes[trackIndex][nodeIndex] = node;
                this.m_symbolIndex[trackIndex][nodeIndex] = nodeIndex;
            }

            // 刷新 Symbol 索引
            this.RefreshSymbolIndexMap(trackIndex);

            // 除錯模式更新
            this.OnDebugModeChanged();

            // 清除重置標記
            this.m_trackReloadFlag[trackIndex] = false;

            // 通知重置完成
            this._onTrackConfigReloaded(trackIndex);

        }
        // 不在可以重置的狀態先暫存資料
        else {
            this.m_trackReloadFlag[trackIndex] = true;
            this.DebugMode && warn(`CommonSpinnerControl.ReloadTrackConfig: Track( ${trackIndex} ) cannot be reloaded right now.`);
        }
    }

    //----------------------------------------------------------------
    /**
        * 回傳目前是否可重讀輪帶配置 ( 預設是停輪前且並非拉回中 )
        * @param trackIndex 軌道索引
        */
    protected CanReloadTrackConfig(trackIndex: number): boolean {
        if (this.m_initPrepared) {
            const currState = this.m_trackState[trackIndex].Current;
            return currState < CommonSpinner.TRACK_STATE.STOPPING && currState != CommonSpinner.TRACK_STATE.CHARGING;
        }
        return false;
    }

    //----------------------------------------------------------------
    /**
        * 重讀輪帶設定開始
        */
    private _onTrackConfigReloading(trackIndex: number): any[] {
        return this.OnTrackConfigReloading?.(trackIndex) ?? null;
    }

    //----------------------------------------------------------------
    /**
        * 重讀輪帶設定完成
        */
    private _onTrackConfigReloaded(trackIndex: number): void {
        this.OnTrackConfigReloaded?.(trackIndex);
    }

    //----------------------------------------------------------------

    //================================================================
    // Symbol 節點創建、移除、事件通知處理
    //================================================================

    //----------------------------------------------------------------
    /** 建立 Symbol 節點 */
    private _createSymbolNode(trackIndex: number, nodeIndex: number, data: any): Node {
        const node = this.CreateSymbol?.(trackIndex, nodeIndex, data);
        return isValid(node) ? node : new Node(`__ERROR_${trackIndex}_${nodeIndex}__`);
    }

    //----------------------------------------------------------------
    /** 移除 Symbol 節點 */
    private _removeSymbolNode(trackIndex: number, nodeIndex: number): void {
        if (isValid(this.m_symbolNodes[trackIndex][nodeIndex], true)) {
            const symbolNode = this.m_symbolNodes[trackIndex][nodeIndex];
            const isHandled = this.OnSymbolRemoved?.(trackIndex, nodeIndex, symbolNode) ?? false;
            !isHandled && isValid(symbolNode, true) && symbolNode.destroy();
            delete this.m_symbolNodes[trackIndex][nodeIndex];
        }
    }

    //----------------------------------------------------------------
    /** Symbol 正在進入盤面 */
    private _onSymbolEntering(trackIndex: number, nodeIndex: number, node: Node, data: any) {
        const firstNodeIndex = this.m_symbolIndex[trackIndex].shift();
        this.m_symbolIndex[trackIndex].push(firstNodeIndex);
        this.OnSymbolEntering?.(trackIndex, nodeIndex, node, data);
    }

    //----------------------------------------------------------------
    /** Symbol 正要離開盤面 */
    private _onSymbolLeaving(trackIndex: number, nodeIndex: number, node: Node) {
        this.OnSymbolLeaving?.(trackIndex, nodeIndex, node);
    }

    //----------------------------------------------------------------
    /** Symbol 抵達底部 */
    private _onSymbolReachBottom(trackIndex: number, nodeIndex: number, node: Node) {
        // 清除移動旗標
        this.m_movingFlag[trackIndex] &= ~(1 << nodeIndex);

        // 事件通知
        this.OnSymbolReachBottom?.(trackIndex, nodeIndex, node);

        // 全部 Symbol 抵達底部
        if (this.m_movingFlag[trackIndex] === 0) {
            this.RefreshSymbolIndexMap(trackIndex);
            
            this.Dispatch(CommonSpinner.EVENT.TRACK_REACH_BOTTOM, trackIndex, this.m_trackStatus[trackIndex].ReboundTime);
            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.REBOUND);
        }
    }

    //----------------------------------------------------------------
    /** Symbol 完全停止移動 */
    private _onSymbolJustStopped(trackIndex: number, nodeIndex: number, node: Node) {
        // 清除移動旗標
        this.m_movingFlag[trackIndex] &= ~(1 << nodeIndex);

        // 事件通知
        this.OnSymbolJustStopped?.(trackIndex, nodeIndex, node);

        // 全部 Symbol 完全停止
        if (this.m_movingFlag[trackIndex] === 0) {
            this.Dispatch(CommonSpinner.EVENT.TRACK_JUST_STOPPED, trackIndex);
            this.m_trackState[trackIndex].Transit(CommonSpinner.TRACK_STATE.IDLE);
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 除錯模式相關
    //================================================================

    protected m_debugTextMap: Node[][] = null;
    protected m_debugMode: boolean = false;

    //----------------------------------------------------------------
    /**
        * 除錯模式
        */
    public get DebugMode(): boolean {
        return this.m_debugMode;
    }
    public set DebugMode(value: boolean) {
        if (this.m_debugMode !== value) {
            this.m_debugMode = value;
            this.OnDebugModeChanged();
        }
    }

    //----------------------------------------------------------------
    /**
        * 除錯模式啟動/關閉處理
        */
    protected OnDebugModeChanged(): void {
        if (this.m_debugMode) {
            // 建立 Map
            if (!Array.isArray(this.m_debugTextMap)) {
                this.m_debugTextMap = new Array(this.TotalTracks).fill(null);
            }

            // 生成除錯文字
            this.m_debugTextMap?.forEach((debugNodeList, trackIndex) => {
                if (!Array.isArray(debugNodeList) && this.m_symbolNodes?.[trackIndex]?.length > 0) {
                    this.m_debugTextMap[trackIndex] = [];
                    // // TODO: 需要有 Material 才能顯示文字，後續版本才會支援
                    // this.m_symbolNodes[ trackIndex ].forEach( ( symbolNode, nodeIndex ) =>
                    // {
                    //    const node = new Node( `__DEBUG__` );
                    //    node.parent = symbolNode;
                    //    this.m_debugTextMap[ trackIndex ][ nodeIndex ] = node;

                    //    const label = node.addComponent( Label );
                    //    label.string = `[${ trackIndex } , ${ nodeIndex }]`;
                    //    label.fontSize = 22;
                    //    label.lineHeight = 22;

                    //    const outline = node.addComponent( LabelOutline );
                    //    outline.width = 2;
                    //    outline.color = Color.BLACK;
                    // }
                    // );
                }
            }
            );

            // 已經有了 直接打開
            this.m_debugTextMap?.forEach(debugNodeList => debugNodeList?.forEach(debugNode => (debugNode.active = true)));
        }
        else {
            // 已經有了 直接關閉
            this.m_debugTextMap?.forEach(debugNodeList => debugNodeList?.forEach(debugNode => (debugNode.active = false)));
        }
    }

    //----------------------------------------------------------------
    /**
        * 清除除錯文字
        * @param trackIndex 軌道索引 (不指定則清除全部)
        */
    protected ClearDebugText(trackIndex?: number): void {
        if (typeof trackIndex === 'number' && !isNaN(trackIndex)) {
            this.m_debugTextMap?.[trackIndex]?.forEach(debugNode => isValid(debugNode, true) && debugNode.destroy());
            Array.isArray(this.m_debugTextMap) && (this.m_debugTextMap[trackIndex] = null);
        }
        else {
            this.m_debugTextMap?.forEach(debugNodeList => debugNodeList?.forEach(debugNode => isValid(debugNode, true) && debugNode.destroy()));
            this.m_debugTextMap = null;
        }
    }

    //----------------------------------------------------------------



    //================================================================
    // 即將棄用的屬性與方法
    // 請勿使用，將會在未來版本中移除
    // ps. 改為 private，在編輯器中顯示錯誤，但不影響運行
    //================================================================

    /** @deprecated */
    private get ReboundDist(): number {
        return this.m_isHardStop ? this.SpeedConfig.hardReboundDist : this.SpeedConfig.reboundDist;
    }

    /** @deprecated */
    private get ReboundTime(): number {
        return this.m_isHardStop ? this.SpeedConfig.hardReboundTime : this.SpeedConfig.reboundTime;
    }

    /** @deprecated */
    private m_isFastMode: boolean = false;

    //----------------------------------------------------------------

};


/**
 * 計算節點在目標節點座標系的位置
 * @param node 節點
 * @param targetParent 目標節點
 */
function ConvertNodeSpacePosition(node: Node, targetParent: Node): Vec3 {
    const originParentUiTrans = node?.parent?.getComponent?.(UITransform);
    const targetParentUiTrans = targetParent?.getComponent?.(UITransform);

    if (originParentUiTrans && targetParentUiTrans) {
        const worldPos = originParentUiTrans.convertToWorldSpaceAR(node.position);
        return targetParentUiTrans.convertToNodeSpaceAR(worldPos);
    }
    else {
        return node?.position ?? Vec3.ZERO.clone();
    }
}
