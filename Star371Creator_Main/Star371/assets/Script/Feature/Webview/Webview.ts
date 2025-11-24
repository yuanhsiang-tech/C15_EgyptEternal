import { _decorator, Node, WebView, Vec3, view, isValid, warn, EditBox, Size, Sprite, Widget, UITransform, Texture2D, Vec2, Mat4, native, v3, director, Director, sys, screen, game, v2 } from 'cc';
import { DEBUG, JSB } from 'cc/env';
import { WebviewType } from './WebviewType';
import { Device } from '../../Device/Device';
// import { Loading } from '../Loading/Loading';
import { WebviewProtocol } from './WebviewProtocol';
import { ViewDefine } from '../../Define/ViewDefine';
import { WebviewChildView } from './WebviewChildView';
import { WebviewGeneralView } from './WebviewGeneralView';
import { ViewManager } from '../../ViewManage/ViewManager';
// import TransitionView from '../TransitionView/TransitionView';
import { ViewBase } from '../../ViewManage/Foundation/ViewBase';
import CommonButton from '../../../Stark/Interactive/CommonButton';
import { TouchableEvent } from '../../../Stark/Interactive/Touchable';
// import { TransitionViewObserver } from '../TransitionView/TransitionViewObserver';
const { ccclass, property } = _decorator;

// 空網頁
const EMPTY_URL:string = "about:blank"

// 網頁呼叫動作開頭
const OPERATION_URL_HEAD = /^operation:\/\//i;

// 網址開頭
const REG_URL_SCHEME = /^https?:\/\//i;

// 垂直顯示關閉按鈕位置
const PORTRAINT_CLOSE_BUTTON_POS:Vec3 = v3(275, 660, 0);

// 網頁呼叫動作類型
enum OperationType {
    CLOSE       = "close",
    OPEN_UI     = "openui",
    PUSH_UI     = "pushui",
    SHOW_NATIVE_CLOSE_BTN = "showclosebtn",
    HIDE_NATIVE_CLOSE_BTN = "hideclosebtn",
}

// 動作參數解析
class OperationParser {
    /** 解析字串 */
    public static ParseStringArg(input:string, key:string, defaultValue?:string): string {
        let result:string;
        (input||'').replace(new RegExp("(\\?|&)" + key + "=[\\w\\.]+", "i"), (substring)=>{
            if (typeof result != "string" || result == '') {
                result = substring.replace(new RegExp("(\\?|&)" + key + "=", "i"), '');
            }
            return substring;
        });
        return typeof result == "string" ? result.trim() : defaultValue;
    }

    /** 解析數字 */
    public static ParseNumberArg(input:string, key:string, defaultValue?:number): number {
        let argStr = this.ParseStringArg(input, key);
        return !isNaN(Number(argStr)) ? Number(argStr) : defaultValue;
    }

    /** 解析布林值 */
    public static ParseBooleanArg(input:string, key:string, defaultValue?:boolean): boolean {
        let argStr = this.ParseStringArg(input, key);
        if (typeof argStr == "string") {
            switch (argStr.toLowerCase()) {
                case "true": case "t": { return true; }
                default: { return !isNaN(Number(argStr)) && Number(argStr) > 0; }
            }
        } else {
            return defaultValue;
        }
    }
}

// 顯示階段
enum PresentStep {
    NONE            = 0,
    LOADING         = 1,
    DID_PRESENT     = 2,
}

class NativeButton {
    private static ConvertToSizeInCssPixels(value: number): number;
    private static ConvertToSizeInCssPixels(value: Vec2): Vec2;
    private static ConvertToSizeInCssPixels(value: Vec3): Vec3;
    private static ConvertToSizeInCssPixels(value: number | Vec2 | Vec3): number | Vec2 | Vec3 {
        const dpr = JSB ? window.devicePixelRatio : Math.min(window.devicePixelRatio ?? 1, 2);
        if (typeof value === "number") {
            return value / dpr;
        } else if (value instanceof Vec3) {
            return value.divide3f(dpr, dpr, dpr);
        } else if (value instanceof Vec2) {
            return value.divide2f(dpr, dpr);
        }
        return value;
    }

    private m_uiButton:CommonButton;
    private m_nativeView:any;
    private m_webButton:HTMLButtonElement;
    private m_isVisible:boolean;

    public get Visible():boolean { return this.m_isVisible; }

    constructor(uiButton:CommonButton, nativeView:any) {
        this.m_uiButton = uiButton;
        this.m_nativeView = nativeView;
        this.m_isVisible = true;
    }

    public SetVisible(visible:boolean) {
        if (this.m_isVisible != visible) {
            this.m_isVisible = visible;
            if (JSB) {
                this.m_nativeView?.setCloseButtonVisible(visible);
            } else if (this.m_webButton) {
                this.m_webButton.hidden = !visible;
            }
        }
    }

    public SetupButton(onClicked:()=>void, needMargin:Vec2=v2(0,0)) {
        const spriteFrame = this.m_uiButton.getComponent(Sprite).spriteFrame as any;
        const texture:Texture2D = spriteFrame._original ? spriteFrame._original._texture : spriteFrame._texture;
        const textureRootUrl:string = texture.image.nativeUrl != "" ? texture.image.nativeUrl : texture.image.url;
        const texutreUrl:string = !JSB || sys.os != sys.OS.IOS ? textureRootUrl : native.fileUtils.fullPathForFilename(textureRootUrl);
        const transform:UITransform = this.m_uiButton.getComponent(UITransform);

        if (!JSB) {
            const margin:Vec2 = NativeButton.ConvertToSizeInCssPixels(needMargin);
            const worldPos:Vec3 = NativeButton.ConvertToSizeInCssPixels(this.m_uiButton.node.worldPosition);
            const container:HTMLElement = document.getElementById("webview-wrapper");
            const button:HTMLButtonElement = document.createElement("button");
            const image:HTMLImageElement = document.createElement("img");
            const anchorX:number = this.m_uiButton.node.getComponent(UITransform).anchorX;
            const anchorY:number = this.m_uiButton.node.getComponent(UITransform).anchorY;
            const width:number = NativeButton.ConvertToSizeInCssPixels(transform.width * this.m_uiButton.node.scale.x);
            const height:number = NativeButton.ConvertToSizeInCssPixels(transform.height * this.m_uiButton.node.scale.y);
            const top:number = NativeButton.ConvertToSizeInCssPixels(view.getDesignResolutionSize().height) - worldPos.y + margin.y - height * (1.0-anchorY);
            const left:number = worldPos.x - margin.x - width * anchorX;
            image.src = texutreUrl;
            image.setAttribute("style", `position: absolute; width: ${width}px; height: ${height}px; top: 50%; left: 50%; transform: translate(-50%, -50%);`);
            button.id = "iframeButton";
            button.setAttribute("style", `position: absolute; width: ${width}px; height: ${height}px; border: none; background: none; outline: none; top: ${top}px; left: ${left}px;`);
            button.setAttribute("onmousedown", "this.firstElementChild.style.filter='brightness(0.7)';");
            button.setAttribute("onmouseup", "this.firstElementChild.style.filter='brightness(1)';");
            button.setAttribute("onmouseleave", "this.firstElementChild.style.filter='brightness(1)';");
            button.onclick = ()=>onClicked?.();
            button.appendChild(image);
            this.m_webButton = button;
            container.appendChild(button);
        } else if (this.m_nativeView) {
            const margin:Vec2 = needMargin;
            const worldMat:Mat4 = new Mat4();
            const topLeft:Vec3 = new Vec3();
            const bottomRight:Vec3 = new Vec3();
            const node:Node = this.m_uiButton.node;
            const transform:UITransform = node.getComponent(UITransform);
            const ap:Vec2 = transform.anchorPoint;
            const width:number = transform.contentSize.width;
            const height:number = transform.contentSize.height;
            const camera = director.root.cameraList.find(camera=>!!(camera.visibility&node.layer));

            node.getWorldMatrix(worldMat);
            Vec3.set(topLeft, -ap.x * width - margin.x, (1.0 - ap.y) * height - margin.y, 0);
            Vec3.set(bottomRight, (1.0 - ap.x) * width - margin.x, -ap.y * height - margin.y, 0);
            Vec3.transformMat4(topLeft, topLeft, worldMat);
            Vec3.transformMat4(bottomRight, bottomRight, worldMat);
            camera.update();
            camera.worldToScreen(topLeft, topLeft);
            camera.worldToScreen(bottomRight, bottomRight);

            const buttonWidth:number = bottomRight.x - topLeft.x;
            const buttonHeight:number = topLeft.y - bottomRight.y;
            const origin:Vec2 = NativeButton.ConvertToSizeInCssPixels(new Vec2(topLeft.x, game.canvas.height - topLeft.y));
            const size:Vec2 = NativeButton.ConvertToSizeInCssPixels(new Vec2(buttonWidth, buttonHeight));
            this.m_nativeView.setCloseButton(texutreUrl, origin.x, origin.y, size.x, size.y, ()=>onClicked?.());
        }
    }

    public Destroy() {
        if (this.m_webButton) {
            this.m_webButton.remove();
        }
        this.m_webButton = null;
    }
}

@ccclass('Webview')
export class Webview extends ViewBase implements WebviewProtocol.WebviewControl {
    // private m_transitionObserver:TransitionViewObserver;
    private m_transitionLockShow:boolean;

    private m_originalBgSize:Size;
    private m_originalWebViewSize:Size;

    private m_launchArgs:any[];
    private m_childView:WebviewChildView;
    private m_originalPos:Vec3;
    private m_presentStep:number;
    private m_didMaximize:boolean;
    private m_closeButton:NativeButton;
    private m_didSetup:boolean;
    private m_didSetUrl:boolean;

    private get m_jsbWebview(): any {
        return JSB ? (this.m_webView as any)._impl.webview : null;
    }

    @property({
        type: Node,
        displayName: "Background"
    })
    private m_bgNode: Node = null;

    @property({
        type: WebView,
        displayName: "WebView"
    })
    private m_webView: WebView = null;

    @property({
        type: CommonButton,
        displayName: "Close Button"
    })
    private m_uiCloseButton: CommonButton = null;

    @property({
        type: EditBox,
        displayName: "Search Bar"
    })
    private m_searchBar: EditBox = null;

    /**
     * 關閉顯示
     */
    public Dismiss(): void {
        super.Dismiss?.();
        if (isValid(this.m_childView, true)) {
            this.m_childView.OnWebviewDissmiss();
        }
    }

    public EvaluateJS(str: string): void {
        if (isValid(this.m_webView, true)) {
            this.m_webView.evaluateJS( str );
        }
    }

    /**
     * 介面是否強制改使用與 launchInLandscape 相反的方向開啟
     * @param launchInLandscape 是否橫向開啟
     * @param webviewType 開啟的網頁類型
     */
    protected NeedRotateOrientation(launchInLandscape:boolean, webviewType:WebviewType): boolean {
        return webviewType.IsForceLandscape && !launchInLandscape;
    }

    /**
     * 額外面板開啟的參數
     */
    protected LaunchOption() {
        const webviewType:WebviewType = arguments[0];
        const url:string = arguments[1];
        const transparent:boolean = !!arguments[2];
        this.m_launchArgs = [webviewType, url, transparent];
    }

    protected onLoad(){
        if (!DEBUG) {
            this.m_searchBar.node.destroy();
            this.m_searchBar = null;
        }

        super.onLoad?.();

        if (JSB && sys.os == sys.OS.ANDROID) {
            // [Android 網址特殊處理]
            /**
             * 以下摘錄 Android SDK 中對於 public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) 的部分註解內容：
             * """
             * This callback is not called for all page navigations. In particular, this is not called for navigations 
             * which the app initiated with loadUrl(): this callback would not serve a purpose in this case, 
             * because the app already knows about the navigation. This callback lets the app know about 
             * navigations initiated by the web page (such as navigations initiated by JavaScript code), by the 
             * user (such as when the user taps on a link), or by an HTTP redirect (ex. if loadUrl("foo. com") 
             * redirects to "bar. com" because of HTTP 301).
             * """
             * 註解中提及若是初始化執行 loadUrl 並不會觸發 shouldOverrideUrlLoading，必須要是轉址或是使用者手動點擊連結等才會進行觸發。
             * 在此利用 loadHTMLString 的方式在載入空頁面後立即跳轉到指定的網址來達到間接觸發 shouldOverrideUrlLoading 的效果。
             */
            Object.defineProperty(this.m_webView, 'url', {
                set: function(url) {
                    this._url = url;
                    this._impl?.webview?.loadHTMLString(`<html><body><script>setTimeout(()=>{window.location.href="${url}"}, 0.1);</script></body></html>`);
                }
            });
        }

        this.m_transitionLockShow = false;
        // this.m_transitionObserver = {
        //     OnTransitionViewShowBegan: this.OnTransitionViewShowBegan.bind(this),
        //     OnTransitionViewHideEnded: this.OnTransitionViewHideEnded.bind(this),
        // }
        // TransitionView.Instance?.AddObserver(this.m_transitionObserver);

        this.m_didSetUrl = false;
        this.m_didSetup = false;
        this.m_originalBgSize = this.m_bgNode.getComponent(UITransform).contentSize;
        this.m_originalWebViewSize = this.m_webView.getComponent(UITransform).contentSize;
        this.m_uiCloseButton.node.active = false;
        this.m_closeButton = new NativeButton(this.m_uiCloseButton, this.m_jsbWebview);
        this.m_presentStep = PresentStep.NONE;
        this.m_originalPos = this.node.getPosition();
        this.node.setPosition(
            new Vec3(
                view.getDesignResolutionSize().width * 10, 
                this.m_originalPos.y,
                this.m_originalPos.z));
        
        this.LaunchInit.apply(this, this.m_launchArgs);
    }

    protected onEnable(): void {
        super.onEnable?.();
        this.m_uiCloseButton.On(TouchableEvent.Clicked, this.OnCloseButtonClicked, this);
    }

    protected onDisable(): void {
        super.onDisable?.();
        this.m_uiCloseButton.Off(TouchableEvent.Clicked, this.OnCloseButtonClicked, this);
    }

    protected onDestroy() {
        super.onDestroy?.();
        this.m_closeButton.Destroy();
        // TransitionView.Instance?.RemoveObserver(this.m_transitionObserver);
    }

    protected update(dt:number) {
        if (!this.DidPresent && this.m_childView && typeof this.m_childView.Url == "string") {
            if (!this.m_jsbWebview) {
                // [不支援功能的 app 或網頁] => 直接拉回原位
                this.node.setPosition(this.m_originalPos);
            } else {
                // [支援功能的新版 app] => 等待頁面載入完成把 webview 拉回原位
                this.m_jsbWebview.setScalesPageToFit(true);
                this.m_jsbWebview.setOnShouldStartLoading((webview:WebView, url:string)=>this.ShouldStartLoading(webview, url));
                this.m_jsbWebview.setOnDidFinishLoading((webview:WebView, url:string)=>url!=EMPTY_URL&&this.DidFinishLoading(webview, url));
            }

            this.m_searchBar && (this.m_searchBar.string = this.m_childView.Url);
            
            if (!this.DidRotateOrientation) {
                // [沒有強制變更初始方向]
                this.m_didSetUrl = true;
                this.m_webView.url = this.m_childView.Url;
                this.SetupView();
                this.Present();
            } else if (JSB) {
                // [裝置上，且有強制變更初始方向]
                const doSetup = ()=>{
                    this.scheduleOnce(()=>{
                        this.m_didSetUrl = true;
                        this.m_webView.url = this.m_childView.Url;
                        this.SetupView();
                        this.scheduleOnce(()=>{
                            this.ShutdownCamera();
                        }, sys.os == sys.OS.ANDROID ? 5.0 : 0.0); // 攝影機立即關閉在 Android 上可能會導致 webview 定位失敗，在此等待 5 秒鐘的時間
                    }, sys.os == sys.OS.ANDROID || Device.Current.IsiOSAppOnMac ? 1.0 : 0.0); // 在旋轉完後 Android 需要給 Activity 一點點的 Config 時間，若轉向完直接操作 webview 會導致開啟失敗。在此等待 1 秒鐘的時間
                };

                if (Device.Current.IsiOSAppOnMac) {
                    doSetup();
                } else {
                    screen.once( 'orientation-change', ()=>doSetup());
                }

                this.Present();
            } else {
                // [瀏覽器上]
                this.m_didSetUrl = true;
                this.m_webView.url = this.m_childView.Url;
                this.Present();
            }

            if (!JSB && this.m_childView.NeedNewTabOnBrowser()) {
                // [瀏覽器上]
                this.m_webView.node.active = false;
                window.open(this.m_childView.Url, "_blank");
            }
        }
    }

    /**
     * 是否使用動畫的方式最小化
     */
    protected ShouldAnimMinimize(): boolean {
        return false;
    }

    /**
     * 將成為畫面主要的顯示面板
     */
    protected OnViewSelfWillBecomeActive() {
        super.OnViewSelfWillBecomeActive?.();
        this.ActiveWebview(true);
    }

    /**
     * 介面成為前景顯示
     */
    protected OnViewSelfDidBecomeActive() {
        super.OnViewSelfDidBecomeActive?.();
        if (!JSB && this.DidRotateOrientation) {
            // [網頁上，且有強制變更初始方向]
            this.SetupView();
        }
        if (!JSB || this.m_presentStep == PresentStep.DID_PRESENT) {
            // [網頁上直接關閉攝影機] 或 [裝置上確認非第一次開啟則關閉攝影機]
            this.ShutdownCamera();
        }
    }

    /**
     * 將從主要的顯示面板退出
     */
    protected OnViewSelfWillBecomeInActive() {
        super.OnViewSelfWillBecomeInActive?.();
        this.unscheduleAllCallbacks();
        director.root.windows[0].cameras.forEach(camera=>camera.enabled=true);
        this.ActiveWebview(false);
    }

    /**
     * 將從場景上移除
     */
    protected OnViewSelfWillDismiss() {
        super.OnViewSelfWillDismiss?.();
        this.m_childView && this.m_childView.OnViewSelfWillDismiss();
    }

    /**
     * 介面準備逾時
     * 備註：
     * 1. 在準備完成時應該執行 Present 方法表示一切就緒
     * 2. 可以回傳一個錯誤代碼供視窗顯示
     */
    protected OnViewSelfPrepareTimeout?(): number|void {
        return this.m_childView?.OnViewSelfPrepareTimeout();
    }

    /**
     * 接收到巡覽返回通知，如 Android 的返回按鈕按下事件
     */
    protected OnNavigateBack(): boolean {
        if (this.m_closeButton.Visible) {
            return true;
        }
        this.EvaluateJS(`typeof webCommandExecute == "function" && webCommandExecute("close")`)
        return false;
    }

    /**
     * 啟動初始化
     * @param webViewType 開啟的網頁類型
     * @param url 要開啟的網址
     * @param transparent 是否透明背景
     */
    private LaunchInit(webViewType:WebviewType, url:string, transparent:boolean) {
        switch(webViewType.ID) {
            case WebviewType.DEPOSIT_3RD_PARTY.ID: {
                // [第三方購買]
                // this.m_childView = this.addComponent(Deposit3rdPartyWebview);
                break;
            }
            default: {
                // [其餘類型]
                this.m_childView = this.addComponent(WebviewGeneralView);
                break;
            }
        }

        this.m_childView.LaunchOption.apply(this.m_childView, arguments);
        this.m_childView.Dismiss = ()=>this.Dismiss();
        this.m_childView.ReloadUrl = (url:string)=>{
            isValid(this,true)&&isValid(this.m_webView,true)&&(this.m_webView.url=url);
            this.m_searchBar && (this.m_searchBar.string = url);
        }
        this.m_childView.OnWebviewLaunch(this);
    }

    /**
     * 按下關閉按鈕
     */
    private OnCloseButtonClicked() {
        this.Dismiss();
    }

    /**
     * 控制 webview 開關顯示
     * @param active 開/關控制
     */
    private ActiveWebview(active:boolean) {
        if (!active) {
            this.m_webView.node.active = false;
        } else if (JSB || !this.m_childView.NeedNewTabOnBrowser()) {
            // [裝置上或瀏覽器上沒有開新分頁] => 如果 TransitionView 正在顯示則強制關閉 Webview
            this.m_webView.node.active = this.m_transitionLockShow == false;
        }
    } 

    /**
     * 是否前往指定的網址
     * @param webview 發生事件的 webview
     * @param url 要前往的網址
     * 備註：這只有裝置上才會觸發
     */
    private ShouldStartLoading(webview:WebView, url:string): boolean {
        if (!this.ActionOperation(url)) {
            // [取消前往指定的網址]
            return false;
        }

        if (this.m_presentStep == PresentStep.NONE) {
            // [第一次打開 webview]
            this.m_presentStep = PresentStep.LOADING;

            // 打開 Loading 顯示 
            // Loading.Instance.Show(0);
        }

        return isValid(this.m_childView, true) ? this.m_childView.ShouldStartLoading(url) : true;
    }

    /**
     * 頁面載入完成通知
     * @param webview 發生事件的 webview
     * @param url 頁面載入完成的網址
     * 備註：這只有裝置上才會觸發
     */
    private DidFinishLoading(webview:WebView, url:string) {
        this.m_searchBar && (this.m_searchBar.string = url);

        if (this.m_presentStep == PresentStep.LOADING) {
            // [第一次打開 webview]

            this.m_presentStep = PresentStep.DID_PRESENT;

            // 關閉 Loading 顯示
            // Loading.Instance.Hide();

            // webview 拉回原位
            this.node.setPosition(this.m_originalPos);

            // 關閉攝影機
            this.ShutdownCamera();
        }

        if (isValid(this.m_childView, true)) {
            this.m_childView.DidFinishLoading(url);
        }
    }

    /**
     * 執行平台動作
     * @param url 動作參數
     * @returns 是否前往指定的網址
     */
    private ActionOperation(url:string): boolean {
        if (OPERATION_URL_HEAD.test(url) == false) return true;

        let operationUrl = url.replace(OPERATION_URL_HEAD, '');
        let operationArgs = operationUrl.split('/') || [];
        let operationType = (operationArgs[0] || '').toLowerCase();

        switch (operationType) {
            // 網頁呼叫關閉畫面
            case OperationType.CLOSE: {
                this.Dismiss();
                break;
            }

            // 開啟 UI 介面
            case OperationType.OPEN_UI:
            case OperationType.PUSH_UI: {
                let method = operationType == OperationType.PUSH_UI ? ViewManager.Push : ViewManager.Open;
                let argStr = operationArgs[1] || '';
                let uiName = argStr.replace(/\?[\w\.&=]+$/, '');

                let viewEvent :IViewEvent;
                let uiArgs  :any[] = [];
                switch (uiName.toLowerCase()) {
                    // 其他介面
                    default: {
                        viewEvent = ViewDefine[uiName];
                        break;
                    }
                }

                viewEvent && method.call(ViewManager.Instance, ...uiArgs);
                break;
            }
            case OperationType.SHOW_NATIVE_CLOSE_BTN: {
                this.m_closeButton.SetVisible(true);
                break;
            }
            case OperationType.HIDE_NATIVE_CLOSE_BTN: {
                this.m_closeButton.SetVisible(false);
                break;
            }

            // 未知動作
            default: {
                warn("Webview.ActionOperation : Unknown Operation");
                break;
            }
        }

        return false;
    }

    /**
     * 設定顯示範圍
     */
    private SetupView() {
        if (this.m_didSetup) return;

        this.m_didSetup = true;
        if (!this.m_childView.NeedMaximize) {
            this.m_uiCloseButton.node.active = true;
            this.m_jsbWebview?.setBackgroundTransparent?.(this.m_childView.IsTransparent());
            this.m_bgNode.getComponent(Sprite).enabled = !this.m_childView.IsTransparent();
            if (!this.LaunchInLandscape) {
                this.m_bgNode.getComponent(UITransform)
                    .setContentSize(this.m_originalBgSize.height, this.m_originalBgSize.width);
                this.m_webView.getComponent(UITransform)
                    .setContentSize(this.m_originalWebViewSize.height, this.m_originalWebViewSize.width);
                this.m_uiCloseButton.node.setPosition(PORTRAINT_CLOSE_BUTTON_POS);
            }
        } else if (!this.m_didMaximize) {
            this.m_didMaximize = true;
            director.once(Director.EVENT_AFTER_UPDATE, ()=>{
                const resolution:Size = view.getDesignResolutionSize();
                const widget:Widget = this.m_webView.getComponent(Widget);
                widget && (widget.enabled = false);

                this.m_webView.node.getComponent(UITransform).setContentSize(resolution.width, resolution.height);
                this.m_jsbWebview?.setBounces(false);
                this.m_bgNode.getComponent(Sprite).enabled = false;
                director.once(Director.EVENT_AFTER_UPDATE, ()=>{
                    this.m_closeButton.SetupButton(()=>this.OnCloseButtonClicked(), this.m_childView.MaximizeCloseButtonMarginRightAndTop())
                });
            });
        }
    }

    /**
     * 網址輸入欄觸發搜尋處理
     * @param editbox 觸發事件的 EditBox
     */
    private OnSearchBarDoSearch(editbox:EditBox) {
        if (REG_URL_SCHEME.test(editbox.string)) {
            this.m_webView.url = editbox.string;
        } else {
            director.once(Director.EVENT_AFTER_DRAW, ()=>{
                editbox.string = this.m_webView.url;
            });
        }
    }

    /**
     * 關閉攝影機
     */
    private ShutdownCamera() {
        this.m_childView.NeedMaximize && this.m_didSetUrl && director.once(Director.EVENT_AFTER_DRAW, ()=>director.root.windows[0].cameras.forEach(camera=>camera.enabled=false));
    }

    /** 
     * 過場畫面顯示淡入開始 
     */
    private OnTransitionViewShowBegan(): void {
        this.m_transitionLockShow = true;
        this.ActiveWebview(false);
    }

    /** 
     * 過場畫面隱藏淡出結束 
     */
    private OnTransitionViewHideEnded(): void {
        this.m_transitionLockShow = false;
        this.ActiveWebview(true);
    }
}

