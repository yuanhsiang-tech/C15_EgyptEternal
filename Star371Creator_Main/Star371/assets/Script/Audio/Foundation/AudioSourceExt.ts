import { _decorator, isValid, Director, AudioSource, AudioClip, Tween } from 'cc';
import { AudioMacro } from './AudioMacro';
import AudioCore from './AudioCore';
import { NumberUtils } from '../../../Stark/FuncUtils/NumberUtils';
import { LazyUpdating } from '../../../Stark/Utility/LazyUpdating';

const { ccclass } = _decorator;

const TWEEN_TAG = 995;

//================================================================================================
/**
 * AudioSource 事件追蹤者
 */
//================================================================================================

export interface AudioSourceExtTracker {
    /** 音效播放開始 */
    OnAudioSourcePlayStart(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void;

    /** 音效重複播放 */
    OnAudioSourceRepeat(audioSource: AudioSourceExt, audioId: AudioMacro.ID, leftTimes: number): void;

    /** 音效播放完畢 */
    OnAudioSourceComplete(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void;

    /** 音效暫停 */
    OnAudioSourcePause(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void;

    /** 音效恢復 */
    OnAudioSourceResume(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void;

    /** 音效音量變更 */
    OnAudioSourceVolumeChanged(audioSource: AudioSourceExt, audioId: AudioMacro.ID, volume: number): void;
}

//================================================================================================
/**
 * AudioSource 擴充
 */
//================================================================================================

@ccclass
export class AudioSourceExt extends AudioSource
{
    //----------------------------------------------------------------
    // 複寫 AudioSource 定義在js裡面的內容(ts裡面看不到定義)
    // private _isLoaded: boolean;

    //----------------------------------------------------------------

    private m_srcTracker        :AudioSourceExtTracker = null;

    private m_audioId           :AudioMacro.ID = AudioMacro.INVALID_ID;
    private m_audioType         :AudioMacro.TYPES = AudioMacro.TYPES.NONE;
    private m_repeatTimes       :number = 0;
    private m_repeatCallback    :AudioMacro.RepeatCallback = null;
    private m_completeCallback  :AudioMacro.CompleteCallback = null;
    private m_gamePausable      :boolean = false;
    private m_focused           :boolean = false;
    private m_shouldPause       :boolean = false;

    private m_volumeScale       :number = 1.0;
    private m_volumeTweenCbs    :Function[] = [];
    private m_volumeLazyUpdate  :LazyUpdating = null;

    private m_globalFactorKey   :AudioMacro.VOLUME_FACTOR = AudioMacro.VOLUME_FACTOR.NONE;
    private m_factorKeySet      :Set<AudioMacro.VOLUME_FACTOR> = new Set();
    private m_factorProduct     :number = 1.0;
    private m_factorLazyUpdate  :LazyUpdating = null;

    //----------------------------------------------------------------
    /** AudioSource 狀態追蹤者 */
    public set Tracker(value: AudioSourceExtTracker) {
        this.m_srcTracker = value;
    }

    //----------------------------------------------------------------
    /** 音效 ID */
    public get AudioId(): AudioMacro.ID {
        return this.m_audioId;
    }

    //----------------------------------------------------------------
    /** Clip 的 UUID */
    public get ClipUuid(): string {
        return this.clip?.uuid ?? '';
    }

    //----------------------------------------------------------------
    /** 是否正在使用中 */
    public get IsInUse(): boolean {
        return this.m_audioId != AudioMacro.INVALID_ID;
    }

    //----------------------------------------------------------------
    /** 是否正在運作中 */
    public get IsBusy(): boolean {
        return this.state == AudioSource.AudioState.PLAYING || this.state == AudioSource.AudioState.PAUSED;
    }

    //----------------------------------------------------------------
    /** 音效類型 */
    public get AudioType(): AudioMacro.TYPES {
        return this.m_audioType;
    }

    public set AudioType(value: AudioMacro.TYPES) {
        this.m_audioType = value;

        switch (this.m_audioType) {
            case AudioMacro.TYPES.BGM:{
                this.m_globalFactorKey = AudioMacro.VOLUME_FACTOR.GLOBAL_BGM;
                break;
            }

            case AudioMacro.TYPES.SFX_ORDINARY:
            case AudioMacro.TYPES.SFX_ONE_SHOT:{
                this.m_globalFactorKey = AudioMacro.VOLUME_FACTOR.GLOBAL_SFX;
                break;
            }

            default:{
                this.m_globalFactorKey = AudioMacro.VOLUME_FACTOR.NONE;
                break;
            }
        }

        this.UpdateVolumeFactor();
    }

    //----------------------------------------------------------------
    /** 是否為音效 */
    public get IsSFX(): boolean {
        return this.AudioType == AudioMacro.TYPES.SFX_ONE_SHOT || this.AudioType == AudioMacro.TYPES.SFX_ORDINARY;
    }

    //----------------------------------------------------------------
    /** 是否為背景音樂 */
    public get IsBGM(): boolean {
        return this.AudioType == AudioMacro.TYPES.BGM;
    }

    //----------------------------------------------------------------
    /** 剩餘播放秒數 */
    public get LeftTime(): number {
        let leftTime = 0;
        if (this.clip && this.IsBusy) {
            leftTime = this.clip.getDuration() - this.currentTime;
        }
        return leftTime > 0 ? leftTime : 0;
    }

    //----------------------------------------------------------------
    /** 音量比例 */
    public get VolumeScale(): number {
        return this.m_volumeScale;
    }

    public set VolumeScale(volScale: number) {
        this.m_volumeScale = isNaN(volScale) ? 1.0 : NumberUtils.Clamp01(volScale);
        this.UpdateVolume();
    }

    //----------------------------------------------------------------
    /** 實際音量 */
    public get ExactVolume(): number {
        return this.volume;
    }

    //----------------------------------------------------------------
    /** 是否可以暫停 */
    public get GamePausable(): boolean {
        return this.m_gamePausable;
    }

    //----------------------------------------------------------------
    /** 是否為焦點音效 */
    public get Focused(): boolean {
        return this.m_focused;
    }

    //----------------------------------------------------------------

    onLoad(): void {
        super.onLoad?.();

        AudioCore.Instance.On( AudioMacro.EVENTS.VOLUME_FACTOR_CHANGED, this.OnVolumeFactorChanged, this );
        this.node.on( AudioSource.EventType.STARTED, this.OnAudioStarted, this );
        this.node.on( AudioSource.EventType.ENDED, this.OnAudioEnded, this );
    }

    onDestroy(): void {
        this.node.off( AudioSource.EventType.ENDED, this.OnAudioEnded, this );
        this.node.off( AudioSource.EventType.STARTED, this.OnAudioStarted, this );
        AudioCore.Instance.Off( AudioMacro.EVENTS.VOLUME_FACTOR_CHANGED, this.OnVolumeFactorChanged, this );

        super.onDestroy?.();
    }

    //----------------------------------------------------------------
    /** AudioSource 目前是否可以被重複使用 */
    public get IsReusable(): boolean
    {
        return !this.IsInUse && !this.clip;
    }

    //================================================================
    // 播放控制
    //================================================================

    //----------------------------------------------------------------
    /** 播放音效 */
    public Play(audioClip: AudioClip, config?: AudioMacro.PlayingConfig): AudioMacro.ID
    {
        if (!isValid(audioClip, true)) {
            return AudioMacro.INVALID_ID;
        }

        this.clip               = audioClip;
        this.AudioType          = config?.type          ?? AudioMacro.TYPES.SFX_ORDINARY;
        this.loop               = config?.loop          ?? false;
        this.VolumeScale        = config?.volume        ?? 1.0;
        this.m_repeatTimes      = config?.repeat        ?? 0;
        this.m_repeatCallback   = config?.onRepeat      ?? null;
        this.m_completeCallback = config?.onComplete    ?? null;
        this.m_gamePausable     = config?.gamePausable  ?? false;
        this.m_focused          = !this.IsBGM && (config?.focused ?? false);
        this.m_shouldPause      = false;

        // 指派音量因子
        if (Array.isArray(config?.volumeFactors)) {
            this.AssignVolumeFactor( ...config.volumeFactors );
        }

        // 檢查類型
        if (this.AudioType == AudioMacro.TYPES.NONE) {
            return AudioMacro.INVALID_ID;
        }

        // 取得音效 ID 與播放音效
        this.m_audioId = AudioCore.Instance.ReserveAudioId();
        this.UpdateVolumeFactor(true);
        this.UpdateVolume(true);
        this.play();

        return this.m_audioId;
    }

    //----------------------------------------------------------------
    /** 重播音效 */
    public Replay(audioClip: AudioClip, config?: AudioMacro.PlayingConfig): AudioMacro.ID
    {
        if (this.ClipUuid == audioClip?.uuid && this.IsBusy) {
            this.OnAudioSourceComplete( false );
            this.pause();
            this.currentTime = 0;
            return this.Play( audioClip, config );
        } else {
            this.Stop();
            return this.Play( audioClip, config );
        }
    }

    //----------------------------------------------------------------
    /**
     * 停止音效
     * @param release 是否正在釋放音效，若為 true 則會清空並且不觸發 Callback
     */
    public Stop(release: boolean = false): AudioMacro.ID
    {
        const audioId = this.m_audioId;

        if (release) {
            this.m_repeatCallback   = null;
            this.m_completeCallback = null;
        }

        if (audioId != AudioMacro.INVALID_ID) {
            this.stop();
            this.OnAudioSourceComplete();
        }

        return audioId;
    }

    //----------------------------------------------------------------
    /** 暫停音效 */
    public Pause(): void
    {
        if (this.AudioType == AudioMacro.TYPES.SFX_ONE_SHOT) {
            return;
        }

        this.m_shouldPause = true;
        if (this.playing) {
            this.pause();
            this.OnAudioSourcePause();
        }
    }

    //----------------------------------------------------------------
    /** 恢復音效 */
    public Resume(): void
    {
        if (!this.IsInUse) {
            return;
        }

        this.m_shouldPause = false;
        if (this.state == AudioSource.AudioState.PAUSED) {
            this.play();
            this.OnAudioSourceResume();
        }
    }

    //----------------------------------------------------------------
    /** 事件: 開始播放 */
    private OnAudioStarted()
    {
        if (this.m_shouldPause && this.playing) {
            this.pause();
            this.OnAudioSourcePause();
            return;
        }

        this.OnAudioSourcePlayStart();
    }

    //----------------------------------------------------------------
    /** 事件: 播放完畢 */
    private OnAudioEnded()
    {
        if (this.m_repeatTimes > 0) {
            this.m_repeatTimes -= 1;
            this.OnAudioSourceRepeat( this.m_repeatTimes );
            this.play();
            return;
        }

        this.OnAudioSourceComplete();
    }

    //----------------------------------------------------------------
    /** 事件: 開始 */
    private OnAudioSourcePlayStart() {
        this.m_srcTracker?.OnAudioSourcePlayStart( this, this.m_audioId );
    }

    //----------------------------------------------------------------
    /** 事件: 重複 */
    private OnAudioSourceRepeat(leftTimes: number) {
        this.m_srcTracker?.OnAudioSourceRepeat( this, this.m_audioId, leftTimes );
        this.m_repeatCallback?.( this.m_audioId, leftTimes );
    }

    //----------------------------------------------------------------
    /** 事件: 完成 */
    private OnAudioSourceComplete(shouldReset: boolean = true)
    {
        const audioId               = this.m_audioId;
        const completeCallback      = this.m_completeCallback;

        // 釋放音效 ID
        if (this.m_audioId != AudioMacro.INVALID_ID) {
            this.m_audioId = AudioMacro.INVALID_ID;
            AudioCore.Instance.ReleaseAudioId( audioId );
        }

        // 釋放 Callback
        this.m_completeCallback     = null;
        this.m_repeatCallback       = null;

        // 重置設定
        if (shouldReset) {
            this.clip               = null;
            this.m_audioType        = AudioMacro.TYPES.NONE;
            this.m_repeatTimes      = 0;
            this.m_gamePausable     = false;
            this.m_focused          = false;
            this.m_shouldPause      = false;
            this.m_globalFactorKey  = AudioMacro.VOLUME_FACTOR.NONE;
            this.m_factorKeySet.clear();
        }

        // 事件通知
        if (audioId != AudioMacro.INVALID_ID) {
            this.m_srcTracker?.OnAudioSourceComplete( this, audioId );
            completeCallback?.( audioId );
        }
    }

    //----------------------------------------------------------------
    /** 事件: 暫停 */
    private OnAudioSourcePause() {
        this.m_srcTracker?.OnAudioSourcePause( this, this.m_audioId );
    }

    //----------------------------------------------------------------
    /** 事件: 恢復 */
    private OnAudioSourceResume() {
        this.m_srcTracker?.OnAudioSourceResume( this, this.m_audioId );
    }

    //----------------------------------------------------------------

    //================================================================
    // 音量控制
    //================================================================

    //----------------------------------------------------------------
    /** 設定音量 */
    public SetVolumeScale(volScale: number, duration?: number, callback?: Function) {
        Tween.stopAllByTag( TWEEN_TAG , this );
        callback && this.m_volumeTweenCbs.push( callback );

        const _volScale = isNaN(volScale) ? 1.0 : NumberUtils.Clamp01(volScale);

        if (duration > 0 && _volScale != this.VolumeScale) {
            duration = NumberUtils.Clamp( duration, 0, this.LeftTime );
            new Tween<AudioSourceExt>( this )
                .to(duration, { VolumeScale: _volScale })
                .call(() => this.OnVolumeTweenComplete())
                .start();
        } else {
            this.VolumeScale = _volScale;
            this.OnVolumeTweenComplete();
        }
    }

    //----------------------------------------------------------------
    /** 音量變更完成 */
    private OnVolumeTweenComplete() {
        const cbs = this.m_volumeTweenCbs;
        this.m_volumeTweenCbs = [];
        cbs.forEach( cb => cb?.() );
    }

    //----------------------------------------------------------------
    /** 更新音量 */
    private UpdateVolume(immediately: boolean = false) {
        if (!this.m_volumeLazyUpdate) {
            this.m_volumeLazyUpdate = new LazyUpdating(() => this.updateVolume(), false, Director.EVENT_BEFORE_DRAW);
        }
        this.m_volumeLazyUpdate.Update(immediately);
    }

    // 實際更新音量
    private updateVolume() {
        this.volume = this.m_volumeScale * this.m_factorProduct;
        this.OnAudioSourceVolumeChanged( this.m_audioId, this.volume );
        return this.volume;
    }

    //----------------------------------------------------------------
    /** 事件: 音量變更 */
    private OnAudioSourceVolumeChanged(audioId: AudioMacro.ID, volume: number) {
        this.m_srcTracker?.OnAudioSourceVolumeChanged( this, audioId, volume );
    }

    //----------------------------------------------------------------

    //================================================================
    // 音量因子控制
    //================================================================

    //----------------------------------------------------------------
    /** 指派音量因子 */
    public AssignVolumeFactor(...factors: AudioMacro.VOLUME_FACTOR[]): void {
        if (factors?.length > 0) {
            factors.forEach( f => this.m_factorKeySet.add(f) );
            this.UpdateVolumeFactor();
        }
    }

    /** 移除音量因子 */
    public ResignVolumeFactor(...factors: AudioMacro.VOLUME_FACTOR[]): void {
        if (factors?.length > 0) {
            factors.forEach( f => this.m_factorKeySet.delete(f) );
            this.UpdateVolumeFactor();
        }
    }

    /** 清空音量因子 */
    public ClearVolumeFactor(): void {
        this.m_factorKeySet.clear();
        this.UpdateVolumeFactor();
    }

    /** 音量因子變更通知 */
    private OnVolumeFactorChanged( factorKey: AudioMacro.VOLUME_FACTOR, value: number ) {
        if (factorKey == this.m_globalFactorKey || this.m_factorKeySet.has(factorKey)) {
            this.UpdateVolumeFactor();
        }
    }

    /** 更新音量因子 */
    private UpdateVolumeFactor(immediately: boolean = false) {
        if (!this.m_factorLazyUpdate) {
            this.m_factorLazyUpdate = new LazyUpdating(() => this.updateVolumeFactor(), true, Director.EVENT_AFTER_UPDATE);
        }
        this.m_factorLazyUpdate.Update(immediately);
    }

    // 實際更新音量因子
    private updateVolumeFactor() {
        const factorKeyList = Array.from(this.m_factorKeySet) ?? [];
        const factorProduct = AudioCore.Instance.GetVolumeFactorProduct( this.m_globalFactorKey, ...factorKeyList );
        if (this.m_factorProduct != factorProduct) {
            this.m_factorProduct = isNaN(factorProduct) ? 1.0 : NumberUtils.Clamp01(factorProduct);
            this.UpdateVolume();
        }
    }

    //----------------------------------------------------------------

}
