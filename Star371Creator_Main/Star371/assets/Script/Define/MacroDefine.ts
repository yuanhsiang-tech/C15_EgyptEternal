// import { size, Color } from "cc";


// export namespace MacroDefine
// {
//     /** 逾時時間定義 */
//     export namespace TIMEOUT
//     {
//         export const PREPARATION    = 30;   // 秒
//         export const SCENE_SETTLE   = 30;   // 秒

//         export const FETCHER_INFO_CHECK     = 5;    // 秒
//         export const FETCHER_EXIST_CHECK    = 5;    // 秒
//         export const FETCHER_VERSION_CHECK  = 15;   // 秒
//         export const FETCHER_FETCH          = 120;  // 秒
//     }

//     /**
//      * 排程優先權定義
//      * - 排程優先權越小，越早執行
//      */
//     export namespace PROCESS_PRIORITY
//     {
//         export const PLAYER_SESSION         = 10;
//         export const VF_SESSION             = 20;

//         export const FETCHER_HIGH           = 152;
//         export const FETCHER_NORMAL         = 155;
//         export const FETCHER_LOW            = 158;
//         export const FRAMEWORK_RES_MASTER   = 160;

//         export const BEGINNER_GUIDE_CTRL    = 190;
//         export const GIFT_PACK_MANAGER      = 200;
//         export const LAUNCH_GAME_MANAGER    = 210;
//         export const PIGGY_PRODUCT_MANAGER  = 220;
//         export const TOURNAMENT_MANAGER     = 230;
//         export const SUCCESSIVE_PACK_MANAGER = 240;
//         export const SUCCESSIVE_PACK_THEME  = 250;
//         export const TOURNAMENT_THEME       = 260;
//         export const ACCOUNT_BINDING_MANAGER = 270;
//     }

//     /** 常駐圖層 ZIndex 定義 */
//     export namespace PERSIST_ZINDEX
//     {
//         export const GAME_INTERIOR      = 50;       // 遊戲內部圖層
//         export const ROOKIE_MISSION     = 80;       // 新手任務圖層
//         export const LOBBY_PORT         = 90;       // 大廳 Port 圖層 (Highlight)
//         export const TOP_BAR            = 100;      // TOP BAR 圖層
//         export const ALL_TOUCH          = 105;      // 全螢幕點擊監聽圖層
//         export const LEFT_PORT          = 110;      // 左側 Port 圖層 (Highlight)
//         export const LOBBY_SHORT_CUT    = 111;      // 大廳左側最後三款遊戲快捷圖層
//         export const GAME_EXTERIOR      = 150;      // 遊戲外部圖層
//         export const GAME_SUPERIOR      = 160;      // 遊戲最上層圖層 (不會被暫停)

//         export const BEGINNER_GUIDE     = 200;      // 新手引導圖層
//         export const VIEW_DEFER         = 210;      // 延緩顯示層級
//         export const VIEW_USER          = 211;      // 玩家操作層級
        
//         export const HINT_HAND          = 219;      // 提示小手圖層
//         export const LOADING_PROGRESS   = 220;      // 載入進度圖層

//         export const CURRENCY_MONITOR   = 299;	    // 玩家財產顯示圖層
//         export const SUPERIOR_LAYER     = 300;      // 最上層圖層

//         export const COMMON_TIP         = 320;      // 提示獎勵圖層
//         export const GIFT_PACK_LOADING  = 325;      // 禮包載入圖層
//         export const VIEW_MINI_EFFECT   = 330;      // 介面最小化特效圖層
//         export const LOADING            = 350;
//         export const TRANSITION         = 400;      // 轉場圖層
//         export const VIEW_DIALOG        = 450;      // 提示說明層級
//         export const MAINTENANCE        = 500;      // 維修頁面圖層
//         export const VIEW_ALERT         = 900;      // 警告顯示層級
//         export const BORDERLAND         = 1000;     // 邊界圖層
//         export const RECONNECT_LOADING  = 1900;     // 連線狀態 (Debug)
//         export const VEGAZILLA          = 2000;     // Vegazilla 圖層
//     }

//     /** 遊戲內部圖層 ZIndex 定義 */
//     export namespace GAME_INTERIORS_ZINDEX
//     {
//         export const DEFAULT        = 0;
//         export const GAME_BAR       = 50;
//         export const LITE_WIN       = 100;
//     }

//     /** 遊戲外部圖層 ZIndex 定義 */
//     export namespace GAME_EXTERIORS_ZINDEX
//     {
//         export const DEFAULT        = 0;
//     }
 
//     /** 遊戲最上層圖層 ZIndex 定義 */
//     export namespace GAME_SUPERIORS_ZINDEX
//     {
//         export const DEFAULT        = 0;
//         export const EPISODE        = 50;      // 全版演出圖層
//         export const PROCLAIM       = 100;     // 宣告圖層
//     }

//     /** 最上層圖層 ZIndex 定義 */
//     export namespace SUPERIOR_LAYER_ZINDEX
//     {
//         export const DEFAULT        = 0;
//     }
// }

// export namespace MacroDefine
// {
//     /** 常駐圖層名稱定義 */
//     export const PERSIST_LAYER_NAME =
//     {
//         [ MacroDefine.PERSIST_ZINDEX.GAME_INTERIOR  ]: "game_interior",
//         [ MacroDefine.PERSIST_ZINDEX.GAME_EXTERIOR  ]: "game_exterior",
//         [ MacroDefine.PERSIST_ZINDEX.GAME_SUPERIOR  ]: "game_superior",
//         [ MacroDefine.PERSIST_ZINDEX.SUPERIOR_LAYER ]: "superior_layer",
//         [ MacroDefine.PERSIST_ZINDEX.ROOKIE_MISSION ]: "rookie_mission",
//         [ MacroDefine.PERSIST_ZINDEX.BEGINNER_GUIDE ]: "beginner_guide",
//         [ MacroDefine.PERSIST_ZINDEX.VIEW_DEFER     ]: "view_defer_section",
//         [ MacroDefine.PERSIST_ZINDEX.VIEW_USER      ]: "view_user_section",
//         [ MacroDefine.PERSIST_ZINDEX.VIEW_DIALOG    ]: "view_dialog_section",
//         [ MacroDefine.PERSIST_ZINDEX.VIEW_ALERT     ]: "view_alert_section",
//     }
// }

// export namespace MacroDefine
// {
//     export const WEB_APP_VERSION            :string     = "9999.99.0";          // Web 環境使用的 App 版本
//     export const SERVER_UNIVERSAL_TIME      :string     = "+0800";              // 伺服器時區
//     export const SERVER_DAILY_RESET_TIME    :string     = "15:00:00+0800";      // 伺服器每日重置時間
//     export const TRY_RECONNECT_COUNT        :number     = 3;                    // 斷線重連次數
//     export const LINKER_TIMEOUT             :number     = 5000;                 // 連線逾時時間
//     export const LINKER_RETRY               :number     = 3;                    // 連線逾時時間

//     export const TXT_COLOR_COIN             :Color      = new Color(255,245,0);
//     export const TXT_COLOR_DIAMOND          :Color      = new Color(72,253,255);
// }