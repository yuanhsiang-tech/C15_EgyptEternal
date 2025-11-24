
import { _decorator, director, isValid, clamp01, Node, Component, AudioClip, warn } from 'cc';
import { AudioSourceExt, AudioSourceExtTracker } from './AudioSourceExt';
import { NodeUtils } from '../../../Stark/FuncUtils/NodeUtils';
import AudioCore from './AudioCore';
import { AudioMacro } from './AudioMacro';
import CallbackBond from '../../../Stark/Utility/CallbackBond';
import { BundleDefine } from '../../../Script/Define/BundleDefine';
import { Persist } from '../../Persist/Persist';
import { StorageKeys } from '../../../Script/Define/StorageKeysDefine';
import { Bundle } from '../../../Script/Bundle/Bundle';

const { ccclass } = _decorator;

//================================================================================================
/**
 * 全域音效管理器
 */
//================================================================================================

@ccclass
export default class AudioManager extends Component
{

    //----------------------------------------------------------------

    private static s_instance: AudioManager = null;

    public static get Instance(): AudioManager {
        return AudioManager.s_instance || (AudioManager.s_instance = AudioManager.CreateAudioMgr());
    }

    private static CreateAudioMgr(): AudioManager {
        const node = new Node("AudioManager");
        director.addPersistRootNode(node);
        return NodeUtils.InstallComponent(node, AudioManager);
    }

    //----------------------------------------------------------------

    private m_audioSourceList   :AudioSourceExt[] = [];
    private m_trackerAdapter    :AudioSourceExtTracker = null;
    private m_clipResPathMap    :Map<string, AudioMacro.ClipResource[]> = null;
    private m_sceneBgmInfo      :{clip: AudioClip, audioId: AudioMacro.ID} = null;
    private m_coverBgmStack     :{clip: AudioClip, audioId: AudioMacro.ID}[] = [];
    private m_bgmAudioIdSet     :Set<AudioMacro.ID> = null;
    private m_weakenBgmTokens   :Set<AudioMacro.ID> = null;
    private m_selfPausedAudios  :Set<AudioMacro.ID> = null;
    private m_isGamePauseAll    :boolean = false;

    //----------------------------------------------------------------

    protected __preload(): void {
        this.m_trackerAdapter = {
            OnAudioSourcePlayStart      : this.OnAudioSourcePlayStart.bind( this ),
            OnAudioSourceRepeat         : this.OnAudioSourceRepeat.bind( this ),
            OnAudioSourceComplete       : this.OnAudioSourceComplete.bind( this ),
            OnAudioSourcePause          : this.OnAudioSourcePause.bind( this ),
            OnAudioSourceResume         : this.OnAudioSourceResume.bind( this ),
            OnAudioSourceVolumeChanged  : this.OnAudioSourceVolumeChanged.bind( this ),
        };

        this.m_clipResPathMap   = new Map<string, AudioMacro.ClipResource[]>();
        this.m_bgmAudioIdSet    = new Set<AudioMacro.ID>();
        this.m_weakenBgmTokens  = new Set<AudioMacro.ID>();
        this.m_selfPausedAudios = new Set<AudioMacro.ID>();
    }

    //----------------------------------------------------------------

    public Initialize(): void {
        // 設定全域背景音量
        const globalBgmVolume = Persist.App.GetNumber( StorageKeys.Audio.GLOBAL_BGM_VOLUME ) ?? 1.0;
        AudioCore.Instance.SetVolumeFactor( AudioMacro.VOLUME_FACTOR.GLOBAL_BGM, globalBgmVolume );

        // 設定全域音效音量
        const globalSfxVolume = Persist.App.GetNumber( StorageKeys.Audio.GLOBAL_SFX_VOLUME ) ?? 1.0;
        AudioCore.Instance.SetVolumeFactor( AudioMacro.VOLUME_FACTOR.GLOBAL_SFX, globalSfxVolume );
    }

    //----------------------------------------------------------------

    //================================================================
    // 全域音量控制
    //================================================================

    //----------------------------------------------------------------
    /** 取得全域音量: 音效 */
    public GetGlobalVolumeSFX(): number {
        return AudioCore.Instance.GetVolumeFactor( AudioMacro.VOLUME_FACTOR.GLOBAL_SFX );
    }

    //----------------------------------------------------------------
    /** 設定全域音量: 音效 */
    public SetGlobalVolumeSFX(volume: number): void {
        Persist.App.SetNumber( StorageKeys.Audio.GLOBAL_SFX_VOLUME, clamp01(volume) );
        AudioCore.Instance.SetVolumeFactor( AudioMacro.VOLUME_FACTOR.GLOBAL_SFX, volume );
    }

    //----------------------------------------------------------------
    /** 取得全域音量: 背景音樂 */
    public GetGlobalVolumeBGM(): number {
        return AudioCore.Instance.GetVolumeFactor( AudioMacro.VOLUME_FACTOR.GLOBAL_BGM );
    }

    //----------------------------------------------------------------
    /** 設定全域音量: 背景音樂 */
    public SetGlobalVolumeBGM(volume: number): void {
        Persist.App.SetNumber( StorageKeys.Audio.GLOBAL_BGM_VOLUME, clamp01(volume) );
        AudioCore.Instance.SetVolumeFactor( AudioMacro.VOLUME_FACTOR.GLOBAL_BGM, volume );
    }

    //----------------------------------------------------------------
    /** 設定音量因子數值 (0 ~ 1) */
    public SetVolumeFactor(factor: AudioMacro.VOLUME_FACTOR, value: number): void {
        AudioCore.Instance.SetVolumeFactor( factor, value );
    }

    //----------------------------------------------------------------
    /** 漸進調整音量因子 (0 ~ 1) */
    public FadeVolumeFactor(factor: AudioMacro.VOLUME_FACTOR, targetValue: number, duration: number, callback?: Function): void {
        AudioCore.Instance.FadeVolumeFactor( factor, targetValue, duration, callback );
    }

    //----------------------------------------------------------------

    //================================================================
    // 音效資源管理
    //================================================================

    //----------------------------------------------------------------
    /**
     * 載入音效資源
     * @param bundleName 要載入的 Bundle 名稱
     * @param profile 音效清單設定檔
     * @param cbOrOption 載入完成的 Callback 或載入選項
     * @returns 
     */
    public LoadAssets(  bundleName  :string,
                        profile     :AudioMacro.AssetsLoadProfile,
                        cbOrOption ?:AudioMacro.LoadedCallback<AudioMacro.AssetsLoadResult> | Readonly<AudioMacro.AssetsLoadOptions>
                        ): void
    {
        // 預設載入選項
        const options: AudioMacro.AssetsLoadOptions = {
            assetRoot       : "",
            defaultType     : AudioMacro.TYPES.SFX_ORDINARY,
            autoRelease     : true,
            gamePausable    : false,
            loadedClipMap   : null,
            loadedCallback  : null,
        };

        // 處理載入選項
        if (typeof cbOrOption === "function") {
            options.loadedCallback  = cbOrOption;
        }
        else if (cbOrOption && typeof cbOrOption === "object") {
            options.assetRoot       = cbOrOption.assetRoot      ?? options.assetRoot;
            options.defaultType     = cbOrOption.defaultType    ?? options.defaultType;
            options.autoRelease     = cbOrOption.autoRelease    ?? options.autoRelease;
            options.gamePausable    = cbOrOption.gamePausable   ?? options.gamePausable;
            options.loadedClipMap   = cbOrOption.loadedClipMap  ?? options.loadedClipMap;
            options.loadedCallback  = cbOrOption.loadedCallback ?? options.loadedCallback;
        }

        // 沒有音效清單設定檔
        if (!profile || typeof profile !== "object" || Object.keys(profile).length <= 0) {
            options.loadedCallback?.(new Error("AudioManager : No assets to load."), null);
            return;
        }

        // 取得載入的 Bundle 名稱與建立空白 Map
        const _bundleName = bundleName ?? BundleDefine.Default.RESOURCES;
        const singleLoadOptionMap: { [assetKey: string]: AudioMacro.SingleLoadOption } = {};

        // 處理音效清單設定檔
        for (const assetKey in profile) {
            const value = profile[ assetKey ];
            let singleOpt: AudioMacro.SingleLoadOption = null;

            // 處理單一音效載入選項
            if (value != null && typeof value === "object") {
                singleOpt = {
                    assetPath       : value.assetPath       ?? assetKey,
                    assetRoot       : value.assetRoot       ?? options.assetRoot,
                    defaultType     : value.defaultType     ?? options.defaultType,
                    autoRelease     : value.autoRelease     ?? options.autoRelease,
                    gamePausable    : value.gamePausable    ?? options.gamePausable,
                    loadedCallback  : value.loadedCallback  ?? null,
                };
            } else {
                singleOpt = {
                    assetPath       : typeof value === "string" && value.length > 0 ? value : assetKey,
                    assetRoot       : options.assetRoot,
                    defaultType     : options.defaultType,
                    autoRelease     : options.autoRelease,
                    gamePausable    : options.gamePausable,
                };
            }

            // 組合音效檔案路徑
            if (singleOpt.assetRoot?.length > 0 && singleOpt.assetPath?.length > 0) {
                singleOpt.assetPath = `${ singleOpt.assetRoot }/${ singleOpt.assetPath }`;
            }

            // 儲存音效載入選項
            singleLoadOptionMap[ assetKey ] = singleOpt;
        }

        // 載入音效 Bundle
        Bundle.Load(_bundleName, (err, bundle) => {
            // 載入 Bundle 失敗
            if (err || !bundle) {
                options.loadedCallback?.(err || new Error("AudioManager : Load bundle failed."), null);
                return;
            }

            // 建立載入音效的結果 Map 與 CallbackBond
            const loadedAssetsMap: AudioMacro.AssetsLoadResult = {};
            const loadedCbBond = new CallbackBond(()=>
            {
                if (typeof options.loadedCallback === "function")
                {
                    let totalCount = 0, successCount = 0, errorAssets: string[] = [];
                    const loadedKeys = Object.keys(loadedAssetsMap ?? {});
                    if (loadedKeys?.length > 0)
                    {
                        for (const eachKey of loadedKeys) {
                            const loadedRes = loadedAssetsMap[ eachKey ];
                            if (!loadedRes) {
                                continue;
                            }

                            totalCount += 1;
                            loadedRes[0] && errorAssets.push(eachKey);
                            loadedRes[1] && (successCount += 1);
                        }
                    }

                    if (!(totalCount > 0)) {
                        options.loadedCallback(new Error("AudioManager : Nothing to be loaded."), loadedAssetsMap);
                    } else if (!(successCount > 0)) {
                        options.loadedCallback(new Error("AudioManager : All assets loaded with errors."), loadedAssetsMap);
                    } else if (errorAssets?.length > 0) {
                        warn(`AudioManager : Some assets loaded with errors. Success: ${ successCount }/${ totalCount }, Error: `, errorAssets);
                        options.loadedCallback(null, loadedAssetsMap);
                    } else {
                        options.loadedCallback(null, loadedAssetsMap);
                    }
                }
            });

            // 逐一載入音效
            for (const assetKey in singleLoadOptionMap) {
                const singleOpt = singleLoadOptionMap[ assetKey ];

                // 音效檔案路徑無效
                if (singleOpt.assetPath?.length <= 0) {
                    const err = new Error("AudioManager : Invalid asset path.");
                    loadedAssetsMap[ assetKey ] = [ err, null ];
                    singleOpt.loadedCallback?.( err, null );
                    continue;
                }

                // 已經載入過的音效
                const loadedClipRes = this.SearchClipRes(singleOpt.assetPath, _bundleName, true);
                if (loadedClipRes) {
                    loadedAssetsMap[ assetKey ] = [ null, loadedClipRes ];
                    singleOpt.loadedCallback?.( null, loadedClipRes );
                    continue;
                }

                // 載入音效
                loadedCbBond.AddMark( assetKey );
                bundle.Load( singleOpt.assetPath, AudioClip, (err: Error, clipAsset: AudioClip) => {
                    // 載入音效失敗
                    if (err || !isValid(clipAsset, true)) {
                        err ??= new Error(`AudioManager : Load audio clip failed. [${ singleOpt.assetPath }]`);
                        loadedAssetsMap[ assetKey ] = [ err, null ];
                        singleOpt.loadedCallback?.( err, null );
                        loadedCbBond.DelMark( assetKey );
                        return;
                    }

                    // 建立音效資源
                    const clipRes: AudioMacro.ClipResource = {
                        bundleName      : _bundleName,
                        assetPath       : singleOpt.assetPath,
                        audioClip       : clipAsset,
                        audioType       : singleOpt.defaultType,
                        autoRelease     : singleOpt.autoRelease,
                        gamePausable    : singleOpt.gamePausable,
                    };

                    // 儲存音效資源
                    if (this.m_clipResPathMap.has( singleOpt.assetPath ) === false) {
                        this.m_clipResPathMap.set( singleOpt.assetPath, [ clipRes ] );
                    } else {
                        this.m_clipResPathMap.get( singleOpt.assetPath ).push( clipRes );
                    }

                    // 存入已載入的音效 Map
                    if (options.loadedClipMap && assetKey in options.loadedClipMap) {
                        options.loadedClipMap[ assetKey ] = clipAsset;
                    }

                    // 避免自動釋放音效資源
                    if (!singleOpt.autoRelease) {
                        clipAsset.addRef();
                    }

                    // 儲存已載入的音效並執行 Callback
                    loadedAssetsMap[ assetKey ] = [ null, clipRes ];
                    singleOpt.loadedCallback?.( null, clipRes );
                    loadedCbBond.DelMark( assetKey );
                });
            }

            loadedCbBond.StartUp();
        });
    }

    //----------------------------------------------------------------
    /**
     * 釋放音效資源
     * @param bundleName 要釋放的 Bundle 名稱
     * @param stopAll 是否停止所有使用中的音效
     */
    public ReleaseAssets(bundleName: string, stopAll: boolean = true)
    {
        // 確定音效資源清單存在
        if (!(this.m_clipResPathMap?.size > 0)) {
            return;
        }

        // 紀錄被釋放的音效資源 UUID
        const removeUuidList: string[] = [];

        // 釋放音效資源
        const keyList = Array.from(this.m_clipResPathMap.keys());
        for (const key of keyList) {
            // 找出指定路徑的音效資源清單
            const clipResList = this.m_clipResPathMap.get( key );
            for (let i = 0; i < clipResList?.length; i++) {
                const clipRes = clipResList[ i ];

                // 找出指定 Bundle 的音效資源並移除
                if (clipRes.bundleName === bundleName) {
                    removeUuidList.push( clipRes.audioClip.uuid );
                    !clipRes.autoRelease && clipRes.audioClip.decRef();
                    clipResList.splice(i--, 1);
                }
            }

            // 移除空的音效資源清單
            if (clipResList.length <= 0) {
                this.m_clipResPathMap.delete( key );
            }
        }

        // 停止所有使用中的音效
        if (stopAll) {
            for (const audioSource of this.m_audioSourceList) {
                if (audioSource.IsInUse && removeUuidList.includes( audioSource.ClipUuid )) {
                    audioSource.Stop( true );
                }
            }
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 音效播放控制
    //================================================================

    //----------------------------------------------------------------
    /**
     * 播放音效
     * @param path 音效路徑
     * @param loop 是否循環播放
     * @param callback 播放完成的 Callback
     * @param volume 音量
     * @param bundleName Bundle 名稱
     */
    public Play(path: string, loop?: boolean, callback?: AudioMacro.CompleteCallback, volume?: number, bundleName?: string): AudioMacro.ID;

    /**
     * 播放音效
     * @param clip 音效
     * @param loop 是否循環播放
     * @param callback 播放完成的 Callback
     * @param volume 音量
     * @param bundleName Bundle 名稱
     */
    public Play(clip: AudioClip, loop?: boolean, callback?: AudioMacro.CompleteCallback, volume?: number): AudioMacro.ID;

    /**
     * 播放音效
     * @param path 音效路徑
     * @param config 播放設定
     */
    public Play(path: string, config?: AudioMacro.PlayingConfig): AudioMacro.ID;

    /**
     * 播放音效
     * @param clip 音效
     * @param config 播放設定
     */
    public Play(clip: AudioClip, config?: AudioMacro.PlayingConfig): AudioMacro.ID;

    // 實作 Overload
    public Play(keyArg: string | AudioClip, arg1?: boolean | AudioMacro.PlayingConfig, arg2?: AudioMacro.CompleteCallback, arg3?: number, arg4?: string): AudioMacro.ID {
        let config: AudioMacro.PlayingConfig = null;

        if (isValid( arg1 ) && typeof arg1 === "object") {
            config = arg1;
        } else {
            config = {
                loop        : typeof arg1 === "boolean"     ? arg1 : false,
                onComplete  : typeof arg2 === "function"    ? arg2 : undefined,
                volume      : typeof arg3 === "number"      ? arg3 : 1.0,
                bundleName  : arg4,
            };
        }

        return this.PlayConfig(keyArg, config);
    }

    // 播放音效實作
    private PlayConfig(keyArg: string | AudioClip, config?: AudioMacro.PlayingConfig): AudioMacro.ID {
        if (!isValid(keyArg, true) || keyArg === '') {
            return AudioMacro.INVALID_ID;
        }

        // 取得音效資源
        let audioClip: AudioClip = null;
        if (keyArg instanceof AudioClip) {
            audioClip = keyArg;
        } else {
            const clipRes = this.SearchClipRes(keyArg, config?.bundleName);
            audioClip = clipRes?.audioClip ?? null;

            if (typeof config?.gamePausable !== "boolean" && typeof clipRes?.gamePausable === "boolean") {
                config = AudioMacro.MergePlayingConfig((config ?? {}), { gamePausable: clipRes.gamePausable });
            }
        }

        if (!isValid(audioClip, true)) {
            return AudioMacro.INVALID_ID;
        }

        // 只能同時播放一個相同的音效，停止其他相同音效，並保留一個且從頭播放
        if (config?.unique) {
            const sourceArr = this.QueryAudioSources(audioClip)?.filter( audioSource => audioSource.IsInUse );
            if (sourceArr?.length > 0) {
                sourceArr.forEach((audioSource, idx) => (idx > 0 && audioSource.Stop()));
                return sourceArr[0].Replay(audioClip, config);
            }
        }

        // 播放音效
        const audioSource = this.GetAudioSource();
        const audioId = audioSource.Play(audioClip, config);

        // 遊戲暫停時，遊戲音效跟隨遊戲暫停
        if (this.m_isGamePauseAll && audioSource.GamePausable) {
            audioSource.Pause();
        }

        // 回傳音效 ID
        return audioId;
    }

    //----------------------------------------------------------------
    /**
     * 停止音效
     * @param audioId 音效 ID
     */
    public Stop(audioId: AudioMacro.ID): void;

    /**
     * 停止音效
     * @param path 音效路徑
     * @param bundleName Bundle 名稱
     */
    public Stop(path: string, bundleName?: string): void;

    /**
     * 停止音效
     * @param clip 音效
     */
    public Stop(clip: AudioClip): void;

    // 實作
    public Stop(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): void {
        this.QueryAudioSources(keyArg, bundleName)?.forEach( audioSource => audioSource.Stop() );
    }

    //----------------------------------------------------------------
    /**
     * 延遲停止音效
     * @param audioId 音效 ID
     * @param delay 延遲時間 (秒)
     * @param callback 停止完成的 Callback 
     */
    public StopLater(audioId: AudioMacro.ID, delay: number, callback?: Function): void;

    /**
     * 延遲停止音效
     * @param path 音效路徑
     * @param delay 延遲時間 (秒)
     * @param callback 停止完成的 Callback
     * @param bundleName Bundle 名稱
     */
    public StopLater(path: string, delay: number, callback?: Function, bundleName?: string): void;

    /**
     * 延遲停止音效
     * @param clip 音效
     * @param delay 延遲時間 (秒)
     * @param callback 停止完成的 Callback
     */
    public StopLater(clip: AudioClip, delay: number, callback?: Function): void;

    // 實作
    public StopLater(keyArg: AudioMacro.ID | string | AudioClip, delay: number, callback?: Function, bundleName?: string): void {
        const bond = typeof callback === "function" ? new CallbackBond( callback ) : null;

        this.QueryAudioSources(keyArg, bundleName)?.forEach( audioSource => {
            const mark = `id_${ audioSource.AudioId }`;
            bond?.AddMark(mark);
            audioSource.SetVolumeScale(0.0, delay, () => {
                audioSource.Stop();
                bond?.DelMark(mark);
            });
        });

        bond?.StartUp();
    }

    //----------------------------------------------------------------
    /**
     * 停止所有音效
     */
    public StopAll(): void {
        this.m_audioSourceList.forEach( audioSource => {
            if (audioSource.IsInUse) {
                audioSource.Stop();
            }
        } );
    }

    //----------------------------------------------------------------
    /**
     * 暫停音效
     * @param audioId 音效 ID
     */
    public Pause(audioId: AudioMacro.ID): void;

    /**
     * 暫停音效
     * @param path 音效路徑
     * @param bundleName Bundle 名稱
     */
    public Pause(path: string, bundleName?: string): void;

    /**
     * 暫停音效
     * @param clip 音效
     */
    public Pause(clip: AudioClip): void;

    // 實作
    public Pause(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): void {
        this.QueryAudioSources(keyArg, bundleName)?.forEach( audioSource =>
        {
            audioSource.Pause();
            this.m_selfPausedAudios.add( audioSource.AudioId );
        });
    }

    //----------------------------------------------------------------
    /**
     * 恢復音效
     * @param audioId 音效 ID
     */
    public Resume(audioId: AudioMacro.ID): void;

    /**
     * 恢復音效
     * @param path 音效路徑
     * @param bundleName Bundle 名稱
     */
    public Resume(path: string, bundleName?: string): void;

    /**
     * 恢復音效
     * @param clip 音效
     */
    public Resume(clip: AudioClip): void;

    // 實作
    public Resume(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): void {
        this.QueryAudioSources(keyArg, bundleName)?.forEach( audioSource =>
        {
            audioSource.Resume();
            this.m_selfPausedAudios.delete( audioSource.AudioId );
        });
    }

    //----------------------------------------------------------------
    /**
     * 暫停所有遊戲音效
     */
    public GamePauseAll(): void
    {
        this.m_isGamePauseAll = true;
        this.m_audioSourceList.forEach( audioSource => {
            if (audioSource.IsInUse && audioSource.GamePausable && !this.m_selfPausedAudios.has( audioSource.AudioId )) {
                audioSource.Pause();
            }
        });
    }

    //----------------------------------------------------------------
    /**
     * 恢復所有遊戲音效
     */
    public GameResumeAll(): void
    {
        this.m_isGamePauseAll = false;
        this.m_audioSourceList.forEach( audioSource => {
            if (audioSource.IsInUse && audioSource.GamePausable && !this.m_selfPausedAudios.has( audioSource.AudioId )) {
                audioSource.Resume();
            }
        });
    }

    //----------------------------------------------------------------
    /** 取得音量 */
    public GetVolume(audioId: AudioMacro.ID): number;
    public GetVolume(path: string, bundleName?: string): number;
    public GetVolume(clip: AudioClip): number;
    public GetVolume(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): number {
        return this.SearchAudioSource(keyArg, bundleName)?.VolumeScale ?? AudioMacro.INVALID_VOLUME;
    }

    //----------------------------------------------------------------
    /** 取得目前實際的音量 */
    public GetExactVolume(audioId: AudioMacro.ID): number;
    public GetExactVolume(path: string, bundleName?: string): number;
    public GetExactVolume(clip: AudioClip): number;
    public GetExactVolume(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): number {
        return this.SearchAudioSource(keyArg, bundleName)?.ExactVolume ?? AudioMacro.INVALID_VOLUME;
    }

    //----------------------------------------------------------------
    /** 設定音量 */
    public SetVolume(audioId: AudioMacro.ID, volume: number): void;
    public SetVolume(path: string, volume: number, bundleName?: string): void;
    public SetVolume(clip: AudioClip, volume: number): void;
    public SetVolume(keyArg: AudioMacro.ID | string | AudioClip, volume: number, bundleName?: string): void {
        this.QueryAudioSources(keyArg, bundleName)?.forEach( audioSource => audioSource.VolumeScale = volume );
    }

    //----------------------------------------------------------------
    /** 漸進調整音量 */
    public FadeVolume(audioId: AudioMacro.ID, volume: number, duration: number, callback?: Function): void;
    public FadeVolume(path: string, volume: number, duration: number, callback?: Function, bundleName?: string): void;
    public FadeVolume(clip: AudioClip, volume: number, duration: number, callback?: Function): void;
    public FadeVolume(keyArg: AudioMacro.ID | string | AudioClip, volume: number, duration: number, callback?: Function, bundleName?: string): void {
        const bond = typeof callback === "function" ? new CallbackBond( callback ) : null;

        this.QueryAudioSources(keyArg, bundleName)?.forEach( audioSource => {
            const mark = `id_${ audioSource.AudioId }`;
            bond?.AddMark(mark);
            audioSource.SetVolumeScale(volume, duration, () => bond?.DelMark(mark));
        });

        bond?.StartUp();
    }

    //----------------------------------------------------------------
    /** 取得音效總時間 (秒) */
    public GetDuration(audioId: AudioMacro.ID): number;
    public GetDuration(path: string, bundleName?: string): number;
    public GetDuration(clip: AudioClip): number;
    public GetDuration(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): number {
        if (typeof keyArg === "number") {
            return this.SearchAudioSource(keyArg)?.duration ?? AudioMacro.INVALID_DURATION;
        } else if (typeof keyArg === "string") {
            return this.SearchClipRes(keyArg, bundleName)?.audioClip?.getDuration() ?? AudioMacro.INVALID_DURATION;
        } else if (keyArg instanceof AudioClip) {
            return keyArg.getDuration();
        } else {
            return AudioMacro.INVALID_DURATION;
        }
    }

    //----------------------------------------------------------------
    /** 取得音效剩餘時間 (秒) */
    public GetLeftTime(audioId: AudioMacro.ID): number;
    public GetLeftTime(path: string, bundleName?: string): number;
    public GetLeftTime(clip: AudioClip): number;
    public GetLeftTime(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): number {
        return this.SearchAudioSource(keyArg, bundleName)?.LeftTime ?? AudioMacro.INVALID_CURRENT_TIME;
    }

    //----------------------------------------------------------------
    /** 取得音效當前時間軸 (秒) */
    public GetCurrentTime(audioId: AudioMacro.ID): number;
    public GetCurrentTime(path: string, bundleName?: string): number;
    public GetCurrentTime(clip: AudioClip): number;
    public GetCurrentTime(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): number {
        return this.SearchAudioSource(keyArg, bundleName)?.currentTime ?? AudioMacro.INVALID_CURRENT_TIME;
    }

    //----------------------------------------------------------------
    /** 設定音效當前時間軸 (秒) */
    public SetCurrentTime(audioId: AudioMacro.ID, time: number): void;
    public SetCurrentTime(path: string, time: number, bundleName?: string): void;
    public SetCurrentTime(clip: AudioClip, time: number): void;
    public SetCurrentTime(keyArg: AudioMacro.ID | string | AudioClip, time: number, bundleName?: string): void {
        this.QueryAudioSources(keyArg, bundleName)?.forEach( audioSource => {
            if (time >= audioSource.duration) {
                audioSource.Stop();
            } else {
                audioSource.currentTime = time > 0 ? time : 0;
            }
        });
    }

    //----------------------------------------------------------------

    //================================================================
    // 場景 BGM 控制
    //================================================================

    //----------------------------------------------------------------
    /**
     * 播放場景 BGM
     * @param path 要播放的 BGM 路徑
     * @param volume 音量
     * @param gamePausable 是否隨遊戲暫停
     * @param bundleName Bundle 名稱
     */
    public PlaySceneBGM(path: string, volume?: number, gamePausable?: boolean, bundleName?: string): AudioMacro.ID;

    /**
     * 播放場景 BGM
     * @param clip 要播放的 BGM 音效
     * @param volume 音量
     * @param gamePausable 是否隨遊戲暫停
     * @param bundleName Bundle 名稱
     */
    public PlaySceneBGM(clip: AudioClip, volume?: number, gamePausable?: boolean): AudioMacro.ID;

    /**
     * 播放場景 BGM
     * @param path 要播放的 BGM 路徑
     * @param config 播放設定
     */
    public PlaySceneBGM(path: string, config?: AudioMacro.PlayingConfig): AudioMacro.ID;

    /**
     * 播放場景 BGM
     * @param clip 要播放的 BGM 音效
     * @param config 播放設定
     */
    public PlaySceneBGM(clip: AudioClip, config?: AudioMacro.PlayingConfig): AudioMacro.ID;

    // 實作
    public PlaySceneBGM(keyArg: string | AudioClip, arg1?: number | AudioMacro.PlayingConfig, gamePausable?: boolean, bundleName?: string): AudioMacro.ID {
        let audioClip: AudioClip = null;

        if (keyArg instanceof AudioClip) {
            audioClip = keyArg;
        } else {
            const clipRes = this.SearchClipRes(keyArg, bundleName);
            audioClip = clipRes?.audioClip ?? null;
        }

        if (!isValid(audioClip, true)) {
            return AudioMacro.INVALID_ID;
        }

        // 停止所有覆蓋的 BGM
        if (this.m_coverBgmStack.length > 0) {
            this.m_coverBgmStack.forEach( bgm => this.Stop( bgm.audioId ) );
            this.m_coverBgmStack = [];
        }

        // 若已經播放過相同的 BGM，則繼續播放
        if (this.m_sceneBgmInfo?.clip?.uuid === audioClip?.uuid) {
            this.Resume( this.m_sceneBgmInfo.audioId );
            return this.m_sceneBgmInfo.audioId;
        }

        // 停止舊的 BGM
        this.StopSceneBGM();

        // 處理播放設定
        let config: AudioMacro.PlayingConfig = null;

        if (isValid( arg1 ) && typeof arg1 === "object") {
            config = AudioMacro.MergePlayingConfig({
                type            : AudioMacro.TYPES.BGM,
                loop            : true,
                volumeFactors   : [ AudioMacro.VOLUME_FACTOR.WEAKEN_BGM ],
            }, arg1);
        } else {
            config = {
                bundleName      : bundleName,
                type            : AudioMacro.TYPES.BGM,
                loop            : true,
                volume          : typeof arg1 === "number" ? arg1 : 1.0,
                gamePausable    : gamePausable ?? false,
                volumeFactors   : [ AudioMacro.VOLUME_FACTOR.WEAKEN_BGM ],
            };
        }

        // 播放新的 BGM、儲存 BGM 資訊並返回音效 ID
        const audioId = this.PlayConfig( keyArg, config );
        this.m_sceneBgmInfo = { clip: audioClip, audioId };
        this.m_bgmAudioIdSet.add( audioId );
        return audioId;
    }

    //----------------------------------------------------------------
    /** 停止場景 BGM */
    public StopSceneBGM(): AudioMacro.ID {
        if (this.m_sceneBgmInfo) {
            const audioId = this.m_sceneBgmInfo.audioId;
            this.m_sceneBgmInfo = null;
            this.Stop( audioId );
            return audioId;
        }

        return AudioMacro.INVALID_ID;
    }

    //----------------------------------------------------------------
    /** 暫停場景 BGM */
    public PauseSceneBGM(): AudioMacro.ID {
        if (this.m_sceneBgmInfo) {
            this.Pause( this.m_sceneBgmInfo.audioId );
            return this.m_sceneBgmInfo.audioId;
        }

        return AudioMacro.INVALID_ID;
    }

    //----------------------------------------------------------------
    /** 恢復場景 BGM */
    public ResumeSceneBGM(): AudioMacro.ID {
        if (this.m_sceneBgmInfo) {
            this.Resume( this.m_sceneBgmInfo.audioId );
            return this.m_sceneBgmInfo.audioId;
        }

        return AudioMacro.INVALID_ID;
    }

    //----------------------------------------------------------------

    //================================================================
    // 覆蓋 BGM 控制
    //================================================================

    //----------------------------------------------------------------
    /**
     * 播放覆蓋 BGM
     * @param path 要播放的 BGM 路徑
     * @param volume 音量
     * @param gamePausable 是否隨遊戲暫停
     * @param bundleName Bundle 名稱
     */
    public PlayCoverBGM(path: string, volume?: number, gamePausable?: boolean, bundleName?: string): AudioMacro.ID;

    /**
     * 播放覆蓋 BGM
     * @param clip 要播放的 BGM 音效
     * @param volume 音量
     * @param gamePausable 是否隨遊戲暫停
     * @param bundleName Bundle 名稱
     */
    public PlayCoverBGM(clip: AudioClip, volume?: number, gamePausable?: boolean): AudioMacro.ID;

    /**
     * 播放覆蓋 BGM
     * @param path 要播放的 BGM 路徑
     * @param config 播放設定
     */
    public PlayCoverBGM(path: string, config?: AudioMacro.PlayingConfig): AudioMacro.ID;

    /**
     * 播放覆蓋 BGM
     * @param clip 要播放的 BGM 音效
     * @param config 播放設定
     */
    public PlayCoverBGM(clip: AudioClip, config?: AudioMacro.PlayingConfig): AudioMacro.ID;

    // 實作
    public PlayCoverBGM(keyArg: string | AudioClip, arg1?: number | AudioMacro.PlayingConfig, gamePausable?: boolean, bundleName?: string): AudioMacro.ID {
        let audioClip: AudioClip = null;

        if (keyArg instanceof AudioClip) {
            audioClip = keyArg;
        } else {
            const clipRes = this.SearchClipRes(keyArg, bundleName);
            audioClip = clipRes?.audioClip ?? null;
        }

        if (!isValid(audioClip, true)) {
            return AudioMacro.INVALID_ID;
        }

        // 暫停所有正在播放的 BGM
        this.m_coverBgmStack.forEach( bgm => this.Pause( bgm.audioId ) );
        this.m_sceneBgmInfo && this.Pause( this.m_sceneBgmInfo.audioId );

        // 處理播放設定
        let config: AudioMacro.PlayingConfig = null;

        if (isValid( arg1 ) && typeof arg1 === "object") {
            config = AudioMacro.MergePlayingConfig({
                type            : AudioMacro.TYPES.BGM,
                loop            : true,
                volumeFactors   : [ AudioMacro.VOLUME_FACTOR.WEAKEN_BGM ],
            }, arg1);
        } else {
            config = {
                bundleName      : bundleName,
                type            : AudioMacro.TYPES.BGM,
                loop            : true,
                volume          : typeof arg1 === "number" ? arg1 : 1.0,
                gamePausable    : gamePausable ?? false,
                volumeFactors   : [ AudioMacro.VOLUME_FACTOR.WEAKEN_BGM ],
            };
        }

        // 播放新的 BGM、儲存 BGM 資訊並返回音效 ID
        const audioId = this.PlayConfig( keyArg, config );
        this.m_coverBgmStack.push({ clip: audioClip, audioId });
        this.m_bgmAudioIdSet.add( audioId );
        return audioId;
    }

    //----------------------------------------------------------------
    /**
     * 停止覆蓋 BGM
     * @param resume 是否恢復前一個 BGM
     * @returns 停止的 BGM ID
     */
    public StopCoverBGM(resume: boolean = true): AudioMacro.ID {
        if (this.m_coverBgmStack.length > 0) {
            const currBgm = this.m_coverBgmStack.pop();
            this.Stop( currBgm.audioId );

            if (resume) {
                if (this.m_coverBgmStack.length > 0) {
                    const lastBgm = this.m_coverBgmStack[ this.m_coverBgmStack.length - 1 ];
                    this.Resume( lastBgm.audioId );
                } else if (this.m_sceneBgmInfo) {
                    this.Resume( this.m_sceneBgmInfo.audioId );
                }
            }

            return currBgm.audioId;
        }

        return AudioMacro.INVALID_ID;
    }

    //----------------------------------------------------------------
    /** 暫停覆蓋 BGM */
    public PauseCoverBGM(): AudioMacro.ID {
        if (this.m_coverBgmStack.length > 0) {
            const bgm = this.m_coverBgmStack[ this.m_coverBgmStack.length - 1 ];
            this.Pause( bgm.audioId );
            return bgm.audioId;
        }

        return AudioMacro.INVALID_ID;
    }

    //----------------------------------------------------------------
    /** 恢復覆蓋 BGM */
    public ResumeCoverBGM(): AudioMacro.ID {
        if (this.m_coverBgmStack.length > 0) {
            const bgm = this.m_coverBgmStack[ this.m_coverBgmStack.length - 1 ];
            this.Resume( bgm.audioId );
            return bgm.audioId;
        }

        return AudioMacro.INVALID_ID;
    }

    //----------------------------------------------------------------

    //================================================================
    // 音效播放元件管理
    //================================================================

    //----------------------------------------------------------------
    /** 取得音效播放元件 */
    private GetAudioSource(): AudioSourceExt {
        let usableAudioSource: AudioSourceExt = null;

        if (this.m_audioSourceList.length > 0) {
            for (let i = 0; i < this.m_audioSourceList.length; i++) {
                const audioSource = this.m_audioSourceList[ i ];

                if (!isValid(audioSource, true)) {
                    this.m_audioSourceList.splice(i--, 1);
                    continue;
                }

                if (audioSource.IsReusable) {
                    audioSource.Stop();
                    usableAudioSource = audioSource;
                    break;
                }
            }
        }

        if (!isValid(usableAudioSource, true)) {
            const node = new Node();
            node.parent = this.node;
            node.name = `audio_source.id_${ this.m_audioSourceList.length }`;

            usableAudioSource = NodeUtils.InstallComponent(node, AudioSourceExt);
            usableAudioSource.playOnAwake = false;
            usableAudioSource.Tracker = this.m_trackerAdapter;
            this.m_audioSourceList.push( usableAudioSource );
        }

        return usableAudioSource;
    }

    //----------------------------------------------------------------
    /** 搜尋音效播放元件 */
    private SearchAudioSource(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): AudioSourceExt {
        if (keyArg instanceof AudioClip) {
            const uuid = keyArg.uuid ?? '';
            return this.m_audioSourceList.find( audioSource => audioSource.ClipUuid === uuid );
        }
        else if (typeof keyArg === "number") {
            return this.m_audioSourceList.find( audioSource => audioSource.AudioId === keyArg );
        }
        else if (typeof keyArg === "string") {
            const uuidList = this.QueryClipRes(keyArg, bundleName).map( clipRes => clipRes.audioClip.uuid );
            return this.m_audioSourceList.find( audioSource => uuidList.includes( audioSource.ClipUuid ) );
        }
        else {
            return null;
        }
    }

    //----------------------------------------------------------------
    /** 查詢音效播放元件 */
    private QueryAudioSources(keyArg: AudioMacro.ID | string | AudioClip, bundleName?: string): AudioSourceExt[] {
        if (keyArg instanceof AudioClip) {
            const uuid = keyArg.uuid ?? '';
            return this.m_audioSourceList.filter( audioSource => audioSource.ClipUuid === uuid );
        }
        else if (typeof keyArg === "number") {
            const src = this.m_audioSourceList.find( audioSource => audioSource.AudioId === keyArg );
            return src ? [ src ] : [];
        }
        else if (typeof keyArg === "string") {
            const uuidList = this.QueryClipRes(keyArg, bundleName).map( clipRes => clipRes.audioClip.uuid );
            return this.m_audioSourceList.filter( audioSource => uuidList.includes( audioSource.ClipUuid ) );
        }
        else {
            return [];
        }
    }

    //----------------------------------------------------------------
    /** 音效播放開始 */
    private OnAudioSourcePlayStart(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void {
        audioSource.Focused && this.SetWeakenBgmToken( audioId, true );
    }

    //----------------------------------------------------------------
    /** 音效重複播放 */
    private OnAudioSourceRepeat(audioSource: AudioSourceExt, audioId: AudioMacro.ID, leftTimes: number): void {}

    //----------------------------------------------------------------
    /** 音效播放完畢 */
    private OnAudioSourceComplete(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void {
        // 移除 BGM 資訊
        if (this.m_bgmAudioIdSet.has( audioId )) {
            this.m_bgmAudioIdSet.delete( audioId );

            // 移除覆蓋的 BGM
            for (let i = 0; i < this.m_coverBgmStack.length; i++) {
                if (this.m_coverBgmStack[ i ]?.audioId === audioId) {
                    this.m_coverBgmStack.splice(i--, 1);
                }
            }

            // 移除場景 BGM
            if (this.m_sceneBgmInfo?.audioId === audioId) {
                this.m_sceneBgmInfo = null;
            }
        }

        // 移除暫停標記
        if (this.m_selfPausedAudios.has( audioId )) {
            this.m_selfPausedAudios.delete( audioId );
        }

        // 停用弱化 BGM 音量
        this.SetWeakenBgmToken( audioId, false );
    }

    //----------------------------------------------------------------
    /** 音效暫停 */
    private OnAudioSourcePause(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void {
        this.SetWeakenBgmToken( audioId, false );
    }

    //----------------------------------------------------------------
    /** 音效恢復 */
    private OnAudioSourceResume(audioSource: AudioSourceExt, audioId: AudioMacro.ID): void {
        audioSource.Focused && this.SetWeakenBgmToken( audioId, true );
    }

    //----------------------------------------------------------------
    /** 音效音量變更 */
    private OnAudioSourceVolumeChanged(audioSource: AudioSourceExt, audioId: AudioMacro.ID, volume: number): void {
        // DO NOTHING
    }

    //----------------------------------------------------------------
    /** 設定弱化 BGM 音量標記 */
    private SetWeakenBgmToken(audioId: AudioMacro.ID, enable: boolean) {
        const wasWeaken = this.m_weakenBgmTokens.size > 0;
        if (enable) {
            this.m_weakenBgmTokens.add( audioId );
        } else {
            this.m_weakenBgmTokens.delete( audioId );
        }
        const isWeaken = this.m_weakenBgmTokens.size > 0;

        if (isWeaken && !wasWeaken) {
            AudioCore.Instance.FadeVolumeFactor( AudioMacro.VOLUME_FACTOR.WEAKEN_BGM, AudioMacro.WEAK_BGM_ENABLE_VOLUME, AudioMacro.WEAK_BGM_ENABLE_TIME );
        } else if (!isWeaken && wasWeaken) {
            AudioCore.Instance.FadeVolumeFactor( AudioMacro.VOLUME_FACTOR.WEAKEN_BGM, AudioMacro.WEAK_BGM_DISABLE_VOLUME, AudioMacro.WEAK_BGM_DISABLE_TIME );
        }
    }

    //================================================================
    // 音效資源管理 - 搜尋與查詢
    //================================================================

    //----------------------------------------------------------------
    /** 搜尋音效資源 */
    private SearchClipRes(assetPath: string, bundleName?: string, strict: boolean = false): AudioMacro.ClipResource {
        const resList = this.m_clipResPathMap.get( assetPath );

        if (!Array.isArray(resList) || resList.length <= 0) {
            return null;
        }

        if (bundleName?.length > 0) {
            return resList.find( clipRes => clipRes.bundleName === bundleName ) ?? (strict ? null : resList[ 0 ]);
        }

        return resList[ 0 ];
    }

    //----------------------------------------------------------------
    /** 查詢音效資源 */
    private QueryClipRes(assetPath: string, bundleName?: string): AudioMacro.ClipResource[] {
        const resList = this.m_clipResPathMap.get( assetPath );

        if (!Array.isArray(resList) || resList.length <= 0) {
            return [];
        }

        if (bundleName?.length > 0) {
            return resList.filter( clipRes => clipRes.bundleName === bundleName );
        }

        return resList;
    }

    //----------------------------------------------------------------

}
