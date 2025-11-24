import { _decorator, isValid, Component, Node, Label, EditBox, EventTouch, Tween, tween, warn, log, assert, instantiate, Prefab, v3, sp } from 'cc';
import { GameBarDefine, GameBarDefine as GBDef } from './GameBarDefine'
import { GameBarWinEffectDefine, ReadableWinEffectSettingList } from './GameBarWinEffectDefine';
import { EventDefine } from '../../../Define/EventDefine';
import { GameCommonCommand } from '../../Common/GameCommonCommand';
import { AudiosDefine } from '../../../Define/AudiosDefine';
import GameBarSpinButton from './GameBarSpinButton';
import GameBarWinView, { GameBarWinViewDelegate, RollingCbAttribute } from './GameBarWinView';
import { LocaleText } from '../../../Locale/LocaleText';
import { BundleDefine } from '../../../Define/BundleDefine';
import { BetUtils } from '../Bet/BetUtils';
import { Device } from '../../../Device/Device';
import CommonButton from 'db://assets/Stark/Interactive/CommonButton';
import { PrefabBond } from '../../../Toolkit/PrefabBond';
import { EnvConfig } from '../../../Define/ConfigDefine';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
import AudioManager from '../../../Audio/Foundation/AudioManager';
import { NumberUtils } from 'db://assets/Stark/FuncUtils/NumberUtils';
import { GameBarAutoPlayMenu } from './GameBarAutoPlayMenu';


const { ccclass, property } = _decorator;


type UINameClickCB = (uiName: GBDef.UI_NAME) => void;
type EventTouchCB = (event: EventTouch) => void;

//================================================================================================

export interface GameBarDelegate extends GameBarWinViewDelegate {
    /** 設定遊戲 QA 測試代碼 */
    SetQACode(code: string | number): void;

    /** 取得遊戲 QA 測試代碼 */
    GetQACode(): number;
}



//================================================================================================
/**
 * Slot Game 的遊戲 Bar 界面
 */
//================================================================================================

@ccclass
export default class GameBar extends Component {
    //================================================================
    // Component Reference
    //================================================================

    //----------------------------------------------------------------

    @property({
        displayName: "直版模式",
        group: { id: 'game_bar', name: "Common" }
    })
    protected m_isPortrait: boolean = false;
    public get IsPortrait(): boolean {
        return this.m_isPortrait;
    }

    //----------------------------------------------------------------

    @property({
        type: CommonButton,
        displayName: "Info 按鈕",
        group: { id: 'game_bar', name: "Common" }
    })
    protected m_infoBtn: CommonButton = null;

    @property({
        type: PrefabBond,
        displayName: "Spin 按鈕",
        group: { id: 'game_bar', name: "Common" }
    })
    protected m_spinButtonBond: PrefabBond = null;

    @property({
        type: GameBarWinView,
        displayName: "Win View",
        group: { id: 'game_bar', name: "Common" }
    })
    protected m_barWinView: GameBarWinView = null;

    @property({
        type: EditBox,
        displayName: "作弊碼框",
        group: { id: 'game_bar', name: "Common" }
    })
    private m_cheatEditBox: EditBox = null;

    @property({
        type: CommonButton,
        displayName: "自動玩按鈕",
        group: { id: 'game_bar', name: "Common" }
    })
    protected m_autoPlayBtn: CommonButton = null;

    @property({
        type: PrefabBond,
        displayName: "自動玩按鈕 PrefabBond",
        group: { id: 'game_bar', name: "Common" }
    })
    protected m_autoPlayBtnBond: PrefabBond = null;

    //----------------------------------------------------------------

    @property({
        type: Label,
        displayName: "押注文字標籤",
        group: { id: 'game_bar', name: "Bet" }
    })
    protected m_betTxtLabel: Label = null;

    @property({
        type: Label,
        displayName: "當前 BET 標籤",
        group: { id: 'game_bar', name: "Bet" }
    })
    protected m_nowBetLabel: Label = null;

    @property({
        type: CommonButton,
        displayName: "增加 BET 按鈕",
        group: { id: 'game_bar', name: "Bet" }
    })
    protected m_increaseBtn: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "減少 BET 按鈕",
        group: { id: 'game_bar', name: "Bet" }
    })
    protected m_reduceBtn: CommonButton = null;

    @property({
        type: CommonButton,
        displayName: "最大 BET 按鈕",
        group: { id: 'game_bar', name: "Bet" }
    })
    protected m_maxBetBtn: CommonButton = null;

    //----------------------------------------------------------------

    //================================================================
    // Component & Event
    //================================================================

    //----------------------------------------------------------------

    protected m_delegate: Partial<GameBarDelegate> = null;

    //----------------------------------------------------------------

    public get Delegate(): Partial<GameBarDelegate> {
        return this.m_delegate;
    }
    public set Delegate(delegate: Partial<GameBarDelegate>) {
        this.m_delegate = delegate;
        this.m_barWinView.Delegate = delegate;
    }

    //----------------------------------------------------------------

    protected onLoad() {
        this.m_nowBetLabel.string = '-';
        this.m_infoBtn.node.name = GBDef.UI_NAME.BTN_INFO;
        this.m_increaseBtn.node.name = GBDef.UI_NAME.BTN_INCREASE;
        this.m_reduceBtn.node.name = GBDef.UI_NAME.BTN_REDUCE;
        this.m_maxBetBtn.node.name = GBDef.UI_NAME.BTN_MAX_BET;
        this.m_autoPlayBtn.node.name = GBDef.UI_NAME.AUTOPLAY_MENU;
        this.SpinButton.ClickCB = (uiName, event) => this.OnSpinButtonClicked(uiName, event);

        // 非開發模式或是預設情況下，不啟用作弊碼框
        if (!EnvConfig.IS_DEV || this.m_cheatEnabled === undefined) {
            this.ActiveQATest(false);
        }

        // 套用多語系
        // this.ApplyLanguage();
    }

    //----------------------------------------------------------------

    protected onEnable() {
        EventDispatcher.Shared.On(EventDefine.Game.ENTER_IDLE, this.OnGameEnterIdle, this);
        EventDispatcher.Shared.On(EventDefine.Game.SPIN_START, this.OnGameSpinStart, this);
        EventDispatcher.Shared.On(EventDefine.Game.GAME_BAR_CLICK_UI, this.OnEventClickUI, this);

        this.m_infoBtn?.On(TouchableEvent.Clicked, this.OnButtonClicked, this);
        this.m_maxBetBtn?.On(TouchableEvent.Clicked, this.OnButtonClicked, this);

        if (isValid(this.m_increaseBtn, true)) {
            this.m_increaseBtn.On(TouchableEvent.Clicked, this.OnButtonClicked, this);
            this.m_increaseBtn.On(TouchableEvent.LongTouchStart, this.OnIncreaseBtnLongTouchStart, this);
            this.m_increaseBtn.On(TouchableEvent.LongTouching, this.OnButtonClicked, this);
            this.m_increaseBtn.On(TouchableEvent.LongTouchEnd, this.OnIncreaseBtnLongTouchEnd, this);
        }

        if (isValid(this.m_reduceBtn, true)) {
            this.m_reduceBtn.On(TouchableEvent.Clicked, this.OnButtonClicked, this);
            this.m_reduceBtn.On(TouchableEvent.LongTouchStart, this.OnReduceBtnLongTouchStart, this);
            this.m_reduceBtn.On(TouchableEvent.LongTouching, this.OnButtonClicked, this);
            this.m_reduceBtn.On(TouchableEvent.LongTouchEnd, this.OnReduceBtnLongTouchEnd, this);
        }

        if (isValid(this.m_autoPlayBtn)) {
            this.m_autoPlayBtn.On(TouchableEvent.Clicked, this.OnButtonClicked, this);
        }

        EventDispatcher.Shared.On(EventDefine.Game.HIDE_EVENT_MISSION, this.OnHideEventMission, this);
    }

    //----------------------------------------------------------------

    protected onDisable() {
        EventDispatcher.Shared.Off(EventDefine.Game.ENTER_IDLE, this.OnGameEnterIdle, this);
        EventDispatcher.Shared.Off(EventDefine.Game.SPIN_START, this.OnGameSpinStart, this);
        EventDispatcher.Shared.Off(EventDefine.Game.GAME_BAR_CLICK_UI, this.OnEventClickUI, this);

        this.m_infoBtn?.Off(TouchableEvent.Clicked, this.OnButtonClicked, this);
        this.m_maxBetBtn?.Off(TouchableEvent.Clicked, this.OnButtonClicked, this);

        if (isValid(this.m_increaseBtn, true)) {
            this.m_increaseBtn.Off(TouchableEvent.Clicked, this.OnButtonClicked, this);
            this.m_increaseBtn.Off(TouchableEvent.LongTouchStart, this.OnIncreaseBtnLongTouchStart, this);
            this.m_increaseBtn.Off(TouchableEvent.LongTouching, this.OnButtonClicked, this);
            this.m_increaseBtn.Off(TouchableEvent.LongTouchEnd, this.OnIncreaseBtnLongTouchEnd, this);
        }

        if (isValid(this.m_reduceBtn, true)) {
            this.m_reduceBtn.Off(TouchableEvent.Clicked, this.OnButtonClicked, this);
            this.m_reduceBtn.Off(TouchableEvent.LongTouchStart, this.OnReduceBtnLongTouchStart, this);
            this.m_reduceBtn.Off(TouchableEvent.LongTouching, this.OnButtonClicked, this);
            this.m_reduceBtn.Off(TouchableEvent.LongTouchEnd, this.OnReduceBtnLongTouchEnd, this);
        }

        if (isValid(this.m_autoPlayBtn)) {
            this.m_autoPlayBtn.Off(TouchableEvent.Clicked, this.OnButtonClicked, this);
        }

        EventDispatcher.Shared.Off(EventDefine.Game.HIDE_EVENT_MISSION, this.OnHideEventMission, this);
    }

    //----------------------------------------------------------------
    /** 遊戲進入閒置狀態 */
    protected OnGameEnterIdle() {
        // 當遊戲Spin結束時處理自動玩旗標, 為了處理最後一轉的情況
        if (this.AutoPlayRounds == 0) {
            this.m_isAutoPlaying = false;
        }

        // this.UpdateSpinBtnNewbieLock();
    }

    //----------------------------------------------------------------
    /** 遊戲開始 Spin */
    protected OnGameSpinStart() {
    }

    //----------------------------------------------------------------





    //================================================================
    // Common
    //================================================================

    //----------------------------------------------------------------

    protected m_isFastMode: boolean = true;
    protected m_spinButton: GameBarSpinButton = null;
    protected m_idleFxTween: Tween<GameBarSpinButton> = null;
    protected m_autoPlayMenu: GameBarAutoPlayMenu = null;
    // protected m_clientLevel: number = 0;

    //----------------------------------------------------------------
    /** 是否為快速模式 (目前應該先不用實作保留接口就好) */
    public IsFastMode(): boolean {
        return this.m_isFastMode;
    }

    //----------------------------------------------------------------
    /** Spin 按鈕 */
    public get SpinButton(): GameBarSpinButton {
        return this.m_spinButton || (this.m_spinButton = NodeUtils.SearchComponent(this.m_spinButtonBond.Instance, GameBarSpinButton));
    }

    //----------------------------------------------------------------
    /**
     * 存取 Spin 按鈕的狀態。只會改變顯示的圖層。
     */
    public get SpinButtonState(): GBDef.SpinButtonState {
        return this.SpinButton.State;
    }
    public set SpinButtonState(state: GBDef.SpinButtonState) {
        this.SpinButton.State = state;
    }

    //----------------------------------------------------------------
    /**
     * 播放 Spin 按鈕音效
     */
    public PlaySpinBtnSound(type: "Spin" | "Stop" | "CancelAuto"): void {
        // 2.4.6的作法是有個soundSetting用mapping的方式決定要播哪種音效
        // 等檔案再補流程
        let soundPath: string = '';

        switch (type) {
            case "Spin": { soundPath = AudiosDefine.VEGAS_APP.BTN_SPIN; break; }
            case "Stop": { soundPath = AudiosDefine.VEGAS_APP.BTN_CLICK; break; }
            case "CancelAuto": { soundPath = AudiosDefine.VEGAS_APP.BTN_CLICK; break; }
        }

        if (soundPath?.length > 0) {
            AudioManager.Instance.Play(soundPath);
        }
    }

    //----------------------------------------------------------------
    /**
     * 套用多語系
     */
    protected ApplyLanguage(): void {
        if (isValid(this.m_betTxtLabel, true)) {
            const betTxt = LocaleText.GetString("gamebar_total_bet", BundleDefine.Module.VEGAS_SLOTS, "TOTAL BET");
            this.m_betTxtLabel.string = betTxt;
        }

        if (isValid(this.m_maxBetBtn, true)) {
            const maxTxt = LocaleText.GetString("gamebar_max_bet", BundleDefine.Module.VEGAS_SLOTS, "MAX\nBET");
            this.m_maxBetBtn.getComponentsInChildren(Label)?.forEach(label => (label.string = maxTxt));
        }

        if (isValid(this.m_barWinView, true)) {
            const winTxt = LocaleText.GetString("gamebar_total_win", BundleDefine.Module.VEGAS_SLOTS, "TOTAL WIN");
            this.m_barWinView.WinMessage = winTxt;
        }

        if (isValid(this.SpinButton, true)) {
            const autoTxt = LocaleText.GetString("gamebar_hold_for_auto", BundleDefine.Module.VEGAS_SLOTS, "HOLD FOR AUTO");
            this.SpinButton.SpinMessage = autoTxt;
        }
    }

    // //----------------------------------------------------------------
    // /**
    //  * 更新 Spin 按鈕的新手鎖定狀態
    //  */
    // protected UpdateSpinBtnNewbieLock(): void
    // {
    //     let levelClient = ClientData.Instance.LevelClient;
    //     if (this.m_clientLevel !== levelClient) {
    //         this.m_clientLevel = levelClient;
    //         this.SpinButton.NewbieLock = (levelClient < AppDefine.Config.GAME_AUTO_SPIN_LIMIT_LEVEL);
    //     }
    // }

    //----------------------------------------------------------------





    //================================================================
    // 自動玩相關
    //================================================================

    //----------------------------------------------------------------

    private m_isAutoPlaying: boolean = false;
    private m_isRecordedBeforeApply: boolean = false;
    private m_mainGameAutoPlayRound: number = 0;

    //----------------------------------------------------------------
    /** 自動玩次數 */
    public get AutoPlayRounds(): number {
        return this.SpinButton.AutoCount;
    }

    public set AutoPlayRounds(round: number) {
        const oldRound = this.AutoPlayRounds;
        this.SpinButton.AutoCount = round;
        ;
        if (oldRound <= 0 && round > 0 || round == Infinity) {
            this.OnAutoPlayStart(round);
        }
        else if (oldRound > 0 && round <= 0) {
            this.OnAutoPlayNoRemain();
        }
    }

    //----------------------------------------------------------------

    protected OnAutoPlayStart(round: number) {
        this.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
        EventDispatcher.Shared.Dispatch(EventDefine.Game.BAR_AUTO_PLAY_START);
        this.m_isAutoPlaying = true;
    }

    protected OnAutoPlayNoRemain() {
        EventDispatcher.Shared.Dispatch(EventDefine.Game.BAR_AUTO_PLAY_FINISHED);
    }

    //----------------------------------------------------------------
    /**
     * 取得目前自動玩次數並減一，若為無限次則回傳 `Number.POSITIVE_INFINITY`
     * @注意 次數歸零的瞬間就會派發 `EventDefine.Game.BAR_AUTO_PLAY_FINISHED` 事件
     */
    public TakeAutoPlayRounds(): number {
        return this.AutoPlayRounds--;
    }

    //----------------------------------------------------------------
    /** 停止自動玩 */
    public StopAutoPlay() {
        this.m_isAutoPlaying = false;
        this.AutoPlayRounds = 0;
    }

    //----------------------------------------------------------------
    /** 是否正在自動玩 */
    public IsInAutoPlay(): boolean {
        return this.AutoPlayRounds > 0 || this.m_isAutoPlaying;
    }

    //----------------------------------------------------------------
    /** 鎖住自動玩按鈕 */
    public LockAutoPlayMenu(): void {
        this.SpinButton.EnableAuto = false;
    }

    //----------------------------------------------------------------
    /** 解鎖自動玩按鈕 */
    public UnlockAutoPlayMenu(): void {
        this.SpinButton.EnableAuto = true;
    }

    //----------------------------------------------------------------
    /**
     * 紀錄自動玩次數
     * @param isInit 是否為斷線重連
     * */
    public RecordedAutoPlayRounds(isInit: boolean = false): void {
        if (this.m_isRecordedBeforeApply) {
            return;
        }

        if (isInit) {
            this.m_mainGameAutoPlayRound = 0;
            this.AutoPlayRounds = Number.POSITIVE_INFINITY;
        }
        else if (this.AutoPlayRounds > 0) {
            this.m_mainGameAutoPlayRound = this.AutoPlayRounds;
            this.AutoPlayRounds = Number.POSITIVE_INFINITY;
        }
        else {
            this.m_mainGameAutoPlayRound = 0;
        }

        this.m_isRecordedBeforeApply = true;
    }

    //----------------------------------------------------------------
    /**
     * 還原紀錄的自動玩次數
     */
    public ApplyRecordedAutoPlayRounds(): void {
        if (!this.m_isRecordedBeforeApply) {
            return;
        }

        if (this.m_mainGameAutoPlayRound > 0) {
            this.AutoPlayRounds = this.m_mainGameAutoPlayRound;
            this.m_mainGameAutoPlayRound = 0;
        }
        else {
            this.AutoPlayRounds = 0;
            this.m_mainGameAutoPlayRound = 0;
        }

        this.m_isRecordedBeforeApply = false;
    }

    //----------------------------------------------------------------

    /**
     * 紀錄ＭG自動玩狀態
     * @param isInit 是否為斷線重連
     * */
    public RecordedAutoPlayState(isInit: boolean = false): void {
        log("[GameBar][RecordedAutoPlayState] isInit(是否為斷線重連):", isInit);
        this.RecordedAutoPlayRounds(isInit);
    }

    /**
     * 特色遊戲結束檢查自動玩狀態
     * 請注意特色進特色時，呼叫時機
     * 次數：只會有 0 或 無限次infinity（次數已被拔除，目前round用於判斷是MG自動玩還是手動玩狀態）
     */
    public CheckAutoPlayState(): void {
        log("[GameBar][CheckAutoPlayState] AutoPlayRounds:", this.AutoPlayRounds, " m_mainGameAutoPlayRound :", this.m_mainGameAutoPlayRound);
        // [42-4] MG手動玩 > FG自動玩 > MG手動玩
        if (this.m_mainGameAutoPlayRound === 0) {
            log("[GameBar][CheckAutoPlayState] > [42-4] MG手動玩 > FG自動玩 > MG手動玩");
            this.SpinButtonState = GBDef.SpinButtonState.STOP_DISABLE;
            this.StopAutoPlay();
            this.m_isRecordedBeforeApply = false;
        } else {
            // [42-2] MG自動玩 > FG自動玩 > MG自動玩
            if (this.AutoPlayRounds === Number.POSITIVE_INFINITY) {
                // log( "[GameBar][CheckAutoPlayState] > [42-2] MG自動玩 > FG自動玩 > MG自動玩" );
                // [42-3] MG自動玩 > FG取消自動玩 > MG取消自動玩
            } else {
                log("[GameBar][CheckAutoPlayState] > [42-3] MG自動玩 > FG取消自動玩 > MG取消自動玩");
                this.m_mainGameAutoPlayRound = 0;
                this.StopAutoPlay();
            }
        }
    }

    // 自動玩 > 發送事件
    public AutoPlayStart(): void {
        if (!this.m_isAutoPlaying) {
            EventDispatcher.Shared.Dispatch(EventDefine.Game.BAR_AUTO_PLAY_START);
            this.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
            this.m_isAutoPlaying = true;
        }
    }

    //================================================================
    // 贏分特效
    //================================================================

    //----------------------------------------------------------------
    /** 總贏分 */
    public set WinValue(win: BigValuable) {
        this.m_barWinView.WinValue = win;
    }

    public get WinValue(): BigNumber {
        return this.m_barWinView.WinValue;
    }

    //----------------------------------------------------------------
    /** 自訂贏分格式化函式 */
    public set WinFormatFn(formatFn: (value: number | BigNumber) => string) {
        this.m_barWinView.WinValueFormatFn = formatFn;
    }

    public get WinFormatFn(): (value: number | BigNumber) => string {
        return this.m_barWinView.WinValueFormatFn;
    }

    //----------------------------------------------------------------
    /** 自訂贏分特效格式化函式 */
    public set WinEffectFormatFn(formatFn: (value: number | BigNumber) => string) {
        this.m_barWinView.WinEffectValueFormatFn = formatFn;
    }
    public get WinEffectFormatFn(): (value: number | BigNumber) => string {
        return this.m_barWinView.WinEffectValueFormatFn;
    }

    //----------------------------------------------------------------
    /** 贏分標籤 */
    public get WinLabel(): Label {
        return this.m_barWinView.WinLabel;
    }

    //----------------------------------------------------------------
    /** 設定贏分特效 */
    public ApplyWinEffectSettingList(list: ReadableWinEffectSettingList) {
        this.m_barWinView.ApplyWinEffectSettingList(list);
    }

    //----------------------------------------------------------------
    /**
     * 主要的播放贏分特效接口
     * @param finalValue    最終贏分值
     * @param callback      結束回調
     * @param effectSetting 特效設定
     * @param rollingCb     跑分中回調，用來更新跑分數值
     */
    public SetWinEffect(finalValue: BigValuable,
        callback?: Function,
        effectSetting?: GameBarWinEffectDefine.ReadableWinEffectSetting,
        rollingCb?: RollingCbAttribute[] | Function
    ): void {
        this.m_barWinView.SetWinEffect(this.m_betValue, finalValue, callback, effectSetting, rollingCb);
    }

    //----------------------------------------------------------------
    /**
     * 結束贏分特效
     */
    public TryEndWinEffect() {
        this.m_barWinView.TryEndWinEffect();
    }

    //----------------------------------------------------------------
    /**
     * 贏分跳過滾動直接顯示目標值
     * @param remain 保留時間(單位:毫秒) 預設為 10 毫秒，設定為 0 時永久保留
     */
    public WinValueSkip(remain?: number): void {
        this.m_barWinView.WinValueSkip(remain);
    }

    /**
     * 重置正在播放的贏分特效 (會清空贏分值)
     */
    public WinValueReset(): void {
        this.m_barWinView.WinValueReset();
    }

    /**
     * 重置正在播放的贏分特效 (會清空贏分值)
     */
    public WinEffectReset(): void {
        this.m_barWinView.WinValueReset();
    }

    //----------------------------------------------------------------
    /**
     * @尚未實作
     * 顯示贏分差值
     */
    public SetDeviationEnable(isDeviation: boolean) {
        this.m_barWinView.DeviationEnable = isDeviation;
    }

    //----------------------------------------------------------------





    //================================================================
    // UI 點擊事件
    //================================================================

    //----------------------------------------------------------------

    private m_uiNameClickCb: UINameClickCB = null;
    private m_eventTouchCb: EventTouchCB = null;
    private m_increaseBtnLongTouching: boolean = false;
    private m_reduceBtnLongTouching: boolean = false;

    //----------------------------------------------------------------
    /**
     * 設定按鍵回應
     * @param uiNameClickCb 各按鍵的click事件 (回傳按鍵名稱)
     * @param eventTouchCb 各按鍵的touch事件 (回傳事件)
     */
    public SetTouchEvent(uiNameClickCb: UINameClickCB, eventTouchCb: EventTouchCB): void {
        this.m_uiNameClickCb = uiNameClickCb;
        this.m_eventTouchCb = eventTouchCb;
    }

    //----------------------------------------------------------------
    /** 按鈕點擊事件 */
    private OnButtonClicked(sender: CommonButton, event: EventTouch) {
        const uiName = sender.node.name as GBDef.UI_NAME;
        this.HandleButtonClicked(uiName, event);
    }

    //----------------------------------------------------------------
    /** 處理 Spin 按鈕點擊事件 */
    private OnSpinButtonClicked(uiName: GBDef.UI_NAME, event: EventTouch): void {
        this.HandleButtonClicked(uiName, event);
    }

    //----------------------------------------------------------------
    /**
     * 處理事件觸發 UI 點擊
     */
    private OnEventClickUI(uiName: string): void {
        const parseUiName = uiName as GBDef.UI_NAME;
        const pseudoEvent = new EventTouch(null, false, Node.EventType.TOUCH_END);
        pseudoEvent.currentTarget = { name: uiName };

        this.HandleButtonClicked(parseUiName, pseudoEvent);
    }

    //----------------------------------------------------------------
    /** 處理按鈕點擊事件 */
    private HandleButtonClicked(uiName: string, event: EventTouch): void {
        this.m_uiNameClickCb?.(uiName as GBDef.UI_NAME);
        this.m_eventTouchCb?.(event);

        switch (uiName) {
            case GBDef.UI_NAME.BTN_INFO: {
                EventDispatcher.Shared.Dispatch(EventDefine.Game.INFO_BUTTON_PAYTABLE);
                break;
            }

            case GBDef.UI_NAME.BTN_MAX_BET: {
                if (this.AutoPlayRounds == 0) {
                    this.ClickMaxBet();
                }
                break;
            }

            case GBDef.UI_NAME.BTN_INCREASE: {
                AudioManager.Instance.Play(AudiosDefine.VEGAS_APP.BTN_CLICK);
                this.ClickIncreaseBet();
                break;
            }

            case GBDef.UI_NAME.BTN_REDUCE: {
                AudioManager.Instance.Play(AudiosDefine.VEGAS_APP.BTN_CLICK);
                this.ClickReduceBet();
                break;
            }

            case GBDef.UI_NAME.BTN_AUTOSTOP_C: {
                this.StopAutoPlay();
                break;
            }

            case GBDef.UI_NAME.AUTOPLAY_MENU: {
                this.ClickAutoPlayMenu();
                break;
            }
        }
    }

    //----------------------------------------------------------------

    private OnIncreaseBtnLongTouchStart(sender: CommonButton, event: EventTouch): void {
        this.m_increaseBtnLongTouching = true;
    }

    private OnIncreaseBtnLongTouchEnd(sender: CommonButton, event: EventTouch): void {
        this.m_increaseBtnLongTouching = false;
    }

    private OnReduceBtnLongTouchStart(sender: CommonButton, event: EventTouch): void {
        this.m_reduceBtnLongTouching = true;
    }

    private OnReduceBtnLongTouchEnd(sender: CommonButton, event: EventTouch): void {
        this.m_reduceBtnLongTouching = false;
    }

    //----------------------------------------------------------------





    //================================================================
    // BET 相關
    //================================================================

    //----------------------------------------------------------------

    private m_betIndex: number = -1;
    private m_betTable: number[] = null;
    private m_betValue: number = 0;
    private m_betDisplayMode: GBDef.BetDisplayMode = GBDef.BetDisplayMode.NUMBER;

    //----------------------------------------------------------------
    /** 當前押注值 */
    public get BetValue(): number {
        return this.m_betValue;
    }
    public set BetValue(betValue: number) {
        this.SetBetValue(betValue);
    }

    /** 當前押注值 (BigNumber) */
    public get BetValueBN(): BigNumber {
        return NumberUtils.ParseBigNumber(this.m_betValue);
    }

    /**
     * 設定押注值
     * @returns 是否成功設定
     */
    public SetBetValue(bet: number): boolean {
        return this._setBetValue(bet, true);
    }

    /**
     * 強制設定押注值
     */
    public ForceSetBetValue(bet: number) {
        this._setBetValue(bet, false);
    }

    /**
     * 設定押注值
     * @param newBet    新的押注值
     * @param isCheck   是否檢查押注值是否在押注表中
     * @returns         押注是否變更
     */
    private _setBetValue(newBet: number, isCheck: boolean): boolean {
        if (!this.m_betTable) {
            // 原版允許沒有betTable情況下設置BetValue, 不過小弟目前沒有想到使用情境
            warn("[GameBar] try to set bet value before setting bet table", this.m_betTable, newBet, isCheck);
            return false;
        }

        const oldBet = this.m_betValue;
        let newBetIndex = this.m_betTable.indexOf(newBet);

        // 需要檢查且新的押注值不在押注表中
        if (isCheck && newBetIndex == -1) {
            // 往上找最接近的押注值
            newBet = BetUtils.SearchRoundUp(newBet, this.m_betTable);
            newBetIndex = this.m_betTable.indexOf(newBet);

            // 如果還是找不到，就設定為最小押注
            if (newBetIndex == -1) {
                newBetIndex = 0;
                newBet = this.m_betTable[0];
            }
        }

        this.m_betValue = newBet;
        this.m_betIndex = newBetIndex;

        const isChange = oldBet != newBet;
        isChange && EventDispatcher.Shared.Dispatch(EventDefine.Game.BAR_BET_VALUE_CHANGED, newBet, newBetIndex);
        isChange && this.ShowBetUpCard();
        this.SetMaxBtnEnabled(this.SpinButtonState === GBDef.SpinButtonState.SPIN);

        if (this.m_betDisplayMode == GBDef.BetDisplayMode.NUMBER) {
            let betLockInfo = this.GenerateBetLockChangeInfo(newBet);
            this.UpdateLastBetUpStatus(betLockInfo, isChange);
            this.UpdateBetDisplay();
        }

        return isChange;
    }

    /**
     * 根據押注表的索引設定押注值
     * @param index 押注表的索引
     * @returns 押注是否變更
     */
    private _setBetValueByIndex(index: number): boolean {
        if (index < 0 || index > this.m_betTable.length - 1) {
            warn("[GameBar] try to set bet value by invalid index", index);
            return false;
        }

        if (index === this.m_betIndex) {
            return false;
        }

        const newBetValue = this.m_betTable[index];
        return this._setBetValue(newBetValue, true);
    }

    public get BetDisplayMode() { return this.m_betDisplayMode }
    public set BetDisplayMode(mode: GBDef.BetDisplayMode) {
        this.m_betDisplayMode = mode;
        this.UpdateBetDisplay();
    }

    /**
     * 根據當前的押注顯示模式更新押注顯示。
     */
    private UpdateBetDisplay() {
        if (this.m_betDisplayMode === GBDef.BetDisplayMode.NUMBER) {
            this.m_nowBetLabel.string = NumberUtils.Format(this.m_betValue, 12);
        } else {
            // this.m_nowBetLabel.string = LocaleText.GetString( "gamebar_average_bet", BundleDefine.Module.VEGAS_SLOTS, "AVERAGE BET" );
        }
    }

    private ClickAutoPlayMenu(): void {
        this.m_autoPlayBtnBond.Instance.active = true;
        this.m_autoPlayBtnBond.Instance.getComponent(GameBarAutoPlayMenu).Init(this);
    }

    //----------------------------------------------------------------
    /** 當前押注列表 */
    public get BetTable() {
        return this.m_betTable;
    }

    public set BetTable(betTable: number[]) {
        this.SetBetTable(betTable, true, true);
    }

    private m_betTableUpdate: boolean = false;
    public get IsBetTableUpdate(): boolean {
        return this.m_betTableUpdate;
    }

    public ResetBetTableUpdate() {
        this.m_betTableUpdate = false;
    }

    /**
     * 設定押注表
     * @param table     押注表
     * @param checkBet  是否檢查押注值是否在押注表中
     * @param checkBtn  是否檢查押注按鈕是否可用
     */
    private SetBetTable(table: number[], checkBet: boolean = true, checkBtn: boolean = true): void {
        this.m_betTable = table

        if (checkBet) {
            const newBet = this.m_betValue == 0 ? this.m_betTable[0] : this.m_betValue
            this._setBetValue(newBet, true)
        }

        if (checkBtn && this.SpinButtonState == GBDef.SpinButtonState.SPIN) {
            this.SetBetBtnEnabled(true)
        }
    }

    /**
     * 是否為最小押注
     */
    public IsMinimumBet(): boolean {
        return this.m_betIndex == 0;
    }

    /**
     * 是否為最大押注
     */
    public IsMaximumBet(): boolean {
        //TODO Ide
        return this.m_betIndex == this.m_betTable?.length - 1;
    }

    //----------------------------------------------------------------
    /**
     * 點擊最大押注按鈕
     */
    private ClickMaxBet(): void {
        if (!this.m_betTable) {
            warn("[GameBar] betTable not init before ClickMaxBet");
            return;
        }

        if (this.IsMaximumBet()) {
            this.m_maxBetBtn.Dismiss();
            return;
        }

        const newBetIndex = this.m_betTable.length - 1;
        this._setBetValueByIndex(newBetIndex);
    }

    //----------------------------------------------------------------
    /**
     * 點擊增加押注按鈕
     */
    private ClickIncreaseBet(): void {
        if (!this.m_betTable) {
            warn("[GameBar] betTable not init before ClickMaxBet");
            return;
        }

        if (this.IsMaximumBet()) {
            this._setBetValueByIndex(0);
        } else {
            this._setBetValueByIndex(this.m_betIndex + 1);
        }

        if (this.m_increaseBtnLongTouching && this.IsMaximumBet()) {
            this.m_increaseBtn.Dismiss();
        }
    }

    //----------------------------------------------------------------
    /**
     * 點擊減少押注按鈕
     */
    private ClickReduceBet(): void {
        if (!this.m_betTable) {
            warn("[GameBar] betTable not init before ClickMaxBet");
            return;
        }

        if (this.IsMinimumBet()) {
            const newBetIndex = this.m_betTable.length - 1;
            this._setBetValueByIndex(newBetIndex);
        } else {
            this._setBetValueByIndex(this.m_betIndex - 1);
        }

        if (this.m_reduceBtnLongTouching && this.IsMinimumBet()) {
            this.m_reduceBtn.Dismiss();
        }
    }

    //----------------------------------------------------------------
    /**
     * Enable 押注按鈕 
     */
    public SetBetBtnEnable(): void {
        this.SetBetBtnEnabled(true);
    }

    /**
     * Disable 押注按鈕 
     */
    public SetBetBtnDisable(): void {
        this.SetBetBtnEnabled(false);
    }

    /**
     * 設定可改變bet的按鈕可互動性
     * @param enable 
     */
    public SetBetBtnEnabled(enable: boolean): void {
        this.SetDecreaseBtnEnabled(enable);
        this.SetIncreaseBtnEnabled(enable);
        this.SetMaxBtnEnabled(enable);
    }

    /**
     * 設定減少押注按鈕是否可用
     */
    private SetDecreaseBtnEnabled(enable: boolean): void {
        if (enable && this.m_betTable?.length > 1) {
            this.m_reduceBtn.TouchEnabled = true;
        } else {
            this.m_reduceBtn.TouchEnabled = false;
        }
    }

    /**
     * 設定增加押注按鈕是否可用
     */
    private SetIncreaseBtnEnabled(enable: boolean): void {
        if (enable && this.m_betTable?.length > 1) {
            this.m_increaseBtn.TouchEnabled = true;
        } else {
            this.m_increaseBtn.TouchEnabled = false;
        }
    }

    /**
     * 設定最大押注按鈕是否可用
     */
    private SetMaxBtnEnabled(enable: boolean): void {
        if (enable && !this.IsMaximumBet()) {
            this.m_maxBetBtn.TouchEnabled = true;
        } else {
            this.m_maxBetBtn.TouchEnabled = false;
        }
    }

    //----------------------------------------------------------------





    //================================================================
    // BetUp 相關
    //================================================================

    //----------------------------------------------------------------

    private m_commonGameInfo: GameCommonCommand.CommonGameInfo = null;
    private m_lastBetUpStatus: Map<number, GBDef.BetLockStatus> = new Map();

    //----------------------------------------------------------------
    /**
     * BetUp: 設定 CommonGameInfo
     */
    public set CommonGameInfo(betInfo: GameCommonCommand.CommonGameInfo) {
        this.m_commonGameInfo = betInfo
        this.UpdateAvailableBetTable();
    }

    //----------------------------------------------------------------
    /**
     * 取得最新的BetUp狀態
     */
    public get LastBetUpStatus() {
        return new Map(this.m_lastBetUpStatus);
    }

    //----------------------------------------------------------------
    /**
     * 根據當前使用者的等級更新可用的押注表。
     */
    private UpdateAvailableBetTable() {
        if (!this.m_commonGameInfo?.BetList) {
            warn("[GameBar] CommonBetInfo is not initialized before GenerateAvailableBetTable");
            return;
        }

        const betTable: number[] = [];
        const level: number = 100//ClientData.Instance.LevelServer;
        const IsInRange = (num: number, min: number, max: number) => {
            return num >= min && (num <= max || max == 0)
        }

        for (let i = 0; i < this.m_commonGameInfo.BetList.length; i++) {
            const betInfo = this.m_commonGameInfo.BetList[i];
            if (IsInRange(level, betInfo.MinLevel, betInfo.MaxLevel)) {
                betTable.push(betInfo.Bet);
            }
        }


        this.m_betTableUpdate = betTable.length > 0 && this.m_betTable && this.m_betTable?.length > 0 && this.m_betTable?.length < betTable.length;
        this.BetTable = betTable;
    }

    //----------------------------------------------------------------
    /**
     * 根據舊的押注值和新的押注值生成一個 `BetLockChangeInfo` 對象的數組。
     * @param oldBet 舊的押注值。
     * @param newBet 新的押注值。
     * @returns 代表押注鎖狀態變化的 `BetLockChangeInfo` 對象數組。
     */
    private GenerateBetLockChangeInfo(newBet: number): GBDef.BetLockChangeInfo[] {
        if (!this.m_commonGameInfo?.UnlockList) {
            warn("[GameBar] CommonBetInfo is not initialized before UpdateUnLockInfo");
            return [];
        }

        const betLockInfo: GBDef.BetLockChangeInfo[] = [];

        for (let i = 0; i < this.m_commonGameInfo.UnlockList.length; i++) {
            const unlockInfo = this.m_commonGameInfo.UnlockList[i];
            const oldStatus: GBDef.BetLockStatus = this.m_lastBetUpStatus.get(unlockInfo.UnlockType) ? this.m_lastBetUpStatus.get(unlockInfo.UnlockType) : GBDef.BetLockStatus.NONE;
            const newStatus: GBDef.BetLockStatus = this.GetBetLockStatus(unlockInfo.UnlockType, newBet);

            let betLockChangeInfo: GBDef.BetLockChangeInfo =
            {
                UnLockType: unlockInfo.UnlockType,
                LastStatus: oldStatus,
                CurrentStatus: newStatus,
                UnLockLevel: unlockInfo.UnlockLevel,
            }
            betLockInfo.push(betLockChangeInfo);
        }

        return betLockInfo;
    }

    //----------------------------------------------------------------
    /**
     * 根據提供的押注鎖定信息更新最後的押注上升狀態。
     * @param betLockInfo - 押注鎖定信息的數組。
     */
    private UpdateLastBetUpStatus(betLockInfo: GBDef.BetLockChangeInfo[], isBetChange: boolean = false): void {
        for (let i = 0; i < betLockInfo.length; i++) {
            this.m_lastBetUpStatus.set(betLockInfo[i].UnLockType, betLockInfo[i].CurrentStatus);
        }

        log("[GameBar] 更新押注鎖定狀態: ", betLockInfo);

        EventDispatcher.Shared.Dispatch(EventDefine.Game.BET_UP_STATUS_CHANGED, betLockInfo, isBetChange);
    }

    //----------------------------------------------------------------
    /**
     * 根據獎勵類型和押注金額獲取押注鎖定狀態。
     * @param awardType - 獎勵類型。
     * @param bet - 押注金額。
     * @returns 押注鎖定狀態。
     */
    private GetBetLockStatus(awardType: number, bet: number): GBDef.BetLockStatus {
        const level: number = 100;// ClientData.Instance.LevelServer;

        for (let i = 0; i < this.m_commonGameInfo.UnlockList.length; i++) {
            if (this.m_commonGameInfo.UnlockList[i].UnlockType == awardType) {
                if (bet === 0) {
                    return GBDef.BetLockStatus.NONE;
                } else if (bet >= this.m_commonGameInfo.UnlockList[i].Bet) {
                    return GBDef.BetLockStatus.UNLOCK;
                } else if (level < this.m_commonGameInfo.UnlockList[i].UnlockLevel) {
                    return GBDef.BetLockStatus.LOCK_BY_LEVEL;
                } else {
                    return GBDef.BetLockStatus.LOCK;
                }
            }
        }

        warn(`[GameBar] GetBetLockStatus: awardType ${awardType} not found`);
        return GBDef.BetLockStatus.NONE;
    }

    private OnHideEventMission(): void {
        EventDispatcher.Shared.Dispatch(EventDefine.Game.BAR_BET_VALUE_CHANGED, this.m_betValue, this.m_betIndex);
    }

    //----------------------------------------------------------------
    /**
     * 更新解鎖資訊。
     * @param lockInfo - 解鎖資訊資料。
     */
    public UpdateUnLockInfo(lockInfo: GameCommonCommand.UnLockInfo[]): void {
        if (!this.m_commonGameInfo?.UnlockList) {
            warn("[GameBar] CommonBetInfo is not initialized before UpdateUnLockInfo");
            return;
        }

        this.m_commonGameInfo.UnlockList = lockInfo;
        const BetUpChangeInfo = this.GenerateBetLockChangeInfo(this.m_betValue);
        this.UpdateLastBetUpStatus(BetUpChangeInfo);
    }

    //----------------------------------------------------------------


    //----------------------------------------------------------------
    /**
     * BetUP。
     * @param lockInfo - 解鎖資訊資料。
     */
    private ShowBetUpCard(): void {
        if (!this.m_commonGameInfo?.BetList) {
            warn("[GameBar] CommonBetInfo is not initialized before UpdateUnLockInfo");
            return;
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 測試用
    //================================================================

    //----------------------------------------------------------------

    private m_cheatEnabled: boolean = undefined;

    //----------------------------------------------------------------
    /** 是否啟用特殊輸入框 */
    public get CheatEnabled(): boolean {
        return this.m_cheatEnabled ?? false;
    }

    //----------------------------------------------------------------
    /** 取得特殊輸入框數字 */
    public get CheatType(): number {
        if (isValid(this.m_delegate, true)) {
            return this.m_delegate.GetQACode();
        }

        if (!EnvConfig.IS_DEV) {
            return 0;
        }

        let cheatCode = parseInt(this.m_cheatEditBox.string);
        return isNaN(cheatCode) ? 0 : cheatCode;
    }

    //----------------------------------------------------------------
    /** 啟動測試用輸入框，可透過 CheatType 取回目前輸入的數字 */
    public ActiveQATest(isActive: boolean = false): void {
        if (!EnvConfig.IS_DEV) {
            isValid(this.m_cheatEditBox, true) && (this.m_cheatEditBox.node.active = false);
            return;
        }

        if (this.m_cheatEnabled !== isActive) {
            this.m_cheatEnabled = isActive;
            if (isValid(this.m_cheatEditBox, true)) {
                if (this.m_cheatEnabled) {
                    this.m_cheatEditBox.node.active = true;
                    this.m_cheatEditBox.node.on(EditBox.EventType.EDITING_DID_ENDED, this.OnCheatEditBoxEditingDidEnded, this);
                } else {
                    this.m_cheatEditBox.node.active = false;
                    this.m_cheatEditBox.node.off(EditBox.EventType.EDITING_DID_ENDED, this.OnCheatEditBoxEditingDidEnded, this);
                }
            }
        }
    }

    protected OnCheatEditBoxEditingDidEnded(editBox: EditBox): void {
        if (this.m_delegate) {
            this.m_delegate.SetQACode(editBox.string);
        }
        if (editBox.string === "99999") {
            this.ActiveQATest(false);
        }
    }
}

/**
 * @deprecated Use `GameBarDefine.BetLockStatus` instead.
 */
export type BetLockStatus = GBDef.BetLockStatus;
export const BetLockStatus = GBDef.BetLockStatus;

/**
 * @deprecated Use `GameBarDefine.BetLockChangeInfo` instead.
 */
export interface BetLockChangeInfo extends GBDef.BetLockChangeInfo { }
