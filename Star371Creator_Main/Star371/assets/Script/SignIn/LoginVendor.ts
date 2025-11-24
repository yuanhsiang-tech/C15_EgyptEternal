import { _decorator, Component, js, log, Node, sys, warn } from 'cc';
import { GuestRequest } from './Guest/GuestRequest';
import { Persist } from '../Persist/Persist';
import { StorageKeys } from '../Define/StorageKeysDefine';
import { WebDomainType } from '../Proto/gt2/userTypes/userTypes_pb';
const { ccclass, property } = _decorator;

export namespace LoginVendor {
    function FindVendor(type:WebDomainType): any {
        const allVendors:string[] = Object.keys(LoginVendor.Vendors);
        for (let i = 0; i < allVendors.length; i++) {
            const vendorClass = LoginVendor.Vendors[allVendors[i]];
            if ((vendorClass as any).Type == type) {
                return vendorClass;
            }
        }
        return null;
    }

    export function CreateVendor(type:WebDomainType): IVendor {
        const venderClass:any = FindVendor(type);
        return venderClass ? new venderClass() : null;
    }

    export function VendorName(type:WebDomainType): string {
        const venderClass:any = FindVendor(type);
        return venderClass ? (venderClass as any).Name : "";
    }
    
	export enum SdkAuthResult {
		WAITING,
		SUCCESS,
        FAIL,
        CANCEL
    }

    export interface IVendor {
        readonly LC:string;
		readonly Type:WebDomainType;
		readonly StorageKeyAccount:string;
        readonly StorageKeyPassword:string;
        readonly Account:string;
        readonly Password:string;
        readonly VerifyCode:string;
        readonly AutoLogin:boolean;
        readonly NeedDeviceId:boolean;

        SdkAuthenticate(): boolean;
        SdkAuthResult(): LoginVendor.SdkAuthResult;

        ValidatePasscode(): boolean;
        ValidateLC(): boolean;
        ValidateSdk(): boolean;

        RequestLC();
        IsViolationLC():boolean;
        SetPasscode(account:string, password:string, verifyCode:string);
        ClearData();
    }
}

export namespace LoginVendor {
    interface IVendorClass {
        readonly Type:WebDomainType;
    }

    abstract class Vendor implements IVendor {
        public static get Type(): WebDomainType { return null; }

        protected m_account:string;
        protected m_password:string;
        protected m_verifyCode:string;

		protected m_lc:string;
        protected m_violationLC:boolean;
		protected m_type:WebDomainType;
		protected m_storageKeyAccount:string;
        protected m_storageKeyPassword:string;
        
		public get Type():WebDomainType { return this.m_type; }
		public get StorageKeyAccount():string { return this.m_storageKeyAccount; }
        public get StorageKeyPassword():string { return this.m_storageKeyPassword; }
        public get Account():string {
            if (this.m_account == null && this.m_storageKeyAccount != null) {
                const account:string = Persist.App.Get(this.m_storageKeyAccount);
                this.m_account = typeof account == "string" && account != "" ? account : null;
            }
            return this.m_account || "";
        }
        public get Password():string {
            if (this.m_password == null && this.m_storageKeyPassword != null) {
                const password:string = Persist.App.Get(this.m_storageKeyPassword);
                this.m_password = typeof password == "string" && password != "" ? password : null;
            }
            return this.m_password || "";
        }
        public get VerifyCode():string {
            return this.m_verifyCode;
        }
        public get LC():string { 
            return typeof this.m_lc == "string" && this.m_lc != "" ? this.m_lc : "";
        }
        public get AutoLogin():boolean {
            return false;
        }
        public get NeedDeviceId(): boolean {
            return true;
        }

		constructor(cls:IVendorClass, storageKeyAccount?:string, storageKeyPassword?:string) {
			this.m_type = cls.Type;
			this.m_storageKeyAccount = storageKeyAccount;
            this.m_storageKeyPassword = storageKeyPassword;
            this.m_violationLC = false;
        }
        
		public ValidatePasscode(): boolean {
			return this.Account != "" && this.Password != "";
        }

        public ValidateLC(): boolean {
            return this.LC != "";
        }

        public ValidateSdk(): boolean {
            return true;
        }

        public SetPasscode(account:string, password:string, verifyCode:string) {
            if (this.m_storageKeyAccount != null && this.m_storageKeyPassword != null) {
                this.m_account = account;
                this.m_password = password;
                this.m_verifyCode = verifyCode;
                Persist.App.Set(this.m_storageKeyAccount, account);
                typeof password == "string" && password.length > 0 && Persist.App.Set(this.m_storageKeyPassword, password);
            }
        }
        
		public RequestLC() {
        };

        public IsViolationLC():boolean {
            return this.m_violationLC;
        }
        
		public SdkAuthenticate(): boolean {
			return false;
        }
        
		public SdkAuthResult(): LoginVendor.SdkAuthResult {
			return LoginVendor.SdkAuthResult.WAITING;
        }
        
        public ClearData(clearPasscode:boolean=false) {
            this.m_account = null;
            this.m_password = null;
            this.m_verifyCode = null;
            this.m_violationLC = false;
            clearPasscode && this.m_storageKeyPassword && Persist.App.Remove(this.m_storageKeyPassword);
        }
    }

    export namespace Vendors {
        export class Guest extends Vendor {
            public static get Type(): WebDomainType { return WebDomainType.WEB_DOMAIN_AP; }

            constructor() {
                log("LoginByAP");
                super(Vendors.Guest);
            }

            public RequestLC() {
                GuestRequest.Request(
                    (result:GuestRequest.RequestResult)=>{
                        this.m_lc = result.RESULT.AccountList[0].LoginCode;
                    }, 
                    (message:string)=>{
                        this.m_violationLC = true;
                    });
            }

            public override SdkAuthenticate(): boolean {
                return true;
            }

            public override SdkAuthResult(): LoginVendor.SdkAuthResult {
                return LoginVendor.SdkAuthResult.SUCCESS;
            }
        }
        
        export class GameTower extends Vendor {
            public static get Type(): WebDomainType { return WebDomainType.WEB_DOMAIN_GAMETOWER; }

            public override get AutoLogin():boolean {
                return false;
            }

            public override get NeedDeviceId(): boolean {
                return false;
            }

            constructor() {
                log("LoginByGameTower");
                super(Vendors.GameTower, StorageKeys.LoginVendor.ACCOUNT_GT, StorageKeys.LoginVendor.PASSWORD_GT);
            }

            public override ValidateLC(): boolean {
                return this.ValidatePasscode();
            }

            public override SdkAuthenticate(): boolean {
                return true;
            }

            public override SdkAuthResult(): LoginVendor.SdkAuthResult {
                return LoginVendor.SdkAuthResult.SUCCESS;
            }
        }
        
        // export class Apple extends Vendor {
        //     public static get Type(): WebDomainType { return WebDomainType.APPLE; }

        //     constructor() {
        //         log("LoginByApple");
        //         super(Vendors.Apple, Apple.Type, StorageKey.ACCOUNT_APPLE, StorageKey.PASSWORD_APPLE);
        //     }
            
        //     public RequestLC() {    		
        //         const paramString:string = js.formatStr( "?mode=1&PlatformNo=%d&gametype=%s&code=%s&familyname=%s&givenname=%s&email=%s"
        //             , DeviceCross.PlatformNo
        //             , "SC"
        //             , AppleLoginAdapter.AuthorizationCode()
        //             , AppleLoginAdapter.FamilyName()
        //             , AppleLoginAdapter.GivenName()
        //             , AppleLoginAdapter.Email());
        //         const requestFail = (code:number) => {
        //             log("RequestLCByApple fail with status: " + code);
        //         }

        //         Http.Get(
        //             AppDefine.Config.EnvData.APPLE_LOGIN_URL + paramString,
        //             (request:XMLHttpRequest) => {
        //                 if (!Http.IsValidStatus(request.status)) {
        //                     this.m_violationLC = true;
        //                     requestFail(request.status);
        //                 } else {
        //                     let result:string = request.responseText;
        //                     if (result == "-99" ) {
        //                         this.m_violationLC = true;
        //                         // [未知的失敗] => 網頁程式發生異常 (傳入參數錯誤、DB 連不到、程式錯誤...)
        //                         log("RequestLcByAPPLE failed : error code -99");
        //                         AppleLoginAdapter.SetConnectState(AppleLoginConnectState.FAILED);
        //                     } else if ( result.indexOf("DOCTYPE HTML") > 0 ) {
        //                         this.m_violationLC = true;
        //                         log("RequestLcByAPPLE failed! redirect page.");
        //                         AppleLoginAdapter.SetConnectState(AppleLoginConnectState.FAILED);
        //                     } else {
        //                         this.m_lc = result;
        //                         AppleLoginAdapter.SetConnectState(AppleLoginConnectState.CONNECTED);
        //                     }
        //                 }
        //             },
        //             (request:XMLHttpRequest, requestTimes:number, isLastTime:boolean, isError:boolean) => {
        //                 if (isLastTime) {
        //                     this.m_violationLC = true;
        //                     requestFail(request.status);
        //                 }
        //             }
        //         );
        //     }
            
        //     public SdkAuthenticate(): boolean {
        //         const isReady:boolean = AppleLoginAdapter.IsInit();
        //         if (isReady) {
        //             if (!this.m_isWebMode) {
        //                 AppleLoginAdapter.RequestAppleLogin();
        //             } else {
        //                 AppleLoginWebAdapter.RequestAppleLoginWebView(this.m_viewNode.getComponent(AppleLoginWebPanel));
        //             }
        //         }
        //         return isReady;
        //     }
            
        //     public SdkAuthResult(): LoginVendor.SdkAuthResult {
        //         const connectState = this.m_isWebMode? AppleLoginWebAdapter.GetConnectState(): AppleLoginAdapter.GetConnectState();
        //         if (connectState == AppleLoginConnectState.CONNECTING) {
        //             this.m_isWebMode && (this.m_lc = AppleLoginWebAdapter.LC);
        //             return LoginVendor.SdkAuthResult.SUCCESS;
        //         } else if (connectState == AppleLoginConnectState.FAILED) {
        //             return LoginVendor.SdkAuthResult.FAIL;
        //         }
        //         return LoginVendor.SdkAuthResult.WAITING;
        //     }

        //     public ClearData() {
        //         super.ClearData();
        //         AppleLoginAdapter.ClearData();
        //     }

        //     public ValidateApi(): boolean {
        //         const authCode:string = AppleLoginAdapter.AuthorizationCode();
        //         return typeof authCode == "string" && authCode != "";
        //     }
        // }
        
        // export class Google extends Vendor {
        //     public static get Type(): WebDomainType { return WebDomainType.GOOGLE; }

        //     constructor() {
        //         log("LoginByGoogle");
        //         super(Vendors.Google, StorageKey.ACCOUNT_GG, StorageKey.PASSWORD_GG);
        //     }
            
        //     public RequestLC() {
        //         const idToken:string = GoogleAdaptor.GetIdToken();
        //         const body = js.formatStr("mode=1&PlatformNo=%d&gametype=SC&id_token=%s", DeviceCross.PlatformNo, idToken);
        //         const requestFail = (code:number) => {
        //             log("RequestLCByGoogle fail with status: " + code);
        //         }
    
        //         Http.JsonPost(
        //             AppDefine.Config.EnvData.GOOGLE_LOGIN_URL, 
        //             body,
        //             (request:XMLHttpRequest, jsonObj?:any)=>{
        //                 if (!jsonObj) {
        //                     this.m_violationLC = true;
        //                     requestFail(request.status);
        //                 } else {
        //                     let returnCode = jsonObj ? jsonObj["RETURN_CODE"] : -999999;
        //                     if (returnCode == 0){
        //                         this.m_lc = jsonObj["RESULT"]["LC"];
        //                     } else {
        //                         // [失敗] 
        //                         // - 10：	LC 無效
        //                         // - 20：	該帳號已綁定過
        //                         // - 30：	欲綁定的介接帳號已被其他玩家綁定
        //                         // - 40：	帳號不存在
        //                         // - 99：	網頁程式發生異常(傳入參數錯誤、DB 連不到、程式錯誤...)
        //                         this.m_violationLC = true;
        //                         log("RequestLCByGoogle failed : error code ", returnCode);
        //                     }
        //                 }
        //             },
        //             (request:XMLHttpRequest, requestTimes:number, isLastTime:boolean, isError:boolean)=>{
        //                 if (isLastTime) {
        //                     this.m_violationLC = true;
        //                     requestFail(request.status);
        //                 }
        //             })
        //     }
            
        //     public SdkAuthenticate(): boolean {
        //         const isReady:boolean = GoogleAdaptor.IsInit();
        //         if (isReady){
        //             GoogleAdaptor.LoginByGoogle();
        //         }
        //         return isReady;
        //     }
            
        //     public SdkAuthResult(): LoginVendor.SdkAuthResult {
        //         if(GoogleAdaptor.GetLoginState() == GoogleLoginState.FAILED) {
        //             return LoginVendor.SdkAuthResult.FAIL;
        //         }
        //         else if(GoogleAdaptor.GetLoginState() == GoogleLoginState.SUCCESS) {
        //             return LoginVendor.SdkAuthResult.SUCCESS;
        //         }
        //         return LoginVendor.SdkAuthResult.WAITING;
        //     }

        //     public ClearData() {
        //         super.ClearData();
        //         GoogleAdaptor.ClearData();
        //     }

        //     public ValidateApi(): boolean {
        //         const idToken:string = GoogleAdaptor.GetIdToken();
        //         return typeof idToken == "string" && idToken != "";
        //     }
        // }
        
        // export class Facebook extends Vendor {
        //     public static get Type(): WebDomainType { return WebDomainType.FACEBOOK; }

        //     constructor() {
        //         log("LoginByFB");
        //         super(Vendors.Facebook, StorageKey.ACCOUNT_FB, StorageKey.PASSWORD_FB);
        //     }
            
        //     public RequestLC() {
        //         const appId:string = FacebookAdapter.GetAppId();
        //         const token:string = FacebookAdapter.GetAccessToken();
        //         const uid:string = FacebookAdapter.GetUserId();
        //         const url:string = js.formatStr(AppDefine.Config.EnvData.FACEBOOK_LOGIN_URL, appId, token, uid, DeviceCross.PlatformNo);
        //         const requestFail = (code:number) => {
        //             log("RequestLCByFB fail with status: " + code);
        //         }

        //         Http.Get(
        //             url,
        //             (request:XMLHttpRequest) => {
        //                 if (!Http.IsValidStatus(request.status)) {
        //                     this.m_violationLC = true;
        //                     requestFail(request.status);
        //                 } else {
        //                     let result:string = request.responseText;
        //                     if (result == "-99") {
        //                         this.m_violationLC = true;
        //                         // [未知的失敗] => 網頁程式發生異常 (傳入參數錯誤、DB 連不到、程式錯誤...)
        //                         log("RequestLCByFB failed : error code -99");
        //                     } else {
        //                         this.m_lc = result;
        //                     }
        //                 }
        //             },
        //             (request:XMLHttpRequest, requestTimes:number, isLastTime:boolean, isError:boolean) => {
        //                 if (isLastTime) {
        //                     this.m_violationLC = true;
        //                     requestFail(request.status);
        //                 }
        //             }
        //         )
        //     }
            
        //     public SdkAuthenticate(): boolean {
        //         const isReady:boolean = FacebookAdapter.IsInit();
        //         if (isReady) {
        //             FacebookAdapter.LoginByFB();
        //         }
        //         return isReady;
        //     }
            
        //     public SdkAuthResult(): LoginVendor.SdkAuthResult {
        //         if (FacebookAdapter.GetConnectState() == FBConnectState.FAILED) {
        //             return LoginVendor.SdkAuthResult.FAIL;
        //         } else if(FacebookAdapter.GetConnectState() == FBConnectState.CONNECTED) {
        //             return LoginVendor.SdkAuthResult.SUCCESS;
        //         }
        //         return LoginVendor.SdkAuthResult.WAITING;
        //     }

        //     public ClearData() {
        //         super.ClearData();
        //         FacebookAdapter.ClearData();
        //     }

        //     public ValidateApi(): boolean {
        //         const appId:string = FacebookAdapter.GetAppId();
        //         const token:string = FacebookAdapter.GetAccessToken();
        //         const uid:string = FacebookAdapter.GetUserId();
        //         return  typeof appId == "string" && appId != "" && 
        //                 typeof token == "string" && token != "" && 
        //                 typeof uid == "string" && uid != "";
        //     }
        // }
    }
}