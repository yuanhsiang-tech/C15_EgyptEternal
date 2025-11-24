import { warn } from "cc";
import { BetUtils } from "./BetUtils";
import { ThemeType } from "../../../Proto/gt2/basicTypes/basicTypes_pb";
import { Persist } from "../../../Persist/Persist";
import * as Currency from "../../../Proto/gt2/currency/currency_pb";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { PersistKey } from "../../../Define/PersistKeyDefine";
import { GameCommonCommand } from "../../Common/GameCommonCommand";

export default class BetManager
{

    //----------------------------------------------------------------

    private static s_instance: BetManager = null;
    public static get Instance(): BetManager {
        return this.s_instance ?? (this.s_instance = new BetManager);
    }

    private constructor() {}

    //----------------------------------------------------------------



    //================================================================
    // 記憶 Bet
    //================================================================

    //----------------------------------------------------------------
    /**
     * 取得玩家存檔的遊戲押注金額
     * @param gameId 遊戲 ID
     * @param themeType 廳館類型
     */
    public GetSavedGameBet( gameId: number, themeType: number = ThemeType.NORMAL ): number
    {
        const accountId = UserProfile.AccountId;

        // 嘗試讀取上次存檔的押注金額
        const saveKey = PersistKey.GameCommon.SINGLE_GAME_BET_V2( accountId, gameId, themeType );
        const saveBet = Persist.App.GetNumber( saveKey );
        if (saveBet > 0) {
            return saveBet;
        }

        // 如果沒有存檔，則回傳 0
        return 0;
    }

    //----------------------------------------------------------------
    /**
     * 設定玩家存檔的遊戲押注金額
     * @param bet 押注金額
     * @param gameId 遊戲 ID
     * @param themeType 廳館類型
     */
    public SetSavedGameBet( bet: number, gameId: number, themeType: number = ThemeType.NORMAL ): void
    {
        // 如果押注金額不大於 0，則不儲存
        if (!(bet > 0)) {
            warn(`BetManager.SetSavedGameBet: Invalid bet value`, bet, gameId, themeType);
            return;
        }

        const accountId = UserProfile.AccountId;
        const saveKey = PersistKey.GameCommon.SINGLE_GAME_BET_V2( accountId, gameId, themeType );
        Persist.App.SetNumber( saveKey, bet );
    }

    //----------------------------------------------------------------
    /**
     * 取得玩家存檔的共通遊戲押注金額
     * @param themeType 廳館類型
     * @returns 押注金額
     */
    public GetCommonSavedGameBet( themeType: number = ThemeType.NORMAL ): number
    {
        const accountId = UserProfile.AccountId;
        
        // 嘗試讀取上次存檔的押注金額
        const saveKey = PersistKey.GameCommon.COMMON_GAME_BET_V2( accountId, themeType );
        const saveBet = Persist.App.GetNumber( saveKey );
        if (saveBet > 0) {
            return saveBet;
        }

        // [!容舊] 嘗試讀取舊版存檔 (僅限一般廳館)
        if (themeType == ThemeType.NORMAL)
        {
            const legacyKey = PersistKey.GameCommon.COMMON_GAME_BET( accountId );
            const legacyBet = Persist.App.GetNumber( legacyKey );
            if (legacyBet > 0) {
                Persist.App.SetNumber( saveKey, legacyBet ); // 儲存新版存檔
                Persist.App.Remove( legacyKey ); // 移除舊版存檔
                return legacyBet;
            }
        }

        // 如果沒有存檔，則回傳 0
        return 0;
    }

    //----------------------------------------------------------------
    /**
     * 設定玩家存檔的共通遊戲押注金額
     * @param bet 押注金額
     * @param themeType 廳館類型
     */
    public SetCommonSavedGameBet( bet: number, themeType: number = ThemeType.NORMAL ): void
    {
        // 如果押注金額不大於 0，則不儲存
        if (!(bet > 0)) {
            warn(`BetManager.SetCommonSavedGameBet: Invalid bet value`, bet, themeType);
            return;
        }

        const accountId = UserProfile.AccountId
        const saveKey = PersistKey.GameCommon.COMMON_GAME_BET_V2( accountId, themeType );
        Persist.App.SetNumber( saveKey, bet );
    }

    //----------------------------------------------------------------



    //================================================================
    // Bolt Power Bet
    //================================================================

    //----------------------------------------------------------------
    /**
     * 取得玩家存檔的 Bolt Power 押注金額
     * @param gameId 遊戲 ID
     * @param themeType 廳館類型
     * @returns 押注金額
     */
    public GetBoltPowerBet( gameId: number, themeType: number = ThemeType.NORMAL ): number
    {
        const accountId = UserProfile.AccountId;
        const saveKey = PersistKey.GameCommon.SINGLE_GAME_BOLT_POWER_BET(accountId, gameId, themeType);
        const saveBet = Persist.App.GetNumber(saveKey);
        if (saveBet > 0) {
            return saveBet;
        }

        // 如果沒有存檔，則回傳 0
        return 0;
    }

    //----------------------------------------------------------------
    /**
     * 設定玩家存檔的 Bolt Power 押注金額
     * @param bet 押注金額
     * @param gameId 遊戲 ID
     * @param themeType 廳館類型
     */
    public SetBoltPowerBet( bet: number, gameId: number, themeType: number = ThemeType.NORMAL ): void
    {
        // 如果押注金額不大於 0，則不儲存
        if (!(bet > 0)) {
            warn(`BetManager.SetBoltPowerBet: Invalid bet value`, bet, gameId, themeType);
            return;
        }

        const accountId = UserProfile.AccountId ?? 0;
        const saveKey = PersistKey.GameCommon.SINGLE_GAME_BOLT_POWER_BET(accountId, gameId, themeType);
        Persist.App.SetNumber(saveKey, bet);
    }

    //----------------------------------------------------------------



    //================================================================
    // Bet 列表與搜尋
    //================================================================

    //----------------------------------------------------------------
    /**
     * 根據當前使用者的等級建立可用的押注列表
     * @param commonGameInfo 遊戲共用的押注設定
     * @returns 可用的押注列表
     */
    public CreateValidBetList(commonGameInfo: GameCommonCommand.CommonGameInfo): number[]
    {
        const betInfoList = commonGameInfo?.BetList;
        if (!(betInfoList?.length > 0)) {
            return [];
        }

        const betList: number[] = [];
        const playerLevel = 0// ClientData.Instance.LevelServer;

        for (const betInfo of commonGameInfo.BetList)
        {
            if (this.CheckBetInfo( betInfo, playerLevel )) {
                betList.push( betInfo.Bet );
            }
        }

        return BetUtils.SortBetList( betList );
    }

    //----------------------------------------------------------------
    /**
     * 尋找天選 BET
     * @param betList       押注列表
     * @param currencyType  預設為 VCOIN
     * @returns 搜尋結果
     *
     * @description
     * - 判斷方式
     * >- (玩家剩餘財產 / `X`)，往下找最接近的 BET
     * >- 如果判斷低於廳館最低 BET 則為最低 BET
     * - A / B 測試需求
     * >- 依據玩家 Account ID 進行分群
     * >- (accountId % 3) = 0， `X` = 100
     * >- (accountId % 3) = 1， `X` = 50
     * >- (accountId % 3) = 2， `X` = 20
     */
    public FindTheChosenBet(betList: number[], currencyType: Currency.Type = Currency.Type.ICOIN): number
    {
        let rate = 0;

        const accountId = UserProfile.AccountId;
        switch (accountId % 3) {
            case 0: rate = 100; break;
            case 1: rate = 50; break;
            case 2: rate = 20; break;
        }

        // 防呆，用最低的 BET
        if (rate <= 0) {
            return betList?.[0] ?? 0;
        }

        const currencies = UserProfile.GetProperty(currencyType);
        const targetBet = NumberUtils.ParseBigNumber( currencies ).div( rate ).toNumber();

        return BetUtils.SearchRoundDown( targetBet, betList );
    }

    //----------------------------------------------------------------
    /**
     * 尋找解鎖最大 JACKPOT 所需的 BET
     * @param betList       押注列表
     * @param unlockInfos   大獎解鎖資訊 
     * @returns 搜尋結果
     */
    public FindUnlockJackpotBet(betList: number[], unlockInfos: GameCommonCommand.UnLockInfo[]): number
    {
        if (!(unlockInfos?.length > 0)) {
            return betList?.[0] ?? 0;
        }

        let targetInfos: GameCommonCommand.UnLockInfo[] = [];
        const playerLevel = 0// ClientData.Instance.LevelServer;
        for (const unlockInfo of unlockInfos)
        {
            // 未達解鎖等級
            if (playerLevel < unlockInfo.UnlockLevel) {
                continue;
            }

            // 撈出所有 JACKPOT 類型
            switch (unlockInfo.UnlockType)
            {
                case GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MINI:
                case GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MINOR:
                case GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MAJOR:
                case GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_MEGA:
                case GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_ULTRA:
                case GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_GRAND:
                case GameCommonCommand.UNLOCK_TYPE.UNLOCK_TYPE_JACKPOT:
                    targetInfos.push( unlockInfo );
                    break;
            }
        }

        // 找出最大的 JACKPOT 並回傳可以解鎖的最低 BET
        if (targetInfos.length > 0) {
            const maxJpInfo = targetInfos.reduce( (max, info) => (max.UnlockType > info.UnlockType) ? max : info, targetInfos[0] );
            return BetUtils.SearchRoundUp( maxJpInfo.Bet, betList );
        }

        // 防呆，用最低的 BET
        return betList?.[0] ?? 0;
    }

    //----------------------------------------------------------------



    //================================================================
    // Utility Function
    //================================================================

    //----------------------------------------------------------------
    /**
     * 檢查押注資訊是否符合玩家等級
     * @param betInfo       押注資訊
     * @param playerLevel   玩家等級
     * @returns 是否符合
     */
    private CheckBetInfo(betInfo: GameCommonCommand.BetInfo, playerLevel: number = 0/*ClientData.Instance.LevelServer*/): boolean
    {
        if (betInfo) {
            return playerLevel >= betInfo.MinLevel && (!(betInfo.MaxLevel > 0) || playerLevel <= betInfo.MaxLevel);
        }
        return false;
    }

    //----------------------------------------------------------------

}
