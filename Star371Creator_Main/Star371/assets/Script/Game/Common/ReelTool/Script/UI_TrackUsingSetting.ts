import { _decorator, Component, EditBox, EventTouch, isValid, Label, Node, Sprite, SpriteFrame } from 'cc';
import { UI_WeightGroup } from './UI_WeightGroup';
import { UI_SelectBox } from './UI_SelectBox';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
const { ccclass, property } = _decorator;

@ccclass('UI_TrackUsingSetting')
export class UI_TrackUsingSetting extends Component {
    @property({ type: Touchable, displayName: "Copy" })
    private copyBtn: Touchable = null;

    @property({ type: Touchable, displayName: "Paste" })
    private pasteBtn: Touchable = null;

    @property({ type: SpriteFrame, displayName: "Default Sprite" })
    private defaultSprite: SpriteFrame = null;

    @property({ type: SpriteFrame, displayName: "Active Sprite" })
    private activeSprite: SpriteFrame = null;

    start() {
        if (this.copyBtn) {
            this.copyBtn.On(TouchableEvent.Clicked, this.onCopyBtnClicked, this);
        }

        if (this.pasteBtn) {
            this.pasteBtn.On(TouchableEvent.Clicked, this.onPasteBtnClicked, this);
        }
    }

    update(deltaTime: number) {
        
    }

    onDestroy() {
        if (this.copyBtn) {
            this.copyBtn.Off(TouchableEvent.Clicked, this.onCopyBtnClicked, this);
        }

        if (this.pasteBtn) {
            this.pasteBtn.Off(TouchableEvent.Clicked, this.onPasteBtnClicked, this);
        }
    }

    private onCopyBtnClicked(sender: Touchable, event?: EventTouch) {
        if (sender.node.children[0].getComponent(Sprite).spriteFrame == this.defaultSprite) { //啟動copy
            sender.node.children[0].getComponent(Sprite).spriteFrame = this.activeSprite
            //關閉所有除了當前這個以外的複製標籤, 顯示所有overlay數量相同的貼上標籤
            for (let i = 0; i < sender.node.parent.parent.children.length; i++) {
                const child = sender.node.parent.parent.children[i]
                if (child.name == "TrackUsingSetting" && child != sender.node.parent) {
                    child.getChildByName("CopyBtn").active = false

                    if (child.getChildByName("NextLayer").children.length == sender.node.parent.getChildByName("NextLayer").children.length) {
                        child.getChildByName("PasteBtn").active = true
                    }
                }
            }
        } else { //關閉copy
            sender.node.children[0].getComponent(Sprite).spriteFrame = this.defaultSprite
            //關閉所有貼上標籤, 顯示所有複製標籤
            for (let i = 0; i < sender.node.parent.parent.children.length; i++) {
                const child = sender.node.parent.parent.children[i]
                if (child.name == "TrackUsingSetting") {
                    child.getChildByName("CopyBtn").active = true
                    child.getChildByName("PasteBtn").active = false
                }
            }
        }
    }

    private onPasteBtnClicked(sender: Touchable, event?: EventTouch) {
        let sourceTrackUsingNode: Node = null
        for (let i = 0; i < sender.node.parent.parent.children.length; i++) {
            const child = sender.node.parent.parent.children[i]
            if (child.name == "TrackUsingSetting" && child.getChildByName("CopyBtn").active) {
                sourceTrackUsingNode = child
                break
            }
        }

        //複製資料
        const sourceNextLayerNode = sourceTrackUsingNode.getChildByName("NextLayer")
        const targetNextLayerNode = sender.node.parent.getChildByName("NextLayer")

        for (let i = 0; i < sourceNextLayerNode.children.length; i++) {
            const sourceDetailNode = sourceNextLayerNode.children[i]
            const targetDetailNode = targetNextLayerNode.children[i]
            if (targetDetailNode.name == "TrackCase") { //要複製的細節
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
    }
}


