import { _decorator, Component, Vec3 } from 'cc'
import { Device } from '../Device/Device'
const { ccclass, menu } = _decorator

@ccclass('CenterTargeting')
@menu('Toolkit/CenterTargeting')
export class CenterTargeting extends Component {
    protected onLoad(): void {
        Device.Helper.RegisterOrientationCallback(this.OnOrientationChange.bind(this))
        this.OnOrientationChange()
    }

    protected OnOrientationChange(orientation: Device.Orientation = Device.Current.Orientation) {
        const center:Vec3 = Device.Current.ScreenCenter
        this.node.position = center
    }
}