export interface IConfigTest {
    /**
     * 是否完全掌控自定義的網址設定
     */
    readonly TestFullCustomPath: boolean;

    /**
     * 測試用網址
     */
    readonly TestUrl: string;

    /**
     * 指定特定的連線測試位址
    * @param url 連線位址, 不用帶協定, 例如 wss://192.168.44.211:8507 填 192.168.44.211:8507 即可。
    * @param fullCustomPath 是否完全掌控自定義的網址設定(預設為 false，當設定為 true 時會關閉框架自動帶入參數至網址中)
    */
    TestByUrl(url: string, fullCustomPath: boolean): IConfigTest;
}