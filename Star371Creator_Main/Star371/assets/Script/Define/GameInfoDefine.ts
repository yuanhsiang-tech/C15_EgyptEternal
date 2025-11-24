import { DEBUG } from "cc/env";
import { IStageInfo, StageInfo } from "./StageInfoDefine";
import { IConfigTest } from "./ConfigTestDefine";

export interface IGameInfo extends IStageInfo {
    /**
     * 設定為直版
     */
    Portrait():IGameInfo;

    /**
     * 指定場景名稱
     * @param sceneName 場景名稱
     * 備註：一般情形下不需要特別指定
     */
    Scene(sceneName:string):IGameInfo;

    /**
     * 指定需要相依的 Bundle
     * @param dependencies 相依的 Bundle 名稱列表
     */
    Depend(...dependencies:string[]): IGameInfo;

    /**
     * 指定特定的連線測試位址
    * @param url 連線位址, 不用帶協定, 例如 wss://192.168.44.211:8507 填 192.168.44.211:8507 即可。
    * @param fullCustomPath 是否完全掌控自定義的網址設定(預設為 false，當設定為 true 時會關閉框架自動帶入參數至網址中)
    */
    TestByUrl(url: string, fullCustomPath: boolean): IGameInfo;

    /**
     * 開發期間測試直接進入遊戲
     * @param themeId 廳館 ID
     * 備註：未指定 themeId 時預設會進入 {GameId}0001 的廳館(如：編號 2108 的遊戲預設進入 21080001 的廳館)
     */
    TestEntry(themeId?:number): IGameInfo;
}

export class GameInfo extends StageInfo implements IGameInfo, IConfigTest {
    /**
     * 建立新的 Info 物件
     * @param id 識別 ID
     * @param name Bundle 名稱，也相當於 scene 名稱
     * 備註：遊戲主要場景名稱與 Bundle 名稱必須一致，否則會載入場景失敗
     */
    public static override New(id:number, name:string): IGameInfo { return new GameInfo(id, name); }

    private m_testUrl: string;
    private m_testFullCustomPath: boolean;
    private m_testThemeId: number;
    protected m_dependencies:string[];

    /**
     * 所有需要載入的 Bundle 名稱列表
     */
    public get Bundles():string[] { return this.m_dependencies ? [this.Name, ...this.m_dependencies] : [this.Name]; }

    /**
     * 是否完全掌控自定義的網址設定
     */
    public get TestFullCustomPath(): boolean { return !!this.m_testFullCustomPath; }

    /**
     * 測試用網址
     */
    public get TestUrl(): string { return this.m_testUrl; }

    public get TestThemeId(): number { return this.m_testThemeId; }

    /**
     * 設定為直版
     */
    public Portrait(): GameInfo { super.Portrait(); return this; }

    /**
     * 指定場景名稱
     * @param sceneName 場景名稱
     * 備註：一般情形下不需要特別指定
     */
    public Scene(sceneName:string): GameInfo { super.Scene(sceneName); return this; }

    /**
     * 指定需要相依的 Bundle
     * @param dependencies 相依的 Bundle 名稱列表
     */
    public Depend(...dependencies:string[]): GameInfo {
        this.m_dependencies = dependencies;
        return this;
    }

    /**
     * 指定特定的連線測試位址
    * @param url 連線位址, 不用帶協定, 例如 wss://192.168.44.211:8507 填 192.168.44.211:8507 即可。
    * @param fullCustomPath 是否完全掌控自定義的網址設定(預設為 false，當設定為 true 時會關閉框架自動帶入參數至網址中)
    */
    public TestByUrl(url: string, fullCustomPath: boolean = false): GameInfo {
        if (DEBUG) {
            url = typeof url == "string" ? url.trim() : "";
            this.m_testUrl = url;
            this.m_testFullCustomPath = !!this.m_testUrl && !!fullCustomPath;
        }
        return this;
    }

    /**
     * 開發期間測試直接進入遊戲
     * @param themeId 廳館 ID
     */
    public TestEntry(themeId?:number): IGameInfo {
        if (DEBUG) {
            this.m_testThemeId = themeId || parseInt(`${this.Id}0001`);
        }
        return this;
    }
}