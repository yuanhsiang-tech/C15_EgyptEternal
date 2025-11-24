import { _decorator, error, js } from 'cc';
import { WebviewType } from './WebviewType';
import { Device } from '../../Device/Device';
import { WebviewChildView } from './WebviewChildView';
import { WebviewProtocol, WebviewStore } from './WebviewProtocol';
import { GameApp } from '../../App/GameApp';
import Sha256 from '../../../Stark/Sha256/Sha256';
const { ccclass, property } = _decorator;

class BugReportParam {
    private m_output:string;      // 輸出的參數

    // 開啟網頁需要的參數
    private PLATFORM:number;    // 必填		平台編號 (歐美專案固定為 1)
    private CID:string;         // 必填		遊戲 ID (行動版：ISC、WIN版：SCC)
    private MNO:number;         // 必填		玩家帳號
    private NICKNAME:string;    // 必填		暱稱
    private MEMO:string;        // 必填		遊戲版本
    private LAN:string;         // 非必填	語系 (英文=EN，中文=TW，沒帶預設英文)
    private VL:number;          // 非必填	VIP 等級
    private UPLOAD:boolean;     // 非必填	帶 false 或 0 都不會顯示上傳圖片按鈕

    constructor() {
        let checkCodeValue:string = "";
        let output:string = "?";

        // 設定資料
        this.PLATFORM = 1;
        this.CID = "ISC";
        this.MNO = this.GetMemberNo();
        this.NICKNAME = this.GetNickName();
        this.MEMO = GameApp.Shared.Version + "-";
        // this.LAN = LocaleVar.Language;
        this.VL = this.GetVipLevel();
        this.UPLOAD = true;

        let keys = Object.keys(this);
        keys.sort();

        // CheckCode 產生處理
        for (let i = 0; i < keys.length; i++) {
            let eachKey = keys[i];
            let eachValue = this[eachKey]
            if (eachValue != null) {
                eachValue.toString();
                checkCodeValue += eachValue;
                output += eachKey + "=" + encodeURI(eachValue);
                output += "&"
            }
        }

        // ＊這裡應該後續補上
        // output += "CHECK_CODE=" + Sha256(checkCodeValue+EnvConfig.UrlPrefix.WEB_KEY);

        this.m_output = output;
    }

    protected GetMemberNo(): number {
        return 0;
    }

    protected GetNickName(): string {
        return "";
    }

    protected GetVipLevel(): number {
        return 0;
    }

    Output(): string {
        return this.m_output;
    }
}

class LoginBugReportParam extends BugReportParam {
    protected GetMemberNo(): number {
        return 0;
    }

    protected GetNickName(): string {
        // let account = Persist.App.Get(StorageKeys.ACCOUNT) || ""; ///先找account
        // if(account == "")
        //     account = Device.Current.WebDeviceStorageInstallationID;
        // return account;
    }

    protected GetVipLevel(): number {
        return 255;
    }
}

@ccclass('WebviewGeneralView')
export class WebviewGeneralView extends WebviewChildView {
    private m_productPackReady:boolean;
    private m_cacheBuyProductId:string;
    // private m_productPackId:IabPrizeID;
    // private m_purchaseGuard:IabExtension.PurchaseGuard;
    private m_dismissCallback:Function;

    /**
     * 額外面板開啟的參數
     * @param webviewType 開啟類型
     * @param url 要開啟的網址
     * @param transparent 是否透明背景
     */
    public LaunchOption(webviewType:WebviewType, url:string, transparent:boolean) {
        super.LaunchOption.apply(this, arguments);

        if (arguments.length > 0) {
            switch(this.m_webviewType.ID) {
                case WebviewType.CUSTOM.ID: {
                    if (arguments.length > 1) {
                        this.OpenWebView(arguments[1]);
                    }
                    break;
                }
                case WebviewType.REDIRECT_URL_WITH_LC.ID: {
                    let option:WebviewProtocol.OpenRedirectUrlWithLcOption = arguments[2];
                    this.m_dismissCallback = option ? option.callback : null;
                    this.m_delegate = option ? option.delegate : null;
                    // this.m_productPackId = option ? option.prizeID : null;
                    // if (this.m_productPackId) {
                    //     this.m_purchaseGuard = new IabExtension.PurchaseGuard();
                    //     this.m_purchaseGuard.SetDelegate(this);
                    //     this.m_purchaseGuard.QueryProductPack(this.m_productPackId);
                    // }
                    this.OpenRedirectUrlWithLC(arguments[1]);
                    break;
                }
            }
        }
    }

    /**
     * 介面即將離開場上顯示
     */
    public OnViewSelfWillDismiss(): void {
        super.OnViewSelfWillDismiss();
        // this.m_purchaseGuard?.Destroy();
        this.m_dismissCallback?.();
    }

    /**
     * 是否前往指定的網址
     * @param url 要前往的網址
     * 備註：這只有裝置上才會觸發
     */
    public ShouldStartLoading(url:string): boolean {
        let canForward:boolean = true;
        const urlAction:WebviewStore.UrlAction = WebviewStore.MakeUrlAction(url);

        // if (urlAction == WebviewStore.UrlActionSheets.IN_APP) {
        //     // [原生內購流程]
        //     canForward = false;

        //     const params:string[] = urlAction.Parse(url);
        //     if (this.m_productPackId == null) {
        //         error("WebViewGeneralView.ShouldStartLoading: 未指定品項所屬的 ProductPackId");
        //     } else if (Array.isArray(params) && params.length >= 1) {
        //         const productId:string = params[1];
        //         if (this.m_productPackReady) {
        //             this.m_purchaseGuard.BuyProduct(this.m_productPackId, productId);
        //         } else {
        //             this.m_cacheBuyProductId = productId;
        //         }
        //     }
        // }

        return canForward;
    }

    // public PurchaseQueryProductPackResponse(productPackId:IabPrizeID, productPack:Iab.ProductPack) {
    //     if (productPackId == this.m_productPackId && productPack) {
    //         this.m_productPackReady = true;

    //         // 再嘗試購買一次
    //         if (this.m_purchaseGuard && this.m_productPackId && this.m_cacheBuyProductId) {
    //             const buyProductId = this.m_cacheBuyProductId;
    //             this.m_cacheBuyProductId = null;
    //             this.m_purchaseGuard.BuyProduct(this.m_productPackId, buyProductId);
    //         }
    //     }
    // }

    // public PurchaseQueryProductPackFail(productPackId:IabPrizeID, errorCode: Iab.PurchaseQueryProductPackErrorCode, httpStatusCode: number) {
    //     if (productPackId == this.m_productPackId) {
    //         this.m_productPackReady = false;
    //     }
    // }

    // /**
    //  * 詢問跟 Finance Server 領取商品內容時所需使用的信件類型
    //  * @param productPackId 商品組代號
    //  * @param productId 品項識別碼
    //  */
    // public PurchaseTakePrizeMailType(productPackId:IabPrizeID, productId:string): ObtainmentEnum.MailType {
    //     return ObtainmentEnum.MailType.STORED_VALUE_COIN;
    // }

    // /**
    //  * Finance Server 回傳獎項後機制決定是否自行處理獎項結果顯示；未實作或回傳 false 則機制需自行處理獎項顯示處理，否則會改由共用領獎介面直接代替顯示
    //  * @param productPackId 商品組代號
    //  * @param productId 品項識別碼
    //  */
    // public PurchaseAutoProcessNotify(productPackId:IabPrizeID, productId:string):boolean {
    //     return true;
    // }
}

