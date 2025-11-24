import { sys } from "cc";
import { IabPrizeID } from "../../InAppBilling/IabPrizeID";


export namespace WebviewProtocol {
    /** Webview 面板控制 */
    export interface WebviewControl {
        /** 執行 WebView 內部頁面腳本 */
        EvaluateJS(str:string): void;

        /** 關閉面板 */
        Dismiss(): void;
    }

    /** Webview Delegate */
    export interface WebviewDelegate {
        /**
         * Webview 面板啟動通知
         * @param control Webview 面板控制
         */
        OnWebviewLaunch(control:WebviewControl): void;

        /** WebView 面板關閉通知 */
        OnWebviewDissmiss(): void;
    }

    /** 帶 LC 並導向指定位址的選擇參數 */
    export interface OpenRedirectUrlWithLcOption {
        /** 面板關閉前的回呼 */
        callback ?:Function;

        /** WebView Delegate */
        delegate ?:Partial<WebviewDelegate>;

        /** 有內購行為的品項所屬 ProductPackID */
        prizeID  ?:IabPrizeID;
    }
}

export namespace WebviewStore {
    export class UrlAction {
        public static OpenURL(url:string): boolean {
            return sys.openURL(url);
        }
    
        private m_iOSStoreUrl:string;
        private m_androidStoreUrl:string;
        private m_regUrlScheme:RegExp;
        private m_resignAfterAction:boolean;
        private m_identifier:string;  // ＊這個變數不用自己設定，最下方會的處理會自動帶入＊
    
        public get StoreUrl(): string { return sys.os == sys.OS.IOS ? this.m_iOSStoreUrl : this.m_androidStoreUrl; }
        public get ResignAfterAction(): boolean { return this.m_resignAfterAction; }
        public get Identifier(): string { return this.m_identifier; }
    
        constructor(urlScheme:string|RegExp, iOSStoreUrl:string="", androidStoreUrl:string="", resignAfterAction:boolean=true) {
            this.m_regUrlScheme                             = typeof urlScheme == "string" ? new RegExp(urlScheme) : urlScheme;
            this.m_iOSStoreUrl                              = iOSStoreUrl;
            this.m_androidStoreUrl                          = androidStoreUrl;
            this.m_resignAfterAction                        = resignAfterAction;
        }
    
        public OpenStore() {
            sys.openURL(this.StoreUrl);
        }
    
        public IsMatch(url:string): boolean {
            return this.m_regUrlScheme.test(url);
        }

        public Parse(url:string): string[] {
            return this.m_regUrlScheme.exec(url);
        }
    }
    
    export const UrlActionSheets = {
        // 一般網址
        WEB:                    new UrlAction(
                                    "^(http://|https://)",
                                ),
        /**
         * 內購：網頁通知要改走內購流程的網址
         * Android => muse://Iab/?ProductID=com.igs.ployslots.android.diamond_4999
         * iOS     => muse://ToAppleTrans/Buy?ProductID=com.igs.ployslots.ios.diamond_1999
         */
        IN_APP:                 new UrlAction(
                                    /^muse:\/\/.*ProductID=(.*)/
                                ),
        // 網頁組舊專案搬來但沒有移除的程式碼
        LEGACY:                 new UrlAction(
                                    "^muse://",
                                ),
        // // LINE
        // LINE:                   new UrlAction(
        //                             "^line://pay/payment", 
        //                             "itms-apps://itunes.apple.com/app/id443904275", 
        //                             "market://details?id=jp.naver.line.android",
        //                             false),
        // // LINE 沙箱
        // LINE_SANDBOX:           new UrlAction(
        //                             "^linesandbox://", 
        //                             "itms-apps://itunes.apple.com/app/id443904275", 
        //                             "market://details?id=jp.naver.line.android",
        //                             false),
        // // 街口
        // JKOS:                   new UrlAction(
        //                             /(?<=^externalopen:\/\/\?url=)http.*/, 
        //                             "itms-apps://itunes.apple.com/app/id1020122239", 
        //                             "market://details?id=com.jkos.app",
        //                             false),
        // // 全支付
        // PXPAYPLUS:              new UrlAction(
        //                             "^https?:\/\/.*pxpayplus\.",
        //                             "itms-apps://itunes.apple.com/app/id1605910655",
        //                             "market://details?id=com.pxpayplus.app",
        //                             false
        //                         )
    }
    
    export function MakeUrlAction(url:string): UrlAction {
        let urlAction:UrlAction;
        
        // if (UrlActionSheets.PXPAYPLUS.IsMatch(url)) {
        //     // [全支付] => 全支付也是 http(s) 開頭的網址，為了避免與一般網址混淆，在此最一開始直接先檢查是否為全支付
        //     urlAction                                       = UrlActionSheets.PXPAYPLUS;
        // } else if (UrlActionSheets.WEB.IsMatch(url)) {
        //     // [一般網址]
        //     urlAction                                       = UrlActionSheets.WEB;
        // } else if (UrlActionSheets.IN_APP.IsMatch(url)) {
        //     // [內購]
        //     // ＊因為內購的 url scheme 和網頁組舊程式碼的 url scheme 相同，這兩者的檢查順序會影響到最終的結果，因此將內購提前獨立處理
        //     urlAction                                       = UrlActionSheets.IN_APP;
        // } else {
        //     for (const urlActionName in UrlActionSheets) {
        //         const eachUrlAction:UrlAction               = UrlActionSheets[urlActionName];
        //         // 檢查是否屬於該支付方式
        //         if (eachUrlAction.IsMatch(url)) {
        //             // [找到選擇的支付方式]
        //             urlAction                               = eachUrlAction;
        //             break;
        //         }
        //     }
        // }
    
        return urlAction;
    }
}

// 幫 UrlAction 自動帶入變數 m_identifier 的值
(()=>{
    const allUrlActionNames:string[] = Object.keys(WebviewStore.UrlActionSheets);
    for (let urlActionName of allUrlActionNames) {
        const urlAction:WebviewStore.UrlAction = WebviewStore.UrlActionSheets[urlActionName];
        urlAction["m_identifier"] = urlActionName;
    }
})();