import { error } from 'cc';
import { Service } from './Service';
import { Command as CMD } from '../../Net/Command/Command';
import { Error, ErrorSchema } from '../../Proto/gt2/gt2_pb';
import { RESTful } from '../../Net/Command/Type/RESTful/RESTful';
import { MicroServiceProtocol, FriendAttr } from '../../Net/Service/MicroService';

export abstract class RESTfulService extends Service<CMD.RESTfulCommand> {
    private static CmdBuilder(type: CMD.IType<CMD.RESTfulCommand>, content?: CMD.IContent<CMD.RESTfulCommand>): CMD.RESTfulCommand {
        return new RESTful.Command(type, content);
    }
    
    private static CmdParser(data: CMD.ISerialize<CMD.RESTfulCommand>, reqCommand?: CMD.RESTfulCommand): CMD.RESTfulCommand {
        return RESTful.Command.Deserialize(data, reqCommand);
    }

    protected constructor(type: number, delegate: Partial<MicroServiceProtocol>) {
        super(RESTfulService.CmdBuilder, RESTfulService.CmdParser, type, delegate);
    }

    @FriendAttr
    protected override get IsAutoManaged(): boolean {
        return false;
    }

    protected OnCommandFail(command: CMD.RESTfulCommand, reqCommand: CMD.RESTfulCommand) {
        const err:Error = command.Parse(ErrorSchema);
        error(`[${this.constructor.name}(${this.Type})] SendCommand(${reqCommand.Type}) fail: ${err.type}, ${err.message}`);
    }
}


