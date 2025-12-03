import { _decorator, Button, Component, Node } from 'cc';
import EgyptEternalMain from './EgyptEternalMain';
import GameBar from "../../../Script/Game/Platform/GameBar/GameBar";
import { EgyptEternalModel } from './EgyptEternalModel';
import EgyptEternalGameView from './EgyptEternalGameView';
import EgyptEternalEffectView from './EgyptEternalEffectView';
import EgyptEternalMgReel from './EgyptEternalMgReel';
import EgyptEternalFgReel from './EgyptEternalFgReel';
import { EgyptEternalJpPanel } from './EgyptEternalJpPanel';
import { EgyptEternalMGWheel } from './EgyptEternalMGWheel';
import { EgyptEternalHintBar } from './EgyptEternalHintBar';
const { ccclass, property } = _decorator;

@ccclass('EgyptEternalBind')
export class EgyptEternalBind extends Component {
    private static instance: EgyptEternalBind;

    /** 初始化綁定腳本 */
    public InitBind(gameMain: EgyptEternalMain) {
        this.m_gameMain = gameMain;
        this.m_gameView?.InitBind(this);
        this.m_mgReel?.InitBind(this);
        this.m_fgReel?.InitBind(this);
        this.m_effectView?.InitBind(this);
        this.m_mgJpPanel?.InitBind(this);
        this.m_fgJpPanel?.InitBind(this);
        this.m_mgWheel?.InitBind(this);
        this.m_hintBar?.InitBind(this);

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

    @property({ type: EgyptEternalMgReel, tooltip: "MG盤面" })
    private m_mgReel: EgyptEternalMgReel = null;

    get MGReel(): EgyptEternalMgReel {
        return this.m_mgReel;
    }

    @property({ type: EgyptEternalFgReel, tooltip: "FG盤面" })
    private m_fgReel: EgyptEternalFgReel = null;

    get FGReel(): EgyptEternalFgReel {
        return this.m_fgReel;
    }

    @property({ type: EgyptEternalJpPanel, tooltip: "MG JP Panel" })
    private m_mgJpPanel: EgyptEternalJpPanel = null;

    get MGJpPanel(): EgyptEternalJpPanel {
        return this.m_mgJpPanel;
    }

    @property({ type: EgyptEternalJpPanel, tooltip: "FG盤面" })
    private m_fgJpPanel: EgyptEternalJpPanel = null;

    get FGJpPanel(): EgyptEternalJpPanel {
        return this.m_fgJpPanel;
    }

    @property({ type: EgyptEternalMGWheel, tooltip: "MG 轉輪" })
    private m_mgWheel: EgyptEternalMGWheel = null;

    get MGWheel(): EgyptEternalMGWheel {
        return this.m_mgWheel;
    }

    @property({ type: EgyptEternalHintBar, tooltip: "轉輪提示" })
    private m_hintBar: EgyptEternalHintBar = null;

    get HintBar(): EgyptEternalHintBar {
        return this.m_hintBar;
    }

    @property({ type: Button, tooltip: "測試按鈕" })
    private m_testBtn: Button = null;

    get TestBtn(): Button {
        return this.m_testBtn;
    }
}

