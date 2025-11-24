import { _decorator, math, isValid, Component, sys } from "cc";
import { LazyUpdating } from "db://assets/Stark/Utility/LazyUpdating";
import { Device } from "../../Device/Device";
import { EventDefine } from "../../Define/EventDefine";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";

const { ccclass } = _decorator;

export enum AligningPersistRootType {
    NONE,
    CANVAS_CENTER,
    CANVAS_BOTTOM,
    CANVAS_TOP,
    CANVAS_LEFT,
    CANVAS_RIGHT,
    SAFE_AREA_CENTER,
}

export enum AligningPersistRootMode {
    ALIGN_ONCE,
    ALIGN_ON_LAYOUT_SCENE_UI,
    ALIGN_ON_LAYOUT_DEVICE_ORIENTATION,
    ALIGN_ON_LAYOUT_INTERFACE_ORIENTATION,
}

export enum AligningPersistRootResize {
    NONE,
    RESIZE_TO_CANVAS,
    RESIZE_TO_SAFE_AREA,
}

interface LayoutEventData {
    isPortrait      : boolean;
    screenCenter    : math.Vec3;
    screenSize      : math.Size;
    // screenType      : Define.DesignSize;
}

@ccclass
export default class AligningPersistRoot extends Component {

    //----------------------------------------------------------------

    private m_lazyAligning  : LazyUpdating              = null;
    private m_alignOnEnable : boolean                   = true;
    private m_alignType     : AligningPersistRootType   = AligningPersistRootType.NONE;
    private m_alignMode     : AligningPersistRootMode   = AligningPersistRootMode.ALIGN_ONCE;
    private m_resizeType    : AligningPersistRootResize = AligningPersistRootResize.NONE;
    private m_alignOffset   : math.Vec3                 = null;
    private m_avoidNotch    : boolean                   = false;
    private m_layoutData    : LayoutEventData           = null;
    private m_isPortrait    : boolean                   = false;

    //----------------------------------------------------------------
    /** 是否將要進行對齊 */
    public get WillUpdate(): boolean {
        return this.m_lazyAligning?.WillUpdate ?? false;
    }

    //----------------------------------------------------------------
    /** 是否在 onEnable 時進行對齊 */
    public get AlignOnEnable(): boolean {
        return this.m_alignOnEnable;
    }
    public set AlignOnEnable(value: boolean) {
        this.m_alignOnEnable = value;
    }

    //----------------------------------------------------------------
    /** 對齊類型 */
    public get AlignType(): AligningPersistRootType {
        return this.m_alignType;
    }
    public set AlignType(value: AligningPersistRootType) {
        if (this.m_alignType !== value) {
            this.m_alignType = value;
            this.UpdateAligning();
        }
    }

    //----------------------------------------------------------------
    /** 對齊模式 */
    public get AlignMode(): AligningPersistRootMode {
        return this.m_alignMode;
    }
    public set AlignMode(alignMode: AligningPersistRootMode) {
        if (this.m_alignMode !== alignMode) {
            const prevMode = this.m_alignMode;
            this.m_alignMode = alignMode;
            this.OnAlignModeChanged(alignMode, prevMode);
        }
    }

    //----------------------------------------------------------------
    /** 對齊節點尺寸 */
    public get ResizeType(): AligningPersistRootResize {
        return this.m_resizeType;
    }
    public set ResizeType(value: AligningPersistRootResize) {
        if (this.m_resizeType !== value) {
            this.m_resizeType = value;
            this.UpdateAligning();
        }
    }

    //----------------------------------------------------------------
    /** 對齊偏移 */
    public get AlignOffset(): math.Vec3 {
        return this.m_alignOffset ?? (this.m_alignOffset = math.Vec3.ZERO.clone());
    }
    public set AlignOffset(offset: math.Vec3) {
        if (!(offset instanceof math.Vec3)) {
            offset = math.Vec3.ZERO;
        }
        if (!this.m_alignOffset || !this.m_alignOffset.equals(offset)) {
            this.m_alignOffset = math.v3( offset );
            this.UpdateAligning();
        }
    }

    //----------------------------------------------------------------
    /** 是否避開瀏海 */
    public get AvoidNotch(): boolean {
        return this.m_avoidNotch;
    }
    public set AvoidNotch(value: boolean) {
        if (this.m_avoidNotch !== value) {
            this.m_avoidNotch = value;
            this.UpdateAligning();
        }
    }

    //----------------------------------------------------------------

    protected __preload(): void {
        this.m_lazyAligning = new LazyUpdating(() => this.AlignNow());
    }

    //----------------------------------------------------------------

    protected onEnable(): void {
        EventDispatcher.Shared.On( EventDefine.System.INTERFACE_ORIENTATION_CHANGED, this.OnLayoutNotch, this );

        if (this.m_alignOnEnable) {
            this.UpdateAligning( true );
        }
    }

    //----------------------------------------------------------------

    protected onDisable(): void {
        EventDispatcher.Shared.Off( EventDefine.System.INTERFACE_ORIENTATION_CHANGED, this.OnLayoutNotch, this );
    }

    //----------------------------------------------------------------

    protected onDestroy(): void
    {
        EventDispatcher.Shared.Off( EventDefine.System.LAYOUT_STAGE_UI, this.OnLayoutEvent, this );
        EventDispatcher.Shared.Off( EventDefine.System.ORIENTATION_CHANGED, this.OnLayoutEvent, this );
        EventDispatcher.Shared.Off( EventDefine.System.INTERFACE_ORIENTATION_CHANGED, this.OnLayoutEvent, this );

        this.m_lazyAligning?.Cancel();
        this.m_lazyAligning = null;
    }

    //----------------------------------------------------------------
    /** 更新對齊 */
    public UpdateAligning(immediately: boolean = false): void
    {
        if (this.m_lazyAligning) {
            this.m_lazyAligning.Update( immediately );
        } else {
            this.AlignNow();
        }
    }

    //----------------------------------------------------------------
    /** 進行對齊 */
    protected AlignNow(): void
    {
        // 紀錄對齊的當下是否為直版
        this.m_isPortrait = this.m_layoutData?.isPortrait ?? Device.Current.IsPortrait;

        switch (this.AlignType) {
            case AligningPersistRootType.CANVAS_CENTER:
                this.AlignCanvasCenter();
                break;

            case AligningPersistRootType.CANVAS_BOTTOM:
                this.AlignCanvasBottom();
                break;

            case AligningPersistRootType.CANVAS_TOP:
                this.AlignCanvasTop();
                break;

            case AligningPersistRootType.CANVAS_LEFT:
                this.AlignCanvasLeft();
                break;

            case AligningPersistRootType.CANVAS_RIGHT:
                this.AlignCanvasRight();
                break;

            case AligningPersistRootType.SAFE_AREA_CENTER:
                this.AlignSafeAreaCenter();
                break;
        }

        switch (this.ResizeType) {
            case AligningPersistRootResize.RESIZE_TO_CANVAS:
                this.ResizeToCanvas();
                break;

            case AligningPersistRootResize.RESIZE_TO_SAFE_AREA:
                this.ResizeToSafeArea();
                break;
        }

        this.m_layoutData = null;
    }

    //----------------------------------------------------------------

    //================================================================
    // 對齊方法 (Align)
    //================================================================

    //----------------------------------------------------------------
    /** 對齊至 Canvas 中心 */
    private AlignCanvasCenter(): void {
        const screenCenter  = this.m_layoutData?.screenCenter ?? Device.Current.ScreenCenter;
        this.node.position  = screenCenter.clone().add( this.AlignOffset );
    }

    //----------------------------------------------------------------
    /** 對齊至 Canvas 底部 */
    private AlignCanvasBottom(): void {
        const screenSize    = this.m_layoutData?.screenSize ?? Device.Current.DesignSize;
        const screenCenter  = this.m_layoutData?.screenCenter ?? Device.Current.ScreenCenter;
        const safeOffsetY   = this.m_avoidNotch ? AligningPersistRoot.NotchOffsetBottom : 0;
        const bottomOffset  = math.v3( 0, -screenSize.height * 0.5 + safeOffsetY );

        this.node.position  = screenCenter.clone().add( bottomOffset ).add( this.AlignOffset );
    }

    //----------------------------------------------------------------
    /** 對齊至 Canvas 頂部 */
    private AlignCanvasTop(): void {
        const screenSize    = this.m_layoutData?.screenSize ?? Device.Current.DesignSize;
        const screenCenter  = this.m_layoutData?.screenCenter ?? Device.Current.ScreenCenter;
        const safeOffsetY   = this.m_avoidNotch ? AligningPersistRoot.NotchOffsetTop : 0;
        const topOffset     = math.v3( 0, screenSize.height * 0.5 + safeOffsetY );

        this.node.position  = screenCenter.clone().add( topOffset ).add( this.AlignOffset );
    }

    //----------------------------------------------------------------
    /** 對齊至 Canvas 左側 */
    private AlignCanvasLeft(): void {
        const screenSize    = this.m_layoutData?.screenSize ?? Device.Current.DesignSize;
        const screenCenter  = this.m_layoutData?.screenCenter ?? Device.Current.ScreenCenter;
        const safeOffsetX   = this.m_avoidNotch ? AligningPersistRoot.NotchOffsetLeft : 0;
        const leftOffset    = math.v3( -screenSize.width * 0.5 + safeOffsetX, 0 );

        this.node.position  = screenCenter.clone().add( leftOffset ).add( this.AlignOffset );
    }

    //----------------------------------------------------------------
    /** 對齊至 Canvas 右側 */
    private AlignCanvasRight(): void {
        const screenSize    = this.m_layoutData?.screenSize ?? Device.Current.DesignSize;
        const screenCenter  = this.m_layoutData?.screenCenter ?? Device.Current.ScreenCenter;
        const safeOffsetX   = this.m_avoidNotch ? AligningPersistRoot.NotchOffsetRight : 0;
        const rightOffset   = math.v3( screenSize.width * 0.5 - safeOffsetX, 0 );

        this.node.position  = screenCenter.clone().add( rightOffset ).add( this.AlignOffset );
    }

    //----------------------------------------------------------------
    /** 對齊至 Safe Area 中心 */
    private AlignSafeAreaCenter(): void {
        const safeAreaRect  = sys.getSafeAreaRect();
        const safeCenter    = math.v3( safeAreaRect.center.x, safeAreaRect.center.y, 0 );
        this.node.position  = safeCenter.add( this.AlignOffset );
    }

    //----------------------------------------------------------------

    //================================================================
    // 尺寸調整 (Resize)
    //================================================================

    //----------------------------------------------------------------
    /** 調整節點尺寸至 Canvas */
    private ResizeToCanvas(): void {
        const screenSize = this.m_layoutData?.screenSize ?? Device.Current.DesignSize;
        NodeUtils.SetSize( this.node, screenSize );
    }

    //----------------------------------------------------------------
    /** 調整節點尺寸至 Safe Area */
    private ResizeToSafeArea(): void {
        const safeAreaRect = sys.getSafeAreaRect();
        NodeUtils.SetSize( this.node, safeAreaRect.size );
    }

    //----------------------------------------------------------------

    //================================================================
    // 事件處理
    //================================================================

    //----------------------------------------------------------------
    /** 對齊模式變更 */
    private OnAlignModeChanged(nextMode: AligningPersistRootMode, prevMode: AligningPersistRootMode): void
    {
        // 移除舊的事件監聽
        switch (prevMode) {
            case AligningPersistRootMode.ALIGN_ON_LAYOUT_SCENE_UI:
                EventDispatcher.Shared.Off( EventDefine.System.LAYOUT_STAGE_UI, this.OnLayoutEvent, this );
                break;
            case AligningPersistRootMode.ALIGN_ON_LAYOUT_DEVICE_ORIENTATION:
                EventDispatcher.Shared.Off( EventDefine.System.ORIENTATION_CHANGED, this.OnLayoutEvent, this );
                break;
            case AligningPersistRootMode.ALIGN_ON_LAYOUT_INTERFACE_ORIENTATION:
                EventDispatcher.Shared.Off( EventDefine.System.INTERFACE_ORIENTATION_CHANGED, this.OnLayoutEvent, this );
                break;
        }

        if (!isValid(this, true)) {
            return;
        }

        // 添加新的事件監聽
        switch (nextMode) {
            case AligningPersistRootMode.ALIGN_ON_LAYOUT_SCENE_UI:
                EventDispatcher.Shared.On( EventDefine.System.LAYOUT_STAGE_UI, this.OnLayoutEvent, this );
                break;
            case AligningPersistRootMode.ALIGN_ON_LAYOUT_DEVICE_ORIENTATION:
                EventDispatcher.Shared.On( EventDefine.System.ORIENTATION_CHANGED, this.OnLayoutEvent, this );
                break;
            case AligningPersistRootMode.ALIGN_ON_LAYOUT_INTERFACE_ORIENTATION:
                EventDispatcher.Shared.On( EventDefine.System.INTERFACE_ORIENTATION_CHANGED, this.OnLayoutEvent, this );
                break;
        }
    }

    //----------------------------------------------------------------
    /** 排版事件處理 */
    private OnLayoutEvent()
    {
        const isPortrait: boolean = Device.Current.IsPortrait
        const screenCenter: math.Vec3 = Device.Current.ScreenCenter;
        const screenSize: math.Size = Device.Current.DesignSize;
        this.m_layoutData = { isPortrait, screenCenter, screenSize };
        this.UpdateAligning( true );
    }

    //----------------------------------------------------------------
    /** 排版事件，處理瀏海 */
    private OnLayoutNotch()
    {
        const isPortrait: boolean = Device.Current.IsPortrait

        // 不需要避開瀏海 => 不處理
        if (!this.m_avoidNotch) {
            return;
        }

        // 不需要重複處理 => 不處理
        if (this.AlignMode === AligningPersistRootMode.ALIGN_ON_LAYOUT_INTERFACE_ORIENTATION) {
            return;
        }

        // 不需要重複處理 => 不處理
        if (this.AlignMode === AligningPersistRootMode.ALIGN_ON_LAYOUT_DEVICE_ORIENTATION && this.m_isPortrait !== isPortrait) {
            return;
        }

        // 必須跟隨場景方向，若方向不同則不處理
        if (this.AlignMode === AligningPersistRootMode.ALIGN_ON_LAYOUT_SCENE_UI && this.m_isPortrait !== isPortrait) {
            return;
        }

        // 只有對齊 Canvas 邊緣時才處理
        switch (this.AlignType) {
            case AligningPersistRootType.CANVAS_BOTTOM:
            case AligningPersistRootType.CANVAS_TOP:
            case AligningPersistRootType.CANVAS_LEFT:
            case AligningPersistRootType.CANVAS_RIGHT:
            {
                this.UpdateAligning();
                break;
            }
        }
    }

    //----------------------------------------------------------------
    /** 螢幕頂部需要偏移多少 pixel 閃避瀏海 (不需閃避時為 0 px，向上為正) */
    private static get NotchOffsetTop(): number
    {
        switch (Device.Current.InterfaceOrientation)
        {
            case Device.InterfaceOrientation.PORTRAIT:{
                const diffY = sys.getSafeAreaRect().origin.y;
                return diffY > 0 ? -diffY : 0;
            }
            case Device.InterfaceOrientation.PORTRAIT_UPSIDE_DOWN:{
                const diffY = sys.getSafeAreaRect().origin.y;
                return diffY < 0 ? +diffY : 0;
            }
        }
        return 0;
    }

    /** 螢幕底部需要偏移多少 pixel 閃避瀏海 (不需閃避時為 0 px，向上為正) */
    private static get NotchOffsetBottom(): number
    {
        switch (Device.Current.InterfaceOrientation)
        {
            case Device.InterfaceOrientation.PORTRAIT:{
                const diffY = sys.getSafeAreaRect().origin.y;
                return diffY < 0 ? -diffY : 0;
            }
            case Device.InterfaceOrientation.PORTRAIT_UPSIDE_DOWN:{
                const diffY = sys.getSafeAreaRect().origin.y;
                return diffY > 0 ? +diffY : 0;
            }
        }
        return 0;
    }

    /** 螢幕左側需要偏移多少 pixel 閃避瀏海 (不需閃避時為 0 px，向右為正) */
    public static get NotchOffsetLeft(): number
    {
        switch (Device.Current.InterfaceOrientation)
        {
            case Device.InterfaceOrientation.LANDSCAPE_LEFT:{
                const diffX = sys.getSafeAreaRect().origin.x;
                return diffX > 0 ? +diffX : 0;
            }
            case Device.InterfaceOrientation.LANDSCAPE_RIGHT:{
                const diffX = sys.getSafeAreaRect().origin.x;
                return diffX < 0 ? -diffX : 0;
            }
        }
        return 0;
    }

    /** 螢幕右側需要偏移多少 pixel 閃避瀏海 (不需閃避時為 0 px，向右為正) */
    private static get NotchOffsetRight(): number
    {
        switch (Device.Current.InterfaceOrientation)
        {
            case Device.InterfaceOrientation.LANDSCAPE_LEFT:{
                const diffX = sys.getSafeAreaRect().origin.x;
                return diffX < 0 ? -diffX : 0;
            }
            case Device.InterfaceOrientation.LANDSCAPE_RIGHT:{
                const diffX = sys.getSafeAreaRect().origin.x;
                return diffX > 0 ? +diffX : 0;
            }
        }
        return 0;
    }
}
