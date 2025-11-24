import { Device } from "../Device/Device";
import { BundleDefine } from "./BundleDefine";

const LANG_PATTERN = "{lang}";

export namespace AssetDefine
{
    export interface Config {
        readonly bundleName: string;
        readonly assetPath: string;
        readonly portraitPath: string;

        GetAssetPath(isPortrait: boolean): string;
        GetAssetPath(orientation: Device.Orientation): string;
        GetAssetPath(portraitOrOrientation: boolean | Device.Orientation): string;
    }

    class ConfigImpl implements Config {
        bundleName: string;
        assetPath: string;
        portraitPath: string;

        GetAssetPath(arg1: boolean | Device.Orientation): string {
            const isPortrait = typeof arg1 === 'boolean' ? arg1 : arg1 === Device.Orientation.PORTRAIT;
            return isPortrait ? this.portraitPath : this.assetPath;
        }
    }

    export function config(bundleName: string, assetPath: string, portraitPath?: string): AssetDefine.Config {
        const config        = new ConfigImpl();
        config.bundleName   = bundleName;
        config.assetPath    = assetPath;
        config.portraitPath = portraitPath ?? assetPath;
        return config;
    }

    export function LanguagePath(assetPath: string): string {
        return assetPath.replace(LANG_PATTERN, `Locale/${LocaleVar.ResLang}`);
    }
}

//----------------------------------------------------------------

export namespace AssetDefine {
    // export namespace SHARE {
    //     export const TOP_BAR = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/TopBar/TopBar_L", "Prefab/TopBar/TopBar_P" );
    //     export const TOP_BAR_SLOTGAME = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/TopBar/TopBar_SlotGame_L", "Prefab/TopBar/TopBar_SlotGame_P" );
    //     export const CURRENCY_MONITOR = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/TopBar/CurrencyMonitor" );
    //     export const GAME_TRANSITION = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/GameTransition/View_L", "Prefab/GameTransition/View_P" );
    //     export const ROOKIE_TRANSITION = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/RookieTransition/View_L", "Prefab/RookieTransition/View_P" );
    //     export const HIGHLIGHT_CELL = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/Highlight/Cell/Highlight_Cell" );
    //     export const HIGHLIGHT_LEFT_PORT = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/Highlight/Highlight_LeftPortV2" );
    //     export const HIGHLIGHT_LOBBY_LEFT_PORT = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/Highlight/Highlight_LeftPortLobby" );
    //     export const HIGHLIGHT_LOBBY_PORT = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/Highlight/Highlight_LobbyPort" );
    //     export const CURRENCY_FLY_EFFECT = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/CurrencyFlyEffect/CurrencyFlyEffect" );
    //     export const POINTS_FLY_EFFECT = AssetDefine.config( BundleDefine.Foundation.SHARE, "Prefab/CurrencyFlyEffect/PointsFlyEffect" );
    //     export const FX_FLYING_STAR = AssetDefine.config( BundleDefine.Foundation.SHARE, "Particle/FX_FlyingStar" );
    // }

    export namespace SLOTS {
        export const GAME_BAR = AssetDefine.config( BundleDefine.Module.VEGAS_SLOTS, "Prefab/GameBar/GameBar", "Prefab/GameBar/GameBar_P" );
        export const LITE_WIN = AssetDefine.config( BundleDefine.Module.VEGAS_SLOTS, "Prefab/LiteWin" );
        export const TOURNAMENT_ITEM_ICON = AssetDefine.config( BundleDefine.Module.VEGAS_SLOTS, "Prefab/Tournament/Tournament_PointEarnItem" );
        export const SCREEN_DIALOG_BUTTON = AssetDefine.config( BundleDefine.Module.VEGAS_SLOTS, "Prefab/ProclaimButton" );
    }

    // export namespace RESOURCES {
    //     export const LOADING_PROGRESS = AssetDefine.config( BundleDefine.Foundation.RESOURCES, "Prefab/Common/CommonLoadingProgress" );
    //     export const TEXT_DEFAULT = AssetDefine.config( BundleDefine.Foundation.RESOURCES, "Text/default" );       // 預設文字 JSON
    //     export const VEGAS_LOGO = AssetDefine.config( BundleDefine.Foundation.RESOURCES, "{lang}/Img/logo_vegas_frenzy"); // 平台 Logo
    //     export const HINT_HAND = AssetDefine.config( BundleDefine.Foundation.RESOURCES, "Prefab/Common/Hint_Hand" );
    // }

    // export namespace MODULE {
    //     export const PRIZE_TIP = AssetDefine.config( BundleDefine.Foundation.MODULE.COMMON_TIP, "Prefab/CommonPrizeTipList" );
    //     export const INITIAL_DEPOSIT = AssetDefine.config( BundleDefine.Foundation.MODULE.BEGINNER_GUIDE, "Prefab/BeginnerInitialDeposit" );
    //     export const QUEST_GAME_STORE_ENTRY = AssetDefine.config( BundleDefine.Foundation.MODULE.QUEST_GAME, "Prefab/Common/store_entry" );
    //     export const COMMON_HINT = AssetDefine.config( BundleDefine.Foundation.MODULE.COMMON_HINT, "Prefab/CommonHint" );
    //     export const QUEST_GAME_TRANSITION = AssetDefine.config( BundleDefine.Foundation.MODULE.QUEST_GAME, "Prefab/Transition/QuestGameTransition" );
    // }

    // export namespace MODULE_MISSION {
    //     export const ROOKIE_BOX = AssetDefine.config( BundleDefine.Foundation.MODULE.MISSION, "Prefab/Mission_RookieBox", "Prefab/Mission_RookieBox_P" );
    // }
}

//----------------------------------------------------------------

export namespace AssetDefine {
    export namespace GAME {
        export const TEXT_DEFAULT   :string = "Text";               // 遊戲共用: 預設文字 JSON
    }

    export namespace GAME_TRANSITION {
        export const LEFT_IMAGE     :string = "Transition/left";    // 遊戲轉場: 左邊圖片
        export const RIGHT_IMAGE    :string = "Transition/right";   // 遊戲轉場: 右邊圖片
        export const CONFIG_JSON    :string = "Transition/config";  // 遊戲轉場: 設定 JSON
    }
}

//----------------------------------------------------------------
