import { Enum } from "cc";

/**
 * 機制編號
 * 1. 獨立機制順著流水編號接續 +1 
 * 2. 獨立機制的子機制則將父機制的編號向左 shift 2 byte 後從 1 開始依序 +1 訂定
 *    例如：明星舞台 STAR_STAGE(24) 自己有額外的 3 個子機制要定義編號，那麼子機制的編號依序為
 *         STAR_ROLE_SUB1 = (24 << 16 | 1)
 *         STAR_ROLE_SUB2 = (24 << 16 | 2)
 *         STAR_ROLE_SUB3 = (24 << 16 | 3)
 *    實務上可使用 SubMechanism(MechanismType.STAR_STAGE, 1) 的方式來定義子機制編號
 */
export enum MechanismType {
    NONE                    = 0,

    BACK                    = 1,                // 返回
    VIP                     = 2,                // VIP
    PROFILE                 = 3,                // 玩家資料
    STORE                   = 4,                // 商城
    WUSHI                   = 5,                // 倉庫
    SHINY_CARD              = 6,                // 閃耀卡
    CHAT                    = 7,                // 聊天
    WELFARE                 = 8,                // 福利
    NEWS                    = 9,                // 新聞
    MORE                    = 10,               // 更多
    MISSION                 = 11,               // 任務
    BULLETIN                = 12,               // 公告任務
    FREE_BONUS              = 13,               // 免費獎勵
    STAR_FARM               = 14,               // 名星農場
    BATTLE_PASS             = 15,               // 通行證
    SCRATCH                 = 16,               // 刮刮樂
    DIAMOND_STORE           = 17,               // 鑽石商城
    BACK_PACK               = 18,               // 道具/背包
    MAIL                    = 19,               // 郵件
    HELP                    = 20,               // 幫助
    REPORT                  = 21,               // 回報
    SETTING                 = 22,               // 設定
    PROPERTY                = 23,               // 財產框
    STAR_STAGE              = 24,               // 明星舞台
    AD                      = 25,               // 廣告
    GOLDEN_PIG              = 26,               // 黃金豬
    AMUSEMENT_PARK          = 27,               // 明星遊樂園
    MONEY_RAIN              = 28,               // 紅包雨
    SLOT_FARM               = 29,               // 明星農場
    STAR_CHEF               = 30,               // 明星大廚
    MONDAY_ORGY             = 31,               // 寶箱派對
    COOPERATION             = 32,               // 合作機制
    GOLD_POINT              = 33,               // 嘉年華商城
    DAILY_SIGN_IN           = 34,               // 每日簽到
    GIFT_PACK               = 35,               // 禮包
    RANKING                 = 36,               // 排行榜(競賽)
    SYSTEM                  = 37,               // 系統
    COLLECT                 = 38,               // 系統內的「收穫」
    SOUND                   = 39,               // 系統內的「音效」
    MUSIC                   = 40,               // 系統內的「聲音」
}
Enum(MechanismType);

/**
 * 定義子機制編號
 * @param parent 父機制編號
 * @param id 子機制編號
 */
function SubMechanism(parent: MechanismType, id: number): MechanismType {
    return (parent << 16) | id;
}

export enum FreeMechanismEvents {
    BTN_CLICKED = "BTN_CLICKED",
}