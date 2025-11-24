import { _decorator, Component, Color, isValid, tween, UIOpacity } from "cc";

import { error } from "cc";
import { Label, Node} from "cc";
import { TimedBool } from "db://assets/Stark/Utility/TimedBool";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { Persist } from "../../Persist/Persist";
import { AppLifeService } from "../../Service/AppLifeService";
import { RollingNumberLabel } from "db://assets/Stark/RollingNumber/RollingNumberLabel";

const { ccclass, property } = _decorator;

enum EXPONENTIAL {
    NONE = 0,
    KILO = 3,
    MILLION = 6,
    BILLION = 9,
    TRILLION = 12,
    QUADRILLION = 15,
    QUINTILLION = 18,
    SEXTILLION = 21,
}

const ExpoSuffix: {[key in EXPONENTIAL] : string} = {
    [EXPONENTIAL.NONE] : '',
    [EXPONENTIAL.KILO] : 'K',
    [EXPONENTIAL.MILLION] : 'M',
    [EXPONENTIAL.BILLION] : 'B',
    [EXPONENTIAL.TRILLION] : 'T',

    // 以下未確認
    [EXPONENTIAL.QUADRILLION] : 'Q',
    [EXPONENTIAL.QUINTILLION] : 'R',
    [EXPONENTIAL.SEXTILLION] : 'P',
}

const SuffixToExpo: {[key: string]: EXPONENTIAL} = {}
for (const expo in EXPONENTIAL) {
    const suffix = ExpoSuffix[expo];
    if (suffix != "")
    {
        SuffixToExpo[suffix] = parseInt(expo);
    }
}

class RecordData {
    recordTime: number;
    lowerBoundMulti: number;
    upperBoundMulti: number;
    lastNormailizeValue: number;
}

const RECORD_CYCLE = 300;

const RECORD_KEY = "jp_rolling_record";
const SWITCH_SEC = 4000;

@ccclass("JpRolling")
export default class JpRolling extends Component {
    // TODO: Based on JpCycleRunner
    @property({ type: RollingNumberLabel, tooltip: "JP跑分Label" }) m_showLabel: RollingNumberLabel = null
    public get Label(): RollingNumberLabel {
        return this.m_showLabel;
    }

    public get JPValue(): BigNumber {
        return this.m_actualValue;
    }

    get RunJPValue(): BigNumber {
        return this.m_currentValue;
    }

    @property( {
        displayName: "節點跟數字輪播模式",
        tooltip: "節點跟數字輪播模式",
    } )
    private m_numAutoSwitchMode: boolean = false;

     @property( {
        type: Node,
        displayName: "輪播用節點",
        visible: function() { return this.m_numAutoSwitchMode; }
    } )
    private m_switchNode: Node = null;
    private m_switchTimer: TimedBool = null;

    @property( {
        displayName: "是否同步最後位數",
        tooltip: "是否同步最後位數",
     } )
     private m_isFollowLastChar: boolean = false;
     private m_expo: EXPONENTIAL = EXPONENTIAL.NONE;

    @property( {
        type: Label,
        tooltip: "最後位數要對齊的Label",
        visible: function() { return this.m_isFollowLastChar; }
    } )
    private m_followLabel: Label = null;

    private m_bet: number = 0;
    private m_baseMultiplier = 0;
    public get BaseMultiplier() { return this.m_baseMultiplier; }
    private m_jpMoney: BigNumber = null;
    private m_numberOptions: any = {KCount: 99};
    private m_isInit: boolean = false;

    // 假跑部分
    private m_isPause: boolean = true;
    private m_minDuration: number = 0;
    private m_currentValue: BigNumber = null;
    public get Current() { return this.m_currentValue; }
    private m_finalValue: BigNumber = null;
    private m_perSecValue: BigNumber = null;
    private m_actualValue: BigNumber = null;
    private m_lowerBoundMulti: number = 0;
    private m_upperBoundMulti: number = 0;
    private m_isRunOver: boolean = false;
    private m_recordKey: string = null;
    private m_reocrdTimer: TimedBool = new TimedBool();

    public set MaxCount(maxCount: number) {
        this.m_numberOptions.KCount = maxCount;
    }


    protected m_kmbtFormatFn: (value: number|BigNumber) => string = null;
    set KmbtFormatFn(value:(value: number|BigNumber) => string){
        this.m_kmbtFormatFn = value;
    }
    get KmbtFormatFn():(value: number|BigNumber) => string{
        return this.m_kmbtFormatFn;
    }
    //=========================================================================================================
    /**
     * 初始化，沒做之前其他更新會沒有作用
     * @param bet 押注
     * @param minDuration 最低JP循環週期(秒)
     * @param baseMultiplier 基礎倍率
     * @param jpMoney 抽水
     * @param name 唯一名字，存進app記憶體判斷用
     * @param option 額外設定
     * addInterval 變動間隔(秒)
     * addBetMultiplier 每次變動bet倍率
     * numberGroupOption numberRollingLabel設定
     * @param isInMainGame 是否在MG中，影響初始值是否加上次離開間的差值
     */
    public Init(
        bet: number
        , minDuration: number
        , baseMultiplier: number
        , jpMoney: BigNumber
        , name: string
        , option?: {
            addInterval?: number
            , addBetMultiplier?: number
            , numberGroupOption?: { floorCount?: number, KCount: number, color?: Color }
        }
        , isInMG: boolean = true): void {

        this.m_bet = bet;
        this.m_baseMultiplier = baseMultiplier;
        this.m_jpMoney = jpMoney;

        this.m_minDuration = minDuration;

        if (option && option.numberGroupOption) {
            this.m_numberOptions = option.numberGroupOption;
        } else {
            this.m_numberOptions = { KCount: this.m_showLabel.MaxCount };
        }
        this.m_showLabel.NumberGroupOption = this.m_numberOptions;

        this.m_actualValue = this.GetCalculateJpPool();

        const accountId = AppLifeService.Instance?.UserProfile?.accountId ?? 0;
        const keyPrefix = GamesChief.Status.JpRollingRecordKeyPrefix;
        if (name?.length > 0) {
            if (keyPrefix?.length > 0) {
                this.m_recordKey = `${AppDefine.EnvType}.${accountId}.${RECORD_KEY}.${keyPrefix}.${name}`;
            } else {
                this.m_recordKey = `${AppDefine.EnvType}.${accountId}.${RECORD_KEY}.${name}`;
            }
        } else {
            this.m_recordKey = null;
        }

        let recordData = this.LoadData();
        if (recordData) {
            this.RecoverData(recordData);
            this.RefreshRollingValue(false);
            if (isInMG) {
                let passTime = Date.now() - recordData.recordTime;
                let passSec = passTime / 1000;
                let passValue = this.m_perSecValue.times(passSec);
                this.m_currentValue = this.m_currentValue.plus(passValue);
            }
        } else {
            this.RefreshRollingValue(true);
            this.m_currentValue = this.m_currentValue.plus(this.m_perSecValue.times(0));
        }
        this.syncLabelDisplay();

        this.m_reocrdTimer.UseDT(true);
        this.m_reocrdTimer.Start(RECORD_CYCLE);

        this.m_isInit = true;
    }

    /** 分數更新
     * @param value 指定顯示數值
     * @param immediate 是否立即更新顯示
     */
    public SetValue(value: BigNumber, immediate: boolean = false) {
        // 目前使用情境都是用在顯示正確數值用 或許可以改用 Stop
    }

    //=========================================================================================================
    /** 跑分開始
     * @param restart 重新開始
     * @param passTimeCorrect 是否依據停止經過時間補上差值
     */
    public Run(restart: boolean = false, passTimeCorrect: boolean = false) {
        this.m_isPause = false;

        if (restart || this.m_isRunOver) {
            this.RefreshRollingValue(true);
            this.m_isRunOver = false;
        }
    }

    protected update(dt: number): void {

        if (!this.m_isInit) return;

        if (this.m_isFollowLastChar && this.m_followLabel) {
            // 
            const followedStr = this.m_followLabel.string;
            const followedLetter = followedStr[followedStr.length - 1];
            
            if (!/^[a-zA-Z]$/.test(followedLetter)) {
                this.m_expo = EXPONENTIAL.NONE;
            } else {
                this.m_expo = SuffixToExpo[followedLetter];
                if (!this.m_expo) this.m_expo = EXPONENTIAL.NONE;
            }
        }

        if (this.m_isPause){
            this.syncLabelDisplay();
            return;
        }


        this.m_currentValue = this.m_currentValue.plus(this.m_perSecValue.times(dt));
        if (this.m_currentValue.gt(this.m_finalValue)) {
            this.m_currentValue = this.m_finalValue;

            this.RefreshRollingValue(true);
        }

        this.syncLabelDisplay();

        this.m_reocrdTimer.Update(dt);
        if (this.m_reocrdTimer.TakeAndRestart()) {
            this.RecordData();
        }

        this.AutoSwitchUpdate()
    }

    private AutoSwitchUpdate(){
        if( !this.m_numAutoSwitchMode ){
            return
        }

        if( isValid(this.m_switchNode, true) ){
            if (!this.m_switchTimer) {
                this.m_switchTimer = new TimedBool();
                this.m_switchTimer.Start(SWITCH_SEC);
            }

            if (this.m_switchTimer.ToBool()) {
                let isShowNum = this.m_switchNode.active

                if(!isValid(this.m_switchNode.getComponent( UIOpacity ) )){
                    this.m_switchNode.addComponent(UIOpacity);
                }
                if(!isValid(this.m_showLabel.node.getComponent( UIOpacity ) )){
                    this.m_showLabel.node.addComponent(UIOpacity);
                }

                if(isShowNum){
                    this.m_showLabel.node.active = true
                }else{
                    this.m_switchNode.active = true
                }

                tween( this.m_switchNode.getComponent(UIOpacity) )
                .to( 0.3, { opacity: !isShowNum ? 255 : 0 } )
                .call(() => {
                    this.m_switchNode.active = !isShowNum;
                })
                .start();
                tween( this.m_showLabel.node.getComponent(UIOpacity) )
                .to( 0.3, { opacity: isShowNum ? 255 : 0 } )
                .call(() => {
                    this.m_showLabel.node.active = isShowNum;
                })
                .start();

                this.m_switchTimer.Restart()
            }
        }else{
            this.m_switchNode.active = false;
        }
    }

    private syncLabelDisplay() {
        if( this.KmbtFormatFn && typeof this.KmbtFormatFn === "function" ){
            this.m_showLabel.SetFormatterAndValue(this.KmbtFormatFn, this.m_currentValue)
        }else if ( GamesChief?.SlotGame?.IsUsingKMBTv3 ){
            this.m_showLabel.MaxCount = this.m_numberOptions.KCount
            this.m_showLabel.Label.string = NumberUtils.FormatNumberKMBTv3(this.m_currentValue, this.m_numberOptions.KCount);
        } else if (this.m_isFollowLastChar) {
            this.m_showLabel.Label.string = this.m_currentValue.div(Math.pow(10, this.m_expo)).toFormat(0) + ExpoSuffix[this.m_expo];
        } else {
            this.m_showLabel.Label.string = NumberUtils.Format(this.m_currentValue, this.m_numberOptions.KCount);
        }
    }

    //=========================================================================================================
    /** 跑分停止
     *  會直接顯示真正的Jp數值
     */
    public Stop() {
        this.m_showLabel.Number = this.m_currentValue;
        this.m_showLabel.RollNumberTo(this.m_actualValue);
        this.m_currentValue = this.m_actualValue;
        this.m_isPause = true;
        this.m_isRunOver = true;

        this.RecordData();
    }

    /** 跑分暫停
     * 
     */
    public Pause(pauseValue?: number | BigNumber) {
        if (pauseValue)
        {
            this.m_currentValue = NumberUtils.ParseBigNumber(pauseValue);
            this.syncLabelDisplay();
        }
        this.m_isPause = true;

        this.RecordData();
    }

    /** 跑分繼續
     *
     */
    public Resume() {
        this.m_isPause = false;
    }

    //=========================================================================================================
    /** bet更新
     * @param bet 新bet值
     * @param immediate 是否立即更新顯示
     */
    public UpdateBet(bet: number, immediate: boolean = false) {
        if (!this.m_isInit) return;

        this.m_currentValue = this.m_currentValue.times(bet).div(this.m_bet);
        this.m_bet = bet;
        this.m_actualValue = this.GetCalculateJpPool();
        this.RefreshRollingValue(false);
    }

    //=========================================================================================================
    /** 更新抽水 */
    public UpdateJPMoney(money: BigNumber) {
        this.m_jpMoney = money;
        this.m_actualValue = this.GetCalculateJpPool();
        this.RefreshRollingValue(false);
    }

    //=========================================================================================================
    /** 更新基礎倍率 */
    public UpdateBaseMultiplier(multiplier: number) {
        if (this.m_baseMultiplier == multiplier) return;

        this.m_baseMultiplier = multiplier;
        this.m_actualValue = this.GetCalculateJpPool();

        // 假設連設定都變了乾脆就直接重新跑
        this.RefreshRollingValue(true);
    }

    private GetCalculateJpPool(): BigNumber {
        let totalMoney = new BigNumber(0)
        totalMoney = totalMoney.plus(this.m_bet * this.m_baseMultiplier)
        totalMoney = totalMoney.plus(this.m_jpMoney)
        return totalMoney
    }

    private RefreshRollingValue(isRestart: boolean) {

        if (isRestart) {
            // 0.75~0.85
            this.m_lowerBoundMulti = 0.75 + (Math.random() * 0.1);

            // 0.97~1
            this.m_upperBoundMulti = 1 - (Math.random() * 0.03);
        }

        let baseMoney = new BigNumber(this.m_bet * this.m_baseMultiplier);
        let lowerBound: BigNumber = baseMoney.times(this.m_lowerBoundMulti);
        let upperBound: BigNumber = baseMoney.times(this.m_upperBoundMulti);
        this.m_finalValue = upperBound.plus(this.m_jpMoney);

        if (isRestart) {
            this.m_currentValue = lowerBound;
        }

        const diff = upperBound.minus(lowerBound);
        if (diff.lt(0)) {
            error("JpRolling 倒退跑");
        }

        let perSec = diff.div(this.m_minDuration);
        //log(`diff = ${diff}, minDuration = ${this.m_minDuration}, 每秒跑${perSec}`)
        this.m_perSecValue = this.CheckDelta(perSec);


    }

    private CheckDelta(delta: BigNumber) {
        const minimumDelta = this.m_bet * 0.002;
        if (delta.lt(minimumDelta)) {
            delta = new BigNumber(minimumDelta);
        }

        return delta;
    }

    private RecordData(): void {
        if (!this.m_recordKey) return;

        let data = new RecordData();
        data.recordTime = Date.now();
        data.lowerBoundMulti = this.m_lowerBoundMulti;
        data.upperBoundMulti = this.m_upperBoundMulti;
        data.lastNormailizeValue = this.m_currentValue.div(this.m_bet).toNumber();

        Persist.App.Set( this.m_recordKey, JSON.stringify(data) );
    }

    private LoadData(): RecordData {
        if (!this.m_recordKey) return null;

        let data = Persist.App.Get( this.m_recordKey );
        if (!data) return null;

        return JSON.parse(data);
    }

    private RecoverData(data: RecordData): void {
        this.m_lowerBoundMulti = data.lowerBoundMulti;
        this.m_upperBoundMulti = data.upperBoundMulti;
        this.m_currentValue = new BigNumber(data.lastNormailizeValue * this.m_bet);
    }

    protected onDestroy(): void {
        this.RecordData();
    }
}
