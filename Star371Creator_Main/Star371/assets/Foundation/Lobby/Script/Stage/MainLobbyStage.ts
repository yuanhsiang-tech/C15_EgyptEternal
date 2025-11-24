import { _decorator, Component, Node } from 'cc';
import { LobbyStage } from './LobbyStage';
import FiniteState from '../../../../Stark/Utility/FiniteState';
import { TopBarMode } from '../../../../Script/Define/TopBarModeDefine';
import { MainLobbyViewController } from '../ViewController/MainLobbyViewController';
import { TopBarController } from '../../../../Script/Feature/TopBar/TopBarController';
import { GoldenPigService } from 'db://assets/Script/Service/GoldenPigService';
const { ccclass, property } = _decorator;

let RESOURCE_MASK:number = 0;
enum ResourceType {
    NONE        = 0,

    ALL         = 1<<(RESOURCE_MASK)-1,
}

enum State {
    NONE,
}

@ccclass('MainLobbyStage')
export class MainLobbyStage extends LobbyStage {
    private m_flag:number;
    private m_state:FiniteState<State>;

    protected override onLoad(): void {
        super.onLoad();
        this.m_flag = ResourceType.NONE;
        this.m_state = new FiniteState(State.NONE);
        this.m_viewController = this.node.getComponent(MainLobbyViewController);
    }

    protected override WillBeginPreparations(): void {
        super.WillBeginPreparations();
        this.CameFromLogin && this.LoadResourceOnce();
    }

    /**
     * 只有從登入頁進入時才會載入的資源，登入後只會執行一次，其餘的場景切換都不會再被觸發
     */
    protected LoadResourceOnce() {
    }

    /**
     * 準備工作完成通知(無論成功或失敗)
     * @param success 是否成功
     */
    protected override OnPreparationsFinish(success:boolean): void {
        super.OnPreparationsFinish(success);
        if (success) {
            TopBarController.Instance.SetMode(TopBarMode.LOBBY);
        }
    }

    protected OnLobbyEnter(): void {
        GoldenPigService.Instance.RequestGoldenPigData()
    }
}


