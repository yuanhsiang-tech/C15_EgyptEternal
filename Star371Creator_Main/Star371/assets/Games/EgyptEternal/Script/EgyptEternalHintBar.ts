import { _decorator, Component, Node, sp } from 'cc';
import { EgyptEternalBind } from './EgyptEternalBind';
const { ccclass, property } = _decorator;

@ccclass('EgyptEternalHintBar')
export class EgyptEternalHintBar extends Component {

    @property({ type: [sp.Skeleton] })
    private m_hintBarSpines: sp.Skeleton[] = [];

    @property({ type: [Node] })
    private m_dataTxts: Node[] = [];

    private m_bind: EgyptEternalBind = null;


    public InitBind(bind: EgyptEternalBind) {
        this.m_bind = bind;
        this.node.active = false;
    }

    update(deltaTime: number) {

    }
}

