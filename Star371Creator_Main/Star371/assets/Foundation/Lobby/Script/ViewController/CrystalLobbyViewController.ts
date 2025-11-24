import { _decorator, Component, Node, Size } from 'cc';
import { GameIconList } from '../Gallery/GameIconList';
import { GameIconDefine } from '../Gallery/GameIconDefine';
import { GameId } from '../../../../Script/Define/GameDefine';
import FiniteState from '../../../../Stark/Utility/FiniteState';
import { StageId } from '../../../../Script/Define/StageDefine';
import { BaseLobbyViewController } from './BaseLobbyViewController';
import { LobbyService } from '../../../../Script/Service/LobbyService';
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
    { GameId: GameId.DINOSAUR, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.HAPPY_FISH, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DINOSAUR, ThemeType: 1, IconType: GameIconDefine.Type.REGULAR, Status: 0, StartTime: "", EndTime: "", Res: "1", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.PET_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.REGULAR, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.HAPPY_FISH, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "2", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GOLDEN_LUCKY, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.MJ_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.UNIVERSE, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.EGYPT_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.PEARL_BUBBLE, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    // 小丑金幣
    { GameId: GameId.DINORUN, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.XIANGSHI_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GURA, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.WITCH_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ROYAL_ARCHER, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.EGYPT_ETERNAL, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SKYTOWER, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.PIRATE_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.MONSTER_ISLAND, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.TOWER_RUSH, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DESSERT_KINGDOM, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.FRANKENSTEIN, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LB_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.NINJA_CRASH, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CHISHIHUANG, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.MAYA_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.DRAGON_HAMMER, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CRASH_GAME_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.NINE_ONE_ONE, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CRYSTAL777, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GOF_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BIG_THREE_DRAGONS, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.POSEIDON_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.QUEEN_EGYPT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.NIU_NIU, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CRAZY_777, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LUCKY_21, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.THREE_KINGDOM, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.FPKFH, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LAVA_LINK, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SICBO, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BOXING_KING, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.TEN_HALF, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SHANGHAI_SWEETHEART, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BUFFALO_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SUPER_EIGHT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.AGENT_ACE, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.SUPER_ACE, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BBC, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ONELINE_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.CHILLI, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ALICE_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.GEM_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LUCKY_TREE, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ROYAL_ARCHER, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.LUCKY_WHEEL, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.UNDEF, ThemeType: -1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "SpinSpin", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.HAPPY_FISH, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "4", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.ROMAX_SLOT, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "4", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.TMAN_MJ, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "4", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.BIG2, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "4", Action: GameIconDefine.Action.NONE, ActionParam: "" },
    { GameId: GameId.STAR_MJ, ThemeType: 1, IconType: GameIconDefine.Type.SMALL, Status: 0, StartTime: "", EndTime: "", Res: "4", Action: GameIconDefine.Action.NONE, ActionParam: "" },
]

const HEADER_SIZE:Size = new Size(30, 0);

enum State {
    WAIT_DATA,
    READY
}

@ccclass('CrystalLobbyViewController')
export class CrystalLobbyViewController extends BaseLobbyViewController {
    private m_state:FiniteState<State>;
    
    protected onLoad(): void {
        super.onLoad?.();
        this.m_gameIconList.ThemeType = ThemeType.DIAMOND;
        this.m_state = new FiniteState<State>(State.WAIT_DATA);
    }

    protected update(dt: number): void {
        super.update?.(dt);

        switch (this.m_state.Tick()) {
            case State.WAIT_DATA: {
                if (this.m_state.IsEntering) {
                    LobbyService.Instance.RequestGameIconInfoList(StageId.CRYSTAL);
                }

                if (LobbyService.Instance.GetGameIconInfoList(StageId.CRYSTAL)) {
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

    public TableViewHeaderSize(): Size {
        return HEADER_SIZE;
    }
}


