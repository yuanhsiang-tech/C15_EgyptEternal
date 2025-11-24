
export interface IGameStatus
{
    /**
     * 回傳遊戲是否在最低押注
     */
    GameAtMinimumBet(): boolean;

    /**
     * 回傳遊戲是否在最高押注
     */
    GameAtMaximumBet(): boolean;

    /**
     * 回傳遊戲當前押注
     */
    GameCurrentBet(): number;

    /**
     * 回傳遊戲是否在自動玩
     */
    GameAutoSpinning(): boolean;

    /**
     * 回傳遊戲是否在特色遊戲中
     */
    GameIsInFeature(): boolean;

    /**
     * 回傳遊戲是否在Turbo模式中
     */
    GameIsTurboMode(): boolean;

    /**
     * 回傳遊戲的 JpRolling 資料儲存前綴
     */
    GameJpRollingRecordKeyPrefix(): string;

    /** 遊戲押注表是否更新 */
    GameIsBetListUpdated(): boolean;

    /** 重置遊戲押注表是否更新狀態 */
    GameResetBetListUpdated(): void;

    /** 是否為 Quest Game 廳館*/
    readonly IsQuestGameTheme: boolean;
}
