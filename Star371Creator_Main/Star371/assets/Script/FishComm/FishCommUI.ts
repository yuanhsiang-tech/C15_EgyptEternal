import { _decorator, Component, Vec2, Color, Animation, AnimationClip, Label, log } from 'cc'
import { TimedBool } from '../../Stark/Utility/TimedBool'
const { ccclass, property } = _decorator

//這裡可能要看各個遊戲設定，但先這樣寫
const SkillBtnType = {
    LOCK: 0,
    SPEED: 1,
    DOUBLE: 2,
    ICE: 3,
}

const DantouType = {
    SUPER: 0,
    HIGH: 1,
    NORMAL: 2,
}

const WuShiType = {
    SUPER: 0,
    HIGH: 1,
    NORMAL: 2,
    NEWBIE: 3,
    MINI: 4,
}


@ccclass('FishCommUI')
export class FishCommUI extends Component {

    @property({
        type: [Node],
        tooltip: "技能道具按鈕"
    })
    public m_skillBtns: Node[] = [];
    
    @property({
        type: [Node],
        tooltip: "特殊武器按鈕"
    })
    public m_weaponBtns: Node[] = [];
    
    @property({
        type: Node,
        tooltip: "彈頭按鈕"
    })
    public m_dantouBtn: Node = null;

    @property({
        type: Node,
        tooltip: "武石按鈕"
    })
    public m_wushiBtn: Node = null;

    @property({
        type: Node,
        tooltip: "自動射擊按鈕"
    })
    public m_autoShootBtn: Node = null;

    @property({
        type: Node,
        tooltip: "智慧射擊按鈕"
    })
    public m_smartShootBtn: Node = null;

    @property({
        type: Node,
        tooltip: "商城按鈕"
    })
    public m_mallBtn: Node = null;

    @property({
        type: Node,
        tooltip: "排行榜按鈕"
    })
    public m_rankingBtn: Node = null;

    @property({
        type: Node,
        tooltip: "兌幣按鈕"
    })
    public m_exchangeBtn: Node = null;

    @property({
        type: Node,
        tooltip: "隕石爆破按鈕"
    })
    public m_explosionBtn: Node = null;

    public onLoad() {

        
    }


    
}
