import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { CarriarDecorator, CarriarParser } from "../../Net/Command/Command";
import { error, warn } from "cc";


enum PrizeKind
{
   PRIZE_KIND_INVALID = 0x0000,   // 未知

   PRIZE_KIND_MONEY = 0x0002,   // 錢         (0002-xxxx) (別使用 : 哀幣 / 鑽石)
   PRIZE_KIND_STORED_VALUE = 0x0003,   // 儲值類     (0003-xxxx) (儲值給機制獎勵 : 儲值給小豬幣 / 儲值給禮包...)
   PRIZE_KIND_CURRENCY = 0x0006,   // 多幣別     (0006-xxxx)
   PRIZE_KIND_CREDENTIALS = 0x0007,   // 資格       (0007-xxxx)
   PRIZE_KIND_PHOTO                    = 0x0009,   // 照片       (0009-xxxx)
   PRIZE_KIND_PERIODIC_ACTIVITY_ITEM   = 0x000A,   // 週期活動道具  (000A-xxxx)
   PRIZE_KIND_GAME_CARD                = 0x000B,   // 遊戲卡     (000B-xxxx) (與遊戲相關的卡片 : Free Spin / FreeGame / BonusGame...)
   PRIZE_KIND_SUITCASE                 = 0x000C,   // 手提箱     (000C-xxxx)
   PRIZE_KIND_JOURNEY_ALBUM_PHOTO      = 0x0010,   // 季節相本照片  (0010-xxxx)
   PRIZE_KIND_JOURNEY_ALBUM_PACK       = 0x0011,   // 季節相本卡包  (0011-xxxx)
   PRIZE_KIND_LUCKY_PUZZLE             = 0x0013,   // 百變卡碎片   (0013-xxxx)
   PRIZE_KIND_LUCKY_MAGIC_CARD         = 0x0014,   // 幸運百變卡   (0014-xxxx)
   PRIZE_KIND_LIVE_OPS_ITEM            = 0x001D,   // LiveOps道具 (001D-xxxx)
   PRIZE_KIND_QUEST_GAME               = 0x001E,   // QuestGame道具 (001E-xxxx)
   PRIZE_KIND_INTEGRAL                 = 0x9999,   // 積分類      (9999-xxxx) (競賽/任務週積分...)    
   PRIZE_KIND_MAX = 0xFFFF,   // 最大值
}

const PRIZE_CODE_STRING_MAX_LENGTH: number = 8;  // PrizeCode的字串長度
const INVALID_PRIZE_SERIAL_NUMBER: number = -0xFFFF;
const INVALID_PRIZE_KIND_STRING: string = "0000";
const INVALID_PRIZE_SERIAL_NUMBER_STRING: string = "FFFF";
const DEFAULT_PRIZE_CODE_STRING: string = "00000000";

@CarriarDecorator.ClassName( "PrizeCode" )
@CarriarDecorator.CustomToJson
class PrizeCode extends CarriarParser.AliasDefine
{

    private m_kindString: string = INVALID_PRIZE_KIND_STRING;
    private m_serialNumberString: string = INVALID_PRIZE_SERIAL_NUMBER_STRING;

    private m_kindNumber: PrizeKind = PrizeKind.PRIZE_KIND_INVALID;
    private m_serialNumber: number = INVALID_PRIZE_SERIAL_NUMBER;

    constructor ( codeStringOrPrizeKind?: string | PrizeKind, serialNumber?: number )
    {
        super();

        if ( codeStringOrPrizeKind )
        {
        if ( typeof ( codeStringOrPrizeKind ) == "string" )
        {
            this.__tryParseString( codeStringOrPrizeKind as string );
        } else if ( typeof ( codeStringOrPrizeKind ) == "number" && typeof ( serialNumber ) == "number" )
        {
            this.__tryParseKindAndNumber( codeStringOrPrizeKind as number, serialNumber );
        }
        // else
        // {
        //    error( "[PrizeCode] - bad arguments" );
        //    error( "codeStringOrPrizeKind = ", codeStringOrPrizeKind, " - type is : ", typeof ( codeStringOrPrizeKind ) );
        //    error( "serialNumber = ", serialNumber, " - type is : ", typeof ( serialNumber ) );
        // }
        }
    }

    // reimplement ToJson()
    public ToJson ( jsonKey?: string ): string { return this.m_kindString.toLocaleUpperCase() + this.m_serialNumberString.toLocaleUpperCase(); }

    /**
     * 轉換為字串 (ex: "00060066")
     */
    ToString (): string { return this.m_kindString.toLocaleUpperCase() + this.m_serialNumberString.toLocaleUpperCase(); }

    /**
     * @deprecated
     * 請使用 ToString()
     */
    override toString(): string { return this.ToString(); }

    IsKind ( prizeKind: PrizeKind ): Boolean { return this.m_kindNumber == prizeKind; }
    IsNotKind ( prizeKind: PrizeKind ): Boolean { return this.m_kindNumber != prizeKind; }

    // equal to(==)
    eq ( rhs: PrizeCode | string ): Boolean
    {
        if ( typeof ( rhs ) == "string" )
        return this.ToString() == rhs;
        else if ( rhs instanceof PrizeCode )
        return this.m_kindNumber == rhs.m_kindNumber && this.m_serialNumber == rhs.m_serialNumber;
    }
    // not equal to(!=)
    neq ( rhs: PrizeCode | string ): Boolean
    {
        if ( typeof ( rhs ) == "string" )
        return this.ToString() == rhs;
        else if ( rhs instanceof PrizeCode )
        return this.m_kindNumber != rhs.m_kindNumber || this.m_serialNumber != rhs.m_serialNumber;
    }

    IsBPPoint (): Boolean { return this.m_kindNumber == PrizeKind.PRIZE_KIND_INTEGRAL && this.m_serialNumber == 0x0006; }
    IsWeekPoint (): Boolean { return this.m_kindNumber == PrizeKind.PRIZE_KIND_INTEGRAL && this.m_serialNumber == 0x000A; }
    IsCurrency (): Boolean { return this.m_kindNumber == PrizeKind.PRIZE_KIND_CURRENCY || this.m_kindNumber == PrizeKind.PRIZE_KIND_MONEY; }
    // IsVitem (): Boolean
    // {
    //    return ( this.m_kindNumber >= PrizeKind.PRIZE_KIND_VITEM_BEGIN && this.m_kindNumber <= PrizeKind.PRIZE_KIND_VITEM_END );
    // }

    GetPrizeKind (): PrizeKind { return this.m_kindNumber; }
    GetPrizeKindString (): string { return this.m_kindString; }

    GetPrizeSerialNumber (): number { return this.m_serialNumber; }
    GetPrizeSerialNumberString (): string { return this.m_serialNumberString; }

    GetCurrencyType (): number { return this.m_serialNumber; }

    //
    // static function
    //
    static Code ( prizeKind: PrizeKind, serialNumber: number )
    {
        return new PrizeCode( prizeKind, serialNumber );
    }
    static CurrencyCode ( currencyType: number ): PrizeCode
    {
        return new PrizeCode( PrizeKind.PRIZE_KIND_CURRENCY, currencyType );
    }

    //
    // parse code string
    //

    private __tryParseString ( codeString: string ): Boolean
    {
        if ( PRIZE_CODE_STRING_MAX_LENGTH != codeString.length )
        {
        return false;
        }

        // codeString 是一個16進位表示式的字串，以四個為一組分為兩組。
        if ( isNaN( parseInt( codeString, 16 ) ) )
        {
        error( "[PrizeCode] - parse string to hex failed! codeString", codeString );
        return false;
        }

        this.m_kindString = codeString.substring( 0, 0 + 4 );
        this.m_serialNumberString = codeString.substring( 4, 4 + 4 );

        // 前4碼, 用16進位解析
        this.m_kindNumber = parseInt( this.m_kindString, 16 );
        if ( isNaN( this.m_kindNumber ) )
        {
        error( "[PrizeCode] - parse PrizeKind string failed! kindString", this.m_kindString );
        return false;
        }

        if ( this.m_kindNumber == PrizeKind.PRIZE_KIND_CURRENCY )
        {
        // 多幣別 : serial number 以10進位來解析
        this.m_serialNumber = parseInt( this.m_serialNumberString, 10 );
        } else
        {
        // 其它類型 : serial number 以16進位來解析
        this.m_serialNumber = parseInt( this.m_serialNumberString, 16 );
        }

        if ( isNaN( this.m_serialNumber ) )
        {
        error( "[PrizeCode] - parse PrizeSerialNumber string failed! serialNumberString", this.m_serialNumberString );
        return false;
        }

        return true;
    } // end of __tryParseString()

    private __tryParseKindAndNumber ( prizeKind: PrizeKind, serialNumber: number )
    {
        if ( prizeKind == PrizeKind.PRIZE_KIND_INVALID || prizeKind == PrizeKind.PRIZE_KIND_MAX )
        {
        return false;
        }
        if ( serialNumber == INVALID_PRIZE_SERIAL_NUMBER )
        {
        return false;
        }

        this.m_kindNumber = prizeKind;
        this.m_serialNumber = serialNumber;

        this.m_kindString = NumberUtils.PrefixFormat( prizeKind, 4, 16 );
        if ( prizeKind == PrizeKind.PRIZE_KIND_CURRENCY )
        {
        // 多幣別 : 以10進制轉換
        this.m_serialNumberString = NumberUtils.PrefixFormat( serialNumber, 4, 10 );
        } else
        {
        // 其它類型 : 以16進制轉換
        this.m_serialNumberString = NumberUtils.PrefixFormat( serialNumber, 4, 16 );
        }

        if ( ( this.m_kindString.length + this.m_serialNumberString.length ) != PRIZE_CODE_STRING_MAX_LENGTH )
        {
        error( "[PrizeCode] - parse with kind and serialNumber failed!", );
        warn( "prizeKind = ", prizeKind );
        warn( "serialNumber = ", serialNumber );

        this.m_kindString = INVALID_PRIZE_KIND_STRING;
        this.m_serialNumberString = INVALID_PRIZE_SERIAL_NUMBER_STRING;
        return false;
        }

        return true;

    } // end of __tryParseKindAndNumber()

} // end of class PrizeCode

export namespace GameCommonCommand {

    // 遊戲共用 Client Command 編號 200開始
    export enum U2G {
        U2G_COMMON_COMMAND_BEGIN = 200,

        U2G_COMMON_COMMAND_BET_SETTING_REQ = 201,

        U2G_COMMON_COMMAND_BIGAWARD_EFFECT_NOTIFY = 203,

        U2G_COMMON_COMMAND_MAX = 255,
    }

    // 遊戲共用 Server Command 編號 200開始
    export enum G2U {
        G2U_COMMON_COMMAND_BEGIN = 200,

        G2U_COMMON_COMMAND_BET_SETTING_ACK = 201,

        G2U_COMMON_COMMAND_MAX = 255,
    }

    export enum SPIN_ACK_TYPE {
        TIME_STAMP_INVALID = 201,
    }

    export enum UNLOCK_TYPE {
        UNLOCK_TYPE_UDEF    = 0,
	    UNLOCK_TYPE_MINI    = 1,
	    UNLOCK_TYPE_MINOR   = 2,
	    UNLOCK_TYPE_MAJOR   = 3,
	    UNLOCK_TYPE_MEGA    = 4,
	    UNLOCK_TYPE_ULTRA   = 5,
	    UNLOCK_TYPE_GRAND   = 6,
	    UNLOCK_TYPE_JACKPOT = 7,

	    UNLOCK_TYPE_FREE   = 20,
	    UNLOCK_TYPE_BONUS  = 21
    }

    /**
     * 遊戲共用的押注設定
     */
    @CarriarDecorator.ClassName("CommonBetInfo")
    export class CommonGameInfo extends CarriarParser.AliasDefine {
        BetList: BetInfo[] = [];
        JpList: JpSetting[] = [];
        UnlockList: UnLockInfo[] = [];
        BetUnlockTS: number = 0;

        constructor() {
            super(
                ["BetList", "bl", BetInfo],
                ["JpList", "jl", JpSetting],
                ["UnlockList", "ul", UnLockInfo],
                ["BetUnlockTS", "bt"]
            );
        }

        public static FromProto(protoData: any): CommonGameInfo {
            const result = new CommonGameInfo()
            result.BetList = protoData.betList.map((protoBetInfo: any) => {
                const betInfo = new BetInfo()
                betInfo.BetIndex = protoBetInfo.betIndex
                betInfo.Bet = Number(protoBetInfo.bet)
                betInfo.MinLevel = protoBetInfo.minLevel
                betInfo.MaxLevel = protoBetInfo.maxLevel
                return betInfo
            })
            result.JpList = protoData.jpList.map((protoJpSetting: any) => {
                const jpSetting = new JpSetting()
                jpSetting.Type = protoJpSetting.jpType
                jpSetting.BaseOdds = protoJpSetting.baseOdds
                return jpSetting
            })
            result.UnlockList = protoData.unlockList.map((protoUnlockInfo: any) => {
                const unlockInfo = new UnLockInfo()
                unlockInfo.UnlockType = protoUnlockInfo.unlockType
                unlockInfo.Bet = Number(protoUnlockInfo.bet)
                unlockInfo.UnlockLevel = protoUnlockInfo.unlockLevel
                return unlockInfo
            })
            result.BetUnlockTS = Number(protoData.betUnlockTs)
            return result
        }

        Clone(): CommonGameInfo {
            let clone = new CommonGameInfo();
            clone.BetList = this.BetList.map((info) => {
                return info.Clone();
            });
            clone.JpList = this.JpList.map((info) => {
                return info.Clone();
            });
            clone.UnlockList = this.UnlockList.map((info) => {
                return info.Clone();
            });
            clone.BetUnlockTS = this.BetUnlockTS;
            return clone;
        }
    }

    /**
     * 押注設定
     */
    @CarriarDecorator.ClassName("BetInfo")
    export class BetInfo extends CarriarParser.AliasDefine {
        Bet: number = 0;
        MinLevel: number = 0;
        MaxLevel: number = 0;
        BetIndex: number = 0;

        constructor() {
            super(
                ["Bet", "b"],
                ["MinLevel", "nl"],
                ["MaxLevel", "xl"],
                ["BetIndex", "bi"],
            );
        }

        Clone(): BetInfo {
            let clone = new BetInfo();
            clone.Bet = this.Bet;
            clone.MinLevel = this.MinLevel;
            clone.MaxLevel = this.MaxLevel;
            clone.BetIndex = this.BetIndex;
            return clone;
        }
    }

    /**
     * JP設定
     */
    @CarriarDecorator.ClassName("JpSetting")
    export class JpSetting extends CarriarParser.AliasDefine {
        Type: number = 0; //JP類型
        BaseOdds: number = 0; //押注的倍數
        constructor() {
            super(
                ["Type", "type"],
                ["BaseOdds", "baseOdds"]
            );
        }

        Clone(): JpSetting {
            let clone = new JpSetting();
            clone.Type = this.Type;
            clone.BaseOdds = this.BaseOdds;
            return clone;
        }
    }

    /**
     * 解鎖設定
     */
    @CarriarDecorator.ClassName("UnLockInfo")
    export class UnLockInfo extends CarriarParser.AliasDefine {
        UnlockType: number = 0;
        Bet: number = 0;
        UnlockLevel: number = 0;

        constructor() {
            super(
                ["UnlockType", "ut"],
                ["Bet", "b"],
                ["UnlockLevel", "ul"]
            );
        }

        Clone(): UnLockInfo {
            let clone = new UnLockInfo();
            clone.UnlockType = this.UnlockType;
            clone.Bet = this.Bet;
            clone.UnlockLevel = this.UnlockLevel;
            return clone;
        }
    }

    export class ReconnectGameInfo {
        JpList: JpSetting[] = [];
        UnlockList: UnLockInfo[] = [];
        
        constructor(jpList: JpSetting[], unlockList: UnLockInfo[]) {
            this.JpList = jpList;
            this.UnlockList = unlockList;
        }

        // 給Client方便複製用
        //jpSettingList: GameCommonCommand.JpSetting[] = [];
        //unlockInfoList: GameCommonCommand.UnLockInfo[] = [];

        //[ "jpSettingList", "jl", GameCommonCommand.JpSetting],
        //[ "unlockInfoList", "ul", GameCommonCommand.UnLockInfo],
    }

    @CarriarDecorator.ClassName("BigAwardEffectNotify")
    export class BigAwardEffectNotify extends CarriarParser.AliasDefine {
        EffectType: number = 0;
        Count: number = 0;
        IsInFeatureGame: boolean = false;
        IsUsedGameCard: boolean = false;
        TotalBet: number = 0;
        TotalWin: BigNumber = null;
        PrizeCode: PrizeCode = null;
        
        constructor(winType?: number, isInFeatureGame?: boolean, isUsedGameCard?: boolean, totalBet?: number, totalWin?: BigValuable, prizeCode?: PrizeCode) {
            super(
                ["EffectType", "e"],
                ["Count", "c"],
                ["IsInFeatureGame", "infg"],
                ["IsUsedGameCard", "iugc"],
                ["TotalBet", "tbet"],
                ["TotalWin", "twin", BigNumber],
                ["PrizeCode", "p", PrizeCode ]
            );
            this.EffectType = winType;
            this.Count = 1;
            this.IsInFeatureGame = isInFeatureGame;
            this.TotalBet = totalBet;
            this.TotalWin = NumberUtils.ParseBigNumber(totalWin);

            // 之後有做遊戲卡的話這邊要補遊戲卡的prizeCode
            this.PrizeCode = new PrizeCode( DEFAULT_PRIZE_CODE_STRING );
            this.IsUsedGameCard = isUsedGameCard;
        }
    }

    @CarriarDecorator.ClassName("TournamentSpinAck")
    export class TournamentSpinAck extends CarriarParser.AliasDefine {
        indexNo: number = -1;  // 賽季編號
        getPoint: number = 0;  // 獲得積分 讓Client自行累加

        constructor() {
            super(
                ["indexNo", "i"],
                ["getPoint", "p"]
            );
        }
    }

    @CarriarDecorator.ClassName("CommonSpinAck")
    export class CommonSpinAck extends CarriarParser.AliasDefine {
        tournament: TournamentSpinAck = null;

        constructor() {
            super(
                ["tournament", "t", TournamentSpinAck]
            );
        }
    }

    export interface ILineAwardData {
        // 線獎的index
        GetIndex(): number;

        // 連線數
        GetCount(): number;

        // Symbol號碼
        GetSymbolIndex(): number;
    }
}