import { AudioClip } from "cc";

export namespace AudioMacro
{
    // ID 相關
    export type ID                          = number;
    export const INVALID_ID                 = -1;
    export const MAXIMUM_ID                 = 65535;

    // 狀態與屬性
    export const INVALID_VOLUME             = -1;
    export const INVALID_DURATION           = -1;
    export const INVALID_CURRENT_TIME       = -1;

    // 弱化 BGM 相關
    export const WEAK_BGM_ENABLE_VOLUME     = 0.42; // 0 ~ 1
    export const WEAK_BGM_DISABLE_VOLUME    = 1.0;  // 0 ~ 1
    export const WEAK_BGM_ENABLE_TIME       = 0;    // Second
    export const WEAK_BGM_DISABLE_TIME      = 0.4;  // Second

    /** 音效類型 */
    export enum TYPES
    {
        NONE,
        BGM,
        SFX_ORDINARY,
        SFX_ONE_SHOT,
    }

    /** 音量因子 */
    export enum VOLUME_FACTOR
    {
        NONE            = "none",
        GLOBAL_SFX      = "global_sfx",
        GLOBAL_BGM      = "global_bgm",
        WEAKEN_BGM      = "weaken_bgm",
        SLOT_SCENE_BGM  = "slot_scene_bgm",
        SLOT_COVER_BGM  = "slot_cover_bgm",
    }

    /** 音樂音效內部事件 */
    export namespace EVENTS
    {
        export const VOLUME_FACTOR_CHANGED  = "audio_global.volume_factor_changed";
    }
}


export namespace AudioMacro
{
    interface IPlayingConfig
    {
        bundleName      : string;
        gamePausable    : boolean;
        focused         : boolean;
        unique          : boolean;
        type            : AudioMacro.TYPES;
        loop            : boolean;
        volume          : number;
        repeat          : number;
        onRepeat        : AudioMacro.RepeatCallback;
        onComplete      : AudioMacro.CompleteCallback;
        volumeFactors   : AudioMacro.VOLUME_FACTOR[];
    }

    /** 重複播放回調 */
    export type RepeatCallback      = (audioId: AudioMacro.ID, leftTimes: number) => void;

    /** 播放完成回調 */
    export type CompleteCallback    = (audioId: AudioMacro.ID) => void;

    /** 播放設定 */
    export type PlayingConfig       = Readonly<Partial<IPlayingConfig>>;

    /**
     * 合併播放設定
     */
    export function MergePlayingConfig(firstConfig: AudioMacro.PlayingConfig, secondConfig: AudioMacro.PlayingConfig): AudioMacro.PlayingConfig {
        const volFactorArr = (firstConfig.volumeFactors ?? []).concat(secondConfig.volumeFactors ?? []);
        const volFactorSet = new Set<AudioMacro.VOLUME_FACTOR>( volFactorArr );

        return {
            bundleName      : firstConfig.bundleName    ?? secondConfig.bundleName,
            gamePausable    : firstConfig.gamePausable  ?? secondConfig.gamePausable,
            focused         : firstConfig.focused       ?? secondConfig.focused,
            unique          : firstConfig.unique        ?? secondConfig.unique,
            type            : firstConfig.type          ?? secondConfig.type,
            loop            : firstConfig.loop          ?? secondConfig.loop,
            volume          : firstConfig.volume        ?? secondConfig.volume,
            repeat          : firstConfig.repeat        ?? secondConfig.repeat,
            onRepeat        : firstConfig.onRepeat      ?? secondConfig.onRepeat,
            onComplete      : firstConfig.onComplete    ?? secondConfig.onComplete,
            volumeFactors   : volFactorSet.size > 0 ? Array.from( volFactorSet ) : undefined,
        };
    }
}


export namespace AudioMacro
{
    interface IClipResource {
        bundleName      : string;
        assetPath       : string;
        audioClip       : AudioClip;
        audioType       : AudioMacro.TYPES;
        autoRelease     : boolean;
        gamePausable    : boolean;
    }

    /** 音效資源 */
    export type ClipResource = Readonly<IClipResource>;

    /** 資源載入回調 */
    export type LoadedCallback<T> = (err: Error, loadedRes: T) => void;

    /** 單一資源載入選項 */
    export interface SingleLoadOption {
        assetPath       : string;
        assetRoot      ?: string;
        defaultType    ?: AudioMacro.TYPES;
        autoRelease    ?: boolean;
        gamePausable   ?: boolean;
        loadedCallback ?: AudioMacro.LoadedCallback< AudioMacro.ClipResource >;
    }

    /** 資源集合載入選項 */
    export interface AssetsLoadOptions {
        assetRoot      ?: string;
        defaultType    ?: AudioMacro.TYPES;
        autoRelease    ?: boolean;
        gamePausable   ?: boolean;
        loadedClipMap  ?: { [assetKey: string]: AudioClip };
        loadedCallback ?: AudioMacro.LoadedCallback< AudioMacro.AssetsLoadResult >;
    }

    /** 資源集合載入配置 */
    export type AssetsLoadProfile   = { [assetKey: string]: string | SingleLoadOption };

    /** 資源集合載入結果 */
    export type AssetsLoadResult    = { [assetKey: string]: [Error, AudioMacro.ClipResource] };
}
