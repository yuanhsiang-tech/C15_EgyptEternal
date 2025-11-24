import { _decorator, EventTouch } from 'cc'
import CommonButton from '../../Stark/Interactive/CommonButton'
import { CommonButtonMacro } from '../../Stark/Interactive/CommonButtonMacro'
import { ViewBase } from '../ViewManage/Foundation/ViewBase'
const { ccclass, property, menu } = _decorator

@ccclass('UIDismissButton')
@menu('UISystem/UIDismissButton')
export class UIDismissButton extends CommonButton {
    @property({
        type: ViewBase,
        displayName: "View",
        tooltip: "主要控制介面"
    })
    private m_view: ViewBase = null

    protected onLoad(): void {
        super.onLoad?.()
        this.m_clickSoundType = CommonButtonMacro.SOUND_TYPE.NEGATIVE
    }

    protected OnTouchClicked(event: EventTouch) {
        super.OnTouchClicked?.(event)
        this.m_view?.Dismiss()
    }
}


