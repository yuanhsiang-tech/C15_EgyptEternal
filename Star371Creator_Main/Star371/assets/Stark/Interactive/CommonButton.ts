import { _decorator, isValid, Color, Enum, CCFloat, Node, EventTouch } from "cc"
import Touchable from "./Touchable"
import { CommonButtonMacro } from "./CommonButtonMacro"
import { TweenColor } from "../TweenFunc/TweenColor"
import { TweenOpacity } from "../TweenFunc/TweenOpacity"
import { TweenScale } from "../TweenFunc/TweenScale"
import { EventDispatcher } from "../Utility/EventDispatcher"

const { ccclass, property, menu } = _decorator

//================================================================================================
/**
 * 通用按鈕
 */
//================================================================================================

@ccclass
@menu("Touchable/CommonButton")
export default class CommonButton extends Touchable {

    //================================================================
    // 音效設定
    //================================================================

    @property({
        displayName: "點擊音效類型",
        type: Enum(CommonButtonMacro.SOUND_TYPE),
        group: { id: 'common_button', name: "通用設定" },
    })
    protected m_clickSoundType: CommonButtonMacro.SOUND_TYPE = CommonButtonMacro.SOUND_TYPE.DEFAULT

    //================================================================
    // 節點連動設定
    //================================================================

    @property({
        displayName: "正常狀態節點",
        type: [Node],
        group: { id: 'common_button', name: "通用設定" },
    })
    protected m_normalNodes: Node[] = []

    @property({
        displayName: "按下狀態節點",
        type: [Node],
        group: { id: 'common_button', name: "通用設定" },
    })
    protected m_pressedNodes: Node[] = []

    @property({
        displayName: "禁用狀態節點",
        type: [Node],
        group: { id: 'common_button', name: "通用設定" },
    })
    protected m_disabledNodes: Node[] = []

    //================================================================
    // 色彩設定
    //================================================================

    @property({
        displayName: "色彩變化模式",
        type: Enum(CommonButtonMacro.COLOR_TYPE),
        group: { id: 'common_button', name: "色彩設定" },
    })
    protected m_colorMode: CommonButtonMacro.COLOR_TYPE = CommonButtonMacro.COLOR_TYPE.NONE

    @property({
        displayName: "影響自身色彩",
        visible: function (this: CommonButton) {
            return this.m_colorMode !== CommonButtonMacro.COLOR_TYPE.NONE
        },
        group: { id: 'common_button', name: "色彩設定" },
    })
    protected m_coloringSelf: boolean = false

    @property({
        displayName: "色彩動畫時間",
        type: CCFloat,
        min: 0,
        visible: function (this: CommonButton) {
            return this.m_colorMode !== CommonButtonMacro.COLOR_TYPE.NONE
        },
        group: { id: 'common_button', name: "色彩設定" },
    })
    protected m_coloringDuration: number = CommonButtonMacro.DEFAULT_DURATION

    @property({
        displayName: "正常狀態色彩",
        type: Color,
        visible: function (this: CommonButton) {
            return this.m_colorMode === CommonButtonMacro.COLOR_TYPE.CUSTOM
        },
        group: { id: 'common_button', name: "色彩設定" },
    })
    protected m_normalColor: Color = CommonButtonMacro.DEFAULT_COLOR_SET.NORMAL

    @property({
        displayName: "按下狀態色彩",
        type: Color,
        visible: function (this: CommonButton) {
            return this.m_colorMode === CommonButtonMacro.COLOR_TYPE.CUSTOM
        },
        group: { id: 'common_button', name: "色彩設定" },
    })
    protected m_pressedColor: Color = CommonButtonMacro.DEFAULT_COLOR_SET.PRESSED

    @property({
        displayName: "禁用狀態色彩",
        type: Color,
        visible: function (this: CommonButton) {
            return this.m_colorMode === CommonButtonMacro.COLOR_TYPE.CUSTOM
        },
        group: { id: 'common_button', name: "色彩設定" },
    })
    protected m_disabledColor: Color = CommonButtonMacro.DEFAULT_COLOR_SET.DISABLED

    @property({
        displayName: "色彩目標節點",
        type: [Node],
        visible: function (this: CommonButton) {
            return this.m_colorMode !== CommonButtonMacro.COLOR_TYPE.NONE
        },
        group: { id: 'common_button', name: "色彩設定" },
    })
    protected m_coloringTargets: Node[] = []

    //================================================================
    // 尺寸設定
    //================================================================

    @property({
        displayName: "尺寸變化模式",
        type: Enum(CommonButtonMacro.SIZE_TYPE),
        group: { id: 'common_button', name: "尺寸設定" },
    })
    protected m_sizeMode: CommonButtonMacro.SIZE_TYPE = CommonButtonMacro.SIZE_TYPE.NONE

    @property({
        displayName: "影響自身尺寸",
        visible: function (this: CommonButton) {
            return this.m_sizeMode !== CommonButtonMacro.SIZE_TYPE.NONE
        },
        group: { id: 'common_button', name: "尺寸設定" },
    })
    protected m_scalingSelf: boolean = false

    @property({
        displayName: "尺寸動畫時間",
        type: CCFloat,
        min: 0,
        visible: function (this: CommonButton) {
            return this.m_sizeMode !== CommonButtonMacro.SIZE_TYPE.NONE
        },
        group: { id: 'common_button', name: "尺寸設定" },
    })
    protected m_scalingDuration: number = CommonButtonMacro.DEFAULT_DURATION

    @property({
        displayName: "正常狀態尺寸",
        type: CCFloat,
        visible: function (this: CommonButton) {
            return this.m_sizeMode === CommonButtonMacro.SIZE_TYPE.CUSTOM
        },
        group: { id: 'common_button', name: "尺寸設定" },
    })
    protected m_normalSize: number = CommonButtonMacro.DEFAULT_SIZE_SET.NORMAL

    @property({
        displayName: "按下狀態尺寸",
        type: CCFloat,
        visible: function (this: CommonButton) {
            return this.m_sizeMode === CommonButtonMacro.SIZE_TYPE.CUSTOM
        },
        group: { id: 'common_button', name: "尺寸設定" },
    })
    protected m_pressedSize: number = CommonButtonMacro.DEFAULT_SIZE_SET.PRESSED

    @property({
        displayName: "禁用狀態尺寸",
        type: CCFloat,
        visible: function (this: CommonButton) {
            return this.m_sizeMode === CommonButtonMacro.SIZE_TYPE.CUSTOM
        },
        group: { id: 'common_button', name: "尺寸設定" },
    })
    protected m_disabledSize: number = CommonButtonMacro.DEFAULT_SIZE_SET.DISABLED

    @property({
        displayName: "尺寸目標節點",
        type: [Node],
        visible: function (this: CommonButton) {
            return this.m_sizeMode !== CommonButtonMacro.SIZE_TYPE.NONE
        },
        group: { id: 'common_button', name: "尺寸設定" },
    })
    protected m_scalingTargets: Node[] = []

    //================================================================
    // 屬性存取器
    //================================================================

    /** 點擊音效類型 */
    public get ClickSoundType(): CommonButtonMacro.SOUND_TYPE {
        return this.m_clickSoundType
    }
    public set ClickSoundType(value: CommonButtonMacro.SOUND_TYPE) {
        this.m_clickSoundType = value
    }

    /** 正常狀態節點 */
    public get NormalNodes(): Node[] {
        return this.m_normalNodes
    }
    public set NormalNodes(value: Node[]) {
        this.m_normalNodes = value
    }

    /** 按下狀態節點 */
    public get PressedNodes(): Node[] {
        return this.m_pressedNodes
    }
    public set PressedNodes(value: Node[]) {
        this.m_pressedNodes = value
    }

    /** 禁用狀態節點 */
    public get DisabledNodes(): Node[] {
        return this.m_disabledNodes
    }
    public set DisabledNodes(value: Node[]) {
        this.m_disabledNodes = value
    }

    /** 色彩變化模式 */
    public get ColorMode(): CommonButtonMacro.COLOR_TYPE {
        return this.m_colorMode
    }
    public set ColorMode(value: CommonButtonMacro.COLOR_TYPE) {
        this.m_colorMode = value
    }

    /** 影響自身色彩 */
    public get ColoringSelf(): boolean {
        return this.m_coloringSelf
    }
    public set ColoringSelf(value: boolean) {
        this.m_coloringSelf = value
    }

    /** 色彩目標節點 */
    public get ColoringTargets(): Node[] {
        return this.m_coloringTargets
    }
    public set ColoringTargets(value: Node[]) {
        this.m_coloringTargets = value
    }

    /** 色彩動畫時間 */
    public get ColoringDuration(): number {
        return this.m_coloringDuration
    }
    public set ColoringDuration(value: number) {
        this.m_coloringDuration = value
    }

    /** 正常狀態色彩 */
    public get NormalColor(): Color {
        return this.m_normalColor
    }
    public set NormalColor(value: Color) {
        this.m_normalColor = value
    }

    /** 按下狀態色彩 */
    public get PressedColor(): Color {
        return this.m_pressedColor
    }
    public set PressedColor(value: Color) {
        this.m_pressedColor = value
    }

    /** 禁用狀態色彩 */
    public get DisabledColor(): Color {
        return this.m_disabledColor
    }
    public set DisabledColor(value: Color) {
        this.m_disabledColor = value
    }

    /** 尺寸變化模式 */
    public get SizeMode(): CommonButtonMacro.SIZE_TYPE {
        return this.m_sizeMode
    }
    public set SizeMode(value: CommonButtonMacro.SIZE_TYPE) {
        this.m_sizeMode = value
    }

    /** 影響自身尺寸 */
    public get ScalingSelf(): boolean {
        return this.m_scalingSelf
    }
    public set ScalingSelf(value: boolean) {
        this.m_scalingSelf = value
    }

    /** 尺寸動畫時間 */
    public get ScalingDuration(): number {
        return this.m_scalingDuration
    }
    public set ScalingDuration(value: number) {
        this.m_scalingDuration = value
    }

    /** 尺寸目標節點 */
    public get ScalingTargets(): Node[] {
        return this.m_scalingTargets
    }
    public set ScalingTargets(value: Node[]) {
        this.m_scalingTargets = value
    }

    /** 正常狀態尺寸 */
    public get NormalSize(): number {
        return this.m_normalSize
    }
    public set NormalSize(value: number) {
        this.m_normalSize = value
    }

    /** 按下狀態尺寸 */
    public get PressedSize(): number {
        return this.m_pressedSize
    }
    public set PressedSize(value: number) {
        this.m_pressedSize = value
    }

    /** 禁用狀態尺寸 */
    public get DisabledSize(): number {
        return this.m_disabledSize
    }
    public set DisabledSize(value: number) {
        this.m_disabledSize = value
    }

    //================================================================
    // 決定屬性方法
    //================================================================

    /** 取得決定的色彩 */
    protected GetResolvedColor(status: CommonButtonMacro.STATUS): Color {
        if (this.m_colorMode === CommonButtonMacro.COLOR_TYPE.NONE) {
            return null
        } else if (this.m_colorMode === CommonButtonMacro.COLOR_TYPE.CUSTOM) {
            switch (status) {
                case CommonButtonMacro.STATUS.NORMAL:
                    return this.m_normalColor
                case CommonButtonMacro.STATUS.PRESSED:
                    return this.m_pressedColor
                case CommonButtonMacro.STATUS.DISABLED:
                    return this.m_disabledColor
            }
        } else {
            const colorSet = CommonButtonMacro.COLOR_SETS[this.m_colorMode]
            return CommonButtonMacro.GetPropByStatus(colorSet ?? CommonButtonMacro.DEFAULT_COLOR_SET, status) ?? null
        }
    }

    /** 取得決定的尺寸 */
    protected GetResolvedSize(status: CommonButtonMacro.STATUS): number {
        if (this.m_sizeMode === CommonButtonMacro.SIZE_TYPE.NONE) {
            return NaN
        } else if (this.m_sizeMode === CommonButtonMacro.SIZE_TYPE.CUSTOM) {
            switch (status) {
                case CommonButtonMacro.STATUS.NORMAL:
                    return this.m_normalSize
                case CommonButtonMacro.STATUS.PRESSED:
                    return this.m_pressedSize
                case CommonButtonMacro.STATUS.DISABLED:
                    return this.m_disabledSize
            }
        } else {
            const sizeSet = CommonButtonMacro.SIZE_SETS[this.m_sizeMode]
            return CommonButtonMacro.GetPropByStatus(sizeSet ?? CommonButtonMacro.DEFAULT_SIZE_SET, status) ?? NaN
        }
    }

    //================================================================
    // 狀態管理
    //================================================================

    protected m_currentStatus: CommonButtonMacro.STATUS = CommonButtonMacro.STATUS.NORMAL

    /** 當前狀態 */
    public get CurrentStatus(): CommonButtonMacro.STATUS {
        return this.m_currentStatus
    }

    public set CurrentStatus(status: CommonButtonMacro.STATUS) {
        if (this.m_currentStatus !== status) {
            this.m_currentStatus = status
            this.OnStatusChanged(status)
        }
    }

    /** 狀態變化處理 */
    protected OnStatusChanged(status: CommonButtonMacro.STATUS): void {
        this.ApplyColorAnimation(this.GetResolvedColor(status))
        this.ApplySizeAnimation(this.GetResolvedSize(status))
        this.UpdateLinkedNodes(this.m_normalNodes, status === CommonButtonMacro.STATUS.NORMAL)
        this.UpdateLinkedNodes(this.m_pressedNodes, status === CommonButtonMacro.STATUS.PRESSED)
        this.UpdateLinkedNodes(this.m_disabledNodes, status === CommonButtonMacro.STATUS.DISABLED)
    }

    //================================================================
    // 生命週期
    //================================================================

    protected onEnable(): void {
        super.onEnable?.()
        this.OnStatusChanged(this.TouchEnabled ? CommonButtonMacro.STATUS.NORMAL : CommonButtonMacro.STATUS.DISABLED)
    }

    //================================================================
    // 事件處理
    //================================================================

    protected OnTouchEnabled(): void {
        this.CurrentStatus = CommonButtonMacro.STATUS.NORMAL
    }

    protected OnTouchDisabled(): void {
        this.CurrentStatus = CommonButtonMacro.STATUS.DISABLED
    }

    protected OnTouchEnd(event: EventTouch): void {
        this.ExecuteSound(this.m_clickSoundType)
    }

    protected OnTouchEnterArea(): void {
        this.CurrentStatus = CommonButtonMacro.STATUS.PRESSED
    }

    protected OnTouchLeaveArea(): void {
        this.CurrentStatus = CommonButtonMacro.STATUS.NORMAL
    }

    //================================================================
    // 功能方法
    //================================================================

    /** 執行音效 */
    protected ExecuteSound(soundType: CommonButtonMacro.SOUND_TYPE): void {
        EventDispatcher.Shared.Dispatch(CommonButtonMacro.BUTTON_SOUND_EVENT, this, soundType);
    }

    /** 套用色彩動畫 */
    protected ApplyColorAnimation(color: Color): void {
        if (!isValid(color)) {
            return
        }

        const opacity = color.a ?? 255

        if (this.m_coloringSelf) {
            TweenColor.StartToColor(this.node, color, this.m_coloringDuration)
            TweenOpacity.StartToOpacity(this.node, opacity, this.m_coloringDuration)
        }

        this.m_coloringTargets.forEach((target) => {
            TweenColor.StartToColor(target, color, this.m_coloringDuration)
            TweenOpacity.StartToOpacity(target, opacity, this.m_coloringDuration)
        })
    }

    /** 套用尺寸動畫 */
    protected ApplySizeAnimation(size: number): void {
        if (isNaN(size)) {
            return
        }

        if (this.m_scalingSelf) {
            TweenScale.StartToScale(this.node, size, this.m_scalingDuration)
        }

        this.m_scalingTargets.forEach((target) => {
            TweenScale.StartToScale(target, size, this.m_scalingDuration)
        })
    }

    /** 更新連動節點 */
    protected UpdateLinkedNodes(nodes: Node[], active: boolean): void {
        nodes.forEach((node) => {
            node.active = active
        })
    }
}