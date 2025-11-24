
export interface EpisodeEntityDelegate
{

    /** 手動暫停當前場景 */
    PauseScene(episodeId: number): void;

    /** 手動恢復當前場景 */
    ResumeScene(episodeId: number): void;

    /** 結束演出 */
    FinishEpisode(episodeId: number): void;

    /**
     * 延後演出逾時時間
     * @param timeoutTime 從現在開始延後的時間 (秒) (預設為原本的逾時時間)
     */
    PostponeEpisode(episodeId: number, timeoutTime?: number): void;

}
