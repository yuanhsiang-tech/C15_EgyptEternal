import { _decorator, Component, Node, EventTouch, UITransform, Label, Sprite, Color, SpriteFrame } from 'cc';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { NodeUtils } from 'db://assets/Stark/FuncUtils/NodeUtils';
const { ccclass, property } = _decorator;

@ccclass('UI_Collaspe_Icon')
export class UI_Collaspe_Icon extends Component {
    @property({ type: Touchable, displayName: "collaspe button" })
    private collaspeBtn: Touchable = null;

    @property({ type: UITransform, displayName: "collaspe layer" })
    private collaspeLayer: UITransform = null;

    @property({ type: UITransform, displayName: "padding node" })
    private paddingNode: UITransform = null;

    @property({ type: SpriteFrame, displayName: "collaspe close sprite" })
    private collaspeCloseSprite: SpriteFrame = null;

    @property({ type: SpriteFrame, displayName: "collaspe open sprite" })
    private collaspeOpenSprite: SpriteFrame = null;

    start() {
        if (this.collaspeBtn) {
            this.collaspeBtn.On(TouchableEvent.Clicked, this.onCollaspeBtnClicked, this);
        }
    }

    update(deltaTime: number) {
        if (this.collaspeLayer.node.active) {
            this.paddingNode.setContentSize(this.paddingNode.width, this.collaspeLayer.height);
        } else {
            this.paddingNode.setContentSize(this.paddingNode.width, 0);
        }
    }

    onDestroy() {
        if (this.collaspeBtn) {
            this.collaspeBtn.Off(TouchableEvent.Clicked, this.onCollaspeBtnClicked, this);
        }
    }

    /**
     * collaspe button 按鈕點擊事件處理
     */
    private onCollaspeBtnClicked(sender: Touchable, event?: EventTouch) {
        if (this.collaspeLayer.node.active) { //開變關
            this.collaspeLayer.node.active = false;
            NodeUtils.GetUI(this.collaspeBtn.node, "Background").getComponent(Sprite).spriteFrame = this.collaspeCloseSprite;
            NodeUtils.GetUI(this.collaspeBtn.node, "Label").getComponent(Label).string = "►";
            this.paddingNode.setContentSize(this.paddingNode.width, 0);
        } else { //關變開
            this.collaspeLayer.node.active = true;
            NodeUtils.GetUI(this.collaspeBtn.node, "Background").getComponent(Sprite).spriteFrame = this.collaspeOpenSprite;
            NodeUtils.GetUI(this.collaspeBtn.node, "Label").getComponent(Label).string = "▼";
            
        }
    }

    public SetPaddingNode(paddingNode: UITransform) {
        this.paddingNode = paddingNode;
    }

    public SetCollaspeLayer(collaspeLayer: UITransform) {
        this.collaspeLayer = collaspeLayer;
    }
}


