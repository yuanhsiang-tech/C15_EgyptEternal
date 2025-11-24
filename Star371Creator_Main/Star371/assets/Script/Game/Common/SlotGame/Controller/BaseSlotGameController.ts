import { Node, _decorator, isValid, Component, Prefab, instantiate, Event, error } from "cc";
import BaseSlotGameModel from "./BaseSlotGameModel";
import SlotCommonAdapter from "./SlotCommonAdapter";
import SlotGameBase from "../SlotGameBase";
import GameBar from "../../../Platform/GameBar/GameBar";
import { CommonSpinner } from "../../SlotSpinner/CommonSpinnerMacros";
import CommonSpinnerControl from "../../SlotSpinner/CommonSpinnerControl";
import { GameBarDefine } from "../../../Platform/GameBar/GameBarDefine";
import { EventDefine } from "../../../../Define/EventDefine";
import { GameCommonCommand } from "../../GameCommonCommand";
import { BigWinDefine } from "../../../Platform/WinView/BigWinDefine";
import FiniteState from "db://assets/Stark/Utility/FiniteState";
import { TimedBool } from "db://assets/Stark/Utility/TimedBool";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { EnvConfig } from "db://assets/Script/Define/ConfigDefine";
//import AssetsDefine from "../../../DataDefine/AssetsDefine";
//import { FullFrame } from "../../../UICommon/FullFrame";
//import { GameScene } from "../../GameScene";
//import { GameBar } from "../GameBar/GameBar";
//import GameBarDefine from "../../../../Snippet/Games/GamesCommon/GameBar/GameBarDefine";
//import CommonSpinnerControl from "../CommonReel/CommonSpinnerControl";
//import FiniteState from "../../../Utils/FiniteState";
//import TimedBool from "../../../Utils/TimedBool";
//import { TriggerDefine } from "../../../Define/TriggerDefine";
//import { GameCommonCommand } from "../../../../Snippet/Games/GameCommonType";
//import { JsonCommand } from "../../../../Snippet/Infrastructure/Command/Command";
//import Jsonizable from "../../../Infrastructure/Command/Jsonizable";
//import SlotGameGodFinger from "../SlotGameGodFinger";
//import { BigWinType } from "../../../../Snippet/UICommon/Effect/BigWin/BigWinEffect";
//import { AppConfig } from "../../../Define/AppConfig";

const { ccclass, property } = _decorator;

interface BaseSlotGameSetting
{
   debugGameName?: string; //
   useGodHand?: boolean; //是否使用godHand 預設:是
}

export interface IFxPlayer
{
   OnReceiveSpinAck (); //收到serverack後 要表演 含塞資料 停輪
   IsPlateAnimStopped ();  //判定是否有轉輪中的動畫 還有動畫要傳false
   OnSlotReelSopted (); //全部停輪後的表演
   ShowNomalSymbolEffect ();
   ClearEffect ();

   StopHard?: () => void;  //slotReel 二選一
   SpinReel?: ( isFastMode: boolean ) => void;//slotReel 二選一
}

export enum BASE_SLOT_GAMEVIEW_STATE
{
   WAIT_INIT, //等待gamestage
   INIT, //正在初始化 等Server gameinfo
   WAIT_FOREVER, //永久等待的狀態，靠事件或是其他觸發自行離開 base不會處理離開

   IDLE, //等待玩家spin
   SPIN_START, //按下spin按鈕 判定 & 開始轉
   SPIN_SPINNING_TO_STOP, //收到spinAck 

   EFFECT_BIG_WIN, //顯示大獎特效
   EFFECT_LINE_AWARD, //線獎
   EFFECT_EXIT_FEATURE_GAME_TO_MAIN_GAME, //返回Main後會跳bigWin

   ONLY_WAIT_BY_TIME, //專門的等待
   ONLY_WAIT_BY_CHECK, //專門的等待 可放CB
   ONLY_WAIT_GOTONEXTSTATE, //專門的等待 時間/ CB=true會執行 gotonext    
   MAX,
}

enum ResourceLateKey
{
   GOD_HAND = ( 1 << 0 ),
   ALL = ( 1 << 1 ) - 1
}

@ccclass
export default abstract class BaseSlotGameController extends Component
{
   @property( { type: Node, displayName: "GameBarPanel" } ) protected m_gameBarPanel: Node = null;
   @property( { type: [ Node ], displayName: "TouchPanel" } ) protected m_touchPanels: Node[] = [];

   //---------設定
   protected TIME_LOCK_CLICK_SEC: number = 0.1; //觸碰區防連點
   protected TIME_STATE_EFFECTLINEAWARD: number = 0; //非自動轉時，多久可以進入下一個階段
   protected m_featureNeedAutoAddGameBarWin: boolean = true; //如果是fratureGame 是否需要自動加上 gamebar的winValue  預設true

   //---------主體在別人家
   protected m_gameStage: SlotGameBase = null;
   protected m_gameBar: GameBar = null;
   protected m_baseSlotReel: CommonSpinnerControl = null;
   protected m_baseModel: BaseSlotGameModel = null;
   protected m_baseFxPlayer: IFxPlayer = null;

   //--------- 選擇 是否需要建立
   protected m_godHand: Node = null;

   //--------- 大家都需要的共用元件喔 在此gameview建立
   protected m_baseCommAdapter: SlotCommonAdapter = null;

   //--------- 終於是Gameview
   protected m_state: FiniteState = new FiniteState( BASE_SLOT_GAMEVIEW_STATE.WAIT_INIT );
   protected m_baseResFlags: number = 0x0;
   protected m_awardNextStateArr: { toNextState: number, toNextWaitTime?: number, toNextCheckCB?: ( ...args: any[] ) => boolean, directFunc?: Function; }[] = null; //接下來的狀態
   protected m_baseTimer: TimedBool = new TimedBool();
   private m_waitNextState: number = -1; //搭配 only_wait使用
   private m_waitNextCheckCB: ( ...args: any[] ) => boolean; //搭配 only_wait使用

   protected m_touchPanelTick: number = 0; //會在點下的時候清空
   protected m_gamebarWinEffectEnd: boolean = true; //winEffect 滾分結束

   private m_isInitState: boolean = true; // 判斷第一次進入
   private m_isDeclareStage: boolean = false; // 判斷freegame是否為宣告階段

   InitBaseGameView ( setting: BaseSlotGameSetting, model: BaseSlotGameModel,
      gameStage: SlotGameBase, gameBar: GameBar,
      slotReel: CommonSpinnerControl, fxPlayer: IFxPlayer )
   {

      this.m_baseModel = model;
      this.m_gameStage = gameStage;
      this.m_gameBar = gameBar;
      this.m_baseSlotReel = slotReel;
      this.m_baseFxPlayer = fxPlayer;

      this.m_baseCommAdapter = new SlotCommonAdapter( gameStage, gameBar, model );

      //****GameBar        
      // this.m_gameBarPanel.addChild( this.m_gameBar.node );
      // this.m_gameBar.SetTouchEvent(( target: string ) => { this.OnBtnClick( target )}, null);
      this.m_gameBar.ActiveQATest();

      //****GodHand init
      if ( EnvConfig.IS_DEV && isValid( setting ) && isValid( setting.useGodHand ) && setting.useGodHand )
      {
         this.LoadGodHand();
      } else
      {
         this.m_baseResFlags |= ResourceLateKey.GOD_HAND;
      }

      if ( isValid( this.m_touchPanels ) && this.m_touchPanels.length > 0 )
      {
         let len: number = this.m_touchPanels.length;
         for ( let i = 0; i < len; i++ )
         {
            this.m_touchPanels[ i ].on( Node.EventType.TOUCH_END, ( evt: Event ) => { this.OnTouchFrameClick( evt ); } );
         }
      }
   }

   SetNewSlot ( slotReel: CommonSpinnerControl, fxPlayer: IFxPlayer )
   {
      this.m_baseSlotReel = slotReel;
      this.m_baseFxPlayer = fxPlayer;
   }

   update ( dt: number )
   {
      this.m_touchPanelTick = this.m_touchPanelTick + dt;
      let currentState = this.m_state.Tick();
      this.OnUpdatePreBase( dt ); //為了可以在base工作前 先執行
      switch ( currentState )
      {
         case BASE_SLOT_GAMEVIEW_STATE.WAIT_FOREVER: { break; }
         case BASE_SLOT_GAMEVIEW_STATE.ONLY_WAIT_BY_TIME: {
            if ( this.m_baseTimer.ToBool() )
            {
               this.m_state.Transit( this.m_waitNextState );
               this.m_waitNextState = -1;
            }
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.ONLY_WAIT_BY_CHECK: {
            if ( isValid( this.m_waitNextCheckCB ) && this.m_waitNextCheckCB() )
            {
               this.m_state.Transit( this.m_waitNextState );
               this.m_waitNextCheckCB = null;
            }
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.ONLY_WAIT_GOTONEXTSTATE: {
            this.GotoNextState();
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.IDLE: {
            // if(this.m_gamebarWinEffectEnd){
            if ( this.m_state.IsEntering )
            {
               if(this.m_baseModel.canUpdateBetTable) {
                  GamesChief.SlotGame.CheckAndUpdateBetList(); //刷新Server Bet List
               }

               //剛離開Feature Game
               if ( this.m_baseCommAdapter.lastIdleFeature === true && this.m_baseModel.isInFeatureGame === false )
               {
                  this.m_gameBar.BetValue = this.m_gameBar.BetValue; //確保betList
                  //還原Spin按鈕
                  if ( this.m_baseModel.isAutoPlay )
                  {
                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
                  } else
                  {
                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.SPIN;
                  }
               }

               if ( this.m_baseModel.canChangeGameBarSpinState )
               {
                  this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.SPIN;
                  if ( !this.m_baseModel.isInFeatureGame && !this.m_baseModel.isAutoPlay )
                  {
                     this.m_gameBar.SetBetBtnEnabled( true );
                  }
               }

               this.m_baseCommAdapter.OnIDLE( this.m_baseModel.isInFeatureGame );
            }
            if ( this.m_baseModel.isAutoContinue )
            {
               if ( /**!this.m_baseModel.isInFeatureGame && */ this.m_gameBar.AutoPlayRounds == 0 )
               {
                  this.StopAutoPlay();
               } else
               {
                  this.m_state.Transit( BASE_SLOT_GAMEVIEW_STATE.SPIN_START );
               }
            }
            // }else{
            //     this.m_state.Transit(BASE_SLOT_GAMEVIEW_STATE.IDLE);
            // }                           
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.SPIN_START: {
            if ( this.m_state.IsEntering )
            {
               this.m_isInitState = false;
               this.m_baseFxPlayer.ClearEffect();
               this.OnSpinStartWinValueSkip();
               this.m_gameBar.SetBetBtnDisable();

               if ( this.m_baseModel.canChangeGameBarSpinState )
               {
                  if ( this.m_baseModel.canGameBarToStop )
                  {
                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP;
                  } else
                  {
                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.SPIN_DISABLE;
                  }
               }

               if ( this.m_baseModel.isInFeatureGame )
               {
                  this.BaseGameViewSpinReel( this.m_gameBar.IsFastMode() );
                  this.m_baseModel.isControllableFG && this.m_baseModel.isAutoPlay && this.m_gameBar.TakeAutoPlayRounds();
                  this.SpinRequest();
                  this.m_baseCommAdapter.OnSPIN( false );
                  
               } else if ( GamesChief.SlotGame.CanBet( this.m_gameBar.BetValue ) )
               {
                  this.BaseGameViewSpinReel( this.m_gameBar.IsFastMode() );
                  this.m_gameBar.TakeAutoPlayRounds();
                  EventDispatcher.Shared.Dispatch( EventDefine.Game.CURRENCY_UPDATE_BY_BET, this.m_gameBar.BetValue );
                  this.SpinRequest();
                  this.m_baseCommAdapter.OnSPIN( true );
               } else
               {
                  if ( this.m_baseModel.isAutoPlay )
                  {
                     this.StopAutoPlay();
                  }
                  this.m_state.Transit( BASE_SLOT_GAMEVIEW_STATE.IDLE );
               }
            }
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.SPIN_SPINNING_TO_STOP: {
            if ( this.m_state.IsEntering )
            {
               this.m_baseCommAdapter.OnSpinAckSuccess( !this.m_baseModel.isInFeatureGame, this.m_baseModel.enterFeatureGame );

               // if(this.m_baseModel.canChangeGameBarSpinState && this.m_baseModel.canGameBarToStop){
               //     this.m_gameBar.SpinButtonState = GameBarSpinButtonState.STOP;
               // }
               this.OnReceiveSpinAckWinValueReset();
               this.m_baseFxPlayer.OnReceiveSpinAck();
               this.SetAwardNextStateArr();
            } else if ( this.BaseGameViewIsPlateStopped() )
            {
               if ( this.m_gameBar.SpinButtonState == GameBarDefine.SpinButtonState.STOP )
               {
                  this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE; //同停結束
               }

               if ( this.m_baseFxPlayer.IsPlateAnimStopped() )
               {
                  this.m_baseFxPlayer.OnSlotReelSopted();
                  this.GotoNextState();
               }
            }
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.EFFECT_BIG_WIN: {
            if ( this.m_state.IsEntering )
            {
               GamesChief.SlotGame.DeclareBigWin( this.m_gameBar.BetValue, this.m_baseModel.win, () =>
               {
                  this.GotoNextState();
               } );
            }
            break;
         }

         case BASE_SLOT_GAMEVIEW_STATE.EFFECT_LINE_AWARD: {
            if ( this.m_state.IsEntering )
            {
               this.m_baseFxPlayer.ShowNomalSymbolEffect();
               let win = this.m_baseModel.win;
               if ( this.m_baseModel.isInFeatureGame && this.m_featureNeedAutoAddGameBarWin )
               {
                  win = win.plus( this.m_gameBar.WinValue );
               }
               this.m_gamebarWinEffectEnd = false;
               // this.m_gameBar.WinValueRoll( win ,()=>{
               
               GamesChief.SlotGame.ShowNormalWin( win, () =>
               {
                  if ( !this.m_baseModel.isInFeatureGame )
                  {
                     EventDispatcher.Shared.Dispatch( EventDefine.Game.CURRENCY_UPDATE_BY_REWARD, this.m_baseModel.win );
                  }
                  this.m_gamebarWinEffectEnd = true;
               } );
               this.m_baseTimer.Start( this.TIME_STATE_EFFECTLINEAWARD );
            } else if ( this.BaseGameViewStateLineAwardState() )
            {
               this.GotoNextState();
            }
            break;
         }

         case BASE_SLOT_GAMEVIEW_STATE.INIT: {
            if ( this.m_state.IsEntering )
            {
               this.RequestGameInfo();
            }
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.WAIT_INIT: {
            if ( this.m_baseResFlags == ResourceLateKey.ALL )
            {
               this.OnResourceDidLoad();
               this.m_state.Transit( BASE_SLOT_GAMEVIEW_STATE.INIT );
            }
            break;
         }
         case BASE_SLOT_GAMEVIEW_STATE.EFFECT_EXIT_FEATURE_GAME_TO_MAIN_GAME: {
            if ( this.m_state.IsEntering )
            {
               this.m_baseModel.runEffectAction = true;
               GamesChief.SlotGame.DeclareBigWin(
                  this.m_gameBar.BetValue,
                  this.m_gameBar.WinValue,
                  () =>
                  {
                     this.m_baseModel.runEffectAction = false;
                     this.BaseGameViewStateOnFeatureGameEndCallBack();
                  }
               );
            } else if ( !this.m_baseModel.runEffectAction )
            {
               this.GotoNextState();
            }
            break;
         }
      }
   }

   public OnSessionResponse(status: number, content: string)
   {
      switch ( status )
      {
         //case GameCommonCommand.G2U.G2U_COMMON_COMMAND_BET_SETTING_ACK: {
         //   this.m_gameStage.OnBetInfoUpdate();
         //   if (( this.m_state.Current == BASE_SLOT_GAMEVIEW_STATE.IDLE ) && ( !this.m_baseModel.isInFeatureGame )) {
         //      GamesChief.SlotGame.CheckAndUpdateBetList();
         //   }
         //   break;
         //}
      }
   }

   /** 載入 GodHand */
   protected LoadGodHand ()
   {
      // Bundle.resources.load( AssetsDefine.PREFAB_SLOT_GOD_HAND, Prefab, ( err: Error, res: Prefab ) =>
      // {
      //    if ( err )
      //    {
      //       err && error( "LOAD GOD HAND ERROR ::: ", err.message );
      //    } else
      //    {
      //       let node = instantiate( res );
      //       let comp = node.getComponent( SlotGameGodFinger );
      //       SlotGameGodFinger.instance = comp;
      //       SlotGameGodFinger.instance.Init( this.m_baseSlotReel, this.m_gameBar );
      //       FullFrame.Instance.addChild( node );
      //    }

      //    this.m_baseResFlags |= ResourceLateKey.GOD_HAND;
      // } );
   }

   protected StartAutoPlay ()
   {
      if ( !this.m_baseModel.isAutoPlay )
      {
         this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
         this.m_baseModel.isAutoPlay = true;
         this.m_gameBar.SetBetBtnEnabled( false );
      }
   }

   protected StopAutoPlay ()
   {
      if ( this.m_baseModel.isAutoPlay )
      {
         if ( this.m_state.Current == BASE_SLOT_GAMEVIEW_STATE.IDLE )
         {
            this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.SPIN;
            this.m_gameBar.SetBetBtnEnabled( true );
         } else
         {
            this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO_DISABLE;
         }
      }
      this.m_gameBar.StopAutoPlay(); //清空gameBar 自動玩次數
      this.m_baseModel.isAutoPlay = false;
   }

   protected OnTouchFrameClick ( event: Event )
   {
      //可以點的時間
      if ( this.m_touchPanelTick > this.TIME_LOCK_CLICK_SEC )
      {
         this.m_touchPanelTick = 0;
         if ( this.m_gameBar.SpinButtonState == GameBarDefine.SpinButtonState.SPIN )
         {
            this.m_gameBar.PlaySpinBtnSound( 'Spin' );
            this.OnButtonSpinClick();
         } else if ( this.m_gameBar.SpinButtonState == GameBarDefine.SpinButtonState.STOP )
         {
            this.m_gameBar.PlaySpinBtnSound( 'Stop' );
            this.OnButtonStopClick();
         }
      }
   }

   protected OnBtnClick ( _target:string )
   {
      switch ( _target )
      {
         case GameBar.UIName.BTN_SPIN: {
            this.OnButtonSpinClick();
            break;
         }

         case GameBar.UIName.BTN_SPINSTOP: {
            this.OnButtonStopClick();
            break;
         }

         case GameBar.UIName.AUTOPLAY: {
            this.StartAutoPlay();
            break;
         }
      }
   }

   protected OnButtonSpinClick ()
   {
      if ( this.m_state.Current == BASE_SLOT_GAMEVIEW_STATE.IDLE )
      {
         this.m_state.Transit( BASE_SLOT_GAMEVIEW_STATE.SPIN_START );
      }
   }

   protected OnButtonStopClick ()
   {
      if ( this.m_baseModel.canChangeGameBarSpinState )
      {
         this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE;
      }
      //同時停止
      if ( isValid( this.m_baseFxPlayer.StopHard ) )
      {
         this.m_baseFxPlayer.StopHard();
      } else
      {
         this.m_baseSlotReel.StopHard();
      }
   }
   //---------------------------------------------------    
   protected GotoNextState ()
   {
      if ( this.m_awardNextStateArr.length > 0 )
      {
         let nextData: { toNextState: number, toNextWaitTime?: number, toNextCheckCB?: ( ...args: any[] ) => boolean, directFunc?: Function; };
         nextData = this.m_awardNextStateArr.shift();
         if ( nextData.toNextState == null )
         {
            if ( nextData.directFunc && typeof nextData.directFunc == "function" )
            {
               nextData.directFunc.call( nextData.directFunc );
            }
            this.GotoNextState();
         } else if ( isValid( nextData.toNextWaitTime ) && nextData.toNextWaitTime > 0 )
         {
            this.WaitToNextStateByTime( nextData.toNextWaitTime, nextData.toNextState );
         } else if ( isValid( nextData.toNextCheckCB ) )
         {
            this.WaitToNextStateByCheck( nextData.toNextCheckCB, nextData.toNextState );
         } else
         {
            this.m_state.Transit( nextData.toNextState );
         }
      } else
      {
         //結束囉 直接走SpinEnd
         this.SpinEnd();
      }
   }

   protected SpinEnd ()
   {
      this.SpinEndNecessary();
      this.SpinEndToNextState();
   }

   protected SpinEndNecessary ()
   {
      this.m_baseCommAdapter.OnOneSpinEnd( this.m_baseModel, this.LinesOfAKindMaxCount() );
   }

   protected WaitToNextStateByTime ( waitTime: number, nextState: number )
   {
      this.m_waitNextState = nextState;
      this.m_baseTimer.Start( waitTime );
      this.m_state.Transit( BASE_SLOT_GAMEVIEW_STATE.ONLY_WAIT_BY_TIME );
   }

   protected WaitToNextStateByCheck ( toNextCheckCB: ( ...args: any[] ) => boolean, nextState: number )
   {
      this.m_waitNextState = nextState;
      this.m_waitNextCheckCB = toNextCheckCB;
      this.m_state.Transit( BASE_SLOT_GAMEVIEW_STATE.ONLY_WAIT_BY_CHECK );
   }

   /**
    * 
    * @param nextState 
    * @param waitData 等待多久(毫秒)/func為True時 會進入 nextState
    */
   protected AddNextState ( nextState: number, waitData?: number | ( ( ...args: any[] ) => boolean ) )
   {
      if ( typeof waitData == "number" )
      {
         this.m_awardNextStateArr.push( {
            toNextState: nextState,
            toNextWaitTime: waitData
         } );
      } else if ( typeof waitData == "function" )
      {
         this.m_awardNextStateArr.push( {
            toNextState: nextState,
            toNextCheckCB: waitData
         } );
      } else
      {
         this.m_awardNextStateArr.push( { toNextState: nextState } );
      }
   }

   // 不用管下階段是誰，只要add，就是 時間到/或Func = true 時會呼叫 GotoNextState()
   protected AddGotoNextStateWaitData ( waitData: number | ( ( ...args: any[] ) => boolean ) )
   {
      this.AddNextState( BASE_SLOT_GAMEVIEW_STATE.ONLY_WAIT_GOTONEXTSTATE, waitData );
   }

   //會在呼叫gotoNextState時執行，並立刻執行下一個nextState
   protected AddStateCallback ( callback: Function )
   {
      this.m_awardNextStateArr.push( { toNextState: null, directFunc: callback } );
   }

   //----------------------------------------------
   protected BaseGameViewSpinReel ( isFirstModel: boolean )
   {
      if ( isValid( this.m_baseFxPlayer.SpinReel ) )
      {
         this.m_baseFxPlayer.SpinReel( isFirstModel );
      } else
      {
         this.m_baseSlotReel.SpinReel( isFirstModel );
      }
   }

   protected BaseGameViewIsPlateStopped (): boolean
   {
      return this.m_baseSlotReel.IsPlateStopped;
   }

   protected BaseGameViewStateLineAwardState (): boolean
   {
      return this.m_gamebarWinEffectEnd && this.m_baseTimer.ToBool();
   }

   protected BaseGameViewStateOnFeatureGameEndCallBack ()
   {
      EventDispatcher.Shared.Dispatch( EventDefine.Game.CURRENCY_UPDATE_BY_REWARD, this.m_gameBar.WinValue );
   }
   //----------------------------------------------
   protected OnSpinStartWinValueSkip ()
   {
      this.m_gameBar.WinValueSkip( this.m_baseModel.isInFeatureGame ? 0 : undefined );
   }
   protected OnReceiveSpinAckWinValueReset ()
   {
      if ( !this.m_baseModel.isInFeatureGame )
      {
         this.m_gameBar.WinValueReset();
      }
   }
   //-----------------------你可能會需要的複寫區---- 不需要super------------------------
   //資源全部載入完成
   protected OnResourceDidLoad () { }
   //取tick後會先執行此function
   protected OnUpdatePreBase ( dt: number ) { }

   //需要塞好接下來的表演    
   protected SetAwardNextStateArr ()
   {
      this.m_awardNextStateArr = [];
      // big win
      
      if ( GamesChief.SlotGame.TestBigWinType( this.m_gameBar.BetValue, this.m_baseModel.win ) != BigWinDefine.BigWinType.NONE )
      {
         this.AddNextState( BASE_SLOT_GAMEVIEW_STATE.EFFECT_BIG_WIN );
      }
      if ( this.m_baseModel.win.isGreaterThan( 0 ) )
      {
         this.AddNextState( BASE_SLOT_GAMEVIEW_STATE.EFFECT_LINE_AWARD );
      }
   }

   //每一個spin結束會呼叫 無論FG 或 MG
   protected SpinEndToNextState ()
   {
      this.m_state.Transit( BASE_SLOT_GAMEVIEW_STATE.IDLE );
   }
   //-----------------------你應該會用到的-直接呼叫-BaseGameView不會呼叫------------------------
   //確定觸發 featureGame ， 上鎖所有功能(返回大廳等)
   protected OnBaseStartEnterFeatureGame ()
   {
      this.m_baseCommAdapter.OnStartEnterFeatureGame();
   }
   //轉場景到featureGame，清除gameBar和隱藏win文字...等等  isFreeGame = true(FreeGame)  isFreeGame = false(BonusGame)
   protected OnBaseToFeatureGameChangeView ( isFreeGame: boolean )
   {
      if ( NumberUtils.ParseBigNumber( this.m_gameBar.WinValue ).isGreaterThan( 0 ) )
      {
         this.m_gameBar.WinValueSkip( 0 );
         this.m_gameBar.WinValue = 0;
      }
      if ( this.m_gameBar.SpinButtonState == GameBarDefine.SpinButtonState.CANCEL_AUTO
         || this.m_gameBar.SpinButtonState == GameBarDefine.SpinButtonState.CANCEL_AUTO_DISABLE )
      {
         if ( !this.m_baseModel.isControllableFG ) { this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE; }
      }
      if ( this.m_baseModel.isControllableFG )//FG可手動新版本遊戲
      {
         this.m_gameBar.RecordedAutoPlayRounds( this.m_isInitState );
         if ( this.m_isInitState && !this.m_isDeclareStage )
         {
            this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
            this.m_baseModel.isAutoPlay = true;
            this.m_isDeclareStage = false;
         }
      }
      this.m_baseCommAdapter.OnToFeatureGameChangeView( isFreeGame );
   }
   //確定離開 featureGame ， 解鎖功能(返回大廳等) isFreeGame = true(FreeGame)  isFreeGame = false(BonusGame)
   protected OnBaseFromFeatureGameChangeView ( isFreeGame: boolean )
   {
      this.m_baseCommAdapter.OnFromFeatureGameChangeView( isFreeGame );
      if ( this.m_baseModel.isControllableFG )//FG可手動新版本遊戲
      {
         this.m_gameBar.ApplyRecordedAutoPlayRounds();
         if ( this.m_gameBar.AutoPlayRounds > 0 )
         {
            this.StartAutoPlay();
         } else
         {
            this.StopAutoPlay();
         }
      }
   }

   protected FGControllable ()
   {
      if ( isValid( this.m_baseModel, true ) )
         this.m_baseModel.isControllableFG = true;
   }

   /**
    *  若入場時為宣告階段呼叫
    *  過場完成後旗標會關閉，之後不影響流程
    */
   protected IsInitStateNeedDeclare ()
   {
      this.m_isDeclareStage = true;
   }

   //----------------------------------------------------
   protected abstract RequestGameInfo (); //跟server拿第一包
   protected abstract SpinRequest (); //start Spin的請求 直接發送給server 含FG
   protected abstract LinesOfAKindMaxCount (): number; //五連線或六連線 需要發送event (若不需要event 則傳 0);
}
