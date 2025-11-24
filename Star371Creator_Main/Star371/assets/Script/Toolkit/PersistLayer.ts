import {
    _decorator, director, __private, view, Widget, Vec3
} from 'cc'

import { PersistWidgetTarget } from './PersistWidgetTarget'
import { Device } from '../Device/Device'
import { Define } from '../Define/GeneralDefine'
const { ccclass, menu } = _decorator

@ccclass('PersistLayer')
@menu('Toolkit/PersistLayer')
export class PersistLayer extends PersistWidgetTarget {
    protected m_siblingIndex: Define.ZIndex.Global = Define.ZIndex.Global.UNDEF

    public get SiblingIndex(): Define.ZIndex.Global {
        return this.m_siblingIndex
    }

    public set SiblingIndex(value: Define.ZIndex.Global) {
        this.m_siblingIndex = value
    }

    protected onLoad(): void {
        super.onLoad()
        this.node.setSiblingIndex(this.m_siblingIndex)
        director.addPersistRootNode(this.node)
    }

    protected override OnOrientationChange(_: Device.Orientation) {
        let size = view.getDesignResolutionSize()
        let widget = this.node.getComponent(Widget)
        let posX = 0
        let posY = 0
        if (widget.isAlignHorizontalCenter) {
            posX = size.width / 2 + widget.horizontalCenter
        } else if (widget.isAlignLeft) {
            posX = 0 + widget.left
        } else if (widget.isAlignRight) {
            posX = size.width - widget.right
        }
        if (widget.isAlignVerticalCenter) {
            posY = size.height / 2 + widget.verticalCenter
        } else if (widget.isAlignTop) {
            posY = size.height - widget.top
        } else if (widget.isAlignBottom) {
            posY = 0 + widget.bottom
        }
        widget.node.position = new Vec3(posX, posY, 0)
    }
}