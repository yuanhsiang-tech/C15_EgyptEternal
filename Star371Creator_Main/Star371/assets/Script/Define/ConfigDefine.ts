import {} from '../Define/AppDefine'

/**
 * 環境配置接口
 */
interface UrlPrefix {
    /** 網頁組密鑰 */
    WEB_KEY: string;
    /** 進入點 URL */
    ENTRY_URL: string;
    /** 設備 ID URL */
    GUEST_REQUEST_URL: string;
    /** 問題回報 URL */
    REPORT_URL: string;
    /** CDN 配置 URL */
    CDN_CONFIG_URL: string;
}

/**
 * 環境配置映射表
 */
const URL_PREFIX_CONFIGS: Record<Environment, Readonly<UrlPrefix>> = {
    [Environment.INTERNAL]: {
        WEB_KEY: "T!@qMnH$PhDbjXrJ",
        ENTRY_URL: "dev-aio.towergame.com",
        GUEST_REQUEST_URL: "https://ma-dev.towergame.com/Webs/MobilePlatform/Member/GT_receive_login.aspx",
        REPORT_URL: "https://www-dev.towergame.com/mobile/member/login/logout.aspx?bShowAlert=false",
        CDN_CONFIG_URL: "https://cdn-dev.towergame.com/rd2/Apple/com.igs.AIO/Config/Config_New.json?%s",
    },
    [Environment.EXTERNAL_TEST]: {
        WEB_KEY: "T!@qMnH$PhDbjXrJ",
        ENTRY_URL: "",
        GUEST_REQUEST_URL: "https://ma-twtest.towergame.com/Webs/MobilePlatform/Member/GT_receive_login.aspx",
        REPORT_URL: "https://www-twtest.towergame.com/mobile/member/login/logout.aspx?bShowAlert=false",
        CDN_CONFIG_URL: "https://cdn-twtest.towergame.com/rd2/Apple/com.igs.AIO/Config/Config_New.json?%s",
    },

    [Environment.EXTERNAL]: {
        WEB_KEY: "T!@qMnH$PhDbjXrJ",
        ENTRY_URL: "",
        GUEST_REQUEST_URL: "https://ma.gametower.com.tw/Webs/MobilePlatform/Member/GT_receive_login.aspx",
        REPORT_URL: "https://www.gametower.com.tw/mobile/member/login/logout.aspx?bShowAlert=false",
        CDN_CONFIG_URL: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.AIO/Config/Config_New.json?%s",
    },
    [Environment.APPLE_TEST]: {
        WEB_KEY: "T!@qMnH$PhDbjXrJ",
        ENTRY_URL: "",
        GUEST_REQUEST_URL: "https://ma-twtest.towergame.com/Webs/MobilePlatform/Member/GT_receive_login.aspx",
        REPORT_URL: "https://www-twtest.towergame.com/mobile/member/login/logout.aspx?bShowAlert=false",
        CDN_CONFIG_URL: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.AIO/Config/Config_New.json?%s",
    }
};

/**
 * 遊戲配置接口
 */
export interface GameConfig {
    ENTRY_URL: string
    WEB_KEY: string
    COMMON: string
    TIME_STAMP_URL: string,
    
    // 裝置相關URL
    recordUserLoginDevice: string
    recordUserLoginDeviceV2: string
    recordUserLoginDeviceV3: string
    
    // Facebook相關
    FbAuth: string
    FbAuthV2: string
    FbAuthV3: string
    FbRegister: string
    FbRegisterUrl: string
    FbRegisterCountUrl: string
    FbGraphWebUrl: string
    
    // 推播通知
    PushNotificationLog: string
    APNS: string
    
    // 帳號相關
    AccountCheck: string
    Register: string
    RegisterV2: string
    RegisterCounter: string
    RegisterUrl: string
    Referer: string
    
    // 暱稱相關
    NickNameRegisterUrl: string
    NickNameRefererUrl: string
    NicknameReferer: string
    NicknameRegister: string
    NicknameRegisterV2: string
    NicknameChange: string
    
    // 收據和查詢
    ReceiptLog: string
    QueryPlatformStatus: string
    IsQueryPlatformStatusEnabled: string
    QueryCurrentVersion: string
    
    // 虛擬物品
    VitemImgLinkUrl: string
    VitemEnabled: string
    
    // 白名單
    WhiteListingJsonUrl: string
    WhiteListUrlV2: string
    WhiteDiamondProductUrl: string
    
    // 問卷調查
    QuestionnaireEnabled: string
    QuestionnaireID: string
    QuestionnaireReqURL: string
    QuestionnaireShowURL: string
    
    // 登入相關
    WebLcLogin: string
    GuestRequestUrl: string
    
    // 下載相關
    MD5CheckEnabled: string
    DownloadUseMd5: string
    DownloadUncompress_MultiThread: string
    DownLoadingUrl: string
    DownLoadingUrlCN: string
    DownLoadingRoleCacheTime: string
    DownLoadingCacheTime: string
    
    // 大廳相關
    LobbyGBtnRate: string
    LobbyGameAd: string
    LobbyGameConfig: string
    
    // 頭像相關
    AvatarUrl: string
    AvatarUrlNew: string
    AvatarFbUrlNew: string
    AvatarFolderDivideCount: string
    AvatarUpload: string
    AvatarDataTotal: string
    AvatarExpireTimeSelf: string
    AvatarExpireTime: string
    AvatarAioUpload: string
    AvatarAioUpload512: string
    AvataAioUrl: string
    AvatarIconUrl: string
    
    // 聯盟相關
    UnionImageUrl: string
    UnionImageUpload: string
    UnionDataTotal: string
    UnionExpireTimeSelf: string
    UnionExpireTime: string
    
    // 點數相關
    IsShowChangePoint: string
    ChangePointUrl: string
    
    // LINE登入相關
    LineLoginChannelId: string
    LineLoginLcUrl: string
    LineLoginLcUrlV2: string
    LineLoginLcUrlV3: string
    LineRegisterUrl: string
    LineLoginUrlWin32: string
    LineLoginUrlWin32V2: string
    LinePoint: string
    LinePointEnabled: string
    
    // 新聞相關
    News: string
    NewsCN: string
    NewsEnabled: string
    
    // 遊戲說明
    ExplainBig2Url: string
    ExplainMJUrl: string
    
    // 基礎URL
    GameTowerUrl: string
    CDNUrl: string
    AndroidPayUrl: string
    AndroidProductUrl: string
    WindowsPayUrl: string
    WindowsProductUrl: string
    DeviceIdUrl: string
    
    // Yahoo相關
    YahooUrl: string
    YahooUrlV2: string
    YahooUrlV3: string
    YahooUrlV4: string
    YahooUrlV5: string
    
    // Apple登入相關
    AppleLoginUrl: string
    AppleLoginAndRE: string
    AppleLoginWebEnabledForIOS: string
    AppleLoginWebEnabledForPC: string
    AppleLoginWebEnabledForAndoird: string
    
    // 微信登入相關
    WechatLoginUrlV3: string
    WechatLoginTokenUrlV3: string
    WechatLoginUrlBackUpV3: string
    
    // Google Play相關
    GooglePlayLimitUrl: string
    GooglePlayLimitEnabled: string
    GooglePlayAllChannelEnabled: string
    
    // 存款檢查
    DepositCheckIsComsumeUrl: string
    DepositCheckIsBlackStatusUrl: string
    
    // 中華電信相關
    CHT4G: string
    HamiPass: string
    
    // 應用內購買
    iAP_ConsumeItemEnabeld: string
    iAP_CurrencyLogEnabeld: string
    iAP_PostUrl: string
    iAP_CheckPostUrl: string
    
    // 功能開關
    MissionRedShowEnabled: string
    VIPEnabled: string
    GuestLoginNewEnabled: string
    ReconnectEnabled: string
    GetMacAddress: string
    InAppRatingEnabled: string
    ProductIsValidEnabled: string
    ProductIsSorting: string
    SystemClearDataEnabeld: string
    OnboardingEnabled: string
    DuplicateKickEnabled: string
    ProductIsFailCallFinish: string
    WebSupportLoginEnabled: string
    AdRedPointEnabeld: string
    VipMonthTipEnabled: string
    MailLuaEnabled: string
    IsLoginNeedVerifyForWin: string
    GuideSpecificGameEnabled: string
    CNFirstPlayGuestLogin: string
    SimplifiedConvertionEnabled: string
    CNRestrictLanguageEnabled: string
    SystemLanguageSettingEnabeld: string
    WebSupportLoginFaceBookEnforceEnabled: string
    WebSupportLoginAppleEnforceEnabled: string
    WebSupportLoginWechatEnforceEnabled: string
    WebSupportLoginLineEnforceEnabled: string
    
    // 版本相關
    IosMinVersion: string
    AndroidMinVersion: string
    AndroidOfficialMinVersion: string
    WinMinCurrentVersion: string
    
    // 遊戲特定功能
    BooldLeaveBtnEnabled: string
    BooldLeaveBtnExceptTheme: string
    Poker13LeaveBtnEnabled: string
    ScratchCardEnabled: string
    DiamondEnabled: string
    
    // 圖示相關
    ContestIcon: string
    BoxMissionEnabled: string
    BoxMissionIcon: string
    PrizeActivityEnabled: string
    PrizeActivityIcon: string
    EmoticonIcon: string
    TitleImgUrl: string
    ShinyCardImgUrl: string
    CTImgUrl: string
    CTNoActivityMsg: string
    CTNoActivityMsgCn: string
    
    // 驗證相關
    VerifyUrl: string
    iOSReceiptWebAuthEnabeld: string
    
    // SMS相關
    SMSSuccess: string
    SMSFail: string
    
    // 社群相關
    CommunityUrl: string
    
    // 下載相關
    AndroidOfficialIdentifier: string
    
    // 朋友相關
    FriendVipEnabled: string
    FriendThemeInvitedEnabled: string
    FriendThemeUrl: string
    Start371AppByUrl: string
    
    // 日誌相關
    NewPlayerOutFlowV6: string
    AIOStartUrl: string
    AIOStartZipFailUrl: string
    WebErrorCode: string
    LoginErrorCode: string
    DisconnectErrorCode: string
    DisconnectErrorCodeV4: string
    BridgeClientGamePingLog: string
    IsGoingToBridge: string
    
    // 載入提示
    LoadingTipUrl: string
    Loading_Back_Timelimt: string
    LoginSearchPWUrl: string
    
    // 廣告相關
    AndroidAdmobReward: string
    IosAdmobReward: string
    
    // 語音相關
    vivoxVoiceServer: string
    vivoxVoiceRealm: string
    vivoxVoiceIssuer: string
    vivoxVoiceKey: string
    
    // 其他
    ShinyCardLineClubUrl: string
}

function BuildVariables(): GameConfig
{
    const urlPrefix = URL_PREFIX_CONFIGS[AppDefine.EnvType];
    return Object.freeze({
        ENTRY_URL:                                          urlPrefix.ENTRY_URL,
        WEB_KEY:                                            urlPrefix.WEB_KEY,
        COMMON: "https://cdn.gametower.com.tw/rd2/Common/", //先使用正式的CDN 因為二測會被擋,
        TIME_STAMP_URL: "https://ingame-api-test.towergame.com/time",

        recordUserLoginDevice: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/RecordUserLoginDevice?accountId=%s&deviceID=%s",
        recordUserLoginDeviceV2: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/RecordUserLoginDeviceV2?accountId=%s&deviceID=%s&clientVersion=%s&userClientType=%s",
        recordUserLoginDeviceV3: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/RecordUserLoginDeviceV3?accountId=%s&deviceID=%s&clientVersion=%s&userClientType=%s&isSimulator=%s&deviceModel=%s",
        FbAuth: "https://ma.gametower.com.tw/Webs/Facebook2/Member/receive_login.aspx?mode=1&app_id=%s&uid=%s&access_token=%s",
        FbAuthV2: "https://ma.gametower.com.tw/Webs/Facebook2/Member/receive_login.aspx?mode=1&app_id=%s&uid=%s&access_token=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s",
        FbAuthV3: "https://ma.gametower.com.tw/Webs/Facebook2/Member/receive_login.aspx?mode=1&app_id=%s&uid=%s&access_token=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s&q_strLastAccount=%s&q_strLastErrorCode=%s&q_strLastErrorDesc=%s",
        PushNotificationLog: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/PushNotificationLog",
        AccountCheck: "https://www.gametower.com.tw/Member/Include/x_RegisterCheck.aspx",
        Referer: "https://www.gametower.com.tw",
        RegisterCounter: "https://www.gametower.com.tw/common/ad.aspx?c=MEMBER_REGISTER&s=MEMBER_REGISTER_GT_20000101_1042X2_001&t=HIT",
        Register: "https://www.gametower.com.tw/Games/Mobile/Member/GameRegister.aspx?mode=1&forreg=MEMBER_REGISTER_GT_20000101_1042X2_001_R",
        RegisterV2: "https://www.gametower.com.tw/Games/Mobile/Member/GameRegister.aspx?mode=1&forreg=MEMBER_REGISTER_GT_20000101_1042X2_001_R&lang=%s",
        NickNameRegisterUrl: "http://ex.gametower.com.tw/Games/client/Apply/index.aspx?mode=1",
        NickNameRefererUrl: "http://ex.gametower.com.tw",
        NicknameReferer: "https://ex.gametower.com.tw",
        NicknameRegister: "https://ex.gametower.com.tw/Games/client/Apply/index.aspx?mode=1&lc=%s",
        NicknameRegisterV2: "https://ex.gametower.com.tw/Games/client/Apply/Utf8ToBig5.aspx?mode=5&lc=%s",
        NicknameChange: "https://ex.gametower.com.tw/games/client/apply/Utf8ToBig5.aspx?lc=%s&mode=3",
        FbRegister: "https://ma.gametower.com.tw/Webs/Facebook2/Member/InGameRegister.aspx?mode=1&f_strExtend=forreg%3dMEMBER_REGISTER_GT_20000101_1042X2_001_R",
        FbGraphWebUrl: "https://graph.facebook.com/",
        ReceiptLog: "https://free  play-aio.gametower.com.tw/AIO_45/Service.asmx/AppPurchaseBackup",
        QueryPlatformStatus: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/QueryPlatformStatus",
        IsQueryPlatformStatusEnabled: "1",  
        QueryCurrentVersion: "https://freeplay-aio.gametower.com.tw/Apple/Service.asmx/QueryCurrentVersion?gameKind=%s&userClientType=%s&variation=%s",
        VitemImgLinkUrl: "https://cdn.gametower.com.tw/rd2/Common/VItem/ItemPic/%d.png?d=%ld",
        WhiteListingJsonUrl: "https://cdn.gametower.com.tw/rd2/Common/AIOWhitelisting/AIOWhitelistingJson.igs?d=%ld",
        QuestionnaireEnabled: "0",
        QuestionnaireID: "FREEPLAY_SATISFACTION_20180117",
        QuestionnaireReqURL: "https://www.gametower.com.tw/Services/register/Satis.aspx",
        QuestionnaireShowURL: "https://www.gametower.com.tw/common/al.aspx?lc=%s&re=https%3A%2F%2Fwww.gametower.com.tw%2FServices%2Fregister%2FSatisfaction.aspx%3Fgid%3D",
        WebLcLogin: "https://www.gametower.com.tw/common/al.aspx?lc=%s&re=",
        MD5CheckEnabled: "0",
        DownloadUseMd5: "1",
        DownloadUncompress_MultiThread: "0",
        LobbyGBtnRate: "0.0033",
        AvatarUrl: "https://cdn.gametower.com.tw/rd2/tmd/chatservice/profilepictures/%s",
        AvatarUrlNew: "https://cdn.gametower.com.tw/rd2/profilepictures/external/%s",
        AvatarFbUrlNew: "https://graph.facebook.com/%s/picture?width=512&height=512&access_token=%s",
        AvatarFolderDivideCount: "25",
        AvatarUpload: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/UploadProfilePicture_External",
        AvatarDataTotal: "1000",
        AvatarExpireTimeSelf: "1",
        AvatarExpireTime: "1",
        AvatarAioUpload: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/UploadAIOProfilePicture_External",
        AvatarAioUpload512: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/UploadAIOProfilePicture512_External",
        AvataAioUrl: "https://cdn.gametower.com.tw/rd2/aioprofilepictures/external/%s",
        GuestRequestUrl: "https://ma.gametower.com.tw/Webs/MobilePlatform/Member/GT_receive_login.aspx",
        UnionImageUrl: "https://cdn.gametower.com.tw/rd2/aio/unionprofilepictures/external/%s",
        UnionImageUpload: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/UploadUnionProfilePicture_External",
        UnionDataTotal: "250",
        UnionExpireTimeSelf: "1",
        UnionExpireTime: "1",
        IsShowChangePoint: "1",
        ChangePointUrl: "https://www.gametower.com.tw/Games/FreePlay/Mj/star31/InGame/Bank/Exchange/PointExchange.aspx",
        LineLoginChannelId: "1565115060",
        LineLoginLcUrl: "https://ma.gametower.com.tw/Webs/LINE/Member/receive_login.aspx?mode=1&gametype=MJ371&access_token=%s",
        LineLoginLcUrlV2: "https://ma.gametower.com.tw/Webs/LINE/Member/receive_login.aspx?mode=1&gametype=MJ371&access_token=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s",
        LineLoginLcUrlV3: "https://ma.gametower.com.tw/Webs/LINE/Member/receive_login.aspx?mode=1&gametype=MJ371&access_token=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s&q_strLastAccount=%s&q_strLastErrorCode=%s&q_strLastErrorDesc=%s",
        LineRegisterUrl: "https://ma.gametower.com.tw/Webs/LINE/Member/InGameRegister.aspx?mode=1",
        LineLoginUrlWin32: "https://ma.gametower.com.tw/webs/line/member/receive_login.aspx?comefrom=GT&gametype=MJ371&re=https%3A%2F%2Fad.gametower.com.tw%2F",
        LineLoginUrlWin32V2: "https://ma.gametower.com.tw/webs/line/member/receive_login.aspx?comefrom=GT&gametype=MJ371&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s&re=https%3A%2F%2Fad.gametower.com.tw%2F",
        News: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/News/%s",
        NewsCN: "http://gametower.startgame.gt365.com/Apple/com.igs.PokerService/News/%s",
        ExplainBig2Url: "https://www.gametower.com.tw/Games/FreePlay/Mj/star31/InGame/ibig2/data/menu.aspx",
        ExplainMJUrl: "https://www.gametower.com.tw/Games/Mobile/i371/InGame/menu.aspx",
        GameTowerUrl: "https://www.gametower.com.tw/",
        CDNUrl: "https://cdn.gametower.com.tw/",
        AndroidPayUrl: "https://www.gametower.com.tw/",
        AndroidProductUrl: "https://api.gametower.com.tw/",
        WindowsPayUrl: "https://www.gametower.com.tw/",
        WindowsProductUrl: "https://www.gametower.com.tw/",
        DeviceIdUrl: "https://account.app.gametower.com.tw/",
        YahooUrl: "https://ma.gametower.com.tw/Webs/Yahoo/Member/receive_login.aspx?comefrom=MOBILE&gametype=MJ371&re=igsappgameid501306812://yahoo.igs.com/",
        YahooUrlV2: "https://ma.gametower.com.tw/Webs/Yahoo/Member/receive_login.aspx?comefrom=MOBILE&gametype=MJ371&re=https%3A%2F%2Fad.gametower.com.tw%2F",
        YahooUrlV3: "https://ma.gametower.com.tw/Webs/Yahoo/Member/receive_login.aspx?comefrom=MOBILE&gametype=MJ371&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s&re=igsappgameid501306812://yahoo.igs.com/",
        YahooUrlV4: "https://ma.gametower.com.tw/Webs/Yahoo/Member/receive_login.aspx?comefrom=MOBILE&gametype=MJ371&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s&re=https%3A%2F%2Fad.gametower.com.tw%2F",
        YahooUrlV5: "https://ma.gametower.com.tw/Webs/Yahoo/Member/receive_login.aspx?comefrom=MOBILE&gametype=MJ371&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nSdkDeviceType=1&q_nDeviceNo=%s&re=igsappgameid501306812://yahoo.igs.com/&q_strLastAccount=%s&q_strLastErrorCode=%s&q_strLastErrorDesc=%s",
        AppleLoginUrl: "https://371-apple-ma.gametower.com.tw/Webs/Apple/Member/receive_login.aspx?mode=%d&gameType=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nDeviceNo=%s&q_nSdkDeviceType=1",
        AppleLoginAndRE: "https://ad.gametower.com.tw/",
        AppleLoginWebEnabledForIOS: "1",
        AppleLoginWebEnabledForPC: "0",
        AppleLoginWebEnabledForAndoird: "0",
        WechatLoginUrlV3: "https://ma.gametower.com.tw/Webs/WeChat/Member/receive_login.aspx?mode=%d&gametype=%s&code=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nDeviceNo=%s&q_nSdkDeviceType=1",
        WechatLoginTokenUrlV3: "https://ma.gametower.com.tw/Webs/WeChat/Member/receive_login.aspx?mode=%d&gametype=%s&refresh_token=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_nDeviceNo=%s&q_nSdkDeviceType=1",
        WechatLoginUrlBackUpV3: "https://ma.gametower.com.tw/Webs/WeChat/Member/receive_login.aspx?mode=1&gametype=%s&q_strWebDeviceID=%s&q_strWebAppStorageInstallationID=%s&q_strWebDeviceStorageInstallationID=%s&q_strLastAccount=%s&q_strLastErrorCode=%s&q_strLastErrorDesc=%s&q_nSdkDeviceType=1",
        GooglePlayLimitUrl: "https://api.gametower.com.tw/common/receive/Member/CheckIsBuyToModule.aspx?lc=%s&q_strAppID=com.igs.mjstar31&q_nGameNo=1&q_nModuleNo=109",
        WhiteListUrlV2: "https://api.gametower.com.tw/common/receive/Member/GetMemberWhiteStatus.aspx?lc=%s&q_nGameNo=1&q_nPlatformNo=%d",
        DepositCheckIsComsumeUrl: "https://www.gametower.com.tw/common/receive/Member/CheckIsComsume.aspx",
        DepositCheckIsBlackStatusUrl: "https://www.gametower.com.tw/common/receive/Member/GetMemberBlackStatus.aspx",
        WhiteDiamondProductUrl: "https://www.gametower.com.tw/common/receive/Member/choose/position.aspx?lc=%s&q_nGameServerGroupNo=10010&q_strPrizeIDs=10&q_strAppID=com.igs.mjstar31&q_nTransOptionNo=41&q_nPlatformNo=2",
        CHT4G: "http://203.69.83.213:8086/WebService.asmx/CHT4G?accound=%s&chtno=%s",
        HamiPass: "https://hamifans.cht.com.tw/HamiPass/AuthCS",
        iAP_ConsumeItemEnabeld: "0",
        iAP_CurrencyLogEnabeld: "1",
        iAP_PostUrl: "https://bank.gametower.com.tw/Bank/GooglePlay/Settle.aspx",
        iAP_CheckPostUrl: "https://bank.gametower.com.tw/common/receive/GooglePlay/Settle.aspx",
        FbRegisterUrl: "https://ma.gametower.com.tw/Webs/Facebook2/Member/InGameRegister.aspx?mode=1&f_strExtend=forreg%3dMEMBER_REGISTER_GT_20120222_1X1_001_R",
        FbRegisterCountUrl: "http://www.gametower.com.tw/common/ad.aspx?c=MEMBER_REGISTER&s=MEMBER_REGISTER_GT_20120222_1X1_001&t=HIT",
        RegisterUrl: "http://www.gametower.com.tw/common/ad.aspx?c=MEMBER_REGISTER&s=MEMBER_REGISTER_GT_20120924_1X1_001&t=HIT&re=games%2fmobile%2fmember%2fMobileRegister.aspx%3fmode%3d2%26forreg%3dMEMBER_REGISTER_GT_20120924_1X1_001_R",
        LinePoint: "https://freecoins.line-apps.com/v1/cv/sdk?sdk_token=&digest={clickid}&ifa={advertising_id}&action={event_name}",
        LinePointEnabled: "1",
        MissionRedShowEnabled: "1",
        VIPEnabled: "1",
        GooglePlayLimitEnabled: "1",
        GooglePlayAllChannelEnabled: "1",
        GuestLoginNewEnabled: "1",
        ReconnectEnabled: "5",
        GetMacAddress: "1",
        InAppRatingEnabled: "1",
        ProductIsValidEnabled: "0",
        BooldLeaveBtnEnabled: "0",
        BooldLeaveBtnExceptTheme: "",
        Poker13LeaveBtnEnabled: "0",
        ProductIsSorting: "1",
        SystemClearDataEnabeld: "1",
        APNS: "https://freeplay-aio.gametower.com.tw/Apple/Service.asmx/AddToken?bundleId=%s&tokenString=%s",
        LobbyGameAd: "https://ad.gametower.com.tw/Action/01_Freeplay/20121227J/630x150.jpg",
        LobbyGameConfig: "https://freeplay-aio.gametower.com.tw/Apple/Service.asmx/CommonLobbyGameSetting?accountId=%d&gameKind=%d&userClientType=%d&variation=%d",
        NewsEnabled: "1",
        ScratchCardEnabled: "1",
        ContestIcon: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/Contest/%s.png",
        BoxMissionEnabled: "1",
        BoxMissionIcon: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/BoxMission/%s.png",
        PrizeActivityEnabled: "1",
        PrizeActivityIcon: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/PrizeActivity/Icon/%s.png",
        VitemEnabled: "1",
        DiamondEnabled: "1",
        EmoticonIcon: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/Emoticon/%s/%s",
        AvatarIconUrl: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/AvatarChanger/%s",
        VerifyUrl: "https://www.gametower.com.tw/common/receive/VerifyCode.aspx?width=200&height=64",
        SMSSuccess: "https://www.gametower.com.tw/Games/Mobile/FreePlay/Android/Bank/Sms/succeeded.aspx",
        SMSFail: "https://www.gametower.com.tw/Games/Mobile/FreePlay/Android/Bank/Sms/failed.aspx",
        CommunityUrl: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/AIOGetCommunityStatus",
        AndroidOfficialIdentifier: "https://www.gametower.com.tw/download/download.aspx?fn=http://dl.gametower.com.tw/rd2/Apple/com.igs.AIO/APK/External/AIO_EX_OFFICIAL.apk&c=STAR31_DOWNLOAD&s=GT_APK",
        FriendVipEnabled: "0",
        FriendThemeInvitedEnabled: "1",
        FriendThemeUrl: "http://i.371.com.tw/1PG?room_id=%d",
        Start371AppByUrl: "https://i.371.com.tw/1PG?mode=1&type=%s",
        NewPlayerOutFlowV6: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/LoginStageLogVar6",
        AIOStartUrl: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/StartAppLogV2",
        AIOStartZipFailUrl: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/PatchZipLogV2",
        WebErrorCode: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/LoginErrorLogV3",
        LoginErrorCode: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/LoginErrorLogV3",
        DisconnectErrorCode: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/LoginDisconnectLogV3",
        DisconnectErrorCodeV4: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/LoginDisconnectLogV4",
        CNFirstPlayGuestLogin: "1",
        OnboardingEnabled: "1",
        DuplicateKickEnabled: "1",
        ProductIsFailCallFinish: "1",
        WebSupportLoginEnabled: "1",
        AdRedPointEnabeld: "0",
        IosMinVersion: "6.9.99",
        AndroidMinVersion: "6.9.99",
        AndroidOfficialMinVersion: "6.9.99",
        WinMinCurrentVersion: "6.9.99",
        VipMonthTipEnabled: "1",
        MailLuaEnabled: "1",
        IsLoginNeedVerifyForWin: "1",
        LoadingTipUrl: "https://cdn.gametower.com.tw/rd2/Common/AIOLoadingTip/AIOLoadingTipJson.igs?d=%ld",
        GuideSpecificGameEnabled: "1",
        Loading_Back_Timelimt: "-1",
        LoginSearchPWUrl: "https://www.gametower.com.tw/Games/FreePlay/InGame/Member/GameAccount/otp.aspx",
        TitleImgUrl: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/Title/%s",
        ShinyCardImgUrl: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/ShinyCard/%s",
        AndroidAdmobReward: "true",
        IosAdmobReward: "true",
        CTImgUrl: "https://cdn.gametower.com.tw/rd2/Apple/com.igs.PokerService/CapsulesToy/%s?d=%ld",
        CTNoActivityMsg: "扭蛋樂",
        CTNoActivityMsgCn: "扭蛋乐",
        iOSReceiptWebAuthEnabeld: "1",
        SimplifiedConvertionEnabled: "1",
        vivoxVoiceServer: "https://mt2p.www.vivox.com/api2/",
        vivoxVoiceRealm: "mt2p.vivox.com",
        vivoxVoiceIssuer: "igs6686-3106",
        vivoxVoiceKey: "hyWu8LWPZCoJh9SZx9cNurlUDixyIuYc",
        CNRestrictLanguageEnabled: "1",
        BridgeClientGamePingLog: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/BridgeClientGamePingLog",
        IsGoingToBridge: "https://freeplay-aio.gametower.com.tw/AIO_45/Service.asmx/IsGoingToBridge",
        SystemLanguageSettingEnabeld: "1",
        DownLoadingUrl: "https://cdn.gametower.com.tw/rd2/LuaUpdateAIO/AIO_VER_%s/",
        DownLoadingUrlCN: "https://gametower.startgame.gt365.com/LuaUpdateAIO/AIO_VER_%s/",
        DownLoadingRoleCacheTime: "86400",
        DownLoadingCacheTime: "0",
        WebSupportLoginFaceBookEnforceEnabled: "0",
        WebSupportLoginAppleEnforceEnabled: "0",
        WebSupportLoginWechatEnforceEnabled: "0",
        WebSupportLoginLineEnforceEnabled: "0",
        ShinyCardLineClubUrl: "https://line.me/ti/g/5csIWoej3i"
    });
}



export namespace EnvConfig {
    export const IS_DEV: boolean = AppDefine.EnvType < Environment.EXTERNAL; 
    export const Config: GameConfig = BuildVariables();
}
