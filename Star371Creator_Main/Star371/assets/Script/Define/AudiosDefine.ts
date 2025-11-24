import { BundleDefine } from "./BundleDefine";

export namespace AudiosDefine
{
    export namespace Bundles
    {
        export const VEGAS_APP          = BundleDefine.Default.RESOURCES;
        export const VEGAS_LOBBY        = BundleDefine.Foundation.LOBBY;
        export const FRAMEWORK_SLOT     = BundleDefine.Module.VEGAS_SLOTS;
    }
}

export namespace AudiosDefine
{
    export const VEGAS_APP = Object.freeze({
        BTN_CLICK       : "Sound/btn_click",
        BTN_SPIN        : "Sound/btn_spin",
        UI_POPUP        : "Sound/lobby_popup",
        NEXT_PAGE       : "Sound/sale_next",
        GAME_DROP       : "Sound/game_drop",
        SP_UI_POPUP     : "Sound/premium_popup",
        ENTER           : "Sound/enter",
        POUR            : "Sound/pour",

        BGM01           : "Sound/bgm/Mission&Pass_bgm",
        BGM02           : "Sound/bgm/timebonus_backgound",
        /** BGM：Bingo、Tournament */
        BGM03           : "Sound/bgm/bingo_background",
        BGM04           : "Sound/bgm/eventMission_background",
    });

    export const VEGAS_LOBBY = Object.freeze({
        LOBBY_BGM       : "Sound/vf_lobby_bgm",
    });

    export const FRAMEWORK_SLOT = Object.freeze({
        COIN_WIN        : "Sound/coin_win",
        BIG_WIN         : "Sound/big_win",
        MEGA_WIN        : "Sound/mega_win",
        SUPER_WIN       : "Sound/super_win",
    });

    export const FRAMEWORK_SLOT_BIGWIN = Object.freeze({
        BIG_WIN         : "Sound/big_win",
        MEGA_WIN        : "Sound/mega_win",
        SUPER_WIN       : "Sound/super_win",
    });

    export const QUEST_GAME = Object.freeze({
        VAULT_OPEN      : "Sound/vault_opening_low",
        IPLOBBY_BGM     : "Sound/mg_bgm_64",
    });
}
