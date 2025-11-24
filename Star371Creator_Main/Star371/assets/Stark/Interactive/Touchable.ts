import {
    _decorator, isValid, CCInteger, Component, Node, EventTouch, UITransform,
    Vec2, warn
} from "cc"
import { EventDispatcher } from "../Utility/EventDispatcher"
import { NodeUtils } from "../FuncUtils/NodeUtils"

const { ccclass, property, menu } = _decorator

// 點擊冷卻時間(單位：毫秒)
const DEFAULT_COOL_TIME = 125

/** Touchable 事件 */
export enum TouchableEvent {
    Enabled = "TOUCHABLE_EVENT.enabled",
    Disabled = "TOUCHABLE_EVENT.disabled",
    Start = "TOUCHABLE_EVENT.start",
    Move = "TOUCHABLE_EVENT.move",
    End = "TOUCHABLE_EVENT.end",
    Clicked = "TOUCHABLE_EVENT.clicked",
    Cancel = "TOUCHABLE_EVENT.cancel",
    Release = "TOUCHABLE_EVENT.release",
    EnterArea = "TOUCHABLE_EVENT.enter_area",
    LeaveArea = "TOUCHABLE_EVENT.leave_area",
    LongTouchStart = "TOUCHABLE_EVENT.long_touch_start",
    LongTouching = "TOUCHABLE_EVENT.long_touching",
    LongTouchEnd = "TOUCHABLE_EVENT.long_touch_end",
}

/** Touchable 事件回調 */
export type TouchableEventCallback = (sender: Touchable, ccEvent?: EventTouch, ...args: any[]) => void

//================================================================================================
/**
 * Touchable
 */
//================================================================================================

@ccclass
@menu("Touchable/Touchable")
export default class Touchable extends Component {

    //----------------------------------------------------------------

    @property({
        type: CCInteger,
        range: [0, 32767],
        tooltip: "識別標籤",
        displayName: "Tag"
    })
    private m_tag: number = 0

    //----------------------------------------------------------------
    // 是否啟用點擊功能
    @property({
        tooltip: "是否啟用點擊功能",
        displayName: "Can Touch"
    })
    protected m_touchEnabled: boolean = true

    //----------------------------------------------------------------
    // 是否獨佔點擊功能
    @property({
        tooltip: "是否獨佔點擊事件，讓事件不往父層傳遞",
        displayName: "Swallow"
    })
    protected m_swallowTouch: boolean = true

    //----------------------------------------------------------------
    // 是否啟用 Node 事件
    @property({
        tooltip: "是否啟用 Node 事件",
        displayName: "Node Event"
    })
    protected m_nodeEventEnabled: boolean = true

    //----------------------------------------------------------------
    // 按鈕冷卻時間
    @property({
        tooltip: "點擊冷卻時間(單位：毫秒)",
        displayName: "Cool Time",
        min: 0
    })
    protected m_coolTime: number = DEFAULT_COOL_TIME

    //----------------------------------------------------------------
    // 是否啟用長按功能
    @property({
        tooltip: "是否啟用長按功能",
        displayName: "Long Touch Detect",
    })
    protected m_longTouchEnabled: boolean = false

    //----------------------------------------------------------------
    @property({
        tooltip: "開始觸發長按功能的延遲時間(單位：秒)",
        displayName: "Long Touch Delay Start",
        visible: function () {
            return this.m_longTouchEnabled
        }
    })
    protected m_longTouchStartTime: number = 1

    //----------------------------------------------------------------
    @property({
        tooltip: "長按觸發後每次觸發的間隔時間(單位：秒)",
        displayName: "Long Touch Interval",
        visible: function () {
            return this.m_longTouchEnabled
        }
    })
    protected m_longTouchIntervalTime: number = 0.1

    //----------------------------------------------------------------
    @property({
        type: Node,
        tooltip: "用來替代此節點以外的節點，會取代原本的觸控區域",
        displayName: "Event Touch Source",
    })
    protected m_eventTouchSource: Node = null

    //----------------------------------------------------------------
    @property({
        type: [Node],
        tooltip: "額外增加可點擊的範圍，原觸控區仍有效",
        displayName: "Event Touch Senders",
    })
    protected m_eventTouchSenders: Node[] = []

    //----------------------------------------------------------------
    @property({
        type: [Node],
        tooltip: "連動通知的按鈕(被連動的按鈕可取消 Touch 事件)",
        displayName: "Event Touch Receivers",
    })
    protected m_eventTouchReceivers: Node[] = []

    //----------------------------------------------------------------

    protected m_isEnabled: boolean = false    // 是否已註冊觸控事件
    protected m_isCooling: boolean = false    // 是否在冷卻中
    protected m_isDismiss: boolean = false    // 是否已失效
    protected m_isTouching: boolean = false    // 是否正在觸控
    protected m_eventSource: Node = null     // 當前觸控事件來源
    protected m_stuntSource: Touchable = null     // 由其他 Touchable 轉發的事件來源
    protected m_uiTransforms: UITransform[] = []       // 觸控區域列表
    protected m_handlingEvent: EventTouch = null     // 正在處理的觸控事件
    protected m_touchingInArea: boolean = false    // 是否正點擊在感測區域內
    protected m_longTouchCount: number = 0        // 長按累積次數

    protected m_senderNodes: Set<Node> = null     // 額外增加可點擊的範圍
    protected m_receiverTouches: Set<Touchable> = null     // 連動通知的按鈕

    //----------------------------------------------------------------

    //================================================================
    // 屬性
    //================================================================

    //----------------------------------------------------------------
    /** 識別標籤 */
    public get Tag(): number {
        return this.m_tag
    }
    public set Tag(value: number) {
        this.m_tag = value
    }

    //----------------------------------------------------------------
    /** 是否啟用點擊功能 */
    public get TouchEnabled(): boolean {
        return this.m_touchEnabled
    }
    public set TouchEnabled(enabled: boolean) {
        if (enabled == this.m_touchEnabled) {
            return
        }

        this.m_touchEnabled = enabled
        this.m_touchEnabled ? this.TouchEnable() : this.TouchDisable()
    }

    //----------------------------------------------------------------
    /** 是否獨佔點擊功能 */
    public get SwallowTouch(): boolean {
        return this.m_swallowTouch
    }
    public set SwallowTouch(value: boolean) {
        this.m_swallowTouch = value
    }

    //----------------------------------------------------------------
    /** 是否啟用 Node 事件 */
    public get EnableNodeEvent(): boolean {
        return this.m_nodeEventEnabled
    }
    public set EnableNodeEvent(value: boolean) {
        this.m_nodeEventEnabled = value
    }

    //----------------------------------------------------------------
    /** 點擊冷卻時間 (毫秒) */
    public get CoolTime(): number {
        return this.m_coolTime
    }
    public set CoolTime(value: number) {
        this.m_coolTime = value
    }

    //----------------------------------------------------------------
    /** 是否啟用長按功能 */
    public get LongTouchEnabled(): boolean {
        return this.m_longTouchEnabled
    }
    public set LongTouchEnabled(value: boolean) {
        this.m_longTouchEnabled = value
    }

    //----------------------------------------------------------------
    /** 開始觸發長按功能的延遲時間 (秒) */
    public get LongTouchStartTime(): number {
        return this.m_longTouchStartTime
    }
    public set LongTouchStartTime(value: number) {
        this.m_longTouchStartTime = value
    }

    //----------------------------------------------------------------
    /** 長按觸發後每次觸發的間隔時間 (秒) */
    public get LongTouchIntervalTime(): number {
        return this.m_longTouchIntervalTime
    }
    public set LongTouchIntervalTime(value: number) {
        this.m_longTouchIntervalTime = value
    }

    //----------------------------------------------------------------
    /** 用來替代此節點以外的節點，會取代原本的觸控區域 */
    public get EventTouchSource(): Node {
        return this.m_eventTouchSource
    }
    public set EventTouchSource(sourceNode: Node) {
        this.m_eventTouchSource = sourceNode

        if (this.m_eventTouchSource !== this.m_eventSource) {
            this.TouchDisable(true)
            this.TouchEnable(true)
        }
    }

    //----------------------------------------------------------------
    /**
     * 額外增加可點擊的範圍，原觸控區仍有效
     * - 此處僅供取得當前設定的額外節點，若要增加或移除節點，請使用以下方法：
     * - 使用 `AddTouchSender( node )` 增加一個額外的點擊範圍
     * - 使用 `DeleteTouchSender( node )` 移除一個額外的點擊範圍
     */
    public get SenderNodes(): Set<Node> {
        if (!this.m_senderNodes) {
            this.m_senderNodes = new Set<Node>()
            this.m_eventTouchSenders?.forEach?.(sender => {
                isValid(sender, true) && this.m_senderNodes.add(sender)
            })
        }

        return this.m_senderNodes
    }

    //----------------------------------------------------------------
    /**
     * 連動通知的按鈕(被連動的按鈕可取消 Touch 事件)
     * - 使用 `.add( Touchable )` 增加一個連動按鈕
     * - 使用 `.delete( Touchable )` 移除一個連動按鈕
     */
    public get ReceiverTouches(): Set<Touchable> {
        if (!this.m_receiverTouches) {
            this.m_receiverTouches = new Set<Touchable>()
            this.m_eventTouchReceivers?.forEach?.(receiver => {
                const touch = receiver.getComponent(Touchable)
                isValid(touch, true) && this.m_receiverTouches.add(touch)
            })
        }
        return this.m_receiverTouches
    }

    //----------------------------------------------------------------
    /** 是否正點擊在感測區域內 */
    public get TouchingInArea(): boolean {
        return this.m_touchingInArea
    }

    //----------------------------------------------------------------

    //================================================================
    // 事件處理
    //================================================================

    //----------------------------------------------------------------

    private m_dispatcher: EventDispatcher = null
    protected get Dispatcher(): EventDispatcher {
        return this.m_dispatcher || (this.m_dispatcher = new EventDispatcher)
    }

    public On(event: TouchableEvent, callback: TouchableEventCallback, target?: any) {
        this.Dispatcher.On(event, callback, target)
    }

    public Once(event: TouchableEvent, callback: TouchableEventCallback, target?: any) {
        this.Dispatcher.Once(event, callback, target)
    }

    public Off(event: TouchableEvent, callback: TouchableEventCallback, target?: any) {
        this.Dispatcher.Off(event, callback, target)
    }

    protected Dispatch(event: TouchableEvent, ccEvent?: EventTouch, ...args: any[]) {
        this.m_nodeEventEnabled && this.node.emit(event, this, ccEvent, ...args)
        this.Dispatcher.Dispatch(event, this, ccEvent, ...args)
    }

    protected ClearDispatcher() {
        this.Dispatcher.Clear()
    }

    //----------------------------------------------------------------

    //================================================================
    // 觸控處理
    //================================================================

    //----------------------------------------------------------------
    /** 使當前觸控失效 */
    public Dismiss() {
        this.m_isDismiss = true

        if (this.m_isTouching) {
            const event = this.m_handlingEvent
            this._onTouchCancel(event)
            this._onTouchRelease(event)
        }

        // 通知連動按鈕
        this.ReceiverTouches.forEach(touch => touch.Dismiss())
    }

    //----------------------------------------------------------------
    /**
     * 增加額外可點擊的範圍
     * @param sender 額外的節點
     */
    public AddTouchSender(sender: Node) {
        if (isValid(sender, true) && this.SenderNodes.has(sender) == false) {
            this.SenderNodes.add(sender)
            this.m_isEnabled && this.SetupTouchEvent(sender, true)
        }
    }

    //----------------------------------------------------------------
    /**
     * 移除額外可點擊的範圍
     * @param sender 額外的節點
     */
    public DeleteTouchSender(sender: Node) {
        if (this.SenderNodes.has(sender)) {
            this.SenderNodes.delete(sender)
            this.m_isEnabled && this.SetupTouchEvent(sender, false)
        }
    }

    //----------------------------------------------------------------

    protected onEnable(): void {
        if (!this.m_touchEnabled) {
            return
        }

        this.TouchEnable(true)
    }

    protected onDisable(): void {
        if (!this.m_touchEnabled) {
            return
        }

        this.TouchDisable(true)
    }

    protected onDestroy(): void {
        this.ClearDispatcher()
    }

    //----------------------------------------------------------------
    // 啟用觸控處理
    private TouchEnable(silent: boolean = false) {
        if (this.m_isEnabled) {
            return
        }

        this.m_isEnabled = true

        this.m_eventSource = this.m_eventTouchSource ?? this.node
        this.SetupTouchEvent(this.m_eventSource, true)
        this.SenderNodes.forEach(sender => this.SetupTouchEvent(sender, true))

        if (!silent) {
            this.Dispatch(TouchableEvent.Enabled)
            this.OnTouchEnabled()
        }
    }

    //----------------------------------------------------------------
    // 禁用觸控處理
    private TouchDisable(silent: boolean = false) {
        if (!this.m_isEnabled) {
            return
        }

        this.m_isEnabled = false

        if (this.m_isTouching) {
            const event = this.m_handlingEvent
            this._onTouchCancel(event)
            this._onTouchRelease(event)
        }

        const eventTarget = this.m_eventSource
        this.m_eventSource = null
        this.SetupTouchEvent(eventTarget, false)
        this.SenderNodes.forEach(sender => this.SetupTouchEvent(sender, false))

        if (!silent) {
            this.Dispatch(TouchableEvent.Disabled)
            this.OnTouchDisabled()
        }
    }

    //----------------------------------------------------------------
    /** 設定觸控事件 */
    private SetupTouchEvent(targetNode: Node, enabled: boolean) {
        if (!isValid(targetNode, true)) {
            return
        }

        if (enabled) {
            const nodeSize = NodeUtils.GetSize(targetNode)
            if (nodeSize.width == 0 || nodeSize.height == 0) {
                warn("[Common-Touch] event sender touch area is invalid")
            }

            targetNode.on(Node.EventType.TOUCH_START, this.TouchHandle, this)
            targetNode.on(Node.EventType.TOUCH_MOVE, this.TouchHandle, this)
            targetNode.on(Node.EventType.TOUCH_END, this.TouchHandle, this)
            targetNode.on(Node.EventType.TOUCH_CANCEL, this.TouchHandle, this)

            const uiTrans = targetNode.getComponent(UITransform)
            if (isValid(uiTrans, true) && this.m_uiTransforms.indexOf(uiTrans) === -1) {
                this.m_uiTransforms.push(uiTrans)
            }
        }
        else {
            targetNode.off(Node.EventType.TOUCH_START, this.TouchHandle, this)
            targetNode.off(Node.EventType.TOUCH_MOVE, this.TouchHandle, this)
            targetNode.off(Node.EventType.TOUCH_END, this.TouchHandle, this)
            targetNode.off(Node.EventType.TOUCH_CANCEL, this.TouchHandle, this)

            const uiTrans = targetNode.getComponent(UITransform)
            const uiIndex = this.m_uiTransforms.indexOf(uiTrans)
            if (uiIndex >= 0) {
                this.m_uiTransforms.splice(uiIndex, 1)
            }
        }
    }

    //----------------------------------------------------------------
    // 觸控事件處理
    private TouchHandle(event: EventTouch) {
        const type = event.getType()

        if (this.m_isDismiss && type != Node.EventType.TOUCH_START) {
            return
        }

        this.m_handlingEvent = event

        event.preventSwallow = !this.m_swallowTouch
        event.propagationStopped = this.m_swallowTouch

        switch (type) {
            case Node.EventType.TOUCH_START: {
                this._onTouchStart(event)
                this.ReceiverTouches.forEach(receiver => {
                    receiver._onStuntTouchStart(this.m_stuntSource ?? this, event)
                })
                break
            }
            case Node.EventType.TOUCH_MOVE: {
                this._onTouchMove(event)
                break
            }
            case Node.EventType.TOUCH_END: {
                this._onTouchEnd(event)
                this._onTouchClicked(event)
                this._onTouchRelease(event)
                break
            }
            case Node.EventType.TOUCH_CANCEL: {
                this._onTouchCancel(event)
                this._onTouchRelease(event)
                break
            }
        }

        // 通知連動按鈕
        this.ReceiverTouches.forEach(receiver => receiver.TouchHandle(event))
    }

    //----------------------------------------------------------------
    // 由其他 Touchable 轉發的觸控事件開始
    private _onStuntTouchStart(source: Touchable, event: EventTouch) {
        this.m_stuntSource = source
    }

    //----------------------------------------------------------------
    // 觸控事件: TOUCH_START
    private _onTouchStart(event: EventTouch) {
        // cooldown
        if (this.m_isCooling) {
            return
        }

        this.m_isCooling = true
        this.scheduleOnce(() => { this.m_isCooling = false }, this.m_coolTime/1000)

        // 重置狀態
        this.m_isDismiss = false
        this.m_isTouching = true
        this.CheckTouchingArea(event?.getUILocation())

        // long touch
        if (this.m_longTouchEnabled) {
            this.m_longTouchCount = 0
            this.StartLongTouch()
        }

        this.Dispatch(TouchableEvent.Start, event)
        this.OnTouchStart(event)
    }

    // 觸控事件: TOUCH_MOVE
    private _onTouchMove(event: EventTouch) {
        if (!this.m_isTouching) {
            return
        }

        this.Dispatch(TouchableEvent.Move, event)
        this.OnTouchMove(event)
        this.CheckTouchingArea(event?.getUILocation())
    }

    // 觸控事件: TOUCH_END
    private _onTouchEnd(event: EventTouch) {
        this.EndLongTouch()
        this.m_handlingEvent = null

        this.Dispatch(TouchableEvent.End, event)
        this.OnTouchEnd(event)
    }

    // 觸控事件: CLICKED (TOUCH_END 之後)
    private _onTouchClicked(event: EventTouch) {
        this.Dispatch(TouchableEvent.Clicked, event)
        this.OnTouchClicked(event)
    }

    // 觸控事件: TOUCH_CANCEL
    private _onTouchCancel(event: EventTouch) {
        this.EndLongTouch()
        this.m_handlingEvent = null

        this.Dispatch(TouchableEvent.Cancel, event)
        this.OnTouchCancel(event)
    }

    // 觸控事件: TOUCH_END or TOUCH_CANCEL
    private _onTouchRelease(event: EventTouch) {
        this.m_isTouching = false
        this.m_stuntSource = null
        this.CheckTouchingArea()

        this.Dispatch(TouchableEvent.Release, event)
        this.OnTouchRelease(event)
    }

    //----------------------------------------------------------------
    /** 開始長按 */
    private StartLongTouch() {
        this.scheduleOnce(this._onLongTouchStart, this.m_longTouchStartTime)
    }

    /** 結束長按 */
    private EndLongTouch() {
        this.unschedule(this._onLongTouchStart)
        this.unschedule(this._onLongTouching)
        this._onLongTouchEnd()
    }

    // 長按事件: START
    private _onLongTouchStart() {
        this.schedule(this._onLongTouching, this.m_longTouchIntervalTime)
        this.Dispatch(TouchableEvent.LongTouchStart, this.m_handlingEvent)
        this.OnLongTouchStart()
    }

    // 長按事件: 觸發
    private _onLongTouching() {
        if (this.m_touchingInArea) {
            this.Dispatch(TouchableEvent.LongTouching, null, ++this.m_longTouchCount)
            this.OnLongTouching(this.m_longTouchCount)
        }
    }

    // 長按事件: END
    private _onLongTouchEnd() {
        this.Dispatch(TouchableEvent.LongTouchEnd)
        this.OnLongTouchEnd()
    }

    //----------------------------------------------------------------
    /** 檢查觸控區域 */
    private CheckTouchingArea(uiLocation?: Vec2) {
        const touching = this.TouchContains(uiLocation)
        if (touching != this.m_touchingInArea) {
            this.m_touchingInArea = touching
            touching ? this._onTouchEnterArea() : this._onTouchLeaveArea()
        }
    }

    /** 是否觸控重疊 */
    private TouchContains(uiLocation?: Vec2): boolean {
        if (this.m_stuntSource) {
            return this.m_stuntSource.TouchingInArea
        }
        if (uiLocation && this.m_uiTransforms.length > 0) {
            return this.m_uiTransforms.some(uiTrans => uiTrans.getBoundingBoxToWorld().contains(uiLocation))
        }
        return false
    }

    private _onTouchEnterArea() {
        this.Dispatch(TouchableEvent.EnterArea)
        this.OnTouchEnterArea()
    }

    private _onTouchLeaveArea(silent: boolean = false) {
        this.Dispatch(TouchableEvent.LeaveArea)
        this.OnTouchLeaveArea()
    }

    //----------------------------------------------------------------
    /** 事件: TouchableEvent.Enabled */
    protected OnTouchEnabled() {
    }

    /** 事件: TouchableEvent.Disabled */
    protected OnTouchDisabled() {
    }

    //----------------------------------------------------------------
    /** 事件: TouchableEvent.Start */
    protected OnTouchStart(event: EventTouch) {
    }

    /** 事件: TouchableEvent.Move */
    protected OnTouchMove(event: EventTouch) {
    }

    /** 事件: TouchableEvent.End */
    protected OnTouchEnd(event: EventTouch) {
    }

    /** 事件: TouchableEvent.Clicked */
    protected OnTouchClicked(event: EventTouch) {
    }

    /** 事件: TouchableEvent.Cancel */
    protected OnTouchCancel(event: EventTouch) {
    }

    /** 事件: TouchableEvent.Release */
    protected OnTouchRelease(event: EventTouch) {
    }

    //----------------------------------------------------------------
    /** 事件: TouchableEvent.EnterArea */
    protected OnTouchEnterArea() {
    }

    /** 事件: TouchableEvent.LeaveArea */
    protected OnTouchLeaveArea() {
    }

    //----------------------------------------------------------------
    /** 事件: TouchableEvent.Touching */
    protected OnLongTouchStart() {
    }

    /** 事件: TouchableEvent.LongTouching */
    protected OnLongTouching(count: number) {
    }

    /** 事件: TouchableEvent.LongTouchEnd */
    protected OnLongTouchEnd() {
    }

    //----------------------------------------------------------------

}
