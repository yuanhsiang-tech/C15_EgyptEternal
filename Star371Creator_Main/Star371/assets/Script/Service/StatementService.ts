import { Command } from "../Net/Command/Command";
import { MicroServiceProtocol } from "../Net/Service/MicroService";
import * as Statement from "../Proto/service/statement/statement_pb";
import { ProtoService } from "./Foundation/ProtoService";
export * as Statement from "../Proto/service/statement/statement_pb";

export interface StatementServiceDelegate  {
    OnPropertiesChanged(notifyList: Statement.CurrencyNotif_Change[]): void;
 }

export interface StatementServiceProtocol extends MicroServiceProtocol, StatementServiceDelegate {
}

export class StatementService extends ProtoService {
    protected constructor(type: number, delegate: Partial<StatementServiceProtocol>) {
        super(type, delegate);
    }

    protected OnCommand(cmd: Command.ProtoCommand) {
        switch (cmd.Type) {
            case Statement.S2U.S2U_CURRENCY: {
                const notify = cmd.Parse(Statement.CurrencyNotifSchema);
                (this.m_sharedDelegate as StatementServiceProtocol) ?.OnPropertiesChanged?.(notify.changes);
                break;
            }
        }
    }
}
