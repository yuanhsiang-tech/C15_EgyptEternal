import { _decorator, Enum, EventTouch } from 'cc';
import { EventDefine } from '../Define/EventDefine';
import { UIButton } from '../../Stark/UIKit/UIButton';
import { MechanismType } from '../Define/MechanismDefine';
import { BadgeIconSystem } from '../BadgeIcon/BadgeIconSystem';
import { EventDispatcher } from '../../Stark/Utility/EventDispatcher';
const { ccclass, property, disallowMultiple, menu } = _decorator;

/**
 * Icon 重置模式
 */
enum IconResetMode {
    NONE,           // 不重置
    CLICK           // 點擊後重置
}
Enum(IconResetMode);

@ccclass('UIButtonItem')
@menu('UISystem/UIButtonItem')
@disallowMultiple
export class UIButtonItem extends UIButton<MechanismType> {
    @property({
        type: MechanismType,
        displayName: 'Type',
        tooltip: '元件所屬 Type',
        visible: true
    })
    private get __id(): MechanismType { return this.Id; };
    private set __id(value: MechanismType) { this.SetId(value); }

    @property({
        type: MechanismType,
        displayName: 'Host Type',
        tooltip: '當元件未顯示於畫面上時會額外找尋的替代對象 Type',
        visible: true
    })
    private get __hostId(): MechanismType { return this.Host; };
    private set __hostId(value: MechanismType) { this.LinkHost(value); }

    @property({
        type: IconResetMode,
        displayName: 'Icon Reset Mode',
        tooltip: 'BadgeIcon 重置模式'
    })
    private m_iconResetMode: IconResetMode = IconResetMode.CLICK;

    /**
     * 取得提示 icon
     */
    public get BadgeIcon(): BadgeIconSystem.Icon {
        return BadgeIconSystem.Find(this.Id);
    }

    protected override OnTouchClicked(event: EventTouch) {
        super.OnTouchClicked(event);
        this.m_iconResetMode == IconResetMode.CLICK && this.BadgeIcon?.SetActive(false);
        EventDispatcher.Shared.Dispatch(EventDefine.System.UI_ITEM_EVENT_CLICKED, this);
    }
}