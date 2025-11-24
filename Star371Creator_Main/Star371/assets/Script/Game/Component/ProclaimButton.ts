import { _decorator, math, Node, Component, UITransform, Label, log } from "cc";
import { BundleDefine } from "../../Define/BundleDefine";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { TouchableEvent } from "db://assets/Stark/Interactive/Touchable";
import CommonButton from "db://assets/Stark/Interactive/CommonButton";
import { TweenOpacity } from "db://assets/Stark/TweenFunc/TweenOpacity";
import { LocaleText } from "../../Locale/LocaleText";

const { ccclass, property } = _decorator;


const enum ButtonType
{
    START,
    COLLECT,
}


//================================================================================================
/**
 * 遊戲宣告按鈕 (開始/領取)
 */
//================================================================================================

@ccclass
export default class ProclaimButton extends Component
{
    //----------------------------------------------------------------
    /**
     * 自動玩延遲時間 (秒)
     */
    public static readonly AUTOPLAY_DELAYTIME: number = 5;

    //----------------------------------------------------------------

    @property({ type: CommonButton, displayName: "Photo" })
    private m_photoBtn: CommonButton = null;

    @property({ type: CommonButton, displayName: "Collect" })
    private m_collectBtn: CommonButton = null;

    //----------------------------------------------------------------

    private m_endCallback:          Function    = null;     // 結束的CB
    private m_skipCallback:         Function    = null;     // 略過跑分的CB
    private m_touchEventEnabled:    boolean     = false;    // 是否開啟節點事件
    private m_debugLog:             boolean     = false;

    //----------------------------------------------------------------
    /** 螢幕截圖按鈕 (目前尚未實作) */
    public get PhotoButton() {
        return this.m_photoBtn;
    }

    //----------------------------------------------------------------
    /** 收集按鈕 */
    public get CollectButton() {
        return this.m_collectBtn;
    }

    //----------------------------------------------------------------
    /** 是否開啟除錯訊息 */
    public get DebugLog(): boolean {
        return this.m_debugLog;
    }
    public set DebugLog(bool: boolean) {
        this.m_debugLog = bool;
    }

    //----------------------------------------------------------------

    onLoad() {
        this.m_collectBtn.node.active = false;
        this.m_photoBtn.node.active = false;
    }

    //----------------------------------------------------------------
    /**
     * 快轉動畫/略過跑分（跑分結算專用）- 全版面點擊(尚未顯示任何按鈕)
     * @param skipCallback 略過跑分的CB
     */
    public SetSkipTouchEvent(skipCallback: Function): void
    {
        this.m_debugLog && log("[ProclaimButton] SetSkipTouchEvent");

        this.node.active = true;
        this.m_collectBtn.node.active = false;
        this.m_skipCallback = skipCallback;
        this.SetTouchEventEnabled( true );
    }

    //----------------------------------------------------------------
    /**
     * 單純設定Btn事件
     * @param endCallback 點擊後事件
     * @param pos 針對的是按鈕位置 不是整個節點
     */
    public SetButtonTouchEvent(endCallback: Function, pos: math.Vec3): void
    {
        this.node.active = true;
        this.m_collectBtn.node.active = true;
        this.m_collectBtn.node.setPosition( pos );
        NodeUtils.SetOpacity( this.m_collectBtn.node, 0 );

        this.m_endCallback = endCallback;
        this.SetTouchEventEnabled( true );
    }

    //----------------------------------------------------------------
    /**
     * 顯示按鈕 - 開始
     * @param time 淡出時間 (秒)
     */
    public ShowStartButton(time?: number): void
    {
        this.ShowButtonV2( ButtonType.START, time );
    }

    //----------------------------------------------------------------
    /**
     * 顯示按鈕 - 收集
     * @param time 淡出時間 (秒)
     */
    public ShowCollectButton(time?: number): void
    {
        this.ShowButtonV2( ButtonType.COLLECT, time );
        this.ClearSkipClickCB();
    }

    //----------------------------------------------------------------
    /**
     * 結束顯示
     * @param time 淡出時間 (秒)
     */
    public End(time?: number): void
    {
        this.HideButton( time );
    }

    //----------------------------------------------------------------
    /**
     * 顯示按鈕
     * @param buttonType 按鈕類型
     * @param time 淡出時間 (秒)
     */
    private ShowButtonV2(buttonType: ButtonType, time: number = 0.15): void
    {
        this.m_debugLog && log(`[ProclaimButton] ShowButtonV2( ${(buttonType==ButtonType.START) ? "開始" : "領取"} , ${time}s )`);

        const label = NodeUtils.GetUI(this.m_collectBtn.node, "Label").getComponent(Label);
        const strKey = buttonType == ButtonType.START ? "proclaim_button_start" : "proclaim_button_collect";
        label.string = LocaleText.GetString( strKey, BundleDefine.Module.VEGAS_SLOTS );
        label.updateRenderData(true);

        this.node.active = true;
        this.m_collectBtn.node.active = true;
        this.SetTouchEventEnabled( false );

        // 觸發自動隱藏
        const triggerAutoHide = ()=>
        {
            // 開啟節點事件
            this.SetTouchEventEnabled( true );

            if (GamesChief.Status.AutoSpinning) {
                this.m_debugLog && log(`[ProclaimButton] ShowButtonV2 > triggerAutoHide > 自動玩模式 ( ${ProclaimButton.AUTOPLAY_DELAYTIME} 秒後自動隱藏)`);
                this.ClearSkipClickCB();
                this.scheduleOnce( this.OnTouchEvent, ProclaimButton.AUTOPLAY_DELAYTIME );
            }
            else {
                this.m_debugLog && log("[ProclaimButton] ShowButtonV2 > triggerAutoHide > 非自動玩模式");
            }
        };

        if (time > 0) {
            NodeUtils.SetOpacity( this.m_collectBtn.node, 0 );
            TweenOpacity.StartToOpacity( this.m_collectBtn.node, 255, time, triggerAutoHide );
        }
        else {
            NodeUtils.SetOpacity( this.m_collectBtn.node, 255 );
            triggerAutoHide();
        }
    }

    //----------------------------------------------------------------
    /**
     * 隱藏按鈕
     * @param time 淡出時間 (秒)
     */
    private HideButton(time: number = 0.15): void
    {
        this.m_debugLog && log(`[ProclaimButton] HideButton( ${time}s )`);

        this.SetTouchEndEnabled( false );
        this.SetTouchEventEnabled( false );

        const onHidden = ()=>
        {
            this.node.active = false;
            this.m_collectBtn.node.active = false;
        };

        if (time > 0) {
            TweenOpacity.StartToOpacity( this.m_collectBtn.node, 0, time, onHidden );
        }
        else {
            NodeUtils.SetOpacity( this.m_collectBtn.node, 0 );
            onHidden();
        }
    }

    //----------------------------------------------------------------
    /**
     * 清除略過動畫與跑分的回調事件
     */
    private ClearSkipClickCB(): void
    {
        this.m_debugLog && log("[ProclaimButton] ClearSkipClickCB > 清除略過動畫與跑分的回調事件");
        this.m_skipCallback = null;
    }

    //----------------------------------------------------------------
    /**
     * 設定事件監聽
     */
    private SetTouchEventEnabled(enabled: boolean): void
    {
        if (this.m_touchEventEnabled !== enabled) {
            this.m_touchEventEnabled = enabled;

            if (enabled) {
                this.node.on(TouchableEvent.Clicked, this.OnTouchEvent, this);
                this.m_collectBtn.node.on(TouchableEvent.Clicked, this.OnTouchEvent, this);
            } else {
                this.unschedule( this.OnTouchEvent );
                this.node.off(TouchableEvent.Clicked, this.OnTouchEvent, this);
                this.m_collectBtn.node.off(TouchableEvent.Clicked, this.OnTouchEvent, this);
            }
        }
    }

    //----------------------------------------------------------------
    /**
     * 點擊事件
     */
    private OnTouchEvent(): void
    {
        this.m_debugLog && log("[ProclaimButton] OnTouchEvent");

        if (this.m_skipCallback) {
            this.m_debugLog && log("[ProclaimButton] OnTouchEvent > 略過動畫與跑分");
            const skipCallback = this.m_skipCallback;
            this.ClearSkipClickCB();
            skipCallback();
        }
        else if (this.m_endCallback) {
            this.m_debugLog && log("[ProclaimButton] OnTouchEvent > 點擊收集或開始按鈕");
            const endCallback = this.m_endCallback;
            this.m_endCallback = null;
            endCallback();
            this.HideButton();
        }
    }

    //----------------------------------------------------------------



    //================================================================
    // Deprecated
    //================================================================

    //----------------------------------------------------------------

    private m_touchEndEnabled: boolean = false;

    //----------------------------------------------------------------
    /** @deprecated 請使用 ShowStartButton */
    public SetStartState(callback: Function, isAutoPlay: boolean, shareSetting?: any) {
        this.ShowButton(callback, isAutoPlay, ButtonType.START)
    }

    /** @deprecated 請使用 ShowCollectButton */
    public SetCollectState(callback: Function, isAutoPlay: boolean, shareSetting?: any) {
        this.ShowButton(callback, isAutoPlay, ButtonType.COLLECT)
    }

    /** @deprecated */
    private ShowButton(callback: Function, isAutoPlay: boolean, buttonType: ButtonType)
    {
        this.m_endCallback = callback;

        const label = NodeUtils.GetUI(this.m_collectBtn.node, "Label").getComponent(Label);
        const strKey = buttonType == ButtonType.START ? "proclaim_button_start" : "proclaim_button_collect";
        label.string = LocaleText.GetString( strKey, BundleDefine.Module.VEGAS_SLOTS );
        label.updateRenderData(true);

        this.m_collectBtn.getComponent(UITransform).width = label.node.getComponent(UITransform).width + 55;
        this.node.active = true;
        this.m_collectBtn.node.active = true;
        this.SetTouchEndEnabled( false );

        NodeUtils.SetOpacity( this.m_collectBtn.node, 0 );
        TweenOpacity.StartToOpacity( this.m_collectBtn.node, 255, 0.15, ()=>
        {
            this.SetTouchEndEnabled( true );
            isAutoPlay && this.scheduleOnce( this.OnTouchEnd, ProclaimButton.AUTOPLAY_DELAYTIME );
        });
    }

    //----------------------------------------------------------------
    /** @deprecated */
    private SetTouchEndEnabled(enabled: boolean): void
    {
        if (this.m_touchEndEnabled !== enabled) {
            this.m_touchEndEnabled = enabled;

            if (enabled) {
                this.node.on(TouchableEvent.Clicked, this.OnTouchEnd, this);
                this.m_collectBtn.node.on(TouchableEvent.Clicked, this.OnTouchEnd, this);
            }
            else {
                this.unschedule( this.OnTouchEnd );
                this.node.off(TouchableEvent.Clicked, this.OnTouchEnd, this);
                this.m_collectBtn.node.off(TouchableEvent.Clicked, this.OnTouchEnd, this);
            }
        }
    }

    //----------------------------------------------------------------
    /** @deprecated 點擊結束事件 */
    private OnTouchEnd(): void
    {
        if (this.m_endCallback) {
            const cb = this.m_endCallback;
            this.m_endCallback = null;
            cb();
        }
        this.HideButton();
    }

    //----------------------------------------------------------------

}
