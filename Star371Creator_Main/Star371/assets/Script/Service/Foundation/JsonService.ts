import { error } from 'cc';
import { Service } from './Service';
import { Json } from '../../Net/Command/Type/Json/Json';
import { Command as CMD } from "../../Net/Command/Command";
import { MicroServiceProtocol } from '../../Net/Service/MicroService';

export abstract class JsonService extends Service<CMD.JsonCommand> {
    private static CmdBuilder(type: CMD.IType<CMD.JsonCommand>, content?: CMD.IContent<CMD.JsonCommand>): CMD.JsonCommand {
        return new Json.Command(type, content);
    }
    
    private static CmdParser(data: CMD.ISerialize<CMD.JsonCommand>, reqCommand?: CMD.JsonCommand): CMD.JsonCommand {
        return Json.Command.Deserialize(data, reqCommand);
    }

    protected constructor(type: number, delegate: Partial<MicroServiceProtocol>) {
        super(JsonService.CmdBuilder, JsonService.CmdParser, type, delegate);
    }

    protected OnCommandFail(command: CMD.JsonCommand, reqCommand: CMD.JsonCommand) {
        const err:Json.Error = command.Parse(Json.Error);
        error(`[${this.constructor.name}(${this.Type})] SendCommand(${reqCommand.Type}) fail: ${err.type}, ${err.message}`);
    }
}