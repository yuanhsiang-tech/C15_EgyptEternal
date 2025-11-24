import { AppLifeService } from '../../Service/AppLifeService';
import * as AppLife from '../../Proto/service/appLife/appLife_pb';
import { EDITOR } from 'cc/env';

/**
 * 玩家資訊
 * 備註：主要是在做玩家資訊的統合轉接，減少在取用玩家資訊時需到處引用的情形
 */
class UserProfile {
    private static get UserInfo(): AppLife.UserInfo { return (AppLifeService.Instance as any).UserInfo; }

    /**
     * 帳號編號
     */
    public static get AccountId(): number { return UserProfile.UserInfo?.accountId; }

    /**
     * 帳號
     */
    public static get Account(): string { return UserProfile.UserInfo?.account; }

    /**
     * 帳號綁定資訊
     */
    public static get Binding(): AppLife.UserAccountBindingData[] { return UserProfile.UserInfo?.bindingData; }

    /**
     * 暱稱
     */
    public static get NickName(): string { return UserProfile.UserInfo?.mutableData.nickName; }

    /**
     * 性別
     */
    public static get Sexual(): number { return UserProfile.UserInfo?.mutableData.sexual; }

    /**
     * 國家
     */
    public static get Country(): string { return UserProfile.UserInfo?.mutableData.country; }

    /**
     * Vip 等級
     */
    public static get Vip(): number { return UserProfile.UserInfo?.vipLevel; }

    /**
     * 註冊區碼
     */
    public static get RegAreaCode(): string { return UserProfile.UserInfo?.registerAreaCode; }

    /**
     * 歷史登入資訊
     */
    public static get HistoryLoginInfo(): AppLife.UserHistoryLoginInfo { return UserProfile.UserInfo?.historyLoginInfo; }

    /**
     * 是否已通過認證
     */
    public static get IsVerified(): boolean { return UserProfile.UserInfo?.isVerified; }

    /**
     * 是否曾經儲值
     */
    public static get IsDeposit(): boolean { return UserProfile.UserInfo?.isDeposit; }
}

!EDITOR && Object.defineProperty(globalThis, "UserProfile", { get: function() { return UserProfile }}); 