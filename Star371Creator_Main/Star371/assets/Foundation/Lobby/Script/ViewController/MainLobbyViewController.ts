import { _decorator, Component, instantiate, Node, Prefab, UIOpacity } from 'cc';
import { GameIconList } from '../Gallery/GameIconList';
import { GameIconDefine } from '../Gallery/GameIconDefine';
import { GameId } from '../../../../Script/Define/GameDefine';
import { StageId } from '../../../../Script/Define/StageDefine';
import FiniteState from '../../../../Stark/Utility/FiniteState';
import { BaseLobbyViewController } from './BaseLobbyViewController';
import { LobbyService } from '../../../../Script/Service/LobbyService';
import { TableView } from '../../../../Stark/TableView/Script/TableView';
import { ThemeType } from '../../../../Script/Proto/gt2/basicTypes/basicTypes_pb';
const { ccclass, property } = _decorator;

interface Data {
    GameId: number,
    ThemeType: number,
    IconType: number,
    Status: number,
    StartTime: string,
    EndTime: string,
    Res: string
    Action: number,
    ActionParam: string
}

const data:Data[] = [
    { GameId: GameId.STAR_MJ, ThemeType: 0, IconType: GameIconDefine.Type.REGULAR, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.UNDEF, ThemeType: -1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "crystal_s", Action: GameIconDefine.Action.GO_TO_STAGE, ActionParam: `${StageId.CRYSTAL}` },
    { GameId: GameId.TMAN_MJ, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.MJ_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BIG2, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.JOIN_GAME, ActionParam: "" },
    { GameId: GameId.DINOSAUR, ThemeType: 0, IconType: GameIconDefine.Type.COMPACT, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DINOSAUR, ThemeType: 0, IconType: GameIconDefine.Type.TINY, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.PET_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GOF_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "1", Action: GameIconDefine.Action.NONE, ActionParam: "" }, 
    { GameId: GameId.HAPPY_FISH, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.EGYPT_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DRAGONTYCOON, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    // 小丑金幣
    { GameId: GameId.UNIVERSE, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.XIANGSHI_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.PEARL_BUBBLE, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.WITCH_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DINORUN, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.EGYPT_ETERNAL, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GURA, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.PIRATE_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ROYAL_ARCHER, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.TOWER_RUSH, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SKYTOWER, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.FRANKENSTEIN, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.MONSTER_ISLAND, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.MAYA_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SUPER_EIGHT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.NINJA_CRASH, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BOXING_KING, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CRASH_GAME_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SHANGHAI_SWEETHEART, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CRYSTAL777, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CRAZY_777, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BIG_THREE_DRAGONS, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ALICE_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.QUEEN_EGYPT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DESSERT_KINGDOM, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LAVA_LINK, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LB_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ONELINE_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LUCKY_WHEEL, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SUPER_ACE, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DRAGON_PHOENIX, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.FAN_TAN, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ROMAX_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.POKER_13, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CHISHIHUANG, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LUCKY_21, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.AGENT_ACE, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.TEN_HALF, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LUCKY_TREE, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.TEXAS_HOLDEM, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CHILLI, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BLOOD_MJ, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DRAGON_HAMMER, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GD13_MJ, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GEM_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.THREE_KINGDOM, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BBC, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.NIU_NIU, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BUFFALO_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DDZ, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GOF_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.FPK, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.POSEIDON_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.FPK4K, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.NINE_ONE_ONE, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.FPKFH, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DOG_RUN, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SICBO, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.STAR_MJ, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "1", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.THE_QUEEN_SLOT, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    // 明星實況派對
    { GameId: GameId.STAR_MJ, ThemeType: 0, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "3", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.UNDEF, ThemeType: -1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "minigame_s", Action: GameIconDefine.Action.UI_PRESENT, ActionParam: "FREE_MECHANISM" },
]

enum State {
    WAIT_DATA,
    READY
}

@ccclass('MainLobbyViewController')
export class MainLobbyViewController extends BaseLobbyViewController {
    private m_headerStar: Node;
    private m_state:FiniteState<State>;
    
    @property({
        type: Prefab,
        displayName: "Star Prefab"
    })
    private m_starPrefab: Prefab = null;

    @property({
        type: UIOpacity,
        displayName: "Bottom Bar"
    })
    private m_bottomBar: UIOpacity = null;

    protected onLoad(): void {
        super.onLoad?.();
        this.m_gameIconList.ThemeType = ThemeType.NORMAL;
        this.m_headerStar = instantiate(this.m_starPrefab);
        this.m_state = new FiniteState<State>(State.WAIT_DATA);
    }

    protected update(dt: number): void {
        super.update?.(dt);

        switch (this.m_state.Tick()) {
            case State.WAIT_DATA: {
                if (this.m_state.IsEntering) {
                    LobbyService.Instance.RequestGameIconInfoList(StageId.LOBBY);
                }

                if (LobbyService.Instance.GetGameIconInfoList(StageId.LOBBY)) {
                    this.m_groupedIconSoucre = GameIconList.GroupByOccupied(LobbyService.Instance.GetGameIconInfoList(StageId.LOBBY));
                    this.m_gameIconList.ReloadData();
                    this.m_state.Transit(State.READY);
                }

                break;
            }
            case State.READY: {
                break;
            }
        }
    }

    public TableViewHeaderView(tableView: TableView): Node {
        return this.m_headerStar;
    }

    /**
     * 介面進入全畫面顯示
     */
    public OnViewEnterFullScreen(): void {
        super.OnViewEnterFullScreen?.();
        this.m_bottomBar.opacity = 0;
    }

    /**
     * 介面離開全畫面顯示
     */
    public OnViewExitFullScreen(): void {
        super.OnViewExitFullScreen?.();
        this.m_bottomBar.opacity = 255;
    }
}


