import { _decorator, Component, Node } from 'cc';
import EgyptEternalMain from './EgyptEternalMain';
import GameBar from "../../../Script/Game/Platform/GameBar/GameBar";
import { EgyptEternalModel } from './EgyptEternalModel';
import EgyptEternalGameView from './EgyptEternalGameView';
import EgyptEternalEffectView from './EgyptEternalEffectView';
import EgyptEternalMgFgReel from './EgyptEternalMgFgReel';
const { ccclass, property } = _decorator;

@ccclass('EgyptEternalBind')
export class EgyptEternalBind extends Component {
    private static instance: EgyptEternalBind;

    /** 初始化綁定腳本 */
    public InitBind(gameMain: EgyptEternalMain) {
        this.m_gameMain = gameMain;
        this.m_gameView?.InitBind(this);
        this.m_mgFgReel?.InitBind(this);
        this.m_effectView?.InitBind(this);
    }

    private m_gameMain: EgyptEternalMain = null;
    /** 遊戲主腳本 */
    public get GameMain() {
        return this.m_gameMain;
    }

    private m_gameBar: GameBar = null;
    /** 地 Bar */
    public get GameBar(): GameBar {
        return this.m_gameBar;
    }
    public set GameBar(obj: GameBar) {
        this.m_gameBar = obj;
    }

    private m_model: EgyptEternalModel = new EgyptEternalModel();
    public get Model(): EgyptEternalModel {
        return this.m_model;
    }

    @property({ type: EgyptEternalGameView, tooltip: "game view" })
    private m_gameView: EgyptEternalGameView = null;
    public get GameView() {
        return this.m_gameView;
    }

    @property({ type: EgyptEternalEffectView, tooltip: "effect view" })
    private m_effectView: EgyptEternalEffectView = null;
    get EffectView() {
        return this.m_effectView;
    }

    @property({ type: EgyptEternalMgFgReel, tooltip: "MG盤面" })
    private m_mgFgReel: EgyptEternalMgFgReel = null;

    get MgFgReel(): EgyptEternalMgFgReel {
        return this.m_mgFgReel;
    }
}

