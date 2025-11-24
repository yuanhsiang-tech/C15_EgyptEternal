import { js } from "cc"

export namespace Resource {
    export namespace Prefab {
        export const TOP_BAR_L = 'Prefab/TopBar/TopBar_L'
        export const TOP_BAR_P = 'Prefab/TopBar/TopBar_P'
    }

    export namespace Img {
        export namespace NewTag {
            export const GREEN = 'Img/Lua/LuaResource/Common/Tip/IMG_COMMON_TIP_NEW/spriteFrame'
            export const PURPLE = 'Img/Lua/LuaResource/Common/Tip/IMG_COMMON_TIP_NEW_P/spriteFrame'
        }
        export namespace Vip {
            const VIP_ROOT = 'Img/Vip/%s/spriteFrame'
            export const SIMPLE_VIP_0 = js.formatStr(VIP_ROOT, 'SimpleVip0')
            export const SIMPLE_VIP_0_PLUS = js.formatStr(VIP_ROOT, 'SimpleVip0_plus')
            export const SIMPLE_VIP_1 = js.formatStr(VIP_ROOT, 'SimpleVip1')
            export const SIMPLE_VIP_2 = js.formatStr(VIP_ROOT, 'SimpleVip2')
            export const SIMPLE_VIP_3 = js.formatStr(VIP_ROOT, 'SimpleVip3')
            export const SIMPLE_VIP_4 = js.formatStr(VIP_ROOT, 'SimpleVip4')
            export const SIMPLE_VIP_5 = js.formatStr(VIP_ROOT, 'SimpleVip5')
            export const SIMPLE_VIP_6 = js.formatStr(VIP_ROOT, 'SimpleVip6')
            export const SIMPLE_VIP_7 = js.formatStr(VIP_ROOT, 'SimpleVip7')
            export const SIMPLE_VIP_8 = js.formatStr(VIP_ROOT, 'SimpleVip8')
            export const SIMPLE_VIP_9 = js.formatStr(VIP_ROOT, 'SimpleVip9')
            export const SIMPLE_VIP_10 = js.formatStr(VIP_ROOT, 'SimpleVip10')
            export const SIMPLE_VIP_11 = js.formatStr(VIP_ROOT, 'SimpleVip11')
            export const SIMPLE_VIP_12 = js.formatStr(VIP_ROOT, 'SimpleVip12')
            export const SIMPLE_VIP_13 = js.formatStr(VIP_ROOT, 'SimpleVip13')
            export const SIMPLE_VIP_14 = js.formatStr(VIP_ROOT, 'SimpleVip14')
            export const V0 = js.formatStr(VIP_ROOT, 'V0')
            export const V0_PLUS = js.formatStr(VIP_ROOT, 'V0_plus')
            export const V1 = js.formatStr(VIP_ROOT, 'V1')
            export const V2 = js.formatStr(VIP_ROOT, 'V2')
            export const V3 = js.formatStr(VIP_ROOT, 'V3')
            export const V4 = js.formatStr(VIP_ROOT, 'V4')
            export const V5 = js.formatStr(VIP_ROOT, 'V5')
            export const V6 = js.formatStr(VIP_ROOT, 'V6')
            export const V7 = js.formatStr(VIP_ROOT, 'V7')
            export const V8 = js.formatStr(VIP_ROOT, 'V8')
            export const V9 = js.formatStr(VIP_ROOT, 'V9')
            export const V10 = js.formatStr(VIP_ROOT, 'V10')
            export const V11 = js.formatStr(VIP_ROOT, 'V11')
            export const V12 = js.formatStr(VIP_ROOT, 'V12')
            export const V13 = js.formatStr(VIP_ROOT, 'V13')
            export const V14 = js.formatStr(VIP_ROOT, 'V14')
        }
        export const DEFAULT_TITLE: string = 'Img/Lua/ProfileResource/title/IMG_TITLE_NO0/spriteFrame'
        export const GameIcon: string = 'Img/GameIcon/%s/spriteFrame'
        export namespace CommonResource {
            export const IMG_CONTEST_NEW_PRIZE_TITLE = 'Img/CommonResource/ContestPanel/IMG_CONTEST_NEW_PRIZE_TITLE/spriteFrame'
        }

        export namespace Activity {
            export namespace Message {
                const MSG_ROOT = 'Img/CommonResource/Activity/Message/%s/spriteFrame'
                export const BG = js.formatStr(MSG_ROOT, 'Activity_Message_Bg')
                export const BG_BLACK = js.formatStr(MSG_ROOT, 'Activity_Message_Bg_black')
            }

            export namespace Button {
                const BUTTON_ROOT = 'Img/CommonResource/Activity/Button/%s/spriteFrame'
                export const BOXMISSION = js.formatStr(BUTTON_ROOT, 'ActivityPanel_Button_BoxMission')
                export const PRIZEACTIVITY = js.formatStr(BUTTON_ROOT, 'ActivityPanel_Button_PrizeActivity')
                export const MISSION_COMPLETE = js.formatStr(BUTTON_ROOT, 'ActivityPanel_Button_Mission')
            }

            const ACTIVITY_ROOT = 'Img/CommonResource/Activity/%s/spriteFrame'
            export const GOLDEN_POINT = js.formatStr(ACTIVITY_ROOT, 'IMG_GOLDEN_POINT')
            export const STONE = js.formatStr(ACTIVITY_ROOT, 'IMG_STONE')
            export const WARHEAD = js.formatStr(ACTIVITY_ROOT, 'IMG_WARHEAD')
            export const CLUB_COIN = js.formatStr(ACTIVITY_ROOT, 'Club_coin')
            export const SHINY_CARD = js.formatStr(ACTIVITY_ROOT, 'ShineCard')
            export const SHINY_CARD_TICKET = js.formatStr(ACTIVITY_ROOT, 'ShineCardTicket')
            export const FREE_GAME_CARD = js.formatStr(ACTIVITY_ROOT, 'FreeGameCard')
            export const SERVANT_COIN = js.formatStr(ACTIVITY_ROOT, 'ServantCoin')
            export const LUCKY_SHIBA = js.formatStr(ACTIVITY_ROOT, 'LuckyShiba')
            export const LOTTERY_TICKET = js.formatStr(ACTIVITY_ROOT, 'LotteryTicket')
            export const WORD_COLLECTION = js.formatStr(ACTIVITY_ROOT, 'WordCollection_%s')
        }

        export namespace Deposit {
            export const ICOIN = 'Img/Deposit/IMG_DEPOSIT_ICOIN_%s/spriteFrame'
            export const DIAMOND = 'Img/Deposit/IMG_DEPOSIT_DIAMOND_%s/spriteFrame'
        }

        export namespace COMMON_CHEST {
            export const TREASURE_CHEST = 'Img/LuaResource/PrizeOpen/img/TreasureChest_%d/spriteFrame'
            export const TREASURE_CHEST_SMALL = 'Img/LuaResource/PrizeOpen/img/TreasureChestSmall_%d/spriteFrame'
            export const TREASURE_CHEST_SMALL_OPEN = 'Img/LuaResource/PrizeOpen/img/TreasureChestSmall_%d_Open/spriteFrame'
            export const GIFT_BOX = "Lua/LuaResource/PrizeOpen/img/Box%d/spriteFrame"
        }
    }

    export namespace Sound {
        export const THEME: string = 'Sound/MainTheme'
        export const BTN_UI: string = 'Sound/BtnUI'
        export const BTN_NEGATIVE: string = 'Sound/BtnNegative'
        export const SOUND_BROKEN_PIG: string = "Sound/SOUND_BROKEN_PIG"
    }

    export namespace Data {
        export const CONFIG_FILE: string = 'Data/ConfigFile/%s'

        export const STAR_AGENT_ROLE_INFO: string = 'Data/StarAgent/RoleInfo'
        export const STAR_AGENT_ROLE_CLOTHES_PACKET: string = 'Data/StarAgent/RoleClothesPacketV1'
        export const STAR_AGENT_ROLE_CLOTHES_INFO: string = 'Data/StarAgent/RoleClothesInfoV1'
        export const STAR_AGENT_ROLE_PACKET_NO_POS: string = 'Data/StarAgent/PacketNoPos'
        export const STAR_AGENT_ROLE_CONVERT_RESOURCE: string = 'Data/StarAgent/RoleConvertResource'
        export const STAR_AGENT_ROLE_EMOTION_ICON_FOR_GAME: string = 'Data/StarAgent/EmotionIconForGame'
        export const STAR_AGENT_ROLE_EMOTION_ICON_INTER_ACTIVE: string = 'Data/StarAgent/EmotionIconInterActive'
    }
}


