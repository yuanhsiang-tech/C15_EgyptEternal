import { EpisodeMacro } from "../Feature/Episode/EpisodeMacro";
import { EpisodeEntityConfig } from "../Feature/Episode/EpisodeEntityConfig";
import { BundleDefine } from "./BundleDefine";
import { Device } from "../Device/Device";

//----------------------------------------------------------------
/**
 * 建立演出設定檔
 * - 先到 {@link EpisodeMacro} 中定義 KEY , 再到這裡建立對應的設定檔
 */
function BuildConfig(key: EpisodeMacro.Keys): EpisodeEntityConfig
{
    switch (key) {
        // 遊戲贏分
        case EpisodeMacro.KEY.BIG_WIN:{
            return EpisodeEntityConfig.Build( BundleDefine.Module.VEGAS_SLOTS, "Prefab/WinView" )
                .EpisodeType( EpisodeMacro.TYPE.BIG_WIN )
                .PauseOnStart( false )
                .InitStrategy( EpisodeMacro.INIT_STRATEGY.INIT_ON_ATTACH );
        }
        case EpisodeMacro.KEY.GAME_GET_CARD:{
            return EpisodeEntityConfig.Build( BundleDefine.MODULE.CARD, "Prefab/Book_GameGetCard" )
                .EpisodeType( EpisodeMacro.TYPE.GAME )
                .PauseOnStart( false )
                .InitStrategy( EpisodeMacro.INIT_STRATEGY.INIT_ON_ATTACH );
        }        
        case EpisodeMacro.KEY.UNLOCK_GAME:{
            return EpisodeEntityConfig.Build( BundleDefine.MODULE.UNLOCK, "Prefab/GameUnlockNotify")
                .EpisodeType( EpisodeMacro.TYPE.NORMAL )
                .InitStrategy( EpisodeMacro.INIT_STRATEGY.INIT_ON_SUBMIT )
                .PauseOnStart( false )
        }      
        case EpisodeMacro.KEY.TOURNAMENT_GET_POINT:{
            return EpisodeEntityConfig.Build( BundleDefine.FRAMEWORK.SLOTS, "Prefab/Tournament/Tournament_PointEarn" )
                .EpisodeType( EpisodeMacro.TYPE.GAME )
                .InitStrategy( EpisodeMacro.INIT_STRATEGY.INIT_ON_ATTACH )
                .PauseOnStart( false )
        }
        case EpisodeMacro.KEY.GAME_GET_ITEM:{
            return EpisodeEntityConfig.Build( BundleDefine.FRAMEWORK.SLOTS, "Prefab/GameBar/GameGetItem" )
                .EpisodeType( EpisodeMacro.TYPE.GAME )
                .PauseOnStart( false )
                .InitStrategy( EpisodeMacro.INIT_STRATEGY.INIT_ON_ATTACH );
        }
        default:
            return null;
    }
}

//----------------------------------------------------------------

export namespace EpisodeDefine
{
    /** 節點 Z Index */
    export const Z_INDEX = {
        [EpisodeMacro.KEY.BIG_WIN]: 100,
    };
}

//----------------------------------------------------------------

export namespace EpisodeDefine
{
    /** 特效播放優先順序，預設值 */
    export const DEFAULT_PRIORITY = 0;

    /** 特效播放優先順序 */
    export const PRIORITY = {
        [EpisodeMacro.KEY.BIG_WIN]: 10,
    };
}

//----------------------------------------------------------------

export namespace EpisodeDefine
{
    /** 演出逾時時間 (秒)，預設值 */
    export const DEFAULT_TIMEOUT = 15;

    /** 演出逾時時間 (秒) */
    export const TIMEOUT = {
        [EpisodeMacro.KEY.BIG_WIN]: 60,
    };
}

//----------------------------------------------------------------






























//----------------------------------------------------------------

let _configMap: Map<string, EpisodeEntityConfig> = null;
function getMap(): Map<string, EpisodeEntityConfig> {
    return _configMap || (_configMap = new Map<string, EpisodeEntityConfig>(), _configMap);
}

export namespace EpisodeDefine
{
    /** 取得演出設定檔 */
    export function GetConfig(key: EpisodeMacro.Keys): EpisodeEntityConfig {
        const configMap = getMap();

        if (configMap.has(key)) {
            return configMap.get(key);
        } else {
            const config = BuildConfig(key);
            configMap.set(key, config);
            return config;
        }
    }

    /** 取得演出優先順序 */
    export function Priority(key: EpisodeMacro.Keys): number {
        return EpisodeDefine.PRIORITY[key] || EpisodeDefine.DEFAULT_PRIORITY;
    }

    /** 取得演出 Timeout 時間 (秒) */
    export function Timeout(key: EpisodeMacro.Keys): number {
        return EpisodeDefine.TIMEOUT[key] || EpisodeDefine.DEFAULT_TIMEOUT;
    }
}

//----------------------------------------------------------------
