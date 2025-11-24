import { _decorator, Node, Component, Vec3 } from "cc";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { LazyUpdating } from "db://assets/Stark/Utility/LazyUpdating";


const { ccclass, property, menu } = _decorator;

//================================================================================================
/**
 * 自動調整節點縮放
 * (不會調整 width 和 height 屬性，透過 scale 達成縮放效果)
 */
//================================================================================================

@ccclass
@menu("Toolkit/AligningNode")
export default class AligningNode extends Component
{
    //----------------------------------------------------------------

    public static InstallTo(
        node: Node,
        option?: {
            /** 固定長寬比 */
            FixedAspectRatio ?:boolean,
            /** 自動調整寬度 */
            FitWidth ?:boolean,
            /** 自動調整高度 */
            FitHeight ?:boolean,
            /** 最大寬度 (px) */
            MaxWidth ?:number,
            /** 最大高度 (px) */
            MaxHeight ?:number
        }
    ): AligningNode {
        const aligningNode = NodeUtils.InstallComponent(node, AligningNode);
        if (option) {
            aligningNode.FixedAspectRatio = option.FixedAspectRatio ?? true;
            aligningNode.FitWidth         = option.FitWidth         ?? true;
            aligningNode.FitHeight        = option.FitHeight        ?? true;
            aligningNode.MaxWidth         = option.MaxWidth         ?? 0;
            aligningNode.MaxHeight        = option.MaxHeight        ?? 0;
        }
        return aligningNode;
    }

    //----------------------------------------------------------------

    /** 是否固定長寬比 */
    @property({ displayName: "固定長寬比" })
    public FixedAspectRatio: boolean = true;

    /** 是否自動調整寬度 */
    @property({ displayName: "自動調整寬度" })
    public FitWidth: boolean = true;

    /** 是否自動調整高度 */
    @property({ displayName: "自動調整高度" })
    public FitHeight: boolean = true;

    /** 是否允許放大 */
    @property({ displayName: "允許放大" })
    public Enlargeable: boolean = true;

    //----------------------------------------------------------------

    @property
    private _maxWidth: number = 0;

    /** 最大寬度 (px) */
    @property({
        displayName: "Max Width",
        min: 0,
        visible: function(this: AligningNode) { return this.FitWidth; }
    })
    public get MaxWidth(): number {
        return this._maxWidth;
    }
    public set MaxWidth(value: number) {
        this._maxWidth = NumberUtils.ClampPositive( value );
    }

    //----------------------------------------------------------------

    @property
    private _maxHeight: number = 0;

    /** 最大高度 (px) */
    @property({
        displayName: "Max Height",
        min: 0,
        visible: function(this: AligningNode) { return this.FitHeight; }
    })
    public get MaxHeight(): number {
        return this._maxHeight;
    }
    public set MaxHeight(value: number) {
        this._maxHeight = NumberUtils.ClampPositive( value );
    }

    //----------------------------------------------------------------

    private m_lazyRescaling: LazyUpdating = null;
    private get LazyRescaling(): LazyUpdating {
        return this.m_lazyRescaling || (this.m_lazyRescaling = new LazyUpdating(() => this.RescaleNow()));
    }

    //----------------------------------------------------------------

    private m_baseScale: Vec3 = null;
    /** 基礎縮放比例 */
    public get BaseScale(): Vec3 {
        return this.m_baseScale || (this.m_baseScale = this.node.scale.clone());
    }
    public set BaseScale(value: Vec3) {
        this.m_baseScale = value;
    }

    //----------------------------------------------------------------

    protected onLoad(): void
    {
        if (this.FitWidth && this.MaxWidth <= 0) {
            this.MaxWidth = NodeUtils.GetWidth( this.node );
        }

        if (this.FitHeight && this.MaxHeight <= 0) {
            this.MaxHeight = NodeUtils.GetHeight( this.node );
        }

        // 如果沒有手動設定基礎縮放比例，則事先快取目前節點的縮放比例
        let baseScale = this.BaseScale;
    }

    //----------------------------------------------------------------

    protected onEnable(): void {
        this.node.on( Node.EventType.SIZE_CHANGED, this.OnNodeSizeChanged, this );
        this.LazyRescaling.Update();
    }

    //----------------------------------------------------------------

    protected onDisable(): void {
        this.node.off( Node.EventType.SIZE_CHANGED, this.OnNodeSizeChanged, this );
    }

    //----------------------------------------------------------------

    protected onDestroy(): void {
        this.m_lazyRescaling?.Cancel();
        this.m_lazyRescaling = null;
    }

    //----------------------------------------------------------------
    /**
     * 重新調整縮放
     */
    public Rescale(immediately: boolean = false): this {
        this.LazyRescaling.Update(immediately);
        return this;
    }

    //----------------------------------------------------------------
    /**
     * 立即重新調整縮放
     */
    private RescaleNow(): void
    {
        // 取得 SpriteFrame 寬高
        const nodeWidth = NodeUtils.GetWidth( this.node );
        const nodeHeight = NodeUtils.GetHeight( this.node );
        let widthRatio = 1;
        let heightRatio = 1;

        // 調整寬度
        if (this.FitWidth && this.MaxWidth > 0) {
            const viewWidth = nodeWidth * Math.abs( this.BaseScale.x );
            if ((this.Enlargeable && viewWidth > 0) || (viewWidth > this.MaxWidth)) {
                widthRatio = this.MaxWidth / viewWidth;
            }
        }

        // 調整高度
        if (this.FitHeight && this.MaxHeight > 0) {
            const viewHeight = nodeHeight * Math.abs( this.BaseScale.y );
            if ((this.Enlargeable && viewHeight > 0) || (viewHeight > this.MaxHeight)) {
                heightRatio = this.MaxHeight / viewHeight;
            }
        }

        // 依照固定長寬比調整
        if (this.FixedAspectRatio) {
            widthRatio = heightRatio = Math.min( widthRatio, heightRatio );
        }

        // 設定縮放比例
        this.node.scale = new Vec3(
            this.BaseScale.x * widthRatio,
            this.BaseScale.y * heightRatio,
            this.BaseScale.z
        );
    }

    //----------------------------------------------------------------

    private OnNodeSizeChanged(): void {
        this.LazyRescaling.Update();
    }

    //----------------------------------------------------------------
}
