import { _decorator, Component, EditBox, EventTouch, isValid, Label, Node, Sprite, SpriteFrame } from 'cc';
import { ReelTool_UI } from './UI_DispatcherDefine';
import { UI_WeightGroup } from './UI_WeightGroup';
import { UI_SelectBox } from './UI_SelectBox';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
const { ccclass, property } = _decorator;

@ccclass('UI_TrackData')
export class UI_TrackData extends Component {
    @property({ type: Touchable, displayName: "checkbox" })
    private m_checkbox: Touchable = null;

    @property({ type: SpriteFrame, displayName: "button default sprite" })
    private defaultSprite: SpriteFrame = null;

    @property({ type: SpriteFrame, displayName: "button active sprite" })
    private activeSprite: SpriteFrame = null;

    private m_oriBaseShowDataValue: number[]|number = null;
    get OriBaseShowDataValue(): number[]|number {
        return this.m_oriBaseShowDataValue; 
    }
    set OriBaseShowDataValue(value: number[]|number) {
        this.m_oriBaseShowDataValue = value;
    }

    start() {
        EventDispatcher.Shared.On(ReelTool_UI.EDITBOX_CHANGE, this.OnEditBoxChange, this);
        EventDispatcher.Shared.On(ReelTool_UI.COPY_CLICK, this.OnCopyClick, this);
        EventDispatcher.Shared.On(ReelTool_UI.PASTE_CLICK, this.OnPasteClick, this);

        if (this.m_checkbox) {
            this.m_checkbox.On(TouchableEvent.Clicked, this.onCheckboxClicked, this);
        }
    }

    update(deltaTime: number) {

    }

    onDestroy() {
        EventDispatcher.Shared.Off(ReelTool_UI.EDITBOX_CHANGE, this.OnEditBoxChange, this);
        EventDispatcher.Shared.Off(ReelTool_UI.COPY_CLICK, this.OnCopyClick, this);
        EventDispatcher.Shared.Off(ReelTool_UI.PASTE_CLICK, this.OnPasteClick, this);

        if (this.m_checkbox) {
            this.m_checkbox.Off(TouchableEvent.Clicked, this.onCheckboxClicked, this);
        }
    }

    onCheckboxClicked(sender: Touchable, event?: EventTouch) {
        if (sender.node.children[0].children[0].getComponent(Label).string == ""){
            sender.node.children[0].children[0].getComponent(Label).string = "V"
        }else{
            sender.node.children[0].children[0].getComponent(Label).string = ""
        }
    }

    public OnEditBoxChange(targetBaseShowDataNode: Node, updateValue: string) {
        if (targetBaseShowDataNode.parent.parent != this.node){ //不是這個trackData的輸入框
            return;
        }

        const upperNode = targetBaseShowDataNode.parent

        let baseShowDataWeight: number[] = []
        let totalWeight = 0
        let percentLabel: Label[] = []

        for (let i = 0; i < upperNode.children.length; i++) {
            const child = upperNode.children[i]
            if (child.name == "BaseShowData") {
                const weight = Number(child.getChildByName("BaseShowDataWeight").children[0].getComponent(Label).string)
                baseShowDataWeight.push(weight)
                totalWeight = totalWeight + weight

                percentLabel.push(child.getChildByName("BaseShowWeightPercentLabel").getComponent(Label))
            }
        }

        for (let i = 0; i < percentLabel.length; i++) {
            percentLabel[i].string = (baseShowDataWeight[i] / totalWeight * 100).toFixed(2) + "%"
        }
    }

    public OnCopyClick(targetBaseShowDataNode: Node) {
        if (targetBaseShowDataNode.parent.parent  != this.node){ //不是這個trackData的複製按鈕
            return;
        }

        if (targetBaseShowDataNode.getChildByName("BaseShowDataCopy").getChildByName("Background").getComponent(Sprite).spriteFrame == this.defaultSprite) { //啟動copy
            targetBaseShowDataNode.getChildByName("BaseShowDataCopy").getChildByName("Background").getComponent(Sprite).spriteFrame = this.activeSprite
            //關閉所有除了當前這個以外的複製標籤, 顯示所有overlay數量相同的貼上標籤
            for (let i = 0; i < targetBaseShowDataNode.parent.children.length; i++) {
                const child = targetBaseShowDataNode.parent.children[i]
                if (child.name == "BaseShowData" && child != targetBaseShowDataNode) {
                    child.getChildByName("BaseShowDataCopy").active = false

                    if (child.getChildByName("NextLayer").children.length == targetBaseShowDataNode.getChildByName("NextLayer").children.length) {
                        child.getChildByName("BaseShowDataPaste").active = true
                    }
                }
            }
        } else { //關閉copy
            targetBaseShowDataNode.getChildByName("BaseShowDataCopy").getChildByName("Background").getComponent(Sprite).spriteFrame = this.defaultSprite
            //關閉所有貼上標籤, 顯示所有複製標籤
            for (let i = 0; i < targetBaseShowDataNode.parent.children.length; i++) {
                const child = targetBaseShowDataNode.parent.children[i]
                if (child.name == "BaseShowData") {
                    child.getChildByName("BaseShowDataCopy").active = true
                    child.getChildByName("BaseShowDataPaste").active = false
                }
            }
        }
    }

    public OnPasteClick(targetBaseShowDataNode: Node) {
        if (targetBaseShowDataNode.parent.parent != this.node){ //不是這個trackData的貼上按鈕
            return;
        }

        let sourceBaseShowDataNode: Node = null
        for (let i = 0; i < targetBaseShowDataNode.parent.children.length; i++) {
            const child = targetBaseShowDataNode.parent.children[i]
            if (child.name == "BaseShowData" && child.getChildByName("BaseShowDataCopy").active) {
                sourceBaseShowDataNode = child
                break
            }
        }

        //複製資料
        targetBaseShowDataNode.getChildByName("BaseShowDataWeight").getComponent(EditBox).string = sourceBaseShowDataNode.getChildByName("BaseShowDataWeight").getComponent(EditBox).string

        const sourceNextLayerNode = sourceBaseShowDataNode.getChildByName("NextLayer")
        const targetNextLayerNode = targetBaseShowDataNode.getChildByName("NextLayer")

        for (let i = 0; i < sourceNextLayerNode.children.length; i++) {
            const sourceDetailNode = sourceNextLayerNode.children[i]
            const targetDetailNode = targetNextLayerNode.children[i]
            if (targetDetailNode.name == "BaseShowDataDetail") { //要複製的細節
                //刪除多餘元件
                for (let j = sourceDetailNode.getChildByName("WeightGroup").children.length; j < targetDetailNode.getChildByName("WeightGroup").children.length; j++) {
                    targetDetailNode.getChildByName("WeightGroup").children[j].destroy()
                }

                //複製資料
                for (let j = 0; j < sourceDetailNode.getChildByName("WeightGroup").children.length - 1; j++) { // 最後一個是加號
                    if (j >= targetDetailNode.getChildByName("WeightGroup").children.length - 1) { //沒有元件
                        targetDetailNode.getChildByName("WeightGroup").getComponent(UI_WeightGroup).onNewWeightBtnClicked(null, null)
                    }

                    const sourceWeightNode = sourceDetailNode.getChildByName("WeightGroup").children[j]
                    const targetWeightNode = targetDetailNode.getChildByName("WeightGroup").children[j]

                    //複製數值
                    for (let k = 1; k < 3; k = k + 1) { //只有值和權重兩個要複製
                        if (isValid(sourceWeightNode.children[k].getComponent(EditBox))) { //是輸入框
                            targetWeightNode.children[k].getComponent(EditBox).string = sourceWeightNode.children[k].getComponent(EditBox).string
                        } else if (isValid(sourceWeightNode.children[k].getComponent(UI_SelectBox))) { //是選擇框
                            targetWeightNode.children[k].getChildByName("Target").getChildByName("Label").getComponent(Label).string = sourceWeightNode.children[k].getChildByName("Target").getChildByName("Label").getComponent(Label).string
                        }
                    }
                }
            }
        }

        //更新%
        targetBaseShowDataNode.parent.parent.getComponent(UI_TrackData).OnEditBoxChange(targetBaseShowDataNode, "")
    }
}


