/**
 * Android 測試說明：
 * 確認在 AndroidManifest.xml 的 activity 設定好 intent-filter 內的 data 標籤，如：
 *  <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:host="{host}:{port}(如：slottriplink)"
            android:scheme="{scheme}(如：igsappgameid1513354214)"/>
    </intent-filter>

   在終端機輸入指令 adb shell am start -W -a android.intent.action.VIEW -d "{scheme}://{host}:{port}/{path}?{queryString}"
             如： adb shell am start -W -a android.intent.action.VIEW -d "igsappgameid501306812://billing?type%3Dopenweb%26p%3D3"
   備註：%3D 是 = 的 URL 編碼，%26 是 & 的 URLEncode 編碼
 */

import { EDITOR } from "cc/env";

/**
 * iOS 測試說明：
 * 確認在 info 頁籤下方的 URL Types 區塊的 URL Schemes 欄位加入 scheme，如： igsappgameid501306812
 * 
 * 在 safari 網址列直接輸入完整路徑，如： igsappgameid501306812://billing?type=openweb&p=3
 *                                   https://i371-twtest.towergame.com/2KQ
 */

// 搜尋字串鍵值對應類別
type QueryStringMap = {[key:string]:string};

// 搜尋字串鍵值關聯的字元
const QUERY_STRING_SEPERATOR:string = "=";

// 網址搜尋字串拆分正則表示
const REG_QUERY_STRING_PARAMETER:RegExp = /(?:[^=|&]*)=(?:[^&]*)/g;

/**
 * 網址拆分正則表示
 * 備注：套用成功會產出 6 個群組，依序為：url、scheme、host、port、path、queryString
 */
const REG_URL:RegExp = /(.*):\/\/([^?\/:]*):*(\d*)([^?]*)\?*(.*)/;

/**
 * 深度連結處理通知介面
 */
export interface DeepLinkDelegate {
    /**
     * 收到深度連結通知
     * @param url 深度連結網址
     */
    ContinueWithDeepLink(url:DeepLinkUrl);
}

/**
 * 深度連結 URL 物件
 */
export class DeepLinkUrl {
    public static ParseUrl(url:string): DeepLinkUrl {
        return (typeof url == "string" && url.length > 0) ? new DeepLinkUrl(decodeURIComponent(url)) : null;
    }

    private m_absoluteUrl:string;
    private m_scheme:string;
    private m_host:string;
    private m_port:number;
    private m_path:string;
    private m_pathComponents:string[];
    private m_queryString:string;
    private m_queryStringMap:QueryStringMap;

    /**
     * 完整的 URL
     */
    public get AbsoluteUrl(): string { return this.m_absoluteUrl; }
    /**
     * URL Scheme
     */
    public get Scheme(): string { return this.m_scheme; }
    /**
     * URL 主機名稱
     */
    public get Host(): string { return this.m_host; }
    /**
     * URL 使用的阜號
     */
    public get Port(): number { return this.m_port; }
    /**
     * URL 路徑
     */
    public get Path(): string { return this.m_path; }
    /**
     * URL 路徑部件
     */
    public get PathComponents(): string[] { return this.m_pathComponents; }
    /**
     * URL 搜尋字串
     */
    public get QueryString(): string { return this.m_queryString; }
    /**
     * 是否為有效的深度連結網址
     */
    public get IsValid(): boolean { return typeof this.m_scheme == "string" && typeof this.m_host == "string"; }

    
    private constructor(url:string) {
        this.m_absoluteUrl = url;

        const regArray:RegExpMatchArray = url.match(REG_URL);
        if (Array.isArray(regArray) && regArray.length > 1) {
            regArray.shift();
            this.m_scheme                           = regArray.shift() || "";
            this.m_host                             = regArray.shift() || "";
            this.m_port                             = isNaN(this.m_port=parseInt(this.m_port=regArray.shift() as any)) ? -1 : this.m_port;
            this.m_path                             = regArray.shift() || "";
            this.m_pathComponents                   = this.m_path.length > 0 ? ["/", ...this.m_path.split("/").splice(1)] : [];
            this.m_queryString                      = regArray.shift() || "";

            const regQueryString:RegExpMatchArray   = this.m_queryString.match(REG_QUERY_STRING_PARAMETER);
            if (Array.isArray(regQueryString) && regQueryString.length > 0) {
                for (let eachQeuryStringPart of regQueryString) {
                    const equalIndex:number         = eachQeuryStringPart.indexOf(QUERY_STRING_SEPERATOR);
                    const key:string                = eachQeuryStringPart.substring(0, equalIndex);
                    const value:string              = eachQeuryStringPart.substring(equalIndex + 1);
                    this.m_queryStringMap           = this.m_queryStringMap || {};
                    this.m_queryStringMap[key]      = value;
                }
            }
        }
    }

    /**
     * 取得指定名稱的搜尋字串值
     * @param name 搜尋字串名稱
     */
    public GetQueryParam(name:string): string {
        return typeof this.m_queryStringMap != "object" ? null : this.m_queryStringMap[name];
    }

    /**
     * 取得所有搜尋字串名稱
     */
    public GetQueryParamNames(): string[] {
        return typeof this.m_queryStringMap != "object" ? [] : Object.keys(this.m_queryStringMap);
    }

    /**
     * 將搜尋字串物件轉換成目標型別
     */
    public QueryParamsToObject<T>(): T {
        return this.m_queryStringMap as T;
    }
}

// 事件通知對象
let s_delegate:Partial<DeepLinkDelegate>;

/**
 * 深度連結控制元件
 */
export abstract class DeepLink {
    private constructor() {}

    /**
     * 初始化檢查處理
     * @param delegate 監聽事件的對象
     */
    private static Init(delegate?:Partial<DeepLinkDelegate>) {
        s_delegate = delegate;
    } 

    /**
     * 原生層呼叫深度連結叫用通知
     */
    private static NotifyReceiveDeepLink(deepLinkUrl:DeepLinkUrl): void {
        if (deepLinkUrl && deepLinkUrl.IsValid) {
            s_delegate?.ContinueWithDeepLink?.(deepLinkUrl);
        }
    }

    /**
     * 原生層呼叫深度連結叫用通知
     * @param url 連結網址
     * 注意：這是原生層直接呼叫上來的方法，請勿任意更改名稱及參數
     */
    private static CallDeepLinkNotify(url:string): void {
        const deepLinkUrl:DeepLinkUrl = DeepLinkUrl.ParseUrl(url);
        deepLinkUrl && DeepLink.NotifyReceiveDeepLink(deepLinkUrl);
    }
}

!EDITOR && eval("window.DeepLink=DeepLink");