import { _decorator, CCClass, Component, Node } from 'cc';
import { EDITOR } from 'cc/env';
import { BadgeIconSystem } from './BadgeIconSystem';
import { MechanismType } from '../Define/MechanismDefine';
const { ccclass, property } = _decorator;

@ccclass('BadgeIcon')
export class BadgeIcon extends Component implements BadgeIconSystem.Icon {
    private m_isActive:boolean = false;

    @property({
        type: MechanismType,
        displayName: 'Type',
        tooltip: 'Mechanism Type',
        visible: true
    })
    private m_Id: MechanismType = MechanismType.NONE;

    @property({
        type: Node,
        displayName: "Icon",
        tooltip: "提示 icon"
    })
    private m_icon: Node = null;

    /**
     * 取得唯一識別 ID
     */
    public get Id(): MechanismType {
        return this.m_Id;
    }

    /**
     * 設定唯一識別 ID
     * @param id 唯一識別 ID
     */
    public SetId(id: MechanismType) {
        if (this.m_Id != MechanismType.NONE) {
            !EDITOR && BadgeIconSystem.Remove(this);
        }
        
        this.m_Id = id;
        if (this.m_Id != MechanismType.NONE) {
            !EDITOR && BadgeIconSystem.Add(this);
        }
    }

    /**
     * 啟用控制
     * @param active 是否啟用
     */
    public SetActive(active: boolean): void {
        this.m_isActive = active;
        this.m_icon.active = this.m_isActive;
    }

    protected override onLoad(): void {
        super.onLoad?.();
        if (!EDITOR) {
            this.m_icon.active = this.m_isActive;
            if (this.m_Id != MechanismType.NONE) {
                BadgeIconSystem.Add(this);
            }
        }
    }

    protected override onDestroy(): void {
        super.onDestroy?.();
        if (this.m_Id != MechanismType.NONE) {
            !EDITOR && BadgeIconSystem.Remove(this); 
        }
    }
}


