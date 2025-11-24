
declare namespace GamesChief
{
    /**
     * 僅供 Slot 遊戲層內部使用，在非 SlotGame 的場景將回傳 null
     */
    export const SlotGame: import("./ISlotGameChief").ISlotGameChief;

    /**
     * 取得當前任意遊戲的狀態資訊
     */
    export namespace Status
    {
        /** 遊戲是否在最低押注 */
        export const AtMinimumBet: boolean;

        /** 遊戲是否在最高押注 */
        export const AtMaximumBet: boolean;

        /** 遊戲當前押注 */
        export const CurrentBet: number;

        /** 遊戲是否在自動玩 */
        export const AutoSpinning: boolean;

        /** 遊戲是否在特色遊戲中 */
        export const IsInFeature: boolean;

        /** 遊戲是否在Turbo模式中 */
        export const IsTurboMode: boolean;

        /** 遊戲的 JpRolling 資料儲存前綴 */
        export const JpRollingRecordKeyPrefix: string;

        /** 遊戲押注表是否更新 */
        export const IsBetListUpdated: boolean;

        /** 重置遊戲押注表是否更新狀態 */
        export function ResetBetListUpdated(): void;

        /** 是否為 Quest Game 廳館*/
        export const IsQuestGameTheme: boolean;
    }

}
