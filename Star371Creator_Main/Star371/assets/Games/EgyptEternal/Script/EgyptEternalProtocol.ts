import { _decorator, Node } from 'cc';
import { GameCommonCommand } from '../../../Script/Game/Common/GameCommonCommand';
import { CarriarDecorator, CarriarParser } from 'db://assets/Script/Net/Command/Command';
import * as FKP from './frankenstein_pb';
import type { Int32List } from '../../../Script/Proto/gt2/list_pb';

export class PlateData {
   symbolId: number = EgyptEternalProtocol.Symbol.JP;
   coinValue: BigNumber = null;
   jpType: number = -1;
}

export class EffectData {
   node: Node = null;
   symbolId: number = EgyptEternalProtocol.Symbol.JP;
   coinValue: BigNumber = null;
   type: number = -1;
   isCollect: boolean = false;
   track: number = 0;
   socket: number = 0;
}

export class CreateRandomData {
   symbolId: number = EgyptEternalProtocol.Symbol.JP;
   type: number = EgyptEternalProtocol.JpType.MAX;
   value: BigNumber = null;
}

export enum PhaseType {
   PURPLE = 0,
   GREEN = 1,
   Max = 2,
}

//=========================================================================
//======================================Protocol======================================

export enum FRANKENSTEIN_U2G_PROTOCOL {
   GAME_INFO_REQ = FKP.U2G.U2G_GAME_INFO_REQ, // ()    遊戲資訊要求
   SPIN_REQ = FKP.U2G.U2G_SPIN_REQ, // (SpinReq)    MainGame押注要求
   FREE_SPIN_REQ = FKP.U2G.U2G_FREE_SPIN_REQ, // ()    FreeGame押注要求
   BONUS_SPIN_REQ = FKP.U2G.U2G_BONUS_SPIN_REQ, // ()    BonusGame押注要求
   // 以下均為共用元件協定
};

export enum FRANKENSTEIN_G2U_PROTOCOL {
   GAME_INFO_ACK = FKP.G2U.G2U_GAME_INFO_ACK, // (sequence)(GameInfoAck)    遊戲資訊回應
   SPIN_ACK = FKP.G2U.G2U_SPIN_ACK, // (sequence)(SpinAck)    MainGame押注回應
   FREE_SPIN_ACK = FKP.G2U.G2U_FREE_SPIN_ACK, // (sequence)(SpinAck)    FreeGame押注回應
   BONUS_SPIN_ACK = FKP.G2U.G2U_BONUS_SPIN_ACK, // (SpinAck)    BonusGame押注回應
   // 以下均為共用元件協定
};



export namespace EgyptEternalProtocol {

   export enum AckType {
      AT_SUCCESS = FKP.AckType.AckType_SUCCESS, //成功
      AT_MONEY_NOT_ENOUGH = FKP.AckType.AckType_MONEY_NOT_ENOUGH, //錢不夠
      AT_MONEY_ABNORMAL = FKP.AckType.AckType_MONEY_ABNORMAL, //金額異常
      AT_STATE_ERROR = FKP.AckType.AckType_STATE_ERROR, //遊戲狀態錯誤
      AT_NOT_IN_MAIN = FKP.AckType.AckType_NOT_IN_MAIN, //不在MG狀態
      AT_NOT_IN_FREE = FKP.AckType.AckType_NOT_IN_FREE, //不在FG狀態
      AT_NOT_IN_BONUS = FKP.AckType.AckType_NOT_IN_BONUS, //不在BG狀態
      AT_MAX = FKP.AckType.AckType_MAX,
   };

   export enum AwardType {
      NONE = FKP.AwardType.AwardType_NONE, //沒中獎
      LINE = FKP.AwardType.AwardType_LINE, //線獎(普通中獎)
      FREE = FKP.AwardType.AwardType_FREE, //FreeGame
      BONUS = FKP.AwardType.AwardType_BONUS, //BonusGame
      JP_MINI = FKP.AwardType.AwardType_JP_MINI,  //中MINI
      JP_MINOR = FKP.AwardType.AwardType_JP_MINOR,  //中MINOR
      JP_MAJOR = FKP.AwardType.AwardType_JP_MAJOR, //中MAJOR
      JP_MEGA = FKP.AwardType.AwardType_JP_MEGA, //中MEGA
      JP_GRAND = FKP.AwardType.AwardType_JP_GRAND, //中GRAND
      MAX = FKP.AwardType.AwardType_MAX, //因DB(PlayerRelief_GameAward)型別問題, AWARD_TYPE使用不能超過0x7fff
   };

   export enum EgyptEternalSpinStates {
      NONE = 0, //無(default)
      FG_START = 1, //Free Game開頭宣告
      FG_SPIN = 2, //Free Game進行中
      BG_START = 3, //Bonus Game開頭宣告
      BG_SPIN = 4, //Bonus Game進行中
      MAX = 5,
   };

   export enum JpType {
      MINI = 0, //MINI
      MINOR = 1, //MINOR
      MAJOR = 2, //MAJOR
      MEGA = 3, //MEGA
      GRAND = 4, //GRAND
      MAX = 5, //沒中
   };

   export enum Symbol {
      CHEST = 0, // 寶箱
      SPHINX = 1, // 獅身人面
      WEDJAT = 2, // 荷魯斯之眼
      ANKH = 3, // 生命之符
      SCEPTER = 4, // 生命權杖
      A = 5, // A
      K = 6, // K
      Q = 7, // Q
      J = 8, // J
      TEN = 9, // J
      WILD = 10, // Wild
      SCATTER = 11, // (Scatter)
      JP = 12, // (JP)
      NORMAL_SYMBOL_MAX_ID = 12, // (MaxID)
      JP_GRAND = 13,    // Grand 
      JP_MAJOR = 14,    // Major
      JP_MINOR = 15,    // Minor 
      JP_MINI = 16    // Mini 
   };

   @CarriarDecorator.ClassName("CoinValue")
   export class CoinValue extends CarriarParser.AliasDefine {
      jpType: number = 0;	//JP種類(JP_TYPE_MAX表示沒有)
      value: BigNumber = null;	//贏分

      constructor() {
         super(
            ["jpType", "jt"],
            ["value", "v", BigNumber],
         )
      };
   }

   @CarriarDecorator.ClassName("Pos")
   export class Pos extends CarriarParser.AliasDefine {
      column: number = 0;
      row: number = 0;

      constructor() {
         super(
            ["column", "c"],
            ["row", "r"],
         )
      };
   }

   @CarriarDecorator.ClassName("LineAward")
   export class LineAward extends CarriarParser.AliasDefine {
      symbol: Symbol = null;
      line: number = 0;
      conn: number = 0;

      constructor() {
         super(
            ["symbol", "s"],
            ["line", "l"],
            ["conn", "c"],
         )
      };
   }

   @CarriarDecorator.ClassName("PlateData")
   export class PlateData extends CarriarParser.AliasDefine {
      //Base
      plate: Symbol[][] = [];	//盤面
      awardTypeFlag: AwardType = null;	//當前盤面中獎結果
      lineAwardList: LineAward[] = [];	//中獎資訊, 當(awardTypeFlag & AWARD_TYPE_LINE) == 1才有意義
      coinValueList: CoinValue[][] = [];	//硬幣資訊
      phase: number[] = [];	//各階段硬幣(01->紫綠)
      //FG
      remainFreeRound: number = 0;	//FG剩餘轉數
      //BG
      remainBonusRound: number = 0;	//BG剩餘轉數
      movePath: Pos[] = [];	//移動路徑(座標為科學怪人左上角的座標, 盤面左上角為原點, 往右往下為正)
      //other
      plateWin: BigNumber = null;	//此盤面總贏分, 如果需要累積總贏分, 請client自己累加

      public static FromProto(protoPlate: FKP.PlateData): PlateData {
         if (!protoPlate) {
            return null
         }
         const result = new PlateData()
         result.plate = protoPlate.plate.map((int32List: Int32List) => {
            return int32List.values.map((value: number) => value as unknown as Symbol)
         })
         result.awardTypeFlag = protoPlate.awardTypeFlag as AwardType
         result.lineAwardList = protoPlate.lineAwardList.map((protoLineAward: FKP.LineAward) => {
            const lineAward = new LineAward()
            lineAward.symbol = protoLineAward.symbol as unknown as Symbol
            lineAward.line = protoLineAward.line
            lineAward.conn = protoLineAward.conn
            return lineAward
         })
         result.coinValueList = protoPlate.coinValueList.map((coinValueList: FKP.CoinValueList) => {
            return coinValueList.values.map((protoCoinValue: FKP.CoinValue) => {
               const coinValue = new CoinValue()
               coinValue.jpType = protoCoinValue.jpType
               coinValue.value = new BigNumber(protoCoinValue.value)
               return coinValue
            })
         })
         result.phase = protoPlate.phase
         result.remainFreeRound = protoPlate.remainFreeRound
         result.remainBonusRound = protoPlate.remainBonusRound
         result.movePath = protoPlate.movePath.map((protoPos: FKP.Pos) => {
            const pos = new Pos()
            pos.column = protoPos.column
            pos.row = protoPos.row
            return pos
         })
         result.plateWin = protoPlate.plateWin != null ? new BigNumber(protoPlate.plateWin) : null
         return result
      }

      constructor() {
         super(
            ["plate", "p"],
            ["awardTypeFlag", "atf"],
            ["lineAwardList", "lal", LineAward],
            ["coinValueList", "cvl", CoinValue],
            ["phase", "ph_"],
            ["remainFreeRound", "rfr"],
            ["remainBonusRound", "rbr"],
            ["movePath", "mp", Pos],
            ["plateWin", "pw", BigNumber],
         )
      };
   }

   @CarriarDecorator.ClassName("GameInfoAck")
   export class GameInfoAck extends CarriarParser.AliasDefine {
      public static FromProto(data: Uint8Array): GameInfoAck {
         const ack = ProtoParse(data, FKP.GameInfoAckSchema)
         const result = new GameInfoAck()
         result.spinState = Number(ack.spinState) as EgyptEternalSpinStates
         result.jpInfo = ack.jpInfo.map((value: bigint) => new BigNumber(value))
         result.phase = ack.phase
         result.bet = new BigNumber(ack.bet).toNumber();
         result.mainPlate = PlateData.FromProto(ack.mainPlate)
         result.freePlate = PlateData.FromProto(ack.freePlate)
         result.lastPlate = PlateData.FromProto(ack.lastPlate)
         result.fgSpinned = ack.fgSpinned
         return result;
      }

      spinState: EgyptEternalSpinStates = null;	//Spin階段(給client用在斷線重連, client可以用此判斷在哪個階段)
      //現在只要傳抽水即可, 設定平台會傳
      jpInfo: BigNumber[] = [];	//JP 抽水
      phase: number[] = [];	//累積進度條(01->紫綠)(無論有無斷線重連都讀取這個)
      //只有中FeatureGame才會資料(斷線重連要用)
      bet: number = 0;	//這次斷線重連的Bet

      mainPlate: PlateData = null;	//進Feature的MG盤面(用來在Feature結束時顯示)
      freePlate: PlateData = null;	//進Feature的FG盤面(用來在Feature結束時顯示)
      lastPlate: PlateData = null;	//前一個盤面(用來做斷線重連的起始盤面)
      fgSpinned: number = 0;   //已轉的FG次數
      currentFreeWin: BigNumber = null;	//目前累積的FG贏分
      currentPosition: Pos = null;   //科學怪人目前位置(左上角座標)
      currentBonusWin: BigNumber = null;	//目前累積的BG贏分
      currentGreenCount: number = 0;	//目前累積的綠球數
      jpSettingList: GameCommonCommand.JpSetting[] = [];
      unlockInfoList: GameCommonCommand.UnLockInfo[] = [];

      constructor() {
         super(
            ["spinState", "ss"],
            ["jpInfo", "ji", BigNumber],
            ["phase", "ph_"],
            ["bet", "b"],
            ["mainPlate", "mp", PlateData],
            ["freePlate", "fp", PlateData],
            ["lastPlate", "lp", PlateData],
            ["fgSpinned", "fgs"],
            ["currentFreeWin", "cfw", BigNumber],
            ["currentPosition", "cp", Pos],
            ["currentBonusWin", "cbw", BigNumber],
            ["currentGreenCount", "cgc"],
            ["jpSettingList", "jl", GameCommonCommand.JpSetting],
            ["unlockInfoList", "ul", GameCommonCommand.UnLockInfo],
         )
      };
   }

   @CarriarDecorator.ClassName("SpinReq")
   export class SpinReq extends CarriarParser.AliasDefine {
      bet: number = 0;
      cheatType: number = 0;
      timeStamp: number = 0;

      constructor() {
         super(
            ["bet", "b"],
            ["cheatType", "ct"],
            ["timeStamp", "buts"]
         )
      };

      public ToProto(): FKP.SpinReq {
         return ProtoCreate(FKP.SpinReqSchema, {
            bet: BigInt(this.bet),
            cheatType: this.cheatType,
         })
      }
   }

   @CarriarDecorator.ClassName("SpinAck")
   export class SpinAck extends CarriarParser.AliasDefine {
      public static FromProto(data: Uint8Array): SpinAck {
         const ack = ProtoParse(data, FKP.SpinAckSchema)
         const result = new SpinAck()
         result.ackType = ack.ackType
         result.jpInfo = ack.jpInfo.map((value: bigint) => new BigNumber(value))
         result.plateData = PlateData.FromProto(ack.plateData)
         result.common = ack.common as unknown as GameCommonCommand.CommonSpinAck
         return result
      }

      common: GameCommonCommand.CommonSpinAck = null; // 共用層 SpinAck
      ackType: number = AckType.AT_MAX;
      jpInfo: BigNumber[] = [];	//目前抽水的金額
      plateData: PlateData = null;

      constructor() {
         super(
            ["ackType", "at"],
            ["jpInfo", "ji", BigNumber],
            ["plateData", "pd", PlateData],
            ["common", "c", GameCommonCommand.CommonSpinAck],
         )
      };
   }
}




