
/**
 * 獎勵顯示模式
 */
export enum SHOW_PRIZE_STRING_MODE {
    MODE_OUTSIDE_VIEW,                      // 單純顯示數量 (時間單位會顯示 2days之類)
    MODE_TIP,                               // x N  時間顯示 1 day
    MODE_ONE_LINE_WITH_PRIZE_NAME,          // PrizeName x N  / PrizeName (Ndays) 天降顯示
    MODE_TIP_WITH_MAX_COUNT,                // x N  時間顯示 1 day (可以限制顯示長度)
    MODE_TIP_WITH_MAX_COUNT_COIN_NO_X,      // 一般道具: x N，幣值類: N，時間顯示: 1 day (可以限制顯示長度)
}

/**
 * 獎勵單位類型
 */
export enum PRIZE_UNIT_TYPE {
    PRIZE_UNIT_UDEF = 0,                    // 未定義
    PRIZE_UNIT_TYPE_TIME_RANGE_BEGIN = 1,
    PRIZE_UNIT_SECONDS = 1,                 // 秒
    PRIZE_UNIT_MINUTES = 2,                 // 分
    PRIZE_UNIT_HOURS = 3,                   // 時
    PRIZE_UNIT_DAY = 4,                     // 日
    PRIZE_UNIT_MONTH = 5,                   // 月
    PRIZE_UNIT_YEAR = 6,                    // 年
    PRIZE_UNIT_TYPE_TIME_RANGE_END = 128,
    PRIZE_UNIT_TYPE_AMOUNT_RANGE_BEGIN = 129,
    PRIZE_UNIT_AMOUNT_1 = 129,              // 个
    PRIZE_UNIT_TYPE_AMOUNT_RANGE_END = 255
}

/**
 * 獎勵數據設置接口
 */
export interface PrizeDataSettings {
    Description: string                    // 補充描述
    Name: string                           // 獎勵名稱
    MaxCount: bigint                       // 最大擁有數量
    Star: number                           // 星等數
    IsSendable: boolean                    // 是否可轉贈送
    Icon: string                           // 圖片標識
    Unit: number                           // 單位 PRIZE_UNIT_TYPE
}

/**
 * 預設獎勵數據設置
 */
export const DefaultPrizeDataSettings: PrizeDataSettings = {
    Description: "",
    Name: "No Name",
    MaxCount: 0n,
    Star: 0,
    IsSendable: false,
    Icon: "",
    Unit: PRIZE_UNIT_TYPE.PRIZE_UNIT_UDEF,
}

/**
 * 獎勵路徑設置
 */
export const PRIZE_PATH_SETTING = {
    BASE_URL: "https://igs.com.tw/",        // 基礎 URL
    FILE_EXTENSION: ".png",                 // 文件擴展名
}

/**
 * 獎勵緩存鍵值
 */
export const PRIZE_CACHE_KEYS = {
    SETTINGS: "prize_settings_",             // 設置緩存前綴
    IMAGE: "prize_image_",                   // 圖片緩存前綴
}

