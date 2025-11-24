import { _decorator, math, Node, Component, Label, Tween, tween, easing, isValid} from "cc";
import { GameBarWinEffectDefine as WEDef, ReadableWinEffectSettingList } from "./GameBarWinEffectDefine";
import { EventDefine } from "../../../Define/EventDefine";
import Touchable, { TouchableEvent } from "db://assets/Stark/Interactive/Touchable";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import AudioManager from "../../../Audio/Foundation/AudioManager";
import { TweenOpacity } from "db://assets/Stark/TweenFunc/TweenOpacity";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import { AudiosDefine } from "../../../Define/AudiosDefine";

const { ccclass, property } = _decorator;


const EXPAND_START_POS = math.v3(0, 0, 0);
const EXPAND_MID_POS = math.v3(0, 60, 0);
const EXPAND_END_POS = math.v3(0, 90, 0);


/**各獎項有的屬性 */
export class RollingCbAttribute {
    winEffectCb: Function;
    duration: number;
}

class CustomWinAttribute {
    winTween: Tween<any>;
    finalValue: BigNumber;
    updateCb: Function;
    endCb: Function;
    AwardType: WEDef.AwardType;
}



//================================================================================================

export interface GameBarWinViewDelegate
{
    /**
     * 是否使用KMBT V3版本
     * - 000.000K
     */
    IsUsingKMBTv3: boolean;

    /**
     * 發送大獎特效通知
     * @param bet 使用的押注
     * @param win 獲得的贏分
     * @returns BigWinDefine.BigWinType
     */
    SendBigAwardEffectNotify( bet: BigValuable, win: BigValuable ): number;
}



//================================================================================================
/**
 * GameBar 贏分顯示元件
 */
//================================================================================================

@ccclass
export default class GameBarWinView extends Component
{
    //----------------------------------------------------------------

    @property({ type: Touchable, displayName: "點擊元件" })
    protected m_winTouch: Touchable = null;

    @property({ type: Label, displayName: "Win 訊息" })
    protected m_winMessage: Label = null;

    @property({ type: Label, displayName: "Win Label" })
    protected m_winLabel: Label | null = null;
    public get WinLabel(): Label { return this.m_winLabel; }

    @property({ type: Label, displayName: "Expand Label" })
    protected m_expandLabel: Label = null;

    //----------------------------------------------------------------

    private m_finalWin: BigNumber = null;
    private m_normalWinTween: Tween<any> = null;
    private m_expandWinTween: Tween<any> = null;
    private m_winLabelTween: Tween<Node> = null;
    private m_expandLabelTween: Tween<Node> = null;
    private m_winEndCallback: Function = null;

    // 新版跑分用
    private m_customWinTween: Tween<any>[] = [];
    private m_loopSoundId: number = -1;
    private m_endSoundPath: string = "";
    private m_isSkipTouch: boolean = false;

    private m_frenzyWinSoundPath: string = null;
    private m_frenzyWinHumanSoundPath: string = null;
    private m_customWinAttr: CustomWinAttribute = new CustomWinAttribute();
    /**是否有第二階段跑分 */
    private m_hasSecondWinEffect:boolean = false;
    /**啟動第二階段跑分時間 */
    private m_startSecondTime:number = 0;
    /**是否為FrenzyWin */
    private m_isFrenzyWin:boolean = false;

    // WinEffectSetting
    protected m_winEffectSettingGroup: WEDef.WinEffectSettingGroup = WEDef.DefaultWinEffectSettingGroup.Clone();

    //----------------------------------------------------------------

    private m_delegate: Partial<GameBarWinViewDelegate> = null;
    public get Delegate(): Partial<GameBarWinViewDelegate> { return this.m_delegate; }
    public set Delegate(value: Partial<GameBarWinViewDelegate>) {
        this.m_delegate = value;
    }

    //----------------------------------------------------------------

    private m_isDeviationEnable: boolean = false;
    /**
     * @尚未實作
     * 顯示贏分差值
     */
    public get DeviationEnable(): boolean { return this.m_isDeviationEnable; }
    public set DeviationEnable(value: boolean) {
        this.m_isDeviationEnable = value;
    }

    //----------------------------------------------------------------

    private m_winMaxLength: number = 12;

    /** 贏分最大長度 */
    public get WinMaxLength(): number { return this.m_winMaxLength; }
    public set WinMaxLength(value: number) {
        this.m_winMaxLength = value;
        this.DisplayWinValue(this.m_win);
    }

    //----------------------------------------------------------------

    private m_winEffectMaxLength: number = 9;

    /** 贏分特效最大長度 */
    public get WinEffectMaxLength(): number { return this.m_winEffectMaxLength; }
    public set WinEffectMaxLength(value: number) {
        this.m_winEffectMaxLength = value;
    }

    //----------------------------------------------------------------

    private m_win: BigNumber = null;

    /** 總贏分 */
    public get WinValue(): BigNumber { return this.m_win; }
    public set WinValue(win: BigValuable) {
        this.m_win = NumberUtils.ParseBigNumber(win);
        this.DisplayWinValue(this.m_win);
    }
    
    //----------------------------------------------------------------
    
    private m_winValueFormatFn: (value: number | BigNumber) => string = null;

    /** 總贏分格式化函式 */
    public set WinValueFormatFn(fn: (value: number | BigNumber) => string) {
        this.m_winValueFormatFn = fn;
    }
    public get WinValueFormatFn(): (value: number | BigNumber) => string {
        return this.m_winValueFormatFn;
    }

    //----------------------------------------------------------------

    private m_winEffectValueFormatFn: (value: number | BigNumber) => string = null;
    
    /** 贏分特效格式化函式 */
    public set WinEffectValueFormatFn(fn: (value: number | BigNumber) => string) {
        this.m_winEffectValueFormatFn = fn;
    }
    public get WinEffectValueFormatFn(): (value: number | BigNumber) => string {
        return this.m_winEffectValueFormatFn;
    }
    //----------------------------------------------------------------
    /** 顯示贏分 */
    private DisplayWinValue(value: BigNumber)
    {
        const formatFn = this.GetWinValueFormatFn();
        this.m_winLabel.string = formatFn(value);
    }

    //----------------------------------------------------------------
    /** 贏分訊息 */
    public set WinMessage(value: string) {
        this.m_winMessage.string = value ?? "TOTAL WIN";
    }

    //----------------------------------------------------------------

    onLoad() {
        this.m_winTouch.node.active = false;
        this.m_finalWin = new BigNumber(0);
        this.WinValue = 0;
    }

    onDestroy(): void {
    }

    onEnable() {
        this.m_winTouch.On(TouchableEvent.Clicked, this.TryEndWinEffect, this)
    }

    onDisable() {
        this.m_winTouch.Off(TouchableEvent.Clicked, this.TryEndWinEffect, this)
    }

    //----------------------------------------------------------------

    //================================================================
    // 贏分特效
    //================================================================

    //----------------------------------------------------------------
    /**
     * 設定贏分特效
     */
    public ApplyWinEffectSettingList(list: ReadableWinEffectSettingList) {
        if (list?.length > 0) {
            this.m_winEffectSettingGroup.Setting = list;
        } else {
            this.m_winEffectSettingGroup.Setting = WEDef.DefaultWinEffectSettingGroup.Setting;
        }
    }

    //----------------------------------------------------------------
    /**
     * 主要的播放贏分特效接口
     * @param betValue      BET 值
     * @param finalValue    最終贏分值
     * @param callback      結束回調
     * @param effectSetting 特效設定
     * @param rollingCb     跑分中回調，用來更新跑分數值
     */
    public SetWinEffect(betValue:           BigValuable,
                        finalValue:         BigValuable,
                        callback?:          Function,
                        effectSetting?:     WEDef.ReadableWinEffectSetting,
                        winEffectUpdateCb?: RollingCbAttribute[] | Function
                        ): void
    {
        const baseWin = this.m_win;
        const finalWin = NumberUtils.ParseBigNumber(finalValue);
        const deviation = finalWin.minus(baseWin);
        const ratio = deviation.div(betValue).toNumber();
        const fxSetting = (effectSetting) ? effectSetting : this.m_winEffectSettingGroup.SelectByRatio(ratio);

        //直接設定值
        this.SetWinValue(finalWin, fxSetting, callback);

        //三缺一沒有跑分，但先註解留著
        // switch (fxSetting.EffectType) {
        //     case WEDef.WinEffectType.Normal: {
        //         this.SetWinValueWithRunning(finalWin, fxSetting, callback);
        //         break;
        //     }

        //     case WEDef.WinEffectType.Expand: {
        //         this.SetWinValueWithExpandRunning(baseWin, finalWin, fxSetting, callback);
        //         break;
        //     }
        // }
    }

    //----------------------------------------------------------------

    /**
     * 結束贏分特效
     */
    public TryEndWinEffect() {
        this.m_isSkipTouch = true;
        if (isValid(this.m_customWinAttr.winTween)) {
            this.m_customWinAttr.winTween.stop();
            this.m_customWinAttr.updateCb(this.m_customWinAttr.AwardType, this.m_customWinAttr.finalValue, this.m_customWinAttr.finalValue, 1);
            this.m_customWinAttr.endCb?.(this.m_customWinAttr.AwardType);
            

            if (this.m_loopSoundId != -1) {
                if(!this.m_hasSecondWinEffect){
                    AudioManager.Instance.Stop(this.m_loopSoundId);
                }
                else{
                    this.m_hasSecondWinEffect = false;
                    AudioManager.Instance.SetCurrentTime(this.m_loopSoundId, this.m_startSecondTime);
                    if(this.m_isFrenzyWin && this.m_customWinTween.length == 1){
                        AudioManager.Instance.Play(this.m_frenzyWinHumanSoundPath, { focused: true, gamePausable:true });
                    }
                }
            }

            if (this.m_customWinTween.length > 0) {
                this.m_isSkipTouch = false;
                
                this.m_customWinAttr.winTween = this.m_customWinTween.shift();
                this.m_customWinAttr.winTween.start();

                if(isValid(this.m_frenzyWinSoundPath)){
                    this.m_loopSoundId = AudioManager.Instance.Play(this.m_frenzyWinSoundPath, { loop: true, focused: true, gamePausable:true });
                }              
            }
            else {
                this.m_customWinAttr.winTween = null;
                this.WinEffectEnd();             
            }     
        }
        else {
            this.WinEffectEnd();
        }
    }

    //----------------------------------------------------------------
    /**
     * 贏分跳過滾動直接顯示目標值
     * @param remainMs 保留時間(單位:毫秒) 預設為 10 毫秒，設定為 0 時永久保留
     */
    public WinValueSkip(remainMs: number = 10) {
        this.ForceToStopWinValueRunning();

        if (remainMs > 0) {
            tween(this)
                .delay(remainMs * 0.001)
                .call(() => {
                    if (remainMs > 0) {
                        this.WinValue = 0;
                    }
                })
                .start();
        }
    }

    //----------------------------------------------------------------
    /**
     * 重置贏分特效 (會清空贏分值)
     */
    public WinValueReset() {
        this.WinEffectEnd();
        this.WinValue = 0;
    }

    //----------------------------------------------------------------

    //================================================================
    /** 跑分動畫 */
    //================================================================

    //----------------------------------------------------------------

    private SetWinValue(finalValue: BigValuable,
        fxSetting: WEDef.ReadableWinEffectSetting,
        callback?: Function): void {
        const baseWin = NumberUtils.ParseBigNumber(this.m_win);
        const finalWin = NumberUtils.ParseBigNumber(finalValue);
        this.m_finalWin = finalWin;

        if (baseWin.gte(finalWin)) {
            callback?.();
            return;
        }

        this.WinLabelEnd(true);
        this.ExpandLabelEnd(true);
        this.m_winTouch.node.active = true;
        this.m_winEndCallback = callback;

        let sound:string = ""
        sound = fxSetting.LoopSound;

        this.PlayLoopSoundAndSetEndSound(sound, fxSetting.FinalSound)
        this.WinValue = finalWin;
        this.WinEffectEnd();
    }

    private SetWinValueWithRunning(finalValue: BigValuable,
        fxSetting: WEDef.ReadableWinEffectSetting,
        callback?: Function
    ): void {
        const baseWin = NumberUtils.ParseBigNumber(this.m_win);
        const finalWin = NumberUtils.ParseBigNumber(finalValue);
        this.m_finalWin = finalWin;

        if (baseWin.gte(finalWin)) {
            callback?.();
            return;
        }

        this.WinLabelEnd(true);
        this.ExpandLabelEnd(true);
        this.m_winTouch.node.active = true;
        this.m_winEndCallback = callback;

        let sound:string = ""
        sound = fxSetting.LoopSound;

        this.m_normalWinTween = tween(this)
            .call(() => this.PlayLoopSoundAndSetEndSound(sound, fxSetting.FinalSound))
            .to(fxSetting.RollDuration, {}, {
                onUpdate: (target, ratio) => {
                    this.WinValue = NumberUtils.Lerp(baseWin, finalWin, ratio);
                },
            })
            .call(() => this.WinEffectEnd())
            .start();
    }

    //----------------------------------------------------------------

    //================================================================
    /** 擴展跑分 */
    //================================================================

    //----------------------------------------------------------------

    private SetWinValueWithExpandRunning(baseValue: BigValuable,
        finalValue: BigValuable,
        fxSetting: WEDef.ReadableWinEffectSetting,
        callback?: Function
    ): void {
        const baseWin = NumberUtils.ParseBigNumber(baseValue);
        const finalWin = NumberUtils.ParseBigNumber(finalValue);
        this.m_finalWin = finalWin;

        if (baseWin.gte(finalWin)) {
            callback?.();
            return;
        }

        this.WinLabelEnd(true);
        this.ExpandLabelEnd(true);
        this.m_winTouch.node.active = true;
        this.m_expandLabel.node.active = true;

        this.m_winEndCallback = () => {
            this.ExpandLabelEnd();
            callback?.();
        };

        TweenOpacity.Stop(this.m_expandLabel.node);
        NodeUtils.SetOpacity(this.m_expandLabel.node, 0);

        const duration = Math.max(0, fxSetting.RollDuration);
        const expandTime = Math.max(0, duration - 0.6);
        const formatFn = this.GetWinValueFormatFn();

        let sound:string = ""
        sound = fxSetting.LoopSound;

        this.m_expandLabelTween = this.m_expandWinTween = tween(this.m_expandLabel.node)
            .call(() => this.PlayLoopSoundAndSetEndSound(sound, fxSetting.FinalSound))
            .parallel(
                tween().call(() => (this.m_expandLabel.string = formatFn(baseWin)))
                    .to(duration, {}, {
                        onUpdate: (target, ratio) => {
                            const current = NumberUtils.Lerp(baseWin, finalWin, ratio);
                            this.m_expandLabel.string = formatFn(current);
                        },
                    }),

                tween().set({ scale: math.v3(1.0, 1.0, 1), position: EXPAND_START_POS.clone() })
                    .call(() => TweenOpacity.StartToOpacity(this.m_expandLabel.node, 255, 0.5))
                    .to(0.5, { scale: math.v3(1.6, 1.6, 1), position: EXPAND_MID_POS.clone() }, { easing: easing.circOut })
                    .to(expandTime, { scale: math.v3(2.0, 2.0, 1), position: EXPAND_END_POS.clone() })
                    .to(0.1, { scale: math.v3(2.2, 2.2, 1) })
                    .to(0.1, { scale: math.v3(2.0, 2.0, 1) })
                    .delay(0.2)
            )
            .call(() => this.WinEffectEnd())
            .start();
    }

    /** 擴展跑分結束 */
    private ExpandLabelEnd(immediately: boolean = false): void {
        this.m_expandLabelTween?.stop();
        this.m_expandLabelTween = null;

        if (this.m_expandLabel.node.active) {
            const formatFn = this.GetWinValueFormatFn();
            const winString = formatFn(this.m_finalWin);
            this.m_expandLabel.string = winString;
        }

        if (immediately) {
            this.m_expandLabel.node.scale = math.v3(1, 1, 1);
            this.m_expandLabel.node.position = EXPAND_START_POS.clone();
        }
        else {
            this.m_expandLabelTween = tween(this.m_expandLabel.node)
                .call(() => TweenOpacity.StartToOpacity(this.m_expandLabel.node, 120, 0.1))
                .to(0.1, { scale: math.v3(1.0, 1.0, 1), position: EXPAND_START_POS.clone() })
                .set({ active: false })
                .call(() => { this.m_expandLabelTween = null; })
                .start();
        }
    }

    //----------------------------------------------------------------

    //================================================================
    /** 客製化跑分特效 */
    //================================================================

    //----------------------------------------------------------------

    /**
     * 
     * @param baseValue 當前總贏分
     * @param finalValue 最終總贏分
     * @param effectSetting 特效設定
     * @param callback 結束回調
     * @param winEffectUpdateCb 跑分中回調，用來更新跑分數值
     */
    private SetWinValueWithCustomRunning(baseValue: BigValuable,
        finalValue: BigValuable,
        effectSetting?: WEDef.ReadableWinEffectSetting,
        callback?: Function,
        winEffectUpdateCb?: RollingCbAttribute[] | Function,) {
        const baseWin = NumberUtils.ParseBigNumber(baseValue);
        const finalWin = NumberUtils.ParseBigNumber(finalValue);
        const winValue = finalWin.minus(baseWin);
        //容舊
        if (typeof winEffectUpdateCb == "function") {
            this.WinLabelEnd(true);
            this.ExpandLabelEnd(true);

            //最後callback設定
            this.m_winTouch.node.active = true;
            this.m_winEndCallback = callback;

            this.PlayLoopSoundAndSetEndSound(effectSetting.LoopSound, effectSetting.FinalSound);

            this.m_customWinTween[0] = tween(this.node)
                .to(effectSetting.RollDuration, {}, {
                    onUpdate: (target, ratio) => {
                        winEffectUpdateCb?.(effectSetting.AwardType, baseWin, finalWin, ratio);
                    },
                })
                .call(() => this.WinEffectEnd())
                .start()
        }
        else {
            this.WinLabelEnd(true);
            this.ExpandLabelEnd(true);

            //最後callback設定
            this.m_winTouch.node.active = true;
            this.m_winEndCallback = callback;

            //音效相關
            this.m_endSoundPath = effectSetting.FinalSound;
            this.m_frenzyWinSoundPath = effectSetting.FrenzyWinLoopSound;
            this.m_loopSoundId = AudioManager.Instance.Play(effectSetting.LoopSound, { loop: true, focused: true, gamePausable:true });

            let delayTime: number = 0;
            let rollingFinal: BigNumber[] = [];//每段跑分的最終值
            let lastRollingFinal: BigNumber[] = [];//上一段跑分的最終值(=此段跑分的起始值)

            for (let i = 0; i < winEffectUpdateCb.length; i++) {
                let data = winEffectUpdateCb[i];
                let cb = data.winEffectCb;
                let duration = effectSetting.RollDuration;

                //只有一個,代表只是普通滾分
                if (winEffectUpdateCb.length == 1) {
                    duration = effectSetting.RollDuration;
                }
                //兩個以上,表示為FrezyWin,第一段為跑分特效,第二段為FrenzyWin特效
                //第一段duration = 全部 - 其他段加總
                else if (i == 0) {
                    let totalExceptFirst = 0;
                    for (let j = 0; j < winEffectUpdateCb.length; j++) {
                        if (j != 0) {
                            totalExceptFirst = totalExceptFirst + winEffectUpdateCb[j].duration;
                        }
                    }
                    duration = effectSetting.RollDuration - totalExceptFirst;

                    lastRollingFinal[i] = new BigNumber(0);
                }
                else {
                    duration = data.duration;

                    lastRollingFinal[i] = rollingFinal[i - 1];
                }

                //先算好每段跑分的最終值
                let durationRatio = ((delayTime + duration) / effectSetting.RollDuration).toFixed(2);
                rollingFinal[i] = winValue.multipliedBy(durationRatio)
                //開始跑分
                this.m_customWinTween[i] = tween(this.node)
                    .parallel(
                        tween().to(duration, { WinValue: rollingFinal[i] }, {
                            onUpdate(target: Label, ratio) {
                                cb && cb(effectSetting.AwardType, lastRollingFinal[i], rollingFinal[i], ratio);
                            },
                        }),
                        tween()
                            .call(() => {
                                //記起來讓跳過時可以用                   
                                this.m_customWinAttr.finalValue = rollingFinal[i];
                                this.m_customWinAttr.updateCb = cb;
                                this.m_customWinAttr.AwardType = effectSetting.AwardType;
                            })
                    )
                    .call(() => {
                        //檢查跑分Tween陣列是否還有下一個
                        if (this.m_customWinTween.length == 0) {
                            this.WinEffectEnd()
                        }
                        else {
                            this.m_customWinAttr.winTween = this.m_customWinTween.shift();
                            this.m_customWinAttr.winTween.start();
                            AudioManager.Instance.Stop(this.m_loopSoundId);
                            this.m_loopSoundId = AudioManager.Instance.Play(effectSetting.LoopSound, { loop: true, focused: true, gamePausable:true });
                        }
                    })

                delayTime = delayTime + duration;
            }

            //第一次要先手動start
            this.m_customWinAttr.winTween = this.m_customWinTween.shift();
            this.m_customWinAttr.winTween.start();
        }

    }



    //================================================================
    // 結束跑分特效
    //================================================================

    //----------------------------------------------------------------
    /** 結束 WinLabel 特效 */
    private WinLabelEnd(immediately: boolean = false): void {
        this.m_winLabelTween?.stop();
        this.m_winLabelTween = null;

        if (immediately) {
            this.m_winLabel.node.scale = math.v3(1, 1, 1);
        }
        else {
            this.m_winLabelTween = tween(this.m_winLabel.node)
                .to(0.2, { scale: math.v3(1.2, 1.2, 1) })
                .delay(0.2)
                .to(0.1, { scale: math.v3(1.0, 1.0, 1) })
                .call(() => { this.m_winLabelTween = null; })
                .start();
        }
    }

    //----------------------------------------------------------------
    /** 停止跑分特效 */
    private WinEffectEnd(): void {
        this.ForceToStopWinValueRunning();
        this.StopLoopSoundAndPlayEndSound();

        this.m_winTouch.node.active = false;
        this.WinValue = this.m_finalWin;

        if(this.m_isFrenzyWin){
            EventDispatcher.Shared.Dispatch(EventDefine.Game.BIG_WIN_END);
        }
        this.m_winEndCallback?.();
        this.m_winEndCallback = null;

        this.WinLabelEnd();

        this.m_isSkipTouch = false;
    }

    //----------------------------------------------------------------
    /** 強制停止跑分 */
    private ForceToStopWinValueRunning(): void {
        this.m_normalWinTween?.stop();
        this.m_normalWinTween = null;

        this.m_expandWinTween?.stop();
        this.m_expandWinTween = null;

        this.WinLabelEnd(true);

        for (let i = 0; i < this.m_customWinTween.length; i++) {
            this.m_customWinTween[i]?.stop();
            this.m_customWinTween[i] = null;
        }
    }

    //----------------------------------------------------------------
    /** 取得贏分格式化函式 */
    private GetWinValueFormatFn(): (value: number | BigNumber) => string {
        let formatFn: (value: number | BigNumber) => string = null;
        if(this.m_delegate?.IsUsingKMBTv3){
            formatFn = (value: number | BigNumber) => NumberUtils.FormatNumberKMBTv3(value, this.m_winMaxLength);
        }
        else if(this.m_winValueFormatFn){
            formatFn = this.m_winValueFormatFn;
        }
        else {
            formatFn = (value: number | BigNumber) => NumberUtils.Format(value, this.m_winMaxLength);
        }
        return formatFn;
    }

    //----------------------------------------------------------------

    //================================================================
    // 音效
    //================================================================

    //----------------------------------------------------------------
    /** 播放循環跑分音效並設定結束音效 */
    private PlayLoopSoundAndSetEndSound(loopSoundPath: string, endSoundPath: string): void {
        if (this.m_loopSoundId != -1) {
            AudioManager.Instance.Stop(this.m_loopSoundId);
            this.m_loopSoundId = -1;
        }

        if (loopSoundPath?.length > 0) {
            this.m_loopSoundId = AudioManager.Instance.Play(loopSoundPath, { loop: true, focused: true, gamePausable:true });
        }

        if (endSoundPath?.length > 0) {
            this.m_endSoundPath = endSoundPath;
        }
    }

    //----------------------------------------------------------------
    /** 停止循環跑分音效並播放結束音效 */
    private StopLoopSoundAndPlayEndSound(): void {
        if(this.m_loopSoundId != -1){
            AudioManager.Instance.Stop(this.m_loopSoundId);
            this.m_loopSoundId = -1;
        }
        if(this.m_endSoundPath?.length > 0){
            AudioManager.Instance.Play(this.m_endSoundPath, { focused: true, gamePausable:true });
            this.m_endSoundPath = '';
        }
    }

    //----------------------------------------------------------------

}