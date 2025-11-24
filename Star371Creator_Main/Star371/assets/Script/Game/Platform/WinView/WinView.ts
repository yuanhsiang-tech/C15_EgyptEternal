import { _decorator, sp, math, UIOpacity, Toggle, Tween, tween, Component, log, isValid, Animation, Prefab, instantiate, Node, ParticleSystem2D } from 'cc';
import { BigWinDefine } from './BigWinDefine';
import { Device } from '../../../Device/Device';
import FiniteState from 'db://assets/Stark/Utility/FiniteState';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import EpisodeEntityBase from '../../../Feature/Episode/EpisodeEntityBase';
import AudioManager from '../../../Audio/Foundation/AudioManager';
import { NumberUtils } from 'db://assets/Stark/FuncUtils/NumberUtils';
import { RollingNumberLabel } from 'db://assets/Stark/RollingNumber/RollingNumberLabel';
import { ThemeType } from '../../../Proto/gt2/basicTypes/basicTypes_pb';


const { ccclass, property } = _decorator;

enum WinState {
    NONE,
    BIGWIN_LOADING,
    BIGWIN_P1,
    BIGWIN_P2,
    END,
}

class WinData {
    ThemeType:          ThemeType;
    Bet:                BigNumber;
    StartWin:           BigNumber;
    FinalWin:           BigNumber;
    WinType:            BigWinDefine.BigWinType;
    EndCallback:        Function;
    RollingDuration:    number;
    FormatFn:          (value: number|BigNumber) => string = null;    //數字格式化函式
}

//----------------------------------------------------------------
/**
 * @deprecated Use `BigWinDefine.WinEpisodeData` from `../../Script/Game/Platform/WinView/BigWinDefine` instead.
 */
export interface WinEpisodeData extends BigWinDefine.WinEpisodeData {}

//----------------------------------------------------------------

const BarWinPosYOffset = 20
const BarWinGrowScale = 0.5
const BarWinGrowMaxScale = 0.2
const DefaultDuration = 5

@ccclass('WinView')
export class WinView extends EpisodeEntityBase< BigWinDefine.WinEpisodeData >
{
    private m_state: FiniteState = new FiniteState(WinState.NONE);
    private m_winData: WinData = null;
    private m_loopSound: number = null;

    /**BigWin動畫 */
    @property({
        type: [Animation],
        tooltip: "BigWin Animation"
    })
    private m_bigWinAni: Animation[] = [];

    /**BigWin數字滾動Label */
    @property({
        type: RollingNumberLabel,
        tooltip: "BigWin Value Label"
    })
    private m_bigWinLabel: RollingNumberLabel = null;


    /**BigWin數字滾動Label的Animation */
    @property({
        type: Animation,
        tooltip: "BigWin Value Label Animation"
    })
    private m_bigWinLabelAni: Animation = null;


    /**Coin BigWin特效Prefab */
    @property({
        type: [Prefab],
        tooltip: "Coin BigWin Effect Prefab"
    })
    private m_coinBigWinEffectPrefab: Prefab[] = [];

    /**Crystal BigWin特效Prefab */
    @property({
        type: [Prefab],
        tooltip: "Crystal BigWin Effect Prefab"
    })
    private m_crystalBigWinEffectPrefab: Prefab[] = [];

//=================================================================
    private m_bigWinEffectNode: Node[] = [];
    private m_effectLevel: number = 0;







    protected onEnable(): void {
        super.onEnable && super.onEnable();
    }
    protected onDisable(): void {
        super.onDisable && super.onDisable();
    }


    // ----------------------------------------------------------------
    // EpisodeEntityBase Implement

    public ShouldPauseSceneOnLaunch = false;

    public OnEpisodeInitiate(): void {

    }

    public OnEpisodeLaunch(winData?: BigWinDefine.WinEpisodeData): void {
        this.BigWinEffect(
            winData.betValue,
            winData.finalWinValue,
            winData.endCallback,
            winData.rollingDuration,
            winData.formatFn,
            winData.themeType,
        );
    }

    public OnEpisodeTimeout(): boolean {
        return true;
    }

    public OnEpisodeFinish(): void {
        log("[WinView] OnEpisodeFinish");
    }
    // EpisodeEntityBase Implement End
    // ----------------------------------------------------------------

    update(deltaTime: number) {
        const currentState = this.m_state.Tick();
        switch (currentState) {
            case WinState.NONE: {
                if (this.m_state.IsEntering) {

                }
                break;
            }

            case WinState.BIGWIN_LOADING: {
                if (this.m_state.IsEntering) {
                    // 音效從更外層載入，這裡直接進入下一階段
                    this.m_state.Transit(WinState.BIGWIN_P1)
                }
                break;
            }

            case WinState.BIGWIN_P1: {
                if (this.m_state.IsEntering) {
                    //設定
                    this.m_bigWinAni[this.m_winData.WinType].node.active = true;
                    this.m_bigWinLabel.node.active = true;
                    this.m_bigWinLabelAni.node.active = true;

                    //BigWin動畫
                    this.m_bigWinAni[this.m_winData.WinType].play(BigWinDefine.Animation[this.m_winData.WinType]);
                    this.m_bigWinAni[this.m_winData.WinType].on(Animation.EventType.FINISHED, ()=>{
                        this.m_state.Transit(WinState.END);
                    });

                    

                    //BigWin Label動畫
                    this.m_bigWinLabelAni.play(BigWinDefine.LabelAnimation.Start);
                    this.scheduleOnce(()=>{
                        this.m_bigWinLabelAni.play(BigWinDefine.LabelAnimation.End);
                    },4.33) //260禎


                    //BigWin背景光特效
                    this.m_effectLevel = this.CheckEffectLevel(); 
                    if(!isValid(this.m_bigWinEffectNode[this.m_effectLevel])){
                        let prefab = this.m_coinBigWinEffectPrefab;
                        if(this.m_winData.ThemeType == ThemeType.DIAMOND){
                            prefab = this.m_crystalBigWinEffectPrefab;
                        }
                        const effectPrefab = prefab[this.m_effectLevel];
                        this.m_bigWinEffectNode[this.m_effectLevel] = instantiate(effectPrefab);
                        this.m_bigWinEffectNode[this.m_effectLevel].parent = this.node;
                        this.m_bigWinEffectNode[this.m_effectLevel].setPosition(0, 800, 0);
                        this.m_bigWinEffectNode[this.m_effectLevel].setSiblingIndex(-1);
                    }

                    this.m_bigWinEffectNode[this.m_effectLevel].active = true;
                    this.m_bigWinEffectNode[this.m_effectLevel].getComponentsInChildren(ParticleSystem2D).forEach(particle => {
                        particle.resetSystem();
                    });

                    //滾分
                    this.m_bigWinLabel.Formatter = this.m_winData.FormatFn;
                    this.m_bigWinLabel.RollNumber(this.m_winData.StartWin, this.m_winData.FinalWin, true);

                    //TODO直橫版判斷


                    //TODO i幣與鑽石廳館
                    
                    

                    //TODO音效             
                    this.m_loopSound = AudioManager.Instance.Play(BigWinDefine.BigWinEffectDataSetting[this.m_winData.WinType].LoopSound, { gamePausable: false });              
                }
                break
            }

            case WinState.END: {
                if (this.m_state.IsEntering) {
                    if(isValid(this.m_winData.EndCallback)){
                        this.m_winData.EndCallback();
                    }

                    this.ResetAll();

                    this.FinishEpisode();
                }
                break
            }
        }
    }


    /**決定BigWin特效等級*/
    private CheckEffectLevel(): number{
        switch(this.m_winData.WinType){
            case BigWinDefine.BigWinType.BIG:
                return 4;
            case BigWinDefine.BigWinType.MEGA:
                return 5;
            case BigWinDefine.BigWinType.SUPER:
                return 6;
            default:
                return 4;
        }
    }

    /**
     * 全畫面大獎特效
     * @param betValue          押注金額 (total bet)
     * @param startWinValue     起始金額
     * @param finalWinValue     贏得金額
     * @param endCallback       動畫撥完、截圖後會回call 
     * @param isJackpot         是否為JP
     * @param rollingDuration   分數滾動時間(秒)
     * @param loopSoundId       Loop音效ID
     * @param humanSoundPath    人聲音效路徑
     * @param formatFn          數字格式化函式
     * @return                  是否有撥放特效
     */
    public BigWinEffect(
        betValue: BigValuable,
        finalWinValue: BigValuable,
        endCallback: Function = undefined,
        rollingDuration: number,
        formatFn: (value: number|BigNumber) => string = null,
        themeType: ThemeType = ThemeType.NORMAL,
    ): boolean 
    {
        this.m_winData = this.produceWinData(betValue, finalWinValue, endCallback, rollingDuration, formatFn, themeType);
        return this.bigWinEffectHandle();
    }

    private bigWinEffectHandle(): boolean {
        if (this.m_winData.WinType == BigWinDefine.BigWinType.NONE) {
            this.m_state.Transit(WinState.END);
            return false;
        }

        this.m_state.Transit(WinState.BIGWIN_LOADING);
        return true;
    }

    public GetBigWinType(ratio: BigValuable): BigWinDefine.BigWinType {
        for (let type = BigWinDefine.BigWinType.SUPER; type > BigWinDefine.BigWinType.NONE; type--) {
            let bigRatio = NumberUtils.ParseBigNumber(ratio);
            if (bigRatio.gte(BigWinDefine.BigWinEffectDataSetting[type].Ratio)) {
                return type;
            }
        }
        return BigWinDefine.BigWinType.NONE;
    }

    private produceWinData( betValue:           BigValuable,
                            finalWinValue:      BigValuable,
                            endCallback?:       Function,
                            rollingDuration:    number = DefaultDuration,
                            formatFn:          (value: number|BigNumber) => string = null,
                            themeType:        ThemeType = ThemeType.NORMAL,
                            ): WinData 
    {
        const betBN = NumberUtils.ParseBigNumber(betValue);
        const winBN = NumberUtils.ParseBigNumber(finalWinValue);
        let winType = BigWinDefine.CheckBigWinType(winBN.div(betBN));

        const winData           = new WinData();
        winData.Bet             = betBN;
        winData.FinalWin        = winBN;
        winData.WinType         = winType;
        winData.EndCallback     = endCallback;
        winData.FormatFn        = formatFn;
        winData.ThemeType       = themeType;
        winData.RollingDuration = rollingDuration;

        return winData;
    }

    /**重置畫面、特效、音效等等*/
    private ResetAll() {
        this.m_bigWinEffectNode[this.m_effectLevel].getComponentsInChildren(ParticleSystem2D).forEach(particle => {
            particle.stopSystem();
        });

        this.unscheduleAllCallbacks();  
        this.m_bigWinAni[this.m_winData.WinType].node.active = false;
        this.m_bigWinLabel.node.active = false;
        this.m_bigWinLabelAni.node.active = false;

        if(isValid(this.m_loopSound)){
            AudioManager.Instance.Stop(this.m_loopSound);
        }

        this.m_winData = null;
    }
}


