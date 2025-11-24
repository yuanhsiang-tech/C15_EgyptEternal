import { error, log, sys } from "cc";
import { Device } from "../../Device/Device";
import Sha256 from '../../../Stark/Sha256/Sha256';
import { EnvConfig } from "../../Define/ConfigDefine";
import { Http } from "../../Net/Network/Http";

interface Timestamp {
    Code: number;
    Message: string;
    Data: {
        UtcNow: string;
        Timestamp: string;
        CustomUtcNow: string;
        CustomTimestamp: string;
    };
}

interface GuestRequestResultAccountInfo {
    Account: string;
    Type: string;
    LoginCode: string;
}

interface GuestRequestResultContent {
    WebAppStorageInstallationID: string;
    WebDeviceStorageInstallationID: string;
    WebDeviceID: string;
    WebDeviceNo: number;
    WebDeviceNoString: string;
    AccountList: GuestRequestResultAccountInfo[]; // 用戶帳號列表，可能是空的
}

interface GuestRequestResult {
    RESULT: GuestRequestResultContent;
    RETURN_CODE: number;
    RETURN_MESSAGE: string;
}

function RequestLC(timestamp:string, onSuccess:(result:GuestRequestResult)=>void, onFail:(message:string)=>void) {
    const content: { [key: string]: any } = {};
    content["GameNo"] = 1;
    content["Platform"] = 1;
    content["mode"] = 1;
    content["WebAppStorageInstallationID"] = Device.Current.WebAppStorageInstallationID;
    content["WebDeviceStorageInstallationID"] = Device.Current.WebDeviceStorageInstallationID;
    content["WebDeviceID"] = Device.Current.WebDeviceID;
    content["WebDeviceNo"] = Device.Current.WebDeviceNo;
    content["RemoteIP"] = "";//DeviceInfoHelper.getRemoteIP();

    const deviceInfo: { [key: string]: any } = {};
    deviceInfo["AppStorageInstallationID"] = Device.Current.WebAppStorageInstallationID;
    deviceInfo["DeviceStorageInstallationID"] = Device.Current.WebDeviceStorageInstallationID;
    deviceInfo["DeviceID"] = Device.Current.WebDeviceID;
    deviceInfo["Model"] = Device.Current.Model;
    deviceInfo["OSVersion"] = Device.Current.OSVersion;
    deviceInfo["AndroidID"] = Device.Current.AndroidID;
    deviceInfo["OS"] = (()=>{
        switch (sys.os) {
            case sys.OS.IOS: return "IOS";
            case sys.OS.ANDROID: return "ANDROID";
            default: return "WIN32";
        }
    })();
    content["DeviceInfo"] = deviceInfo;
    content["Time"] = timestamp;
    content["CheckCode"] = Sha256(Device.Current.WebDeviceID + timestamp + EnvConfig.Config.WEB_KEY);

    Http
        .Post("https://ma-dev.towergame.com/Webs/MobilePlatform/Member/GT_receive_login.aspx", Http.ContentType.JSON)
        .OnRawResponse((xhr:XMLHttpRequest)=>{
            if (xhr.readyState == 4) {
                let message:string;
    
                if (xhr.status != 200) {
                    message = "GuestRequest.RequestLC fail with status code: " + xhr.status;
                } else {
                    try {
                        const content:GuestRequestResult = JSON.parse(xhr.responseText);
                        if (content.RETURN_CODE != 0) {
                            message = "GuestRequest.RequestLC fail with code: " + content.RETURN_CODE + ", message: " + content.RETURN_MESSAGE;
                        } else {
                            onSuccess?.(content);
                        }
                    } catch (e) {
                        message = "GuestRequest.RequestLC fail with error: " + e.message;
                    }
                }
    
                if (message) {
                    error(message);
                    onFail?.(message);
                }
            }
        })  
        .Resume(JSON.stringify(content));
}

export namespace GuestRequest {
    export type RequestResult = GuestRequestResult;

    /**
     * 註冊裝置
     */
    export function Request(onSuccess:(result:RequestResult)=>void, onFail:(message:string)=>void): void {
        Http
            .Get(EnvConfig.Config.TIME_STAMP_URL)
            .OnRawResponse((xhr:XMLHttpRequest)=>{
                if (xhr.readyState == 4) {
                    let message:string;
        
                    if (xhr.status != 200) {
                        message = "GuestRequest.RequestTimestamp fail with status code: " + xhr.status;
                    } else {
                        try {
                            const timestamp:Timestamp = JSON.parse(xhr.responseText)
                            if (timestamp.Code != 0) {
                                message = "GuestRequest.RequestTimestamp fail with code: " + timestamp.Code;
                            } else {
                                log("請求成功:", timestamp.Message);
                                log("伺服器時間 (UTC):", timestamp.Data.UtcNow);
                                log("時間戳:", timestamp.Data.Timestamp);
                                log("自訂 UTC 時間:", timestamp.Data.CustomUtcNow);
                                log("自訂時間戳:", timestamp.Data.CustomTimestamp);
                                RequestLC(timestamp.Data.Timestamp, onSuccess, onFail);
                            }
                        } catch (e) {
                            message = "GuestRequest.RequestTimestamp fail with error: " + e.message;
                        }
                    }
        
                    if (message) {
                        error(message);
                        onFail?.(message);
                    }
                }
            })
            .Resume();
    }
}
