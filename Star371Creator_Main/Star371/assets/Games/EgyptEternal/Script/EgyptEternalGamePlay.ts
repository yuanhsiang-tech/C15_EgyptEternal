import EgyptEternalMain from "./EgyptEternalMain";
import { _decorator, log, v3 } from 'cc';
import { EventDefine } from "../../../Script/Define/EventDefine";
import { GameCommonCommand } from "../../../Script/Game/Common/GameCommonCommand";
import EgyptEternalMgReel from "./EgyptEternalMgReel";
import { EffectData, FRANKENSTEIN_G2U_PROTOCOL, FRANKENSTEIN_U2G_PROTOCOL, EgyptEternalProtocol, PhaseType, PlateData } from "./EgyptEternalProtocol";

import EgyptEternalDefine from "./EgyptEternalDefine";
import EgyptEternalEffectView, { ReelStopSoundAttribute, STOP_SOUND_PRIORITY } from "./EgyptEternalEffectView";
import { Vec3 } from "cc";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import { CarriarParser } from "db://assets/Script/Net/Command/Command";
import * as FKP from './frankenstein_pb';
import { EgyptEternalBind } from "./EgyptEternalBind";
import EgyptEternalFgReel from "./EgyptEternalFgReel";

//=======================小記錄=========================================================

//MG判斷有無乘倍、解鎖符號，不需要跟上一個盤面做相比，但BG要，為了記錄有無新的，有新的才表演
//位置資訊則全部傳
//總贏分都要自己算，server只給當前盤面贏分

//

//======================================================================================


export enum GamePlayType {
   NONE,
   MAIN,
   BONUS,
   FREE,
}


export interface GamePlay {
   /**目前在哪一個GamePlayType */
   GameType: GamePlayType;
   /**是否為特色遊戲 */
   IsFeatureGame: boolean;
   /**自動玩時間 */
   AutoplayTime: number;


   /**
    * 收到Ack後
    * @param cmd Json Command
    */
   OnCommand(type: number, content: Uint8Array): void;

   /**
    * 進場表演
    * @param isAutoplay 是否為自動玩
    * @param isSkip 是否要跳過進場表演
    */
   ShowEnter(isAutoplay?: boolean, isSkip?: boolean): void;
   /**進場表演結束 */
   IsShowEnterEnd(): boolean;

   /**退場表演 */
   ShowLeave(): void;
   /**退場表演結束 */
   IsShowLeaveEnd(): boolean;

   /**
    * 輪帶開始轉(Client傳送Request)
    * @param bet BetValue
    * @param cheatCode 作弊碼
    * @param isFastMode 是否為快速模式
    * @param isAutoplay 是否為自動玩
    * @param isTurbo 是否為Turbo模式
    */
   StartSpin(bet?: number, cheatCode?: number, isFastMode?: boolean, isAutoplay?: boolean, isTurbo?: boolean): void;
   /**Client是否收到Ack */
   IsSpinAckReceive(): boolean;

   /**輪帶是否快停 */
   IsStopHard(): void;

   /**輪帶是否完全停止 */
   IsPlateStop(): boolean;

   /**
    * 停輪後要做的各種表演
    * @param isTurbo 是否為Turbo模式
    */
   StartAward(isTurbo?: boolean): void;
   /**表演結束 */
   IsAwardEnd(): boolean;

   /**下一把是哪一個GamePlayType */
   NextGamePlayType(): GamePlayType

   /**共用層SpinAck(短競賽用) */
   CommonSpinAck(): GameCommonCommand.CommonSpinAck;
}

export class MainGamePlay implements GamePlay {
   m_bind: EgyptEternalBind;
   GameType: GamePlayType = GamePlayType.MAIN;
   m_gameMain: EgyptEternalMain;
   IsFeatureGame: boolean;
   AutoplayTime = 0;
   m_mgReel: EgyptEternalMgReel;
   m_spinAck: EgyptEternalProtocol.SpinFakeAck = null;
   m_effectView: EgyptEternalEffectView;
   m_freeplay: FreePlay;
   m_progress: number = 0;

   /**是否有Multiply Symbol */
   m_hasMultiply: boolean = false;

   /**是否有AddRow Symbol */
   m_hasAddRow: boolean = false;


   constructor(bind: EgyptEternalBind) {
      this.m_bind = bind;
      this.m_gameMain = bind.GameMain;
      this.m_mgReel = bind.MGReel;
      this.m_effectView = bind.EffectView;
      this.IsFeatureGame = false;
   }

   /**收到SpinAck */
   OnCommand(type: number, content: Uint8Array): void {

      log("MG Spin Ack");

      //塞spinAck資料
      let data = ProtoParse(content, FKP.SpinAckSchema)
      log("Proto結構 :", data)
      this.m_spinAck = EgyptEternalProtocol.SpinFakeAck.FromProto(content)
      log(this.m_spinAck);

      if (type == FRANKENSTEIN_G2U_PROTOCOL.SPIN_ACK) {
         if (this.m_spinAck.ackType == EgyptEternalProtocol.AckType.AT_SUCCESS) {
            //塞盤面資料 + Bonus球上分數
            let newPlateData: PlateData[][] = [];
            let newEffectData: EffectData[][] = [];
            let isReelHasScatter: boolean[] = [false, false, false, false, false];
            let isReelHasBonus: boolean[] = [false, false, false, false, false];
            let scatterNearWin: boolean[] = [false, false, false, false, false];
            let bonusNearWin: boolean[] = [false, false, false, false, false];
            let finalNearWin: boolean[] = [false, false, false, false, false];
            let isFirstReelHasFrank: boolean = false;
            let hasScatter: boolean = false;
            let hasGreenBall: boolean = false;

            let fgScatterCount: number = 0;
            let bonusCount: number = 0;
            let reelStopSound: ReelStopSoundAttribute[] = []

            for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
               newPlateData[i] = [];
               newEffectData[i] = [];
               reelStopSound[i] = new ReelStopSoundAttribute();
               for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
                  newEffectData[i][j] = new EffectData();
                  newPlateData[i][j] = new PlateData();
                  newPlateData[i][j].symbolId = this.m_spinAck.plate[i][j];
               }
               //音效判斷

               //音效判斷
               if (isReelHasBonus[i]) {
                  reelStopSound[i].path.push(EgyptEternalDefine.AudioFilePath.SCATTER_STOP);
                  reelStopSound[i].priority.push(STOP_SOUND_PRIORITY.SCATTER_AND_GREENBALL);
               }
               else if (isReelHasScatter[i]) {
                  reelStopSound[i].path.push(EgyptEternalDefine.AudioFilePath.SCATTER_STOP);
                  reelStopSound[i].priority.push(STOP_SOUND_PRIORITY.SCATTER_AND_GREENBALL);
               }
               else {
                  reelStopSound[i].path.push(EgyptEternalDefine.AudioFilePath.REEL_STOP);
                  reelStopSound[i].priority.push(STOP_SOUND_PRIORITY.REEL_STOP);
               }
            }

            if (isFirstReelHasFrank) {
               // reelStopSound[0].path[0] = EgyptEternalDefine.AudioFilePath.FRANK_STOP;
               // reelStopSound[0].priority[0] = STOP_SOUND_PRIORITY.FRANK;
            }


            //NearWin判斷
            let scatterNearWinCount: number = 0;
            for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
               if (scatterNearWinCount >= 2) {
                  scatterNearWin[i] = true;
               }
               if (isReelHasScatter[i]) {
                  scatterNearWinCount = scatterNearWinCount + 1;
               }

               if (isFirstReelHasFrank && i > 0) {
                  bonusNearWin[i] = true;
               }
            }
            if (isFirstReelHasFrank) {
               finalNearWin = bonusNearWin.slice();
            }
            else {
               finalNearWin = scatterNearWin.slice();
            }


            //傳計算好的值給表演層
            // this.m_effectView.SpinAck = this.m_spinAck;

            this.m_effectView.MgFgPlate = newPlateData;
            // this.m_effectView.MgFgEffectData = newEffectData;

            // this.m_effectView.PrePhase = this.m_effectView.Phase.slice();
            // this.m_effectView.Phase = this.m_spinAck.plateData.phase.slice();

            // this.m_effectView.TotalFlyCollectCount[PhaseType.PURPLE] = fgScatterCount;
            // this.m_effectView.TotalFlyCollectCount[PhaseType.GREEN] = bonusCount;


            // this.m_effectView.IsFirstReelHasFrank = isFirstReelHasFrank;

            // this.m_effectView.HasAddSpin = (fgScatterCount >= 3) || (this.m_spinAck.plateData.phase[PhaseType.PURPLE] == 6); //紫色FG球有三個以上或紫球最高等時

            // this.m_effectView.ThisRoundTotalWinValue = this.m_spinAck.plateData.plateWin;
            // this.m_effectView.FgTotalWin = this.m_effectView.FgTotalWin.plus(this.m_spinAck.plateData.plateWin);

            // this.m_effectView.TotalFreeRound = this.m_effectView.FgSpinned + this.m_spinAck.plateData.remainFreeRound;

            // this.m_effectView.ReelStopSound = reelStopSound.slice();

            // this.m_effectView.HasScatter = hasScatter;
            // this.m_effectView.HasGreenBall = hasGreenBall;

            //判斷在MG Spin時，下個階段為何
            let isEnterFeatureGame: boolean = false;
            if (this.NextGamePlayType() == GamePlayType.FREE) {
               isEnterFeatureGame = true;

               // this.m_effectView.RemainFreeRound = this.m_spinAck.plateData.remainFreeRound;
            }

            this.m_mgReel.SetFinalData(this.m_spinAck.plate, finalNearWin);
            EventDispatcher.Shared.Dispatch(EventDefine.Game.SPIN_WILL_FINISH, isEnterFeatureGame);
         }
         else {
            GamesChief.SlotGame.GameBar.StopAutoPlay();

            const initPlate: EgyptEternalProtocol.Symbol[][] = [
               [EgyptEternalProtocol.Symbol.A, EgyptEternalProtocol.Symbol.A, EgyptEternalProtocol.Symbol.A, EgyptEternalProtocol.Symbol.A],
               [EgyptEternalProtocol.Symbol.K, EgyptEternalProtocol.Symbol.K, EgyptEternalProtocol.Symbol.K, EgyptEternalProtocol.Symbol.K],
               [EgyptEternalProtocol.Symbol.Q, EgyptEternalProtocol.Symbol.Q, EgyptEternalProtocol.Symbol.Q, EgyptEternalProtocol.Symbol.Q],
               [EgyptEternalProtocol.Symbol.J, EgyptEternalProtocol.Symbol.J, EgyptEternalProtocol.Symbol.J, EgyptEternalProtocol.Symbol.J],
               [EgyptEternalProtocol.Symbol.TEN, EgyptEternalProtocol.Symbol.TEN, EgyptEternalProtocol.Symbol.TEN, EgyptEternalProtocol.Symbol.TEN]
            ];
            let newPlateData: EgyptEternalProtocol.Symbol[][] = [];
            let newEffectData: EffectData[][] = [];
            let reelStopSound: ReelStopSoundAttribute[] = []
            for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
               newPlateData[i] = [];
               newEffectData[i] = [];
               reelStopSound[i] = new ReelStopSoundAttribute();
               for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
                  newEffectData[i][j] = new EffectData();
                  newPlateData[i][j] = initPlate[i][j];
                  // newPlateData[i][j].symbolId = initPlate[i][j];
               }
            }

            this.m_mgReel.SetFinalData(newPlateData);

            //判斷Bet是否正確
            if (this.m_spinAck.ackType === GameCommonCommand.SPIN_ACK_TYPE.TIME_STAMP_INVALID) {
               EventDispatcher.Shared.Dispatch(EventDefine.Game.CURRENCY_REVERT_BY_BET, GamesChief.SlotGame.GameBar.BetValue);
               EventDispatcher.Shared.Dispatch(EventDefine.Game.SPIN_INVALID);
            }
         }



      }

   }



   ShowEnter(isAutoplay: boolean, isSkip: boolean): void {
      log("進入mainGame");
      this.m_effectView.MgShowEnter();
      this.m_mgReel.node.active = true;
   }

   IsShowEnterEnd(): boolean {
      return true;
   }

   ShowLeave(): void {
      log("離開mainGame");
   }

   IsShowLeaveEnd(): boolean {
      return true;
   }

   public StartSpin(bet: number, cheatCode: number, isFastMode: boolean, isTurbo: boolean = false) {
      //初始化
      this.m_spinAck = null;
      this.m_effectView.Turbo = isTurbo;
      this.m_effectView.MgResetParameter();

      //轉輪啟動
      this.m_mgReel.SpinReel(isFastMode, null, isTurbo);

      //表演動畫
      this.m_effectView.ReelSpinAni();



      //Request
      log("MG Spin Request");
      let req = new EgyptEternalProtocol.SpinReq();
      req.bet = bet;
      req.cheatType = cheatCode;
      req.timeStamp = GamesChief.SlotGame.GetCommonGameInfo().BetUnlockTS;
      //TODO Ide
      // this.m_gameMain.SendGameCommand(FRANKENSTEIN_U2G_PROTOCOL.SPIN_REQ, req.ToProto());
      this.OnCommand(FRANKENSTEIN_G2U_PROTOCOL.SPIN_ACK, new Uint8Array());
   }

   IsSpinAckReceive(): boolean {
      return this.m_spinAck != null;
   }

   IsStopHard(): void {
      this.m_mgReel.StopHard();
   }


   IsPlateStop() {
      return this.m_mgReel.IsPlateStopped;
   }

   StartAward(isTurbo?: boolean): void {
      EventDispatcher.Shared.Dispatch(EventDefine.Game.SPIN_FINISH);
      // this.m_effectView.SpinAck = this.m_spinAck;

      this.m_effectView.MgShowCollect(isTurbo);
   }

   IsAwardEnd(): boolean {
      return this.m_effectView.IsShowEnd;
   }

   NextGamePlayType(): GamePlayType {
      // if (this.m_spinAck.plateData.remainFreeRound > 0) {
      //    return GamePlayType.FREE;
      // }
      // else if (this.m_spinAck.plateData.remainBonusRound > 0) {
      //    return GamePlayType.BONUS;
      // }
      // else {
      return GamePlayType.MAIN;
      // }
   }

   CommonSpinAck() {
      return this.m_spinAck.common;
   }

   /**產出隨機不包含特殊Symbol的Symbol */
   public CreateRandomSymbol(): number {
      let symbolId = Math.floor(Math.random() * 8) + 5;//4~13
      return symbolId;
   }
}


export class FreePlay implements GamePlay {
   m_bind: EgyptEternalBind;
   GameType: GamePlayType = GamePlayType.FREE;
   m_mainPlay: MainGamePlay;
   m_freeplay: FreePlay;
   m_gameMain: EgyptEternalMain;
   IsFeatureGame: boolean;
   AutoplayTime = 0;
   m_fgReel: EgyptEternalFgReel;
   m_spinAck: EgyptEternalProtocol.SpinAck = null;
   m_effectView: EgyptEternalEffectView;
   m_progress: number = 0;
   m_winEffectEnd: boolean = false;
   m_fgScatterCount: number = 0;


   m_isFgToBg: boolean = false;
   MainGamePlay: MainGamePlay;


   constructor(bind: EgyptEternalBind) {
      this.m_bind = bind;
      this.m_gameMain = bind.GameMain;
      this.m_fgReel = bind.FGReel;
      this.m_effectView = bind.EffectView;
      this.IsFeatureGame = false;
   }

   OnCommand(type: number, content: Uint8Array): void {

      log("FG Spin Ack");
      let data = ProtoParse(content, FKP.SpinAckSchema)
      log("Proto結構 :", data)
      this.m_spinAck = EgyptEternalProtocol.SpinAck.FromProto(content)
      log(this.m_spinAck);

      if (type == FRANKENSTEIN_G2U_PROTOCOL.FREE_SPIN_ACK) {
         if (this.m_spinAck.ackType == EgyptEternalProtocol.AckType.AT_SUCCESS) {
            //塞盤面資料 + Bonus球上分數
            let newPlateData: PlateData[][] = [];
            let newEffectData: EffectData[][] = [];
            let isReelHasScatter: boolean[] = [false, false, false, false, false];
            let isReelHasBonus: boolean[] = [false, false, false, false, false];
            let scatterNearWin: boolean[] = [false, false, false, false, false];
            let bonusNearWin: boolean[] = [false, false, false, false, false];
            let finalNearWin: boolean[] = [false, false, false, false, false];
            let isFirstReelHasFrank: boolean = false;
            let hasScatter: boolean = false;
            let hasGreenBall: boolean = false;

            let fgScatterCount: number = 0;
            let bonusCount: number = 0;
            let reelStopSound: ReelStopSoundAttribute[] = []

            for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
               newPlateData[i] = [];
               newEffectData[i] = [];
               reelStopSound[i] = new ReelStopSoundAttribute();
               for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
                  newEffectData[i][j] = new EffectData();
                  newPlateData[i][j] = new PlateData();
                  newPlateData[i][j].symbolId = this.m_spinAck.plateData.plate[i][j];
                  newPlateData[i][j].jpType = this.m_spinAck.plateData.coinValueList[i][j].jpType;
                  newPlateData[i][j].coinValue = this.m_spinAck.plateData.coinValueList[i][j].value;

                  //判斷是否有Scatter、Bonus球
                  if (newPlateData[i][j].symbolId == EgyptEternalProtocol.Symbol.SCATTER) {
                     fgScatterCount = fgScatterCount + 1;
                     isReelHasScatter[i] = true;
                     hasScatter = true;
                  }
               }
               //音效判斷

               //音效判斷
               if (isReelHasBonus[i]) {
                  reelStopSound[i].path.push(EgyptEternalDefine.AudioFilePath.SCATTER_STOP);
                  reelStopSound[i].priority.push(STOP_SOUND_PRIORITY.SCATTER_AND_GREENBALL);
               }
               else if (isReelHasScatter[i]) {
                  reelStopSound[i].path.push(EgyptEternalDefine.AudioFilePath.SCATTER_STOP);
                  reelStopSound[i].priority.push(STOP_SOUND_PRIORITY.SCATTER_AND_GREENBALL);
               }
               else {
                  reelStopSound[i].path.push(EgyptEternalDefine.AudioFilePath.REEL_STOP);
                  reelStopSound[i].priority.push(STOP_SOUND_PRIORITY.REEL_STOP);
               }
            }

            if (isFirstReelHasFrank) {
               reelStopSound[0].path[0] = EgyptEternalDefine.AudioFilePath.FRANK_STOP;
               reelStopSound[0].priority[0] = STOP_SOUND_PRIORITY.FRANK;
            }


            //NearWin判斷
            let scatterNearWinCount: number = 0;
            for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
               if (scatterNearWinCount >= 2) {
                  scatterNearWin[i] = true;
               }
               if (isReelHasScatter[i]) {
                  scatterNearWinCount = scatterNearWinCount + 1;
               }

               if (isFirstReelHasFrank && i > 0) {
                  bonusNearWin[i] = true;
               }
            }
            if (isFirstReelHasFrank) {
               finalNearWin = bonusNearWin.slice();
            }
            else {
               finalNearWin = scatterNearWin.slice();
            }


            //傳計算好的值給表演層
            this.m_effectView.SpinAck = this.m_spinAck;

            this.m_effectView.MgFgPlate = newPlateData;
            this.m_effectView.MgFgEffectData = newEffectData;

            this.m_effectView.PrePhase = this.m_effectView.Phase.slice();
            this.m_effectView.Phase = this.m_spinAck.plateData.phase.slice();

            this.m_effectView.TotalFlyCollectCount[PhaseType.PURPLE] = fgScatterCount;
            this.m_effectView.TotalFlyCollectCount[PhaseType.GREEN] = bonusCount;


            this.m_effectView.IsFirstReelHasFrank = isFirstReelHasFrank;

            this.m_effectView.HasAddSpin = (fgScatterCount >= 3) || (this.m_spinAck.plateData.phase[PhaseType.PURPLE] == 6); //紫色FG球有三個以上或紫球最高等時

            this.m_effectView.ThisRoundTotalWinValue = this.m_spinAck.plateData.plateWin;
            this.m_effectView.FgTotalWin = this.m_effectView.FgTotalWin.plus(this.m_spinAck.plateData.plateWin);

            this.m_effectView.TotalFreeRound = this.m_effectView.FgSpinned + this.m_spinAck.plateData.remainFreeRound;

            this.m_effectView.ReelStopSound = reelStopSound.slice();

            this.m_effectView.HasScatter = hasScatter;
            this.m_effectView.HasGreenBall = hasGreenBall;

            //判斷在MG Spin時，下個階段為何
            let isEnterFeatureGame: boolean = false;
            if (this.NextGamePlayType() == GamePlayType.FREE) {
               isEnterFeatureGame = true;

               this.m_effectView.RemainFreeRound = this.m_spinAck.plateData.remainFreeRound;
            }

            this.m_fgReel.SetFinalData(newPlateData, finalNearWin);
            EventDispatcher.Shared.Dispatch(EventDefine.Game.SPIN_WILL_FINISH, isEnterFeatureGame);
         }
         else {
            GamesChief.SlotGame.GameBar.StopAutoPlay();

            const initPlate: number[][] = [[5, 5, 5], [6, 6, 6], [7, 7, 7], [8, 8, 8], [9, 9, 9]];
            let newPlateData: PlateData[][] = [];
            let newEffectData: EffectData[][] = [];
            let reelStopSound: ReelStopSoundAttribute[] = []
            for (let i = 0; i < EgyptEternalDefine.MAIN_COLUMN; i++) {
               newPlateData[i] = [];
               newEffectData[i] = [];
               reelStopSound[i] = new ReelStopSoundAttribute();
               for (let j = 0; j < EgyptEternalDefine.MAIN_ROW; j++) {
                  newEffectData[i][j] = new EffectData();
                  newPlateData[i][j] = new PlateData();
                  newPlateData[i][j].symbolId = initPlate[i][j];
               }
            }

            //傳計算好的值給表演層
            this.m_effectView.SpinAck = this.m_spinAck;

            this.m_effectView.MgFgPlate = newPlateData;
            this.m_effectView.MgFgEffectData = newEffectData;

            this.m_effectView.ReelStopSound = reelStopSound.slice();

            this.m_fgReel.SetFinalData(newPlateData);

            //判斷Bet是否正確
            if (this.m_spinAck.ackType === GameCommonCommand.SPIN_ACK_TYPE.TIME_STAMP_INVALID) {
               EventDispatcher.Shared.Dispatch(EventDefine.Game.CURRENCY_REVERT_BY_BET, GamesChief.SlotGame.GameBar.BetValue);
               EventDispatcher.Shared.Dispatch(EventDefine.Game.SPIN_INVALID);
            }
         }



      }


   }

   ShowEnter(isAutoplay: boolean, isSkip: boolean): void {
      log("進入FreeGame");

      EventDispatcher.Shared.Dispatch(EventDefine.Game.ENTER_FREE_GAME);
      this.m_effectView.FgShowEnter(isAutoplay, isSkip);
   }

   IsShowEnterEnd(): boolean {
      return this.m_effectView.IsShowEnd;
   }

   ShowLeave(): void {
      log("離開FreeGame");

      this.m_effectView.FgShowLeave();
   }

   IsShowLeaveEnd(): boolean {
      return this.m_effectView.IsShowEnd;
   }

   StartSpin(bet: number, cheatCode: number, isFastMode: boolean, isTurbo?: boolean) {
      log("FG Spin Request");
      //初始化
      this.m_spinAck = null;
      this.m_effectView.Turbo = isTurbo;
      this.m_effectView.FgResetParameter();

      //轉輪啟動
      this.m_fgReel.SpinReel(isFastMode, null, isTurbo);

      //表演動畫
      this.m_effectView.FgSpinned = this.m_effectView.FgSpinned + 1;
      this.m_effectView.SetFgSpinnedLabel(this.m_effectView.FgSpinned);
      this.m_effectView.ReelSpinAni();

      //Request
      this.m_gameMain.SendGameCommand(FRANKENSTEIN_U2G_PROTOCOL.FREE_SPIN_REQ);
   }

   IsStopHard(): void {
      this.m_fgReel.StopHard();
   }

   IsSpinAckReceive(): boolean {
      return this.m_spinAck != null;
   }

   IsPlateStop() {
      return this.m_fgReel.IsPlateStopped;
   }


   StartAward(): void {
      EventDispatcher.Shared.Dispatch(EventDefine.Game.SPIN_FINISH);

      this.m_effectView.FgShowCollect();
   }

   IsAwardEnd(): boolean {
      return this.m_effectView.IsShowEnd;
   }


   NextGamePlayType(): GamePlayType {
      if (this.m_spinAck.plateData.remainBonusRound > 0) {
         return GamePlayType.BONUS;
      }
      else if (this.m_spinAck.plateData.remainFreeRound > 0) {
         return GamePlayType.FREE;
      }
      else {
         return GamePlayType.MAIN;
      }
   }

   CommonSpinAck() {
      return this.m_spinAck.common;
   }
}

