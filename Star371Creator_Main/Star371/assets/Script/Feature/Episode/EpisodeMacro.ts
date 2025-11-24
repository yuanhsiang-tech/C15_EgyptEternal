
export namespace EpisodeMacro
{
    /** 無效編號 */
    export const INVALID_ID = -1;

    /** 節點 Z Index，預設值 */
    export const DEFAULT_ZINDEX = 0;

    /** 演出事件鍵值 */
    export enum KEY
    {
        FUNCTION_CALL        = "episode.function_call",      // 呼叫函數

        BIG_WIN              = "episode.big_win",            // 遊戲大獎
        GAME_GET_CARD        = "episode.game_get_card",      // 遊戲獲得卡片
        
        UNLOCK_GAME          = "episode.unlock_game",        // 解鎖遊戲
        TOURNAMENT_GET_POINT = "episode.tournament_get_item",// 排行榜獲得物品
        GAME_GET_ITEM        = "episode.game_get_item",      // 遊戲獲得道具
    }

    export type Keys = EpisodeMacro.KEY | string;

    /** 演出事件類型 */
    export enum TYPE
    {
        NORMAL              = 0,                            // 一般
        GAME                = 1,                            // 遊戲
        BIG_WIN             = 2,                            // 大獎
    }

    export const DEFAULT_TYPE = EpisodeMacro.TYPE.NORMAL;

    /** 演出事件初始化策略 */
    export enum INIT_STRATEGY
    {
        INIT_ON_START       = 0,                            // 開始時初始化
        INIT_ON_SUBMIT      = 1,                            // 提交時初始化
        INIT_ON_ATTACH      = 2,                            // 附加時初始化
    }
    

    export const DEFAULT_INIT_STRATEGY = EpisodeMacro.INIT_STRATEGY.INIT_ON_START;

    /** 演出失敗代碼 */
    export enum FATAL_CODE
    {
        NOT_ATTACHED        = "fatal.not_attached",         // 未附加
        BAD_ATTACHED        = "fatal.bad_attached",         // 附加錯誤
        LOAD_ASSET_FAIL     = "fatal.load_asset_fail",      // 載入資源失敗
        SUMMIT_OUTDATED     = "fatal.summit_outdated",      // 提交過時
        TIMEOUT             = "fatal.timeout",              // 逾時
    }
}
