import {
    _decorator, Component, Node, Label, Size, Vec2, Vec3,
    UITransform, tween, EventTouch, log,
    MotionStreak, Prefab, SpriteFrame, NodePool, instantiate,
    Tween,
} from 'cc'
import { Fruit } from './Fruit'
import Touchable, { TouchableEvent } from '../../Stark/Interactive/Touchable'
import {
    FruitGameCallBack,
    FruitGameConst,
    FruitPhysicsConst,
    LoadingStrings
} from './LoadingDefine'

const { ccclass, property, menu } = _decorator

@ccclass('FruitSliceGame')
@menu('Loading/FruitGame')
export class FruitSliceGame extends Component implements FruitGameCallBack {

    // UI组件
    @property({
        type: Label,
        displayName: "Score Label",
        group: "UI"
    })
    private m_scoreLabel: Label = null

    @property({
        type: Label,
        displayName: "Debug Label",
        group: "UI"
    })
    private m_debugLabel: Label = null

    @property({
        type: MotionStreak,
        displayName: "Trail Node",
        group: "Effects"
    })
    private m_trailNode: MotionStreak = null

    @property({
        type: Prefab,
        displayName: "Fruit Prefab",
        group: "Resources"
    })
    private m_fruitPrefab: Prefab = null

    @property({
        type: [SpriteFrame],
        displayName: "Fruit Sprite Frames",
        group: "Resources"
    })
    private m_fruitSpriteFrames: SpriteFrame[] = []

    @property({
        type: Touchable,
        displayName: "Game Container",
        group: "Game"
    })
    private m_gameContainer: Touchable = null

    private m_fruitsPool: NodePool = null
    static s_score: number = 0
    // 游戏区域
    private m_gameArea: Size = new Size()

    // 水果管理
    private m_fruits: Fruit[] = []
    private m_fruitSpawnTimer: number = 0.0
    private m_fruitSpawnInterval: number = 1.0

    // 触摸相关
    private m_isTouching: boolean = false
    private m_lastTouchPos: Vec2 = new Vec2()

    // 调试相关
    private m_debugLines: string[] = []
    private m_maxDebugLines: number = 30

    private m_scoreLabelTween: Tween<Node> = null

    protected onLoad(): void {
        this.m_fruitsPool = new NodePool()
        this._initializeGame()
        this._setupTouchEvents()
    }

    protected update(deltaTime: number): void {
        if (!this.node.active) return
        this._updateGame(deltaTime)
    }

    protected onDestroy(): void {
        // 清理 Touchable 事件监听器
        if (this.m_gameContainer) {
            this.m_gameContainer.Off(TouchableEvent.Start, this._onTouchStart, this)
            this.m_gameContainer.Off(TouchableEvent.Move, this._onTouchMove, this)
            this.m_gameContainer.Off(TouchableEvent.End, this._onTouchEnd, this)
            this.m_gameContainer.Off(TouchableEvent.Cancel, this._onTouchCancel, this)
        }
    }

    public Init(gameArea: Size): boolean {
        this.m_gameArea = gameArea
        this.m_fruitSpawnTimer = 0.0
        this.m_fruitSpawnInterval = FruitGameConst.DEFAULT_SPAWN_INTERVAL
        this.m_maxDebugLines = FruitGameConst.MAX_DEBUG_LINES
        this.m_isTouching = false

        // 设置布局
        this._setupLayout()

        // 初始化调试日志
        this._printFunction(LoadingStrings.DEBUG_MESSAGES.GAME_STARTED)
        this._printFunction(`${LoadingStrings.DEBUG_MESSAGES.SCORE_PREFIX}: ${FruitSliceGame.s_score}`)

        return true
    }

    public AddScore(points: number, slicePosition: Vec2): void {
        FruitSliceGame.s_score += points
        this._printFunction(`${LoadingStrings.DEBUG_MESSAGES.SCORE_PREFIX}: ${FruitSliceGame.s_score} (+${points})`)

        // 在切片位置显示分数动画
        if (this.m_scoreLabel) {

            // 设置分数文本和位置
            this.m_scoreLabel.string = FruitSliceGame.s_score.toString()
            this.m_scoreLabel.node.setPosition(new Vec3(slicePosition.x, slicePosition.y + FruitGameConst.SCORE_LABEL_POSITION_OFFSET, 0))
            this.m_scoreLabel.node.active = true

            const color = this.m_scoreLabel.color.clone()
            color.a = FruitGameConst.OPACITY_FULL // 重置透明度
            this.m_scoreLabel.color = color

            if (this.m_scoreLabelTween) {
                this.m_scoreLabelTween.stop()
                this.m_scoreLabelTween = null
            }

            // 创建动画序列：显示1.5秒，然后淡出0.5秒
            this.m_scoreLabelTween = tween(this.m_scoreLabel.node)
                .delay(FruitPhysicsConst.SLICE_DELAY_ANIMATION_DURATION)
                .to(FruitPhysicsConst.SLICE_ANIMATION_DURATION, {}, {
                    onUpdate: (target, ratio) => {
                        const newColor = this.m_scoreLabel.color.clone()
                        newColor.a = FruitGameConst.OPACITY_FULL * (1 - ratio)
                        this.m_scoreLabel.color = newColor
                    }
                })
                .call(() => {
                    this.m_scoreLabel.node.active = false
                    const resetColor = this.m_scoreLabel.color.clone()
                    resetColor.a = FruitGameConst.OPACITY_FULL
                    this.m_scoreLabel.color = resetColor
                    this.m_scoreLabelTween = null
                })
                .start()
        }
    }

    public OnFruitEnd(fruit: Fruit): void {
        this.m_fruitsPool.put(fruit.node)
    }

    public StartGame(): void {
        this._printFunction(LoadingStrings.DEBUG_MESSAGES.GAME_STARTING)

        // 分数保持持久（使用静态变量），标签保持隐藏
        this._printFunction(`${LoadingStrings.DEBUG_MESSAGES.CURRENT_SCORE}: ${FruitSliceGame.s_score}`)

        // 重置游戏状态
        this.m_fruitSpawnTimer = 0.0
        this.m_isTouching = false
        this.m_lastTouchPos = Vec2.ZERO.clone()

        // 隐藏轨迹
        if (this.m_trailNode) {
            let color = this.m_trailNode.color.clone()
            color.a = FruitGameConst.OPACITY_ZERO
            this.m_trailNode.color = color
        }

        // 使游戏可见
        this.node.active = true

        this._printFunction(LoadingStrings.DEBUG_MESSAGES.GAME_SUCCESS)
    }

    // 获取静态分数（供外部访问）
    public static GetScore(): number {
        return FruitSliceGame.s_score
    }

    // 重置静态分数
    public static ResetScore(): void {
        FruitSliceGame.s_score = 0
    }

    // Getters
    public GetGameArea(): Size {
        return this.m_gameArea.clone()
    }

    public GetFruitsCount(): number {
        return this.m_fruits.length
    }

    public CheckSlice(startPos: Vec2, endPos: Vec2): void {
        for (let i = this.m_fruits.length - 1; i >= 0; i--) {
            const fruit: Fruit = this.m_fruits[i]
            if (!fruit || fruit.IsSliced() || !fruit.node.isValid) continue

            const fruitPos = Vec2.clone(fruit.node.position)
            const radius: number = fruit.GetCollisionRadius()

            // 检查直线是否与水果圆形相交
            if (this._lineIntersectsCircle(startPos, endPos, fruitPos, radius)) {
                this._printFunction(`${LoadingStrings.DEBUG_MESSAGES.SLICED_FRUIT}: ${fruit.GetFruitType()}`)
                fruit.Slice()
                // 增加分数，每个水果1分
                this.AddScore(FruitGameConst.POINTS_PER_FRUIT, fruitPos)
                // 从列表中移除
                this.m_fruits.splice(i, 1)
            }
        }
    }

    private _initializeGame(): void {
        this.m_fruits = []
        this.m_debugLines = []
        this.m_fruitSpawnTimer = 0.0
        this.m_isTouching = false
        this.m_lastTouchPos = Vec2.ZERO.clone()
    }

    private _setupLayout(): void {
        // 设置节点大小和位置
        const uiTransform: UITransform = this.node.getComponent(UITransform)
        if (!uiTransform) {
            this.node.addComponent(UITransform)
        }

        const transform: UITransform = this.node.getComponent(UITransform)
        if (transform) {
            transform.setContentSize(this.m_gameArea)
            transform.setAnchorPoint(0, 0)
        }

        this.node.setPosition(Vec3.ZERO)
    }

    private _updateGame(dt: number): void {
        if (!this.node.active) return

        // 更新水果生成计时器
        this.m_fruitSpawnTimer += dt
        if (this.m_fruitSpawnTimer >= this.m_fruitSpawnInterval) {
            this._spawnFruit()
            this.m_fruitSpawnTimer = 0.0
        }

        // 更新所有水果
        for (let i = this.m_fruits.length - 1; i >= 0; i--) {
            const fruit: Fruit = this.m_fruits[i]
            if (!fruit || !fruit.node.isValid) continue

            // 如果水果未被切片，更新物理和边界检查
            if (!fruit.IsSliced()) {
                fruit.UpdatePhysics(dt)
                if (fruit.node.position.y < -FruitGameConst.SPAWN_POSITION_OFFSET) {
                    // 水果离开游戏区域，移除它
                    this.m_fruits.splice(i, 1)
                    this.OnFruitEnd(fruit)
                }
            }
        }
    }

    private _spawnFruit(): void {
        // 创建随机类型的水果
        const fruitType: number = Math.floor(Math.random() * FruitGameConst.MAX_FRUIT_TYPE) + FruitGameConst.MIN_FRUIT_TYPE
        this._printFunction(`${LoadingStrings.DEBUG_MESSAGES.SPAWN_FRUIT}: ${fruitType}`)

        let fruitNode: Node = null
        if (this.m_fruitsPool.size() > 0) {
            fruitNode = this.m_fruitsPool.get()
        } else {
            fruitNode = instantiate(this.m_fruitPrefab)
        }

        let fruit = fruitNode.getComponent(Fruit)
        fruit.Init(fruitType, this.m_fruitSpriteFrames[fruitType], this)

        // 设置初始位置（底部随机位置，在游戏区域内）
        const randomX: number = Math.random() * FruitGameConst.SPAWN_POSITION_MARGIN * 2 - FruitGameConst.SPAWN_POSITION_MARGIN
        fruitNode.parent = this.m_gameContainer.node
        fruitNode.active = true
        this.m_fruits.push(fruit)
        fruitNode.setPosition(new Vec3(randomX, -FruitGameConst.SPAWN_POSITION_OFFSET, 0))
    }

    private _lineIntersectsCircle(lineStart: Vec2, lineEnd: Vec2, center: Vec2, radius: number): boolean {
        // 简化的直线-圆形碰撞检测
        const dx: number = lineEnd.x - lineStart.x
        const dy: number = lineEnd.y - lineStart.y
        const fx: number = lineStart.x - center.x
        const fy: number = lineStart.y - center.y

        const a: number = dx * dx + dy * dy
        const b: number = 2 * (fx * dx + fy * dy)
        const c: number = (fx * fx + fy * fy) - radius * radius

        let discriminant: number = b * b - 4 * a * c
        if (discriminant < 0) {
            return false
        }

        discriminant = Math.sqrt(discriminant)
        const t1: number = (-b - discriminant) / (2 * a)
        const t2: number = (-b + discriminant) / (2 * a)

        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)
    }

    private _printFunction(message: string): void {
        return
        // 输出到控制台
        log(message)

        // 添加到调试行
        this.m_debugLines.push(message)

        // 如果超过最大行数，移除最旧的
        if (this.m_debugLines.length > this.m_maxDebugLines) {
            this.m_debugLines.shift()
        }

        this._updateDebugDisplay()
    }

    private _updateDebugDisplay(): void {
        if (!this.m_debugLabel || !this.m_debugLabel.node.active) {
            return
        }

        let displayText: string = ""
        for (let i = 0; i < this.m_debugLines.length; i++) {
            if (i > 0) displayText += "\n"
            displayText += this.m_debugLines[i]
        }

        this.m_debugLabel.string = displayText
    }

    private _setupTouchEvents(): void {
        // 初始化触摸相关变量
        this.m_isTouching = false
        this.m_lastTouchPos = Vec2.ZERO.clone()

        // 注册 Touchable 事件监听器
        if (this.m_gameContainer) {
            this.m_gameContainer.On(TouchableEvent.Start, this._onTouchStart, this)
            this.m_gameContainer.On(TouchableEvent.Move, this._onTouchMove, this)
            this.m_gameContainer.On(TouchableEvent.End, this._onTouchEnd, this)
            this.m_gameContainer.On(TouchableEvent.Cancel, this._onTouchCancel, this)
        }
    }

    private _onTouchStart(sender: Touchable, ccEvent: EventTouch): void {
        // 只有当游戏可见时才处理事件
        if (!this.node.active) return

        this.m_isTouching = true
        const localPos2D = this._convertToLocalPosition(ccEvent)
        this.m_lastTouchPos = localPos2D.clone()

        // 更新轨迹位置
        if (this.m_trailNode) {
            this.m_trailNode.node.active = false
            this.m_trailNode.node.setPosition(new Vec3(localPos2D.x, localPos2D.y, 0))
            this.m_trailNode.node.active = true
            let color = this.m_trailNode.color.clone()
            color.a = FruitGameConst.OPACITY_FULL
            this.m_trailNode.color = color
        }

        this._printFunction(`${LoadingStrings.DEBUG_MESSAGES.TOUCH_BEGAN}: (${Math.floor(localPos2D.x)}, ${Math.floor(localPos2D.y)})`)
    }

    private _onTouchMove(sender: Touchable, ccEvent: EventTouch): void {
        // 只有当游戏可见时才处理事件
        if (!this.node.active || !this.m_isTouching) return

        const localPos2D = this._convertToLocalPosition(ccEvent)

        // 更新轨迹位置
        if (this.m_trailNode) {
            this.m_trailNode.node.setPosition(new Vec3(localPos2D.x, localPos2D.y, 0))
            let color = this.m_trailNode.color.clone()
            color.a = FruitGameConst.OPACITY_FULL
            this.m_trailNode.color = color
        }

        // 执行切片检查
        this.CheckSlice(this.m_lastTouchPos, localPos2D)
        this.m_lastTouchPos = localPos2D.clone()
    }

    private _onTouchEnd(sender: Touchable, ccEvent: EventTouch): void {
        if (!this.node.active || !this.m_isTouching) return

        this.m_isTouching = false

        // 隐藏轨迹
        if (this.m_trailNode) {
            let color = this.m_trailNode.color.clone()
            color.a = FruitGameConst.OPACITY_ZERO
            this.m_trailNode.color = color
        }

        this._printFunction(LoadingStrings.DEBUG_MESSAGES.TOUCH_ENDED)
    }

    private _onTouchCancel(sender: Touchable, ccEvent: EventTouch): void {
        if (!this.node.active || !this.m_isTouching) return

        this.m_isTouching = false

        // 隐藏轨迹
        if (this.m_trailNode) {
            let color = this.m_trailNode.color.clone()
            color.a = FruitGameConst.OPACITY_ZERO
            this.m_trailNode.color = color
        }

        this._printFunction(LoadingStrings.DEBUG_MESSAGES.TOUCH_CANCELED)
    }

    private _convertToLocalPosition(ccEvent: EventTouch): Vec2 {
        // 将触摸位置转换为本地坐标系
        const worldPos = ccEvent.getUILocation()
        const localPos = this.node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(worldPos.x, worldPos.y, 0))
        return new Vec2(localPos.x, localPos.y)
    }
}