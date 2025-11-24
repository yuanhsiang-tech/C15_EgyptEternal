import { LogService } from "../Service/LogService";
import { VipService } from "../Service/VipService";
import { LobbyService } from "../Service/LobbyService";
import { LoginService } from "../Service/LoginService";
import { DayBuyService } from "../Service/DayBuyService";
import { MemberService } from "../Service/MemberService";
import { AppLifeService } from "../Service/AppLifeService";
import { FinanceService } from "../Service/FinanceService";
import { ServiceConfig, ServiceType } from "./ServiceDefine";
import { PlatformService } from "../Service/PlatformService";
import { StatementService } from "../Service/StatementService";
import { MoneyRainService } from "../Service/MoneyRainService";
import { DailyCheckService } from "../Service/DailyCheckService";
import { MondayOrgyService } from "../Service/MondayOrgyService";
import { VerifyCodeService } from "../Service/VerifyCodeService"; 
import { DiamondRankService } from "../Service/DiamondRankService";
import { WordCollectionService } from "../Service/WordCollectionService";
import { WebShoppingCardService } from "../Service/WebShoppingCardService";
import { GoldenPigService } from "../Service/GoldenPigService";



const configMap                                     = {}
configMap[ServiceType.LOGIN]                        = ServiceConfig.Create(LoginService)
configMap[ServiceType.APPLIFE]                      = ServiceConfig.Create(AppLifeService).WS()
configMap[ServiceType.STATEMENT]                    = ServiceConfig.Create(StatementService)
configMap[ServiceType.VERIFY_CODE]                  = ServiceConfig.Create(VerifyCodeService)
configMap[ServiceType.PLATFORM_API]                 = ServiceConfig.Create(PlatformService)
configMap[ServiceType.LOG_API]                      = ServiceConfig.Create(LogService)
configMap[ServiceType.LOBBY]                        = ServiceConfig.Create(LobbyService)
configMap[ServiceType.FINANCE]                      = ServiceConfig.Create(FinanceService)
configMap[ServiceType.VIP]                          = ServiceConfig.Create(VipService)
configMap[ServiceType.DAILY_CHECK]                  = ServiceConfig.Create(DailyCheckService)
configMap[ServiceType.MONEY_RAIN]                   = ServiceConfig.Create(MoneyRainService)
configMap[ServiceType.DAY_BUY]                      = ServiceConfig.Create(DayBuyService)
configMap[ServiceType.MEMBER_INFO]                  = ServiceConfig.Create(MemberService)
configMap[ServiceType.DIAMOND_RANK]                 = ServiceConfig.Create(DiamondRankService)
configMap[ServiceType.MONDAY_ORGY]                  = ServiceConfig.Create(MondayOrgyService)
configMap[ServiceType.WORD_COLLECTION]              = ServiceConfig.Create(WordCollectionService)
configMap[ServiceType.WEB_SHOPPING_CARD]            = ServiceConfig.Create(WebShoppingCardService)
configMap[ServiceType.GOLDEN_PIG]                   = ServiceConfig.Create(GoldenPigService)


























































/**
 * Service 類型定義表
 */
export const ServiceMap:Map<ServiceType, ServiceConfig> = (()=>{
    const map = new Map<ServiceType, ServiceConfig>();
    Object.keys(configMap).forEach((key)=>map.set(Number(key) as ServiceType, configMap[key as unknown as ServiceType]));
    return map;
})();