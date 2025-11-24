import { _decorator, isValid, Node, Component, Sprite, SpriteFrame } from "cc";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";

const { ccclass, property, requireComponent, menu } = _decorator;

//================================================================================================
/**
 * 自動調整 Sprite 大小
 * 會依照 SpriteFrame 的大小自動調整節點大小 (width 和 height，並且會將 SpriteSizeMode 設定為 CUSTOM)
 */
//================================================================================================

@ccclass
@menu("Toolkit/AligningSprite")
@requireComponent(Sprite)
export default class AligningSprite extends Component
{
    //----------------------------------------------------------------
    /**
     * 安裝 AligningSprite 元件
     * @param node 節點
     * @param option 選項
     */
    public static InstallTo(
        node    : Node,
        option ?: {
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
    ): AligningSprite {
        const aligningSprite = NodeUtils.InstallComponent(node, AligningSprite);
        if (option) {
            aligningSprite.FixedAspectRatio = option.FixedAspectRatio ?? true;
            aligningSprite.FitWidth         = option.FitWidth         ?? true;
            aligningSprite.FitHeight        = option.FitHeight        ?? true;
            aligningSprite.MaxWidth         = option.MaxWidth         ?? 0;
            aligningSprite.MaxHeight        = option.MaxHeight        ?? 0;
        }
        return aligningSprite;
    }

    //----------------------------------------------------------------
    /**
     * 設定 SpriteFrame
     */
    public static SetSpriteFrameSafely(node: Node, spriteFrame: SpriteFrame): AligningSprite {
        return AligningSprite.InstallTo(node).SetSpriteFrame(spriteFrame);
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
        visible: function(this: AligningSprite) { return this.FitWidth; }
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
        visible: function(this: AligningSprite) { return this.FitHeight; }
    })
    public get MaxHeight(): number {
        return this._maxHeight;
    }
    public set MaxHeight(value: number) {
        this._maxHeight = NumberUtils.ClampPositive( value );
    }

    //----------------------------------------------------------------

    private m_sprite: Sprite = null;

    /**
     * 取得 Sprite 元件
     */
    public get Sprite(): Sprite {
        return this.m_sprite || (this.m_sprite = this.getComponent(Sprite));
    }

    /**
     * 取得 SpriteFrame
     */
    public get SpriteFrame(): SpriteFrame {
        return this.Sprite?.spriteFrame;
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
    }

    //----------------------------------------------------------------

    protected start(): void {
        this.Resize();
    }

    //----------------------------------------------------------------
    /**
     * 取得與設定 SpriteFrame
     */
    public SetSpriteFrame(value: SpriteFrame): this {
        this.ResizeWith(value);
        return this;
    }

    //----------------------------------------------------------------
    /**
     * 重新調整大小
     */
    public Resize(): this {
        this.ResizeWith(this.SpriteFrame);
        return this;
    }

    //----------------------------------------------------------------
    /**
     * 依據 SpriteFrame 重新調整大小
     */
    private ResizeWith(spriteFrame: SpriteFrame): void
    {
        if (!isValid(this.Sprite, true)) {
            return;
        }

        if (!isValid(spriteFrame, true)) {
            this.Sprite.spriteFrame = null;
            return;
        }

        // 取得 SpriteFrame 寬高
        const sfWidth   = spriteFrame.rect.width;
        const sfHeight  = spriteFrame.rect.height;
        let widthRatio  = 1;
        let heightRatio = 1;

        // 調整寬度
        if (this.FitWidth && this.MaxWidth > 0 && ((this.Enlargeable && sfWidth > 0) || (sfWidth > this.MaxWidth))) {
            widthRatio = this.MaxWidth / sfWidth;
        }

        // 調整高度
        if (this.FitHeight && this.MaxHeight > 0 && ((this.Enlargeable && sfHeight > 0) || (sfHeight > this.MaxHeight))) {
            heightRatio = this.MaxHeight / sfHeight;
        }

        // 依照固定長寬比調整
        if (this.FixedAspectRatio) {
            widthRatio = heightRatio = Math.min( widthRatio, heightRatio );
        }

        // 設定 Sprite 大小
        this.Sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.Sprite.spriteFrame = spriteFrame;
        NodeUtils.SetSize(this.node, sfWidth * widthRatio, sfHeight * heightRatio);
    }

    //----------------------------------------------------------------
}
