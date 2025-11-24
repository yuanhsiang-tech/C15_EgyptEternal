import { _decorator, isValid, Component } from "cc";
import { EpisodeEntityDelegate } from "./EpisodeEntityDelegate";

const { ccclass } = _decorator;

//================================================================================================
/**
 * 演出實體基底類別
 */
//================================================================================================

@ccclass
export default abstract class EpisodeEntityBase< DataType > extends Component {

    //----------------------------------------------------------------
    /** 準備演出實體 (供 Commander 使用) */
    public static Prepare(entity: EpisodeEntityBase<any>, delegate: EpisodeEntityDelegate, id: number, key: string, data: any): void {
        if (isValid(entity, true)) {
            entity.m_entityDelegate = delegate;
            entity.m_episodeId      = id;
            entity.m_episodeKey     = key;
            entity.m_episodeData    = data;
        }
    }

    //----------------------------------------------------------------
    /** 釋放演出實體 (供 Commander 使用) */
    public static Release(entity: EpisodeEntityBase<any>): void {
        if (isValid(entity, true)) {
            entity.m_entityDelegate = null;
            entity.m_episodeId      = -1;
            entity.m_episodeKey     = null;
            entity.m_episodeData    = null;
        }
    }

    //----------------------------------------------------------------

    private m_entityDelegate    :EpisodeEntityDelegate = null;
    private m_episodeId         :number = -1;
    private m_episodeKey        :string = null;
    private m_episodeData       :DataType = null;

    //----------------------------------------------------------------
    /** 演出逾時時間 (秒) */
    public readonly EpisodeTimeoutTime?: number;

    /** 是否於演出啟動時暫停場景 */
    public readonly ShouldPauseSceneOnLaunch?: boolean;

    //----------------------------------------------------------------
    /**
     * 演出啟動
     * @param episodeData 演出資料
     */
    public abstract OnEpisodeLaunch(episodeData?: DataType): void;

    /** 演出初始化 (只會呼叫一次) */
    public OnEpisodeInitiate?(initialData?: any): void;

    /** 演出結束 */
    public OnEpisodeFinish?(): void;

    /**
     * 演出逾時
     * @returns 是否強制結束演出
     */
    public OnEpisodeTimeout?(): boolean;

    //----------------------------------------------------------------

    //================================================================
    // 讓子類別呼叫的方法
    //================================================================

    //----------------------------------------------------------------
    /** 取得當前演出 ID */
    public get EpisodeId(): number {
        return this.m_episodeId;
    }

    //----------------------------------------------------------------
    /** 取得當前演出鍵值 */
    public get EpisodeKey(): string {
        return this.m_episodeKey;
    }

    //----------------------------------------------------------------
    /** 取得當前演出資料 */
    protected get EpisodeData(): DataType {
        return this.m_episodeData;
    }

    //----------------------------------------------------------------
    /** 手動暫停當前場景 */
    protected PauseScene(): void {
        this.m_entityDelegate?.PauseScene( this.m_episodeId );
    }

    //----------------------------------------------------------------
    /** 手動恢復當前場景 */
    protected ResumeScene(): void {
        this.m_entityDelegate?.ResumeScene( this.m_episodeId );
    }

    //----------------------------------------------------------------
    /** 結束演出 */
    protected FinishEpisode(): void {
        this.m_entityDelegate?.FinishEpisode( this.m_episodeId );
    }

    //----------------------------------------------------------------
    /**
     * 延後演出逾時時間
     * @param timeoutTime 從現在開始延後的時間 (秒) (預設為原本的逾時時間)
     */
    protected PostponeEpisode(timeoutTime?: number): void {
        this.m_entityDelegate?.PostponeEpisode( this.m_episodeId, timeoutTime );
    }

    //----------------------------------------------------------------

}
