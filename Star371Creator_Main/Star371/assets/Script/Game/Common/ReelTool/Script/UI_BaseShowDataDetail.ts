import { _decorator, Component, EventTouch, instantiate, isValid, Label, Prefab } from 'cc';
import { UI_WeightGroup } from './UI_WeightGroup';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
const { ccclass, property } = _decorator;

export enum WeightGroupType {
    KEYIN_WEIGHT = 0, //輸入值和權重
    DROPDOWN_WEIGHT = 1, //下拉選擇和權重
}

@ccclass('UI_BaseShowDataDetail')
export class UI_BaseShowDataDetail extends Component {
    @property({ type: Touchable, displayName: "checkbox" })
    private m_checkbox: Touchable = null;

    @property({ type: Prefab, displayName: "WeightGroup" })
    private m_weightGroup: Prefab = null;

    start() {
        if (this.m_checkbox) {
            this.m_checkbox.On(TouchableEvent.Clicked, this.onCheckboxClicked, this);
        }
    }

    update(deltaTime: number) {

    }

    onDestroy() {
        if (this.m_checkbox) {
            this.m_checkbox.Off(TouchableEvent.Clicked, this.onCheckboxClicked, this);
        }
    }

    onCheckboxClicked(sender: Touchable, event?: EventTouch) {
        if (sender.node.children[0].children[0].getComponent(Label).string == "") {
            sender.node.children[0].children[0].getComponent(Label).string = "V"
        } else {
            sender.node.children[0].children[0].getComponent(Label).string = ""
        }
    }

    public SetWeightGroup(type: WeightGroupType, itemList?: string[], targetValueList?: string[], targetWeightList?: string[]) {
        const weightGroup = instantiate(this.m_weightGroup)
        weightGroup.parent = this.node

        weightGroup.getComponent(UI_WeightGroup).SetType(type)
        switch (type) {
            case WeightGroupType.DROPDOWN_WEIGHT:
                weightGroup.getComponent(UI_WeightGroup).SetItemList(itemList)
                break;
        }

        if (isValid(targetValueList) && isValid(targetWeightList)) {
            for (let i = 0; i < targetValueList.length; i++) {
                if (type == WeightGroupType.DROPDOWN_WEIGHT) {
                    weightGroup.getComponent(UI_WeightGroup).CreateNewWeight(itemList[targetValueList[i]], targetWeightList[i])
                } else {
                    weightGroup.getComponent(UI_WeightGroup).CreateNewWeight(targetValueList[i], targetWeightList[i])
                }
            }
        }

        weightGroup.active = false
    }
}


