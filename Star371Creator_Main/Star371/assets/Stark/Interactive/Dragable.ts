import {
    _decorator, Vec2, Vec3, EventTouch, Rect, Size
} from "cc"
import Touchable, { TouchableEvent, TouchableEventCallback } from "./Touchable"

const { ccclass, property, menu } = _decorator

/** Dragable 事件 */
export enum DragableEvent {
    DragStart = "DRAGABLE_EVENT.drag_start",
    DragMove = "DRAGABLE_EVENT.drag_move",
    DragEnd = "DRAGABLE_EVENT.drag_end",
    DragCancel = "DRAGABLE_EVENT.drag_cancel",
}

/** Dragable 事件回調 */
export type DragableEventCallback = (sender: Dragable, ccEvent?: EventTouch, dragOffset?: Vec2, ...args: any[]) => void

//================================================================================================
/**
 * Dragable - 可拖動組件
 * 繼承自 Touchable，增加拖動功能
 */
//================================================================================================

@ccclass
@menu("Touchable/Dragable")
export default class Dragable extends Touchable {

    //----------------------------------------------------------------
    // 是否啟用拖動功能
    @property({
        tooltip: "是否啟用拖動功能",
        displayName: "Drag Enabled"
    })
    protected m_dragEnabled: boolean = true

    //----------------------------------------------------------------
    // 拖動靈敏度 (像素)
    @property({
        tooltip: "開始拖動的最小移動距離 (像素)",
        displayName: "Drag Threshold",
        min: 0
    })
    protected m_dragThreshold: number = 5

    //----------------------------------------------------------------
    // 是否限制拖動範圍
    @property({
        tooltip: "是否限制拖動範圍",
        displayName: "Constrain to Bounds"
    })
    protected m_constrainToBounds: boolean = false

    //----------------------------------------------------------------
    // 拖動範圍 (當 constrainToBounds 為 true 時生效)
    @property({
        tooltip: "拖動範圍限制 (相對於父節點)",
        displayName: "Drag Bounds",
        visible: function () {
            return this.m_constrainToBounds
        }
    })
    protected m_dragBounds: Rect = new Rect(0, 0, 0, 0)

    //----------------------------------------------------------------
    // 是否復位到原始位置
    @property({
        tooltip: "拖動結束後是否復位到原始位置",
        displayName: "Return to Origin"
    })
    protected m_returnToOrigin: boolean = false

    //----------------------------------------------------------------
    // 復位動畫時間
    @property({
        tooltip: "復位動畫時間 (秒)",
        displayName: "Return Duration",
        min: 0,
        visible: function () {
            return this.m_returnToOrigin
        }
    })
    protected m_returnDuration: number = 0.3

    //----------------------------------------------------------------

    protected m_isDragging: boolean = false        // 是否正在拖動
    protected m_dragStartPosition: Vec3 = null     // 拖動開始時的節點位置
    protected m_dragStartTouchPos: Vec2 = null     // 拖動開始時的觸控位置
    protected m_dragCurrentOffset: Vec2 = new Vec2() // 當前拖動偏移量
    protected m_originalPosition: Vec3 = null      // 節點原始位置

    //----------------------------------------------------------------

    //================================================================
    // 屬性
    //================================================================

    //----------------------------------------------------------------
    /** 是否啟用拖動功能 */
    public get DragEnabled(): boolean {
        return this.m_dragEnabled
    }
    public set DragEnabled(enabled: boolean) {
        this.m_dragEnabled = enabled
    }

    //----------------------------------------------------------------
    /** 拖動靈敏度 */
    public get DragThreshold(): number {
        return this.m_dragThreshold
    }
    public set DragThreshold(value: number) {
        this.m_dragThreshold = Math.max(0, value)
    }

    //----------------------------------------------------------------
    /** 是否限制拖動範圍 */
    public get ConstrainToBounds(): boolean {
        return this.m_constrainToBounds
    }
    public set ConstrainToBounds(value: boolean) {
        this.m_constrainToBounds = value
    }

    //----------------------------------------------------------------
    /** 拖動範圍 */
    public get DragBounds(): Rect {
        return this.m_dragBounds
    }
    public set DragBounds(bounds: Rect) {
        this.m_dragBounds = bounds
    }

    //----------------------------------------------------------------
    /** 是否復位到原始位置 */
    public get ReturnToOrigin(): boolean {
        return this.m_returnToOrigin
    }
    public set ReturnToOrigin(value: boolean) {
        this.m_returnToOrigin = value
    }

    //----------------------------------------------------------------
    /** 復位動畫時間 */
    public get ReturnDuration(): number {
        return this.m_returnDuration
    }
    public set ReturnDuration(value: number) {
        this.m_returnDuration = Math.max(0, value)
    }

    //----------------------------------------------------------------
    /** 是否正在拖動 */
    public get IsDragging(): boolean {
        return this.m_isDragging
    }

    //----------------------------------------------------------------
    /** 當前拖動偏移量 */
    public get DragOffset(): Vec2 {
        return this.m_dragCurrentOffset.clone()
    }

    //----------------------------------------------------------------

    //================================================================
    // 事件處理
    //================================================================

    public OnDrag(event: DragableEvent, callback: DragableEventCallback, target?: any) {
        this.On(event as any, callback as any, target)
    }

    public OnceDrag(event: DragableEvent, callback: DragableEventCallback, target?: any) {
        this.Once(event as any, callback as any, target)
    }

    public OffDrag(event: DragableEvent, callback: DragableEventCallback, target?: any) {
        this.Off(event as any, callback as any, target)
    }

    protected DispatchDrag(event: DragableEvent, ccEvent?: EventTouch, dragOffset?: Vec2, ...args: any[]) {
        this.EnableNodeEvent && this.node.emit(event, this, ccEvent, dragOffset, ...args)
        this.Dispatcher.Dispatch(event, this, ccEvent, dragOffset, ...args)
    }

    //----------------------------------------------------------------

    //================================================================
    // 生命週期
    //================================================================

    protected onEnable(): void {
        super.onEnable()
        
        // 記錄原始位置
        if (!this.m_originalPosition) {
            this.m_originalPosition = this.node.position.clone()
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 拖動處理
    //================================================================

    //----------------------------------------------------------------
    /** 重置到原始位置 */
    public ResetToOrigin(animated: boolean = true) {
        if (!this.m_originalPosition) {
            return
        }

        if (animated && this.m_returnDuration > 0) {
            // 使用動畫復位
            this.node.setPosition(this.m_originalPosition)
        } else {
            // 直接復位
            this.node.setPosition(this.m_originalPosition)
        }

        this.m_dragCurrentOffset.set(0, 0)
    }

    //----------------------------------------------------------------
    /** 設定拖動範圍 (便利方法) */
    public SetDragBounds(x: number, y: number, width: number, height: number) {
        this.m_dragBounds.set(x, y, width, height)
        this.m_constrainToBounds = true
    }

    //----------------------------------------------------------------

    //================================================================
    // 觸控事件覆寫
    //================================================================

    //----------------------------------------------------------------
    protected OnTouchStart(event: EventTouch) {
        super.OnTouchStart(event)

        if (!this.m_dragEnabled) {
            return
        }

        // 記錄拖動開始的位置
        this.m_dragStartPosition = this.node.position.clone()
        this.m_dragStartTouchPos = event.getUILocation()
        this.m_dragCurrentOffset.set(0, 0)
    }

    //----------------------------------------------------------------
    protected OnTouchMove(event: EventTouch) {
        super.OnTouchMove(event)

        if (!this.m_dragEnabled || !this.TouchingInArea) {
            return
        }

        const currentTouchPos = event.getUILocation()
        const touchOffset = currentTouchPos.subtract(this.m_dragStartTouchPos)

        // 檢查是否達到拖動閾值
        if (!this.m_isDragging) {
            const dragDistance = touchOffset.length()
            if (dragDistance >= this.m_dragThreshold) {
                this.StartDrag(event, touchOffset)
            }
        } else {
            this.UpdateDrag(event, touchOffset)
        }
    }

    //----------------------------------------------------------------
    protected OnTouchEnd(event: EventTouch) {
        super.OnTouchEnd(event)

        if (this.m_isDragging) {
            this.EndDrag(event)
        }
    }

    //----------------------------------------------------------------
    protected OnTouchCancel(event: EventTouch) {
        super.OnTouchCancel(event)

        if (this.m_isDragging) {
            this.CancelDrag(event)
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 拖動邏輯
    //================================================================

    //----------------------------------------------------------------
    /** 開始拖動 */
    private StartDrag(event: EventTouch, touchOffset: Vec2) {
        this.m_isDragging = true

        this.DispatchDrag(DragableEvent.DragStart, event, touchOffset)
        this.OnDragStart(event, touchOffset)
    }

    //----------------------------------------------------------------
    /** 更新拖動 */
    private UpdateDrag(event: EventTouch, touchOffset: Vec2) {
        this.m_dragCurrentOffset = touchOffset

        // 計算新位置
        let newPosition = this.m_dragStartPosition.clone()
        newPosition.x += touchOffset.x
        newPosition.y += touchOffset.y

        // 應用範圍限制
        if (this.m_constrainToBounds) {
            newPosition = this.ApplyBoundsConstraint(newPosition)
        }

        // 更新節點位置
        this.node.setPosition(newPosition)

        this.DispatchDrag(DragableEvent.DragMove, event, touchOffset)
        this.OnDragMove(event, touchOffset)
    }

    //----------------------------------------------------------------
    /** 結束拖動 */
    private EndDrag(event: EventTouch) {
        this.m_isDragging = false

        // 檢查是否需要復位
        if (this.m_returnToOrigin) {
            this.ResetToOrigin(true)
        }

        this.DispatchDrag(DragableEvent.DragEnd, event, this.m_dragCurrentOffset)
        this.OnDragEnd(event, this.m_dragCurrentOffset)

        // 清理拖動狀態
        this.ClearDragState()
    }

    //----------------------------------------------------------------
    /** 取消拖動 */
    private CancelDrag(event: EventTouch) {
        this.m_isDragging = false

        // 總是復位到開始位置
        if (this.m_dragStartPosition) {
            this.node.setPosition(this.m_dragStartPosition)
        }

        this.DispatchDrag(DragableEvent.DragCancel, event, this.m_dragCurrentOffset)
        this.OnDragCancel(event, this.m_dragCurrentOffset)

        // 清理拖動狀態
        this.ClearDragState()
    }

    //----------------------------------------------------------------
    /** 應用範圍約束 */
    private ApplyBoundsConstraint(position: Vec3): Vec3 {
        const bounds = this.m_dragBounds
        const constrainedPos = position.clone()

        constrainedPos.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width, constrainedPos.x))
        constrainedPos.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height, constrainedPos.y))

        return constrainedPos
    }

    //----------------------------------------------------------------
    /** 清理拖動狀態 */
    private ClearDragState() {
        this.m_dragStartPosition = null
        this.m_dragStartTouchPos = null
        this.m_dragCurrentOffset.set(0, 0)
    }

    //----------------------------------------------------------------

    //================================================================
    // 可覆寫的拖動事件
    //================================================================

    //----------------------------------------------------------------
    /** 事件: DragableEvent.DragStart */
    protected OnDragStart(event: EventTouch, dragOffset: Vec2) {
    }

    //----------------------------------------------------------------
    /** 事件: DragableEvent.DragMove */
    protected OnDragMove(event: EventTouch, dragOffset: Vec2) {
    }

    //----------------------------------------------------------------
    /** 事件: DragableEvent.DragEnd */
    protected OnDragEnd(event: EventTouch, dragOffset: Vec2) {
    }

    //----------------------------------------------------------------
    /** 事件: DragableEvent.DragCancel */
    protected OnDragCancel(event: EventTouch, dragOffset: Vec2) {
    }

    //----------------------------------------------------------------

}