import { Size, size } from "cc";

export namespace Define {
    export namespace ZIndex {
        /**
         * 全局層級
         */
        export namespace Global {
            export const UNDEF                          = -1;
            export const GAME_INTERIOR                  = 50;       // 遊戲內部圖層
            export const TOP_BAR                        = 100;      // TOP BAR 圖層
            export const GAME_EXTERIOR                  = 150;      // 遊戲外部圖層
            export const GAME_SUPERIOR                  = 160;      // 遊戲最上層圖層 (不會被暫停)

            export const VIEW_DEFER                     = 210;      // 延緩顯示層級
            export const VIEW_USER                      = 211;      // 玩家操作層級

            export const SUPERIOR_LAYER                 = 300;      // 最上層圖層

            export const YURUYI                         = 400;      // 玉如意
            export const VIEW_DIALOG                    = 450;      // 提示說明層級

            export const TRANSITION                     = 800;      // 轉場層級
            export const ALPHA_LOADING                  = 801;      // 透明載入層級

            export const VIEW_ALERT                     = 900;      // 警告顯示層級

            export const BORDER                         = 9999;     // 邊框層級，最高層級，不可超過
        }
        export type Global                              = number;

        /** 遊戲內部圖層 ZIndex 定義 */
        export namespace GameInteriors
        {
            export const DEFAULT                        = 0;
            export const GAME_BAR                       = 50;
        }
        export type GameInteriors                       = number;

        /** 遊戲最上層圖層 ZIndex 定義 */
        export namespace GameSuperiors
        {
            export const DEFAULT                        = 0;
            export const EPISODE                        = 50;      // 全版演出圖層
            export const PROCLAIM                       = 100;     // 宣告圖層
        }
        export type GameSuperiors                       = number;

        /** 最上層圖層 ZIndex 定義 */
        export namespace SuperiorLayer
        {
            export const DEFAULT                        = 0;
        }
        export type SuperiorLayer                       = number;
    }
}

export namespace Define {
    export namespace Timeout
    {
        export const PREPARATION                    = 30;   // 秒
    }
}

export namespace Define {
    /**
     * 設計尺寸
     */
    export namespace DesignSize {
        export const REGULAR: Size      = size(1400, 640);  // 寬尺寸
        export const COMPACT: Size      = size(1136, 640);  // 窄尺寸
    }
}