import {
    _decorator, RenderRoot2D, Widget, Component
} from 'cc'

import { Device } from '../Device/Device'
const { ccclass, menu, requireComponent } = _decorator

@ccclass('PersistWidgetTarget')
@menu('Toolkit/PersistWidgetTarget')
@requireComponent(RenderRoot2D)
export class PersistWidgetTarget extends Component {
    protected onLoad(): void {
        let widget = this.node.getComponent(Widget)
        if (!widget) {
            widget = this.node.addComponent(Widget)
            widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE
            // __private._cocos_ui_widget__AlignFlags
            widget.alignFlags = 2 | 16
            widget.editorHorizontalCenter
            widget.updateAlignment()
        }

        Device.Helper.RegisterOrientationCallback(this.OnOrientationChange.bind(this))
        this.OnOrientationChange()
    }

    protected OnOrientationChange(orientation: Device.Orientation = Device.Current.Orientation) {}
}