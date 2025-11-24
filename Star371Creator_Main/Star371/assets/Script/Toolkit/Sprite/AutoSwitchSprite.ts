import { SpriteFrame } from "cc";
import { Sprite, _decorator, Component } from "cc";

const { ccclass, requireComponent, property, menu} = _decorator;

@ccclass
@menu("Toolkit/Sprite/AutoSwitchSprite")
@requireComponent(Sprite)
export default class AutoSwitchSprite extends Component {
    @property({type: [SpriteFrame]}) private m_spriteList: SpriteFrame[] = [];

    public SetSpriteNo(index: number) {
        if (index >= 0 && index < this.m_spriteList.length) {
            let sprite = this.getComponent(Sprite);
            sprite.spriteFrame = this.m_spriteList[index];
        }
    }
}
