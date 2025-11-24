import { color } from "cc";
import { GameBarWinEffectDefine } from "../../../Script/Game/Platform/GameBar/GameBarWinEffectDefine";



export enum SYMBOL {
   Ten = 10,
   J = 9,
   Q = 8,
   K = 7,
   A = 6,
   PAPER_MONEY = 5,
   SAFE = 4,
   POLICE_DOG = 3,
   POLICE = 2,
   PIG = 1,
   WILD = 0,

   MAX,
};

export enum BONUS_TYPE {
   NORMAL_VALUE = 0,
   ADD_ROW = 1,
   MULTIPLY = 2,
   MINI = 3,
   MINOR = 4,
   MAJOR = 5,
   MEGA = 6,
   GRAND = 7,
}

export enum SPRITE_NAME {
   RAISE_YOUR_BET = 0,
   WILD_APPEARS_RANDOM = 1,
   STICKY_WILD_APPEARS_RANDOM = 2,
   NORMAL = 3,
   INCREASE_BONUS_GAME = 4,
   NULL = 5,
}

export default class EgyptEternalDefine {
   //遊戲名稱
   static GAME_NAME = "EgyptEternal";

   static VERSION = "1.00";

   static MAIN_ROW = 4;
   static MAIN_COLUMN = 5;

   static THUNDER_BALL_NAME = "Symbol_10"
   static SCATTER_NAME = "Symbol_11"
   static JP_COIN_NAME = "Symbol_12"

   static MAX_JP_NUM = 5;

   static JP_SKIN_TYPE = ["Mini", "Minor", "Major", "Mega", "Grand", "Num"];//對應JpType

   static COIN_VALUE_ADDR = 4;

   static FG_BASE_ROUND = 6;

   static HIGH_VALUE = 3;

   //30線
   static LINE_TABLE_30 = [
      [1, 1, 1, 1, 1], //line 1
      [0, 0, 0, 0, 0], //line 2
      [2, 2, 2, 2, 2], //line 3
      [0, 1, 2, 1, 0], //line 4
      [2, 1, 0, 1, 2], //line 5
      [0, 0, 1, 2, 2], //line 6
      [2, 2, 1, 0, 0], //line 7
      [1, 0, 1, 2, 1], //line 8
      [1, 2, 1, 0, 1], //line 9
      [0, 1, 1, 1, 0], //line 10
      [2, 1, 1, 1, 2], //line 11
      [1, 0, 0, 1, 2], //line 12
      [1, 2, 2, 1, 0], //line 13
      [1, 1, 0, 1, 2], //line 14
      [1, 1, 2, 1, 0], //line 15
      [0, 0, 1, 2, 1], //line 16
      [2, 2, 1, 0, 1], //line 17
      [1, 0, 1, 2, 2], //line 18
      [1, 2, 1, 0, 0], //line 19
      [0, 0, 0, 1, 2], //line 20
      [2, 2, 2, 1, 0], //line 21
      [0, 1, 2, 2, 2], //line 22
      [2, 1, 0, 0, 0], //line 23
      [0, 1, 0, 1, 0], //line 24
      [2, 1, 2, 1, 2], //line 25
      [0, 1, 1, 1, 2], //line 26
      [2, 1, 1, 1, 0], //line 27
      [1, 0, 0, 0, 1], //line 28
      [1, 2, 2, 2, 1], //line 29
      [0, 1, 0, 1, 2], //line 30
   ];


   static AudioFileRoot = "Common/Sound/";

   static AudioFilePath = {
      //進入遊戲時的入場動畫
      MG_IN: EgyptEternalDefine.AudioFileRoot + "MG_in",
      FG_IN: EgyptEternalDefine.AudioFileRoot + "FG_in",

      //主遊戲的背景音樂
      MG_BGM: EgyptEternalDefine.AudioFileRoot + "MG_BGM",
      //免費遊戲的背景音樂
      FG_BGM: EgyptEternalDefine.AudioFileRoot + "FG_BGM",

      //普通Symbol停輪音效
      REEL_STOP: EgyptEternalDefine.AudioFileRoot + "reel_stop",
      SCATTER_STOP: EgyptEternalDefine.AudioFileRoot + "scatter_stop",
      JP_STOP: EgyptEternalDefine.AudioFileRoot + "jp_stop",
      JP_ROLL: EgyptEternalDefine.AudioFileRoot + "jp_roll",
      JP_WIN1: EgyptEternalDefine.AudioFileRoot + "jp_win1",
      JP_WIN2: EgyptEternalDefine.AudioFileRoot + "jp_win2",
      JP_WIN3: EgyptEternalDefine.AudioFileRoot + "jp_win3",
      JP_DECLARE: EgyptEternalDefine.AudioFileRoot + "jp_declare",
      SCATTER_RING: EgyptEternalDefine.AudioFileRoot + "scatter_ring",
      NEAR_WIN: EgyptEternalDefine.AudioFileRoot + "nearwin",

      //FG轉場動畫
      SCATTER_FLY: EgyptEternalDefine.AudioFileRoot + "scatter_fly",
      SCATTER_HIT1: EgyptEternalDefine.AudioFileRoot + "scatter_update1",
      SCATTER_HIT2: EgyptEternalDefine.AudioFileRoot + "scatter_update2",
      SCATTER_HIT3: EgyptEternalDefine.AudioFileRoot + "scatter_update3",
      SCATTER_HIT4: EgyptEternalDefine.AudioFileRoot + "scatter_update4",
      SCATTER_HIT5: EgyptEternalDefine.AudioFileRoot + "scatter_update5",
      SCATTER_WIN: EgyptEternalDefine.AudioFileRoot + "scatter_win",

      WHEEL_ROTATE: EgyptEternalDefine.AudioFileRoot + "wheel",
      WHEEL_WIN: EgyptEternalDefine.AudioFileRoot + "wheel_win",

      //FG 特效
      FG_ADD: EgyptEternalDefine.AudioFileRoot + "FG_add",
      FG_MULTIPLE: EgyptEternalDefine.AudioFileRoot + "FG_multiple",
      FG_ANUBIS1: EgyptEternalDefine.AudioFileRoot + "FG_anubis1",
      FG_ANUBIS2: EgyptEternalDefine.AudioFileRoot + "FG_anubis2",
      FG_RANDOMWILD1: EgyptEternalDefine.AudioFileRoot + "FG_random1",
      FG_RANDOMWILD2: EgyptEternalDefine.AudioFileRoot + "FG_random2",
      FG_WILD: EgyptEternalDefine.AudioFileRoot + "FG_wild",
      FG_WILD_CHANGE: EgyptEternalDefine.AudioFileRoot + "FG_wild_change",

      //連線中獎音效
      SYMBOL_AWARD: EgyptEternalDefine.AudioFileRoot + "symbol_award",

      //大獎預告(即將出大獎)
      MG_OMEN: EgyptEternalDefine.AudioFileRoot + "MG_omen",

      //結算表演宣告
      FG_END: EgyptEternalDefine.AudioFileRoot + "FG_end_declare",


   };

   // static WIN_EFFECT_SETTING = Object.freeze([	// 倍率, 跑分時間(秒), 表演類型, 音效時間(秒), 循環音效, 結尾音效, 背景音樂音量(0~1)
   //    Object.freeze(new GameBarWinEffectDefine.WinEffectSetting(0, 1, GameBarWinEffectDefine.WinEffectType.Normal, 2, EgyptEternalDefine.AudioFilePath.Scoringsound_L1, EgyptEternalDefine.AudioFilePath.SYMBOL_AWARD_OVER, 0.3)),
   //    Object.freeze(new GameBarWinEffectDefine.WinEffectSetting(1, 2, GameBarWinEffectDefine.WinEffectType.Normal, 2, EgyptEternalDefine.AudioFilePath.Scoringsound_L1, EgyptEternalDefine.AudioFilePath.SYMBOL_AWARD_OVER, 0.3)),
   //    Object.freeze(new GameBarWinEffectDefine.WinEffectSetting(5, 3, GameBarWinEffectDefine.WinEffectType.Expand, 3, EgyptEternalDefine.AudioFilePath.Scoringsound_L2, EgyptEternalDefine.AudioFilePath.SYMBOL_AWARD_OVER, 0.3)),
   //    Object.freeze(new GameBarWinEffectDefine.WinEffectSetting(10, 3, GameBarWinEffectDefine.WinEffectType.Normal, 3, EgyptEternalDefine.AudioFilePath.SYMBOL_AWARD_BIG, EgyptEternalDefine.AudioFilePath.SYMBOL_AWARD_OVER, 0.3)),
   // ]);

   static TURBO_ENABLE: boolean = true;
}
