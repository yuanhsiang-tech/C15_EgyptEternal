import { _decorator, Component, EventTouch, Node } from 'cc';
import { Tab } from '../../ViewManage/TabBar/Tab';
import { CommonButtonMacro } from '../../../Stark/Interactive/CommonButtonMacro';
import { EventDispatcher } from '../../../Stark/Utility/EventDispatcher';
const { ccclass, property } = _decorator;

@ccclass('TabView')
export class TabView extends Tab {
    protected override OnTouchEnd(event: EventTouch): void {
        super.OnTouchEnd?.(event);
        EventDispatcher.Shared.Dispatch(CommonButtonMacro.BUTTON_SOUND_EVENT, this, CommonButtonMacro.SOUND_TYPE.DEFAULT);
    }
}


