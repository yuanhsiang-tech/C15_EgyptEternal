import { _decorator, isValid, Component, warn, error } from "cc";
import { IGameAudioPlayer } from "./IGameAudioPlayer";
import { EventDefine } from "../../../Define/EventDefine";
import { AudioMacro } from "../../../Audio/Foundation/AudioMacro";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import AudioManager from "../../../Audio/Foundation/AudioManager";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";


const { ccclass } = _decorator;

//================================================================================================
/**
 * 遊戲音效控制器
 */
//================================================================================================

@ccclass
export default class GameAudioControl extends Component implements IGameAudioPlayer
{
    //----------------------------------------------------------------

    private m_bundleName    :string    = null;
    private m_assetsLoaded  :boolean   = false;
    private m_idleSilence   :boolean   = false;
    private m_isGameIdle    :boolean   = false;
    private m_isSilent      :boolean   = false;
    private m_idleTime      :number    = 0;

    private m_isFirstSceneBgmPlayed     :boolean = false;
    private m_firstSceneBgmPlayInfo     :{audioPath: string, volume: number, force: boolean} = null;
    private m_sceneBgmAudioId           :AudioMacro.ID = AudioMacro.INVALID_ID;

    private m_sceneBgmSilentWhileIdle   :boolean = false;
    private m_sceneBgmSilentIdleTime    :number = 0;
    private m_sceneBgmSilentFadeTime    :number = 0;

    //----------------------------------------------------------------

    protected onLoad(): void {
        EventDispatcher.Shared.On( EventDefine.Game.ENTER_IDLE, this.OnGameEnterIdle, this );
        EventDispatcher.Shared.On( EventDefine.Game.SPIN_START, this.OnGameSpinStart, this );
    }

    //----------------------------------------------------------------

    protected onDestroy(): void {
        EventDispatcher.Shared.Off( EventDefine.Game.SPIN_START, this.OnGameSpinStart, this );
        EventDispatcher.Shared.Off( EventDefine.Game.ENTER_IDLE, this.OnGameEnterIdle, this );
        AudioManager.Instance.ReleaseAssets( this.m_bundleName, true );
    }

    //----------------------------------------------------------------

    protected update(dt: number): void {
        if (this.m_idleSilence && !this.m_isSilent) {
            this.m_idleTime += dt;
            if (this.m_idleTime >= this.m_sceneBgmSilentIdleTime) {
                this.m_idleTime = 0;
                this.SetSceneBgmSilent( true );
            }
        }
    }

    //----------------------------------------------------------------
    /** 初始化 */
    public Initialize(bundleName: string) {
        this.m_bundleName   = bundleName;
        this.m_assetsLoaded = false;
    }

    //----------------------------------------------------------------
    /**
     * 載入音樂音效資源
     * @param profile 音效清單設定檔
     * @param options 音效載入選項
     */
    public LoadAssets(  profile     :AudioMacro.AssetsLoadProfile,
                        options    ?:Readonly<AudioMacro.AssetsLoadOptions>,
                        callback   ?:AudioMacro.LoadedCallback<AudioMacro.AssetsLoadResult>,
                        ): void
    {
        const optionCB = options?.loadedCallback;

        // 檢查 Bundle 名稱
        if (this.m_bundleName?.length <= 0) {
            warn(`GameAudioControl.LoadAssets: Invalid bundle name`, this.m_bundleName);
            const err = new Error(`[GameAudioControl] Load assets with invalid bundle name: ${this.m_bundleName}`);
            callback?.(err, null);
            optionCB?.(err, null);
            return;
        }

        // 設定載入選項
        const loadOptions: AudioMacro.AssetsLoadOptions = {};
        loadOptions.assetRoot       = options?.assetRoot        ?? undefined;
        loadOptions.defaultType     = options?.defaultType      ?? AudioMacro.TYPES.SFX_ORDINARY;
        loadOptions.autoRelease     = options?.autoRelease      ?? true;
        loadOptions.gamePausable    = options?.gamePausable     ?? true;
        loadOptions.loadedClipMap   = options?.loadedClipMap    ?? undefined;
        loadOptions.loadedCallback  = (err: Error, result: AudioMacro.AssetsLoadResult) =>
            {
                isValid(this, true) && this.OnAssetsLoaded(err, result);
                callback?.(err, result);
                optionCB?.(err, result);
            };

        // 載入音效資源
        AudioManager.Instance.LoadAssets( this.m_bundleName, profile, loadOptions );
    }

    //----------------------------------------------------------------
    /** 刷新場景 BGM 靜音狀態 */
    private RefreshIdleSilenceStatus(): void {
        this.m_idleSilence = (this.m_sceneBgmSilentWhileIdle && this.m_isGameIdle);
        this.m_isSilent && !this.m_idleSilence && this.SetSceneBgmSilent( false );
    }

    //----------------------------------------------------------------
    /** 設定靜音狀態 */
    private SetSceneBgmSilent(isSilent: boolean): void {
        if (this.m_isSilent !== isSilent) {
            this.m_isSilent = isSilent;
            if (isSilent) {
                AudioManager.Instance.FadeVolumeFactor( AudioMacro.VOLUME_FACTOR.SLOT_SCENE_BGM, 0, this.m_sceneBgmSilentFadeTime );
            } else {
                AudioManager.Instance.SetVolumeFactor( AudioMacro.VOLUME_FACTOR.SLOT_SCENE_BGM, 1 );
            }
        }
    }

    //----------------------------------------------------------------
    /** 載入音效資源完成 */
    private OnAssetsLoaded(err: Error, result: AudioMacro.AssetsLoadResult): void {
        if (err) {
            error(`GameAudioControl.OnAssetsLoaded: ERROR`, err);
            return;
        }

        this.m_assetsLoaded = true;

        // 如果還沒播放過第一次的場景 BGM 且強制播放，則播放
        if (!this.m_isFirstSceneBgmPlayed && this.m_firstSceneBgmPlayInfo?.force) {
            this.PlaySceneBGM( this.m_firstSceneBgmPlayInfo.audioPath, this.m_firstSceneBgmPlayInfo.volume, true );
            (this.m_sceneBgmAudioId !== AudioMacro.INVALID_ID) && (this.m_firstSceneBgmPlayInfo = null);
        }
    }

    //----------------------------------------------------------------
    /** 遊戲進入閒置狀態 */
    private OnGameEnterIdle(): void {
        this.m_isGameIdle = true;
        this.m_idleTime = 0;
        this.RefreshIdleSilenceStatus();
    }

    //----------------------------------------------------------------
    /** 遊戲開始 Spin */
    private OnGameSpinStart(): void {
        this.m_isGameIdle = false;
        this.m_idleTime = 0;
        this.RefreshIdleSilenceStatus();

        if (!this.m_isFirstSceneBgmPlayed && this.m_firstSceneBgmPlayInfo) {
            this.PlaySceneBGM( this.m_firstSceneBgmPlayInfo.audioPath, this.m_firstSceneBgmPlayInfo.volume, true );
            (this.m_sceneBgmAudioId !== AudioMacro.INVALID_ID) && (this.m_firstSceneBgmPlayInfo = null);
        }

        this.SetSceneBgmSilent( false );
    }

    //----------------------------------------------------------------

    //================================================================
    // Implementation of IGameAudioPlayer
    //================================================================

    //----------------------------------------------------------------
    // IGameAudioPlayer : 正在播放的場景 BGM ID
    public get SceneBgmAudioId(): AudioMacro.ID {
        return this.m_sceneBgmAudioId;
    }

    // IGameAudioPlayer : 正在播放的場景 BGM 實際音量
    public get SceneBgmExactVolume(): number {
        if (this.m_sceneBgmAudioId === AudioMacro.INVALID_ID) {
            return AudioMacro.INVALID_VOLUME;
        } else {
            return AudioManager.Instance.GetExactVolume( this.m_sceneBgmAudioId );
        }
    }

    // IGameAudioPlayer : 正在播放的場景 BGM 音量
    public get SceneBgmVolume(): number {
        if (this.m_sceneBgmAudioId === AudioMacro.INVALID_ID) {
            return AudioMacro.INVALID_VOLUME;
        } else {
            return AudioManager.Instance.GetVolume( this.m_sceneBgmAudioId );
        }
    }

    public set SceneBgmVolume(volume: number) {
        if (this.m_sceneBgmAudioId !== AudioMacro.INVALID_ID) {
            AudioManager.Instance.SetVolume( this.m_sceneBgmAudioId, volume );
        }
    }

    // IGameAudioPlayer : 是否啟用場景 BGM 在遊戲閒置時靜音
    public get SceneBgmSilentWhileIdle(): boolean {
        return this.m_sceneBgmSilentWhileIdle;
    }

    public set SceneBgmSilentWhileIdle(bool: boolean) {
        this.m_sceneBgmSilentWhileIdle = bool;
        this.RefreshIdleSilenceStatus();
    }

    // IGameAudioPlayer : 遊戲閒置多少秒後將場景 BGM 靜音
    public get SceneBgmSilentIdleTime(): number {
        return this.m_sceneBgmSilentIdleTime;
    }

    public set SceneBgmSilentIdleTime(time: number) {
        this.m_sceneBgmSilentIdleTime = NumberUtils.ClampPositive( time );
    }

    // IGameAudioPlayer : 場景 BGM 靜音時的淡出時間 (秒)
    public get SceneBgmSilentFadeTime(): number {
        return this.m_sceneBgmSilentFadeTime;
    }

    public set SceneBgmSilentFadeTime(time: number) {
        this.m_sceneBgmSilentFadeTime = NumberUtils.ClampPositive( time );
    }

    //----------------------------------------------------------------
    // IGameAudioPlayer : 播放場景 BGM
    public PlaySceneBGM(audioPath: string, volume: number = 1, force: boolean = false): AudioMacro.ID {
        if (this.m_assetsLoaded && (this.m_isFirstSceneBgmPlayed || force)) {
            this.m_isFirstSceneBgmPlayed = true;

            return this.m_sceneBgmAudioId = AudioManager.Instance.PlaySceneBGM( audioPath,
                {
                    volume          : volume,
                    gamePausable    : true,
                    volumeFactors   : [AudioMacro.VOLUME_FACTOR.SLOT_SCENE_BGM],
                    bundleName      : this.m_bundleName,
                });
        }

        this.m_firstSceneBgmPlayInfo = {audioPath: audioPath, volume: volume, force: force};
        return AudioMacro.INVALID_ID;
    }

    // IGameAudioPlayer : 停止場景 BGM
    public StopSceneBGM(): void {
        AudioManager.Instance.StopSceneBGM();
        this.m_sceneBgmAudioId = AudioMacro.INVALID_ID;
    }

    // IGameAudioPlayer : 暫停場景 BGM
    public PauseSceneBGM(): void {
        AudioManager.Instance.PauseSceneBGM();
    }

    // IGameAudioPlayer : 恢復場景 BGM
    public ResumeSceneBGM(): void {
        AudioManager.Instance.ResumeSceneBGM();
    }

    //----------------------------------------------------------------
    // IGameAudioPlayer : 播放覆蓋 BGM
    public PlayCoverBGM(audioPath: string, volume: number = 1, pausable: boolean = true): AudioMacro.ID {
        return AudioManager.Instance.PlayCoverBGM( audioPath,
            {
                volume          : volume,
                gamePausable    : pausable,
                volumeFactors   : [AudioMacro.VOLUME_FACTOR.SLOT_COVER_BGM],
                bundleName      : this.m_bundleName,
            });
    }

    // IGameAudioPlayer : 停止覆蓋 BGM
    public StopCoverBGM(): void {
        AudioManager.Instance.StopCoverBGM();
    }

    // IGameAudioPlayer : 暫停覆蓋 BGM
    public PauseCoverBGM(): void {
        AudioManager.Instance.PauseCoverBGM();
    }

    // IGameAudioPlayer : 恢復覆蓋 BGM
    public ResumeCoverBGM(): void {
        AudioManager.Instance.ResumeCoverBGM();
    }

    //----------------------------------------------------------------
    // IGameAudioPlayer : 播放音效
    public Play(audioPath: string, volume?: number, loop?: boolean, unique?: boolean, callback?: AudioMacro.CompleteCallback): AudioMacro.ID {
        return AudioManager.Instance.Play( audioPath,
            {
                volume      : volume,
                loop        : loop,
                unique      : unique,
                onComplete  : callback,
                bundleName  : this.m_bundleName,
            });
    }

    // IGameAudioPlayer : 播放焦點音效 (會降低背景音樂音量)
    public PlayFocus(audioPath: string, volume?: number, loop?: boolean, unique?: boolean, callback?: AudioMacro.CompleteCallback): AudioMacro.ID {
        return AudioManager.Instance.Play( audioPath,
            {
                volume      : volume,
                loop        : loop,
                unique      : unique,
                focused     : true,
                onComplete  : callback,
                bundleName  : this.m_bundleName,
            });
    }

    // IGameAudioPlayer : 進階播放音效 (可設定更多播放參數)
    public HyperPlay(audioPath: string, options?: AudioMacro.PlayingConfig): AudioMacro.ID {
        return AudioManager.Instance.Play( audioPath, options );
    }

    // IGameAudioPlayer : 停止音效
    public Stop(audioKey: any): void {
        return AudioManager.Instance.Stop( audioKey );
    }

    // IGameAudioPlayer : 暫停音效
    public Pause(audioKey: any): void {
        return AudioManager.Instance.Pause( audioKey );
    }

    // IGameAudioPlayer : 恢復音效
    public Resume(audioKey: any): void {
        return AudioManager.Instance.Resume( audioKey );
    }

    // IGameAudioPlayer : 設定音效時間
    public SetCurrentTime(audioKey: any, time: number): void {
        AudioManager.Instance.SetCurrentTime( audioKey, time );
    }

    // IGameAudioPlayer : 設定音效音量
    public SetVolume(audioKey: any, volume: number): void {
        AudioManager.Instance.SetVolume( audioKey, volume );
    }

    // IGameAudioPlayer : 漸進設定BGM音量
    public FadeBGM(volume: number, fadeTime: number): void {
        AudioManager.Instance.FadeVolume(this.m_sceneBgmAudioId, volume, fadeTime);
    }

    //----------------------------------------------------------------

}
