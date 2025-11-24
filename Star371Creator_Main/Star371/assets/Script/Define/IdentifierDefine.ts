
export namespace Identifier {

    /** 排程 */
    export enum PROCESS {
        PLAYER_SESSION      = "process.player_session",
        VF_SESSION          = "process.vf_session",
        FRAMEWORK_RES_MASTER = "process.framework_res_master",
        BEGINNER_GUIDE_CTRL = "process.beginner_guide_control",
        GIFT_PACK_MANAGER   = "process.gift_pack_manager",
        PIGGY_PRODUCT_MANAGER = "process.piggy_product_manager",
        LAUNCH_GAME_MANAGER = "process.launch_game_manager",
        TOURNAMENT_MANAGER  = "process.tournament_manager",
        SUCCESSIVE_PACK_MANAGER = "process.successive_pack_manager",
        SUCCESSIVE_PACK_THEME = "process.successive_pack_theme",
        TOURNAMENT_THEME = "process.tournament_theme",
        ACCOUNT_BINDING_MANAGER = "process.account_binding_manager",
    }

    /** 版本 */
    export enum VERSION {
        ENVIRONMENT         = "version.environment",
        APP_VERSION         = "version.app_version",
        PATCH_VERSION       = "version.patch_version",
        SERVER_CTRL_RES     = "version.server_ctrl_res",
        TRACKING_CODE       = "version.tracking_code",
        GAME_VERSION        = "version.game_version",
        GAME_CHECK          = "version.game_check",
    }

    /** 過場畫面 */
    export enum TRANSITION {
        DEFAULT             = "transition.default",
        VEGAS_LAUNCHER      = "transition.vegas_launcher",
        RESTART_APP         = "transition.restart_app",
        SCENE_SWITCH        = "transition.scene_switch",
        LOGIN_PROCESS       = "transition.login_process",
        GAME_$              = "transition.game.",
    }

    /** Scene 準備工作 */
    export enum PREPARATION {
        DEFAULT             = "preparation.default",
        TOP_BAR             = "preparation.top_bar",
        GAME_BAR            = "preparation.game_bar",
        LITE_WIN            = "preparation.lite_win",
        WIN_VIEW            = "preparation.win_view",
        GAME_READY          = "preparation.game_ready",
        GAME_TEXT           = "preparation.game_text",
        GAME_AUDIO          = "preparation.game_audio",
        SLOT_COMMON_AUDIO   = "preparation.slot_common_audio",
        PROCLAIM_BUTTON     = "preparation.proclaim_button",
        HIGHLIGHT           = "preparation.highlight",
        LOBBY_GALLERY       = "preparation.lobby_gallery",
        LOBBY_AUDIO         = "preparation.lobby_audio",
        LOBBY_DAILY_BONUS   = "preparation.lobby_daily_bonus",
        LOBBY_PIGGY_BANK    = "preparation.lobby_piggy_bank",
        CURRENCY_FLY        = "preparation.currency_fly",
        CURRENCY_MONITOR    = "preparation.currency_monitor",
        POINTS_FLY          = "preparation.points_fly",
        FRENZYCARD          = "preparation.frency_card",
        MISSION             = "preparation.mission",
        BATTLEPASS          = "preparation.battlepass",
        LOBBY_DAILY_WHEEL   = "preparation.lobby_daily_wheel",
        SUCCESSIVE_PACK     = "preparation.successive_pack",
        TOURNAMENT          = "preparation.tournament",
        TOURNAMENT_ITEM     = "preparation.tournament_item",
        LEAFLET_NEWS        = "preparation.leaflet_news",
    }

    /** 機制阻擋識別碼 */
    export enum BLOCK_KEY {
        EPISODE_DEFAULT     = "block_key.episode_default",
        EPISODE_PAUSE_GAME  = "block_key.episode_pause_game",
        FEATURE_GAME        = "block_key.feature_game",
        VIEW_PRESENTING     = "block_key.view_presenting",
        PLATFORM_UI_SYSTEM  = "block_key.platform_ui_system",
        PLATFORM_UI_DEFAULT = "block_key.platform_ui_default",
        PLATFORM_UI_BY_GAME = "block_key.platform_ui_by_game",
        ROOKIE_MISSION      = "block_key.rookie_mission",
        BEGINNER_GUIDE      = "block_key.beginner_guide",
        TREASURE_FRENZY     = "block_key.treasure_frenzy",
        QUEST_GAME          = "block_key.quest_game",
    }

}
