import { _decorator, director, Node, Vec3 } from 'cc'
import { Device } from '../Device/Device'
import { Define } from '../Define/GeneralDefine'
import { CenterTargeting } from '../Toolkit/CenterTargeting'
import { NATIVE } from 'cc/env'
const { ccclass, property, menu } = _decorator

@ccclass('Border')
@menu('Toolkit/Border')
export class Border extends CenterTargeting {
    @property({
        type: Node,
        tooltip: 'Left',
        displayName: 'Left',
    })
    private m_left: Node = null

    @property({
        type: Node,
        tooltip: 'Right',
        displayName: 'Right',
    })
    private m_right: Node = null

    @property({
        type: Node,
        tooltip: 'Top',
        displayName: 'Top',
    })
    private m_top: Node = null
    
    @property({
        type: Node,
        tooltip: 'Bottom',
        displayName: 'Bottom',
    })
    private m_bottom: Node = null

    protected onLoad(): void {
        if (NATIVE) {
            super.onLoad()
            this.node.setSiblingIndex(Define.ZIndex.Global.BORDER)
            director.addPersistRootNode(this.node)
        }
    }

    protected override OnOrientationChange(orientation: Device.Orientation) {
        super.OnOrientationChange(orientation)
        const center:Vec3 = Device.Current.ScreenCenter
        this.m_left.setPosition(-center.x, 0, 0)
        this.m_right.setPosition(center.x, 0, 0)
        this.m_top.setPosition(0, center.y, 0)
        this.m_bottom.setPosition(0, -center.y, 0)
    }
}


