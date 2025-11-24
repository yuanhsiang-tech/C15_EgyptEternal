import { log } from "cc";
import { Device } from "../Device/Device";
import { Command } from "../Net/Command/Command";
import { ServiceInstance } from "./Foundation/Service";
import { ProtoService } from "./Foundation/ProtoService";
import { FriendAttr } from "../Net/Service/MicroService";
import * as Currency from "../Proto/gt2/currency/currency_pb";
import * as AppLife from "../Proto/service/appLife/appLife_pb";
import { UserClientType } from "../Proto/gt2/userTypes/userTypes_pb";
import { Statement, StatementServiceDelegate } from "./StatementService";
import { GameApp } from "../App/GameApp";

// 持續發送心跳的間隔時間(單位：毫秒)
const KEEP_ALIVE_INTERVAL:number = 5 * 1000;

export type AppLifeServiceLCCallback = (result:boolean, lc:string) => void;

@ServiceInstance
export class AppLifeService extends ProtoService {
    public static readonly Instance: AppLifeService;

    private m_isLogout: boolean;
    private m_userInfo: AppLife.UserInfo;
    private m_connectResult: AppLife.ClientConnectionResult;
    private m_kickResult: AppLife.BackKickedResult;
    private m_kickedByOthers: boolean;
    private m_lcCallback: AppLifeServiceLCCallback[];

    @FriendAttr
    protected override get IsAutoManaged(): boolean {
        return false;
    }

    @FriendAttr
    protected get UserInfo(): AppLife.UserInfo {
        return this.m_userInfo;
    }

    public QueryLC(lcCallback:AppLifeServiceLCCallback=null) {
        this.m_lcCallback.push(lcCallback);
        this.SendCommand(AppLife.U2S.REQ_USER_LC);
    }

    protected override Start() {
        super.Start();
        this.m_isLogout = false;
        this.m_lcCallback = [];
    }

    protected OnCommand(cmd: Command.ProtoCommand) {
        switch (cmd.Type) {
            case AppLife.S2U.ACK_CONNECT: {
                this.m_connectResult = cmd.Parse(AppLife.ClientConnectionResultSchema);
                break;
            }
            case AppLife.S2U.ACK_USER_INFO: {
                this.m_userInfo = cmd.Parse(AppLife.UserInfoSchema);
                GameApp.Shared.CurrencyFlow.SetServerCurrency(this.m_userInfo.currenciesCredit.balances);
                break;
            }
            case AppLife.S2U.ACK_BACK_KICKED: {
                this.m_kickResult = cmd.Parse(AppLife.BackKickedInfoSchema).result;
                if (this.m_kickResult == AppLife.BackKickedResult.BK_SUCCESS) {
                    this.m_connectResult = ProtoCreate(AppLife.ClientConnectionResultSchema, {
                        result: AppLife.ConnectionResult.SUCCESS
                    });
                }
                break;
            }
            case AppLife.S2U.NOTIFY_BACK_KICK: {
                this.m_kickedByOthers = true;
                break;
            }
            case AppLife.S2U.ACK_USER_LC: {
                const info: AppLife.ClientLcEncodeInfo = cmd.Parse(AppLife.ClientLcEncodeInfoSchema);
                const isSuccess = info.result == AppLife.LcEncodeResult.LC_ENCODE_OK;
                this.m_lcCallback?.forEach(func=>func(isSuccess, info.lc));
                this.m_lcCallback.length = 0;
                break;
            }
            case AppLife.S2U.ACK_KEEPALIVE: {
                break;
            }
        }
    }

//#region 以下是公開的保護方法
    @FriendAttr
    protected AccessUserInfo(): boolean {
        const profile: AppLife.GameProfile = ProtoCreate(AppLife.GameProfileSchema, {
            userClientKey: {
                gameKind: 2303,
                type: UserClientType.USER_CLIENT_WEB,
                variation: 0
            },
            timeZone: new Date().getTimezoneOffset() / -60,
            clientIp: '',
            clientAreaCode: 'TW',
            deviceLanguageCode: 'zh-tw',
            appVersion: '1.0.0',
            tsVersion: '1.0.0',
            currencyCode: 'TWD',
            deviceModel: Device.Current.Model,
            deviceVersion: Device.Current.OSVersion
        });
        return this.SendCommand(AppLife.U2S.REQ_USER_INFO, profile);
    }

    @FriendAttr
    protected KeepAlive() {
        this.ScheduleSendCommand(KEEP_ALIVE_INTERVAL, AppLife.U2S.REQ_KEEPALIVE, ()=>{
            log("[GoGo] KeepAlive");
        });
    }

    @FriendAttr
    protected GetConnectResult(): AppLife.ConnectionResult {
        return this.m_connectResult?.result;
    }

    @FriendAttr
    protected UserAgreeToKick(): boolean {
        this.m_connectResult = null;
        return this.SendCommand(AppLife.U2S.REQ_BACK_KICKED);
    }

    @FriendAttr
    protected GetKickResult(): AppLife.BackKickedResult {
        return this.m_kickResult;
    }

    @FriendAttr
    protected Logout() {
        !this.m_isLogout && this.SendCommand(AppLife.U2S.REQ_LOGOUT);
        this.m_isLogout = true;
    }

    @FriendAttr
    protected IsLogout(): boolean {
        return this.m_isLogout;
    }

    @FriendAttr
    protected IsKickedByOthers(): boolean {
        return this.m_kickedByOthers;
    }

    @FriendAttr
    protected override Reconnect(): boolean {
        this.m_connectResult = null;
        this.m_kickResult = null;
        return super.Reconnect();
    }
//#endregion
}