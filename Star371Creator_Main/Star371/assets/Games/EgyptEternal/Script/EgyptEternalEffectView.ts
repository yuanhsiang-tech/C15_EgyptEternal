import EgyptEternalMain from "./EgyptEternalMain";
import EgyptEternalGameView from "./EgyptEternalGameView";
import { _decorator, Vec3, log, instantiate, Node, tween, Component, sp, Prefab, isValid, v3, Label, Tween, ParticleSystem2D, Font, } from 'cc';
import { UITransform } from "cc";
import { UIOpacity } from "cc";
import { director } from "cc";
import GameBar, { BetLockChangeInfo, BetLockStatus } from "../../../Script/Game/Platform/GameBar/GameBar";
import JpRolling from "../../../Script/Game/Component/JpRolling";
import { EventDefine } from "../../../Script/Define/EventDefine";
import ProclaimButton from '../../../Script/Game/Component/ProclaimButton';
import { GameCommonCommand } from "../../../Script/Game/Common/GameCommonCommand";
import JpUnlockTip from "../../../Script/Game/Component/JpUnlockTip";
import EgyptEternalDefine from "./EgyptEternalDefine";
import { EffectData, EgyptEternalProtocol, PhaseType, PlateData } from "./EgyptEternalProtocol";
import EgyptEternalMgFgReel, { FASTER_SPIN_SETTING, TURBO_SPIN_SETTING } from "./EgyptEternalMgFgReel";
import { bezier } from "cc";
import { Director } from "cc";
import Touchable, { TouchableEvent } from "db://assets/Stark/Interactive/Touchable";
import { StateManager } from "db://assets/Stark/Utility/StateManager/StateManager";
import { TimedBool } from "db://assets/Stark/Utility/TimedBool";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import SlotColorFollow from "db://assets/Stark/Spine/SlotColorFollow";
import { RollingNumberLabel } from "db://assets/Stark/RollingNumber/RollingNumberLabel";
import { RollingEvent } from "db://assets/Stark/RollingNumber/RollingNumber";
import { Persist } from "db://assets/Script/Persist/Persist";
import { EgyptEternalBind } from "./EgyptEternalBind";

const { ccclass, property } = _decorator;

const EFFECT_ZORDER = 30;

const FLY_TIME: number = 0.4;
const EFFECT_DESTROY_TIME: number = 0.4;
const FLY_BALL_DESTROY_TIME: number = 0.5;


const STATE = {
   IDLE: 0,
   MG_FG_COLLECT: 1,
   MG_SHOW_SYMBOL_LINE_EFFECT: 2,

   BG_ENTER: 3,
   BG_COLLECT_COIN: 4,
   BG_COLLECT_THUNDER_BALL_AND_LEVELUP: 5,
   BG_FRANK_MOVE: 6,
   BG_LEAVE: 7,

   FG_ENTER: 8,
   FG_SHOW_SYMBOL_LINE_EFFECT: 9,
   FG_SHOW_ADD_SPINS: 10,
   FG_LEAVE: 11,
};

const JP_CURRENT_PANEL_STATE = {
   MINI_MINOR: 0,
   MAJOR_MEGA: 1
};

const JP_PANEL_ANI = {
   BET: "Bet",
   UNLOCK: "Unlock",
   SWITCH: "Switch",
   IDLE: "Idle"
};

const PROGRESS_LEVEL = {
   ZERO_ZERO: 0,
   ONE_ONE: 1,
   TWO_TWO: 2,
   THREE_THREE: 3,
   FOUR_FOUR: 4,
   FIVE_FIVE: 5,
}

const FLY_EFFECT = {
   COIN: 0,
   THUNDER_BALL: 1,
   SCATTER: 2,
}

export const STOP_SOUND_PRIORITY = {
   REEL_STOP: 0,
   COIN_OUT_RANGE: 1,
   FRANK: 2,
   SCATTER_AND_GREENBALL: 3,
   COIN_IN_RANGE: 4,
}

const LEVELUP_NEED_COUNT: number[] = [5, 4, 3] // 2x2 -> 3x3 需要蒐集五個雷電球,..以此類推
const LEVELUP_TOTAL_NEED_COUNT: number[] = [5, 9, 12];
const THUNDER_BALL_LEVEL_POS: Vec3[][] = [ //雷電球進度每個等級的位置
   [v3(-190, 0, 0), v3(-95, 0, 0), v3(0, 0, 0), v3(95, 0, 0), v3(190, 0, 0)],
   [v3(-175, 0, 0), v3(-60, 0, 0), v3(60, 0, 0), v3(175, 0, 0)],
   [v3(-140, 0, 0), v3(0, 0, 0), v3(140, 0, 0)],
]

const THUNDER_BALL_FLY_TIME: number = 0.5;//雷電球飛動畫時間
const BG_PLATE_HALF_WIDTH: number = 58;
const SIZE_SHIFT = 2 // 2是因為從2x2開始,但是電球的index是從0開始
const FRANK_HANDS_UP_DELAY_TIME: number = 0.2;

export class ReelStopSoundAttribute {
   path: string[] = [];
   priority: number[] = [];
}

@ccclass
export default class EgyptEternalEffectView extends Component {
   //#region scene property
   /**Bg節點 */
   @property({ type: Node, tooltip: "Bg節點" }) private m_nodeBg: Node = null;
   /**各symbol prefab */
   @property({ type: [Prefab], tooltip: "symbol prefab" }) private m_symblPrefab: Prefab[] = [];

   /**線獎特效框 */
   @property({ type: [sp.Skeleton], tooltip: "線獎特效框" }) private m_winFrame: sp.Skeleton[] = [];


   /**蒐集特效 */
   @property({ type: [Prefab], tooltip: "蒐集特效" }) private m_flyEffect: Prefab[] = [];

   /**高分Font */
   @property({ type: Font, tooltip: "高分Font" }) private m_highValueFont: Font = null;
   /**普通Font */
   @property({ type: Font, tooltip: "普通Font" }) private m_normalValueFont: Font = null;


   //#region getter, setter
   /**是否在Turbo模式 */
   private m_isTurbo: boolean = false;
   set Turbo(value: boolean) { this.m_isTurbo = value; }

   /**表演是否結束 */
   private m_isShowEnd: boolean = false;
   get IsShowEnd() { return this.m_isShowEnd; };

   /**是否有nearwin */
   private m_hasNearWin: boolean = false;
   get HasNearWin() {
      return this.m_hasNearWin;
   }
   set HasNearWin(hasNearWin: boolean) {
      this.m_hasNearWin = hasNearWin;
   }

   /**是否正在播NearWin */
   private m_isNearWining: boolean = false;
   get IsNearWining() {
      return this.m_isNearWining;
   }
   set IsNearWining(isNearWining: boolean) {
      this.m_isNearWining = isNearWining;
   }

   /**是否有線獎表演 */
   private m_hasLineAwards: boolean = false;
   get HasLineAwards() {
      return this.m_hasLineAwards;
   }

   /**MG、FG 盤面 */
   private m_mgFgPlate: PlateData[][] = [];
   get MgFgPlate() {
      return this.m_mgFgPlate;
   }
   set MgFgPlate(mgFgPlate: PlateData[][]) {
      this.m_mgFgPlate = mgFgPlate;
   }

   /**MG盤面 */
   private m_mgPlate: PlateData[][] = [];
   get MgPlate() {
      return this.m_mgPlate;
   }
   set MgPlate(mgPlate: PlateData[][]) {
      this.m_mgPlate = mgPlate;
   }

   /**FG盤面 */
   private m_fgPlate: PlateData[][] = [];
   get FgPlate() {
      return this.m_fgPlate;
   }
   set FgPlate(fgPlate: PlateData[][]) {
      this.m_fgPlate = fgPlate;
   }

   /**記錄MG表演節點資訊 */
   private m_mgFgEffectData: EffectData[][] = [];
   get MgFgEffectData() {
      return this.m_mgFgEffectData;
   }
   set MgFgEffectData(mgFgEffectData: EffectData[][]) {
      this.m_mgFgEffectData = mgFgEffectData;
   }

   /**EgyptEternalGameView */
   private m_slotGameView: EgyptEternalGameView = null;
   set GameView(gameview: EgyptEternalGameView) { this.m_slotGameView = gameview; }

   /**當局總贏分 */
   private m_thisRoundTotalWinValue: BigNumber = new BigNumber(0);
   get ThisRoundTotalWinValue() {
      return this.m_thisRoundTotalWinValue;
   }
   set ThisRoundTotalWinValue(totalLineWinValue: BigNumber) {
      this.m_thisRoundTotalWinValue = totalLineWinValue;
   }

   /**Free Game剩餘轉數 */
   private m_remainFreeRound: number = 0;
   get RemainFreeRound() {
      return this.m_remainFreeRound;
   }
   set RemainFreeRound(remain: number) {
      this.m_remainFreeRound = remain;
   }

   /**BonusGame剩餘轉數 */
   private m_remainBonusRound: number = 0;
   get RemainBonusRound() {
      return this.m_remainBonusRound;
   }
   set RemainBonusRound(remain: number) {
      this.m_remainBonusRound = remain;
   }

   /**FG總贏分 */
   private m_fgTotalWin: BigNumber = new BigNumber(0);
   get FgTotalWin() {
      return this.m_fgTotalWin;
   }
   set FgTotalWin(fgTotalWin: BigNumber) {
      this.m_fgTotalWin = fgTotalWin;
   }

   /**總共有幾個飛行特效要飛(順序:紫>綠) */
   private m_totalFlyCollectCount: number[] = [0, 0];
   get TotalFlyCollectCount() {
      return this.m_totalFlyCollectCount;
   }
   set TotalFlyCollectCount(count: number[]) {
      this.m_totalFlyCollectCount = count;
   }

   /**SpinAck */
   private m_spinAck: EgyptEternalProtocol.SpinAck = null;
   set SpinAck(spinAck: EgyptEternalProtocol.SpinAck) {
      this.m_spinAck = spinAck;
   }

   /** FrankensteinSlotMain*/
   private m_slotMain: EgyptEternalMain = null;
   set SlotMain(slotMain: EgyptEternalMain) {
      this.m_slotMain = slotMain;
   }


   /**地bar */
   private m_gameBar: GameBar = null;
   set GameBar(gameBar: GameBar) {
      this.m_gameBar = gameBar;
   }

   /**判斷是否只讓音效播放一次 */
   private m_playSoundOnce: boolean = false;
   get PlaySoundOnce() {
      return this.m_playSoundOnce;
   }
   set PlaySoundOnce(play: boolean) {
      this.m_playSoundOnce = play;
   }

   /**是否在FG內 */
   private m_isInFg: boolean = false;
   get IsInFg() {
      return this.m_isInFg;
   }
   set IsInFg(inFg: boolean) {
      this.m_isInFg = inFg;
   }

   /**第一輪是否有Frank */
   private m_isFirstReelHasFrank: boolean = false;
   get IsFirstReelHasFrank() {
      return this.m_isFirstReelHasFrank;
   }
   set IsFirstReelHasFrank(isFirst: boolean) {
      this.m_isFirstReelHasFrank = isFirst;
   }

   /**上一轉階段(順序:紫、綠) */
   private m_prePhase: number[] = [0, 0];
   get PrePhase() {
      return this.m_prePhase;
   }
   set PrePhase(phase: number[]) {
      this.m_prePhase = phase;
   }

   /**這一轉階段(順序:紫、綠) */
   private m_phase: number[] = [0, 0];
   get Phase() {
      return this.m_phase;
   }
   set Phase(phase: number[]) {
      this.m_phase = phase;
   }

   /**FG內是否加轉數 */
   private m_hasAddSpin: boolean = false;
   get HasAddSpin() {
      return this.m_hasAddSpin;
   }
   set HasAddSpin(hasAddSpin: boolean) {
      this.m_hasAddSpin = hasAddSpin;
   }


   /**FG總局數 */
   private m_totalFreeRound: number = 0;
   get TotalFreeRound() {
      return this.m_totalFreeRound;
   }
   set TotalFreeRound(total: number) {
      this.m_totalFreeRound = total;
   }

   /**FG已轉局數 */
   private m_fgSpinned: number = 0;
   get FgSpinned() {
      return this.m_fgSpinned;
   }
   set FgSpinned(fgSpinned: number) {
      this.m_fgSpinned = fgSpinned;
   }


   /**BG角色移動路徑 */
   private m_movePath: Vec3[] = [];
   get MovePath() {
      return this.m_movePath;
   }
   set MovePath(movePath: Vec3[]) {
      this.m_movePath = movePath;
   }

   /**科學怪人目前座標(只記錄左上角) */
   private m_frankNowPosition: Vec3 = new Vec3(0, 3, 0);
   set FrankNowPosition(pos: Vec3) {
      this.m_frankNowPosition = pos;
   }

   /**目前雷電球累積總數 */
   private m_nowElectricBallTotalCount: number = 0;
   set NowElectricBallTotalCount(count: number) {
      this.m_nowElectricBallTotalCount = count;
   }

   /**記錄JP是否上鎖 */
   private m_isJpLock: boolean[] = [false, false, false, false, false];
   get IsJpLock() {
      return this.m_isJpLock;
   }

   /**每輪要停輪的聲音路徑 */
   private m_reelStopSound: ReelStopSoundAttribute[] = [];
   get ReelStopSound() {
      return this.m_reelStopSound;
   }
   set ReelStopSound(sound: ReelStopSoundAttribute[]) {
      this.m_reelStopSound = sound;
   }

   /**是否初始化中 */
   private m_isInit: boolean = false;
   get IsInit() {
      return this.m_isInit;
   }
   set IsInit(isInit: boolean) {
      this.m_isInit = isInit;
   }

   /**是否有FG Scatter */
   private m_hasScatter: boolean = false;
   get HasScatter() {
      return this.m_hasScatter;
   }
   set HasScatter(hasScatter: boolean) {
      this.m_hasScatter = hasScatter;
   }

   /**是否有綠球 */
   private m_hasGreenBall: boolean = false;
   get HasGreenBall() {
      return this.m_hasGreenBall;
   }
   set HasGreenBall(hasGreenBall: boolean) {
      this.m_hasGreenBall = hasGreenBall;
   }

   /** 其他綁定的腳本 */
   private m_bind: EgyptEternalBind = null;
   //#region private property
   private m_state: StateManager = null;
   private m_timedbool: TimedBool = null;

   /**存放表演過的Symbol特效節點 */
   private m_effectNodes: Node[][] = [];

   /**是否跳過特色遊戲開場宣告 */
   private m_isSkipShowEnter: boolean = false;

   /**是否在自動玩模式 */
   private m_isAutoplay: boolean = false;

   /**nearwin音效播放id */
   private m_nearWinSoundId: number[] = [];

   /**線獎輪播函式 */
   private m_showAward: Function = null;

   /**symbol動畫節點池 */
   private m_effectPool: Node[][] = [];

   /**是否重置過JP數值 */
   private m_isJpAlreadyReset: boolean[] = [false, false, false, false, false];

   /**記錄當前蒐集了幾個飛行特效(順序:紫>綠) */
   private m_flyCollectCount: number[] = [0, 0];

   //各JP觸碰
   private m_majorTouch: Touchable = null;
   private m_megaTouch: Touchable = null;
   private m_grandTouch: Touchable = null;

   /**JP抽水金額 */
   private m_jpInfo: BigNumber[] = [];
   /**是否有重製jpsetting的值 */
   private m_isJpSettingAck: boolean = false;
   /**JP開放最低bet */
   private m_jpMinLimitBet: number[] = [];

   /**MG、FG盤面點擊 */
   private m_spinButtonPlate: Touchable = null;

   /**Symbol特效節點位置 */
   private m_symbolFx: Node = null;

   /**跑分是否結束 */
   private m_runscoreShowEnd: boolean = false;

   /**FG開場宣告Node */
   private m_fgDeclareNode: Node = null;

   /**FG加轉數宣告Node */
   private m_addSpinNode: Node = null;

   /**FG已轉局數Label */
   private m_fgSpinnedLabel: Label = null;

   /**FG總局數Label */
   private m_totalFreeLabel: Label = null;

   /**FG結算宣告節點 */
   private m_fgComplimentNode: Node = null;

   /**Scatter NearWin節點 */
   private m_scatterNearWinFx: Node[] = [];
   /**Bonus NearWin節點 */
   private m_bonusNearWinFx: Node[] = [];

   /**Phase Spine (順序:紫>綠) */
   private m_phaseSpine: sp.Skeleton[] = [];

   //JP相關
   /**Jp Label(解鎖) */
   private m_jpLabel: JpRolling[] = [];
   /**Jp Label(上鎖) */
   private m_jpLockLabel: Label[] = [];
   /**Jp Spine */
   private m_jpSpine: sp.Skeleton[] = [];

   /**Jp鎖頭 */
   private m_jpFront: sp.Skeleton[] = [];

   /**MG、FG盤面 */
   private m_mgFgReel: EgyptEternalMgFgReel = null;

   /**MG、FG科學怪人角色 */
   private m_mgFgFrank: sp.Skeleton = null;

   /**輪帶提示轉出電球動畫(順序:紫>綠) */
   private m_fxReelSpine: sp.Skeleton[] = [];

   /**進場動畫 */
   private m_gameIntro: sp.Skeleton = null;
   /**進場動畫跳過按鈕 */
   private m_introSkip: Node = null;
   /**記錄進場動畫音效 */
   private m_introSoundKey: number = -1;
   /**記錄進場動畫 TrackEntry */
   private m_introTrackEntry: sp.spine.TrackEntry = null;


   /**背景Spine */
   private m_background: sp.Skeleton = null;

   /**盤面Spine */
   private m_reelSpine: sp.Skeleton = null;

   /**建Symbol動畫時隱藏的靜態圖Symbol */
   private m_hideSymbols: Node[] = [];
   /**建Symbol動畫時隱藏的靜態圖特殊Symbol(Scatter、綠球等等) */
   private m_hideSpecialSymbols: Node[] = [];

   /**蒐集面板上的五個電球 */
   private m_electricBallProgressSke: sp.Skeleton[] = [];
   /**蒐集面板上的五個電球位置 */
   private m_electricBallProgressPos: Vec3[] = [];
   /**蒐集面板上的五個電球複製節點 */
   private m_electricBallProgressCopyNode: Node[] = [];
   /**蒐集面板上升等時飛行的綠球 */
   private m_greenBallFly: sp.Skeleton = null;

   /**蒐集面板上進度條 */
   private m_NXNprogressBar: sp.Skeleton[] = [];
   /**蒐集面板上進度條位置 */
   private m_NXNprogressBarPos: Vec3[] = [];

   /**目前是否停止JP */
   private m_isPauseJp: boolean = false;


   /**記錄需要被蒐集的硬幣資訊 */
   private m_waitCollectCoin: EffectData[] = [];
   /**記錄需要被蒐集的雷電球資訊 */
   private m_waitCollectThunderBall: EffectData[] = [];

   /**JP結算宣告節點 */
   private m_jpComplimentNode: Node = null;

   /**MG預兆 */
   private m_mgOmen: sp.Skeleton = null;

   /**phase觸碰 */
   private m_phaseTouch: Touchable[] = [];

   /**宣告音效key */
   private m_declareSoundKey: number = -1;

   /**上一次結束時的reel文字 */
   private m_txtTween: Tween<any> = null;

   private m_turnNow: boolean = false;

   private m_isCollectEnd: boolean[] = [false, false];
   //===========================================================================================================//
   public Init(slotMain: EgyptEternalMain, gameview: EgyptEternalGameView, gamebar: GameBar) {
      this.enabled = true;
      this.m_timedbool = new TimedBool();
      this.m_timedbool.UseDT(true);

      this.m_state = new StateManager(STATE.IDLE);
      this.m_slotMain = slotMain;
      this.m_slotGameView = gameview;
      this.m_gameBar = gamebar;

      this.InitParentNode();

      //背景設定
      this.SetBackground("MG");
   }

   /**初始化一堆節點 */
   private InitParentNode() {
      //進場動畫相關
      this.m_gameIntro = this.node.getChildByName("S_GameIntro").getComponent(sp.Skeleton);
      this.m_introSkip = this.node.getChildByName("Button_Skip");

      //背景Spine
      this.m_background = this.m_nodeBg.getChildByName("S_Bg").getComponent(sp.Skeleton);

      //盤面點擊
      this.m_spinButtonPlate = this.m_nodeBg.getChildByName("Node_MG_FG_Reel").getChildByName("mgFgPlateTouch").getComponent(Touchable);


   }

   public InitBind(bind: EgyptEternalBind) {
      this.m_bind = bind;
   }



   protected onDestroy(): void {
      this.DestroyPoolNode();
   }

   protected onEnable(): void {
      EventDispatcher.Shared.On(EventDefine.Game.BAR_BET_VALUE_CHANGED, this.OnBetChange, this);
      EventDispatcher.Shared.On(EventDefine.Game.BET_UP_STATUS_CHANGED, this.UpdateJpLockDisplay, this);
      EventDispatcher.Shared.On(EventDefine.Game.BET_INFO_UPDATE_APPLY, this.OnGameBarBetInfoUpdate, this);


   }
   protected onDisable(): void {
      this.m_phaseTouch?.[PhaseType.PURPLE]?.node && this.m_phaseTouch[PhaseType.PURPLE]?.node.off(TouchableEvent.Clicked, this.PurplePhaseTouchEvent, this);
      this.m_phaseTouch?.[PhaseType.GREEN]?.node && this.m_phaseTouch[PhaseType.GREEN]?.node.off(TouchableEvent.Clicked, this.GreenPhaseTouchEvent, this);

      EventDispatcher.Shared.Off(EventDefine.Game.BAR_BET_VALUE_CHANGED, this.OnBetChange, this);
      EventDispatcher.Shared.Off(EventDefine.Game.BET_UP_STATUS_CHANGED, this.UpdateJpLockDisplay, this);
      EventDispatcher.Shared.Off(EventDefine.Game.BET_INFO_UPDATE_APPLY, this.OnGameBarBetInfoUpdate, this);

      this.m_majorTouch?.node && this.m_majorTouch?.node.off(TouchableEvent.Clicked, this.ForceUnlockMajor, this);
      this.m_megaTouch?.node && this.m_megaTouch?.node.off(TouchableEvent.Clicked, this.ForceUnlockMega, this);
      this.m_grandTouch?.node && this.m_grandTouch?.node.off(TouchableEvent.Clicked, this.ForceUnlockGrand, this);

      this.m_spinButtonPlate?.node && this.m_spinButtonPlate?.node.off(TouchableEvent.Clicked, this.OnReelPanelTouchEvent, this);
   }
   //#region StateManager
   public MainProcess(dt: number) {

      let currentState = this.m_state.Tick();
      this.m_timedbool.Update(dt);


      switch (currentState) {
         //#region MainGame State
         case STATE.IDLE: {
            if (this.m_state.IsEntering) {
               log("EFFECTVIEW : STATE.IDLE");
               this.m_isShowEnd = true;
            }

            break;
         }

         case STATE.MG_FG_COLLECT: {
            if (this.m_state.IsEntering) {
               log("EFFECTVIEW : STATE.MG_COLLECT");
               if (this.m_hasScatter || this.m_hasGreenBall) {
                  this.ShowFly(() => {
                     this.ShowPhaseAni()
                  });
               }
               else {
                  this.m_isCollectEnd[PhaseType.PURPLE] = true;
                  this.m_isCollectEnd[PhaseType.GREEN] = true;
               }
            }
            else if (this.m_isCollectEnd[PhaseType.PURPLE] && this.m_isCollectEnd[PhaseType.GREEN]) {
               this.m_isCollectEnd = [false, false];
               if (this.m_isInFg) {
                  this.m_state.NextState(STATE.FG_SHOW_SYMBOL_LINE_EFFECT);
               }
               else {
                  this.m_state.NextState(STATE.MG_SHOW_SYMBOL_LINE_EFFECT);
               }
            }
            break;
         }

         case STATE.MG_SHOW_SYMBOL_LINE_EFFECT: {
            if (this.m_state.IsEntering) {
               log("EFFECTVIEW : STATE.MG_SHOW_SYMBOL_LINE_EFFECT")

               //表示該局有贏分
               if (this.m_spinAck.plateData.plateWin.gt(0)) {
                  this.FiveLine();
                  this.ShowSymbolLine();

                  this.ShowRunScore(
                     false,
                     () => {
                        this.m_runscoreShowEnd = true;
                     }
                  );
               }
               else {
                  this.m_runscoreShowEnd = true;
               }
            }
            else {
               if (this.m_runscoreShowEnd) {
                  this.m_runscoreShowEnd = false;

                  if (this.m_isTurbo && this.m_spinAck.plateData.plateWin.gt(0)) {
                     tween(this.node)
                        .delay(1)
                        .call(() => {
                           this.m_state.NextState(STATE.IDLE);
                        })
                        .start()
                  }
                  else {
                     let delayTime = this.m_isFirstReelHasFrank ? 0.7 : 0.3;
                     this.scheduleOnce(() => {
                        this.m_state.NextState(STATE.IDLE);
                     }, delayTime)
                  }
               }
            }
            break;
         }

         //#region FreeGame State
         case STATE.FG_ENTER: {
            if (this.m_state.IsEntering) {
               log("EFFECTVIEW : STATE.FG_ENTER");

               this.m_isInFg = true;
               this.ShowSymbolLineControl(false);

               this.ShowFgStart(() => {
                  if (this.m_isSkipShowEnter) {
                     this.m_isSkipShowEnter = false;
                     this.m_state.NextState(STATE.IDLE);
                  }
                  else {
                     this.m_state.NextState(STATE.IDLE);
                  }
               })
            }
            break;
         }


         case STATE.FG_SHOW_SYMBOL_LINE_EFFECT: {

            if (this.m_state.IsEntering) {
               log("EFFECTVIEW : STATE.FG_SHOW_SYMBOL_LINE_EFFECT")

               //表示該局有贏分
               if (this.m_spinAck.plateData.plateWin.gt(0)) {
                  this.FiveLine();
                  this.ShowSymbolLine();

                  this.ShowRunScore(
                     true,
                     () => {
                        this.m_runscoreShowEnd = true;
                     }
                  );
               }
               else {
                  this.m_runscoreShowEnd = true;
               }
            }
            else {
               if (this.m_runscoreShowEnd) {
                  this.m_runscoreShowEnd = false;

                  if (this.m_isTurbo && this.m_spinAck.plateData.plateWin.gt(0)) {
                     tween(this.node)
                        .delay(1)
                        .call(() => {
                           if (this.m_hasAddSpin) {
                              this.m_state.NextState(STATE.FG_SHOW_ADD_SPINS);
                           }
                           else {
                              this.m_state.NextState(STATE.IDLE);
                           }
                        })
                        .start()
                  }
                  else {
                     if (this.m_hasAddSpin) {
                        this.m_state.NextState(STATE.FG_SHOW_ADD_SPINS);
                     }
                     else {
                        let delayTime = this.m_isFirstReelHasFrank ? 0.7 : 0.3;
                        this.scheduleOnce(() => {
                           this.m_state.NextState(STATE.IDLE);
                        }, delayTime)
                     }
                  }
               }
            }
            break;
         }

         case STATE.FG_SHOW_ADD_SPINS: {
            if (this.m_state.IsEntering) {
               log("EFFECTVIEW : STATE.FG_SHOW_ADD_SPINS")

               this.ShowPhaseWin(() => {
                  this.ShowFrankWin(() => {
                     this.ShowAddSpins(() => {
                        this.scheduleOnce(() => {
                           this.m_state.NextState(STATE.IDLE);
                        }, 0.5)
                     })
                  })
               })
            }
            break;
         }

         case STATE.FG_LEAVE: {
            if (this.m_state.IsEntering) {
               log("EFFECTVIEW : STATE.FG_LEAVE");

               this.m_isInFg = false;

               this.ShowFgLeave(() => {
                  this.m_state.NextState(STATE.IDLE);
               })

            }
            break;
         }
      }
   }


   /**Main Game 蒐集表演 */
   public MgShowCollect(isTurbo: boolean = false) {
      this.m_isShowEnd = false;
      this.m_isTurbo = isTurbo;
      this.m_state.NextState(STATE.MG_FG_COLLECT);
   }

   /**Main Game 進場表演(切回MG時表演) */
   public MgShowEnter(isReconnecting: boolean = false): void {
      this.TurnOnReelTxt();

      this.m_spinButtonPlate.node.active = true;

      GamesChief.SlotGame.GameAudio.PlaySceneBGM(EgyptEternalDefine.AudioFilePath.MG_BGM);
   }

   /**跑分動畫與音效
    * @param isInFg 是否在FG
    * @param gotoNextState 跳下一個階段
    */
   private ShowRunScore(isInFg: boolean, gotoNextState: Function) {
      this.m_hasLineAwards = true;
      //只有MG有Turbo   
      if (this.m_isTurbo && !isInFg) {
         this.m_gameBar.WinValue = this.m_thisRoundTotalWinValue;

         tween(this.node)
            .delay(0.3)
            .call(() => {
               GamesChief.SlotGame.DeclareBigWin(this.m_gameBar.BetValue, this.m_thisRoundTotalWinValue, () => {
                  EventDispatcher.Shared.Dispatch(EventDefine.Game.CURRENCY_UPDATE_BY_REWARD, this.m_thisRoundTotalWinValue);
                  gotoNextState();
               })
            })
            .start()
      }
      //MG、FG一般流程
      else {
         GamesChief.SlotGame.ShowNormalWin(this.m_gameBar.WinValue.plus(this.m_thisRoundTotalWinValue), () => {
            GamesChief.SlotGame.DeclareBigWin(this.m_gameBar.BetValue, this.m_thisRoundTotalWinValue, () => {
               //在FG內不更新財產   
               if (!isInFg) {
                  EventDispatcher.Shared.Dispatch(EventDefine.Game.CURRENCY_UPDATE_BY_REWARD, this.m_thisRoundTotalWinValue);
               }
               gotoNextState();
            })
         })
      }
   }

   /**線獎表演 */
   private ShowSymbolLine() {
      //面板壓黑
      //this.m_mgPlateMask.active = true;

      GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.SYMBOL_AWARD);

      //線獎表演
      let ackPlate = this.m_mgFgPlate;

      let awardSymbol: number[] = [];
      let awardLength: number[] = [];
      let awardLineIndex: number[] = [];
      for (let i = 0; i < this.m_spinAck.plateData.lineAwardList.length; i++) {
         awardSymbol[i] = this.m_spinAck.plateData.lineAwardList[i].symbol;
         awardLength[i] = this.m_spinAck.plateData.lineAwardList[i].conn;
         awardLineIndex[i] = this.m_spinAck.plateData.lineAwardList[i].line;
      }

      //計算得獎symbol的index
      let awardIndexI: number[][] = []; //得獎symbol的Index i
      let awardIndexJ: number[][] = []; //得獎symbol的Index j

      //先開0的位置(存全部)
      awardIndexI[0] = [];
      awardIndexJ[0] = [];

      //紀錄表演symbol位置
      let isShowLineAward: boolean[][] = [];

      //記錄得獎位置
      let totalRow: number = 0;
      for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
         isShowLineAward[i] = [];
         for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
            isShowLineAward[i][j] = false;
         }
      }

      //若該symbol要表演，則該位置=true
      for (let k = 0; k < awardLength.length; k++) {
         awardIndexI[k + 1] = [];
         awardIndexJ[k + 1] = [];
         for (let i = 0; i < awardLength[k]; i++) {
            let lineIndex = awardLineIndex[k];
            let j = EgyptEternalDefine.LINE_TABLE_30[lineIndex][i];

            //plate[i][j]的格子一定會連線
            awardIndexI[k + 1].push(i);
            awardIndexJ[k + 1].push(j);
            isShowLineAward[i][j] = true;
         }
      }

      //回填到awardIndex
      for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
         for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
            if (isShowLineAward[i][j]) {
               awardIndexI[0].push(i);
               awardIndexJ[0].push(j);
            }
         }
      }

      log(awardIndexI);
      log(awardIndexJ);


      //線獎輪播
      let nowDisplayIndex = 0; //從全部開始播
      let isPlaySound: boolean = false;
      this.m_showAward = () => {
         //丟回節點池
         for (let i = 0; i < this.m_effectNodes.length; i++) {
            let len = this.m_effectNodes[i].length;
            for (let j = 0; j < len; j++) {
               if (i == EgyptEternalProtocol.Symbol.SCATTER) {
                  continue;
               }
               let node = this.m_effectNodes[i].pop()
               node.getComponent(UIOpacity).opacity = 255;
               let ske: sp.Skeleton = NodeUtils.GetUI(node, "Spine").getComponent(sp.Skeleton);
               ske.clearTracks();
               ske.setToSetupPose();

               node.removeFromParent();
               node.active = false;
               this.m_effectPool[i].push(node);
            }
         }

         //打開Symbol靜態圖
         if (this.m_hideSymbols.length > 0) {
            for (let symbol of this.m_hideSymbols) {
               symbol.active = true;
            }
            this.m_hideSymbols = [];
         }

         //先把所有線獎框關掉
         for (let i = 0; i < this.m_winFrame.length; i++) {
            if (this.m_winFrame[i].node.active) {
               this.m_winFrame[i].node.active = false;
            }
         }


         //Symbol表演 
         for (let i = 0; i < awardIndexI[nowDisplayIndex].length; i++) {
            let column = awardIndexI[nowDisplayIndex][i];
            let row = awardIndexJ[nowDisplayIndex][i];
            let winFrameIndex = column * 3 + row;

            //線獎框表演
            this.m_winFrame[winFrameIndex].node.active = true;
            this.m_winFrame[winFrameIndex].setAnimation(0, "Loop", true);

            if (ackPlate[column][row].symbolId >= EgyptEternalProtocol.Symbol.WILD) {
               this.CreateSymbolEffectAndPlayForMainGamePanel(
                  ackPlate[column][row].symbolId,
                  column,
                  row,
                  ackPlate[column][row].coinValue,
                  ackPlate[column][row].jpType,
                  false,
                  false,
               );
            }
         }

         nowDisplayIndex = (nowDisplayIndex + 1) % awardIndexI.length;
      }
      this.m_showAward();
      this.ShowSymbolLineControl(true);
   }

   /**線獎輪播開關
    * @param isSchedule 是否開啟
   */
   private ShowSymbolLineControl(isSchedule: boolean) {
      if (isSchedule) {
         this.schedule(this.m_showAward, 3);
      }
      else {
         this.unschedule(this.m_showAward);
      }
   }

   /**Free Game 進場表演 */
   public FgShowEnter(isAutoplay: boolean, isSkip: boolean): void {
      this.m_spinButtonPlate.node.active = true;

      this.m_isAutoplay = isAutoplay;
      this.m_isShowEnd = false;
      this.m_isSkipShowEnter = isSkip;

      //表示BG回FG，要跳過進場表演
      if (this.m_isInFg) {
         //this.TurnOnReelTxt();
         this.m_state.NextState(STATE.IDLE);
      }
      //普通FG流程
      else {
         this.TurnOffReelTxt();
         this.m_state.NextState(STATE.FG_ENTER);
      }

   }

   /**Free Game 結算表演 */
   public FgShowLeave(): void {
      this.m_isShowEnd = false;
      this.m_state.NextState(STATE.FG_LEAVE);
   }


   /**Free Game 蒐集表演 */
   public FgShowCollect(): void {
      this.m_isShowEnd = false;
      this.m_state.NextState(STATE.MG_FG_COLLECT);
   }


   /**清除所有動畫 */
   public ClearAllEffect() {
      for (let symbol of this.m_hideSymbols) {
         symbol.active = true;
      }
      this.m_hideSymbols = [];

      for (let symbol of this.m_hideSpecialSymbols) {
         symbol.active = true;
      }
      this.m_hideSpecialSymbols = [];

      for (let i = 0; i < this.m_winFrame.length; i++) {
         if (this.m_winFrame[i].node.active) {
            this.m_winFrame[i].node.active = false;
         }
      }

      //丟回節點池
      for (let i = 0; i < this.m_effectNodes.length; i++) {
         let len = this.m_effectNodes[i].length;
         for (let j = 0; j < len; j++) {
            let node = this.m_effectNodes[i].pop()
            if (isValid(node.getComponent(UIOpacity))) {
               node.getComponent(UIOpacity).opacity = 255;
            }

            let ske: sp.Skeleton = NodeUtils.GetUI(node, "Spine").getComponent(sp.Skeleton);
            ske.clearTracks();
            ske.setToSetupPose();

            if (i == EgyptEternalProtocol.Symbol.SCATTER) {
               let flyEffect = node.getChildByName("FX_Fly_P");
               flyEffect.getComponent(UIOpacity).opacity = 0;
               flyEffect.active = false;
            }

            node.removeFromParent();
            node.active = false;
            this.m_effectPool[i].push(node);
         }
      }

      this.ShowSymbolLineControl(false);
   }

   /**清除一個Symbol特效, */
   private ClearOneSymbolEffect(node: Node, symbolId: number) {
      if (isValid(node.getComponent(UIOpacity))) {
         node.getComponent(UIOpacity).opacity = 255;
      }

      let ske: sp.Skeleton = NodeUtils.GetUI(node, "Spine").getComponent(sp.Skeleton);
      ske.clearTracks();
      ske.setToSetupPose();
      node.removeFromParent();
      node.active = false;
      this.m_effectPool[symbolId].push(node);
   }

   private DestroyPoolNode() {
      for (let i = 0; i < this.m_effectPool.length; i++) {
         for (let j = 0; j < this.m_effectPool[i].length; j++) {
            if (isValid(this.m_effectPool[i][j])) {
               this.m_effectPool[i][j].destroy();
            }
         }
      }

      for (let i = 0; i < this.m_effectNodes.length; i++) {
         for (let j = 0; j < this.m_effectNodes[i].length; j++) {
            if (isValid(this.m_effectNodes[i][j])) {
               this.m_effectNodes[i][j].destroy();
            }
         }
      }
   }

   /**一般輪帶停輪時Scatter表演 */
   public ReelStopEffect(reelIndex: number) {
      // Scatter停輪表演      
      for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
         let symbolId: number = this.MgFgPlate[reelIndex][j].symbolId;
         let type: number = this.MgFgPlate[reelIndex][j].jpType;

         if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
            //輪帶提示轉出電球動畫
            this.ShowReelHintAni(symbolId);

            this.CreateSymbolEffectAndPlayForMainGamePanel(
               symbolId,
               reelIndex,
               j,
               this.MgFgPlate[reelIndex][j].coinValue,
               this.MgFgPlate[reelIndex][j].jpType,
               false,
               false
            );
         }
      }

      if ((this.m_isTurbo || this.m_mgFgReel.IsHardStop) && !this.m_isNearWining) {
         if (!this.m_playSoundOnce) {
            this.m_playSoundOnce = true;
            let playSound: boolean[] = [false, false]
            let playPath: string[] = [EgyptEternalDefine.AudioFilePath.REEL_STOP, EgyptEternalDefine.AudioFilePath.SCATTER_STOP];

            for (let i = reelIndex; i < this.m_reelStopSound.length; i++) {
               for (let j = 0; j < this.m_reelStopSound[i].path.length; j++) {
                  let index: number = playPath.indexOf(this.m_reelStopSound[i].path[j]);
                  if (index != -1) {
                     playSound[index] = true;
                  }
               }
            }
            for (let i = 0; i < playSound.length; i++) {
               if (playSound[i]) {
                  GamesChief.SlotGame.GameAudio.Play(playPath[i]);
               }
            }
         }
      }
      else {
         if (this.m_reelStopSound[reelIndex].path.length > 0) {
            for (let i = 0; i < this.m_reelStopSound[reelIndex].path.length; i++) {
               GamesChief.SlotGame.GameAudio.Play(this.m_reelStopSound[reelIndex].path[i]);
            }
         }
         else {
            GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.REEL_STOP);
         }
      }
   }

   /**表演蒐集特效 */
   private ShowFly(flyCb: Function) {
      let playSoundOnce: boolean = false;
      for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
         for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
            let symbolId: number = this.m_mgFgPlate[i][j].symbolId;
            if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
               //再建一個symbol特效蓋在上面(只拿來飛)
               let effNode: Node = null;
               if (this.m_effectPool[symbolId].length > 0) {
                  effNode = this.m_effectPool[symbolId].pop();
               }
               else {
                  effNode = instantiate(this.m_symblPrefab[symbolId]);
               }

               this.node.addChild(effNode);
               //設定位置,動畫
               effNode.setPosition(this.m_mgFgEffectData[i][j].node.getPosition());
               effNode.active = true;
               let effSke: sp.Skeleton = NodeUtils.GetUI(effNode, "Spine").getComponent(sp.Skeleton);
               let hitAni: string = "";
               let flyEffect: Node = null;//飛行物特效(拖尾效果)

               if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
                  effSke.setAnimation(0, "Fly_Loop", true);
                  hitAni = "Hit";
                  flyEffect = NodeUtils.GetUI(effNode, "FX_Fly_P");
               }


               //計算起點與終點
               let startPos: Vec3 = this.TransformSymbolPosition(this.m_mgFgReel.GetSymbolNode(i, j));
               let endNode: Node = null;
               //終點位置
               let endPosBiasX: number = 0;
               let endPosBiasY: number = 0;
               if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
                  endNode = this.m_phaseSpine[PhaseType.PURPLE].node.getChildByName("Touch");
                  endPosBiasX = 20;
                  endPosBiasY = 60;
               }
               let endPos: Vec3 = this.TransformSymbolPosition(endNode);
               endPos.x = endPos.x + endPosBiasX;
               endPos.y = endPos.y + endPosBiasY;
               let randomBezier = this.GetRandomBezier(startPos.clone(), endPos.clone());

               tween(effNode)
                  .parallel(
                     tween().to(FLY_TIME, { position: endPos }, {
                        onUpdate: (target: Node, ratio) => {
                           let x = bezier(startPos.x, randomBezier[0].x, randomBezier[0].x, endPos.x, ratio);
                           let y = bezier(startPos.y, randomBezier[0].y, randomBezier[0].y, endPos.y, ratio);
                           target.setPosition(v3(x, y));
                           //effNode.setPosition( v3( x, y ) );
                           //effNode.setScale(1 - ratio , 1 - ratio);
                        }
                     }),
                     tween().call(() => {
                        flyEffect.active = true;
                        flyEffect.children[0].getComponent(ParticleSystem2D).resetSystem();
                        //延後一針再顯示粒子特效(用意是等粒子消除完畢)
                        this.scheduleOnce(() => {
                           flyEffect.getComponent(UIOpacity).opacity = 255;
                        }, 0.2)
                        if (!playSoundOnce) {
                           playSoundOnce = true;
                           //GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_COLLECT);
                        }
                     })
                  )

                  .call(() => {
                     director.once(Director.EVENT_AFTER_DRAW, () => {
                        effSke.setAnimation(0, hitAni, false);
                        effSke.setCompleteListener(() => {
                           effSke.setCompleteListener(null);
                           this.ClearOneSymbolEffect(effNode, symbolId);
                        })
                     })
                  })
                  .delay(EFFECT_DESTROY_TIME)
                  .call(() => {
                     director.once(Director.EVENT_AFTER_DRAW, () => {
                        flyEffect.active = false;
                     })
                  })
                  .start()
            }
         }
      }

      flyCb();
   }


   private ShowPhaseAni() {
      let flyCollectCount: number[] = [0, 0]
      let playSoundOnce: boolean = false;
      for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
         for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
            let symbolId: number = this.m_mgFgPlate[i][j].symbolId;
            if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
               let direction: number = PhaseType.Max;
               if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
                  direction = PhaseType.PURPLE;
                  flyCollectCount[PhaseType.PURPLE]++;
               }

               let nowPhase: number = this.m_phase[direction];
               let prePhase: number = this.m_prePhase[direction];
               let isLevelUp: boolean = nowPhase - prePhase > 0;
               let isFinalSymbol: boolean[] = [false, false];
               isFinalSymbol[direction] = (flyCollectCount[direction] == this.m_totalFlyCollectCount[direction]);
               //let isFinalSymbol:boolean = true;
               let isFakeShow: boolean[] = [false, false];
               isFakeShow[direction] = nowPhase >= 4 && Math.floor(Math.random() * 100) < 0;

               let ske: sp.Skeleton = this.m_phaseSpine[direction];
               let flyTime: number = FLY_TIME + FLY_BALL_DESTROY_TIME;
               let delayTime: number[] = [0, 0];
               delayTime[direction] = (!isLevelUp && !isFakeShow[direction]) ? 0 : flyTime;
               delayTime[direction] = (this.m_isInFg && (this.m_fgSpinned == this.m_totalFreeRound)) ? flyTime : delayTime[direction];

               this.scheduleOnce(() => {
                  ske.addAnimation(1, "Track1_Hint", false);
                  if (isFinalSymbol[direction]) {
                     if (!playSoundOnce) {
                        playSoundOnce = true;
                        GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_COLLECT);
                     }
                     if (prePhase == 0) {
                        ske.addAnimation(0, "Idle", true);
                     }
                     else {
                        ske.addAnimation(0, "Level" + prePhase + "_Loop", true);
                     }
                  }
               }, FLY_TIME)




               this.scheduleOnce(() => {
                  if (isFinalSymbol[direction]) {
                     ske.clearTracks();
                     ske.setToSetupPose();

                     //有升等
                     if (isLevelUp) {
                        let showLevelUpSound = (nowLevel: number) => {
                           switch (nowLevel) {
                              case 0: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_0_TO_1);
                                 break;
                              }
                              case 1: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_1_TO_2);
                                 break;
                              }
                              case 2: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_2_TO_3);
                                 break;
                              }
                              case 3: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_3_TO_4);
                                 break;
                              }
                              case 4: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_4_TO_5);
                                 break;
                              }
                              case 5: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_5_TO_6);
                                 break;
                              }
                           }
                        }
                        //表示進特色遊戲,要連續升等
                        if (nowPhase == 6) {
                           let nowLevel: number = prePhase;
                           let levelUp = () => {
                              showLevelUpSound(nowLevel);
                              let entry = ske.setAnimation(0, "LevelUp" + nowLevel + "to" + (nowLevel + 1), false);
                              ske.addAnimation(0, "Level" + (nowLevel + 1) + "_Loop", true);
                              ske.setTrackEventListener(entry, (trackEntry, event: any) => {
                                 switch (event.data.name) {
                                    case "Cut": {
                                       ske.setTrackEventListener(entry, null);
                                       nowLevel++;
                                       if (nowLevel < nowPhase) {
                                          levelUp();
                                       }
                                       break;
                                    }
                                 }
                              })
                              ske.setTrackCompleteListener(entry, () => {
                                 ske.setTrackCompleteListener(entry, null);
                                 if ((nowLevel + 1) == nowPhase) {
                                    this.m_isCollectEnd[direction] = true;
                                 }
                              })
                           }

                           levelUp();
                        }
                        else {
                           showLevelUpSound(prePhase);
                           let levelUpEntry = ske.setAnimation(0, "LevelUp" + prePhase + "to" + nowPhase, false);
                           ske.addAnimation(0, "Level" + nowPhase + "_Loop", true);
                           ske.setTrackCompleteListener(levelUpEntry, () => {
                              ske.setTrackCompleteListener(levelUpEntry, null);
                              this.m_isCollectEnd[direction] = true;
                           })
                           this.m_mgFgFrank.setAnimation(0, "LevelUp", false);
                           this.m_mgFgFrank.setCompleteListener(() => {
                              this.m_mgFgFrank.setCompleteListener(null);
                              this.m_mgFgFrank.setAnimation(0, "Idle", true);
                           })
                        }
                     }
                     //沒升等
                     else {
                        //假表演
                        if (isFakeShow[direction]) {
                           switch (nowPhase) {
                              case 0: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_0_TO_1, 1, false, false, () => {
                                    GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_UP_FAIL);
                                 });
                                 break;
                              }
                              case 1: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_1_TO_2, 1, false, false, () => {
                                    GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_UP_FAIL);
                                 });
                                 break;
                              }
                              case 2: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_2_TO_3, 1, false, false, () => {
                                    GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_UP_FAIL);
                                 });
                                 break;
                              }
                              case 3: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_3_TO_4, 1, false, false, () => {
                                    GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_UP_FAIL);
                                 });
                                 break;
                              }
                              case 4: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_4_TO_5, 1, false, false, () => {
                                    GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_UP_FAIL);
                                 });
                                 break;
                              }
                              case 5: {
                                 GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_LEVELUP_5_TO_6, 1, false, false, () => {
                                    GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_UP_FAIL);
                                 });
                                 break;
                              }
                           }
                           let fakeEntry = ske.setAnimation(0, "LevelUp" + nowPhase + "to" + (nowPhase + 1) + "_Fail", false);
                           ske.setTrackCompleteListener(fakeEntry, () => {
                              ske.setTrackCompleteListener(fakeEntry, null);
                              this.m_isCollectEnd[direction] = true;
                           })
                        }
                        else {
                           this.m_isCollectEnd[direction] = true;
                        }

                        if (prePhase == 0) {
                           ske.addAnimation(0, "Idle", true);
                        }
                        else {
                           ske.addAnimation(0, "Level" + prePhase + "_Loop", true);
                        }
                     }
                  }
               }, delayTime[direction])
               //最後一個才表演升等動畫

            }
         }
      }
      for (let i = 0; i < flyCollectCount.length; i++) {
         if (flyCollectCount[i] == 0) {
            this.m_isCollectEnd[i] = true;
         }
      }
   }

   /**取得隨機Bezier中間2點*/
   private GetRandomBezier(oPos: Vec3, tPos: Vec3) {
      const min = 0.1; //最小垂直向量
      const range = 0.05; //垂直向量範圍
      const distance = tPos.subtract(oPos); // 计算起点到终点的向量差
      const magnitude = distance.length(); // 计算向量差的长度
      // 生成两个随机位置的随机因子（0.2到0.8之间）
      const randomFactor1 = 0.5;
      const randomFactor2 = randomFactor1 + Math.random() * 0.4;
      // 生成两个隨機中間点位置
      const r1 = oPos.clone().add(distance.multiplyScalar(randomFactor1));
      const r2 = oPos.clone().add(distance.multiplyScalar(randomFactor2));
      //目前範圍 +- 0.1~0.3
      const random =
         0.5;
      // 生成两个垂直随机向量
      const verticalVector1 =
         v3(r1.y, -r1.x)
            .multiplyScalar(random)

      const verticalVector2 =
         v3(r2.y, -r2.x)
            .multiplyScalar(-random)
            .multiplyScalar(magnitude * 0.01);
      // 生成两个控制点位置，将垂直向量加减到向量差上
      const c1 = r1.add(verticalVector1);
      const c2 = r2.add(verticalVector2);

      return [c1, c2];
   }

   /**用來轉換座標用的 */
   private TransformSymbolPosition(symbol: Node): Vec3 {
      let pos: Vec3 = symbol.parent.getComponent(UITransform).convertToWorldSpaceAR(symbol.getPosition());
      pos = this.node.getComponent(UITransform).convertToNodeSpaceAR(pos);
      return pos;
   }

   /**建立Symbol動畫與播放，Main Game輪帶用的 */
   private CreateSymbolEffectAndPlayForMainGamePanel(
      symbolId: number,
      track: number,
      socket: number,
      coinValue: BigNumber,
      type: number,
      isEnterFg: boolean,
      symbolActive: boolean = false,
   ) {
      let symbolNode = this.m_mgFgReel.GetSymbolNode(track, socket)

      if (!isValid(symbolNode) || !symbolNode.active) {
         return;
      }

      //層級判斷
      let zorder: number = 0;
      zorder = track * 3 + socket;

      this.CreateSymbolEffectAndPlay(
         symbolNode,
         symbolId,
         zorder,
         track,
         socket,
         coinValue,
         type,
         isEnterFg,
         symbolActive,
      );
   }

   /**建立Symbol動畫與播放 */
   private CreateSymbolEffectAndPlay(
      symbolNode: Node,
      symbolId: number,
      zorder: number,
      track: number,
      socket: number,
      coinValue: BigNumber,
      type: number,
      isEnterFg: boolean,
      symbolActive: boolean = false,
   ) {
      //隱藏靜態圖節點
      //靜態圖是否關閉
      if (symbolActive) {
         symbolNode.active = true;
      }
      else {
         symbolNode.active = false;

         this.m_hideSymbols.push(symbolNode);
      }


      //檢查節點池有沒有Symbol動畫節點可以用，沒有就創建      
      let effNode: Node = null;
      let parentNode: Node = this.node;
      if (this.m_effectPool[symbolId].length > 0) {
         effNode = this.m_effectPool[symbolId].pop();
      }
      else {
         effNode = instantiate(this.m_symblPrefab[symbolId]);

         parentNode.addChild(effNode);
      }
      this.m_symbolFx.addChild(effNode);
      this.m_effectNodes[symbolId].push(effNode);

      //設定與存取Symbol動畫節點擺放位置
      let pos = this.TransformSymbolPosition(symbolNode);
      effNode.setPosition(pos);
      effNode.setSiblingIndex(EFFECT_ZORDER + zorder);

      this.MgFgEffectData[track][socket].node = effNode;
      this.MgFgEffectData[track][socket].coinValue = coinValue;
      this.MgFgEffectData[track][socket].symbolId = symbolId;
      this.MgFgEffectData[track][socket].type = type;

      //開始表演
      effNode.active = true;
      let effect: sp.Skeleton = NodeUtils.GetUI(effNode, "Spine").getComponent(sp.Skeleton);
      if (symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
         //剛進Free Game時，播FG Scatter進場動畫
         if (isEnterFg) {
            effect.clearTracks();
            effect.setAnimation(0, "Win_Start", false);
            effect.addAnimation(0, "Win_Loop", true);
         }
         //在MG
         else {
            effect.setAnimation(0, "Win", false);
            effect.setCompleteListener(() => {
               effect.setCompleteListener(null);
               let idleTime = this.GetIdleTime(symbolId);
               effect.setAnimation(0, "Idle", true);
               log("idleTime = " + idleTime);
               effect.getCurrent(0).trackTime = idleTime;
            })

            let reboundDist: number = this.m_mgFgReel.IsHardStop ? FASTER_SPIN_SETTING.hardReboundDist : FASTER_SPIN_SETTING.reboundDist;
            let reboundTime: number = this.m_mgFgReel.IsHardStop ? FASTER_SPIN_SETTING.hardReboundTime : FASTER_SPIN_SETTING.reboundTime;
            if (this.m_isTurbo) {
               if (this.m_mgFgReel.IsHardStop) {
                  reboundDist = TURBO_SPIN_SETTING.hardReboundDist;
                  reboundTime = TURBO_SPIN_SETTING.hardReboundTime;
               }
               else {
                  reboundDist = TURBO_SPIN_SETTING.reboundDist;
                  reboundTime = TURBO_SPIN_SETTING.reboundTime;
               }
            }

            tween(effNode)
               .to(reboundTime, { position: v3(effNode.getPosition().x, effNode.getPosition().y + reboundDist, effNode.getPosition().z) })
               .start();
         }
      }
      //其他Symbol
      else {
         if (this.m_isTurbo) {
            tween(effect.node)
               .to(0.1, { scale: v3(1.2, 1.2, 1.2) })
               .to(0.1, { scale: v3(1, 1, 1) })
               .start();
         }
         else {
            effect.setAnimation(0, "Win", true);
         }
      }
   }

   private GetIdleTime(symbolId: number): number {
      //同步Scatter與綠球 Idle的動畫時間
      //找到第一個Idle時間
      let lastTrackTime: number = 0;
      for (let j = 0; j < this.m_effectNodes[symbolId].length; j++) {
         if (this.m_effectNodes[symbolId][j].name == EgyptEternalDefine.THUNDER_BALL_NAME || this.m_effectNodes[symbolId][j].name == EgyptEternalDefine.SCATTER_NAME) {
            let ske: sp.Skeleton = this.m_effectNodes[symbolId][j].getChildByName("Spine").getComponent(sp.Skeleton);
            let entry: sp.spine.TrackEntry = ske.getCurrent(0);
            if (entry?.animation.name == "Idle") {
               lastTrackTime = entry.trackTime;
               break;
            }
         }
      }
      return lastTrackTime;
   }

   /**啟動NearWin特效 */
   public StartNearWin(column: number) {
      this.m_isNearWining = true;

      let nearWinFx = this.m_isFirstReelHasFrank ? this.m_bonusNearWinFx : this.m_scatterNearWinFx;
      nearWinFx[column].active = true;
      nearWinFx[column].getComponent(sp.Skeleton).setAnimation(0, "Loop", true);

      if (this.m_isFirstReelHasFrank) {
         this.m_nearWinSoundId[column] = GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.GREEN_BALL_NEAR_WIN);
      }
      else {
         this.m_nearWinSoundId[column] = GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.SCATTER_NEAR_WIN);
      }
   }

   /**停止NearWin特效 */
   public StopNearWin(column: number) {
      let nearWinFx = this.m_isFirstReelHasFrank ? this.m_bonusNearWinFx : this.m_scatterNearWinFx;

      if (!nearWinFx[column].active) {
         return;
      }

      //停止NearWin特效
      nearWinFx[column].getComponent(sp.Skeleton).setAnimation(0, "End", false);
      nearWinFx[column].getComponent(sp.Skeleton).setCompleteListener(() => {
         nearWinFx[column].getComponent(sp.Skeleton).setCompleteListener(null);
         nearWinFx[column].getComponent(sp.Skeleton).clearTracks();
         nearWinFx[column].getComponent(sp.Skeleton).setToSetupPose();
         nearWinFx[column].active = false;
      })

      //停止音效
      if (this.m_nearWinSoundId[column] != null) {
         GamesChief.SlotGame.GameAudio.Stop(this.m_nearWinSoundId[column]);
         this.m_nearWinSoundId[column] = null;
      }

      if (this.m_nearWinSoundId[column] != null) {
         GamesChief.SlotGame.GameAudio.Stop(this.m_nearWinSoundId[column]);
         this.m_nearWinSoundId[column] = null;
      }
   }




   /**盤面點擊 */
   private OnReelPanelTouchEvent(): void {
      this.m_slotGameView.OnReelPanelTouchEvent();
   }

   /**Button opacity animation */
   private ButtonAnimation(button: Node, active: boolean, changeTime: number) {
      if (active) {
         if (changeTime == 0) {
            button.getComponent(UIOpacity).opacity = 255;
         }
         else {
            tween(button.getComponent(UIOpacity))
               .to(changeTime, { opacity: 255 })
               .call(() => {
                  button.getComponent(UIOpacity).opacity = 255;
               })
               .start();
         }
      }
      else {
         if (changeTime == 0) {
            button.getComponent(UIOpacity).opacity = 0;
         }
         else {
            tween(button.getComponent(UIOpacity))
               .to(changeTime, { opacity: 0 })
               .call(() => {
                  button.getComponent(UIOpacity).opacity = 0;
               })
               .start();
         }
      }

   }

   /** 5連線通知(目前平台已移除)，但還是要傳事件(因為成就)*/
   private FiveLine() {
      let isLine5: boolean = false;
      for (let i = 0; i < this.m_spinAck.plateData.lineAwardList.length; i++) {
         if (this.m_spinAck.plateData.lineAwardList[i].conn == 5) {
            isLine5 = true;
         }
      }
      if (isLine5) {
         EventDispatcher.Shared.Dispatch(EventDefine.Game.LINES_OF_A_KIND, this.m_gameBar.BetValue, NumberUtils.ParseBigNumber(this.m_spinAck.plateData.plateWin));
      }
   }

   private ClickCollectButton(declareNode: ProclaimButton, callBack: Function) {

      declareNode.SetCollectState(() => {
         callBack();
      }, this.m_isAutoplay);

   }


   /**JP開始跑動 */
   public JpRun(restart: boolean[] = [], passTimeCorrect: boolean = false) {
      this.m_isPauseJp = false;
      // 萬一長度不對補齊，照理說要一樣啦
      if (restart.length < this.m_jpLabel.length) {
         let d: number = this.m_jpLabel.length - restart.length;
         for (let i = 0; i < d; i++) {
            restart.push(false);
         }
      }

      for (let i = 0; i < this.m_jpLabel.length; i++) {
         if (i == EgyptEternalProtocol.JpType.GRAND) {
            this.m_jpLabel[i].Run(restart[i], passTimeCorrect);
         }
         else {
            this.m_jpLabel[i].Stop();
         }

      }
   }


   /** 更新JP解鎖資料 */
   public UpdateJpUnlockInfo() {
      if (this.m_spinAck) {
         let bit2 = this.m_spinAck.plateData.awardTypeFlag & (1 << 1);
         let bit3 = this.m_spinAck.plateData.awardTypeFlag & (1 << 2);
         if (bit2 === 0 && bit3 === 0) {
            this.m_isJpSettingAck = true;
         }
      }
   }


   /**更新JP鎖狀態 */
   public CheckJpSetting() {
      if (this.m_isJpSettingAck) {
         this.m_isJpSettingAck = false;
      }
   }

   private UpdateJpLockDisplay(lockChangeInfo: BetLockChangeInfo[], isBetChange: boolean): void {
      const UNLOCK_TYPE_FIVE_REEL = 51;
      const unlockTypeToIndex = {
         [GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MINI]: 0,
         [GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MINOR]: 1,
         [GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MAJOR]: 2,
         [GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MEGA]: 3,
         [GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_GRAND]: 4,
         [UNLOCK_TYPE_FIVE_REEL]: 5,
      }

      //#mh#: JP等級鎖修正
      //當JP都沒有改變時，應該要維持設定
      if (lockChangeInfo.length == 0) {
         //第一次全空，設定為全開
         if (this.m_isInit) {
            for (let i = 0; i < EgyptEternalDefine.MAX_JP_NUM; i++) {
               let state: sp.spine.AnimationState = this.m_jpSpine[i].getState();
               let stateFront: sp.spine.AnimationState = this.m_jpFront[i]?.getState();
               state.setAnimation(0, "Idle", true);
               state.setAnimation(2, "Bet", false);
               state.addEmptyAnimation(2, 0, 0); // 還原初始狀態避免影響Idle播放

               //stateFront.setAnimation(0, "Idle", true);
               stateFront?.setAnimation(2, "Bet", false);
               //stateFront.addEmptyAnimation(2, 0, 0); // 還原初始狀態避免影響Idle播放

               state.setAnimation(3, "UnLock", false);
               stateFront?.setAnimation(3, "UnLock", false);

               this.m_jpLabel[i].node.getComponent(UIOpacity).opacity = 255;
               this.m_jpLockLabel[i].node.getComponent(UIOpacity).opacity = 0;

               this.m_isJpLock[i] = false;
            }
         }
         else {
            for (let i = 0; i < EgyptEternalDefine.MAX_JP_NUM; i++) {
               let state: sp.spine.AnimationState = this.m_jpSpine[i].getState();
               let stateFront: sp.spine.AnimationState = this.m_jpFront[i]?.getState();
               if (this.m_isJpLock[i]) {
                  state.setAnimation(2, "Lock_Bet", false);
                  stateFront?.setAnimation(2, "Lock_Bet", false);
               }
               else {
                  state.setAnimation(2, "Bet", false);
                  stateFront?.setAnimation(2, "Bet", false);
               }
            }
         }
      }

      for (let i = 0; i < lockChangeInfo.length; i++) {
         const cellIndex: number = unlockTypeToIndex[lockChangeInfo[i].UnLockType];

         if (cellIndex == undefined || cellIndex == 5) {
            log(`UpdateJpLockDisplay: cellIndex is null`);
            continue;
         }

         const lock = lockChangeInfo[i].CurrentStatus == BetLockStatus.LOCK || lockChangeInfo[i].CurrentStatus == BetLockStatus.LOCK_BY_LEVEL;
         const state: sp.spine.AnimationState = this.m_jpSpine[cellIndex].getState();
         const stateFront: sp.spine.AnimationState = this.m_jpFront[cellIndex].getState();

         if (!lock) {
            state.setAnimation(0, "Idle", true);
            state.setAnimation(2, "Bet", false);
            state.addEmptyAnimation(2, 0, 0); // 還原初始狀態避免影響Idle播放

            //stateFront.setAnimation(0, "Idle", true);
            stateFront.setAnimation(2, "Bet", false);
            //stateFront.addEmptyAnimation(2, 0, 0); // 還原初始狀態避免影響Idle播放


            if (lockChangeInfo[i].CurrentStatus != lockChangeInfo[i].LastStatus) {
               state.setAnimation(3, "UnLock", false);
               stateFront.setAnimation(3, "UnLock", false);

               if (!this.m_isInit) {
                  GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.JP_UNLOCK);
               }
            }


            this.m_jpLabel[cellIndex].node.getComponent(UIOpacity).opacity = 255;
            this.m_jpLockLabel[cellIndex].node.getComponent(UIOpacity).opacity = 0;

            this.m_isJpLock[cellIndex] = false;
         }
         else {
            state.setAnimation(2, "Lock_Bet", false);
            state.addEmptyAnimation(2, 0, 0); // 還原初始狀態避免影響Idle播放

            stateFront.setAnimation(2, "Lock_Bet", false);
            stateFront.addEmptyAnimation(2, 0, 0); // 還原初始狀態避免影響Idle播放


            if (lockChangeInfo[i].CurrentStatus != lockChangeInfo[i].LastStatus) {
               state.setAnimation(3, "Lock", false);
               stateFront.setAnimation(3, "Lock", false);
               if (!this.m_isInit) {
                  GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.JP_LOCK);
               }
            }


            this.m_jpLabel[cellIndex].node.getComponent(UIOpacity).opacity = 0;
            this.m_jpLockLabel[cellIndex].getComponent(UIOpacity).opacity = 255;

            this.m_isJpLock[cellIndex] = true;
         }
      }

      //mini minor也要刷光
      for (let i = 0; i <= EgyptEternalProtocol.JpType.MINOR; i++) {
         const state: sp.spine.AnimationState = this.m_jpSpine[i].getState();
         state.setAnimation(2, "Bet", false);
         state.addEmptyAnimation(2, 0, 0); // 還原初始狀態避免影響Idle播放
      }
   }


   /**強制解鎖Major面板 */
   private ForceUnlockMajor() {
      if (!this.m_isInFg && !this.m_slotGameView.IsBetBtnDisable) {
         let forceSetBetValue: number = this.m_gameBar.BetTable[0];
         for (let i = 0; i < this.m_gameBar.BetTable.length; i++) {
            if (this.m_gameBar.BetTable[i] >= this.m_jpMinLimitBet[EgyptEternalProtocol.JpType.MAJOR]) {
               forceSetBetValue = this.m_gameBar.BetTable[i];
               break;
            }
         }
         if (forceSetBetValue > this.m_gameBar.BetValue) {
            this.m_gameBar.BetValue = forceSetBetValue;
         }
      }
   }
   /**強制解鎖Mega面板 */
   private ForceUnlockMega() {
      if (!this.m_isInFg && !this.m_slotGameView.IsBetBtnDisable) {
         let forceSetBetValue: number = this.m_gameBar.BetTable[0];
         for (let i = 0; i < this.m_gameBar.BetTable.length; i++) {
            if (this.m_gameBar.BetTable[i] >= this.m_jpMinLimitBet[EgyptEternalProtocol.JpType.MEGA]) {
               forceSetBetValue = this.m_gameBar.BetTable[i];
               break;
            }
         }
         if (forceSetBetValue > this.m_gameBar.BetValue) {
            this.m_gameBar.BetValue = forceSetBetValue;
         }
      }
   }
   /**強制解鎖Grand面板 */
   private ForceUnlockGrand() {
      if (!this.m_isInFg && !this.m_slotGameView.IsBetBtnDisable) {
         let forceSetBetValue: number = this.m_gameBar.BetTable[0];
         for (let i = 0; i < this.m_gameBar.BetTable.length; i++) {
            if (this.m_gameBar.BetTable[i] >= this.m_jpMinLimitBet[EgyptEternalProtocol.JpType.GRAND]) {
               forceSetBetValue = this.m_gameBar.BetTable[i];
               break;
            }
         }
         if (forceSetBetValue > this.m_gameBar.BetValue) {
            this.m_gameBar.BetValue = forceSetBetValue;
         }
      }
   }
   /**設定jp面板觸碰 */
   public SetJpTouch(unLock: boolean) {
      if (unLock) {
         this.m_majorTouch.node.active = true;
         this.m_megaTouch.node.active = true;
         this.m_grandTouch.node.active = true;
      }
      else {
         this.m_majorTouch.node.active = false;
         this.m_megaTouch.node.active = false;
         this.m_grandTouch.node.active = false;
      }
   }

   public OnGameBarBetInfoUpdate(commGameInfo: GameCommonCommand.CommonGameInfo) {
      console.log("OnGameBarBetInfoUpdate");
      const jpInfo = commGameInfo.JpList;
      for (let i = 0; i < EgyptEternalDefine.MAX_JP_NUM; i++) {
         this.m_jpLabel[i].UpdateBaseMultiplier(jpInfo[i].BaseOdds);
      }

      let GetUnlockBet = (jpType: GameCommonCommand.UNLOCK_TYPE) => {
         let unlockBet = 0;
         for (let unlock of commGameInfo.UnlockList) {
            if (unlock.UnlockType == jpType) {
               unlockBet = unlock.Bet;
               break;
            }
         }
         return unlockBet;
      }


      this.m_jpMinLimitBet[0] = GetUnlockBet(GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MINI);
      this.m_jpMinLimitBet[1] = GetUnlockBet(GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MINOR);
      this.m_jpMinLimitBet[2] = GetUnlockBet(GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MAJOR);
      this.m_jpMinLimitBet[3] = GetUnlockBet(GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MEGA);
      this.m_jpMinLimitBet[4] = GetUnlockBet(GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_GRAND);
   }

   /**增減Bet，JP獎金也要跟著變化 */
   private OnBetChange(newBet: number) {
      for (let i = 0; i < EgyptEternalDefine.MAX_JP_NUM; i++) {
         this.SaveJpInfo(i, null, newBet);
         // if(i < EgyptEternalProtocol.JpType.GRAND){
         //    this.m_jpLabel[i].node.getComponent(RollingNumberLabel).RollNumberTo(newBet * this.m_jpLabel[i].BaseMultiplier , true);
         // }  
      }
   }

   /**儲存JP相關訊息 */
   private SaveJpInfo(jpType: EgyptEternalProtocol.JpType, jpList: BigNumber = null, bet: number = null) {
      if (jpList != null) {
         this.m_jpLabel[jpType].UpdateJPMoney(jpList);
      }
      if (bet != null) {
         this.m_jpLabel[jpType].UpdateBet(bet, false);
      }
   }


   /**GameInfoAck JP數值 */
   public SetGameInfoJp(gameInfoAck: EgyptEternalProtocol.GameInfoAck, bet: number, isFeatureGame: boolean) {
      // JP跑分初始化
      let jpDuration = [208, 1579, 9836, 20689, 176470]; //各遊戲不同 記得改
      let jpName = ["mini", "minor", "major", "mega", "grand"];
      const jpInfo = GamesChief.SlotGame.GetCommonGameInfo().JpList;

      for (let i = 0; i < EgyptEternalDefine.MAX_JP_NUM; i++) {
         this.m_jpLabel[i].Init(
            bet,
            jpDuration[i],
            jpInfo[i].BaseOdds,
            gameInfoAck.jpInfo[i],
            jpName[i],
            null,
            false
         );

         if (i == EgyptEternalProtocol.JpType.GRAND) {
            this.m_jpLabel[i].MaxCount = 8;
         }
         else if (i == EgyptEternalProtocol.JpType.MEGA || i == EgyptEternalProtocol.JpType.MAJOR) {
            this.m_jpLabel[i].MaxCount = 7;
         }
         else {
            this.m_jpLabel[i].MaxCount = 5;
         }


         this.m_jpLabel[i].Label.KMBTBool = true;

         this.SaveJpInfo(i, gameInfoAck.jpInfo[i], bet);
         this.m_jpInfo[i] = gameInfoAck.jpInfo[i];
      }

      if (!isFeatureGame) {
         this.JpRun();
      }
      else {
         this.ReconnectFeatureJp(this.m_jpInfo);
      }
   }

   /**設定斷線重連特色遊戲JP數值 */
   private ReconnectFeatureJp(jpInfo: BigNumber[]) {
      for (let i = 0; i < this.m_jpLabel.length; i++) {
         //若抽水值=0，表示有中過該JP，就顯示實際值
         if (jpInfo[i].eq(0)) {
            this.m_isJpAlreadyReset[i] = true;
            this.m_jpLabel[i].Stop();
         }
         //沒中過，顯示跑分數值
         else {
            this.m_jpLabel[i].Pause();
         }
      }
   }

   /**每一轉更新JP抽水 */
   public UpdateJpMoney() {
      for (let i = 0; i < EgyptEternalDefine.MAX_JP_NUM; i++) {
         this.SaveJpInfo(i, this.m_spinAck.jpInfo[i], null);
      }
   }


   /**JP結算後重置JP Money */
   private ResetJpMoney(type: number) {
      if (!this.m_isJpAlreadyReset[type]) {
         //抽水歸零+JP值設定
         this.SaveJpInfo(type, new BigNumber(0), this.m_gameBar.BetValue);
         this.m_jpLabel[type].Stop();
         this.m_isJpAlreadyReset[type] = true;
      }
   }


   /**進Feature Game顯示假JP分數、並停止所有跑分*/
   private SetFakeJpValue() {
      this.m_isPauseJp = true;
      for (let i = 0; i < this.m_jpLabel.length; i++) {
         this.m_jpLabel[i].Pause();
      }
   }


   /**JP中獎設定實際JP分數 */
   private SetRealJp(jpType: number) {
      this.m_jpLabel[jpType].Stop();
   }

   /**重置已經Reset過JP的旗標 */
   public ResetIsJpAlready() {
      this.m_isJpAlreadyReset = [false, false, false, false, false];
   }

   /**初始化MG相關參數 */
   public MgResetParameter() {
      this.ClearAllEffect();

      this.m_flyCollectCount.fill(0);
      this.m_hasLineAwards = false;
      this.m_hasNearWin = false;
      this.m_playSoundOnce = false;
   }

   /**清除FG每一轉的參數 */
   public FgResetParameter() {
      this.ClearAllEffect();

      this.m_flyCollectCount.fill(0);
      this.m_hasLineAwards = false;
      this.m_hasNearWin = false;
      this.m_playSoundOnce = false;
   }

   /**
     * 表演MG進FG的宣告
     * @param gotoNextState 跳下一個階段
     */
   private ShowFgStart(gotoNextState: Function) {
      //斷線重連 不顯示宣告
      if (this.m_isSkipShowEnter) {
         this.ShowFgReelTxt();
         //停止JP跑分
         this.SetFakeJpValue();

         //設定地霸
         this.m_gameBar.SetDeviationEnable(true);

         GamesChief.SlotGame.GameAudio.PlaySceneBGM(EgyptEternalDefine.AudioFilePath.FG, 1, true);

         this.ChangeBackGround();
         this.SetFgSpinnedLabel(this.m_fgSpinned);
         this.SetFgTotalFreeLabel(this.m_totalFreeRound);
         this.m_reelSpine.setSkin("FG");

         gotoNextState();
         return;
      }

      tween(this.node)
         .delay(0.5)
         .call(() => {
            this.SetMgToFeatureAction();
         })
         .call(() => {
            //Phase線圈表演
            this.ShowPhaseWin(() => {
               //表演角色Win動畫
               this.ShowFrankWin(() => {
                  //表演宣告 + 按鈕
                  GamesChief.SlotGame.GameAudio.StopSceneBGM();
                  this.ShowFgDeclare();
                  this.ShowAndClickButton(() => {
                     //轉換背景,設定局數,播宣告End動畫
                     this.ShowFgReelTxt();
                     this.m_mgFgReel.SetProtectSymbol();
                     this.m_mgFgReel.ChangeOutsideSymbol();
                     this.m_mgFgReel.ForceSetData(this.m_mgFgReel.FgInitPlate());
                     this.ChangeBackGround();
                     this.SetFgSpinnedLabel(0);
                     this.SetFgTotalFreeLabel(EgyptEternalDefine.FG_BASE_ROUND);
                     this.m_reelSpine.setSkin("FG");
                     this.ShowFgEnd(() => {
                        gotoNextState();
                        GamesChief.SlotGame.GameAudio.PlaySceneBGM(EgyptEternalDefine.AudioFilePath.FG, 1, true)
                     })
                  })
               })
            })
         })
         .start()
   }

   /**FG加轉數表演 */
   private ShowAddSpins(gotoNextState: Function) {
      GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.RING);

      let ske: sp.Skeleton = this.m_addSpinNode.getChildByName("FG_FX_Spins").getComponent(sp.Skeleton);
      let fgDataNode = this.m_addSpinNode.getChildByName("FG_Data");


      tween(this.node)
         .call(() => {
            fgDataNode.active = true;
            ske.node.active = true;
            ske.clearTracks();
            ske.setToSetupPose();
            ske.setAnimation(0, "FG_FX_Spins", false);
            ske.setCompleteListener(() => {
               ske.setCompleteListener(null);

               //局數相關設定
               GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.FG_ADD_SPIN);
               this.SetFgTotalFreeLabel(this.m_totalFreeRound);
               this.SetFgSpinnedLabel(this.m_fgSpinned);

               fgDataNode.active = false;
               ske.node.active = false;
               gotoNextState();
            })
         })
         .start()
   }


   /**設定FG已轉局數面板數字 */
   public SetFgSpinnedLabel(fgSpinned: number) {
      this.m_fgSpinnedLabel.string = fgSpinned.toString();
   }

   /**設定FG總局數面板數字 */
   public SetFgTotalFreeLabel(totalFreeRound: number) {
      this.m_totalFreeLabel.string = totalFreeRound.toString();
   }


   private ShowFgLeave(gotoNextState: Function) {
      //先隱藏FG宣告+按鈕
      let fgEndComplimentSke: sp.Skeleton = this.m_fgComplimentNode.getChildByName("Spine").getComponent(sp.Skeleton);
      let clickBtn = GamesChief.SlotGame.ProclaimButton;
      let skipNode: Node = NodeUtils.GetUI(this.m_fgComplimentNode, "Skip");
      let isSkip: boolean = true;
      this.m_fgComplimentNode.active = false;
      clickBtn.node.getComponent(UIOpacity).opacity = 0;
      skipNode.active = true;


      //暫停背景音樂、播放宣告音效
      let endDeclareSound: number = 0;
      GamesChief.SlotGame.GameAudio.StopSceneBGM();
      endDeclareSound = GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.FG_COMPLIMENT_START);

      //結算宣告開始
      this.m_fgComplimentNode.active = true;

      fgEndComplimentSke.clearTracks();
      fgEndComplimentSke.setToSetupPose();
      let startEntry: sp.spine.TrackEntry = fgEndComplimentSke.setAnimation(0, "Start", false);
      fgEndComplimentSke.addAnimation(0, "Loop", true);

      this.ButtonAnimation(clickBtn.node, true, 0.4);
      //FG結算按鈕callback
      let ClickButtonCb = () => {
         if (isSkip) {
            GamesChief.SlotGame.GameAudio.SetCurrentTime(endDeclareSound, 4);
            startEntry.trackTime = 4;
         }

         totalNum.RollNumberTo(this.m_fgTotalWin, false);
         this.ButtonAnimation(clickBtn.node, false, 0.2);

         this.scheduleOnce(() => {
            this.scheduleOnce(() => {
               GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.FG_COMPLIMENT_END);
            }, 0.2)

            let endEntry = fgEndComplimentSke.setAnimation(0, "End", false);

            this.scheduleOnce(() => {
               this.TurnOnReelTxt();
               this.ClearAllEffect();
               this.m_mgFgReel.SetProtectSymbol();
               this.m_mgFgReel.ChangeOutsideSymbol();
               this.m_mgFgReel.ForceSetData(this.m_mgPlate);
            }, 0.5)


            this.ResetFgAni();

            fgEndComplimentSke.setTrackCompleteListener(endEntry, () => {
               fgEndComplimentSke.setTrackCompleteListener(endEntry, null);

               //加錢
               EventDispatcher.Shared.Dispatch(EventDefine.Game.LEAVE_FREE_GAME);
               this.m_slotMain.FeatureGameEnd
                  (
                     this.m_gameBar.BetValue,
                     this.m_fgTotalWin,
                     () => {
                        EventDispatcher.Shared.Dispatch(EventDefine.Game.CURRENCY_UPDATE_BY_REWARD, this.m_fgTotalWin);

                        this.ResetFgParameter();

                        gotoNextState();
                     },
                     false
                  )
               this.m_fgComplimentNode.active = false;
            })
         }, 1)
      }

      //設定按鈕狀態
      let SetButtonState = () => {
         this.ButtonAnimation(clickBtn.node, false, 0.2);
      }

      //FG跑分              
      let totalNumNode = NodeUtils.GetUI(this.m_fgComplimentNode, "WinMoney");
      let totalNum: RollingNumberLabel = totalNumNode.getComponent(RollingNumberLabel)
      totalNum.MaxCount = 10;
      totalNum.KMBTBool = true;
      totalNum.RollNumber(0, this.m_fgTotalWin)

      //先設定好按鈕點擊callback
      this.ClickCollectButton(clickBtn, ClickButtonCb);

      //FG跑分跳過               
      // skipNode.once(TouchableEvent.Clicked, () => {
      //    skipNode.active = false;

      //    //按鈕反饋動畫+按鈕消失
      //    SetButtonState();

      //    GamesChief.SlotGame.ProclaimButton.node.emit(TouchableEvent.Clicked)
      // }, this);


      //分數滾動結束時觸發
      totalNum.node.once(RollingEvent.RollingFinish, () => {
         isSkip = false;
         skipNode.active = false;
      }, this)
   }

   /**輪帶提示轉出電球動畫 */
   private ShowReelHintAni(symbolId: number) {
      let type: number = PhaseType.PURPLE;

      //線圈Hint動畫
      this.m_phaseSpine[type].setAnimation(1, "Track1_Hint", false);


      //輪帶Hint動畫
      this.m_fxReelSpine[type].node.active = true;
      this.m_fxReelSpine[type].setAnimation(0, "Hint", false);
      this.m_fxReelSpine[type].setCompleteListener(() => {
         this.m_fxReelSpine[type].setCompleteListener(null);
         this.m_fxReelSpine[type].node.active = false;
      })
   }

   /**
     * MG進場動畫
     * @param OpeningCb 開場動畫結束callback
     * @param OpenPlateFormEvent 打開平台相關事件(天降、面版等)，播完後再打開，不然會使開場動畫暫停
     */
   public MgOpening(OpeningCb: Function, OpenPlateFormEvent: Function) {
      //一天只播一次
      const key: string = EgyptEternalDefine.GAME_NAME + "_INTRO_KEY";
      const now: number = Date.now();

      let data: any = Persist.App.Get(key);
      data = !data ? {
         Time: now,
         Intro: false
      } : JSON.parse(data);

      const storeTime: Date = new Date(data.Time);
      const nowTime: Date = new Date(now);
      //跨日重置
      if (nowTime.getDate() != storeTime.getDate()) {
         data.Intro = false;
      }


      //今天還沒播過、需要播過場動畫
      if (!data.Intro) {
         this.m_introSkip.active = true;
         //Skip按鈕配合動畫4秒後消失     
         this.m_gameIntro.scheduleOnce(() => {
            this.m_introSkip.active = false;
         }, 3)

         this.m_gameIntro.node.active = true;
         this.m_gameBar.node.active = false;


         // this.m_introSoundKey = GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.INTRO);//進場音效
         this.m_introTrackEntry = this.m_gameIntro.setAnimation(0, "GameIntro", false);
         //TODO Ide
         if (this.m_mgFgReel) {
            this.m_mgFgReel.Hide();
            this.m_mgFgReel.SetReelOpacity(0);
         }


         //TODO Ide
         this.m_gameIntro.setCompleteListener(() => {
            this.m_gameIntro.setCompleteListener(null);

            this.m_introSkip.active = false;

            this.scheduleOnce(() => {
               this.m_gameBar.node.active = true;
               this.m_spinButtonPlate.node.active = true;
               OpeningCb();
               OpenPlateFormEvent();
            }, 0.5)

            this.m_gameIntro.node.active = false;
         })



         //更新並存回去
         // data.Time = now;
         // data.Intro = true;
         // Persist.App.Set(key, JSON.stringify(data));
      }
      else {
         OpeningCb();
         OpenPlateFormEvent();
      }
   }

   /**進場動畫按鈕按下後(掛在scene上按鈕事件) */
   private IntroSkipTouch() {
      this.m_introSkip.active = false;

      this.m_introTrackEntry.trackTime = 4;

      GamesChief.SlotGame.GameAudio.SetCurrentTime(this.m_introSoundKey, 4);
   }

   /**設定背景Skin */
   private SetBackground(skinName: string) {
      this.m_background.setSkin(skinName);
      this.m_background.setAnimation(0, "Loop", true);
   }

   /*每轉Spin時的Reel特效 */
   public ReelSpinAni() {
      this.m_isInFg ? this.m_reelSpine.setSkin("FG") : this.m_reelSpine.setSkin("MG");
      GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.REEL_SPIN_THUNDER);
      this.m_reelSpine.setAnimation(0, "Spin", false);
      this.m_reelSpine.addAnimation(0, "Idle", true);
   }


   /**
    * 判斷金幣是否在科學怪人的範圍內
    * @param coinPos 金幣位置
    * @returns 是否在範圍內
    */
   public IsCoinInFrankRange(coinPos: Vec3): boolean {
      let leftTopPos = this.m_frankNowPosition; // 左上角座標
      let width: number = this.CalculateNXNProgressLevel(this.m_nowElectricBallTotalCount);

      if (coinPos.x >= leftTopPos.x && coinPos.x < (leftTopPos.x + width) && coinPos.y >= leftTopPos.y && coinPos.y < (leftTopPos.y + width)) {
         return true;
      }
      else {
         return false;
      }
   }
   /**
    * 更新雷電球位置與表演
    * @param newNxNProgress 新的NxN進度
    */
   private UpdateElectricBallProgress(newNxNProgress: number) {
      let rootNode = this.m_electricBallProgressSke[0].node.parent;
      //let copyRootNode = this.m_electricBallProgressCopyNode[0].parent;
      //升等到最大階段則全關
      if (newNxNProgress == PROGRESS_LEVEL.FIVE_FIVE) {
         tween(rootNode.getComponent(UIOpacity))
            .to(2.0, { opacity: 0 })
            .call(() => {
               for (let i = 0; i < this.m_electricBallProgressSke.length; i++) {
                  if (this.m_electricBallProgressSke[i].node.active) {
                     this.m_electricBallProgressSke[i].node.active = false;
                     //this.m_electricBallProgressCopyNode[i].active = false;
                  }
               }
            })
            .start()

         // tween(copyRootNode.getComponent(UIOpacity))
         // .to(2.0,{opacity:0})
         // .start()  

         return;
      }

      //全部漸隱+漸顯(包含複製的跟原本的)  
      tween(rootNode.getComponent(UIOpacity))
         .to(2.0, { opacity: 0 })
         .call(() => {
            //把最後一個雷電球進度關掉
            for (let i = this.m_electricBallProgressSke.length - 1; i >= 0; i--) {
               if (this.m_electricBallProgressSke[i].node.active) {
                  this.m_electricBallProgressSke[i].node.active = false;
                  //this.m_electricBallProgressCopyNode[i].active = false;
                  break;
               }
            }

            //剩下的雷電球進度更新新的位置
            for (let i = 0; i < this.m_electricBallProgressSke.length; i++) {
               if (this.m_electricBallProgressSke[i].node.active) {
                  this.m_electricBallProgressSke[i].node.setPosition(THUNDER_BALL_LEVEL_POS[newNxNProgress - SIZE_SHIFT][i]);
                  //this.m_electricBallProgressCopyNode[i].setPosition(THUNDER_BALL_LEVEL_POS[newNxNProgress - SIZE_SHIFT][i]);
                  this.m_electricBallProgressPos[i] = THUNDER_BALL_LEVEL_POS[newNxNProgress - SIZE_SHIFT][i];
               }
            }
         })
         .to(2.0, { opacity: 255 })
         .start()


      // tween(copyRootNode.getComponent(UIOpacity))
      // .to(2.0,{opacity:0})
      // .to(2.0,{opacity:255})
      // .start()      
   }
   /**
    * 計算升等時該往哪個方向長
    * @param newProgress 新的是幾x幾
    * @returns 升等動畫名稱
    */
   private CalculateLevelUpDirection(newProgress: number): [string, boolean, boolean] {
      let leftTopPos = this.m_frankNowPosition; // 左上角座標
      let newWidth = newProgress; // 新的長寬
      let isLeft: boolean = false;
      let isUp: boolean = false;

      //預設往右下長,判斷是否超過邊界
      let horizontal: string = "Right";
      let vertical: string = "Down";
      if (leftTopPos.x + newWidth > 5) {
         horizontal = "Left";
         isLeft = true;

         //更新左上角座標
         leftTopPos.x = leftTopPos.x - 1;
      }
      if (leftTopPos.y + newWidth > 5) {
         vertical = "Up";
         isUp = true;

         //更新左上角座標
         leftTopPos.y = leftTopPos.y - 1;
      }

      return ["Track1_" + vertical + "_" + horizontal, isLeft, isUp];
   }

   /**
    * 雷電球總數轉換成NXN進度等級
    * @param electricBallTotalCount 雷電球總數
    * @returns NXN進度等級
    */
   public CalculateNXNProgressLevel(electricBallTotalCount: number = this.m_nowElectricBallTotalCount, isInitial: boolean = false): number {

      let progress: number = PROGRESS_LEVEL.TWO_TWO; // 2:2x2, 3:3x3, 4:4x4 , 5:5x5
      for (let i = 0; i < LEVELUP_NEED_COUNT.length; i++) {
         if (electricBallTotalCount >= LEVELUP_TOTAL_NEED_COUNT[i]) {
            progress++;
         }
      }
      return progress;
   }

   /**計算目前雷電球進度在哪一格 */
   private CalculateThunderBallProgress(electricBallTotalCount: number) {
      for (let i = LEVELUP_TOTAL_NEED_COUNT.length; i >= 0; i--) {
         if (electricBallTotalCount >= LEVELUP_TOTAL_NEED_COUNT[i]) {
            electricBallTotalCount = electricBallTotalCount - LEVELUP_TOTAL_NEED_COUNT[i];
            break;
         }
      }
      return electricBallTotalCount;
   }

   /**表演當下是否升等 */
   private IsNowLevelUp(nowElectricBallTotalCount: number): boolean {
      let isLevelUp: boolean = false;
      for (let i = LEVELUP_TOTAL_NEED_COUNT.length - 1; i >= 0; i--) {
         if (nowElectricBallTotalCount >= LEVELUP_TOTAL_NEED_COUNT[i]) {
            nowElectricBallTotalCount = nowElectricBallTotalCount - LEVELUP_NEED_COUNT[i];
            if (nowElectricBallTotalCount == 0) {
               isLevelUp = true;
            }
         }
      }
      return isLevelUp;
   }

   /**MG進特色遊戲時要做的事 */
   private SetMgToFeatureAction() {
      //停止JP跑分
      this.SetFakeJpValue();

      //設定地霸
      this.m_gameBar.SetDeviationEnable(true);

      //同時中FG+BG時,就不清地Bar分數
      if (!this.m_isInFg) {
         this.m_gameBar.WinValueReset();
      }


      //停止背景音樂、播放鈴聲
      GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.RING);

      //清除所有特效
      this.ClearAllEffect();

      //GamesChief.SlotGame.GameBar.ApplyWinEffectSettingList( EgyptEternalDefine.BG_WIN_EFFECT_SETTING );
      if (this.m_isInFg) {
         this.SetFgTotalFreeLabel(this.m_totalFreeRound);
      }
   }

   /**表演線圈Win動畫 */
   private ShowPhaseWin(cb?: Function) {
      let phaseSpine: sp.Skeleton = null;
      let phaseType: number = PhaseType.Max;
      if (this.m_isInFg) {
         phaseSpine = this.m_phaseSpine[PhaseType.PURPLE];
         phaseType = PhaseType.PURPLE;
      }

      phaseSpine.clearTracks();
      phaseSpine.setToSetupPose();
      GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.PHASE_WIN);
      let winEntry: sp.spine.TrackEntry = phaseSpine.setAnimation(0, "Level6_Win", false);
      phaseSpine.addAnimation(0, "Level6_Loop", true);
      this.scheduleOnce(() => {
         if (isValid(cb, true)) {
            cb();
         }
      }, 0.15)

      //結束後重置
      phaseSpine.setTrackCompleteListener(winEntry, () => {
         phaseSpine.setTrackCompleteListener(winEntry, null);
         this.m_phase[phaseType] = 0;
         this.m_prePhase[phaseType] = 0;

         //配合FG宣告Start播放時重置等級
         let resetPhaseDelayTime: number = 1.0;
         this.scheduleOnce(() => {
            phaseSpine.setAnimation(0, "Idle", true);
         }, resetPhaseDelayTime)
      })
   }

   /**表演角色Win動畫 */
   private ShowFrankWin(cb?: Function) {
      this.m_mgFgFrank.clearTracks();
      this.m_mgFgFrank.setToSetupPose();
      this.m_mgFgFrank.setAnimation(0, "Win", false);

      if (this.m_isInFg) {
         log("FG_m_mgFgFrank_setCompleteListener")
         this.m_mgFgFrank.setCompleteListener(() => {
            this.m_mgFgFrank.setCompleteListener(null);

            this.m_mgFgFrank.setAnimation(0, "Idle", true);

            if (isValid(cb, true)) {
               cb();
            }
         })
      }
   }

   private ShowFgDeclare(cb?: Function) {
      let startBtn = GamesChief.SlotGame.ProclaimButton;
      startBtn.getComponent(UIOpacity).opacity = 0;

      let fgDeclareSke: sp.Skeleton = NodeUtils.GetUI(this.m_fgDeclareNode, "Spine").getComponent(sp.Skeleton);
      this.m_fgDeclareNode.active = true;

      this.m_declareSoundKey = GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.FG_DECLARE);
      fgDeclareSke.clearTracks();
      fgDeclareSke.setToSetupPose();
      fgDeclareSke.setAnimation(0, "Start", false);
      fgDeclareSke.addAnimation(0, "Loop", true);
      fgDeclareSke.setCompleteListener(() => {
         fgDeclareSke.setCompleteListener(null);
         startBtn.node.setPosition(v3(0, -100, 0));
         this.ButtonAnimation(startBtn.node, true, 0.5)
         if (isValid(cb, true)) {
            cb();
         }
      })


   }

   private ShowAndClickButton(cb?: Function) {
      let startBtn = GamesChief.SlotGame.ProclaimButton;

      startBtn.SetStartState(() => {
         //按鈕漸隱
         this.ButtonAnimation(startBtn.node, false, 0.2)

         if (this.m_declareSoundKey != -1) {
            GamesChief.SlotGame.GameAudio.Stop(this.m_declareSoundKey);
         }

         if (isValid(cb, true)) {
            cb();
         }

      }, this.m_isAutoplay)
   }

   private ShowFgEnd(cb?: Function) {
      GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.FG_DECLARE_END);

      let fgDeclareSke: sp.Skeleton = NodeUtils.GetUI(this.m_fgDeclareNode, "Spine").getComponent(sp.Skeleton);
      fgDeclareSke.setAnimation(0, "End", false);
      fgDeclareSke.setCompleteListener(() => {
         fgDeclareSke.setCompleteListener(null);

         if (isValid(cb, true)) {
            cb();
         }

         this.m_fgDeclareNode.active = false;
      })
   }

   private ShowReelTxt() {
      // let txtParent = this.node.parent.getChildByName("Data").getChildByName("MG_Reel_TXT");
      // let txt01 = txtParent.getChildByName("MG_Reel_TXT_01");
      // let txt03 = txtParent.getChildByName("MG_Reel_TXT_03");
      // let txtFg = txtParent.getChildByName("TXT_FG_Declare_02");
      // let showTxt: Node[] = [txt01, txt03];
      // txtFg.getComponent(UIOpacity).opacity = 0;

      // if (this.m_nowTxtIndex == -1) {
      //    this.m_nowTxtIndex = 0;
      //    this.m_nextTxtIndex = 1;
      // }
      // else {
      //    this.m_nowTxtIndex = this.m_nextTxtIndex;
      //    this.m_nextTxtIndex = (this.m_nextTxtIndex + 1 > 1) ? 0 : (this.m_nextTxtIndex + 1);
      // }


      // for (let i = 0; i < showTxt.length; i++) {
      //    if (i == this.m_nowTxtIndex) {
      //       showTxt[this.m_nowTxtIndex].getComponent(UIOpacity).opacity = 255;
      //    }
      //    else {
      //       showTxt[i].getComponent(UIOpacity).opacity = 0;
      //    }
      // }

      // this.m_txtTween = tween(showTxt[this.m_nowTxtIndex].getComponent(UIOpacity))
      //    .to(1.0, { opacity: 0 })
      //    .call(() => {
      //       tween(showTxt[this.m_nextTxtIndex].getComponent(UIOpacity))
      //          .to(1.0, { opacity: 255 })
      //          .start()
      //    })
      //    .start()
   }

   private ShowFgReelTxt() {
      let txtParent = this.node.parent.getChildByName("Data").getChildByName("MG_Reel_TXT");
      let txtFg = txtParent.getChildByName("TXT_FG_Declare_02");
      let txt01 = txtParent.getChildByName("MG_Reel_TXT_01");
      let txt03 = txtParent.getChildByName("MG_Reel_TXT_03");
      txtFg.getComponent(UIOpacity).opacity = 255;
      txt01.getComponent(UIOpacity).opacity = 0;
      txt03.getComponent(UIOpacity).opacity = 0;
   }

   private TurnOnReelTxt() {
      if (this.m_turnNow) {
         return;
      }
      this.ShowReelTxt();
      this.schedule(this.ShowReelTxt, 10)
      this.m_turnNow = true;
   }

   private TurnOffReelTxt() {
      this.unschedule(this.ShowReelTxt)
      this.m_txtTween.stop();
      this.m_turnNow = false;
   }

   /**更換背景與顯示 */
   private ChangeBackGround() {
      let data = this.node.parent.getChildByName("Data");
      let fgspinned = data.getChildByName("FgSpinned");
      let totalFreeRound = data.getChildByName("TotalFreeRound");
      let mgReelTXT01 = data.getChildByName("MG_Reel_TXT");

      let setMG = () => {
         this.SetBackground("MG");
         this.m_mgFgFrank.node.active = true;
         this.m_mgFgFrank.setSkin("MG");
         this.m_phaseSpine[PhaseType.GREEN].node.active = true;
         this.m_phaseSpine[PhaseType.PURPLE].node.active = true;
         fgspinned.active = false;
         totalFreeRound.active = false;
         mgReelTXT01.active = true;
      }

      let setFG = () => {
         this.SetBackground("FG");
         this.m_mgFgFrank.node.active = true;
         this.m_mgFgFrank.setSkin("FG")
         this.m_phaseSpine[PhaseType.GREEN].node.active = true;
         this.m_phaseSpine[PhaseType.PURPLE].node.active = true;
         fgspinned.active = true;
         totalFreeRound.active = true;
         mgReelTXT01.active = true;
      }

      if (this.m_isInFg) {
         setFG();
      }
      else {
         setMG();
      }
   }


   /**設定線圈等級 */
   public SetPhaseLevel(phase: number[]) {
      this.m_phase = phase.slice();
      this.m_prePhase = phase.slice();
   }

   /**設定線圈等級狀態 */
   public SetPhaseState() {
      let purpleSke: sp.Skeleton = this.m_phaseSpine[PhaseType.PURPLE];
      let greenSke: sp.Skeleton = this.m_phaseSpine[PhaseType.GREEN];
      let purplePhase = this.m_phase[PhaseType.PURPLE];
      let greenPhase = this.m_phase[PhaseType.GREEN];

      if (purplePhase == 0) {
         purpleSke.setAnimation(0, "Idle", true);
      }
      else {
         purpleSke.setAnimation(0, "Level" + purplePhase + "_Loop", true);
      }

      if (greenPhase == 0) {
         greenSke.setAnimation(0, "Idle", true);
      }
      else {
         greenSke.setAnimation(0, "Level" + greenPhase + "_Loop", true);
      }
   }

   /**FG結束重置動畫 */
   private ResetFgAni() {
      this.JpRun();

      //重置轉數
      this.SetFgTotalFreeLabel(6);
      this.SetFgSpinnedLabel(0);

      //重置盤面動畫
      this.m_isInFg ? this.m_reelSpine.setSkin("FG") : this.m_reelSpine.setSkin("MG");
      this.m_reelSpine.setAnimation(0, "Idle", true);

      //重置蒐集面板
      this.ChangeBackGround();

      this.m_gameBar.SetDeviationEnable(false);
   }

   /**FG結束重置參數 */
   private ResetFgParameter() {
      this.m_totalFreeRound = 0;
      this.m_fgSpinned = 0;
      this.m_fgTotalWin = new BigNumber(0);
   }

   /**播放MG預兆 */
   public ShowMGOmen(cb?: Function) {
      GamesChief.SlotGame.GameAudio.Play(EgyptEternalDefine.AudioFilePath.OMEN);
      this.m_mgOmen.node.active = true;
      this.m_mgOmen.setAnimation(0, "Start", false);
      this.m_mgOmen.setEventListener((trackEntry, event: any) => {
         switch (event.data.name) {
            case "MG_Win": {
               this.m_mgOmen.setEventListener(null);
               this.ShowFrankWin();
               break;
            }
         }
      })
      this.m_mgOmen.setCompleteListener(() => {
         this.m_mgOmen.setCompleteListener(null);

         this.m_mgOmen.node.active = false;
         if (isValid(cb, true)) {
            cb();
         }
      })
   }

   /**紫色phase觸碰發光 */
   private PurplePhaseTouchEvent() {
      if (!isValid(this.m_phaseSpine[PhaseType.PURPLE].getCurrent(1), true)) {
         let trackEntry = this.m_phaseSpine[PhaseType.PURPLE].setAnimation(1, "Track1_Hint", false)
         this.m_phaseSpine[PhaseType.PURPLE].setTrackCompleteListener(trackEntry, () => {
            this.m_phaseSpine[PhaseType.PURPLE].setTrackCompleteListener(trackEntry, null);
            this.m_phaseSpine[PhaseType.PURPLE].clearTrack(1);
         })
      }
   }

   /**綠色phase觸碰發光 */
   private GreenPhaseTouchEvent() {
      if (!isValid(this.m_phaseSpine[PhaseType.GREEN].getCurrent(1), true)) {
         let trackEntry = this.m_phaseSpine[PhaseType.GREEN].setAnimation(1, "Track1_Hint", false)
         this.m_phaseSpine[PhaseType.GREEN].setTrackCompleteListener(trackEntry, () => {
            this.m_phaseSpine[PhaseType.GREEN].setTrackCompleteListener(trackEntry, null);
            this.m_phaseSpine[PhaseType.GREEN].clearTrack(1);
         })
      }
   }
}
