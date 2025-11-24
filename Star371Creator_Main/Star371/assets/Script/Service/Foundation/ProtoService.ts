import { error } from "cc";
import { Service } from "./Service";
import { Command as CMD } from "../../Net/Command/Command";
import { Error, ErrorSchema } from "../../Proto/gt2/gt2_pb";
import { Protobuf } from "../../Net/Command/Type/Proto/Protobuf";
import { MicroServiceProtocol } from "../../Net/Service/MicroService";

export abstract class ProtoService extends Service<CMD.ProtoCommand> {
    private static CmdBuilder(type: CMD.IType<CMD.ProtoCommand>, content?: CMD.IContent<CMD.ProtoCommand>): CMD.ProtoCommand {
        return new Protobuf.Command(type, content);
    }
    
    private static CmdParser(data: CMD.ISerialize<CMD.ProtoCommand>, reqCommand?: CMD.ProtoCommand): CMD.ProtoCommand {
        return Protobuf.Command.Deserialize(data, reqCommand);
    }

    protected constructor(type: number, delegate: Partial<MicroServiceProtocol>) {
        super(ProtoService.CmdBuilder, ProtoService.CmdParser, type, delegate);
    }

    protected OnCommandFail(command: CMD.ProtoCommand, reqCommand: CMD.ProtoCommand) {
        const err:Error = command.Parse(ErrorSchema);
        error(`[${this.constructor.name}(${this.Type})] SendCommand(${reqCommand.Type}) fail: ${err.type}, ${err.message}`);
    }
}


