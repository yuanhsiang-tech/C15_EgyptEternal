
import { log } from "cc";
import { Command } from "../Net/Command/Command";
import { ProtoService } from "./Foundation/ProtoService";
import { ServiceInstance } from "./Foundation/Service";
import { S2U, U2S, GameIconInfosReqSchema, GameIconInfoAckSchema, GameIconInfoAck, Result, GameIconStatus } from "../Proto/service/lobby/lobby_pb";
import { StageId } from "../Define/StageDefine";

@ServiceInstance
export class LobbyService extends ProtoService {
    public static readonly Instance: LobbyService;

    private m_iconInfoMap:Map<StageId, GameIconStatus[]>;

    protected override Start(): void {
        super.Start();
        this.m_iconInfoMap = new Map();
    }

    protected OnCommand(command: Command.ProtoCommand) {
        switch (command.Type) {
            case S2U.S2U_ACK_GAME_ICON_INFOS: {
                const result:GameIconInfoAck = command.Parse(GameIconInfoAckSchema);
                if (result.result == Result.REQ_OK) {
                    for (let stageId of Object.keys(result.infos)) {
                        const list:GameIconStatus[] = result.infos[stageId].items;
                        this.m_iconInfoMap.set(parseInt(stageId), list.sort((x,y)=>x.order-y.order));
                    }
                }
                break;
            }
        }
    }

    public RequestGameIconInfoList(...stageId:StageId[]): void {
        for (let id of stageId) {
            this.m_iconInfoMap.delete(id)
        }
        
        this.SendCommand(U2S.U2S_REQ_GAME_ICON_INFOS, ProtoCreate(GameIconInfosReqSchema, {
            stageIds: stageId
        }))
    }

    public GetGameIconInfoList(stageId:StageId): GameIconStatus[] {
        return this.m_iconInfoMap.get(stageId);
    }
}

globalThis.ll=LobbyService;
