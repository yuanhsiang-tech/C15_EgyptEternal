import { Tween } from "cc";
import { EventDispatcher as Dispatcher } from "../../../Stark/Utility/EventDispatcher";
import { NumberUtils } from "../../../Stark/FuncUtils/NumberUtils";
import { AudioMacro } from "./AudioMacro";

export default class AudioCore {

    //----------------------------------------------------------------

    private static s_instance: AudioCore = null;
    public static get Instance(): AudioCore {
        return AudioCore.s_instance || (AudioCore.s_instance = new AudioCore());
    }

    //----------------------------------------------------------------

    private m_audioIdCounter    :number = 0;
    private m_occupiedAudioIds  :Set<number> = null;
    private m_volumeFactorMap   :Map<string, number> = null;
    private m_volFactorTweens   :Map<string, Tween<any>> = null;
    private m_volFactorEvents   :Dispatcher = null;

    //----------------------------------------------------------------

    private constructor() {
        this.m_audioIdCounter   = 0;
        this.m_occupiedAudioIds = new Set<number>();
        this.m_volumeFactorMap  = new Map<string, number>();
        this.m_volFactorTweens  = new Map<string, Tween<any>>();
        this.m_volFactorEvents  = new Dispatcher();
    }

    //----------------------------------------------------------------
    /** 註冊事件 */
    public On(event: string, callback: Function, target?: any): void {
        this.m_volFactorEvents.On(event, callback, target);
    }

    /** 註銷事件 */
    public Off(event: string, callback: Function, target?: any): void {
        this.m_volFactorEvents.Off(event, callback, target);
    }

    /** 發送事件 */
    private Dispatch(event: string, ...args: any[]): void {
        this.m_volFactorEvents.Dispatch(event, ...args);
    }

    //----------------------------------------------------------------
    /** 預約使用音效 ID */
    public ReserveAudioId(): number {
        while (this.m_occupiedAudioIds.has(this.m_audioIdCounter)) {
            this.m_audioIdCounter += 1;
            if (this.m_audioIdCounter > AudioMacro.MAXIMUM_ID) {
                this.m_audioIdCounter = 0;
            }
        }

        const audioId = this.m_audioIdCounter++;
        this.m_occupiedAudioIds.add(audioId);
        return audioId;
    }

    //----------------------------------------------------------------
    /** 釋放音效 ID */
    public ReleaseAudioId(audioId: number): void {
        this.m_occupiedAudioIds.delete(audioId);
    }

    //----------------------------------------------------------------
    /** 設定音量因子 */
    public SetVolumeFactor(factor: AudioMacro.VOLUME_FACTOR, value: number): void {
        this.FadeVolumeFactor(factor, value, 0);
    }

    //----------------------------------------------------------------
    /** 漸進調整音量因子 */
    public FadeVolumeFactor(factor: AudioMacro.VOLUME_FACTOR, targetValue: number, duration: number, callback?: Function): void {
        this.m_volFactorTweens.get(factor)?.stop();
        this.m_volFactorTweens.delete(factor);

        const _originValue = this.GetVolumeFactor(factor);
        const _targetValue = NumberUtils.Clamp01(targetValue);

        if (duration > 0 && _originValue !== _targetValue) {
            this.m_volFactorTweens.set( factor,
                new Tween(this)
                    .to(duration, {}, {
                        onUpdate: (target: this, ratio) => {
                            const currValue = NumberUtils.Lerp(_originValue, _targetValue, ratio);
                            this._setVolumeFactor(factor, currValue);
                        },
                    })
                    .call(() => {
                        this._setVolumeFactor(factor, _targetValue);
                        this.m_volFactorTweens.delete(factor);
                        callback?.();
                    })
                    .start()
            );
        } else {
            this._setVolumeFactor(factor, _targetValue);
            callback?.();
        }
    }

    //----------------------------------------------------------------
    // 實作: 設定音量因子
    private _setVolumeFactor(factor: AudioMacro.VOLUME_FACTOR, value: number): void {
        const _value = NumberUtils.Clamp01(value);
        this.m_volumeFactorMap.set(factor, _value);
        this.Dispatch( AudioMacro.EVENTS.VOLUME_FACTOR_CHANGED, factor, _value );
    }

    //----------------------------------------------------------------
    /** 取得音量因子 */
    public GetVolumeFactor(factor: string): number {
        return this.m_volumeFactorMap.get(factor) ?? 1;
    }

    //----------------------------------------------------------------
    /** 取得音量因子的乘積 */
    public GetVolumeFactorProduct(...factorKeyList: AudioMacro.VOLUME_FACTOR[]): number {
        let product = 1;

        for (const factorKey of factorKeyList) {
            const factor = this.GetVolumeFactor(factorKey);
            if (factor <= 0) {
                return 0;
            } else {
                product *= factor;
            }
        }

        return product;
    }

    //----------------------------------------------------------------

}
