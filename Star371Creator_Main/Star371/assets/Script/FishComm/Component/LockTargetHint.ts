import { Component, Node, Sprite, Animation, _decorator, SpriteFrame, UIOpacity } from "cc";

const {ccclass, property} = _decorator;

@ccclass
export default class LockTargetHint extends Component {

    @property(Sprite)
    fishIcon: Sprite = null;

    @property([SpriteFrame])
    fishSpriteFrames: SpriteFrame[] = [];

    private m_anim: Animation = null;
    private m_currAnimIndex: number = -1;

    onLoad() {
        this.m_anim = this.node.getComponent(Animation);
    }

    /**
     * 設定目標魚種
     */
    public setTarget(fishNo: number) {
        if (!this.fishIcon) {
            console.error("fishSprite component missing!!!");
            return;
        }
        if (!this.fishSpriteFrames[fishNo]) {
            this.fishIcon.node.active = false;
        }
        else {
            this.fishIcon.node.active = true;
            this.fishIcon.spriteFrame = this.fishSpriteFrames[fishNo];
        }

        this.node.active = true;
        this.m_currAnimIndex = 0;
        let animName = this.m_anim?.clips[this.m_currAnimIndex]?.name;
        this.m_anim.play(animName);
    }

    public hide() {
        this.m_currAnimIndex = -1;
        this.node.active = false;

        if (this.m_anim && this.m_anim.isValid) {
            this.m_anim.stop();
        }
    }
}
