import EpisodeEntityBase from "./EpisodeEntityBase";
import { EpisodeMacro } from "./EpisodeMacro";

export interface EpisodeCommanderDelegate
{
    /**
     * 通知: 開始演出
     * @param key           演出 Key
     * @param episodeId     演出編號
     * @param episodeData   演出資料
     * @param entity        演出實體
     */
    OnEpisodeStart(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity?: EpisodeEntityBase<any>): void;

    /**
     * 通知: 演出失敗
     * @param key           演出 Key
     * @param episodeId     演出編號
     * @param episodeData   演出資料
     * @param entity        演出實體
     */
    OnEpisodeFatal(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, code: EpisodeMacro.FATAL_CODE): void;

    /**
     * 通知: 啟動演出
     * @param key           演出 Key
     * @param episodeId     演出編號
     * @param episodeData   演出資料
     * @param entity        演出實體
     */
    OnEpisodeLaunch(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity: EpisodeEntityBase<any>): void;

    /**
     * 通知: 結束演出
     * @param key           演出 Key
     * @param episodeId     演出編號
     * @param episodeData   演出資料
     * @param entity        演出實體
     */
    OnEpisodeFinish(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity: EpisodeEntityBase<any>): void;
}
