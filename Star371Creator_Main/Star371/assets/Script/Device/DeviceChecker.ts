import { error, log } from "cc";
import { GuestRequest } from "../SignIn/Guest/GuestRequest";
import { Device } from "./Device";

export abstract class DeviceChecker {
    /**
     * 驗證裝置是否已經註冊完成
     */
    public static Check(): boolean {
        return !!(Device.Current.WebDeviceID != "" && 
                  Device.Current.WebDeviceStorageInstallationID != "" && 
                  Device.Current.WebAppStorageInstallationID != "" && 
                  Device.Current.WebDeviceNo != "");
    }

    /**
     * 註冊裝置
     */
    public static Regist() {
        if (this.Check()) {
            return false;
        }

        GuestRequest.Request(
            (result:GuestRequest.RequestResult)=>{
                log("設備註冊成功:", result.RESULT.WebAppStorageInstallationID, result.RESULT.WebDeviceStorageInstallationID, result.RESULT.WebDeviceID, result.RESULT.WebDeviceNo);
                Device.Helper.RegistIDs(
                    result.RESULT.WebDeviceID, 
                    result.RESULT.WebDeviceNoString,
                    result.RESULT.WebAppStorageInstallationID, 
                    result.RESULT.WebDeviceStorageInstallationID);
            },
            (message:string)=>{
                error("設備註冊失敗:", message);
            }
        );

        return true;
    }
}
