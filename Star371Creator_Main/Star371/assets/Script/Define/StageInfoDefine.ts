export interface IStageInfo {
    /**
     * 設定為直版
     */
    Portrait():IStageInfo;

    /**
     * 指定場景名稱
     * @param sceneName 場景名稱
     * 備註：一般情形下不需要特別指定
     */
    Scene(sceneName:string):IStageInfo;
}

export class StageInfo implements IStageInfo {
    /**
     * 建立新的 Info 物件
     * @param id 識別 ID
     * @param name bundle 名稱，也相當於 scene 名稱
     */
    public static New(id:number, name:string): IStageInfo {  return new StageInfo(id, name); }

    protected m_id:number;
    protected m_bundle:string;
    protected m_isPortrait:boolean;
    protected m_scene:string;

    /**
     * 識別 ID
     */
    public get Id():number { return this.m_id; }

    /**
     * bundle 名稱，原則上也相當於 scene 名稱。若有指定 scene 名稱則以指定的 scene 名稱為主
     */
    public get Name():string { return this.m_bundle; }

    /**
     * scene 名稱
     */
    public get SceneName():string { return this.m_scene; }

    /**
     * 是否為直版
     */
    public get IsPortrait():boolean { return this.m_isPortrait; }

    protected constructor(id:number, name:string) {
        this.m_id = id;
        this.m_bundle = name;
        this.m_scene = name;
        this.m_isPortrait = false;
    }

    /**
     * 設定為直版
     */
    public Portrait(): StageInfo { this.m_isPortrait = true; return this; }

    /**
     * 指定場景名稱
     * @param sceneName 場景名稱
     * 備註：一般情形下不需要特別指定
     */
    public Scene(sceneName:string): StageInfo { this.m_scene = sceneName; return this;}
}