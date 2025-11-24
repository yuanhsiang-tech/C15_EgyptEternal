import { JSB } from "cc/env";
import { error, js, path } from "cc";
import { Device } from "../../Device/Device";
import { GameId } from "../../Define/GameDefine";
import { RESTfulService } from "./RESTfulService";
import { Network } from "../../Net/Network/Network";
import { Command } from "../../Net/Command/Command";
import { LoginVendor } from "../../SignIn/LoginVendor";
import { GameInfo } from "../../Define/GameInfoDefine";
import { StageInfoMap } from "../../Define/StageDefine";
import { ServiceMap } from "../../Define/ServiceMapDefine";
import * as Login from "../../Proto/service/login/login_pb";
import { IConfigTest } from "../../Define/ConfigTestDefine";
import FiniteState from "../../../Stark/Utility/FiniteState";
import * as AppLife from "../../Proto/service/appLife/appLife_pb";
import { MicroServiceProtocol } from "../../Net/Service/MicroService";
import { ServiceConfig, ServiceType } from "../../Define/ServiceDefine";
import { GameService, GameServiceProtocol, IGameService } from "../GameService";
import { ConnectionType, ThemeType } from "../../Proto/gt2/basicTypes/basicTypes_pb";
import { UserJoinGameReason, UserLeaveGameResult } from "../../Proto/gt2/game/game_pb";

/**
 * 自定義連線關閉代碼
 * 備註：若出現非 4000 系列的請查閱官方定義代碼 https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
 */
export enum ConnectionCloseReason {
   SKCC_LOGIN_SECTION                       = 4300,
   SKCC_LOGIN_CONNECTING_WAIT_TIMEOUT       = 4301,
   SKCC_LOGIN_CONNECT_FAIL                  = 4302,
   SKCC_LOGIN_CONNECT_RETRY                 = 4303,
   SKCC_LOGIN_FINISH                        = 4304,

   SKCC_APPLIFE_SECTION                     = 4400,
   SKCC_APPLIFE_CONNECT_FAIL                = 4401,
   SKCC_APPLIFE_USER_DISAGREE_KICK          = 4402,
   SKCC_APPLIFE_USER_AGREE_KICK_TIMEOUT     = 4403,
   SKCC_APPLIFE_USER_AGREE_KICK_FAIL        = 4404,
   SKCC_APPLIFE_CONNECT_RETRY               = 4405,
   SKCC_APPLIFE_CONNECT_TIMEOUT             = 4406,
   SKCC_APPLIFE_CONNECTED_TIMEOUT           = 4407,
   SKCC_APPLIFE_RECONNECT_FAIL              = 4408,

   SKCC_USER_SECTION                        = 4700,
   SKCC_USER_REQUEST_LOGOUT                 = 4703,

   SKCC_TEMP_SECTION                        = 4800,
   SKCC_TEMP_WEB_FLIGHT_MODE                = 4801,

   SKCC_SECTION_END                         = 4998 // 最後一號可使用的編號，不可大於此號
}

const TIMEOUT_TIME: number = 5 * 1000;
const WAIT_RETRY_TIME: number = 0.1 * 1000;
const KICK_ONLINE_ACCOUNT_TIMEOUT_TIME: number = 10 * 1000;
const RETRY_LIMITATION: number = 0;

function Construct<T> (classT, type: number, delegate: Partial<MicroServiceProtocol>) : T {
   if (typeof classT === "function") {
      return new classT(type, delegate);
   }
   return null;
}

/**
 * 組出 service 路徑
 * @param baseUrl 基礎路徑
 * @type 服務編號
 */
function JoinServicePath(baseUrl: string, type: ServiceType): string {
   return path.join(baseUrl, "service", type.toString());
}

/**
 * 組出完整路徑
 * @param baseUrl 基礎路徑
 * @param appendPath 附加路徑
 * @param trailByClient 是否以 client 作為結尾
 */
function JoinPath(baseUrl: string, appendPath: string, trailByClient: boolean): string {
   return path.join(baseUrl, appendPath, trailByClient ? "client" : "");
}

enum PoolType {
   SERVICE,
   API_SERVICE,
   GAME,
   GAME_PENDING
}

enum STEP {
   WAIT,
   LOGIN,
   LOGIN_FAIL,
   LOGIN_TIMEOUT,
   LOGIN_TIMEOUT_WAIT_RETRY,
   LOGIN_FATAL_FAIL,

   APPLIFE_CONNECT,
   APPLIFE_CONNECT_TIMEOUT,
   APPLIFE_CONNECT_TIMEOUT_WAIT_RETRY,
   APPLIFE_CONNECT_FATAL_FAIL,

   APPLIFE_CONNECT_FAIL,
   APPLIFE_CONNECT_NEED_USER_AGREE_KICK,
   APPLIFE_CONNECT_USER_DID_AGREE_KICK,
   APPLIFE_CONNECT_USER_DISAGREE_KICK,
   APPLIFE_CONNECT_USER_AGREE_KICK_TIMEOUT,
   APPLIFE_CONNECT_USER_AGREE_KICK_FAIL,

   APPLIFE_CONNECTED,
   APPLIFE_CONNECTED_TIMEOUT,
   APPLIFE_CONNECTED_TIMEOUT_WAIT_RETRY,
   APPLIFE_CONNECTED_FATAL_FAIL,

   APPLIFE_DID_ACCESS_PREPARATION,
   APPLIFE_DID_ACCESS,

   APPLIFE_DISCONNECT,
   APPLIFE_WAIT_RECONNECT,
   APPLIFE_RECONNECTING,
   APPLIFE_SOCKET_ERROR,
}

interface IService<CommandType> {
    readonly Type: ServiceType;
    readonly IsConnected: boolean;
    readonly Status: Network.Status;
    readonly Url: string;
    readonly IsAutoManaged: boolean;
    
    MainProcess(dt: number);
    Connect(url: string): boolean;
    Reconnect(): boolean;
    Close(code: number): boolean;
    Destroy();
    SendCommand(type: Command.IType<CommandType>, content?: Command.IContent<CommandType>): boolean;
    GetCloseCode(): number;
    GetSocketError(): ErrorEvent;
    OnRedirectMessage(message: Command.ISerialize<CommandType>);
}
type GeneralService = IService<Command.Command>;

interface ILoginService extends GeneralService {
    Login(vendor: LoginVendor.IVendor);
    GetAckData(): Login.LoginAckData;
}

interface IAppLifeService extends GeneralService {
    readonly UserInfo:AppLife.UserInfo;
    AccessUserInfo(): boolean
    KeepAlive()
    GetConnectResult(): AppLife.ConnectionResult
    UserAgreeToKick(): boolean
    GetKickResult(): AppLife.BackKickedResult
    Logout()
    IsLogout(): boolean
    IsKickedByOthers (): boolean
    Reconnect(): boolean
}

type IGameServiceExt = GeneralService&IGameService&{
    OnJoined(result: AppLife.JoinGameAck, url?: string): boolean
    OnLeft(result: AppLife.LeaveGameAck): boolean
    NotifyLeave(reason: UserLeaveGameResult)
    OnExpel(reason: UserLeaveGameResult)
}

class ServicePool {
    private m_list: GeneralService[];
    private m_map: Map<ServiceType, GeneralService>;
    private m_persist: boolean;

    public get Length(): number { return this.m_list.length; }
    
    constructor() {
        this.m_list = [];
        this.m_map = new Map<ServiceType, GeneralService>();
        this.m_persist = false;
    }
    
    public Process(dt: number) {
        this.m_list.forEach(s=>{
            try {
                s.MainProcess(dt)
            } catch(e) {
                error(e);
            }
        });
    }
    
    public Reset() {
        if (!this.m_persist) {
            this.m_list.forEach(s=>s.Destroy());
            this.m_list.length = 0;
            this.m_map.clear();
        }
    }

    public Persist() {
        this.m_persist = true;
    }
    
    public Add(key: number, service: GeneralService): boolean {
        if (!this.m_map.get(key)) {
            this.m_list.push(service);
            this.m_map.set(key, service);
            return true;
        }
        return false;
    }
    
    public Get(key: number): GeneralService {
        return this.m_map.get(key);
    }
    
    public Delete(key: number): GeneralService {
        if (this.m_map.get(key)) {
            const service: GeneralService = this.m_map.get(key);
            this.m_map.delete(key);
            js.array.remove(this.m_list, service);
            return service;
        }
        return null;
    }
    
    public Dump(): GeneralService[] {
        return this.m_list;
    }
    
    public Has(key: number): boolean {
        return !!this.m_map.get(key);
    }
    
    public Close(code: number): boolean {
        let result: boolean = true;
        for (let service of this.m_list) {
            if (service.IsAutoManaged) {
                result &&= service.Close(code);
            }
        }
        return result;
    }
    
    public Reconnect(): boolean {
        let result: boolean = true;
        this.m_list.forEach(service=>{
            if (service.IsAutoManaged) {
                result &&= service.Reconnect();
            }
        })
        return result;
    }
}

class ServicePoolManager {
    private m_poolMap: Map<PoolType, ServicePool>;
    private m_poolList: ServicePool[];

    public get List (): ServicePool[] { return this.m_poolList; }

    constructor() {
        this.m_poolMap = new Map<PoolType, ServicePool>();
        this.m_poolList = [];
    }

    public Create(type: PoolType): ServicePool {
        if (this.m_poolMap.get(type)) {
            return this.m_poolMap.get(type);
        }

        const pool: ServicePool = new ServicePool();
        this.m_poolMap.set(type, pool);
        this.m_poolList.push(pool);
        return pool;
    }

    public Process(dt: number) {
        this.m_poolList.forEach(pool=>pool.Process(dt));
        this.m_poolMap.forEach
    }

    public Reset() {
        this.m_poolList.forEach(pool=>pool.Reset());
    }

    public AddToPool(type: PoolType, key: number, service: GeneralService) {
        return this.m_poolMap.get(type)?.Add(key, service) || false;
    }

    public SelectPool(type: PoolType): ServicePool {
        return this.m_poolMap.get(type);
    }

    public GetFromPool(type: PoolType, key: number): GeneralService {
        return this.m_poolMap.get(type)?.Get(key) || null;
    }

    public DeleteFromPool(type: PoolType, key: number): GeneralService {
        return this.m_poolMap.get(type)?.Delete(key) || null;
    }

    public Dump(type: PoolType): GeneralService[] {
        return this.m_poolMap.get(type)?.Dump() || [];
    }

    public Length(type: PoolType): number {
        return this.m_poolMap.get(type)?.Length || 0;
    }

    public Has(type: PoolType, key: number): boolean {
        return this.m_poolMap.get(type)?.Has(key) || false;
    }

    public Close(code: number) {
        this.m_poolList.forEach(pool=>pool.Close(code));
    }

    public Reconnect() {
        this.m_poolList.forEach(pool=>pool.Reconnect());
    }
}

export class Connection {
    private m_url: string;
    private m_vendor: LoginVendor.IVendor;

    private m_step: FiniteState<STEP>;
    private m_poolManager: ServicePoolManager;
    private m_delegator: Partial<MicroServiceProtocol&GameServiceProtocol>;
    private m_retryCount: number;
    private m_webFlightModeOn: boolean;
    private m_cacheHeaderMap: Network.HeaderMap;
    private m_kickDecision: boolean;
 
    private m_loginService: ILoginService;
    private m_appLifeService: IAppLifeService;
 
    public get NeedUserConfirmKick(): boolean { return (this.m_step.Current == STEP.APPLIFE_CONNECT_NEED_USER_AGREE_KICK || this.m_step.Next == STEP.APPLIFE_CONNECT_NEED_USER_AGREE_KICK) && this.m_kickDecision == null; }
    public get ReplyKickDecision(): boolean { return this.m_step.Next == STEP.APPLIFE_CONNECT_USER_DID_AGREE_KICK; }
    public get IsReconnecting(): boolean { return this.m_step.Current == STEP.APPLIFE_RECONNECTING; }
 
    constructor() {
        this.m_step = new FiniteState(STEP.WAIT);
        this.m_webFlightModeOn = false;
        
        this.m_poolManager = new ServicePoolManager();
        this.m_poolManager.Create(PoolType.SERVICE);
        this.m_poolManager.Create(PoolType.API_SERVICE).Persist();
        this.m_poolManager.Create(PoolType.GAME);
        this.m_poolManager.Create(PoolType.GAME_PENDING);
        
        this.m_delegator = {
           OnCommand: this.OnServiceCommand.bind(this),
           CustomHttpHeaderMap: this.CustomHttpHeaderMap.bind(this),
           SendJoinGame: this.SendJoinGame.bind(this),
           SendLeaveGame: this.SendLeaveGame.bind(this)
        };
    }

    public Init(url: string) {
        this.m_url = url;

        // 初始化 RESTfulService
        ServiceMap.forEach((config:ServiceConfig, type:ServiceType)=>{
            if (config.Creator.prototype instanceof RESTfulService) {
                this.CreateService(type, null, true);
            }
        });
    }
 
    public Login(vendor: LoginVendor.IVendor) {
        if (this.m_vendor == null) {
            this.m_vendor = vendor;
        }
    }
 
    public Reset() {
        this.m_vendor = null;
        this.m_poolManager.Reset();
        this.m_step = new FiniteState(STEP.WAIT);
        this.m_kickDecision = null;
        this.m_loginService = null;
        this.m_appLifeService = null;
    }
 
    public MainProcess(dt: number) {
        this.m_poolManager.Process(dt);
 
        switch (this.m_step.Tick()) {
            case STEP.WAIT: {
                if (this.m_vendor) {
                   this.m_retryCount = 0;
                   this.m_step.Transit(STEP.LOGIN, TIMEOUT_TIME);
                }
                break;
            }
          
            case STEP.LOGIN: {
                 if (this.m_step.IsEntering) {
                    this.m_cacheHeaderMap = null;
                    this.m_loginService = this.FindService(ServiceType.LOGIN) as ILoginService;
                    if (this.m_loginService) {
                        this.m_loginService.Reconnect();
                    } else {
                        this.m_loginService = this.CreateService(ServiceType.LOGIN);
                    }
                    this.m_loginService.Login(this.m_vendor);
                 }
                
                 const loginAckData: Login.LoginAckData = this.m_loginService.GetAckData();
                 if (this.m_step.IsTimeout) {
                    // [逾時]
                    this.m_step.Transit(STEP.LOGIN_TIMEOUT);
                 } else if (loginAckData && loginAckData.permission != Login.PERMISSION_TYPE.OK) {
                    // [失敗]
                    this.m_step.Transit(STEP.LOGIN_FAIL);
                 } else if (loginAckData) {
                    // [成功]
                    this.m_retryCount = 0;
                    this.m_loginService.Close(ConnectionCloseReason.SKCC_LOGIN_FINISH);
                    this.m_step.Transit(STEP.APPLIFE_CONNECT, TIMEOUT_TIME);
                 }
                 break;
            }
            case STEP.LOGIN_FAIL: {
                 if (this.m_step.IsEntering) {
                    this.m_loginService.Close(ConnectionCloseReason.SKCC_LOGIN_CONNECT_FAIL);
                 }
                 break;
            }
            case STEP.LOGIN_TIMEOUT: {
                 if (this.m_step.IsEntering) {
                     if (this.m_retryCount >= RETRY_LIMITATION) {
                        // [超過重試上限]
                        this.m_step.Transit(STEP.LOGIN_FATAL_FAIL);
                     } else {
                        // [未超過重試上限]
                        this.m_retryCount++;
                        this.m_step.Transit(STEP.LOGIN_TIMEOUT_WAIT_RETRY, WAIT_RETRY_TIME);
                     }
                 }
                 break;
            }
            case STEP.LOGIN_TIMEOUT_WAIT_RETRY: {
                 if (this.m_step.IsTimeout) {
                    this.m_loginService.Close(ConnectionCloseReason.SKCC_LOGIN_CONNECT_RETRY);
                    this.m_step.Transit(STEP.LOGIN, TIMEOUT_TIME);
                 }
                 break;
            }
            case STEP.LOGIN_FATAL_FAIL: {
                 if (this.m_step.IsEntering) {
                    this.m_loginService.Close(ConnectionCloseReason.SKCC_LOGIN_CONNECTING_WAIT_TIMEOUT);
                 }
                 break;
            }
           
            case STEP.APPLIFE_CONNECT: {
                 if (this.m_step.IsEntering) {
                    const loginAckData: Login.LoginAckData = this.m_loginService.GetAckData();
                    this.m_cacheHeaderMap = new Map();
                    this.m_cacheHeaderMap.set(Network.HeaderKey.ACCOUNT, loginAckData.accountId);
                    this.m_cacheHeaderMap.set(Network.HeaderKey.TOKEN, loginAckData.token);
                    this.m_appLifeService = this.FindService(ServiceType.APPLIFE) as IAppLifeService;
                    if (this.m_appLifeService) {
                        this.m_appLifeService.Reconnect();
                    } else {
                        this.m_appLifeService = this.CreateService(ServiceType.APPLIFE, path.join(loginAckData.accountId.toString(), loginAckData.token));
                    }
                 } else if (this.m_step.IsTimeout) {
                    // [等待逾時]
                    this.m_step.Transit(STEP.APPLIFE_CONNECT_TIMEOUT);
                 } else if (this.m_appLifeService.GetSocketError()) {
                    // [發生錯誤]
                    this.m_step.Transit(STEP.APPLIFE_SOCKET_ERROR);
                 } else if (this.m_appLifeService.GetConnectResult() == AppLife.ConnectionResult.WAIT_BACK_KICK) {
                    // [等待後踢前]
                    this.m_step.Transit(STEP.APPLIFE_CONNECT_NEED_USER_AGREE_KICK);
                 } else if (this.m_appLifeService.GetConnectResult() > AppLife.ConnectionResult.SUCCESS) {
                    // [失敗]
                    this.m_step.Transit(STEP.APPLIFE_CONNECT_FAIL);
                 } else if (this.m_appLifeService.GetConnectResult() == AppLife.ConnectionResult.SUCCESS) {
                    // [成功]
                    this.m_retryCount = 0;
                    this.m_step.Transit(STEP.APPLIFE_CONNECTED, TIMEOUT_TIME);
                 }
                
                 break;
            }
            case STEP.APPLIFE_CONNECT_TIMEOUT: {
                 if (this.m_step.IsEntering) {
                     if (this.m_retryCount >= RETRY_LIMITATION) {
                        // [超過重試上限]
                        this.m_step.Transit(STEP.APPLIFE_CONNECT_FATAL_FAIL);
                     } else {
                        // [未超過重試上限]
                        this.m_retryCount++;
                        this.m_step.Transit(STEP.APPLIFE_CONNECT_TIMEOUT_WAIT_RETRY, WAIT_RETRY_TIME);
                     }
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECT_TIMEOUT_WAIT_RETRY: {
                 if (this.m_step.IsTimeout) {
                    this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_CONNECT_RETRY);
                    this.m_step.Transit(STEP.APPLIFE_CONNECT, TIMEOUT_TIME);
                 }
                
                 break;
            }
            case STEP.APPLIFE_CONNECT_FATAL_FAIL: {
                 if (this.m_step.IsEntering) {
                    this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_CONNECT_TIMEOUT);
                 }
                
                 break;
            }
            case STEP.APPLIFE_CONNECT_FAIL: {
                 if (this.m_step.IsEntering) {
                    this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_CONNECT_FAIL);
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECT_NEED_USER_AGREE_KICK: {
                 if (this.m_step.IsEntering) {
                 } else if (this.m_appLifeService.GetSocketError()) {
                    // [發生錯誤]
                    this.m_step.Transit(STEP.APPLIFE_SOCKET_ERROR);
                 }
                
                 if (this.m_kickDecision == true) {
                    this.m_step.Transit(STEP.APPLIFE_CONNECT_USER_DID_AGREE_KICK, KICK_ONLINE_ACCOUNT_TIMEOUT_TIME);
                 } else if (this.m_kickDecision == false) {
                    this.m_step.Transit(STEP.APPLIFE_CONNECT_USER_DISAGREE_KICK);
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECT_USER_DID_AGREE_KICK: {
                 if (this.m_step.IsEntering) {
                    this.m_appLifeService.UserAgreeToKick();
                 } else if (this.m_step.IsTimeout) {
                    // [逾時]
                    this.m_step.Transit(STEP.APPLIFE_CONNECT_USER_AGREE_KICK_TIMEOUT);
                 } else if (this.m_appLifeService.GetKickResult() > AppLife.BackKickedResult.BK_SUCCESS) {
                    // [後踢前失敗]
                    this.m_step.Transit(STEP.APPLIFE_CONNECT_USER_AGREE_KICK_FAIL);
                 } else if (this.m_appLifeService.GetKickResult() == AppLife.BackKickedResult.BK_SUCCESS) {
                    // [後踢前成功]
                    this.m_retryCount = 0;
                    this.m_step.Transit(STEP.APPLIFE_CONNECTED, TIMEOUT_TIME);
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECT_USER_DISAGREE_KICK: {
                 if (this.m_step.IsEntering) {
                    this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_USER_DISAGREE_KICK);
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECT_USER_AGREE_KICK_TIMEOUT: {
                 if (this.m_step.IsEntering) {
                    this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_USER_AGREE_KICK_TIMEOUT);
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECT_USER_AGREE_KICK_FAIL: {
                 if (this.m_step.IsEntering) {
                     this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_USER_AGREE_KICK_FAIL);
                 }
                 break;
            }
           
            case STEP.APPLIFE_CONNECTED: {
                 if (this.m_step.IsEntering) {
                    // 要玩家資料
                    this.m_appLifeService.KeepAlive();
                    this.m_appLifeService.AccessUserInfo();
                 } else if (this.m_step.IsTimeout) {
                    // [逾時] => 重新取玩家資料
                    this.m_step.Transit(STEP.APPLIFE_CONNECTED_TIMEOUT);
                 } else if (this.m_appLifeService.GetSocketError()) {
                    // [發生錯誤]
                    this.m_step.Transit(STEP.APPLIFE_SOCKET_ERROR);
                 } else if (this.m_appLifeService.UserInfo) {
                    // [成功取得玩家資料]
                    this.m_step.Transit(STEP.APPLIFE_DID_ACCESS_PREPARATION);
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECTED_TIMEOUT: {
                 if (this.m_step.IsEntering) {
                    if (this.m_retryCount >= RETRY_LIMITATION) {
                       // [超過重試上限]
                       this.m_step.Transit(STEP.APPLIFE_CONNECTED_FATAL_FAIL);
                    } else {
                       // [未超過重試上限]
                       this.m_retryCount++;
                       this.m_step.Transit(STEP.APPLIFE_CONNECTED_TIMEOUT_WAIT_RETRY, WAIT_RETRY_TIME);
                    }
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECTED_TIMEOUT_WAIT_RETRY: {
                 if (this.m_step.IsEntering) {
                    this.m_step.Transit(STEP.APPLIFE_CONNECTED, TIMEOUT_TIME);
                 }
                 break;
            }
            case STEP.APPLIFE_CONNECTED_FATAL_FAIL: {
                 if (this.m_step.IsEntering) {
                    this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_CONNECTED_TIMEOUT);
                 }
                 break;
            }
           
            case STEP.APPLIFE_DID_ACCESS_PREPARATION: {
                ServiceMap.forEach((_, serviceType:ServiceType)=>this.CreateService(serviceType));
                this.m_step.Transit(STEP.APPLIFE_DID_ACCESS);
                break;
            }
            case STEP.APPLIFE_DID_ACCESS: {
                if (!this.m_appLifeService.IsConnected) {
                   // [沒有在運行中] => 斷線
                   this.m_step.Transit(STEP.APPLIFE_DISCONNECT);
                }
                break;
            }
            case STEP.APPLIFE_DISCONNECT: {
                // 停在這裡等待，如果有需要斷線重連則外部執行重連後就會將狀態切換成 APPLIFE_WAIT_RECONNECT
                if (this.m_step.IsEntering) {
                   const closeCode: number = this.m_appLifeService.GetCloseCode();
                   this.m_poolManager.Close(closeCode);
                }
                break;
            }
            case STEP.APPLIFE_WAIT_RECONNECT: {
                if (!JSB) {
                   // [網頁上] => 可能要模擬關閉網路後再開啟網路的流程，中間應該會有一段可控的等待時間
                   this.m_webFlightModeOn == false && this.m_step.Transit(STEP.APPLIFE_RECONNECTING);
                } else if (Device.Current.HasNetwork()) {
                   // [裝置上重連]
                   this.m_step.Transit(STEP.APPLIFE_RECONNECTING);
                }
                break;
            }
            case STEP.APPLIFE_RECONNECTING: {
                if (this.m_step.IsEntering) {
                   this.m_appLifeService.Reconnect();
                }
               
                if (this.m_appLifeService.GetSocketError() || this.m_appLifeService.GetConnectResult()) {
                   // [失敗] => token 失效，直接踢出去回到登入頁，整個重登
                   this.m_appLifeService.Close(ConnectionCloseReason.SKCC_APPLIFE_RECONNECT_FAIL);
                   this.m_step.Transit(STEP.APPLIFE_DISCONNECT);
                } else if (this.m_appLifeService.GetConnectResult() == AppLife.ConnectionResult.SUCCESS) {
                   // [成功]
                   this.m_poolManager.Reconnect();
                   this.m_step.Transit(STEP.APPLIFE_DID_ACCESS);
                }
                break;
            }
           
            case STEP.APPLIFE_SOCKET_ERROR: {
               break;
            }
        }
    }
 
    public WebFlightModeSwitch() {
        if (!JSB) {
           this.m_webFlightModeOn = !this.m_webFlightModeOn;
           if (this.m_webFlightModeOn) {
              // [模擬開啟飛航模式] => 網路斷開
              this.m_appLifeService.Close(ConnectionCloseReason.SKCC_TEMP_WEB_FLIGHT_MODE);
           } else {
              // [模擬關閉飛航模式] => 網路接通
              // ＊在此不需特別處理什麼
           }
        }
    }
 
    public DecideToKick(kick: boolean): boolean {
        if (this.m_step.Current == STEP.APPLIFE_CONNECT_NEED_USER_AGREE_KICK) {
           this.m_kickDecision = kick;
           return true;
        }
        return false;
    }
 
    public Logout() {
        this.m_appLifeService?.Logout();
        this.m_appLifeService?.Close(ConnectionCloseReason.SKCC_USER_REQUEST_LOGOUT);
    }
 
    public JoinGame(gameId: GameId): boolean {
        if (GameService.Instance) {
            return false;
        }

        let service: IGameServiceExt = this.FetchGameService(gameId);
        if (service == null) {
            service = Construct(GameService, gameId, this.m_delegator);
            service.Join();

            const pendingPool = this.m_poolManager.SelectPool(PoolType.GAME_PENDING);
            pendingPool.Reset();
            pendingPool.Add(gameId, service);
        }
        
        return true;
    }
 
    public Reconnect(): boolean {
        const shouldReconnect: boolean = this.ShouldReconnect();
        return shouldReconnect && this.m_step.Transit(STEP.APPLIFE_WAIT_RECONNECT), shouldReconnect;
    }
 
    public IsConnected(): boolean {
        return this.m_step.Current == STEP.APPLIFE_DID_ACCESS;
    }
 
    public IsConnectionClosed(): boolean {
        switch (this.m_step.Current) {
            case STEP.LOGIN_FAIL:
            case STEP.LOGIN_FATAL_FAIL:
            case STEP.APPLIFE_CONNECT_FAIL:
            case STEP.APPLIFE_CONNECT_USER_DISAGREE_KICK:
            case STEP.APPLIFE_CONNECT_USER_AGREE_KICK_TIMEOUT:
            case STEP.APPLIFE_CONNECT_USER_AGREE_KICK_FAIL:
            case STEP.APPLIFE_CONNECT_FATAL_FAIL:
            case STEP.APPLIFE_CONNECTED_FATAL_FAIL:
            case STEP.APPLIFE_DISCONNECT:
            case STEP.APPLIFE_WAIT_RECONNECT:
            case STEP.APPLIFE_RECONNECTING:
            case STEP.APPLIFE_SOCKET_ERROR:
            {
                return true;
            }
        }
       
        return false;
    }
 
    public IsLogout(): boolean {
        return !!this.m_appLifeService?.IsLogout();
    }

    private RedirectCommand(command: Command.Command): boolean {
        const type: number = command.Type as number;
        const content: Uint8Array = command.Content as Uint8Array;
        
        let isRedirect: boolean = true;
        
        switch (type) {
           case AppLife.S2U.ACK_JOIN_GAME: {
              const ack: AppLife.JoinGameAck = command.Parse(AppLife.JoinGameAckSchema);
              this.OnGameJoinCommand(ack);
              break;
           }
           case AppLife.S2U.ACK_LEAVE_GAME: {
              const ack: AppLife.LeaveGameAck = command.Parse(AppLife.LeaveGameAckSchema);
              this.OnGameLeaveCommand(ack);
              break;
           }
           default: {
              // [轉發到 Game 或 Service]
              const service: GeneralService = (this.FindService(type) || this.FetchGameService(type)) as unknown as GeneralService;
              service?.OnRedirectMessage(content);
              isRedirect = !!service;
              break;
           }
        }
       
        return isRedirect;
    }
 
    private ShouldReconnect(): boolean {
        return this.m_step.Current == STEP.APPLIFE_DISCONNECT &&
           this.m_appLifeService &&
           !this.m_appLifeService.IsKickedByOthers() &&
           !this.m_appLifeService.IsLogout();
    }
 


//#region 連線錯誤原因
    /**
     * 取得登入失敗的原因
     * 備註：這個是對 Login Service
     */
    public GetLoginAckData(): Login.LoginAckData {
        return this.m_loginService?.GetAckData();
    }
 
    /**
     * 取得 AppLife 連線期間的連線結果
     * 備註：這個是對 AppLife Service
     */
    public GetConnectResult(): AppLife.ConnectionResult {
        return this.m_appLifeService?.GetConnectResult();
    }
 
    /**
     * 取得 AppLife 後踢前結果
     * 備註：這個是對 AppLife Service
     */
    public GetKickResult(): AppLife.BackKickedResult {
        return this.m_appLifeService?.GetKickResult();
    }
 
    /**
     * 取得連線關閉的原因
     */
    public GetConnectionClosedReason(): number | ConnectionCloseReason {
        return this.m_appLifeService?.GetCloseCode() || this.m_loginService?.GetCloseCode() || null;
    }
 
    public GetSocketError(): ErrorEvent {
        return this.m_appLifeService?.GetSocketError();
    }
//#endregion
 


//#region 尋找 Service
    private FindService(type: ServiceType): GeneralService {
       return this.m_poolManager.GetFromPool(PoolType.SERVICE, type);
    }
 
    private FetchGameService(gameId: GameId): IGameServiceExt {
       return this.FindGameService(gameId) || this.FindPendingGame(gameId);
    }
 
    private FindGameService(gameId: GameId): IGameServiceExt {
       return this.m_poolManager.GetFromPool(PoolType.GAME, gameId) as IGameServiceExt;
    }
 
    private FindPendingGame(gameId: GameId): IGameServiceExt {
       return this.m_poolManager.GetFromPool(PoolType.GAME_PENDING, gameId) as IGameServiceExt;
    }
//#endregion
 


//#region 創建 Service
    private CreateService<T>(type: ServiceType, relativePath?: string, isApiService:boolean=false): T {
        let service: GeneralService = this.FindService(type);
        
        if (service == null) {
            const pool: PoolType = isApiService ? PoolType.API_SERVICE : PoolType.SERVICE;
            const config: ServiceConfig = ServiceMap.get(type);
            service = Construct(config.Creator, type, this.m_delegator);
            
            const url: string = this.GenerateUrl(config.IsHttp, pool, type, "", config.TestUrl, config.TestFullCustomPath);
            service.Connect(typeof relativePath != "string" ? url : path.join(url, relativePath));
            
            this.m_poolManager.AddToPool(pool, type, service);
        }
       
        return service as T;
    }
 
    private GenerateUrl(isHttp: boolean, poolType: PoolType, serviceTypeOrGameId: number, appendPath: string, testUrl: string, testFullCustomPath: boolean) {
        const isService:boolean = poolType == PoolType.SERVICE || poolType == PoolType.API_SERVICE;
        const isApiService:boolean = poolType == PoolType.API_SERVICE;
        let url: string = this.m_url;
        
        if (typeof testUrl == "string" && testUrl.length > 0) {
           // [客製化網址強制覆寫 Protocol]
            url = testUrl;
        }
       
        if (!Network.HasProtocol(url)) {
           // [沒有 Protocol] => 用是否為弱連及現有的網址推斷可能的 Protocol
            url = Network.SelectProtocol(isHttp, Network.IsSecureUrl(url)) + url;
        }
        url = isHttp ? Network.ConvertWStoHttp(url) : Network.ConvertHttpToWS(url);
       
        if (testFullCustomPath == false) {
            url = isService ? JoinServicePath(url, serviceTypeOrGameId) : url;
            url = JoinPath(url, appendPath, !isApiService);
        }
       
        return url;
    }
//#endregion
 


//#region MicroServiceProtocol
    private OnServiceCommand(id: number, command: Command.Command) {
        if (id == ServiceType.APPLIFE) {
           this.RedirectCommand(command);
        }
    }
 
    private CustomHttpHeaderMap(id: number): Network.HeaderMap {
        return this.m_cacheHeaderMap;
    }
//#endregion

//#region GameService Redirect Command
    private OnGameJoinCommand(ack: AppLife.JoinGameAck): boolean {
        let isSuccess: boolean = false;
        const service: IGameServiceExt = this.FindPendingGame(ack.gameId);
        if (service) {
            if (ack.connType != ConnectionType.CONN_TYPE_UDEF) {
                const config:IConfigTest = StageInfoMap.get(ack.gameId) as GameInfo;
                ack.uri = this.GenerateUrl(ack.connType != ConnectionType.CONN_TYPE_WEBSOCKET, PoolType.GAME, ack.themeId, ack.uri, config.TestUrl, config.TestFullCustomPath);
            }
            if (!service.OnJoined(ack, !!ack.connType ? ack.uri : null)) {
                // [加入失敗] 
                this.m_poolManager.SelectPool(PoolType.GAME_PENDING).Reset();
            } else {
                // [加入成功]
                this.m_poolManager.DeleteFromPool(PoolType.GAME_PENDING, ack.gameId);
                this.m_poolManager.AddToPool(PoolType.GAME, ack.gameId, service as unknown as GeneralService);
                isSuccess = true;
            }
        }
        return isSuccess;
    }
 
    private OnGameLeaveCommand(ack: AppLife.LeaveGameAck): boolean {
        let isSuccess: boolean = false;
        const service: IGameServiceExt = this.FindGameService(ack.gameId);
        if (service && service.OnLeft(ack)) {
            this.m_poolManager.SelectPool(PoolType.GAME).Reset();
            isSuccess = true;
        }
        return isSuccess;
    }
//#endregion
 


//#region GameServiceProtocol
    private SendJoinGame(themeName: string, gameId: GameId, themeType: ThemeType, joinType: UserJoinGameReason, checkVersion: number): boolean {
        const req: AppLife.RequestJoinGame = ProtoCreate(AppLife.RequestJoinGameSchema, {
                                                themeName: themeName,
                                                gameId: gameId,
                                                themeType: themeType,
                                                joinGameReason: joinType,
                                                clientVersion: checkVersion
                                            });
        return !!this.m_appLifeService?.SendCommand(AppLife.U2S.REQ_JOIN_GAME, req);
    }
 
    private SendLeaveGame(gameId: GameId, themeId: number): boolean {
        return !!this.m_appLifeService?.SendCommand(AppLife.U2S.REQ_LEAVE_GAME, ProtoCreate(AppLife.RequestLeaveGameSchema, { gameId: gameId, themeId: themeId }));
    }
//#endregion


}