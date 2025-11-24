import { GameInfo, IGameInfo } from "./GameInfoDefine";
import { StageInfoMap } from "./StageDefine";

/**
 * 遊戲ID
 */
export enum GameId {
    UNDEF = 0,

    DICE = 1101,
    PUSH_TONG = 1102,
    FRUIT = 1103,
    MANGAN_DAHEN = 1104,

    FAN_TAN = 1501, // [明星接龍]
    SHOW_HAND = 1502,
    POKER_13 = 1503, // [十三支]
    //FDDZ                                  = 1505,
    DDZ = 1505,

    // 益智類遊戲     
    BLIND_CHESS = 1701,

    //直播共玩              
    E7_PLAY = 1799,

    CRASH_GAME_SLOT = 1801,  // [CRASH_GAME]
    NINJA_CRASH = 1802,  // [水果忍者]
    TOWER_RUSH = 1803,  // [瘋狂疊疊樂]
    STAR_HOMERUN = 1804,  // [明星全壘打]

    // 平台測試用遊戲               
    PING_PONG = 2001,
    ROCHAMBEAU = 2002,
    CHATROOM = 2003,
    TURRET = 2004,
    WHACKA_MOLE = 2005,
    QUADIGIT = 2006,
    TICTACTOE = 2007,

    // 淘金類遊戲               

    JCAPTAIN = 2101,
    FPK = 2102,
    SICBO = 2103,  // [骰寶甜心]
    MARTAI = 2104,
    FISH_HUNTER = 2105,
    MFH = 2106,
    TGK = 2107,
    SPK = 2108,
    CATCHER = 2109,
    SGSLOT = 2110,
    HONEY_BACCARAT = 2111,
    TMD = 2112,
    POSEIDON_SLOT = 2124,
    SUPER_EIGHT = 2126,
    THE_QUEEN_SLOT = 2130,  // [女王]
    FPKFH = 2132,
    PLS = 2133,
    FPK4K = 2134,
    BOXING_KING = 2136,  // [拳王]
    SICBO_NEW = 2138,
    HAPPY_FISH = 2139,  // [HappyFish]
    MONSTER_ISLAND = 2142,  // [捉妖達人]
    CHILLI = 2144,  // [火熱辣椒]
    UNIVERSE = 2145,  // [星際奪寶]
    CHISHIHUANG = 2146,  // [秦始皇]
    GOF_SLOT = 2147,  // [好運財神]
    CRYSTAL_ROULETTE = 2148,  // [水晶轉轉樂]
    DINOSAUR = 2149,  // [恐龍Ｑ彈]
    BBC = 2150,  // [包青天] //BAOZHENG
    GEM_SLOT = 2151,  // [寶石派對] GtOnGo, ADD BY Wade 20200203
    ROYAL_ARCHER = 2152,  // [奪寶神箭]
    ONELINE_SLOT = 2153,  // [發發發]
    BUFFALO_SLOT = 2154,  // [牛轉錢坤]
    DRAGON_HAMMER = 2155,  // [龍鎚爆金]
    DRAGONTYCOON = 2156,  // [獵龍大亨]
    AGENT_ACE = 2157,  // [金牌特務]
    ROMAX_SLOT = 2158,  // [羅馬X]
    GURA = 2160,  // [淘氣鯊]
    DESSERT_KINGDOM = 2161,  // [甜點王國]
    DRAGON_PHOENIX = 2162,  // [龍鳳爆喜]
    LUCKY_WHEEL = 2163,  // [幸運風火輪]
    MJ_SLOT = 2164,  // [麻將消消樂]
    SUPER_ACE = 2165,  // [超級王牌]
    PEARL_BUBBLE = 2166,  // [深海龍珠]
    LB_SLOT = 2167,  // [精靈賓果]
    LAVA_LINK = 2168,  // [火山爆發]
    QUEEN_EGYPT = 2169,  // [埃及豔后]
    DINORUN = 2170,  // [恐龍快跑]
    THREE_KINGDOM = 2171,  // [戰三國]
    PIRATE_SLOT = 2172,  // [航海金路]
    BIG_THREE_DRAGONS = 2173,  // [大三元]
    MJ_SLOT_MASSIVE = 2174,  // [大出血麻將消消樂]
    CRYSTAL777 = 2175,  // [豪華777]
    XIANGSHI_SLOT = 2176,  // [祥獅招財]
    CRAZY_777 = 2177,  // [777]
    MAYA_SLOT = 2178,  // [瑪雅]
    EGYPT_ETERNAL = 2179,  // [永恆法老]
    ALICE_SLOT = 2180,  // [愛麗絲]
    PET_SLOT = 2187,  // [砲塔對決]
    DOG_RUN = 2188,  // [跑跑阿柴]
    SKYTOWER = 2190,  // [幣塔龍珠]
    GOLDEN_LUCKY = 2191,  // [好運財神]
    FRANKENSTEIN = 2192,  // [科學怪人]
    WITCH_SLOT = 2193,  // [女巫瓶子]
    GOLDEN_LUCKY_MASSIVE = 2194,  // [大出血好運財神]

    EGYPT_SLOT = 2208,  // [法老王]
    LUCKY_TREE = 2220,  // [招財貓]

    // 美女館遊戲               
    PRETTY = 2301,
    TMJ = 2302,
    STAR_MJ = 2303,
    BLOOD_MJ = 2305,
    //GD13_MJ                               = 2307,  // [廣東13麻將]
    GD13_MJ = 2308,  // [香港13麻將]
    TMAN_MJ = 2306,  // [兩人麻將]
    SHANGHAI_SWEETHEART = 2367,  // [歌舞甜心]

    SLOT = 2500,  // [AIO - 拉霸機]
    BIG2 = 2502,  // [明星大老二]
    BLACKJACK = 2504,
    DRAGON_SHOOT = 2505,
    LUCKY_21 = 2506,  // [幸運21點]
    NIU_NIU = 2507,
    TEXAS_HOLDEM = 2508,
    TEN_HALF = 2509,  // [搶莊十點半]

    // 競技系列             
    CLUB_SYSTEM = 2601,
    CLUB_MJ = 2602,
    CLUB_BIG2 = 2603,

    NINE_ONE_ONE = 2911,  // [911][玖壹壹]

    // 閃耀卡交誼廳             
    SHININH_LOBBY = 8787,
}

/**
 * 遊戲資訊列表
 * 備註：需手動設定
 */
const InfoList: IGameInfo[] = [
    GameInfo.New(GameId.STAR_MJ, "StarMJ").Depend("TManMJ"),                                // 麻將三缺一
    GameInfo.New(GameId.FRANKENSTEIN, "Frankenstein").Portrait(),                           // 科學怪人   
    GameInfo.New(GameId.EGYPT_ETERNAL, "EgyptEternal")                                      // 永恆法老
];















































(InfoList as GameInfo[]).forEach((info: GameInfo) => StageInfoMap.set(info.Id, info));