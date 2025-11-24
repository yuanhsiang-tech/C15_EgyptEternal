import { _decorator, warn, error, isValid, instantiate, Enum, EventTouch, Vec3, Node, Component, Prefab, Tween, TweenEasing, easing, UIOpacity } from "cc";
//import NodeCoffer from "../../../../Extension/NodePool/NodeCoffer";
//import SafetyTweener from "../../../SuitKit/SafetyTweener/SafetyTweener";
import { CommonWheel } from "./CommonWheelMacros";
import { CommonWheelDefine } from "./CommonWheelDefine";
import Touchable, { TouchableEvent } from "db://assets/Stark/Interactive/Touchable";
import FiniteState from "db://assets/Stark/Utility/FiniteState";
import CommonNodePool from "db://assets/Stark/NodePool/CommonNodePool";
import { StateManager } from "db://assets/Stark/Utility/StateManager/StateManager";
import { IStateHandler } from "db://assets/Stark/Utility/StateManager/IStateHandler";


const { ccclass, property } = _decorator;

//================================================================================================

export interface CommonWheelControlDelegate
{
   /**
    * 轉盤進入閒置狀態
    */
   OnCommonWheelControlEnterIdle ( control: CommonWheelControl ): void;

   /**
    * 轉盤開始轉動
    * @param targetIndex 目標索引
    */
   OnCommonWheelControlSpinStart ( control: CommonWheelControl, targetIndex: number ): void;

   /**
    * 轉盤跳過動畫
    */
   OnCommonWheelControlSpinSkip ( control: CommonWheelControl ): void;

   /**
    * 轉盤停止轉動
    */
   OnCommonWheelControlSpinStop ( control: CommonWheelControl ): void;

   /**
    * 假轉動開始
    */
   OnCommonWheelControlFakeSpinStart ( control: CommonWheelControl ): void;

   /**
    * 假轉動等待停止
    */
   OnCommonWheelControlFakeSpinWaitStop ( control: CommonWheelControl ): void;

   /**
    * 假轉動播放停止
    */
   OnCommonWheelControlFakeSpinPlayStop ( control: CommonWheelControl ): void;

   /**
    * 轉盤重置
    */
   OnCommonWheelControlReload ( control: CommonWheelControl ): void;

   /**
    * Spin 點擊區點擊事件
    * @param event Cocos 觸控事件
    * @param tag {@link Touchable.Tag}
    */
   OnCommonWheelControlSpinTouchClicked ( control: CommonWheelControl, event: EventTouch, tag: number ): void;

   /**
    * Skip 點擊區點擊事件
    * @param event Cocos 觸控事件
    * @param tag {@link Touchable.Tag}
    */
   OnCommonWheelControlSkipTouchClicked ( control: CommonWheelControl, event: EventTouch, tag: number ): void;

   /**
    * 轉軸角度變化
    * @param oldAngle 舊角度
    * @param newAngle 新角度
    */
   OnCommonWheelControlPlateAxisChanged ( control: CommonWheelControl, oldAngle: number, newAngle: number ): void;

   /**
    * 時間軸變化
    * @param timeline 時間軸
    */
   OnCommonWheelControlTimelineChanged ( control: CommonWheelControl, timeline: number ): void;
}

//================================================================================================
//================================================================================================
/**
 * 通用轉盤控制元件
 * 
 * @abstract
 * 必須要實作的方法
 * - {@link OnCreateCell}
 * 
 * 可選實作的方法
 * - {@link OnRemoveCell}
 * - {@link Process}
 * - {@link OnEnterIdle}
 * - {@link OnSpinStart}
 * - {@link OnSpinSkip}
 * - {@link OnSpinStop}
 * - {@link OnReload}
 * - {@link OnSpinTouchClicked}
 * - {@link OnSkipTouchClicked}
 * - {@link OnAxisAngleChanged}
 * - {@link OnTimelineChanged}
 * 
 * @description
 * 基本功能操控流程 :
 * 1. 設定盤面資料 {@link SetData}
 * 2. 啟動轉盤 {@link Spin}
 * 3. 跳過動畫 {@link Skip}
 * 4. 停止轉盤 {@link Stop}
 * 5. 重置轉盤 {@link Reload}
 * - 重置後才能再次啟動轉盤 {@link Spin}
 */
//================================================================================================
//================================================================================================

@ccclass
export default abstract class CommonWheelControl extends Component
{

   //================================================================
   // Component's properties : Cell Resources
   //================================================================

   //----------------------------------------------------------------

   @property( {
      type: Enum( CommonWheel.CellResourceType ),
      displayName: "資源類型",
      tooltip: "自訂、參考節點或 Prefab"
   } )
   protected m_cellResType: CommonWheel.CellResourceType = CommonWheel.CellResourceType.CUSTOM;

   /**
    * Cell 資源類型
    */
   public get CellResType (): CommonWheel.CellResourceType
   {
      return this.m_cellResType;
   }

   //----------------------------------------------------------------

   @property( {
      type: Node,
      displayName: "參考節點",
      visible: function () { return this.CellResType == CommonWheel.CellResourceType.NODE; }
   } )
   protected m_cellRefNode: Node = null;

   //----------------------------------------------------------------

   @property( {
      type: Prefab,
      displayName: "Prefab",
      visible: function () { return this.CellResType == CommonWheel.CellResourceType.PREFAB; }
   } )
   protected m_cellPrefab: Prefab = null;

   //----------------------------------------------------------------

   //================================================================
   // Component's properties : Node References
   //================================================================

   //----------------------------------------------------------------

   @property( {
      type: Node,
      displayName: "盤面旋轉軸心",
      tooltip: "必要"
   } )
   protected m_plateAxis: Node = null;

   /**
    * 盤面旋轉軸心
    */
   public get PlateAxis (): Node
   {
      return this.m_plateAxis;
   }

   //----------------------------------------------------------------

   @property( {
      type: Node,
      displayName: "Cell 根節點",
      tooltip: "動態生成 Cell 掛載的父節點"
   } )
   protected m_cellRoot: Node = null;

   /**
    * Cell 根節點
    */
   public get CellRoot (): Node
   {
      return this.m_cellRoot;
   }

   //----------------------------------------------------------------

   @property( {
      type: Node,
      displayName: "畫面點擊保護",
      tooltip: "避免點擊到轉盤畫面底下的物件"
   } )
   protected m_touchGuard: Node = null;

   /**
    * 畫面點擊保護
    */
   public get TouchGuard (): Node
   {
      return this.m_touchGuard;
   }

   //----------------------------------------------------------------

   @property( {
      type: Touchable,
      displayName: "Spin 點擊區"
   } )
   protected m_spinTouch: Touchable = null;

   /**
    * Spin 點擊區
    */
   public get SpinTouch (): Touchable
   {
      return this.m_spinTouch;
   }

   //----------------------------------------------------------------

   @property( {
      type: Touchable,
      displayName: "Skip 點擊區"
   } )
   protected m_skipTouch: Touchable = null;

   /**
    * Skip 點擊區
    */
   public get SkipTouch (): Touchable
   {
      return this.m_skipTouch;
   }

   //----------------------------------------------------------------

   //================================================================
   // Member Variables
   //================================================================

   //----------------------------------------------------------------
   // Member of control and settings
   //----------------------------------------------------------------

   protected m_initPrepared: boolean = false;
   protected m_stateManager: StateManager = new StateManager(CommonWheel.STATE.NONE);
   protected m_actionConfig: CommonWheelDefine.ActionConfig = CommonWheelDefine.PRESET.DEFAULT;
   protected m_opacityMap: { [ key: string ]: number; } = {};
   protected m_tweenerMap: any[] = [];
   protected m_tweenerCallBackMap: Function[] = [];

   //----------------------------------------------------------------
   // Member of cells and data
   //----------------------------------------------------------------

   protected m_dataList: any[] = null;
   protected m_reversed: boolean = false;
   protected m_cellList: Node[] = [];
   protected m_cellPool: CommonNodePool = null;
   protected m_cellCount: number = 0;
   protected m_cellAngle: number = 0;

   //----------------------------------------------------------------
   // Member of animation
   //----------------------------------------------------------------

   protected m_canSpin: boolean = false;
   protected m_canSkip: boolean = false;
   protected m_shouldStart: boolean = false;
   protected m_initAngle: number = 0;
   protected m_targetIndex: number = 0;
   protected m_targetAngle: number = 0;
   protected m_targetOffset: number = 0;
   protected m_callback: Function = null;

   //----------------------------------------------------------------
   // Member of sampling for axis
   //----------------------------------------------------------------

   protected m_axisSamples: number[] = [];
   protected m_axisTimeline: number = -1;
   protected m_spinDuration: number = 0;
   protected m_spinRounds: number = 0;
   protected m_speedRate: number = 1;
   protected m_sampleRate: number = 1;
   protected m_sampleCount: number = 0;
   protected m_lastAngle: number = 0;

   //----------------------------------------------------------------
   // Member of fakeSpin
   //----------------------------------------------------------------

   protected m_hasSetTarget: boolean = false;
   protected m_hasReevaluate: boolean = false;
   protected m_fakeSpinFixSpeed: number = 0;
   protected m_isBoundaryAngle: number = 0;

   //----------------------------------------------------------------


   //================================================================
   // Getters and Setters
   //================================================================

   //----------------------------------------------------------------
   /**
    * Tween 動畫輔助元件
    */
   //protected get Tweener (): Tween<CommonWheelControl>
   //{
   //   if ( !isValid( this.m_tweener, true ) )
   //   {
   //      this.m_tweener = this.addComponent( SafetyTweener );
   //   }
   //   return this.m_tweener;
   //}

   //----------------------------------------------------------------

   protected m_delegate: Partial<CommonWheelControlDelegate> = null;

   /**
    * 接收轉盤各類通知的 Delegate
    */
   public get Delegate (): Partial<CommonWheelControlDelegate>
   {
      return this.m_delegate;
   }
   public set Delegate ( delegate: Partial<CommonWheelControlDelegate> )
   {
      this.m_delegate = delegate;
   }

   //----------------------------------------------------------------
   /**
    * 目標索引
    */
   public get TargetIndex (): number
   {
      return this.m_targetIndex;
   }

   //----------------------------------------------------------------
   /**
    * 目前轉軸軸心角度 (逆時針為正)
    */
   protected get AxisAngle (): number
   {
      return this.m_plateAxis.angle;
   }
   protected set AxisAngle ( axisAngle: number )
   {
      const oldAngle = this.m_plateAxis.angle;
      if ( oldAngle != axisAngle )
      {
         this.m_plateAxis.angle = axisAngle;
         this._onAxisAngleChanged( oldAngle, axisAngle );
      }
   }

   //----------------------------------------------------------------
   /**
    * 軸心動畫時間軸 (0 ~ 1)
    */
   public get AxisTimeline (): number
   {
      return this.m_axisTimeline;
   }
   public set AxisTimeline ( timeline: number )
   {
      const oldTimeline = this.m_axisTimeline;
      const newTimeline = this.m_axisTimeline = CommonWheel.ClampNum( timeline, 0, 1 );

      // 時間軸數值改變
      if ( oldTimeline != newTimeline )
      {
         // 通知時間軸改變
         this._onTimelineChanged( newTimeline );

         // 取樣總數
         const sampleCount = this.m_axisSamples.length;

         // [取樣數量充分]
         if ( sampleCount >= 2 )
         {
            const sampleValue = sampleCount * newTimeline;
            const sampleIndex = Math.floor( sampleValue );
            const foreIndex = CommonWheel.ClampNum( sampleIndex, 0, sampleCount - 1 );
            const backIndex = CommonWheel.ClampNum( sampleIndex + 1, 0, sampleCount - 1 );

            // 前後樣本相同 => 直接取值
            if ( foreIndex == backIndex )
            {
               this.AxisAngle = this.m_axisSamples[ foreIndex ];
            }
            // 使用前後樣本做線性插值
            else
            {
               const foreValue = this.m_axisSamples[ foreIndex ];
               const backValue = this.m_axisSamples[ backIndex ];
               this.AxisAngle = CommonWheel.LerpNum( foreValue, backValue, sampleValue - sampleIndex );
            }
         }
         // [只有單一取樣]
         else if ( sampleCount == 1 )
         {
            this.AxisAngle = this.m_axisSamples[ 0 ];
         }
         // [沒有取樣]
         else
         {
            this.AxisAngle = 0;
         }
      }
   }

   //----------------------------------------------------------------

   //================================================================
   // 必須要實作的方法
   //================================================================

   //----------------------------------------------------------------
   /**
    * 創建 Cell (沒有設定 Cell 根節點時只要接`data`做自己需要的初始化即可)
    * @param cellIndex 索引
    * @param data 資料
    * @param cell 節點 (`CellResType = CUSTOM`時要自行實作節點創建)
    * @returns 初始化完成的 Cell 節點
    */
   protected abstract OnCreateCell ( cellIndex: number, data: any, cell?: Node ): Node;

   //----------------------------------------------------------------

   //================================================================
   // 可選實作的方法
   //================================================================

   //----------------------------------------------------------------
   /**
    * 移除 Cell
    * @returns 是否已自行回收或銷毀
    */
   protected OnRemoveCell?( cellIndex: number, data: any, cell?: Node ): boolean;

   //----------------------------------------------------------------
   /**
    * 狀態機處理
    * @param dt 時間差
    * @param currentState 當前狀態
    * @param isEntering 是否為進入狀態
    */
   protected Process?( dt: number, currentState: number, isEntering: boolean ): void;

   //----------------------------------------------------------------
   /**
    * 閒置狀態通知
    */
   protected OnEnterIdle?(): void;

   //----------------------------------------------------------------
   /**
    * 轉動開始通知
    * @param targetIndex 目標索引
    */
   protected OnSpinStart?( targetIndex: number ): void;

   //----------------------------------------------------------------
   /**
    * 轉動跳過通知
    */
   protected OnSpinSkip?(): void;

   //----------------------------------------------------------------
   /**
    * 轉動停止通知
    */
   protected OnSpinStop?(): void;

   //----------------------------------------------------------------
   /**
    * 假轉動開始通知
    */
   protected OnFakeSpinStart?(): void;

   //----------------------------------------------------------------
   /**
    * 假轉動等待停止通知
    */
   protected OnFakeSpinWaitStop?(): void;

   //----------------------------------------------------------------
   /**
    * 假轉動播放停止通知
    */
   protected OnFakeSpinPlayStop?(): void;

   //----------------------------------------------------------------
   /**
    * 轉盤重置通知
    */
   protected OnReload?(): void;

   //----------------------------------------------------------------
   /**
    * Spin 點擊區點擊事件
    * @param event Cocos 觸控事件
    * @param tag {@link Touchable.Tag}
    */
   protected OnSpinTouchClicked?( event: EventTouch, tag: number ): void;

   //----------------------------------------------------------------
   /**
    * Skip 點擊區點擊事件
    * @param event Cocos 觸控事件
    * @param tag {@link Touchable.Tag}
    */
   protected OnSkipTouchClicked?( event: EventTouch, tag: number ): void;

   //----------------------------------------------------------------
   /**
    * 轉軸角度變化通知
    * @param oldAngle 舊角度
    * @param newAngle 新角度
    */
   protected OnAxisAngleChanged?( oldAngle: number, newAngle: number ): void;

   //----------------------------------------------------------------
   /**
    * 時間軸變化通知
    * @param timeline 時間軸
    */
   protected OnTimelineChanged?( timeline: number ): void;

   //----------------------------------------------------------------

   //================================================================
   // 回傳參數，可覆寫
   //================================================================

   //----------------------------------------------------------------
   /**
    * Cell節點暫存最大數量
    */
   protected CellPoolSizeMax (): number
   {
      return CommonWheel.DEFAULTS.CELL_POOL_SIZE_MAX;
   }

   //----------------------------------------------------------------
   /**
    * 是否順時針旋轉
    */
   protected IsClockwise (): boolean
   {
      return CommonWheel.DEFAULTS.CLOCKWISE;
   }

   //----------------------------------------------------------------
   /**
    * 動畫取樣率 (Hz)
    */
   protected SampleRate (): number
   {
      return CommonWheel.DEFAULTS.SAMPLE_RATE;
   }

   //----------------------------------------------------------------
   /**
    * 至少完整轉動幾圈
    */
   protected SpinRounds (): CommonWheel.VarNum
   {
      return ( this.m_actionConfig ?? CommonWheelDefine.PRESET.DEFAULT ).SpinRounds;
   }

   //----------------------------------------------------------------
   /**
    * 轉動總時長 (秒)
    */
   protected SpinDuration (): CommonWheel.VarNum
   {
      return ( this.m_actionConfig ?? CommonWheelDefine.PRESET.DEFAULT ).SpinDuration;
   }

   //----------------------------------------------------------------
   /**
    * 目標角度偏移率 (介於 `-1` 與 `1` 之間)
    */
   protected SpinBiasRate (): CommonWheel.VarNum
   {
      return CommonWheel.DEFAULTS.SPIN_BIAS_RATE;
   }

   //----------------------------------------------------------------
   /**
    * 初始速度比率 (不建議大於1，可能會倒轉)
    */
   protected SpeedRate (): CommonWheel.VarNum
   {
      return ( this.m_actionConfig ?? CommonWheelDefine.PRESET.DEFAULT ).SpeedRate;
   }

   //----------------------------------------------------------------
   /**
    * 固定速度的時間段(%)
    */
   protected FixedSpeedTimeInterval (): number
   {
      return ( this.m_actionConfig ?? CommonWheelDefine.PRESET.DEFAULT ).FakeSpinTimeInterval;
   }

   //----------------------------------------------------------------
   /**
    * 快轉目標時間軸 (0 ~ 1)
    */
   protected SkipTimeline (): number
   {
      return CommonWheel.DEFAULTS.SKIP_TIMELINE;
   }

   //----------------------------------------------------------------
   /**
    * 快轉時間比率，越小越快
    */
   protected SkipTimeScale (): number
   {
      return CommonWheel.DEFAULTS.SKIP_TIME_SCALE;
   }

   //----------------------------------------------------------------

   //================================================================
   // Life Cycle of Component
   //================================================================

   //----------------------------------------------------------------

   protected __preload (): void
   {
      this.InitPrepare();
   }

   //----------------------------------------------------------------

   protected onEnable (): void
   {
      this.m_spinTouch?.node?.on( TouchableEvent.Clicked, this._onSpinTouchClicked, this );
      this.m_skipTouch?.node?.on( TouchableEvent.Clicked, this._onSkipTouchClicked, this );
   }

   //----------------------------------------------------------------

   protected onDisable (): void
   {
      this.m_spinTouch?.node?.off( TouchableEvent.Clicked, this._onSpinTouchClicked, this );
      this.m_skipTouch?.node?.off( TouchableEvent.Clicked, this._onSkipTouchClicked, this );
   }

   //----------------------------------------------------------------

   protected update ( dt: number ): void
   {
      this.m_stateManager.Tick();
      this.Process?.( dt, this.m_stateManager.Current, this.m_stateManager.IsEntering );
   }

   //----------------------------------------------------------------

   //================================================================
   // 基本初始化處理
   //================================================================

   //----------------------------------------------------------------
   /**
    * 元件基本初始化處理
    */
   protected InitPrepare ()
   {
      if ( !this.m_initPrepared )
      {
         // 檢查必要方法是否實作: OnCreateCell
         if ( typeof this.OnCreateCell !== "function" )
         {
            error( "CommonWheelControl: OnCreateCell method is not implemented!" );
         }

         // 初始化狀態機
         this.m_stateManager
            .SetHandler( this.CreateStateHandlerMap() )
            .Init( CommonWheel.STATE.NONE );

         // 標記初始化準備就緒
         this.m_initPrepared = true;
      }
   }

   //----------------------------------------------------------------
   /**
    * 準備轉盤
    * @param initAngle 轉盤初始角度
    */
   protected Prepare ( initAngle?: number )
   {
      // 停止當前動畫
      this.StopTween( CommonWheel.TWEEN.CWC_AXIS_SPIN );

      // 狀態初始化
      this.SetCanSpin( true );
      this.SetCanSkip( false );
      this.m_shouldStart = false;
      this.m_targetIndex = 0;
      this.m_targetAngle = 0;
      this.m_targetOffset = 0;
      this.m_callback = null;

      // 設定初始角度
      this.m_initAngle = CommonWheel.IsNumber( initAngle ) ? initAngle : 0;

      // 重置 Spin 相關參數
      this.m_initAngle %= CommonWheel.DEGREE_IN_CIRCLE;
      this.m_axisSamples = [ this.m_initAngle ];
      this.m_spinDuration = 0;
      this.m_spinRounds = 0;
      this.m_speedRate = 1;
      this.m_sampleRate = 1;
      this.m_sampleCount = 0;
      this.m_lastAngle = 0;

      // 重置轉軸軸心與時間軸
      this.AxisAngle = this.m_initAngle;
      this.AxisTimeline = 0;

      // 重置假轉參數
      this.m_hasSetTarget = false;
      this.m_hasReevaluate = false;
      this.m_fakeSpinFixSpeed = 0;

      // 切換狀態
      if ( this.m_stateManager.Current != CommonWheel.STATE.IDLE )
      {
         this.m_stateManager.ForceTransit( CommonWheel.STATE.IDLE );
      }
   }

   //----------------------------------------------------------------

   //================================================================
   // 狀態機處理
   //================================================================

   //----------------------------------------------------------------
   /**
    * 創建狀態機處理器 Map
    * 可以覆寫此方法來自訂狀態機處理器
    * 或實作 `Process` 方法來自訂狀態機處理
    */
   protected CreateStateHandlerMap (): { [ state: number ]: IStateHandler; }
   {
      return {
         //----------------------------------------------------------
         // [閒置]
         [ CommonWheel.STATE.IDLE ]: {
            OnEnter: () =>
            {
               this.AxisTimeline = 0;
               this.SetCanSpin( true );
               this.SetCanSkip( false );
               this._onEnterIdle();
            },

            OnProcess: () =>
            {
               if ( this.m_shouldStart )
               {
                  // 開始轉
                  this.m_shouldStart = false;
                  this.SetCanSpin( false );
                  if( !this.m_hasSetTarget )
                  {
                     this.m_stateManager.Transit( CommonWheel.STATE.FAKESPIN_START );
                  }
                  else
                  {
                     this.m_stateManager.Transit( CommonWheel.STATE.SPIN );
                  }
               }
            },
         },

         //----------------------------------------------------------
         // [轉動]
         [ CommonWheel.STATE.SPIN ]: {
            OnEnter: () =>
            {
               // 啟用跳過功能
               this.SetCanSkip( true );

               // 動畫開始
               this.PlaySpinTween( () => this.m_stateManager.Transit( CommonWheel.STATE.STOP ) );

               // 開始通知
               this._onSpinStart( this.m_targetIndex );
            },
         },

         //----------------------------------------------------------
         // [停止]
         [ CommonWheel.STATE.STOP ]: {
            OnEnter: () =>
            {
               // 停止動畫
               this.StopWheelTween();

               // 設定最終盤面角度
               this.AxisTimeline = 1;

               // 呼叫 Callback
               const callback = this.m_callback;
               this.m_callback = null;
               typeof callback == "function" && callback();

               // 停止通知
               this._onSpinStop();
            },
         },

         //----------------------------------------------------------
         // [加速]
         [ CommonWheel.STATE.FAKESPIN_START ]: {
            OnEnter: () =>
            {
               // 禁用跳過功能
               this.SetCanSkip( false );

               // 動畫開始
               this.PlayAccelerateTween( () => this.m_stateManager.Transit( CommonWheel.STATE.FAKESPIN_WAIT_STOP ) );

               // 開始通知
               this._onFakeSpinStart();
            },
         },

         //----------------------------------------------------------
         // [等待停止]
         [ CommonWheel.STATE.FAKESPIN_WAIT_STOP ]: {
            OnEnter: () =>
            {
               // 開始通知
               this._onFakeSpinWaitStop();
            },

            OnProcess: ( dt: number ) =>
            {
               const sampleRate = this.m_sampleRate;
               const fixedSpeedAngle = this.m_fakeSpinFixSpeed;
               const timeRatio = dt * sampleRate;
               const angleIncrement = timeRatio * fixedSpeedAngle;
               const oldAngle = this.AxisAngle;
               const newAngle = this.AxisAngle + angleIncrement;

               if ( this.m_hasSetTarget )
               {
                  if ( !this.m_hasReevaluate )
                  {
                     this.m_hasReevaluate = true;
                     this.ReEvaluateSamples();
                     this.CalculateBoundaryAngle();
                  }

                  const boundaryAngle = this.m_isBoundaryAngle;
                  if ( ( this.IsClockwise() && oldAngle > boundaryAngle && newAngle < boundaryAngle ) ||
                       ( !this.IsClockwise() && oldAngle < boundaryAngle && newAngle > boundaryAngle ) )
                  {
                     this.m_stateManager.Transit( CommonWheel.STATE.FAKESPIN_PLAY_STOP );
                  }
               }
               this.AxisAngle = newAngle;
            },
         },

         //----------------------------------------------------------
         // [播放停止]
         [ CommonWheel.STATE.FAKESPIN_PLAY_STOP ]: {
            OnEnter: () =>
            {
               // 播放停止動畫
               this.PlayStopTween( () => this.m_stateManager.Transit( CommonWheel.STATE.STOP ) );

               // 停止通知
               this._onFakeSpinPlayStop();
            },
         },
      };
   }

   //----------------------------------------------------------------

   //================================================================
   // 設定或取值方法
   //================================================================

   //----------------------------------------------------------------
   /**
    * 設定動作設定
    */
   public SetActionConfig ( config: CommonWheelDefine.ActionConfig )
   {
      this.m_actionConfig = config;
   }

   //----------------------------------------------------------------
   /**
    * 設定盤面
    * @param dataArray 資料列表
    * @param clockwise 資料順序是否順時針 (預設逆時針)
    */
   public SetData<DataType> ( dataArray: DataType[], clockwise: boolean = false )
   {
      // 移除舊節點
      for ( let idx = 0; idx < this.m_cellList.length; idx++ )
      {
         const data = this.m_dataList[ idx ];
         const cell = this.m_cellList[ idx ];
         const isHandled = this.OnRemoveCell?.( idx, data, cell ) ?? false;
         !isHandled && this.RemoveCellNode( cell );
      }

      // 設定新資料
      this.m_dataList = dataArray;
      this.m_reversed = clockwise;
      this.m_cellList = [];
      this.m_cellCount = dataArray?.length ?? 0;
      this.m_cellAngle = 360 / Math.max( 1, this.m_cellCount );

      // 每個 Cell 的角度差
      const angleStep = this.m_reversed
         ? -this.m_cellAngle
         : this.m_cellAngle;

      // [產生新盤面]
      if ( this.m_cellCount > 0 )
      {
         // [有設定 Cell 根節點]
         if ( isValid( this.m_cellRoot, true ) )
         {
            for ( let cellIndex = 0; cellIndex < this.m_cellCount; cellIndex++ )
            {
               const data = this.m_dataList[ cellIndex ];
               const cell = this.OnCreateCell( cellIndex, data, this.CreateCellNode() );

               // [Cell 初始化成功]
               if ( isValid( cell, true ) )
               {
                  cell.active = true;
                  cell.parent = this.m_cellRoot;
                  cell.angle = cellIndex * angleStep;
                  cell.position = Vec3.ZERO.clone();
                  this.m_cellList[ cellIndex ] = cell;
               }
               // [Cell 初始化失敗]
               else
               {
                  this.m_cellList[ cellIndex ] = null;
                  warn( `Cell at index( ${ cellIndex } ) initialization failed.`, data, cell );
               }
            }
         }
         // [客製化流程]
         else
         {
            for ( let cellIndex = 0; cellIndex < this.m_cellCount; cellIndex++ )
            {
               const data = this.m_dataList[ cellIndex ];
               this.OnCreateCell( cellIndex, data, null );
               this.m_cellList[ cellIndex ] = null;
            }
         }
      }
      // [沒有盤面資料]
      else
      {
         warn( "沒有盤面資料", this.m_dataList );
      }
   }

   //----------------------------------------------------------------
   /**
    * 取得第 `cellIndex` 個 CELL 節點
    */
   public GetCellAtIndex ( cellIndex: number ): Node
   {
      return this.m_cellList[ cellIndex ];
   }

   //----------------------------------------------------------------

   //================================================================
   // 操作方法
   //================================================================

   //----------------------------------------------------------------
   /**
    * 顯示轉盤 (不一定要使用，只是提供一個預設的顯示動畫)
    * @param time 花費時間 (秒)
    */
   public Show ( time: number = 0.6 )
   {
      this.SetTouchGuardEnable( true, time );
      this.SetViewProperty( true, 1, 255, time, easing.backOut );
   }

   //----------------------------------------------------------------
   /**
    * 隱藏轉盤 (不一定要使用，只是提供一個預設的隱藏動畫)
    * @param time 花費時間 (秒)
    */
   public Hide ( time: number = 0.2 )
   {
      this.SetTouchGuardEnable( false, time );
      this.SetViewProperty( false, 0.2, 60, time );
   }

   //----------------------------------------------------------------
   /**
    * 啟動轉盤
    * @param targetIndex 目標區塊索引
    * @param options 可選參數
    * - `biasRate` 角度偏移率 (介於 `-1` 與 `1` 之間)
    * - `callback` 動畫結束回呼
    */
   public Spin ( targetIndex: number, options?: { biasRate?: CommonWheel.VarNum, callback?: Function; } )
   {
      // 初始化準備
      this.InitPrepare();

      // 檢查是否準備就緒
      if ( this.m_stateManager.Current <= CommonWheel.STATE.NONE && this.m_stateManager.Next <= CommonWheel.STATE.NONE )
      {
         this.Prepare();
      }

      const currState = this.m_stateManager.Current;
      const nextState = this.m_stateManager.Next;

      if ( !this.m_canSpin )
      {
         warn( `目前不能 Spin : CurrState( ${ currState } ), NextState( ${ nextState } )` );
      }
      else if ( currState != CommonWheel.STATE.IDLE && nextState != CommonWheel.STATE.IDLE )
      {
         warn( `需要先 Reload 才可以 Spin : CurrState( ${ currState } ), NextState( ${ nextState } )` );
      }
      else if ( this.m_cellCount <= 0 )
      {
         warn( `需要先設定盤面 SetData(...) : Cell 數量 = ${ this.m_cellCount }` );
      }
      else
      {
         const biasRate = options?.biasRate ?? this.SpinBiasRate() ?? 0;
         const callback = options?.callback ?? null;

         this.m_shouldStart = true;
         this.m_targetIndex = targetIndex;
         this.m_targetAngle = this.GetAngleByIndex( targetIndex );
         this.m_targetOffset = this.GetAngleOffset( biasRate );
         this.m_callback = callback;
         this.m_hasSetTarget = true;

         this.PrepareEvaluateSamples();
         this.EvaluateAxisSamples();
         this.SetCanSpin( false );
      }

      // 啟動失敗
      !this.m_shouldStart && options?.callback?.();
   }

   //----------------------------------------------------------------
   /**
    * 啟動轉盤加速
    * @param targetIndex 目標區塊索引
    * @param options 可選參數
    * - `biasRate` 角度偏移率 (介於 `-1` 與 `1` 之間)
    * - `callback` 動畫結束回呼
    */
   public StartFakeSpin ( options?: { biasRate?: CommonWheel.VarNum, callback?: Function; } )
   {
      // 初始化準備
      this.InitPrepare();

      // 檢查是否準備就緒
      if ( this.m_stateManager.Current <= CommonWheel.STATE.NONE && this.m_stateManager.Next <= CommonWheel.STATE.NONE )
      {
         this.Prepare();
      }

      const currState = this.m_stateManager.Current;
      const nextState = this.m_stateManager.Next;

      if ( !this.m_canSpin )
      {
         warn( `目前不能 Spin : CurrState( ${ currState } ), NextState( ${ nextState } )` );
      }
      else if ( currState != CommonWheel.STATE.IDLE && nextState != CommonWheel.STATE.IDLE )
      {
         warn( `需要先 Reload 才可以 Spin : CurrState( ${ currState } ), NextState( ${ nextState } )` );
      }
      else if ( this.m_cellCount <= 0 )
      {
         warn( `需要先設定盤面 SetData(...) : Cell 數量 = ${ this.m_cellCount }` );
      }
      else
      {
         const biasRate = options?.biasRate ?? this.SpinBiasRate() ?? 0;
         const callback = options?.callback ?? null;
         this.m_shouldStart = true;
         this.m_targetOffset = this.GetAngleOffset( biasRate );
         this.m_callback = callback;
         this.m_targetAngle = this.AxisAngle + this.m_targetOffset;

         this.PrepareEvaluateSamples();
         this.EvaluateAxisSamples();
         this.CalculateFixSpeed();
         this.SetCanSpin( false );
         this.m_stateManager.Transit( CommonWheel.STATE.FAKESPIN_START );
      }
   }

   //----------------------------------------------------------------
   /**
    * 設定最終結果
    */
   public SetTarget ( targetIndex: number )
   {
      if ( this.m_stateManager.Current < CommonWheel.STATE.FAKESPIN_START || 
           this.m_stateManager.Current > CommonWheel.STATE.FAKESPIN_WAIT_STOP )
      {
         warn( `SetTarget 只能在 ACCELERATE 和 FIXED_SPEED 狀態下使用 `);
         return;
      }
      if ( this.m_hasSetTarget )
      {
         warn( `Target 已經設定過了` );
         return;
      }
      this.m_hasSetTarget = true;
      this.m_targetIndex = targetIndex;
      this.m_targetAngle = this.GetAngleByIndex( targetIndex ) + this.m_targetOffset;
   }

   //----------------------------------------------------------------
   /**
    * 重算取樣
    */
   public ReEvaluateSamples ()
   {
      const axisSamples = this.m_axisSamples;
      const boundaryIndex = Math.floor( axisSamples.length * this.FixedSpeedTimeInterval() );
      
      let angleOffset = this.m_targetAngle - axisSamples[ axisSamples.length - 1 ];
      
      const boundaryAngle = axisSamples[ boundaryIndex ] + angleOffset;
      const angleDiff = boundaryAngle - this.AxisAngle;
      
      if ( this.IsClockwise() )
      {
         if ( angleDiff >= 0 )
         {
            const circlesToSubtract = Math.ceil( angleDiff / 360 );
            angleOffset -= 360 * circlesToSubtract;
         }
         else if ( angleDiff < -360 )
         {
            const circlesToAdd = Math.floor( -angleDiff / 360 );
            angleOffset += 360 * circlesToAdd;
         }
      }
      else
      {
         if ( angleDiff <= 0 )
         {
            const circlesToAdd = Math.ceil( -angleDiff / 360 );
            angleOffset += 360 * circlesToAdd;
         }
         else if ( angleDiff > 360 )
         {
            const circlesToSubtract = Math.floor( angleDiff / 360 );
            angleOffset -= 360 * circlesToSubtract;
         }
      }

      for ( let i = 0; i < axisSamples.length; i++ )
      {
         axisSamples[ i ] = axisSamples[ i ] + angleOffset;
      }
      this.m_axisSamples = axisSamples;
   }

   //----------------------------------------------------------------
   /**
    * 計算邊界角度
    */
   public CalculateBoundaryAngle ()
   {
      const sampleCount = this.m_axisSamples.length;
      let boundaryAngle = 0;
      // [取樣數量充分]
      if ( sampleCount >= 2 )
      {
         const sampleValue = sampleCount * this.FixedSpeedTimeInterval();
         const sampleIndex = Math.floor( sampleValue );
         const foreIndex = CommonWheel.ClampNum( sampleIndex, 0, sampleCount - 1 );
         const backIndex = CommonWheel.ClampNum( sampleIndex + 1, 0, sampleCount - 1 );

         // 前後樣本相同 => 直接取值
         if ( foreIndex == backIndex )
         {
            boundaryAngle = this.m_axisSamples[ foreIndex ];
         }
         // 使用前後樣本做線性插值
         else
         {
            const foreValue = this.m_axisSamples[ foreIndex ];
            const backValue = this.m_axisSamples[ backIndex ];
            boundaryAngle = CommonWheel.LerpNum( foreValue, backValue, sampleValue - sampleIndex );
         }
      }
      // [只有單一取樣]
      else if ( sampleCount == 1 )
      {
         boundaryAngle = this.m_axisSamples[ 0 ];
      }
      // [沒有取樣]
      else
      {
         boundaryAngle = 0;
      }

      this.m_isBoundaryAngle = boundaryAngle;
   }

   //----------------------------------------------------------------
   /**
    * 跳過動畫
    */
   public Skip ()
   {
      // 目前可跳過
      if ( this.m_canSkip )
      {
         // 跳過動畫
         this.PlaySkipTween( () => this.m_stateManager.Transit( CommonWheel.STATE.STOP ) );

         // 跳過通知
         this._onSpinSkip();
      }
   }

   //----------------------------------------------------------------
   /**
    * 停止轉盤
    */
   public Stop ()
   {
      if ( this.m_stateManager.Current != CommonWheel.STATE.STOP )
      {
         this.m_stateManager.ForceTransit( CommonWheel.STATE.STOP );

         this.SetCanSpin( false );
         this.SetCanSkip( false );
      }
   }

   //----------------------------------------------------------------
   /**
    * 重置轉盤
    * @param keepAngle 維持目前轉盤角度 (預設 false)
    */
   public Reload ( keepAngle: boolean = false )
   {
      // 取出 Callback
      const callback = this.m_callback;

      // 轉盤初始化
      this.Prepare( keepAngle ? this.AxisAngle : 0 );

      // 呼叫 Callback
      typeof callback == "function" && callback();

      // 重置通知
      this._onReload();
   }

   //----------------------------------------------------------------

   //================================================================
   // Cell 節點管理
   //================================================================

   //----------------------------------------------------------------
   /** 創建 Cell 節點 */
   protected CreateCellNode (): Node
   {
      if ( !this.m_cellPool )
      {
         const nodeCreator = ( () =>
         {
            switch ( this.m_cellResType )
            {
               // 參考節點
               case CommonWheel.CellResourceType.NODE: {
                  return isValid( this.m_cellRefNode, true )
                     ? () => instantiate( this.m_cellRefNode )
                     : null;
               }

               // Prefab
               case CommonWheel.CellResourceType.PREFAB: {
                  return isValid( this.m_cellPrefab, true )
                     ? () => instantiate( this.m_cellPrefab )
                     : null;
               }
            }
         } )();

         if ( typeof nodeCreator === "function" )
         {
            const maxPoolSize = this.CellPoolSizeMax();
            this.m_cellPool = new CommonNodePool( nodeCreator, { maxSize: maxPoolSize } );
         }
      }

      return this.m_cellPool?.Take() ?? null;
   }

   //----------------------------------------------------------------
   /** 移除 Cell 節點 */
   protected RemoveCellNode ( cell: Node )
   {
      if ( isValid( cell, true ) )
      {
         this.m_cellPool
            ? this.m_cellPool.Back( cell )
            : cell.destroy();
      }
   }

   //----------------------------------------------------------------

   //================================================================
   // 數值計算
   //================================================================

   //----------------------------------------------------------------
   /**
    * 取得 CELL 角度
    * @param cellIndex CELL 索引
    */
   protected GetAngleByIndex ( cellIndex: number ): number
   {
      const angle = cellIndex * this.m_cellAngle;
      const positiveAngle = ( angle < 0 ) ? ( angle + CommonWheel.DEGREE_IN_CIRCLE ) : angle;
      return this.m_reversed ? positiveAngle : -positiveAngle;
   }

   //----------------------------------------------------------------
   /**
    * 取得角度偏移
    * @param biasRate 偏移率(指定值或指定範圍)
    */
   protected GetAngleOffset ( biasRate: CommonWheel.VarNum ): number
   {
      const bias = CommonWheel.CollapseVarNum( biasRate, -1, 1 );
      const angle = bias * this.m_cellAngle * 0.5;
      return this.m_reversed ? angle : -angle;
   }

   //----------------------------------------------------------------
   /**
    * 計算轉盤最後停止時節點的 Angle 值
    * @param targetDegree  目標角度
    * @param spinRounds    轉了幾圈
    */
   protected CalculateLastAngle ( targetDegree: number, spinRounds: number ): number
   {
      const clockwise = this.IsClockwise();
      const targetAngle = clockwise
         ? ( ( targetDegree > this.m_initAngle ) ? ( targetDegree - CommonWheel.DEGREE_IN_CIRCLE ) : targetDegree )
         : ( ( targetDegree < this.m_initAngle ) ? ( targetDegree + CommonWheel.DEGREE_IN_CIRCLE ) : targetDegree );
      const lastAngle = clockwise
         ? ( targetAngle - CommonWheel.DEGREE_IN_CIRCLE * spinRounds )
         : ( targetAngle + CommonWheel.DEGREE_IN_CIRCLE * spinRounds );
      return lastAngle;
   }

   //----------------------------------------------------------------
   /**
    * 準備進行轉盤角度取樣
    */
   protected PrepareEvaluateSamples ()
   {
      this.m_axisSamples = [];
      this.m_spinDuration = CommonWheel.CollapseVarNum( this.SpinDuration(), 0 );
      this.m_spinRounds = Math.round( CommonWheel.CollapseVarNum( this.SpinRounds(), 0 ) );
      this.m_speedRate = CommonWheel.CollapseVarNum( this.SpeedRate() );
      this.m_sampleRate = CommonWheel.CollapseVarNum( this.SampleRate(), 1, 60 );
      this.m_sampleCount = Math.ceil( this.m_sampleRate * this.m_spinDuration );
      this.m_lastAngle = this.CalculateLastAngle( this.m_targetAngle, this.m_spinRounds ) + this.m_targetOffset;
   }

   //----------------------------------------------------------------
   /**
    * 執行轉盤角度取樣
    */
   protected EvaluateAxisSamples ()
   {
      const speedRate = this.m_speedRate;
      const speedBias = 1 - speedRate;
      const sampleCount = this.m_sampleCount;
      const initAngle = this.m_initAngle;
      const lastAngle = this.m_lastAngle;
      const spinAngle = lastAngle - initAngle;

      //----------------------------------------------------------------
      // Start sampling
      //----------------------------------------------------------------
      // u(t) = 0.5 * (1 + sin( ((1+(t-1)^3)+0.5)*PI ))
      //      = 0.5 * (1 + sin( (cubicOut(t)+0.5)*PI ))
      //      = sineInOut(cubicOut(t))
      // v(t) = speedRate + (1 - speedRate) * sin( 0.5*t*PI )
      //      = speedRate + (1 - speedRate) * sineOut(t)
      //      = lerp(speedRate, 1, sineOut(t))
      // r(t) = u(t) * v(t)
      //      = sineInOut(cubicOut(t)) * lerp(speedRate, 1, sineOut(t))
      //----------------------------------------------------------------
      // Plot an example in WolframAlpha : https://reurl.cc/dDbm0z
      //----------------------------------------------------------------
      for ( let i = 0; i <= sampleCount; i++ )
      {
         const t = i / sampleCount;
         const u0 = easing.cubicOut( t );
         const u1 = easing.sineInOut( u0 );
         const v0 = easing.sineOut( t );
         const v1 = ( speedRate + speedBias * v0 );
         const r = u1 * v1;
         this.m_axisSamples[ i ] = initAngle + spinAngle * r;
      }
   }

   //----------------------------------------------------------------
   /**
    * 計算固定速度角度
    */
   protected CalculateFixSpeed (): void
   {
      const sampleCount = this.m_sampleCount;
      
      if ( sampleCount == 0 )
      {
         this.m_fakeSpinFixSpeed = 0;
      }
      else if ( sampleCount == 1 )
      {
         this.m_fakeSpinFixSpeed = this.m_axisSamples[ 0 ];
      }
      else
      {
         const angleIndex = Math.floor( sampleCount * this.FixedSpeedTimeInterval() );
         this.m_fakeSpinFixSpeed = this.m_axisSamples[ angleIndex + 1 ] - this.m_axisSamples[ angleIndex ];
      }
   }

   //================================================================
   // Tween 動畫控制
   //================================================================

   //----------------------------------------------------------------
   /**
    * 開始轉盤動畫
    * @param callback 轉盤動畫結束後的回調
    */
   protected PlaySpinTween ( callback?: Function )
   {
      this.StopTween( CommonWheel.TWEEN.CWC_AXIS_SPIN );

      // Basic arguments
      const spinDuration = this.m_spinDuration;
      const skipTimeline = CommonWheel.ClampNum( this.SkipTimeline(), 0, 1 );

      // Check duration is greater than 0.
      if ( spinDuration > 0 )
      {
         this.PlayTween(
            CommonWheel.TWEEN.CWC_AXIS_SPIN,
            new Tween<CommonWheelControl>( this )
               .set( { AxisTimeline: 0 } )
               .to( spinDuration * skipTimeline, { AxisTimeline: skipTimeline } )   // to skip timeline
               .call( () => this.SetCanSkip( false ) )                              // disable skip function
               .to( spinDuration * ( 1 - skipTimeline ), { AxisTimeline: 1 } ),     // to the end
            callback,
         );
      }
      // Immediately
      else
      {
         this.AxisTimeline = 1;
         typeof callback == "function" && callback();
      }
   }

   //----------------------------------------------------------------
   /** 跳過轉盤動畫 */
   protected PlaySkipTween ( callback?: Function )
   {
      // 取得跳過時間軸與目前時間軸
      const skipTimeline = CommonWheel.ClampNum( this.SkipTimeline(), 0, 1 );
      const currTimeline = this.AxisTimeline;

      // 已經超過跳過時間軸就不需處理
      if ( currTimeline >= skipTimeline )
      {
         this.SetCanSkip( false );
         typeof callback == "function" && callback();
         return;
      }

      // 停止當前動畫並停用跳過功能
      this.StopTween( CommonWheel.TWEEN.CWC_AXIS_SPIN );
      this.SetCanSkip( false );

      // 取得跳過時間軸比例與時間參數
      const skipTimeScale = this.SkipTimeScale();
      const spinDuration = this.m_spinDuration;
      const skipDuration = spinDuration * ( skipTimeline - currTimeline ) * Math.max( 0, skipTimeScale );

      // 轉動持續時間與跳過動畫時間都大於 0
      if ( skipDuration > 0 && spinDuration > 0 )
      {
         // 加速跳過然後慢慢轉到結束
         this.PlayTween(
            CommonWheel.TWEEN.CWC_AXIS_SPIN,
            new Tween<CommonWheelControl>( this )
               .to( skipDuration, { AxisTimeline: skipTimeline } )
               .to( spinDuration * ( 1 - skipTimeline ), { AxisTimeline: 1 } ),
            callback,
         );
      }
      // 沒有加速跳過直接表演最後的動畫
      else if ( spinDuration > 0 )
      {
         this.PlayTween(
            CommonWheel.TWEEN.CWC_AXIS_SPIN,
            new Tween<CommonWheelControl>( this )
               .set( { AxisTimeline: skipTimeline } )
               .to( spinDuration * ( 1 - skipTimeline ), { AxisTimeline: 1 } ),
            callback,
         );
      }
      // 直接到結束
      else
      {
         this.AxisTimeline = 1;
         typeof callback == "function" && callback();
      }
   }


   //----------------------------------------------------------------
   /** 停止轉盤動畫 */
   protected StopWheelTween ()
   {
      this.StopTween( CommonWheel.TWEEN.CWC_AXIS_SPIN );
      this.SetCanSkip( false );
      this.AxisTimeline = 1;
   }

   //----------------------------------------------------------------
   /**
    * 開始加速動畫
    */
   protected PlayAccelerateTween(callback?: Function)
   {
      this.StopTween( CommonWheel.TWEEN.CWC_AXIS_SPIN );

      // Basic arguments
      const fixedSpeedTimeInterval = this.FixedSpeedTimeInterval();
      const spinDuration = this.m_spinDuration * fixedSpeedTimeInterval;

      // Check duration is greater than 0.
      if ( spinDuration > 0 )
      {
         this.PlayTween(
            CommonWheel.TWEEN.CWC_AXIS_SPIN,
            new Tween<CommonWheelControl>( this )
               .set( { AxisTimeline: 0 } )
               .to( spinDuration, { AxisTimeline: fixedSpeedTimeInterval } ),
            callback,
         );
      }
      // Immediately
      else
      {
         this.AxisTimeline = 1;
         typeof callback == "function" && callback();
      }
   }

   //----------------------------------------------------------------
   /**
    * 開始減速動畫
    */
   protected PlayStopTween(callback?: Function)
   {
      this.StopTween( CommonWheel.TWEEN.CWC_AXIS_SPIN );

      // Basic arguments
      const fixedSpeedTimeInterval = this.FixedSpeedTimeInterval();
      const spinDuration = this.m_spinDuration * ( 1 - fixedSpeedTimeInterval );

      // Check duration is greater than 0.
      if ( spinDuration > 0 )
      {
         this.PlayTween(
            CommonWheel.TWEEN.CWC_AXIS_SPIN,
            new Tween<CommonWheelControl>( this )
               .set( { AxisTimeline: fixedSpeedTimeInterval } )
               .to( spinDuration, { AxisTimeline: 1 } ),
            callback,
         );
      }
      // Immediately
      else
      {
         this.AxisTimeline = 1;
         typeof callback == "function" && callback();
      }
   }

   //================================================================
   // 內部控制方法
   //================================================================

   //----------------------------------------------------------------
   /** 設定是否可以 Spin */
   protected SetCanSpin ( canSpin: boolean )
   {
      this.m_canSpin = canSpin;
      if ( isValid( this.m_spinTouch, true ) ) {
         this.m_spinTouch.TouchEnabled = canSpin;
      }
   }

   //----------------------------------------------------------------
   /** 設定是否可以跳過 */
   protected SetCanSkip ( canSkip: boolean )
   {
      this.m_canSkip = canSkip;
      if ( isValid( this.m_skipTouch, true ) ) {
         this.m_skipTouch.TouchEnabled = canSkip;
      }
   }

   //----------------------------------------------------------------

   //================================================================
   // 顯示元件控制
   //================================================================

   //----------------------------------------------------------------
   /**
    * 設定此節點顯示屬性
    * @param scale     `cc.Node.scale`
    * @param opacity   `cc.Node.opacity`
    * @param time      花費時間 (秒)
    * @param easing    緩動函數
    */
   protected SetViewProperty ( active: boolean, scale: number, opacity: number, time: number = 0, easing?: TweenEasing | ( ( k: number ) => number ) )
   {
      // 停止當前動畫
      this.StopTween( CommonWheel.TWEEN.CWC_SELF_VIEW );
      this.StopTween( CommonWheel.TWEEN.CWC_SELF_VIEW + "_OPACITY" );

      // 取得不透明度元件
      const uiOpacity = this.node.getComponent( UIOpacity ) ?? this.node.addComponent( UIOpacity );

      // 轉換縮放值 (Vec3)
      const scaleVec = new Vec3( scale, scale, 1);

      // 執行
      if ( time > 0 )
      {
         // 縮放變化
         this.PlayTween(
            CommonWheel.TWEEN.CWC_SELF_VIEW,
            new Tween( this.node )
               .set( { active: true } )
               .to( time, { scale: scaleVec }, { easing: easing } )
               .set( { active: active } ),
         );

         // 透明度變化
         this.PlayTween(
            CommonWheel.TWEEN.CWC_SELF_VIEW + "_OPACITY",
            new Tween( uiOpacity ).to( time, { opacity: opacity }, { easing: easing } )
         );
      }
      else
      {
         this.node.active = active;
         this.node.scale = scaleVec;
         uiOpacity.opacity = opacity;
      }
   }

   //----------------------------------------------------------------
   /**
    * 設定節點是否顯示
    * @param tweenKey  `TWEEN`
    * @param node      `cc.Node`
    * @param visible   是否顯示
    * @param second      花費時間 (秒)
    * @returns 
    */
   protected SetNodeVisible ( tweenKey: string, node: Node, visible: boolean, second: number = 0 )
   {
      if ( !isValid( node, true ) )
      {
         return;
      }

      // 取得不透明度元件
      const uiOpacity = node.getComponent( UIOpacity ) ?? node.addComponent( UIOpacity );

      // 原始不透明度快取
      if ( !( node.uuid in this.m_opacityMap ) )
      {
         this.m_opacityMap[ node.uuid ] = uiOpacity.opacity;
      }

      // 停止當前動畫 / 取得不透明度
      this.StopTween( tweenKey );
      const opacity = visible ? this.m_opacityMap[ node.uuid ] : 0;

      // 執行
      if ( second > 0 )
      {
         this.PlayTween(
            tweenKey,
            new Tween( uiOpacity )
               .call( () => { node.active = true; } )
               .to( second, { opacity: opacity } )
               .call( () => { node.active = visible; } )
         );
      }
      else
      {
         node.active = visible;
         uiOpacity.opacity = opacity;
      }
   }

   //----------------------------------------------------------------
   /**
    * 設定點擊保護是否啟用
    * @param isEnable  是否啟用
    * @param time      花費時間 (秒)
    */
   protected SetTouchGuardEnable ( isEnable: boolean, time: number = 0 )
   {
      this.SetNodeVisible( CommonWheel.TWEEN.CWC_TOUCH_GUARD, this.m_touchGuard, isEnable, time );
   }

   //----------------------------------------------------------------

   //================================================================
   // 事件通知
   //================================================================

   //----------------------------------------------------------------
   /**
    * 轉動開始通知
    */
   private _onEnterIdle (): void
   {
      this.OnEnterIdle?.();
      this.Delegate?.OnCommonWheelControlEnterIdle?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 轉動開始通知
    * @param targetIndex 目標索引
    */
   private _onSpinStart ( targetIndex: number ): void
   {
      this.OnSpinStart?.( targetIndex );
      this.Delegate?.OnCommonWheelControlSpinStart?.( this, targetIndex );
   }

   //----------------------------------------------------------------
   /**
    * 轉動跳過通知
    */
   private _onSpinSkip (): void
   {
      this.OnSpinSkip?.();
      this.Delegate?.OnCommonWheelControlSpinSkip?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 轉動停止通知
    */
   private _onSpinStop (): void
   {
      this.OnSpinStop?.();
      this.Delegate?.OnCommonWheelControlSpinStop?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 假轉動開始通知
    */
   private _onFakeSpinStart (): void
   {
      this.OnFakeSpinStart?.();
      this.Delegate?.OnCommonWheelControlFakeSpinStart?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 假轉動等待停止通知
    */
   private _onFakeSpinWaitStop (): void
   {
      this.OnFakeSpinWaitStop?.();
      this.Delegate?.OnCommonWheelControlFakeSpinWaitStop?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 假轉動播放停止通知
    */
   private _onFakeSpinPlayStop (): void
   {
      this.OnFakeSpinPlayStop?.();
      this.Delegate?.OnCommonWheelControlFakeSpinPlayStop?.( this );
   }

   //----------------------------------------------------------------
   /**
    * 轉盤重置通知
    */
   private _onReload (): void
   {
      this.OnReload?.();
      this.Delegate?.OnCommonWheelControlReload?.( this );
   }

   //----------------------------------------------------------------
   /**
    * Spin 點擊區點擊事件
    * @param event Cocos 觸控事件
    * @param tag {@link Touchable.Tag}
    */
   private _onSpinTouchClicked ( event: EventTouch, tag: number ): void
   {
      this.OnSpinTouchClicked?.( event, tag );
      this.Delegate?.OnCommonWheelControlSpinTouchClicked?.( this, event, tag );
   }

   //----------------------------------------------------------------
   /**
    * Skip 點擊區點擊事件
    * @param event Cocos 觸控事件
    * @param tag {@link Touchable.Tag}
    */
   private _onSkipTouchClicked ( event: EventTouch, tag: number ): void
   {
      this.OnSkipTouchClicked?.( event, tag );
      this.Delegate?.OnCommonWheelControlSkipTouchClicked?.( this, event, tag );
   }

   //----------------------------------------------------------------
   /**
    * 轉軸角度變化通知
    * @param oldAngle 舊角度
    * @param newAngle 新角度
    */
   private _onAxisAngleChanged ( oldAngle: number, newAngle: number ): void
   {
      this.OnAxisAngleChanged?.( oldAngle, newAngle );
      this.Delegate?.OnCommonWheelControlPlateAxisChanged?.( this, oldAngle, newAngle );
   }

   //----------------------------------------------------------------
   /**
    * 時間軸變化通知
    * @param timeline 時間軸
    */
   private _onTimelineChanged ( timeline: number ): void
   {
      this.OnTimelineChanged?.( timeline );
      this.Delegate?.OnCommonWheelControlTimelineChanged?.( this, timeline );
   }

   //----------------------------------------------------------------
   // 把SafeTween的行為先搬過來, 目前只有這邊用到
   protected PlayTween(key: string, tween: Tween<any>, callback?: Function) {
      this.m_tweenerCallBackMap[key] = callback
      this.m_tweenerMap[key] = tween.call(() => {
         delete this.m_tweenerMap[key];
         this.ClearCallback(key);
      }).start()
   }

   protected StopTween(key: string)
   {
      const tween = this.m_tweenerMap[key];
      ( tween instanceof Tween ) && tween.stop();
      delete this.m_tweenerMap[key];
   }

   protected ClearCallback(key: string, execute: boolean = true)
   {
      const cb = this.m_tweenerCallBackMap[key];
      delete this.m_tweenerCallBackMap[key];
      execute && typeof cb == "function" && cb();
   }

}
