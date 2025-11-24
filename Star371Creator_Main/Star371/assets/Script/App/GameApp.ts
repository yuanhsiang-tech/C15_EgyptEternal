import { _decorator, log, ResolutionPolicy, size, Size, screen, view, game } from 'cc';
import { App } from './App';
import { DeepLinkUrl } from './DeepLink';
import { Device } from '../Device/Device';
import { Method } from '../Method/Method';
import { DEV, EDITOR, JSB, NATIVE } from 'cc/env';
import { Define } from '../Define/GeneralDefine';
import { ViewManager } from '../ViewManage/ViewManager';
import { Connection } from '../Service/Foundation/Connection';
import { IStageManager, StageManager } from '../Stage/StageManager';
import CurrencyFlow from '../CurrencyFlow/CurrencyFlow';

export class GameApp extends App {
    /**
     * 取得唯一的 App 實例
     */
    public static get Shared(): GameApp { return s_instance; }

    private m_stageManager:StageManager;
    private m_connection:Connection;
    private m_currencyFlow:CurrencyFlow;

    /**
     * 取得 App 版本
     */
    public get Version(): string {
        if (!JSB) {
            // [網頁版]
            return AppDefine.Version;
        }
        return Method.App.GetAppVersion();
    }

    /**
     * 取得 App Build 號
     */
    public get Build(): string {
        if (!JSB) {
            // [網頁版]
            return "1.0";
        }
        return Method.App.GetAppBuild();
    }

    /**
     * 取得 App Bundle ID
     */
    public get BundleId(): string {
        return Method.App.GetBundleId();
    }

    /**
     * 取得場景管理器
     */
    public get StageManager(): IStageManager {
        return this.m_stageManager;
    }

    /**
     * 取得網路連線物件
     */
    public get Connection(): Connection {
        return this.m_connection;
    }

    /**
     * 取得金流管理元件
     */
    public get CurrencyFlow(): CurrencyFlow {
        return this.m_currencyFlow;
    }

    protected constructor() {
        super();
        this.m_connection = new Connection();
        this.m_stageManager = new StageManager();
        this.m_currencyFlow = new CurrencyFlow();
        this.SetupDesignResolution();
    }

    /**
     * App 啟動完成
     */
    protected DidFinishLaunching(): void {
        super.DidFinishLaunching();
    }

    /**
     * 當 App 進入背景
     */
    protected OnEnterBackground(): void {
        super.OnEnterBackground();
        this.m_stageManager.OnEnterBackground();
    }

    /**
     * 當 App 進入前景
     */
    protected OnEnterForeground(): void {
        super.OnEnterForeground();
        this.m_stageManager.OnEnterForeground();
    }

    /**
     * 當按下 Android 返回鍵
     */
    protected OnNavigateBack(): void {
        super.OnNavigateBack();
        if (this.m_stageManager.OnNavigateBack()) {
            ViewManager.Alert('是否確認離開遊戲？')
                .ActionPositive(()=>game.end())
                .ActionNegative();
        }
    }

    /**
     * 每幀更新通知
     */
    protected OnUpdate(): void {
        super.OnUpdate();
        this.m_connection.MainProcess(game.deltaTime);
        this.m_stageManager.OnUpdate();
    }

    /**
     * 收到 DeepLink 通知
     * @param url 深度連結網址
     */
    protected ContinueWithDeepLink(url: DeepLinkUrl): void {
        super.ContinueWithDeepLink(url);
    }

    /**
     * 初始化設計分辨率
     */
    private SetupDesignResolution(): void {
        const designSize:Size = DEV && !NATIVE ? (()=>{
            return Define.DesignSize[localStorage.getItem("DesignSize")] ?? Define.DesignSize.REGULAR;
        })() : (()=>{
            return Device.Current.IsRegularScreen() ? Define.DesignSize.REGULAR : Define.DesignSize.COMPACT;
        })();
        view.setDesignResolutionSize(designSize.width, designSize.height, ResolutionPolicy.SHOW_ALL);
        !NATIVE && (screen.windowSize = size(designSize.width, designSize.height));
    }
}






























































let s_instance:GameApp;
!EDITOR && eval("window.App=s_instance=new GameApp();");
