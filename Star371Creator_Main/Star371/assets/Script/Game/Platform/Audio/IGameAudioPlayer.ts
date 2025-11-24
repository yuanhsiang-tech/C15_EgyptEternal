import { AudioMacro } from "../../../Audio/Foundation/AudioMacro";


export interface IGameAudioPlayer
{
    //----------------------------------------------------------------
    /** 正在播放的場景 BGM ID */
    readonly SceneBgmAudioId: AudioMacro.ID;

    /** 正在播放的場景 BGM 實際音量 */
    readonly SceneBgmExactVolume: number;

    //----------------------------------------------------------------
    /** 正在播放的場景 BGM 音量 */
    SceneBgmVolume: number;

    /** 是否啟用場景 BGM 在遊戲閒置時靜音 */
    SceneBgmSilentWhileIdle: boolean;

    /** 遊戲閒置多少秒後將場景 BGM 靜音 */
    SceneBgmSilentIdleTime: number;

    /** 場景 BGM 靜音時的淡出時間 (秒) */
    SceneBgmSilentFadeTime: number;

    //----------------------------------------------------------------
    /** 播放場景 BGM */
    PlaySceneBGM(audioPath: string, volume?: number, force?: boolean): AudioMacro.ID;

    /** 停止場景 BGM */
    StopSceneBGM(): void;

    /** 暫停場景 BGM */
    PauseSceneBGM(): void;

    /** 恢復場景 BGM */
    ResumeSceneBGM(): void;

    //----------------------------------------------------------------
    /** 播放覆蓋 BGM */
    PlayCoverBGM(audioPath: string, volume?: number, force?: boolean): AudioMacro.ID;

    /** 停止覆蓋 BGM */
    StopCoverBGM(): void;

    /** 暫停覆蓋 BGM */
    PauseCoverBGM(): void;

    /** 恢復覆蓋 BGM */
    ResumeCoverBGM(): void;

    //----------------------------------------------------------------
    /**
     * 播放音效
     * @param audioPath 音效路徑
     * @param volume    音量
     * @param loop      是否循環播放
     * @param unique    是否唯一播放
     * @param callback  播放完成回調
     */
    Play(audioPath: string, volume?: number, loop?: boolean, unique?: boolean, callback?: AudioMacro.CompleteCallback): AudioMacro.ID;

    /**
     * 播放焦點音效 (會降低背景音樂音量)
     * @param audioPath 音效路徑
     * @param volume    音量
     * @param loop      是否循環播放
     * @param unique    是否唯一播放
     * @param callback  播放完成回調
     */
    PlayFocus(audioPath: string, volume?: number, loop?: boolean, unique?: boolean, callback?: AudioMacro.CompleteCallback): AudioMacro.ID;

    /**
     * 進階播放音效 (可設定更多播放參數)
     * @param audioPath 音效路徑
     * @param options   播放設定
     */
    HyperPlay(audioPath: string, options?: AudioMacro.PlayingConfig): AudioMacro.ID;

    /**
     * 停止音效
     */
    Stop(audioPath: string): void;
    Stop(audioId: AudioMacro.ID): void;

    /**
     * 暫停音效
     */
    Pause(audioPath: string): void;
    Pause(audioId: AudioMacro.ID): void;

    /**
     * 恢復音效
     */
    Resume(audioPath: string): void;
    Resume(audioId: AudioMacro.ID): void;

    /**
     * 設定音效時間
     */
    SetCurrentTime(audioId: AudioMacro.ID, time: number): void;

    /**
     * 設定音效音量
     */
    SetVolume(audioId: AudioMacro.ID, volume: number): void;

    /**
     * 漸進設定BGM音量
     */
    FadeBGM(volume: number, fadeTime: number): void;

    //----------------------------------------------------------------

}
