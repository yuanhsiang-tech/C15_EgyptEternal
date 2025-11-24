import { EpisodeMacro } from "./EpisodeMacro";

export class EpisodeEntityConfig
{
    //----------------------------------------------------------------

    private m_bundleName    :string;
    private m_assetPath     :string;
    private m_assetPathP    :string;
    private m_zIndex        :number;
    private m_episodeType   :EpisodeMacro.TYPE;
    private m_initStrategy  :EpisodeMacro.INIT_STRATEGY;
    private m_pauseOnStart  :boolean;

    //----------------------------------------------------------------
    /** 資源 Bundle 名稱 */
    public get bundleName(): string {
        return this.m_bundleName;
    }

    /** Prefab 資源路徑 */
    public get assetPath(): string {
        return this.m_assetPath;
    }

    /** 直版 Prefab 資源路徑 */
    public get portraitAssetPath(): string {
        return this.m_assetPathP;
    }

    /** 節點 Z Index */
    public get zIndex(): number {
        return this.m_zIndex;
    }

    /** 演出類型 */
    public get episodeType(): EpisodeMacro.TYPE {
        return this.m_episodeType;
    }

    /** 初始化策略 */
    public get initStrategy(): EpisodeMacro.INIT_STRATEGY {
        return this.m_initStrategy;
    }

    /** 演出開始時是否暫停場景 */
    public get pauseOnStart(): boolean {
        return this.m_pauseOnStart;
    }

    //----------------------------------------------------------------

    private constructor(bundleName: string, assetPath: string, portraitAssetPath?: string) {
        this.m_bundleName   = bundleName;
        this.m_assetPath    = assetPath;
        this.m_assetPathP   = portraitAssetPath ?? assetPath;
        this.m_zIndex       = EpisodeMacro.DEFAULT_ZINDEX;
        this.m_episodeType  = EpisodeMacro.DEFAULT_TYPE;
        this.m_initStrategy = EpisodeMacro.DEFAULT_INIT_STRATEGY;
        this.m_pauseOnStart = true;
    }

    //----------------------------------------------------------------
    /** 建立演出實體設定 */
    public static Build(bundleName: string, assetPath: string, portraitAssetPath?: string): EpisodeEntityConfig {
        return new EpisodeEntityConfig(bundleName, assetPath, portraitAssetPath);
    }

    //----------------------------------------------------------------
    /** 設定節點 Z Index */
    public ZIndex(zIndex: number): this {
        this.m_zIndex = zIndex;
        return this;
    }

    /** 設定演出類型 */
    public EpisodeType(episodeType: EpisodeMacro.TYPE): this {
        this.m_episodeType = episodeType;
        return this;
    }

    /** 設定初始化策略 */
    public InitStrategy(initStrategy: EpisodeMacro.INIT_STRATEGY): this {
        this.m_initStrategy = initStrategy;
        return this;
    }

    /** 設定演出開始時是否暫停場景 */
    public PauseOnStart(pauseOnStart: boolean): this {
        this.m_pauseOnStart = pauseOnStart;
        return this;
    }

    //----------------------------------------------------------------

}
