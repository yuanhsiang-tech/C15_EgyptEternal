import {
    _decorator, Component, Node, Vec2, Enum, v2, Color,
    UIOpacity, UITransform, UIRenderer, isValid
} from 'cc'

const { ccclass, property, executeInEditMode, menu } = _decorator

enum SizeMode {
    WIDTH = 0x01,
    HEIGHT = 0x02,
    BOTH = 0x03
}

enum PositionMode {
    X = 0x01,
    Y = 0x02,
    BOTH = 0x03
}

enum ScaleMode {
    X = 0x01,
    Y = 0x02,
    BOTH = 0x03
}

enum ColorMode {
    R = 0x01,
    G = 0x02,
    B = 0x04,
    RGB = 0x07,
    A = 0x08,
    RGBA = 0x0F,
}

@ccclass('SyncNode')
@menu('Stark/SyncNode')
@executeInEditMode
export class SyncNode extends Component {
    private m_lastPos: Vec2
    private m_lastRotation: number

    public get Nodes(): Node[] {
        return this.m_nodes
    }
    public set Nodes(nodes: Node[]) {
        this.m_nodes = nodes
    }

    @property({
        displayName: "Sync OnEnable",
        tooltip: "當 Node 啟用時同步一次所有選定的狀態至屬性 Group Nodes 中"
    })
    private m_syncOnEnable: boolean = true

    @property({
        displayName: "Sync Recursive",
        tooltip: "是否遞迴同步屬性 Group Nodes 中帶有 SyncNode 元件的節點"
    })
    private m_syncRecursive: boolean = false

    @property({
        type: [Node],
        displayName: "Group Nodes"
    })
    private m_nodes: Node[] = []

    @property({
        displayName: "Active Aware",
        tooltip: "當啓閉狀態改變時是否讓群組裡的 Node 跟著啓閉調整"
    })
    private m_activeAware: boolean = true
    public set ActiveAware(value: boolean) { this.m_activeAware = value }

    @property({
        displayName: "Position Aware",
        tooltip: "當位置改變時是否讓群組裡的 Node 跟著調整相對位置"
    })
    private m_positionAware: boolean = false

    public set PositionAware(value: boolean) { this.m_positionAware = value }

    @property({
        type: Enum(PositionMode),
        displayName: "Position Mode",
        tooltip: "當座標改變時子元件跟著調動的參數",
        visible: function () {
            return this.m_positionAware
        }
    })
    private m_positionMode: PositionMode = PositionMode.BOTH

    @property({
        displayName: "Rotation Aware",
        tooltip: "當旋轉改變時是否讓群組裡的 Node 跟著調整轉角"
    })
    private m_rotationAware: boolean = false

    @property({
        displayName: "Scale Aware",
        tooltip: "當縮放比例改變時是否讓群組裡的 Node 跟著改變縮放比例"
    })
    private m_scaleAware: boolean = false

    @property({
        type: Enum(ScaleMode),
        displayName: "Scale Mode",
        tooltip: "當縮放改變時子元件跟著調動的參數",
        visible: function () {
            return this.m_scaleAware
        }
    })
    private m_scaleMode: ScaleMode = ScaleMode.BOTH

    @property({
        displayName: "Color Aware",
        tooltip: "當顏色改變時是否讓群組裡的 Node 跟著改變顏色"
    })
    private m_colorAware: boolean = false

    @property({
        type: Enum(ColorMode),
        displayName: "Color Mode",
        tooltip: "當顏色改變時子元件跟著調動的參數",
        visible: function () {
            return this.m_colorAware
        }
    })
    private m_colorMode: ColorMode = ColorMode.RGBA

    @property({
        displayName: "Size Aware",
        tooltip: "當大小改變時是否讓群組裡的 Node 跟著改變大小"
    })
    private m_sizeAware: boolean = false

    @property({
        type: Enum(SizeMode),
        displayName: "Size Mode",
        tooltip: "當大小改變時子元件跟著調動的參數",
        visible: function () {
            return this.m_sizeAware
        }
    })
    private m_sizeMode: SizeMode = SizeMode.BOTH

    @property({
        displayName: "Opacity Aware",
        tooltip: "當透明度改變時是否讓群組裡的 Node 跟著改變透明度"
    })
    private m_opacityAware: boolean = false

    public set OpacityAware(value: boolean) { this.m_opacityAware = value }

    __preload() {
        this.m_lastPos = v2(this.node.position.x, this.node.position.y)
        this.m_lastRotation = this.node.angle

        this.node.on(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, this.OnActiveChanged, this)
        this.node.on(Node.EventType.COLOR_CHANGED, this.OnColorChanged, this)
        this.node.on(Node.EventType.TRANSFORM_CHANGED, this.OnTransformChanged, this)
        this.node.on(Node.EventType.SIZE_CHANGED, this.OnSizeChanged, this)

        this.node.getComponent(UIOpacity)
    }

    public onDestroy() {
        super.onDestroy && super.onDestroy()
        this.node.off(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED, this.OnActiveChanged, this)
        this.node.off(Node.EventType.TRANSFORM_CHANGED, this.OnTransformChanged, this)
        this.node.off(Node.EventType.COLOR_CHANGED, this.OnColorChanged, this)
        this.node.off(Node.EventType.SIZE_CHANGED, this.OnSizeChanged, this)
    }

    public onEnable() {
        super.onEnable && super.onEnable()
        this.m_syncOnEnable && this.SyncAware()
    }

    public update(dt: number): void {
        super.update && super.update(dt)
    }

    /**
     * 同步所有屬性
     */
    private SyncAware() {
        this.SyncActive()
        this.SyncSize()
        this.SyncPosition()
        this.SyncRotation()
        this.SyncOpacity()
        this.SyncColor()
        this.SyncScale()
    }

    /**
     * 同步子 SyncNode
     * @param syncFunc 同步執行的方法
     * @param node 同步對象
     */
    private SyncGroupChild(syncFunc: Function, node: Node) {
        if (this.m_syncRecursive && isValid(node, true)) {
            const syncNode: SyncNode = node.getComponent(SyncNode)
            syncNode && syncFunc.call(syncNode)
        }
    }

    /**
     * 同步縮放
     */
    private SyncScale() {
        if (this.m_scaleAware) {
            for (let eachNode of this.m_nodes) {
                if (eachNode && eachNode.isValid) {
                    !!(this.m_scaleMode & ScaleMode.X) && eachNode.setScale(this.node.scale.x, eachNode.scale.y)
                    !!(this.m_scaleMode & ScaleMode.Y) && eachNode.setScale(eachNode.scale.x, this.node.scale.y)
                    this.SyncGroupChild(this.SyncScale, eachNode)
                }
            }
        }
    }

    /**
     * 變換屬性變動事件
     */
    private OnTransformChanged(transformType: number) {
        if (Node.TransformBit.POSITION & transformType) {
            this.OnPositionChanged()
        }
        if (Node.TransformBit.ROTATION & transformType) {
            this.OnRotationChanged()
        }
        if (Node.TransformBit.SCALE & transformType) {
            this.OnScaleChanged()
        }
    }

    /**
     * 縮放變動事件
     */
    private OnScaleChanged() {
        this.SyncScale()
    }

    /**
     * 同步顏色
     */
    private SyncColor() {
        if (this.m_colorAware) {
            const renderer = this.node.getComponent(UIRenderer)
            if (renderer) {
                const srcColor = renderer.color

                for (let eachNode of this.m_nodes) {
                    if (eachNode && eachNode.isValid) {
                        const renderer = eachNode.getComponent(UIRenderer)
                        if (renderer) {
                            const targetColor = new Color(renderer.color)
                            if (this.m_colorMode & ColorMode.R) targetColor.r = srcColor.r
                            if (this.m_colorMode & ColorMode.G) targetColor.g = srcColor.g
                            if (this.m_colorMode & ColorMode.B) targetColor.b = srcColor.b
                            if (this.m_colorMode & ColorMode.A) targetColor.a = srcColor.a
                            renderer.color = targetColor
                            this.SyncGroupChild(this.SyncColor, eachNode)
                        }
                    }
                }
            }
        }
    }

    /**
     * 顏色變動事件
     * 透明度變動事件
     */
    private OnColorChanged() {
        this.SyncColor()
        // 只有在 Opacity Aware 開啟且 Color Aware 沒有包含 Alpha 通道時才單獨同步透明度
        if (this.m_opacityAware && (!this.m_colorAware || !(this.m_colorMode & ColorMode.A))) {
            this.SyncOpacity()
        }
    }

    /**
     * 同步透明度
     */
    private SyncOpacity() {
        if (this.m_opacityAware) {
            const renderer = this.node.getComponent(UIRenderer)
            if (renderer) {
                const srcColor = renderer.color

                for (let eachNode of this.m_nodes) {
                    if (eachNode && eachNode.isValid) {
                        const renderer = eachNode.getComponent(UIRenderer)
                        if (renderer) {
                            const targetColor = new Color(renderer.color)
                            targetColor.a = srcColor.a
                            renderer.color = targetColor
                            this.SyncGroupChild(this.SyncColor, eachNode)
                        }
                    }
                }
            }
        }
    }

    /**
     * 同步旋轉
     */
    private SyncRotation() {
        if (this.m_rotationAware) {
            let rotateDiff = this.node.angle - this.m_lastRotation
            this.m_lastRotation = this.node.angle
            for (let eachNode of this.m_nodes) {
                if (eachNode && eachNode.isValid) {
                    eachNode.angle = eachNode.angle + rotateDiff
                    this.SyncGroupChild(this.SyncRotation, eachNode)
                }
            }
        }
    }

    /**
     * 旋轉變動事件
     */
    private OnRotationChanged() {
        this.SyncRotation()
    }

    /**
     * 同步啓閉
     */
    private SyncActive() {
        if (this.m_activeAware) {
            let active = this.node.active
            for (let eachNode of this.m_nodes) {
                if (eachNode && eachNode.isValid) {
                    eachNode.active = active
                    this.SyncGroupChild(this.SyncActive, eachNode)
                }
            }
        }
    }

    /**
     * 啓閉變動事件
     */
    private OnActiveChanged() {
        this.SyncActive()
    }

    /**
     * 同步位置
     */
    private SyncPosition() {
        if (this.m_positionAware) {
            let diffX = this.node.position.x - this.m_lastPos.x
            let diffY = this.node.position.y - this.m_lastPos.y
            this.m_lastPos.x = this.node.position.x
            this.m_lastPos.y = this.node.position.y
            for (let eachNode of this.m_nodes) {
                if (eachNode && eachNode.isValid) {
                    !!(this.m_positionMode & PositionMode.X) && eachNode.setPosition(eachNode.position.x + diffX, eachNode.position.y, eachNode.position.z)
                    !!(this.m_positionMode & PositionMode.Y) && eachNode.setPosition(eachNode.position.x, eachNode.position.y + diffY, eachNode.position.z)
                    this.SyncGroupChild(this.SyncPosition, eachNode)
                }
            }
        }
    }

    /**
     * 位置變動事件
     */
    private OnPositionChanged() {
        this.SyncPosition()
    }

    /**
     * 同步大小
     */
    private SyncSize() {
        if (this.m_sizeAware) {
            for (let eachNode of this.m_nodes) {
                if (eachNode && eachNode.isValid) {
                    !!(this.m_sizeMode & SizeMode.WIDTH) && (eachNode.getComponent(UITransform).width = this.node.getComponent(UITransform).width)
                    !!(this.m_sizeMode & SizeMode.HEIGHT) && (eachNode.getComponent(UITransform).height = this.node.getComponent(UITransform).height)
                    this.SyncGroupChild(this.SyncSize, eachNode)
                }
            }
        }
    }

    /**
     * 大小變動事件
     */
    private OnSizeChanged() {
        this.SyncSize()
    }
}
