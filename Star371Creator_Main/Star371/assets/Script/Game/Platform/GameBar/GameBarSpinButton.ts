import { _decorator, CCInteger, Enum, Node, Component, Animation, Label, Widget, Layout, EventTouch, Tween, tween, UIOpacity, sp, isValid, game, Game, error } from "cc";
import { GameBarDefine as GBDef } from "./GameBarDefine";
import { EventDefine } from "../../../Define/EventDefine";
import { Device } from "../../../Device/Device";
import { PrefabBond } from "../../../Toolkit/PrefabBond";
import Touchable, { TouchableEvent } from "db://assets/Stark/Interactive/Touchable";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";

const { ccclass, property } = _decorator;

const CONTENT_CENTER_PRESSED    = 0;
const CONTENT_CENTER_UNPRESSED  = 8;


type SpinBtnClickCB = (uiName: GBDef.UI_NAME, event?: EventTouch) => void;


enum IdleFxBlockType
{
    DEACTIVATED     = "block_type_deactivated",
    NON_SPIN_STATE  = "block_type_non_spin_state",
    BTN_PRESSED     = "block_type_btn_pressed",
}


//================================================================================================
/**
 * GameBar Spin Button
 */
//================================================================================================

@ccclass
export default class GameBarSpinButton extends Component
{
    //----------------------------------------------------------------

    @property({ type: CCInteger })
    private _spinBtnState: GBDef.SpinButtonState = GBDef.SpinButtonState.SPIN;

    @property({ type: Enum(GBDef.SpinButtonState), displayName: "狀態預覽" })
    private get e_spinBtnState(): GBDef.SpinButtonState { return this._spinBtnState; }
    private set e_spinBtnState(state: GBDef.SpinButtonState) {
        this._spinBtnState = state;
        this.OnStateChanged( state );
    }

    //----------------------------------------------------------------

    @property({ type: Touchable, displayName: "關閉自動", group: { id: 'gamebar_spinbtn', name: "Auto" } })
    protected m_autoCloseTouch: Touchable = null;

    //----------------------------------------------------------------

    @property({ type: Touchable, displayName: "按鈕元件", group: { id: 'gamebar_spinbtn', name: "Spin" } })
    protected m_touchButton: Touchable = null;

    @property({ type: [Node], displayName: "一般圖層", group: { id: 'gamebar_spinbtn', name: "Spin" } })
    protected m_normalNodes: Node[] = [];

    @property({ type: [Node], displayName: "按下圖層", group: { id: 'gamebar_spinbtn', name: "Spin" } })
    protected m_pressedNodes: Node[] = [];

    @property({ type: [Node], displayName: "禁用圖層", group: { id: 'gamebar_spinbtn', name: "Spin" } })
    protected m_disabledNodes: Node[] = [];

    @property({ type: [Node], displayName: "Spin 圖層", group: { id: 'gamebar_spinbtn', name: "Spin" } })
    protected m_spinNodes: Node[] = [];

    @property({ type: [Node], displayName: "Stop 圖層", group: { id: 'gamebar_spinbtn', name: "Spin" } })
    protected m_stopNodes: Node[] = [];

    //----------------------------------------------------------------

    @property({ type: Widget, displayName: "內容容器", group: { id: 'gamebar_spinbtn', name: "Content" } })
    protected m_contentWidget: Widget = null;

    @property({ type: Label, displayName: "Spin 訊息", group: { id: 'gamebar_spinbtn', name: "Content" } })
    protected m_spinMessage: Label = null;

    @property({ type: Layout, displayName: "Stop Layout", group: { id: 'gamebar_spinbtn', name: "Content" } })
    protected m_stopLayout: Layout = null;

    @property({ type: Node, displayName: "Stop Footer", group: { id: 'gamebar_spinbtn', name: "Content" } })
    protected m_stopFooter: Node = null;

    @property({ type: Label, displayName: "Footer Label", group: { id: 'gamebar_spinbtn', name: "Content" } })
    protected m_footerLabel: Label = null;

    @property({ type: Node, displayName: "Footer Infinity", group: { id: 'gamebar_spinbtn', name: "Content" } })
    protected m_footerInfinity: Node = null;

    //----------------------------------------------------------------

    protected m_touchBlocked: boolean = false;

    //----------------------------------------------------------------
    /** Spin 按鈕訊息 */
    public set SpinMessage(value: string){
        this.m_spinMessage.string = value;
    }

    //----------------------------------------------------------------

    private m_btnState: GBDef.SpinButtonState = null;

    /** Spin 按鈕的狀態 */
    public get State(): GBDef.SpinButtonState {
        return this.m_btnState;
    }

    public set State(state: GBDef.SpinButtonState)
    {
        if (this.m_btnState !== state) {
            this.m_btnState = state;
            this.OnStateChanged( state );
        }
    }

    //----------------------------------------------------------------

    private m_autoCount: number = 0;

    /** 自動次數 */
    public get AutoCount(): number {
        return this.m_autoCount;
    }

    public set AutoCount(count: number)
    {
        if (this.m_autoCount !== count) {
            this.m_autoCount = count > 0 ? count : 0;
            this.OnAutoCountChanged( count );
        }
    }

    //----------------------------------------------------------------

    private m_enableAuto: boolean = true;

    /** 啟用自動功能 */
    public get EnableAuto(): boolean {
        return this.m_enableAuto;
    }

    public set EnableAuto(enabled: boolean)
    {
        if (this.m_enableAuto !== enabled) {
            this.m_enableAuto = enabled;
        }
    }

    //----------------------------------------------------------------

    private m_isPressed: boolean = false;

    /** 是否按下 */
    public get IsPressed(): boolean {
        return this.m_isPressed;
    }

    protected set IsPressed(pressed: boolean)
    {
        if (this.m_isPressed !== pressed) {
            this.m_isPressed = pressed;
            this.OnPressedChanged( pressed );
        }
    }
    //----------------------------------------------------------------

    private m_newbieLock: boolean = false;

    /** 新手鎖定 */
    public get NewbieLock(): boolean {
        return this.m_newbieLock;
    }

    public set NewbieLock(bool: boolean) {
        this.m_newbieLock = bool;
        this.m_spinMessage.node.active = !bool;
    }

    //----------------------------------------------------------------

    private m_clickCB: SpinBtnClickCB = null;

    /** 按鈕點擊事件 */
    public set ClickCB(cb: SpinBtnClickCB) {
        this.m_clickCB = cb;
    }

    //----------------------------------------------------------------

    protected onLoad(): void
    {
        this.State = GBDef.SpinButtonState.SPIN;
        this.m_autoCloseTouch.TouchEnabled = false;
        game.on(Game.EVENT_HIDE, this.OnGameHide, this);
    }

    //----------------------------------------------------------------

    protected onEnable(): void
    {
        this.node.on( Node.EventType.SIZE_CHANGED, this.OnSelfSizeChanged, this );
        this.m_touchButton.On( TouchableEvent.EnterArea, this.OnTouchEnterArea, this );
        this.m_touchButton.On( TouchableEvent.LeaveArea, this.OnTouchLeaveArea, this );
        this.m_touchButton.On( TouchableEvent.Clicked, this.OnTouchClicked, this );
    }

    //----------------------------------------------------------------

    protected onDisable(): void
    {
        this.node.off( Node.EventType.SIZE_CHANGED, this.OnSelfSizeChanged, this );
        this.m_touchButton.Off( TouchableEvent.EnterArea, this.OnTouchEnterArea, this );
        this.m_touchButton.Off( TouchableEvent.LeaveArea, this.OnTouchLeaveArea, this );
        this.m_touchButton.Off( TouchableEvent.Clicked, this.OnTouchClicked, this );
    }

    //----------------------------------------------------------------

    protected onDestroy(): void
    {
        game.off(Game.EVENT_HIDE, this.OnGameHide, this);
    }

    //----------------------------------------------------------------

    protected OnSelfSizeChanged(): void
    {
    }

    //----------------------------------------------------------------

    protected OnStateChanged( newState: GBDef.SpinButtonState ): void
    {
        const viewSetting = GBDef.SpinButtonViewSettings[ newState ];
        if (viewSetting)
        {
            this.m_spinNodes.forEach( node => node.active = viewSetting.spinVisible );
            this.m_stopNodes.forEach( node => node.active = viewSetting.stopVisible );
            this.m_disabledNodes.forEach( node => node.active = viewSetting.disabledView );
            this.m_stopFooter.active    = viewSetting.stopFooter;
            this.m_touchBlocked         = !viewSetting.clickable;
        }
        else {
            error( `UNKNOWN SpinButtonState : ${ newState }` );
        }
    }

    //----------------------------------------------------------------

    protected OnAutoCountChanged( autoCount: number ): void
    {
        if (autoCount >= Number.MAX_SAFE_INTEGER) {
            this.m_footerLabel.string       = `SPINS `;
            this.m_footerLabel.node.active  = true;
            this.m_footerInfinity.active    = true;
        }
        else if (autoCount >= 0) {
            this.m_footerLabel.string       = `SPINS ${ Math.ceil( autoCount ) }`;
            this.m_footerLabel.node.active  = true;
            this.m_footerInfinity.active    = false;
        }
        else {
            this.m_footerLabel.string       = '';
            this.m_footerLabel.node.active  = false;
            this.m_footerInfinity.active    = true;
        }
    }
    //----------------------------------------------------------------

    protected OnPressedChanged( pressed: boolean ): void
    {
        this.m_normalNodes.forEach( node => node.active = !pressed );
        this.m_pressedNodes.forEach( node => node.active = pressed );
        this.m_contentWidget.verticalCenter = pressed ? CONTENT_CENTER_PRESSED : CONTENT_CENTER_UNPRESSED;
    }

    //----------------------------------------------------------------


    //----------------------------------------------------------------

    protected OnTouchEnterArea(sender: Touchable): void
    {
        if (!this.m_touchBlocked) {
            this.IsPressed = true;
        }
    }

    protected OnTouchLeaveArea(sender: Touchable): void
    {
        this.IsPressed = false;
        //如果按鈕還是SPIN圖層，則要Dismiss掉
        if(this.State === GBDef.SpinButtonState.SPIN){
            this.m_touchButton.Dismiss();
        }
    }

    protected OnTouchClicked(sender: Touchable, ccEvent: EventTouch): void
    {
        if (!this.m_touchBlocked && this.m_clickCB)
        {
            switch (this.State)
            {
                case GBDef.SpinButtonState.SPIN: {
                    this.m_clickCB( GBDef.UI_NAME.BTN_SPIN, ccEvent );
                    break;
                }

                case GBDef.SpinButtonState.STOP: {
                    this.m_clickCB( GBDef.UI_NAME.BTN_SPINSTOP, ccEvent );
                    break;
                }

                case GBDef.SpinButtonState.CANCEL_AUTO: {
                    this.m_clickCB( GBDef.UI_NAME.BTN_AUTOSTOP, ccEvent );
                    break;
                }
            }
        }
    }

    protected OnGameHide(): void
    {
        //應用程式隱藏，要把點擊註銷
        this.m_touchButton.Dismiss();
    }

    //----------------------------------------------------------------

    //================================================================
    // Spin Button Idle Effect
    //================================================================

    //----------------------------------------------------------------

    private m_idleFxBlockTypes  :Set<IdleFxBlockType>   = new Set();
    private m_idleFxEnabled     :boolean                = false;
    private m_idleFxTween       :Tween<UIOpacity>       = null;
    private m_idleFxAnim        :Animation              = null;

    
    //----------------------------------------------------------------

}