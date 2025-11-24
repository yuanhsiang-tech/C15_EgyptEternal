import { _decorator } from 'cc';
import { UIView } from '../../Stark/UIKit/UIView';
import { BadgeIconSystem } from '../BadgeIcon/BadgeIconSystem';
import { MechanismType } from '../../Script/Define/MechanismDefine';
const { ccclass, property, disallowMultiple, menu } = _decorator;

@ccclass('UIItem')
@menu('UISystem/UIItem')
@disallowMultiple
export class UIItem extends UIView<MechanismType> {
    @property({
        type: MechanismType,
        displayName: 'Type',
        tooltip: 'Mechanism Type',
        visible: true
    })
    private get __id(): MechanismType { return this.Id; };
    private set __id(value: MechanismType) { this.SetId(value); }

    @property({
        type: MechanismType,
        displayName: 'Host Type',
        tooltip: 'Host Mechanism Type',
        visible: true
    })
    private get __hostId(): MechanismType { return this.Host; };
    private set __hostId(value: MechanismType) { this.LinkHost(value); }

    /**
     * 取得提示 icon
     */
    public get BadgeIcon(): BadgeIconSystem.Icon {
        return BadgeIconSystem.Find(this.Id);
    }
}