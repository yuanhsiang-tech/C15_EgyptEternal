import { Component, _decorator, Size, Color, log, Toggle, Label, EventTouch, UITransform, Sprite } from 'cc';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import CommonButton from 'db://assets/Stark/Interactive/CommonButton';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import AudioManager from '../../../Audio/Foundation/AudioManager';
import GameBar from './GameBar';
import { GameBarDefine } from './GameBarDefine';
const { ccclass, property } = _decorator;





const AutoPlayUIName = {
    QUICK_STOP_TOGGLE: "Toggle_QuickStop",
    AUTO_RUSH_TOGGLE: "Toggle_AutoRush",
    TOTAL_ROUND_TOGGLE: "Toggle_TotalRound",
    AWARD_TIMES_TOGGLE: "Toggle_AwardTimes",
    COIN_TOGGLE: "Toggle_Coin",
    FEATURE_STOP_TOGGLE1: "Toggle_FeatureStop1",
    FEATURE_STOP_TOGGLE2: "Toggle_FeatureStop2",


    BTN_CLOSE: "Btn_Close",
    BTN_CONFIRM: "Btn_Confirm",
    BTN_INCREASE_TOTAL_ROUND: "Btn_TotalRound_Increase",
    BTN_DECREASE_TOTAL_ROUND: "Btn_TotalRound_Decrease",
    BTN_INCREASE_AWARD_TIMES: "Btn_AwardTimes_Increase",
    BTN_DECREASE_AWARD_TIMES: "Btn_AwardTimes_Decrease",
    BTN_INCREASE_COIN: "Btn_Coin_Increase",
    BTN_DECREASE_COIN: "Btn_Coin_Decrease",
}

const EventName = {
    SHOW_RUSH_CARD_MAIN_PANEL: "SHOW_RUSH_CARD_MAIN_PANEL",
}


//調整hold的速度
const AUTOPLAY_SETTING_HOLD_SPEED: { [key: number]: number } = {
	1: 1,
	2: 3,
	3: 5,
	4: 10,
	5: 50
}

//調整間距
const AUTOPLAY_SETTING_PANEL_CHANGE_STEP = {
	TOTAL_ROUND: 1,
	AWARD_TIMES: 1,
	COIN: 1000,
    COUTOM_1: 1,
    COUTOM_2: 1,
}

//起始數值
const AUTOPLAY_INITED_VALUE = {
	TOTAL_ROUND: 10,
	AWARD_TIMES: 10,
	COIN: 65000,
    COUTOM_1: 1,
    COUTOM_2: 1,
}

//臨界數值
const AUTOPLAY_SETTING_PANEL_LIMIT_VALUE = {
	TOTAL_ROUND: { MIN: 5, MAX: 999 },
	AWARD_TIMES: { MIN: 1, MAX: 9999 },
	COIN: { MIN: 0, MAX: 9999999999 },
    COUTOM_1: { MIN: 1, MAX: 9999 },
    COUTOM_2: { MIN: 1, MAX: 9999 },
}

//按住不放增加幅度
const AUTOPLAY_SETTING_PANEL_HOLD_INCREASE_STEP = {
	TOTAL_ROUND: 1,
	AWARD_TIMES: 1,
	COIN: 50,
    COUTOM_1: 1,
    COUTOM_2: 1,
}

const CUSTOM_1_SIZE = new Size(644, 505)
const CUSTOM_2_SIZE = new Size(644, 585)

const AUTOPLAY_SETTING_PANEL_HOLD_CHANGE_INTERVEL = 0.1 //更新間距


@ccclass('GameBarAutoPlayMenu')
export class GameBarAutoPlayMenu extends Component {
    //============================Toggle================================
    @property({
        type: Toggle,
        displayName: "快速停輪 Toggle",
        group: { id: 'toggle', name: "Toggle" }
    })
    protected m_quickStopToggle: Toggle = null;

    @property({
        type: Toggle,
        displayName: "極速卡 Toggle",
        group: { id: 'toggle', name: "Toggle" }
    })
    protected m_autoRushToggle: Toggle = null;

    @property({
        type: Toggle,
        displayName: "總局數 Toggle",
        group: { id: 'toggle', name: "Toggle" }
    })
    protected m_totalRoundToggle: Toggle = null;

    @property({
        type: Toggle,
        displayName: "獲獎倍率 Toggle",
        group: { id: 'toggle', name: "Toggle" }
    })
    protected m_awardTimesToggle: Toggle = null;
    
    @property({
        type: Toggle,
        displayName: "籌碼 Toggle",
        group: { id: 'toggle', name: "Toggle" }
    })
    protected m_coinToggle: Toggle = null;


    @property({
        type: Toggle,
        displayName: "進入特色遊戲時停止 Toggle1",
        group: { id: 'toggle', name: "Toggle" }
    })
    protected m_featureStopToggle1: Toggle = null;

    @property({
        type: Toggle,
        displayName: "進入特色遊戲時停止 Toggle2",
        group: { id: 'toggle', name: "Toggle" }
    })
    protected m_featureStopToggle2: Toggle = null;

    //============================Button================================
    @property({
        type: CommonButton,
        displayName: "關閉按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnClose: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "啟動按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnConfirm: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "增加總局數按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnIncreaseTotalRound: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "減少總局數按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnDecreaseTotalRound: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "增加獲獎倍率按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnIncreaseAwardTimes: CommonButton = null;
    
    @property({
        type: CommonButton,
        displayName: "減少獲獎倍率按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnDecreaseAwardTimes: CommonButton = null;
    

    @property({
        type: CommonButton,
        displayName: "增加籌碼按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnIncreaseCoin: CommonButton = null;
    
    @property({
        type: CommonButton,
        displayName: "減少籌碼按鈕",
        group: { id: 'button', name: "Button" }
    })
    protected m_btnDecreaseCoin: CommonButton = null;



    //============================Label================================
    @property({
        type: Label,
        displayName: "總局數 Label",
        group: { id: 'label', name: "Label" }
    })
    protected m_labelTotalRound: Label = null;

    @property({
        type: Label,
        displayName: "獲獎倍率 Label",
        group: { id: 'label', name: "Label" }
    })
    protected m_labelAwardTimes: Label = null;

    @property({
        type: Label,
        displayName: "籌碼 Label",
        group: { id: 'label', name: "Label" }
    })
    protected m_labelCoin: Label = null;




    public m_gameBar: GameBar
    public m_btn_close: any
    public m_btn_confirm: any
    public m_checkbox_quickstop: any
    public m_checkbox_totalround: any
    public m_btn_increase_totalRound: any
    public m_btn_decrease_totalRound: any
    public m_label_totalRound: any
    public m_totalRound: number
    public m_checkbox_awardTimes: any
    public m_btn_increase_awardTimes: any
    public m_btn_decrease_awardTimes: any
    public m_label_awardTimes: any
    public m_awardTimes: number
    public m_checkbox_coin: any
    public m_btn_increase_coin: any
    public m_btn_decrease_coin: any
    public m_label_coin: any
    public m_checkAutoRush: any
    public m_checkbox_1: any
    public m_btn_increase_1: any
    public m_btn_decrease_1: any
    public m_label_custom1: any
    public m_custom1: number
    public m_checkbox_2: any
    public m_btn_increase_2: any
    public m_btn_decrease_2: any
    public m_label_custom2: any
    public m_custom2: number
    public m_touchScheduler: any
    public m_increaseCount: number
    public m_hasUpdated: boolean
    private m_coin:number = 0;

    public Init(gameBar: GameBar): void {
        log("AutoPlaySettingPanel ctor")
        this.m_gameBar = gameBar
 
        //快速停輪
        this.m_quickStopToggle.isChecked = true;

        //總局數
        this.m_totalRound = Infinity;
        this.m_labelTotalRound.string = this.m_totalRound.toString();
        
        //獲獎倍率
        this.m_awardTimes = AUTOPLAY_INITED_VALUE.AWARD_TIMES;
        this.m_labelAwardTimes.string = this.m_awardTimes.toString();

        //籌碼
        this.m_coin = AUTOPLAY_INITED_VALUE.COIN;
        this.m_labelCoin.string = this.m_coin.toString();
    }

    protected onEnable(): void {  
        //toggle
        this.m_quickStopToggle.node.on('toggle', this.OnToggleClick, this);
        this.m_autoRushToggle.node.on('toggle', this.OnToggleClick, this);
        this.m_totalRoundToggle.node.on('toggle', this.OnToggleClick, this);
        this.m_awardTimesToggle.node.on('toggle', this.OnToggleClick, this);
        this.m_coinToggle.node.on('toggle', this.OnToggleClick, this);
        this.m_featureStopToggle1.node.on('toggle', this.OnToggleClick, this);
        this.m_featureStopToggle2.node.on('toggle', this.OnToggleClick, this);

        //button
        this.m_btnClose.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
        this.m_btnConfirm.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
        this.m_btnIncreaseTotalRound.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
        this.m_btnDecreaseTotalRound.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
        this.m_btnIncreaseAwardTimes.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
        this.m_btnDecreaseAwardTimes.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
        this.m_btnIncreaseCoin.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
        this.m_btnDecreaseCoin.node.on(TouchableEvent.Clicked, this.OnButtonClick, this);
    }

    protected onDisable(): void {
        this.m_quickStopToggle.node.off('toggle', this.OnToggleClick, this);
        this.m_autoRushToggle.node.off('toggle', this.OnToggleClick, this);
        this.m_totalRoundToggle.node.off('toggle', this.OnToggleClick, this);
        this.m_awardTimesToggle.node.off('toggle', this.OnToggleClick, this);
        this.m_coinToggle.node.off('toggle', this.OnToggleClick, this);
        this.m_featureStopToggle1.node.off('toggle', this.OnToggleClick, this);
        this.m_featureStopToggle2.node.off('toggle', this.OnToggleClick, this);
    }

    private OnToggleClick(toggleCom: Toggle): void {
        let toggleName = toggleCom.node.name;
        switch (toggleName) {
            case AutoPlayUIName.QUICK_STOP_TOGGLE:         
                break;
            case AutoPlayUIName.AUTO_RUSH_TOGGLE:
                this.UpdateAllUiStatusByAutoRush(!toggleCom.isChecked);
                break;
            case AutoPlayUIName.TOTAL_ROUND_TOGGLE:
                break;
            case AutoPlayUIName.AWARD_TIMES_TOGGLE:
                break;
            case AutoPlayUIName.COIN_TOGGLE:
                break;
            case AutoPlayUIName.FEATURE_STOP_TOGGLE1:
                break;
            case AutoPlayUIName.FEATURE_STOP_TOGGLE2:
                break;
        }
    }

    private OnButtonClick(target: Touchable, event: EventTouch){
        let buttonName = target.node.name;
        switch (buttonName) {
            case AutoPlayUIName.BTN_CLOSE:
                this.Hide();
                break;
            case AutoPlayUIName.BTN_CONFIRM:
                this.OnClickConfirm();
                break;
            case AutoPlayUIName.BTN_INCREASE_TOTAL_ROUND:
                this.OnClickChange(this.m_labelTotalRound, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.TOTAL_ROUND, 5,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MAX);
                const totalRoundStr = this.m_labelTotalRound.string.replace(/,/g, '');
                this.m_totalRound = Number(totalRoundStr);
                this.m_totalRoundToggle.isChecked = true;

                
                this.holdChange(this.m_labelTotalRound, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.TOTAL_ROUND,
                    AUTOPLAY_SETTING_PANEL_HOLD_INCREASE_STEP.TOTAL_ROUND, 5,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MAX,
                    AUTOPLAY_SETTING_PANEL_HOLD_CHANGE_INTERVEL)
                break;
            case AutoPlayUIName.BTN_DECREASE_TOTAL_ROUND:
                this.OnClickChange(this.m_labelTotalRound, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.TOTAL_ROUND, -5,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MAX)
                const totalRoundStr2 = this.m_labelTotalRound.string.replace(/,/g, '')
                this.m_totalRound = Number(totalRoundStr2)
                this.m_totalRoundToggle.isChecked = true;

                this.holdChange(this.m_labelTotalRound, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.TOTAL_ROUND,
                    AUTOPLAY_SETTING_PANEL_HOLD_INCREASE_STEP.TOTAL_ROUND, -5,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MAX,
                    AUTOPLAY_SETTING_PANEL_HOLD_CHANGE_INTERVEL)
                break
            case AutoPlayUIName.BTN_INCREASE_AWARD_TIMES:
                this.OnClickChange(this.m_labelAwardTimes, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.AWARD_TIMES, 1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MAX)
                this.m_awardTimesToggle.isChecked = true;

                this.holdChange(this.m_labelAwardTimes, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.AWARD_TIMES,
                    AUTOPLAY_SETTING_PANEL_HOLD_INCREASE_STEP.AWARD_TIMES, 1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MAX,
                    AUTOPLAY_SETTING_PANEL_HOLD_CHANGE_INTERVEL)
                break
            case AutoPlayUIName.BTN_DECREASE_AWARD_TIMES:
                this.OnClickChange(this.m_labelAwardTimes, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.AWARD_TIMES, -1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MAX)
                this.m_awardTimesToggle.isChecked = true;

                this.holdChange(this.m_labelAwardTimes, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.AWARD_TIMES,
                    AUTOPLAY_SETTING_PANEL_HOLD_INCREASE_STEP.AWARD_TIMES, -1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MAX,
                    AUTOPLAY_SETTING_PANEL_HOLD_CHANGE_INTERVEL)
                break
            case AutoPlayUIName.BTN_INCREASE_COIN:
                this.OnClickChange(this.m_labelCoin, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.COIN, 1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MAX)
                this.m_coinToggle.isChecked = true;

                this.holdChange(this.m_labelCoin, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.COIN,
                    AUTOPLAY_SETTING_PANEL_HOLD_INCREASE_STEP.COIN, 1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MAX,
                    AUTOPLAY_SETTING_PANEL_HOLD_CHANGE_INTERVEL)
                break
            case AutoPlayUIName.BTN_DECREASE_COIN:
                this.OnClickChange(this.m_labelCoin, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.COIN, -1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MAX)
                this.m_coinToggle.isChecked = true;

                this.holdChange(this.m_labelCoin, AUTOPLAY_SETTING_PANEL_CHANGE_STEP.COIN,
                    AUTOPLAY_SETTING_PANEL_HOLD_INCREASE_STEP.COIN, -1,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MIN,
                    AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MAX,
                    AUTOPLAY_SETTING_PANEL_HOLD_CHANGE_INTERVEL)
                break
        }
    }    

    /*
    	按住不放增加或減少目標
    	@param target 目標
    	@param step 增加間距基數
    	@param holdIncreaseStep 遞增基數(累加)
    	@param increaseOrDecrease 增加或減少
    	@param minus 最小值
    	@interval 更新間距(秒)
    */
    public holdChange(target: Label, step: number, holdIncreaseStep: number, increaseOrDecrease: number, minus: number, maximum: number, interval: number): void {
        log("AutoPlaySettingPanel:holdChange", target.string, step, holdIncreaseStep, increaseOrDecrease, minus, interval)
        let addTime = 0
        const hold = () => {
            addTime = addTime + 1
            if (addTime > 60) {
                holdIncreaseStep = AUTOPLAY_SETTING_HOLD_SPEED[5]
            } else if (addTime > 45) {
                holdIncreaseStep = AUTOPLAY_SETTING_HOLD_SPEED[4]
            } else if (addTime > 30) {
                holdIncreaseStep = AUTOPLAY_SETTING_HOLD_SPEED[3]
            } else if (addTime > 15) {
                holdIncreaseStep = AUTOPLAY_SETTING_HOLD_SPEED[2]
            } else {
                holdIncreaseStep = AUTOPLAY_SETTING_HOLD_SPEED[1]
            }

            const valueStr = target.string.replace(/,/g, '')
            let value = Number(valueStr)
            log("AutoPlaySettingPanel:holdChange", value, this.m_increaseCount)
            value = value + ((step + this.m_increaseCount) * increaseOrDecrease)
            this.m_increaseCount = this.m_increaseCount + holdIncreaseStep
            if (value < minus) {
                value = minus
                this.m_increaseCount = 0
            } else if (value > maximum) {
                value = maximum
                this.m_increaseCount = 0
            }
            this.m_hasUpdated = true
            target.string = value.toString();

            if (this.m_labelTotalRound === target) {
                this.m_totalRound = value
            }
        }
    }

    /**
     * 點擊啟動 
     */
    public OnClickConfirm(): void {
        log("AutoPlaySettingPanel:OnClickConfirm")

        if (this.m_autoRushToggle.isChecked) {
            EventDispatcher.Shared.Dispatch(EventName.SHOW_RUSH_CARD_MAIN_PANEL);
        }

        this.m_gameBar.AutoPlayRounds = this.m_totalRound;

        this.Hide()
    }

    /*
    	點擊增加或減少目標
    	@param target 目標
    	@param step 增加間距基數
    	@param increaseOrDecrease 增加或減少
    	@param minus 最小值
    */
    public OnClickChange(tagert: Label, step: number, increaseOrDecrease: number, minus: number, maximum: number): void {
        log("AutoPlaySettingPanel:OnClickChange ");
        if (this.m_hasUpdated) {
            return;
        }

        const valueStr = tagert.string.replace(/,/g, '');
        let value = Number(valueStr);
        value = value + (step * increaseOrDecrease);
        if (value <= minus) {
            value = minus;
        } else if (value > maximum) {
            value = maximum;
        }
        tagert.string = value.toString();
    }

    /*
    	修改總局數
    */
    public OnChangeTotalRound(increaseOrDecrease: number): void {
        log("AutoPlaySettingPanel:OnChangeTotalRound ")

        this.m_totalRound = this.m_totalRound + (AUTOPLAY_SETTING_PANEL_CHANGE_STEP.TOTAL_ROUND * increaseOrDecrease)
        if (this.m_totalRound < AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MIN) {
            this.m_totalRound = AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MIN
        } else if (this.m_totalRound > AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MAX) {
            this.m_totalRound = AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.TOTAL_ROUND.MAX
        }
        this.m_labelTotalRound.string = this.m_totalRound.toString();

        this.m_totalRoundToggle.isChecked = true;
    }

    /*
    	修改得獎倍率
    */
    public OnChangeAwardTimes(increaseOrDecrease: number): void {
        log("AutoPlaySettingPanel:OnChangeAwardTimes ")

        this.m_awardTimes = this.m_awardTimes + (AUTOPLAY_SETTING_PANEL_CHANGE_STEP.AWARD_TIMES * increaseOrDecrease)
        if (this.m_awardTimes < AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MIN) {
            this.m_awardTimes = AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MIN
        } else if (this.m_awardTimes > AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MAX) {
            this.m_awardTimes = AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.AWARD_TIMES.MAX
        }
        this.m_labelAwardTimes.string = this.m_awardTimes.toString();

        this.m_awardTimesToggle.isChecked = true;
    }

    /*
    	修改贏錢籌碼
    */
    public OnChangeCoins(increaseOrDecrease: number): void {
        log("AutoPlaySettingPanel:OnChangeCoins ")

        this.m_coin = this.m_coin + (AUTOPLAY_SETTING_PANEL_CHANGE_STEP.COIN * increaseOrDecrease)
        if (this.m_coin < AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MIN) {
            this.m_coin = AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MIN
        } else if (this.m_coin > AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MAX) {
            this.m_coin = AUTOPLAY_SETTING_PANEL_LIMIT_VALUE.COIN.MAX
        }
        this.m_labelCoin.string = this.m_coin.toString();

        this.m_coinToggle.isChecked = true;
    }

    /*
    	是否快停
    */
    public IsQuickStop(): boolean {
        return this.m_quickStopToggle.isChecked;
    }

    /*
    	是否設定自動玩局數停止選項
    */
    public IsAutoPlayByTimesSelected(): boolean {
        return this.m_totalRoundToggle.isChecked;
    }

    


    /*
    	自動玩次數更新，如有設定自動玩局數，需要呼叫此function更新次數
    */
    public AutoPlayByTimes(): void {
        log("AutoPlaySettingPanel:AutoPlayByTimes ")
        if (this.m_totalRoundToggle.isChecked) {
            if (this.m_totalRound > 0) {
                this.m_totalRound = this.m_totalRound - 1
            }
        }
    }

    /*
    	如有設定自動玩局數，取得目前自動玩回傳目前自動玩實際次數
    */
    public GetTimesOfAutoPlay(): number {
        if (this.m_totalRoundToggle.isChecked) {
            return this.m_totalRound
        }

        return -1
    }

    // 是否設定自動玩籌碼限制選項
    public IsChipLimit(): boolean {
        return this.m_coinToggle.isChecked;
    }

    /*
    	如有設定籌碼限制，回傳目前設定的值
    */
    public GetValueOfPoint(): number {
        if (this.m_coinToggle.isChecked) {
            const poinStr = this.m_label_coin.getString().replace(/,/g, '')
            return Number(poinStr)
        }

        return -1
    }

    // 是否設定自動玩籌碼限制選項
    public IsAwardTimes(): boolean {
        return this.m_awardTimesToggle.isChecked;
    }

    /*
    	如有設定贏錢倍率，回傳目前設定的值
    */
    public GetValueOfRate(): number {
        if (this.m_awardTimesToggle.isChecked) {
            const awardTimesStr = this.m_label_awardTimes.getString().replace(/,/g, '')
            return Number(awardTimesStr)
        }

        return -1
    }

    /*
    	是否設定進入FreeGame停止選項
    */
    // public IsSelectedCstomization1(): boolean {
    //     return this.m_checkbox_1.isChecked;
    // }
    // public GetValueOfCustomization1(): number {
    //     if (this.m_checkbox_1.isChecked) {
    //         const numberStr = this.m_label_custom1.getString().replace(/,/g, '')
    //         return Number(numberStr)
    //     }

    //     return -1
    // }
    // public IsSelectedCstomization2(): boolean {
    //     return this.m_checkbox_2.isSelected()
    // }
    // public GetValueOfCustomization2(): number {
    //     if (this.m_checkbox_2.isSelected()) {
    //         const numberStr = this.m_label_custom2.getString().replace(/,/g, '')
    //         return Number(numberStr)
    //     }

    //     return -1
    // }
    // /*
    // 	進入免費遊戲選項
    // */
    // public IsAutoSelectFreeGame(): number {
    // 	if (this.m_checkbox_enterfreegame.isSelected() && this.m_label_fgSelect.currIndex >= STRING_ENTER_FG_SELCET_KEY.STOP) {
    // 		return this.m_label_fgSelect.currIndex
    // 	}
    // 	return -1
    // }

    /*
    	設定顯示
    	同時後更新目前籌碼，與目前實際局數的值
    */
    public Show(coin: number): void {
        const totalRoundStr = this.m_labelTotalRound.string.replace(/,/g, '')
        this.m_totalRound = Number(totalRoundStr);
        this.m_labelCoin.string = coin.toString();
    }


    public Hide(): void {
        this.node.active = false
    }

    public UpdateAllUiStatusByAutoRush(isEnable: boolean): void {
        //log(string.format("AutoPlaySettingPanel:UpdateAllUiStatusByAutoRush - %s", isEnable))

        const preferColor = !isEnable ? new Color(102, 102, 102) : new Color(255, 255, 255)

        this.m_quickStopToggle.enabled = isEnable;
        this.m_totalRoundToggle.enabled = isEnable;
        this.m_awardTimesToggle.enabled = isEnable;
        this.m_coinToggle.enabled = isEnable;

        this.m_quickStopToggle.node.getComponent(Sprite).color = preferColor
        this.m_totalRoundToggle.node.getComponent(Sprite).color = preferColor
        this.m_awardTimesToggle.node.getComponent(Sprite).color = preferColor
        this.m_coinToggle.node.getComponent(Sprite).color = preferColor

        this.m_btnIncreaseTotalRound.enabled = isEnable;
        this.m_btnDecreaseTotalRound.enabled = isEnable;
        this.m_btnIncreaseAwardTimes.enabled = isEnable;
        this.m_btnDecreaseAwardTimes.enabled = isEnable;
        this.m_btnIncreaseCoin.enabled = isEnable;
        this.m_btnDecreaseCoin.enabled = isEnable;

        if (!isEnable) {
            this.m_quickStopToggle.isChecked = isEnable;
            this.m_totalRoundToggle.isChecked = isEnable;
            this.m_awardTimesToggle.isChecked = isEnable;
            this.m_coinToggle.isChecked = isEnable;
        }

        if (this.m_featureStopToggle1) {
            this.m_featureStopToggle1.enabled = isEnable;
            this.m_featureStopToggle1.node.getComponent(Sprite).color = preferColor
            if (!isEnable) {
                this.m_featureStopToggle1.isChecked = isEnable;
                // if (this.m_setting.AutoPlay.CustomData1.SelectType !== null) {
                //     this.m_btn_increase_1.setTouchEnabled(!isEnable);
                //     this.m_btn_decrease_1.setTouchEnabled(!isEnable);
                // }
            }
        }

        // if (this.m_checkbox_2) {
        //     this.m_checkbox_2.setTouchEnabled(!isEnable)
        //     this.m_checkbox_2.setColor(preferColor)
        //     if (isEnable) {
        //         this.m_checkbox_2.setSelected(!isEnable)
        //         if (this.m_setting.AutoPlay.CustomData2.SelectType !== null) {
        //             this.m_btn_increase_2.setTouchEnabled(!isEnable);
        //             this.m_btn_decrease_2.setTouchEnabled(!isEnable);
        //         }
        //     }
        // }
    }
}


