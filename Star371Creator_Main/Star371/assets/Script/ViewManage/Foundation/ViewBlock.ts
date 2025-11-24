import { _decorator, BlockInputEvents, builtinResMgr, Color, Component, Material, Node, rect, size, Sprite, SpriteFrame, Tween, tween, UITransform } from 'cc';
const { ccclass, property } = _decorator;

// 淺色遮黑
const LIGHT_BLOCK_COLOR:Color = new Color(0, 0, 0, 140);

// 深色遮黑
const DARK_BLOCK_COLOR:Color  = new Color(0, 0, 0, 240);

// 淡入淡出時間(單位：秒)
const FADE_IN_DURATION:number = 0.2;

@ccclass('ViewBlock')
export class ViewBlock extends Component {
    /**
     * 建立遮黑元件
     */
    public static Create(): ViewBlock {
        const block:ViewBlock = new Node("ViewBlock").addComponent(ViewBlock);
        block.addComponent(BlockInputEvents);

        const spriteFrame:SpriteFrame = new SpriteFrame();
        spriteFrame.texture = builtinResMgr.get("white-texture");
        spriteFrame.packable = false;
        spriteFrame.rect = rect(0, 0, spriteFrame.texture.width, spriteFrame.texture.height);

        const sprite:Sprite = block.addComponent(Sprite);
        sprite.setMaterialInstance(builtinResMgr.get("ui-sprite-material") as Material, 0);
        sprite.spriteFrame = spriteFrame;
        sprite.color = LIGHT_BLOCK_COLOR;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const transform:UITransform = block.getComponent(UITransform);
        transform.setContentSize(size(5000, 5000));

        return block;
    }

    private m_callback:()=>void;
    private m_tweenTarget:Color;

    /**
     * 取得 Sprite 元件
     */
    private get m_sprite(): Sprite {
        return this.getComponent(Sprite);
    }

    /**
     * 是否為不透明遮黑
     */
    public set Opaque(opaque:boolean) {
        this.m_sprite.enabled = opaque;
    }

    protected onLoad(): void {
        this.node.on(Node.EventType.PARENT_CHANGED, this.OnParentChanged, this);
        this.FadeIn();
    }

    protected onDisable(): void {
        this.StopTween();
        this.m_callback?.();
        this.m_callback = null;
    }

    protected onDestroy(): void {
        this.node.off(Node.EventType.PARENT_CHANGED, this.OnParentChanged, this);
    }

    /**
     * 使用淺色遮黑
     */
    public Light() {
        this.m_sprite.color = LIGHT_BLOCK_COLOR;
    }

    /**
     * 使用深色遮黑
     */
    public Dark() {
        this.m_sprite.color = DARK_BLOCK_COLOR;
    }

    /**
     * 重置設定
     */
    public Reset() {
        this.StopTween();
        this.node.removeFromParent();
    }

    /**
     * 淡出
     */
    public FadeOut(callback:()=>void) {
        this.StopTween();

        if (!this.m_sprite.enabled) {
            callback?.();
        } else {
            const color:Color = this.m_sprite.color.clone();
            this.m_callback = callback;
            this.m_tweenTarget = color;
            tween(this.m_tweenTarget)
                .to(FADE_IN_DURATION, 
                    {
                        r: color.r, 
                        g: color.g, 
                        b: color.b, 
                        a: 0
                    },
                    {
                        onUpdate: (target:Color) => {
                            this.m_sprite.color = target;
                        },
                    })
                .call(()=>{
                    const cb = this.m_callback;
                    this.m_tweenTarget = null;
                    this.m_callback = null;
                    cb?.();
                })
                .start();
        }
    }

    /**
     * 淡入
     */
    public FadeIn() {
        this.StopTween();

        if (this.m_sprite.enabled) {
            const targetColor:Color = this.m_sprite.color.clone();
            const color:Color = new Color(0, 0, 0, 0);
            this.m_sprite.color = color;
            this.m_tweenTarget = color;
            tween(this.m_tweenTarget)
                .to(FADE_IN_DURATION, 
                    {
                        r: targetColor.r, 
                        g: targetColor.g, 
                        b: targetColor.b, 
                        a: targetColor.a
                    },
                    {
                        onUpdate: (target:Color) => {
                            this.m_sprite.color = target;
                        },
                    })
                .call(()=>{
                    this.m_tweenTarget = null;
                })
                .start();
        }
    }

    /**
     * 父節點變換通知
     */
    private OnParentChanged() {
        if (this.node.parent != null) {
            this.FadeIn();
        }
    }

    /**
     * 停止動畫表現
     */
    private StopTween() {
        this.m_tweenTarget && Tween.stopAllByTarget(this.m_tweenTarget);
        this.m_tweenTarget = null;
    }
}