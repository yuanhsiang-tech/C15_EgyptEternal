import { _decorator, easing, Tween, tween, UIOpacity, Vec3, math, Node } from 'cc';
import { ViewBaseMixIn } from '../ViewBaseMixIn';
const { ccclass, property } = _decorator;

/**
 * 是否啟用關閉介面時的最小化動畫表演
 * 備註：介面關閉的最小化動畫會受三個參數影響：
 *      (1) 全域旗標 MINIMIZE_ANIMATION_ENABLE
 *      (2) 繼承 ViewBase 的實體對象透過 ShouldAnimMinimize 方法回傳
 *      (3) 實作 OnViewDismissing 的實體對象回傳縮小位置
 *      當 (1)(2) 為 true 且 (3) 有座標值時才會有動畫表演
 */
const MINIMIZE_ANIMATION_ENABLE:boolean     = true;

// 介面最大所需準備時間(單位：毫秒)
const MAXIMUM_VIEW_PREPARE_TIME:number      = 5000;

// 是否啟用最小化時的旋轉動畫
const MINIMIZE_ROTATE_ENABLED:boolean       = true;
// 最小化動畫時間(單位：秒)
const MINIMIZE_SHRINK_DURATION:number       = 0.5;
// 最小化目標比例
const MINIMIZE_SHRINK_SCALE:Vec3            = new Vec3(0.2, 0.2, 0.2);
// 最小化目標透明度
const MINIMIZE_SHRINK_OPACITY:number        = 160;
// 最小化過渡時間(單位：秒)
const MINIMIZE_TRANSITION_DURATION:number   = 0.01;
// 最小化移動時間(單位：秒)
const MINIMIZE_MOVE_DURATION:number         = 0.18;
// 最小化移動的額外延遲時間(單位：秒)
const MINIMIZE_MOVE_DELAY_DURATION:number   = MINIMIZE_MOVE_DURATION + (MINIMIZE_ROTATE_ENABLED ? 0.2 : 0);
// 最小化移動目標比例
const MINIMIZE_MOVE_SCALE:Vec3              = new Vec3(0.1, 0.1, 0.1);

enum PresentState {
    NONE                = 0x00,
    PRESENT             = 0x01,
    DISMISS             = 0x02,
    MINIMIZING          = 0x04,
    MINIMIZE            = 0x08,
    WANT_RESIGN_FULL    = 0x10,
    DID_RESIGN_FULL     = 0x20,
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
//  請勿任意刪改此處的 private 或 protected 方法，在 ViewLayer.ts 中有與此對應的方法名稱操作，任意改動可能產生錯誤  //
/////////////////////////////////////////////////////////////////////////////////////////////////////////

// ＊這裡預設指定的 ViewEventNotifier 不直接 import ViewType.ts 中的 interface ViewEventNotifier 而是改用 global 的版本，以此避免外部誤用
@ccclass('ViewBase')
export class ViewBase<INotifier extends ViewEventNotifier = ViewEventNotifier> extends ViewBaseMixIn {
    public static get ANIMATED_MINIMIZE():boolean { return MINIMIZE_ANIMATION_ENABLE; }

    private m_launchInLandscape:boolean = true;
    private m_presentState:PresentState = PresentState.NONE;
    private m_notifier?:Partial<INotifier>;
    private m_didRotateOrientation:boolean = false;
    private m_minimizeWorldCenter:Vec3;
    private m_viewAnchor:Node;

    /**
     * 目標最小化位置的世界中心座標
     */
    private get MinimizeWorldCenter():Vec3 { return this.m_minimizeWorldCenter; }

    /**
     * 是否使用動畫的方式最小化
     */
    private get AnimMinimize():boolean { return !!(this.m_presentState&PresentState.MINIMIZING); }

    /**
     * 是否為最小化狀態
     */
    private get DidMinimize(): boolean  { return !!(this.m_presentState&PresentState.MINIMIZE); }

    /**
     * 是否開啟完成
     */
    protected get DidPresent():  boolean { return !!(this.m_presentState&PresentState.PRESENT); }

    /**
     * 是否關閉完成
     */
    protected get DidDismiss():  boolean { return !!(this.m_presentState&PresentState.DISMISS); }

    /**
     * 是否為橫向啟動
     */
    protected get LaunchInLandscape(): boolean { return this.m_launchInLandscape; }

    /**
     * 介面事件通知對象
     */
    protected get Notifier(): Partial<INotifier>|undefined { return this.m_notifier; }

    /**
     * 是否強制旋轉過方向
     */
    protected get DidRotateOrientation(): boolean { return this.m_didRotateOrientation; }

    /**
     * 目前所在的圖層名稱
     */
    protected get Layer(): string { return this.m_viewAnchor?.parent.name; }

    /**
     * 目前所在的錨點節點
     */
    protected get ViewAnchor(): Node { return this.m_viewAnchor; }

    /**
     * 是否提前退出全畫面顯示
     */
    private get WantResignFullPresent(): boolean { return !!(this.m_presentState&PresentState.WANT_RESIGN_FULL); }

    /**
     * 是否已完成退出全畫面顯示
     */
    private get DidResignFullPresent(): boolean { return !!(this.m_presentState&PresentState.DID_RESIGN_FULL); }

    // *暫無使用，但為了避免子介面未檢查直接使用而造成錯誤，在此繼續保留空方法
    protected onLoad() { super.onLoad?.(); }

    /**
     * 關閉介面
     */
    public Dismiss() {
        this.m_presentState |= PresentState.DISMISS;
    }

    /**
     * 介面是否強制改使用與 launchInLandscape 相反的方向開啟
     * @param launchInLandscape 是否橫向開啟
     * @param options 外部帶入參數(與 LaunchOption 一致)
     * @returns 是否旋轉顯示
     * 說明：當介面於特定情況下需強制改變開啟方向時可在此回傳 true，則原本橫向會改為直向，直向則改為橫向
     * 案例：Webview 本身同時支援橫向與直向的顯示，而當在直板遊戲主場中使用 Webview 時理當以直向開啟，但因為網頁內容只有橫向版本，因此需強制轉為橫向開啟，
     *      此時便可於此處回傳 true 來強制改變開啟方向
     * 注意：只有當橫向與直向的顯示資源為相同時才會觸發此詢問
     */
    protected NeedRotateOrientation(launchInLandscape:boolean, ...options:any): boolean {
        return false;
    }

    /**
     * 啟動介面通知
     * @param options 外部帶入參數
     * 備註：介面尚未加至場上，在 onLoad 前被呼叫
     */
    protected LaunchOption?(...options:any): boolean|void;

    /**
     * 介面(重新)進入場景
     * @param reused 是否為重複利用
     * 備註：介面已經加至場上，在 onEnable 後被呼叫，時機點相當於 start，但實際呼叫時機晚於 start。
     *      不同於 start 的是每次重新被加入場景時 OnAwake 會被重複呼叫，不像 start 只會被呼叫一次。
     * 順序：onLoad -> onEnable -> start -> OnAwake
     */
    protected OnAwake?(reused:boolean);

    /**
     * 介面離開場景並進入重複利用的回收處理階段
     * 備註：應該在此做變數變數清除處理
     */
    protected OnSleep?();

    /**
     * 介面準備完成，確認開始顯示
     */
    protected Present(): boolean {
        const canPresent:boolean = !this.DidDismiss;
        
        if (canPresent) {
            this.m_presentState |= PresentState.PRESENT;
        }

        return canPresent;
    }

    /**
     * 是否為全畫面顯示
     */
    protected IsFullPresent(): boolean {
        return false;
    }

    /**
     * 全畫面顯示時關閉背後其餘顯示的延遲時間(單位：秒)
     */
    protected DeferFullPresentAffect(): number {
        return 1.1;
    }

    /**
     * 手動退出全畫面顯示
     * 備註：原則上當介面關閉時會自動退出全畫面顯示，但如果介面自己有關閉動畫則需在動畫播放前手動呼叫退出全畫面的顯示，避免會有畫面全黑的情形
     */
    protected ResignFullPresent(): void {
        if (this.IsFullPresent()) {
            this.m_presentState |= PresentState.WANT_RESIGN_FULL;
        }
    }

    /**
     * 接收到巡覽返回通知，如 Android 的返回按鈕按下事件
     * 注意：(1) 回傳 true  表示介面可直接被關閉且離開；
     *      (2) 回傳 false 則表示介面不可關閉，但介面自身須處理此時的階段控制；如有子層的名片頁，當收到此通知時如果剛好子層面板有開啟則不可直接關閉主介面而是先關閉子層的顯示
     */
    protected OnNavigateBack(): boolean { 
        return true; 
    }

    /**
     * 是否使用不透明遮黑顯示
     * 說明：預設會為每個介面背後加上一層不透明或半透明的黑色點擊阻擋，如需使用完全透明的點擊阻擋方式則只需回傳 false 即可
     */
    protected OpaqueBlock(): boolean {
        return true;
    }

    /**
     * 是否使用深色的遮黑顯示
     */
    protected DarkenBlock(): boolean {
        return false;
    }

    /**
     * 回傳介面準備所需時間(單位：毫秒)
     * 備註：準備超時則會觸發 OnSelfPrepareTimeout
     */
    protected ViewSelfPrepareTime(): number {
        return MAXIMUM_VIEW_PREPARE_TIME;
    }

    /**
     * 介面準備逾時
     * 備註：
     * 1. 在準備完成時應該執行 Present 方法表示一切就緒
     * 2. 可以回傳一個錯誤代碼供視窗顯示
     */
    protected OnViewSelfPrepareTimeout?(): number|void;

    /**
     * 介面準備逾時時是否靜默處理，不彈跳視窗提示
     */
    protected ViewSelfSilentTimeout?(): boolean;

    /**
     * 介面即將成為前景顯示
     */
    protected OnViewSelfWillBecomeActive?();

    /**
     * 介面成為前景顯示
     */
    protected OnViewSelfDidBecomeActive?();

    /**
     * 介面即將進入背景顯示
     */
    protected OnViewSelfWillBecomeInActive?();

    /**
     * 介面進入背景顯示
     */
    protected OnViewSelfDidBecomeInActive?();

    /**
     * 介面即將離開場上顯示
     */
    protected OnViewSelfWillDismiss?();

    /**
     * 介面離開場上顯示
     */
    protected OnViewSelfDidDismiss?();

    /**
     * 是否使用動畫的方式最小化
     */
    protected ShouldAnimMinimize(): boolean {
        return MINIMIZE_ANIMATION_ENABLE;
    }

    /**
     * 指定最小化動畫的目標位置
     * 注意：回傳座標必須為世界座標
     */
    protected MinimizeWorldLocation(): Vec3|undefined {
        return null;
    }

    /**
     * 裝置介面方向改變
     * @param interfaceOrientation 介面方向
     * 參數 interfaceOrientation 數值說明：
     * 聽筒在上：1
     * 聽筒在下：1 << 7 | 1
     * 聽筒在左：2
     * 聽筒在右：1 << 7 | 2
     */
    protected OnInterfaceOrientationChanged(interfaceOrientation:number): void {
    }

    /**
     * 詢問介面是否需要強制改成與 launchInLandscape 相反的方向開啟
     * @param launchInLandscape 是否橫向開啟
     * @param options 外部帶入參數(與 LaunchOption 一致)
     */
    private RotateOrientation(launchInLandscape:boolean, ...options:any): boolean {
        return this.m_didRotateOrientation = this.NeedRotateOrientation.apply(this, arguments);
    }

    /**
     * 是否確認本次為橫向開啟
     * @param confirm 確認是否為橫向開啟
     */
    private ConfirmViewLaunchInLandscape(confirm:boolean) {
        this.m_launchInLandscape = confirm;
    }

    /**
     * 設定 View 事件通知對象
     * @param notifier 事件通知對象
     */
    private SetViewEventNotifier(notifier:Partial<INotifier>|undefined) {
        this.m_notifier = notifier;
    }

    /**
     * 重設變數
     */
    private Reset() {
        this.m_launchInLandscape = true;
        this.m_presentState = PresentState.NONE;
        this.m_notifier = null;
        this.m_didRotateOrientation = false;
        this.m_minimizeWorldCenter = null;

        const viewAnchor:Node = this.m_viewAnchor;
        if (viewAnchor) {
            Tween.stopAllByTarget(viewAnchor);
            viewAnchor.scale = Vec3.ONE;
            viewAnchor.position = Vec3.ZERO;
            viewAnchor.angle = 0;            
        }
        
        const compOpacity:UIOpacity = viewAnchor?.getComponent(UIOpacity);
        if (compOpacity) {
            Tween.stopAllByTarget(compOpacity);
            compOpacity.opacity = 255;
        }
    }

    /**
     * 視窗最小化
     * @param animated 是否動畫顯示
     * @param localCenter 最小化中心點(本地座標)
     * @param worldCenter 最小化中心點(世界座標)
     */
    private Minimize(animated:boolean, localCenter:Vec3, worldCenter:Vec3) {
        if (!this.ShouldAnimMinimize() || !animated || !localCenter) {
            this.m_presentState|=PresentState.MINIMIZE;
        } else {
            this.m_minimizeWorldCenter = worldCenter;
            this.m_presentState|=PresentState.MINIMIZING;

            const viewAnchor:Node = this.m_viewAnchor;
            const targetRadian:number = !MINIMIZE_ROTATE_ENABLED ? 0 : Math.atan2(localCenter.y-viewAnchor.position.y, localCenter.x-viewAnchor.position.x);
            const radian:number = targetRadian%Math.PI;
            const angle:number = math.toDegree(radian + (this.m_launchInLandscape ? 
                                    (radian > math.HALF_PI ? -Math.PI : radian < -math.HALF_PI ? Math.PI : 0) : 
                                    (radian > 0 ? -math.HALF_PI : math.HALF_PI)));

            tween(viewAnchor)
                .parallel(
                    tween().to(MINIMIZE_SHRINK_DURATION, {scale: MINIMIZE_SHRINK_SCALE}, {easing: easing.backInOut}),
                    tween().call(()=>{
                        tween(viewAnchor.getComponent(UIOpacity) || viewAnchor.addComponent(UIOpacity))
                            .to(MINIMIZE_SHRINK_DURATION, {opacity: MINIMIZE_SHRINK_OPACITY}, {easing: easing.backIn})
                            .start();
                    })
                )
                .delay(MINIMIZE_TRANSITION_DURATION)
                .parallel(
                    tween().to(MINIMIZE_MOVE_DURATION, {scale: MINIMIZE_MOVE_SCALE}),
                    tween().to(MINIMIZE_MOVE_DELAY_DURATION, {position: localCenter}, {easing: easing.backIn}),
                    tween().to(MINIMIZE_MOVE_DELAY_DURATION, {angle: angle})
                )
                .call(()=>this.m_presentState|=PresentState.MINIMIZE)
                .start();
        }
    }

    /**
     * 指定所在的錨點節點
     * @param viewAnchor 錨點節點
     */
    private SetViewAnchor(viewAnchor:Node) {
        this.m_viewAnchor = viewAnchor;
    }

    /**
     * 確認已處理手動退出全畫面顯示
     */
    private ConfirmResignFullPresent(): boolean {
        if (this.WantResignFullPresent) {
            this.m_presentState |= PresentState.DID_RESIGN_FULL;
            return true;
        }
        return false;
    }
}