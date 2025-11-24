import { Component, _decorator, Label, Sprite, js, UITransform } from 'cc';
import { LocaleText } from '../../Locale/LocaleText';
const { ccclass, property } = _decorator;

@ccclass("JpUnlockTip")
export default class JpUnlockTip extends Component {

    @property(Sprite)
    private m_bgR: Sprite = null;

    @property(Sprite)
    private m_bgL: Sprite = null;

    @property(Label)
    private m_label: Label = null;
    public get Label() { return this.m_label; }

    private m_level: number = 0;
    public get Level() { return this.m_level; }
    public set Level(value: number) {
        this.SetLevel(value);
    }
    
    // ----------------------------------------------------------------
    // 設定等級
    public SetLevel(level: number) {
        this.m_level = level;
        this.m_label.string = js.formatStr(LocaleText.GetString("jp_unlock_tip"), level);
        const txtWidth = this.m_label.node.getComponent(UITransform).width;
        this.m_bgR.node.getComponent(UITransform).width = txtWidth / 2;
        this.m_bgL.node.getComponent(UITransform).width = txtWidth / 2;
    }

    public Show() {
        this.node.active = true;
    }

    public Hide() {
        this.node.active = false;
    }
}