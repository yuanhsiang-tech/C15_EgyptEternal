import { director, Director, Game, game, sys } from 'cc';
import { Method } from '../Method/Method';
import { DeepLink, DeepLinkUrl } from './DeepLink';
import { JSB } from 'cc/env';

export abstract class App {
    private m_didFinishLaunching: boolean;

    protected constructor() {
        this.m_didFinishLaunching = false;
        game.on(Game.EVENT_PAUSE, this.OnEnterBackground, this);
        game.on(Game.EVENT_RESUME, this.OnEnterForeground, this);
        director.on(Director.EVENT_BEFORE_UPDATE, this.OnUpdate, this);
    }

    /**
     * 開啟指定的 URL 位址
     * @param url 要開啟的 URL 位址
     */
    public OpenUrl(url: string): boolean {
        return sys.openURL(url);
    }

    /**
     * App 啟動完成
     */
    protected DidFinishLaunching(): void {
        (DeepLink as any).Init({ContinueWithDeepLink: this.ContinueWithDeepLink.bind(this)});
        JSB && jsb?.["Device"]?.setKeepScreenOn?.(true);
    }

    /**
     * 當 App 進入背景
     */
    protected OnEnterBackground(): void {
    }

    /**
     * 當 App 進入前景
     */
    protected OnEnterForeground(): void {
    }

    /**
     * 當按下 Android 返回鍵
     */
    protected OnNavigateBack(): void {
    }

    /**
     * 每幀更新通知
     */
    protected OnUpdate(): void {
    }

    /**
     * 收到 DeepLink 通知
     * @param url 深度連結網址
     */
    protected ContinueWithDeepLink(url: DeepLinkUrl): void {
    }

    /**
     * 通知 C++ 端 TS 準備完成
     * 注意：這是有用的 function，為了對外隱藏所以改成 private
     */
    private CreatorFinishLaunching(): void {
        if (!this.m_didFinishLaunching) {
            this.m_didFinishLaunching = true;
            this.DidFinishLaunching();
            Method.App.CreatorFinishLaunching();
        }
    }
}