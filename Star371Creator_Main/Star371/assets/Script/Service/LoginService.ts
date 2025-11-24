import { sys } from "cc";
import { Device } from "../Device/Device";
import { Command } from "../Net/Command/Command";
import { LoginVendor } from "../SignIn/LoginVendor";
import * as Login from "../Proto/service/login/login_pb";
import { ProtoService } from "./Foundation/ProtoService";
import { UserClientType } from "../Proto/gt2/userTypes/userTypes_pb";
import { FriendAttr } from "../Net/Service/MicroService";

export class LoginService extends ProtoService {
    private m_ackData: Login.LoginAckData;

    @FriendAttr
    protected override get IsAutoManaged(): boolean {
        return false;
    }

    protected OnCommand(cmd: Command.ProtoCommand) {
        switch (cmd.Type) {
           case Login.S2U.LOGIN_ACK: {
              this.m_ackData = this.m_ackData || cmd.Parse(Login.LoginAckDataSchema);
              break;
           }
        }
    }

    public Login(vendor: LoginVendor.IVendor) {
        const requestData: Login.LoginRequestData = ProtoCreate(Login.LoginRequestDataSchema, {
            appVersion: "99.99.99",//GameApp.Shared.Version,
            username: vendor.Account,
            password: vendor.Password,
            lc: vendor.LC,
            deviceId: Device.Current.WebDeviceID,
            userClientType: this.GetUserClientType(),
            webDomainType: vendor.Type, 
            passCode: 0,
            passKey: ""
        }); 
        this.SendCommand(Login.U2S.LOGIN_REQ, requestData);
    }

    public GetAckData(): Login.LoginAckData {
       return this.m_ackData;
    }

    @FriendAttr
    protected override Reconnect(): boolean {
        this.m_ackData = null;
        return super.Reconnect();
    }

    private GetUserClientType(): UserClientType {
        switch (sys.os) {
            case sys.OS.IOS:
                return Device.Current.IsiPad || Device.Current.IsiOSAppOnMac ? UserClientType.USER_CLIENT_IPAD : UserClientType.USER_CLIENT_IPHONE;
            default:
                return UserClientType.USER_CLIENT_ANDROID;
        }
    }
}