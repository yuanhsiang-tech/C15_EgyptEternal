import { _decorator, Component, error, js, Node, Vec2, v2 } from 'cc';
import { WebviewType } from './WebviewType';
import { WebviewProtocol } from './WebviewProtocol';
const { ccclass, property } = _decorator;

const URL_PARAM_INGAME_REGEX = /(&|\?)ingame=true/i;
const URL_PARAM_PREFIX_REGEX = /\?[\w]+=[\w]*/i;
const URL_PATH_COMP_INGAME   = /\/ingame\//i;

// 預設全畫面顯示時關閉按鈕的擺放位置
const DEFAULT_NATIVE_CLOSE_BUTTON_MARGIN:Vec2 = v2(0, 0);

@ccclass('WebviewChildView')
export class WebviewChildView extends Component implements WebviewProtocol.WebviewDelegate {
    private m_url:string;
    private m_maximize:boolean;
    protected m_webviewType:WebviewType;
    protected m_delegate:Partial<WebviewProtocol.WebviewDelegate>;
    protected m_transparent:boolean;
    public Dismiss:Function;
    public ReloadUrl:(url:string)=>void;

    /**
     * 要開啟的網址
     */
    public get Url(): string {
        return this.m_url;
    }

    /**
     * 是否有需要全畫面顯示
     */
    public get NeedMaximize(): boolean {
        return this.m_maximize;
    }

    /**
     * 額外面板開啟的參數
     * @param webviewType 開啟類型
     * @param url 要開啟的網址
     * @param transparent 是否透明背景
     * 注意：這個與 Panel 的 LaunchOption 觸發時機點不同，觸發時機會在 onLoad 的階段而非 onLoad 之前
     */
    public LaunchOption(webviewType:WebviewType, url:string, transparent:boolean) {
        this.m_maximize = webviewType.IsMaximize;
        this.m_webviewType = webviewType;
        this.m_transparent = transparent;
    }

    protected onDestroy(): void {
        super.onDestroy && super.onDestroy();

        if (this.m_delegate && typeof this.m_delegate.OnWebviewDissmiss == "function") {
            this.m_delegate.OnWebviewDissmiss();
            this.m_delegate = null;
        }
    }

    /**
     * 全畫面顯示下指定關閉按鈕的右側(marginRight)與上側距離(marginTop)
     */
    public MaximizeCloseButtonMarginRightAndTop(): Vec2 {
        return DEFAULT_NATIVE_CLOSE_BUTTON_MARGIN;
    }

    /**
     * 按下關閉按鈕
     */
    public OnCloseButtonClicked(): boolean {
        return true;
    }

    /**
     * 介面即將離開場上顯示
     */
    public OnViewSelfWillDismiss(): void {
    }

    /**
     * 在瀏覽器上是否需要開新分頁
     */
    public NeedNewTabOnBrowser(): boolean {
        return false;
    }

    /**
     * 頁面載入完成通知
     * @param url 頁面載入完成的網址
     * 備註：這只有裝置上才會觸發
     */
    public DidFinishLoading(url:string) {
    }

    /**
     * Webview 面板啟動通知
     * @param control Webview 面板控制
     */
    public OnWebviewLaunch(control: WebviewProtocol.WebviewControl): void {
        if (this.m_delegate && typeof this.m_delegate.OnWebviewLaunch == "function") {
            this.m_delegate.OnWebviewLaunch( control );
        }
    }

    /**
     * Webview 面板關閉通知
     */
    public OnWebviewDissmiss(): void {
        if (this.m_delegate && typeof this.m_delegate.OnWebviewDissmiss == "function") {
            this.m_delegate.OnWebviewDissmiss();
            this.m_delegate = null;
        }
    }

    /**
     * 介面準備逾時
     * 備註：
     * 1. 在準備完成時應該執行 Present 方法表示一切就緒
     * 2. 可以回傳一個錯誤代碼供視窗顯示
     */
    public OnViewSelfPrepareTimeout?(): number|void {
        return null;
    }

    /**
     * 是否前往指定的網址
     * @param url 要前往的網址
     * 備註：這只有裝置上才會觸發
     */
    public ShouldStartLoading(url:string): boolean {
        return true;
    }

    /**
     * 是否使用透明背景
     */
    public IsTransparent(): boolean {
        return this.m_transparent;
    }

    /**
     * 開啟特定網址的 Webview
     * @param url 開啟網址
     */
    protected OpenWebView(url:string) {
        this.m_url = url;
    }

    /**
     * 請求 LC
     */
    protected RequestLC(callFunc:Function) {
        // KeepSession.Instance.QueryLC((isSuccess:boolean, lc:string)=>{
        //     if (isSuccess) {
        //         callFunc.call(this, lc);
        //     }
        // })
    }

    /**
     * 開啟任意導向的網址
     * @param redirectUrl 要開啟的網址
     */
    protected OpenRedirectUrlWithLC(redirectUrl:string) {
        this.RequestLC((lc:string)=>{
            const encodeUrl = encodeURIComponent(this.OfficialWebUrlInspector(redirectUrl));
            // const url = js.formatStr(EnvConfig.VARS.REDIRECT_URL_WITH_LC, lc, encodeUrl);
            this.OpenWebView(url);
        });
    }
}

