import { DEBUG } from "cc/env"
import { IConfigTest } from "./ConfigTestDefine"

export enum ServiceType {
    // Go Service
    LOGIN                                   = 200, // Go - Login
    LOBBY                                   = 201, // Go - Lobby
    APPLIFE                                 = 202, // Go - AppLife
    STATEMENT                               = 203, // Go - Statement
    FINANCE                                 = 205, // Go - Finance
    // 222
    VIP                                     = 229, // Go - Vip
    VERIFY_CODE                             = 230, // Go - VerifyCodeService
    LOG_API                                 = 231, // Go - LogApp
    PLATFORM_API                            = 232, // Go - PlatformApi
    DAILY_CHECK                             = 233, // Go - DailyCheck
    MONEY_RAIN                              = 234, // Go - MoneyRain
    DAY_BUY                                 = 235, // Go - DayBuy
    MEMBER_INFO                             = 236, // Go - MemberInfo
    DIAMOND_RANK                            = 237, // Go - DiamondRank
    MONDAY_ORGY                             = 238, // Go - MondayOrgy
    WORD_COLLECTION                         = 239, // Go - WordCollection
    WEB_SHOPPING_CARD                       = 240, // Go - WebShoppingCard
    BIG_ROULETTE                            = 241, // Go - BigRoulette
    MATCH                                   = 242, // Go - Match
    BROADCAST_MESSAGE                       = 243, // Go - BroadcastMessage
    GOLDEN_PIG                              = 244, // Go - GoldenPig
    STAR_MODEL                              = 245, // Go - StarModel
    WEEK_CARD                               = 246, // Go - WeekCard
    WEB_CONSUMPTION                         = 247, // Go - WebConsumption
    TEST_WEB                                = 1999 // Go - Test Webservice
}
































































/**
 * Service 設定類別
 */
export class ServiceConfig implements IConfigTest {
    /**
     * 建立設定物件
     * @param classT 目標建立類別
     */
    public static Create(classT: Function): ServiceConfig { return new ServiceConfig(classT); }

    /**
     * 是否完全掌控自定義的網址設定
     */
    public get TestFullCustomPath(): boolean { return !!this.m_testFullCustomPath; }

    /**
     * 測試用網址
     */
    public get TestUrl(): string { return this.m_testUrl; }
    
    /**
     * 是否使用 HTTP 連線
     * 備註：預設 true
     */
    public get IsHttp(): boolean { return this.m_isHttp; }

    /**
     * 建立物件的類別
     */
    public get Creator() { return this.m_classT; }

    /**
     * 使用強連線
    */
    public WS(): ServiceConfig {
        this.m_isHttp = false;
        return this;
    }

    /**
     * 指定特定的連線測試位址
    * @param url 連線位址, 不用帶協定, 例如 wss://192.168.44.211:8507 填 192.168.44.211:8507 即可。
    * @param fullCustomPath 是否完全掌控自定義的網址設定(預設為 false，當設定為 true 時會關閉框架自動帶入參數至網址中)
    */
    public TestByUrl(url: string, fullCustomPath: boolean = false): ServiceConfig {
        if (DEBUG && typeof url == "string" && url.length > 0) {
            url = typeof url == "string" ? url.trim() : "";
            this.m_testUrl = url;
            this.m_testFullCustomPath = !!fullCustomPath;
        }
        return this;
    }

    private constructor(
        private m_classT: Function,
        private m_isHttp: boolean = true,
        private m_testUrl: string = null,
        private m_testFullCustomPath: boolean = null
    ) {}
}