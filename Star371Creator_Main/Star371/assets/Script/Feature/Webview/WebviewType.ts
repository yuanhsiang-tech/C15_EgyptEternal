export interface IWebviewType {
    /**
     * 識別名稱
     */
    readonly ID:string;

    /**
     * 最大化顯示
     */
    Maximize():IWebviewType;

    /**
     * 強制橫向顯示
     */
    Landscape():IWebviewType;
}

export class WebviewType implements IWebviewType {
    public static get CUSTOM():IWebviewType                 { return new WebviewType("CUSTOM"); }               // 任意網址
    public static get BUG_REPORT():IWebviewType             { return new WebviewType("BUG_REPORT"); }           // Bug 回報
    public static get BUG_LOGIN_REPORT():IWebviewType       { return new WebviewType("BUG_LOGIN_REPORT"); }     // Login Bug 回報
    public static get FIVE_STAR_RESEARCH():IWebviewType     { return new WebviewType("FIVE_STAR_RESEARCH"); }   // 五星評價問卷
    public static get MEMBERSHIP_UPGRADE():IWebviewType     { return new WebviewType("MEMBERSHIP_UPGRADE"); }   // 帳號聯名
    public static get REDIRECT_URL_WITH_LC():IWebviewType   { return new WebviewType("REDIRECT_URL_WITH_LC"); } // 帶 LC 並導向指定位址
    public static get DEPOSIT_3RD_PARTY():IWebviewType      { return new WebviewType("DEPOSIT_3RD_PARTY"); }    // 第三方購買
    public static get LIVE_OPS_WEB():IWebviewType           { return new WebviewType("LIVE_OPS_WEB"); }         // LiveOps Web

    /**
     * 最大化顯示
     */
    public Maximize(): IWebviewType { 
        this.m_maximize = true;
        return this;
    };

    /**
     * 強制橫向顯示
     */
    public Landscape(): IWebviewType {
        this.m_forceLandscape = true;
        return this;
    }

    /**
     * 識別名稱
     */
    public get ID(): string { return this.m_id; }
    /**
     * 是否為最大化顯示
     */
    public get IsMaximize(): boolean { return this.m_maximize; }
    /**
     * 是否為強制橫向顯示
     */
    public get IsForceLandscape(): boolean { return this.m_forceLandscape; }
    
    private m_id:string;
    private m_maximize:boolean;
    private m_forceLandscape:boolean;

    constructor(id:string) {
        this.m_id = id;
        this.m_maximize = false;
        this.m_forceLandscape = false;
    }
}