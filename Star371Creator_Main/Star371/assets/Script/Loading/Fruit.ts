import {
    _decorator, Component, Sprite, Vec2, Vec3, Size,
    UITransform, SpriteFrame, tween,
} from 'cc'
import { FruitGameCallBack, FruitPhysicsConst, FruitGameConst } from './LoadingDefine'

const { ccclass, property, menu } = _decorator

@ccclass('Fruit')
@menu('Loading/Fruit')
export class Fruit extends Component {

    @property({
        type: Sprite,
        displayName: "Fruit Background Sprite",
        group: "Display"
    })
    private m_bgSprite: Sprite = null

    @property({
        type: Sprite,
        displayName: "Fruit Frame Sprite",
        group: "Display"
    })
    private m_frameSprite: Sprite = null

    @property({
        type: Sprite,
        displayName: "Fruit Sprite",
        group: "Display"
    })
    private m_iconSprite: Sprite = null

    // 水果属性
    private m_fruitType: number = 0
    private m_sliced: boolean = false

    // 物理属性
    private m_velocity: Vec2 = new Vec2()
    private m_gravity: number = FruitPhysicsConst.DEFAULT_GRAVITY
    private m_rotationSpeed: number = 0

    private m_fruitGameCallBack: FruitGameCallBack = null

    protected onLoad(): void {
        this.m_sliced = false
    }

    public Init(fruitType: number, fruitSpriteFrame: SpriteFrame, fruitGameCallBack: FruitGameCallBack): boolean {
        this.m_fruitType = fruitType
        this.m_sliced = false

        // 设置初始物理属性
        this.m_velocity = new Vec2(
            (Math.random() * (FruitPhysicsConst.VELOCITY_X_MAX - FruitPhysicsConst.VELOCITY_X_MIN) + FruitPhysicsConst.VELOCITY_X_MIN),
            (Math.random() * (FruitPhysicsConst.VELOCITY_Y_MAX - FruitPhysicsConst.VELOCITY_Y_MIN) + FruitPhysicsConst.VELOCITY_Y_MIN)
        )
        this.m_gravity = FruitPhysicsConst.DEFAULT_GRAVITY
        this.m_rotationSpeed = (Math.random() * (FruitPhysicsConst.ROTATION_SPEED_MAX - FruitPhysicsConst.ROTATION_SPEED_MIN) + FruitPhysicsConst.ROTATION_SPEED_MIN)

        this.node.setScale(new Vec3(FruitPhysicsConst.DEFAULT_SCALE, FruitPhysicsConst.DEFAULT_SCALE, 1))
        this.m_iconSprite.spriteFrame = fruitSpriteFrame

        this.m_fruitGameCallBack = fruitGameCallBack
        this.SetOpacity(FruitGameConst.OPACITY_FULL)

        return true
    }

    public UpdatePhysics(dt: number): void {
        if (this.m_sliced) return

        // 更新位置
        const pos: Vec3 = this.node.getPosition()
        this.m_velocity.y += this.m_gravity * dt
        pos.x += this.m_velocity.x * dt
        pos.y += this.m_velocity.y * dt

        this.node.setPosition(pos)

        // 更新旋转
        const currentRotation: number = this.node.eulerAngles.z
        this.node.setRotationFromEuler(new Vec3(0, 0, currentRotation + this.m_rotationSpeed * dt))
    }

    public Slice(): void {
        if (this.m_sliced) return

        this.m_sliced = true

        // 切片效果动画
        const currentScale: Vec3 = this.node.getScale()
        tween(this.node)
            .parallel(
                tween().to(FruitPhysicsConst.SLICE_ANIMATION_DURATION, { 
                    scale: new Vec3(currentScale.x * FruitPhysicsConst.SLICE_SCALE_MULTIPLIER, currentScale.y * FruitPhysicsConst.SLICE_SCALE_MULTIPLIER, 1)
                }),
                tween().to(FruitPhysicsConst.SLICE_ANIMATION_DURATION, {}, {
                    onUpdate: (target, ratio) => {
                        // 渐隐效果
                        this.SetOpacity(FruitGameConst.OPACITY_FULL * (1 - ratio))
                    }
                })
            )
            .call(() => {
                this.SetOpacity(FruitGameConst.OPACITY_ZERO)
                this.m_fruitGameCallBack.OnFruitEnd(this)
            })
            .start()
    }

    public GetCollisionRadius(): number {
        const uiTransform: UITransform = this.node.getComponent(UITransform)
        if (uiTransform) {
            const size: Size = uiTransform.contentSize
            return Math.max(size.width, size.height) * FruitPhysicsConst.COLLISION_RADIUS_MULTIPLIER
        }
        return FruitPhysicsConst.DEFAULT_COLLISION_RADIUS // 默认半径
    }

    // Getters
    public GetFruitType(): number {
        return this.m_fruitType
    }

    public IsSliced(): boolean {
        return this.m_sliced
    }

    public GetVelocity(): Vec2 {
        return this.m_velocity.clone()
    }

    public SetOpacity(opacity: number): void {
        opacity = Math.max(0, Math.min(255, Math.round(opacity)))
        if (this.m_bgSprite) {
            const color = this.m_bgSprite.color.clone()
            color.a = opacity
            this.m_bgSprite.color = color
        }
        if (this.m_frameSprite) {
            const color = this.m_frameSprite.color.clone()
            color.a = opacity
            this.m_frameSprite.color = color
        }
        if (this.m_iconSprite) {
            const color = this.m_iconSprite.color.clone()
            color.a = opacity
            this.m_iconSprite.color = color
        }
    }
}
