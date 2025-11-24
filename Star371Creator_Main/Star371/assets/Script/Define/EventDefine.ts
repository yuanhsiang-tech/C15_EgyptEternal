
export namespace EventDefine {
    export namespace System {
        export const UI_ITEM_EVENT_CLICKED:string           = "System.UI_ITEM_EVENT_CLICKED";                   // 介面項目點擊事件
        export const INTERFACE_ORIENTATION_CHANGED:string   = "System.INTERFACE_ORIENTATION_CHANGED";           // 介面方向改變事件
        export const ORIENTATION_CHANGED:string             = "System.ORIENTATION_CHANGED";                     // 裝置方向改變事件
        export const LAYOUT_STAGE_UI:string                 = "System.LAYOUT_STAGE_UI";                         // 更新子介面排版事件
        export const TWO_FINGERS_SWIPE:string               = "System.TWO_FINGERS_SWIPE";                       // 雙指滑動事件
        export const GAME_ICON_CLICK:string                 = "System.GAME_ICON_CLICK";                         // 點擊遊戲 icon 按鈕事件
        export const ENTER_GAME_LOBBY:string                = "System.ENTER_GAME_LOBBY";                        // 進入遊戲大廳事件
        export const ENTER_GAME:string                      = "System.ENTER_GAME";                              // 進入遊戲事件

        export const ON_VIEW_PRESENT:string                 = "System.ON_VIEW_PRESENT";                         // 介面開啟事件
        export const ON_VIEW_DISMISS:string                 = "System.ON_VIEW_DISMISS";                         // 介面關閉事件
        export const ON_VIEW_ENTER_FULL_SCREEN:string       = "System.ON_VIEW_ENTER_FULL_SCREEN";               // 介面進入全畫面顯示
        export const ON_VIEW_EXIT_FULL_SCREEN:string        = "System.ON_VIEW_EXIT_FULL_SCREEN";                // 介面進入全畫面顯示

        export const CANCEL_PROPERTY_CHANGE:string          = "System.CANCEL_PROPERTY_CHANGE";
        export const BACK_BUTTON_CONTROL:string             = "System.BACK_BUTTON_CONTROL";

        // 請求財產更新，可參考 CurrencyFlow.ts 的 ChangeRequest。可帶入三個參數：LogCoinType、CurrencyType、ChangeValue
        export const CURRENCY_UPDATE:string                 = "System.CURRENCY_UPDATE";
        // 請求取消一筆財產變動更新，可參考 CurrencyFlow.ts 的 RevertRequest。可帶入三個參數：LogCoinType、CurrencyType、ChangeValue
        export const CURRENCY_REVERT:string                 = "System.CURRENCY_REVERT";
        // 強制同步成 Server 目前的值，可參考 CurrencyFlow.ts 的 ForceSync。可帶入兩個參數：Force、CurrencyType
        export const CURRENCY_FORCE_UPDATE:string           = "System.CURRENCY_FORCE_UPDATE";
        // 金流變動通知，可參考 CurrencyFlow.ts 的 OnCurrencyFlowing。會收到七個參數：LogCoinType, CurrencyType, FromValue, ToValue, ChangeValue, IsSafe, Option
        export const CURRENCY_FLOWING:string                = "System.CURRENCY_FLOWING";
    }
}

export namespace EventDefine {
    export namespace Game {
        // GameBar Paytable按鈕
        export const INFO_BUTTON_PAYTABLE:string            = "System.INFO_BUTTON_PAYTABLE";

        /** 遊戲階段事件: 第一次進入 Idle 狀態(前) and 前導動畫後，只送一次 */
        export const GAME_START                             = "Game.GAME_START";
        /** 遊戲階段事件: 進入 Idle 狀態 (可以進行下一次 Spin) */
        export const ENTER_IDLE                             = "Game.ENTER_IDLE";
        /** 遊戲階段事件: 開始 Spin (按下 Spin 按鈕) */
        export const SPIN_START                             = "Game.SPIN_START";
        /** 遊戲階段事件: 收到 Server 停輪回應的時候發送即將停輪的事件，並帶入參數通知本局是否將進入 Free Game 或 Bonus Game */
        export const SPIN_WILL_FINISH                       = "Game.SPIN_WILL_FINISH";
        /** 遊戲階段事件: 停輪後檢查有無大獎特效結束後 (不管 MG, FG, BG) */
        export const SPIN_FINISH                            = "Game.SPIN_FINISH";
        /** 遊戲階段事件: 進入 Free Game (斷線重連回 FreeGame 也要發) (宣告面板按下 Button 後) */
        export const ENTER_FREE_GAME                        = "Game.ENTER_FREE_GAME";
        /** 遊戲階段事件: 離開 Free Game (宣告面板按下 Button 後，且在結算大獎宣告前) */
        export const LEAVE_FREE_GAME                        = "Game.LEAVE_FREE_GAME";
        /** 遊戲階段事件: 進入 Bonus Game (斷線重連回 BonusGame 也要發) (宣告面板按下 Button 後) */
        export const ENTER_BONUS_GAME                       = "Game.ENTER_BONUS_GAME";
        /** 遊戲階段事件: 離開 Bonus Game (宣告面板按下 Button 後，且在結算大獎宣告前) */
        export const LEAVE_BONUS_GAME                       = "Game.LEAVE_BONUS_GAME";
        /** 遊戲階段事件: 離開 FreeGame 或 BonusGame 後，回到 MainGame 的 Idle (要準備開始MainGame了) */
        export const LEAVE_FEATURE_TO_MAIN_IDLE             = "Game.LEAVE_FEATURE_TO_MAIN_IDLE";

        /** 遊戲五連線或六連線的事件，停輪後發 */
        export const LINES_OF_A_KIND                        = "Game.LINES_OF_A_KIND";
        export const GET_TROPHY                             = "Game.GET_TROPHY";

        export const CURRENCY_UPDATE_BY_BET                 = "Game.CURRENCY_UPDATE_BY_BET";
        export const CURRENCY_UPDATE_BY_REWARD              = "Game.CURRENCY_UPDATE_BY_REWARD";
        export const BAR_BET_VALUE_CHANGED                  = "Game.BAR_BET_VALUE_CHANGED";

        export const BAR_AUTO_PLAY_START                    = "Game.BAR_AUTO_PLAY_START";
        export const BAR_AUTO_PLAY_FINISHED                 = "Game.BAR_AUTO_PLAY_FINISHED";
        export const SPIN_INVALID                           = "Game.SPIN_INVALID";
        export const BET_INFO_UPDATE_APPLY                  = "Game.BET_INFO_UPDATE_APPLY";

        /** 解鎖條件變化 (betLockInfo: BetLockChangeInfo[], isBetChange: boolean = false) */
        export const BET_UP_STATUS_CHANGED                  = "Game.BET_UP_STATUS_CHANGED";
        export const CURRENCY_FORCE_UPDATE                  = "Game.CURRENCY_FORCE_UPDATE";
        export const CURRENCY_REVERT_BY_BET                 = "Game.CURRENCY_REVERT_BY_BET";
        export const SHOW_BET_UP_NOTIFY_PANEL               = "Game.SHOW_BET_UP_NOTIFY_PANEL";

        export const BET_UNLOCK                             = "Game.BET_UNLOCK";
        export const AFTER_BET_UNLOCK                       = "Game.AFTER_BET_UNLOCK";

        /** 請求暫停遊戲 (identifier: string) */
        export const PAUSE_GAME                             = "Game.PAUSE_GAME";

        /** 請求恢復遊戲 (identifier: string) */
        export const RESUME_GAME                            = "Game.RESUME_GAME";

        /** 請求阻擋平台 UI (identifier?: string) */
        export const BLOCK_PLATFORM_UI                      = "Game.BLOCK_PLATFORM_UI";

        /** 請求解鎖平台 UI (identifier?: string) */
        export const UNBLOCK_PLATFORM_UI                    = "Game.UNBLOCK_PLATFORM_UI";

        /** UI控制 */
        export const GAME_BAR_CLICK_UI                      = "Game.GAME_BAR_CLICK_UI";

        /* 未收到遊戲下注核銷*/
        export const GAME_BET_NOT_RECEVIE_SUMBIT            = "Game.GAME_BET_NOT_RECEVIE_SUMBIT";

        /** 顯示金手指 */
        export const SHOW_GAME_HAND                         = "Game.SHOW_GAME_HAND";

        /** 大獎宣告表演結束 */
        export const BIG_WIN_END                            = "Game.BIG_WIN_END";

        /** LaunchGame */
        export const LAUNCH_GAME                            = "Game.LAUNCH_GAME";

        export const HIDE_EVENT_MISSION = "Game.HIDE_EVENT_MISSION";
    }
}