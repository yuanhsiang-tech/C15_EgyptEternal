import { _decorator, log, Component, Vec3, isValid } from 'cc';
import GameBar from "../../../Script/Game/Platform/GameBar/GameBar";
import { GameBarDefine } from "../../../Script/Game/Platform/GameBar/GameBarDefine";
import { GameCommonCommand } from "../../../Script/Game/Common/GameCommonCommand";
import { EventDefine } from "../../../Script/Define/EventDefine";
import EgyptEternalMain from './EgyptEternalMain';
import { FreePlay, GamePlay, GamePlayType, MainGamePlay } from './EgyptEternalGamePlay';

import { EffectData, FRANKENSTEIN_G2U_PROTOCOL, EgyptEternalProtocol, PlateData } from './EgyptEternalProtocol';
import EgyptEternalDefine from './EgyptEternalDefine';
import EgyptEternalMgFgReel from './EgyptEternalMgFgReel';
import EgyptEternalEffectView from './EgyptEternalEffectView';
import { TimedBool } from 'db://assets/Stark/Utility/TimedBool';
import { StateManager } from 'db://assets/Stark/Utility/StateManager/StateManager';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import * as FKP from './frankenstein_pb';
import { EgyptEternalBind } from './EgyptEternalBind';
import { EgyptEternalModel } from './EgyptEternalModel';

const STATE = {
   INIT: 0,
   IDLE: 1,
   SPIN: 2,
   AWARD: 3,
   END: 4,
   GAME_PLAY_TRANSIT_LEAVE: 5,
   GAME_PLAY_TRANSIT_ENTER: 6,
};

const { ccclass, property } = _decorator;

@ccclass
export default class EgyptEternalGameView extends Component {
   private m_slotReel: EgyptEternalMgFgReel = null;

   private m_effectView: EgyptEternalEffectView = null;

   private m_bind: EgyptEternalBind = null;
   /** Model */
   private m_model: EgyptEternalModel = null;

   /**地bar */
   private m_gameBar: GameBar = null;

   /**EgyptEternalSlotMain */
   private m_main: EgyptEternalMain = null;

   private m_timedbool: TimedBool = new TimedBool();;

   private m_state: StateManager = null;
   get State(): StateManager { return this.m_state; };


   /**判斷音效資源是否載入完成 */
   private m_isInit: boolean = false;

   /**MainGamePlay */
   private m_mainGameplay: MainGamePlay = null;


   /**FreePlay */
   private m_freePlay: FreePlay = null;

   /**上一個gameplay為何 */
   private m_lastGameplay: GamePlay = null;

   /**現在的gameplay為何 */
   private m_currentGameplay: GamePlay = null;

   /**下一個gameplay為何 */
   private m_nextGameplay: GamePlay = null;

   /**斷線重連跳過進場表演用 */
   private m_isFeatureTransitSkip: boolean = false;




   /**記錄MainGame地bar剩餘次數用 */
   private m_mainGameRemainAutoplay: number = 0;

   /**是否為斷線重連 */
   private m_isReconnecting: boolean = false;



   /**解鎖進度條Bet */
   private m_unLockBet: number = 0;
   get UnLockBet() {
      return this.m_unLockBet;
   }

   /**一般BetValue */
   private m_mgBet: number = 0;

   /**平均BetValue */
   private m_averageBet: number = 0;

   private m_isBetBtnDisable: boolean = false;
   get IsBetBtnDisable() {
      return this.m_isBetBtnDisable;
   }

   private m_isInMg: boolean = false;

   /**是否正在播放開場動畫 */
   private m_isOpening: boolean = false;

   //=========================================================================================================
   onLoad() {
      this.m_state = new StateManager(STATE.INIT);
   }
   //=========================================================================================================
   protected onEnable(): void {
   }
   //=========================================================================================================
   protected onDisable(): void {
   }
   //=========================================================================================================
   /**GameView初始化 */
   public Init(main: EgyptEternalMain): void {
      this.m_gameBar = GamesChief.SlotGame.GameBar;
      this.m_main = main;

      this.m_timedbool.UseDT(true);

      this.InitParentNode();

      this.m_effectView.Init(this.m_main, this, this.m_gameBar);

      //Gameplay初始化
      this.m_mainGameplay = new MainGamePlay(this.m_bind);
      this.m_freePlay = new FreePlay(this.m_bind);

      this.m_lastGameplay = this.m_mainGameplay;

      //TODO Ide
      this.m_nextGameplay = this.m_mainGameplay;

      //GamesChief.SlotGame.GameBar.ApplyWinEffectSettingList( EgyptEternalDefine.MG_FG_WIN_EFFECT_SETTING );
   }

   /**初始化找一堆節點 */
   private InitParentNode() {
      this.m_slotReel = NodeUtils.GetUI(this.node, "Bg").getChildByName("Plate").getComponent(EgyptEternalMgFgReel);
      console.log("InitParentNode:", NodeUtils.GetUI(this.node, "Effect"), NodeUtils.GetUI(this.node, "Effect").getComponent(EgyptEternalEffectView));
      this.m_effectView = NodeUtils.GetUI(this.node, "Effect").getComponent(EgyptEternalEffectView);
   }
   public InitBind(bind: EgyptEternalBind) {
      this.m_bind = bind;
      this.m_model = bind.Model;
   }
   //=========================================================================================================
   public MainProcess(dt: number) {

      this.m_effectView.MainProcess(dt);

      let currentState = this.m_state.Tick();
      switch (currentState) {
         case STATE.IDLE:
            if (this.m_state.IsEntering) {
               this.m_timedbool.Clear();

               // 有選項的特殊遊戲可能要設計一個timeout再幫忙自動玩
               if (this.m_currentGameplay.IsFeatureGame) {

                  // if(this.m_currentGameplay.AutoplayTime == 0) {
                  //     this.StartSpin();
                  // } else if(this.m_gameBar.IsInAutoPlay() && !this.m_isStopAutoplay) {
                  //     this.m_timedbool.Start(this.m_currentGameplay.AutoplayTime);
                  // }

                  // if(this.m_gameBar.SpinButtonState != GameBarDefine.SpinButtonState.CANCEL_AUTO){
                  //     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE
                  // }
               }
               else {

                  if (this.m_lastGameplay.IsFeatureGame) {
                     EventDispatcher.Shared.Dispatch(EventDefine.Game.LEAVE_FEATURE_TO_MAIN_IDLE);
                  }
                  GamesChief.SlotGame.CheckAndUpdateBetList();
                  //MG Idle
                  EventDispatcher.Shared.Dispatch(EventDefine.Game.ENTER_IDLE);
               }

               //自動轉
               if (this.m_gameBar.IsInAutoPlay()) {

                  if (!this.m_currentGameplay.IsFeatureGame || this.m_currentGameplay.AutoplayTime == 0) {
                     this.m_gameBar.TakeAutoPlayRounds();
                     this.StartSpin();
                  }
                  else {
                     this.m_timedbool.Start(this.m_currentGameplay.AutoplayTime);
                  }
               }
               //手動轉
               else {
                  if (!this.m_currentGameplay.IsFeatureGame) {
                     this.m_gameBar.SetBetBtnEnable();
                     this.m_isBetBtnDisable = false;
                  }

                  if (!this.m_isOpening) {
                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.SPIN;
                  }
               }



            }
            //FG BG自動轉
            else if (this.m_currentGameplay.IsFeatureGame && this.m_timedbool.ToBool()) {
               this.m_gameBar.TakeAutoPlayRounds();
               this.StartSpin();
            }
            else {
               this.m_timedbool.Update(dt);

            }

            break;

         case STATE.SPIN: {
            if (this.m_state.IsEntering) {
               //在MG才清空地bar
               if (this.m_currentGameplay.GameType == GamePlayType.MAIN) {
                  this.m_gameBar.WinValueSkip(500);//延遲0.5秒Reset地bar
               }
               this.m_currentGameplay.StartSpin(
                  this.m_gameBar.BetValue,
                  this.m_gameBar.CheatType,
                  this.m_gameBar.IsFastMode(),
                  this.IsInTurboMode()
               );
               if (!this.m_gameBar.IsInAutoPlay()) {
                  this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP;
               }

               this.m_gameBar.SetBetBtnDisable();
               this.m_isBetBtnDisable = true;

               if (!this.m_currentGameplay.IsFeatureGame) {
                  EventDispatcher.Shared.Dispatch(EventDefine.Game.CURRENCY_UPDATE_BY_BET, this.m_gameBar.BetValue);
                  GamesChief.SlotGame.SetSaveBetValue(this.m_gameBar.BetValue);
                  EventDispatcher.Shared.Dispatch(EventDefine.Game.SPIN_START);
               }
            }


            //是否收到Spinack
            if (this.m_currentGameplay.IsSpinAckReceive()) {
               //NearWin按鈕判斷
               if (!this.m_gameBar.IsInAutoPlay()) {
                  if (this.m_effectView.IsNearWining) {
                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE;
                  }
               }

               //輪帶完全停止
               if (this.m_currentGameplay.IsPlateStop()) {
                  this.m_effectView.IsNearWining = false;
                  this.m_state.NextState(STATE.AWARD);
               }
            }
            break;
         }

         case STATE.AWARD: {
            if (this.m_state.IsEntering) {
               this.m_currentGameplay.StartAward(this.IsInTurboMode());
            }

            //線獎按鈕判斷
            if (!this.m_gameBar.IsInAutoPlay()) {
               if (this.m_effectView.HasLineAwards) {
                  this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE;
               }
            }

            if (this.m_currentGameplay.IsAwardEnd()) {

               this.m_state.NextState(STATE.END);
            }
            break;
         }

         case STATE.END: {
            if (this.m_state.IsEntering) {
               let nextGameType = this.m_currentGameplay.NextGamePlayType();
               let currentGameType = this.m_currentGameplay.GameType;

               if (currentGameType == GamePlayType.MAIN) {
                  let commonAck = this.m_mainGameplay.CommonSpinAck();
                  if (isValid(commonAck)) {
                     GamesChief.SlotGame.SubmitCommonSpinAck(commonAck);
                  }
               }

               //下階段!=此階段，代表要進特色遊戲
               if (nextGameType != this.m_currentGameplay.GameType) {
                  //指定下階段
                  if (nextGameType == GamePlayType.FREE) {
                     this.m_nextGameplay = this.m_freePlay;
                  }
                  else if (nextGameType == GamePlayType.MAIN) {
                     this.m_nextGameplay = this.m_mainGameplay;
                  }
                  //FG裡面中BG，跳過FG的TRANSIT_LEAVE
                  if ((currentGameType == GamePlayType.FREE && nextGameType == GamePlayType.BONUS)) {
                     this.m_state.NextState(STATE.GAME_PLAY_TRANSIT_ENTER);
                  }
                  else {
                     this.m_state.NextState(STATE.GAME_PLAY_TRANSIT_LEAVE);
                  }


               } else {
                  this.m_state.NextState(STATE.IDLE);
               }
            }
            break;
         }

         case STATE.GAME_PLAY_TRANSIT_LEAVE: {
            if (this.m_state.IsEntering) {
               //此階段離開表演
               this.m_currentGameplay.ShowLeave();

            }
            //此階段離開表演結束
            else if (this.m_currentGameplay.IsShowLeaveEnd()) {
               if (this.m_nextGameplay.GameType == GamePlayType.MAIN && (this.m_currentGameplay.GameType == GamePlayType.FREE || this.m_currentGameplay.GameType == GamePlayType.BONUS)) {
                  let common = this.m_currentGameplay.CommonSpinAck();
                  if (isValid(common)) {
                     GamesChief.SlotGame.SubmitCommonSpinAck(common);
                  }
               }
               this.m_state.NextState(STATE.GAME_PLAY_TRANSIT_ENTER);
            }
            break;
         }

         case STATE.GAME_PLAY_TRANSIT_ENTER: {
            if (this.m_state.IsEntering) {
               //若下階段是特色遊戲
               if (this.m_nextGameplay.IsFeatureGame) {
                  if (this.m_gameBar.IsInAutoPlay() && !this.m_isReconnecting) {
                     // 記下目前的剩餘自動玩
                     if (!this.m_currentGameplay.IsFeatureGame) {

                        this.m_mainGameRemainAutoplay = this.m_gameBar.AutoPlayRounds;
                     }

                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
                     this.m_gameBar.AutoPlayRounds = Number.POSITIVE_INFINITY;
                  }
               }
               //若下階段是MG
               else {
                  //把記下的自動玩次數還回去
                  if (this.m_mainGameRemainAutoplay != 0) {
                     this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
                     this.m_gameBar.AutoPlayRounds = this.m_mainGameRemainAutoplay;
                     this.m_mainGameRemainAutoplay = 0;
                  }
                  else {
                     this.m_gameBar.AutoPlayRounds = 0;
                  }

                  //離開 Feature Game 取得正確 BET
                  if (this.m_currentGameplay.IsFeatureGame) {
                     GamesChief.SlotGame.GameBar.BetValue = GamesChief.SlotGame.GetSavedBet();
                  }
               }

               //GamesChief.SlotGame.SetBackButtonEnabled(!this.m_nextGameplay.IsFeatureGame);
               //下階段進場表演
               this.m_nextGameplay.ShowEnter(this.m_gameBar.IsInAutoPlay(), this.m_isFeatureTransitSkip);
               this.m_gameBar.SetBetBtnDisable();
               this.m_isBetBtnDisable = true;

            }
            else if (this.m_nextGameplay.IsShowEnterEnd()) {
               this.m_isFeatureTransitSkip = false;
               this.m_isReconnecting = false;
               this.m_lastGameplay = this.m_currentGameplay;
               this.m_currentGameplay = this.m_nextGameplay;

               this.m_state.NextState(STATE.IDLE);
            }
            break;
         }
      }


   }
   //=========================================================================================================
   public StartSpin() {
      if (this.m_state.Current == STATE.IDLE) {
         if (this.m_currentGameplay.IsFeatureGame) {
            this.m_state.NextState(STATE.SPIN);
         }
         else if (GamesChief.SlotGame.CanBet(this.m_gameBar.BetValue)) {
            this.m_state.NextState(STATE.SPIN);
         }
         else {
            log("Cannot spin!");
            this.m_gameBar.StopAutoPlay();
            this.m_state.NextState(STATE.IDLE);
         }
      }
      else {
         log("非Idle狀態嘗試Spin");
         this.m_gameBar.StopAutoPlay();
         this.m_state.NextState(STATE.IDLE);
      }
   }
   //=========================================================================================================
   public OnCommand(type: number, content: Uint8Array) {
      // let type = cmd.Type();
      // let content: any = cmd.GetContent();
      //log("PigBankSlot OnCommand")
      //log(cmd)

      // if (this.m_gameInfoAckReciver.Receive(content, SpinAck)) {
      //    console.log("[KH]",this.m_gameInfoAckReciver.Data())
      //    this.m_gameView.OnSpinAck( this.m_gameInfoAckReciver.Data()[0] ); 
      //    this.m_spinReqLock = false;
      //    this.m_gameInfoAckReciver.Reset();
      // }
      // break; 

      let canSpin: boolean = true;
      switch (type) {
         case FRANKENSTEIN_G2U_PROTOCOL.GAME_INFO_ACK:
            canSpin = false;
            //GameinfoAck太長，要用以下方法接資料


            // console.log("[KH]",this.m_gameInfoAckReciver.Data())
            // let data = ProtoParse(content, FKP.GameInfoAckSchema)
            // log("[KH]",data)
            let data = EgyptEternalProtocol.GameInfoAck.FromProto(content)
            log("[KH]", data)
            this.OnGameInfoAck(data);
            // this.m_gameInfoAckReciver.Reset();

            // if ( this.m_gameInfoAckReciver.Receive(content, EgyptEternalProtocol.GameInfoAck) ){
            //    console.log("[KH]",this.m_gameInfoAckReciver.Data())
            //    this.OnGameInfoAck( this.m_gameInfoAckReciver.Data()[0] );
            //    this.m_gameInfoAckReciver.Reset();
            // }
            break;
         case GameCommonCommand.G2U.G2U_COMMON_COMMAND_BET_SETTING_ACK:
            this.m_main.OnBetInfoUpdate();
            if (this.m_state.Current == STATE.IDLE && this.m_currentGameplay.GameType == GamePlayType.MAIN) {
               GamesChief.SlotGame.CheckAndUpdateBetList();
            }
            break;
      }

      if (this.m_currentGameplay && canSpin) {
         this.m_currentGameplay.OnCommand(type, content);
      }

   }
   //=========================================================================================================
   // public OnTouchEvent ( event: EventTouch )
   // {
   //    let target: string = event.target.name;

   //    switch ( target )
   //    {
   //       case GameBar.UIName.BTN_SPIN:
   //          this.OnSpinBtnClick();
   //          break;
   //       case GameBar.UIName.BTN_AUTOSTOP: {
   //          // this.m_isInAutoPlay = true
   //          this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
   //          this.m_gameBar.TakeAutoPlayRounds();
   //          this.StartSpin();
   //          break;
   //       }
   //    }
   // }
   //=========================================================================================================
   public OnReelPanelTouchEvent() {
      switch (this.m_gameBar.SpinButtonState) {
         case GameBarDefine.SpinButtonState.SPIN:
            this.m_gameBar.PlaySpinBtnSound("Spin");
            this.StartSpin();
            break;
         case GameBarDefine.SpinButtonState.STOP:
            this.m_gameBar.PlaySpinBtnSound("Stop");
            this.OnStopBtnClick()
            break;
      }
   }
   //=========================================================================================================

   // public OnSpinBtnClick ( playSound: boolean = false )
   // {
   //    switch ( this.m_gameBar.SpinButtonState )
   //    {
   //       case GameBarDefine.SpinButtonState.SPIN:
   //          playSound && this.m_gameBar.PlaySpinBtnSound( "Spin" );
   //          this.StartSpin();
   //          break;
   //       case GameBarDefine.SpinButtonState.STOP:
   //          this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE;
   //          this.m_currentGameplay.OnStopBtnTouch();
   //          break;
   //       case GameBarDefine.SpinButtonState.CANCEL_AUTO:
   //          this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE;
   //          this.m_gameBar.StopAutoPlay();

   //          if ( this.m_state.Current == STATE.IDLE && this.m_currentGameplay.IsFeatureGame && this.m_timedbool.IsStarted() )
   //          {
   //             this.m_timedbool.Clear();
   //             this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.SPIN;
   //          }
   //          break;
   //    }
   // }

   public OnSpinBtnClick(playSound: boolean = false) {

      if (this.m_gameBar.IsInAutoPlay()) {
         this.m_gameBar.TakeAutoPlayRounds();
      }

      playSound && this.m_gameBar.PlaySpinBtnSound("Spin");
      // this.m_effectView.IsTouchSpinButton = true;
      this.StartSpin();
   }

   public OnStopBtnClick() {
      this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE;
      this.m_currentGameplay.IsStopHard();
   }
   //=========================================================================================================
   public MgRun() {
      log("EgyptEternalSlot: MgRun");
      this.m_currentGameplay = this.m_mainGameplay;
      this.m_effectView.MgShowEnter(this.m_isReconnecting);
      this.m_state.NextState(STATE.GAME_PLAY_TRANSIT_ENTER);
      EventDispatcher.Shared.Dispatch(EventDefine.Game.GAME_START);
      //TODO Ide
      //MG、FG輪帶初始化
      this.m_slotReel.GameInit(this.m_gameBar, this.m_effectView);
      this.m_slotReel.Init(null);
   }
   //=========================================================================================================
   /**判斷音效資源是否載入完成 */
   public IsInit(): boolean {
      return this.m_isInit;
   }
   //=========================================================================================================
   public IsResourceReady(): boolean {
      return true;
   }
   //=========================================================================================================
   private OnGameInfoAck(gameInfoAck: EgyptEternalProtocol.GameInfoAck) {
      log("EgyptEternal - OnGameInfoAck");
      log(gameInfoAck);


      this.GameInfoAckInitial(gameInfoAck);
      this.WhichState(gameInfoAck);
      if (gameInfoAck.spinState > EgyptEternalProtocol.EgyptEternalSpinStates.NONE &&
         gameInfoAck.spinState < EgyptEternalProtocol.EgyptEternalSpinStates.MAX) {
         GamesChief.SlotGame.ApplyReconnectGameInfo(gameInfoAck.jpSettingList, gameInfoAck.unlockInfoList);
      }

      // this.m_main.LoadAudioAsset( EgyptEternalDefine.AudioFilePath, () =>
      // {
      this.m_isInit = true;
      // } );
   }

   //=========================================================================================================
   /**GameInfoAck初始化 */
   GameInfoAckInitial(gameInfoAck: EgyptEternalProtocol.GameInfoAck) {
      this.m_effectView.IsInit = true;

      //GameBar共用設定
      this.m_gameBar.WinValue = 0;

      GamesChief.SlotGame.CheckAndUpdateBetList();
      if (gameInfoAck.bet > 0) {
         this.m_gameBar.ForceSetBetValue(gameInfoAck.bet);
      }
      else {
         this.m_gameBar.BetValue = GamesChief.SlotGame.GetSavedBet();
      }


      // this.m_gameBar.ApplyWinEffectSettingList(EgyptEternalDefine.WIN_EFFECT_SETTING);

      //MG、FG輪帶初始化
      this.m_slotReel.GameInit(this.m_gameBar, this.m_effectView);
      this.m_slotReel.Init(null);


      //設定JP數值
      let isFeatureGame: boolean = false;
      let bet: number = this.m_gameBar.BetValue;
      if (gameInfoAck.spinState > EgyptEternalProtocol.EgyptEternalSpinStates.NONE &&
         gameInfoAck.spinState < EgyptEternalProtocol.EgyptEternalSpinStates.MAX) {
         isFeatureGame = true;
         bet = gameInfoAck.bet;
      }

      //設定線圈等級
      this.m_effectView.SetPhaseLevel(gameInfoAck.phase);
      this.m_effectView.SetPhaseState();

      this.m_effectView.SetGameInfoJp(gameInfoAck, bet, isFeatureGame);
   }
   //=========================================================================================================
   /**判斷斷線重連在哪一個階段 */
   WhichState(gameInfoAck: EgyptEternalProtocol.GameInfoAck) {
      switch (gameInfoAck.spinState) {
         //是否在FG宣告
         case EgyptEternalProtocol.EgyptEternalSpinStates.FG_START: {
            log('---------FG START-----------');
            this.ReJoinFgDeclareData(gameInfoAck);
            break;
         }
         //是否在FG開始轉的過程中
         case EgyptEternalProtocol.EgyptEternalSpinStates.FG_SPIN: {
            log('---------FG SPIN-----------');
            this.ReJoinFgInSpinData(gameInfoAck);
            break;
         }
         //MG中
         default: {
            log('---------IN MG-----------');
            this.m_nextGameplay = this.m_mainGameplay;
            this.m_isInMg = true;
         }
      }
   }
   //=========================================================================================================




   //=========================================================================================================
   /**FG斷線重連需要資料(轉之前) */
   ReJoinFgDeclareData(gameInfoAck: EgyptEternalProtocol.GameInfoAck) {
      //一些共用設定
      this.m_currentGameplay = this.m_mainGameplay;
      this.m_nextGameplay = this.m_freePlay;
      this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
      this.m_gameBar.AutoPlayRounds = Number.POSITIVE_INFINITY;
      this.m_isReconnecting = true;
      //this.m_gameBar.ForceSetBetValue( gameInfoAck.bet );

      //設定MG盤面
      let mgPlate = gameInfoAck.mainPlate;
      this.SetMgPlateAndEffect(mgPlate);

      //設定轉數      
      this.m_effectView.RemainFreeRound = mgPlate.remainFreeRound;
      this.m_effectView.FgSpinned = 0;
   }
   //=========================================================================================================
   /**FG斷線重連需要資料(已開始轉) */
   ReJoinFgInSpinData(gameInfoAck: EgyptEternalProtocol.GameInfoAck) {
      //一些共用設定
      this.m_currentGameplay = this.m_freePlay;
      this.m_nextGameplay = this.m_freePlay;
      this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
      this.m_gameBar.AutoPlayRounds = Number.POSITIVE_INFINITY;
      this.m_isReconnecting = true;
      this.m_isFeatureTransitSkip = true;
      //this.m_gameBar.ForceSetBetValue( gameInfoAck.bet );

      //塞MG盤面 or FG盤面
      let fgPlate = gameInfoAck.lastPlate;//FG轉一半，一定是拿lastPlate的資料   
      this.SetMgPlateAndEffect(gameInfoAck.mainPlate);
      this.SetFgPlateAndEffect(fgPlate);


      //設定FG前幾轉總贏分
      this.m_effectView.FgTotalWin = gameInfoAck.currentFreeWin;
      this.m_gameBar.WinValue = gameInfoAck.currentFreeWin;

      //設定轉數      
      this.m_effectView.RemainFreeRound = fgPlate.remainFreeRound;
      this.m_effectView.FgSpinned = gameInfoAck.fgSpinned;
      this.m_effectView.TotalFreeRound = fgPlate.remainFreeRound + gameInfoAck.fgSpinned;
   }
   //=========================================================================================================

   /**塞MG盤面資料 + 表演層資料 */
   SetMgPlateAndEffect(plateData: EgyptEternalProtocol.PlateData): PlateData[][] {
      let newPlateData: PlateData[][] = [];
      let newEffectData: EffectData[][] = [];
      let isFirstReelHasFrank: boolean = false;
      let bonusCount: number = 0;
      for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
         newPlateData[i] = [];
         newEffectData[i] = [];
         for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
            newEffectData[i][j] = new EffectData();
            newPlateData[i][j] = new PlateData();
            newPlateData[i][j].symbolId = plateData.plate[i][j];
            newPlateData[i][j].jpType = plateData.coinValueList[i][j].jpType;
            newPlateData[i][j].coinValue = plateData.coinValueList[i][j].value;

            //第一行是否有科學怪人
            if (i == 0) {
               if (newPlateData[i][j].symbolId == EgyptEternalProtocol.Symbol.FRANK) {
                  isFirstReelHasFrank = true;
               }
            }
            if (newPlateData[i][j].symbolId == EgyptEternalProtocol.Symbol.GREEN_THUNDER_BALL) {
               bonusCount++;
            }
         }
      }

      this.m_effectView.MgFgPlate = newPlateData;
      this.m_effectView.MgPlate = newPlateData;
      this.m_effectView.MgFgEffectData = newEffectData;

      this.m_effectView.IsFirstReelHasFrank = isFirstReelHasFrank;

      this.m_slotReel.ForceSetData(newPlateData);
      return newPlateData;
   }

   /**塞MG盤面資料 + 表演層資料 */
   SetFgPlateAndEffect(plateData: EgyptEternalProtocol.PlateData): PlateData[][] {
      let newPlateData: PlateData[][] = [];
      let newEffectData: EffectData[][] = [];
      let isFirstReelHasFrank: boolean = false;
      let bonusCount: number = 0;
      for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
         newPlateData[i] = [];
         newEffectData[i] = [];
         for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
            newEffectData[i][j] = new EffectData();
            newPlateData[i][j] = new PlateData();
            newPlateData[i][j].symbolId = plateData.plate[i][j];
            newPlateData[i][j].jpType = plateData.coinValueList[i][j].jpType;
            newPlateData[i][j].coinValue = plateData.coinValueList[i][j].value;
         }
      }

      this.m_effectView.MgFgPlate = newPlateData;
      this.m_effectView.MgFgEffectData = newEffectData;

      this.m_effectView.IsFirstReelHasFrank = isFirstReelHasFrank;

      this.m_slotReel.ForceSetData(newPlateData);
      return newPlateData;
   }

   //=========================================================================================================
   public IsInTurboMode() {
      return EgyptEternalDefine.TURBO_ENABLE && this.m_gameBar.IsInAutoPlay() && !this.m_currentGameplay.IsFeatureGame;
   }
   //=========================================================================================================
   public IsInMGIdle() {
      if (this.m_state.Current == STATE.IDLE
         && this.m_currentGameplay == this.m_mainGameplay
         && !this.m_gameBar.IsInAutoPlay()) {
         return true;
      }
      return false;
   }
   //=========================================================================================================
   public IsBetChangeable() {
      return !this.m_currentGameplay?.IsFeatureGame && this.m_state.Current == STATE.IDLE;
   }

   /**
    * MG開場表演
    * @param HaltFalse 開啟禮包面板
    */
   public MgOpening(HaltFalse: Function) {
      //斷線重連不會有進場動畫
      if (this.m_isReconnecting) {
         HaltFalse();
         this.MgRun();
         this.m_effectView.IsInit = false;
      }
      else {
         this.m_isOpening = true;
         //TODO Ide
         if (this.m_gameBar) {
            this.m_gameBar.SetBetBtnDisable();
            GamesChief.SlotGame.BlockPlatformUI();
         }
         this.m_effectView.MgOpening(() => {
            GamesChief.SlotGame.UnblockPlatformUI();
            //this.m_gameBar.SpinButtonState = GameBarSpinButtonState.SPIN;      
            //this.m_gameBar.SetBetBtnEnable();
            this.m_isOpening = false;
            this.m_effectView.IsInit = false;
            this.MgRun();
         },
            () => {
               HaltFalse();
            });
      }
   }
}
