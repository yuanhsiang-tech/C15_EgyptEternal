import { _decorator, Component, EditBox, EventTouch, instantiate, isValid, Label, Prefab } from 'cc';
import { UI_SelectBox } from './UI_SelectBox';
import { WeightGroupType } from './UI_BaseShowDataDetail';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
const { ccclass, property } = _decorator;

@ccclass('UI_WeightGroup')
export class UI_WeightGroup extends Component {
    @property({ type: Prefab, displayName: "Weight Prefab" })
    private weightPrefab: Prefab = null;

    @property({ type: Prefab, displayName: "SelectBox Prefab" })
    private selectBoxPrefab: Prefab = null;

    @property({ type: Touchable, displayName: "New Weight Btn" })
    private newWeightBtn: Touchable = null;

    private m_type: WeightGroupType = WeightGroupType.KEYIN_WEIGHT;
    private m_itemList: string[] = [];

    start() {
        if (this.newWeightBtn) {
            this.newWeightBtn.On(TouchableEvent.Clicked, this.onNewWeightBtnClicked, this);
        }

        document.addEventListener('touchstart', function() {}, { passive: true });
    }

    update(deltaTime: number) {
    }

    onDestroy() {
        if (this.newWeightBtn) {
            this.newWeightBtn.Off(TouchableEvent.Clicked, this.onNewWeightBtnClicked, this);
        }
    }

    public GetType(): WeightGroupType{
        return this.m_type;
    }

    public SetType(type: WeightGroupType){
        this.m_type = type;
    }

    public GetItemList(): string[]{
        return this.m_itemList;
    }

    public SetItemList(itemList: string[]){
        this.m_itemList = itemList;
    }

    public CreateNewWeight(targetValue?: string, targetWeight?: string){
        switch (this.m_type){
            case WeightGroupType.KEYIN_WEIGHT:
                const weight = instantiate(this.weightPrefab)
                weight.parent = this.node
                if (isValid(targetValue) && isValid(targetWeight)){
                    weight.getChildByName("BaseShowDataValue").getComponent(EditBox).string = targetValue
                    weight.getChildByName("BaseShowDataWeight").getComponent(EditBox).string = targetWeight
                }
                break;
            case WeightGroupType.DROPDOWN_WEIGHT:
                const selectBox = instantiate(this.selectBoxPrefab)
                selectBox.parent = this.node
                selectBox.getChildByName("SelectBox").getComponent(UI_SelectBox).InitItemList(this.m_itemList)
                if (isValid(targetValue) && isValid(targetWeight)){
                    selectBox.getChildByName("SelectBox").getChildByName("Target").getChildByName("Label").getComponent(Label).string = targetValue
                    selectBox.getChildByName("BaseShowDataWeight").getComponent(EditBox).string = targetWeight
                } else {
                    //沒有指定的話才需要寫預設值
                    selectBox.getChildByName("SelectBox").getChildByName("Target").getChildByName("Label").getComponent(Label).string = this.m_itemList[0]
                }
                break;
        }

        //把新增按鈕放到最下面
        this.newWeightBtn.node.parent.setSiblingIndex(this.node.children.length - 1)
    }

    public onNewWeightBtnClicked(sender: Touchable, event?: EventTouch) {
        this.CreateNewWeight()
    }
}


