import {} from '../Define/AppDefine'

export namespace PersistKey {
    export const DEVICE_ID: string                  = `${AppDefine.EnvType}_WebDeviceID`;
    export const DEVICE_NO: string                  = `${AppDefine.EnvType}_WebDeviceNo`;
    export const APP_STORAGE_ID: string             = `${AppDefine.EnvType}_WebAppStorageInstallationID`;
    export const DEVICE_STORAGE_ID: string          = `${AppDefine.EnvType}_WebDeviceStorageInstallationID`;

    //================================================================================================
    /** 遊戲共用 */
    //------------------------------------------------------------------------------------------------
    export namespace GameCommon
    {
        /** 遊戲共用: 全遊戲共通資訊押注 */
        export function COMMON_GAME_BET(accountId: number): string {
            return `${AppDefine.EnvType}.game_common.common_game_bet.${accountId}`;
        }

        /** 遊戲共用: 全遊戲共通資訊押注 (V2) */
        export function COMMON_GAME_BET_V2(accountId: number, themeType: number): string {
            return `${AppDefine.EnvType}.game_common.common_game_bet_v2.${accountId}_${themeType}`;
        }

        /** 遊戲共用: 各遊戲押注設定 */
        export function SINGLE_GAME_BET(accountId: number, gameId: number): string {
            return `${AppDefine.EnvType}.game_common.single_game_bet.${accountId}.${gameId}`;
        }

        /** 遊戲共用: 各遊戲押注設定 (V2) */
        export function SINGLE_GAME_BET_V2(accountId: number, gameId: number, themeType: number): string {
            return `${AppDefine.EnvType}.game_common.single_game_bet_v2.${accountId}_${gameId}_${themeType}`;
        }

        /** 遊戲共用: 各遊戲 Bolt Power 押注 */
        export function SINGLE_GAME_BOLT_POWER_BET(accountId: number, gameId: number, themeType: number): string {
            return `${AppDefine.EnvType}.game_common.single_game_bolt_power_bet.${accountId}.${gameId}.${themeType}`;
        }
    }
}