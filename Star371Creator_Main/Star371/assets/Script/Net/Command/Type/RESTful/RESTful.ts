import { Message } from "@bufbuild/protobuf";
import { Command as CMD } from "../../Command";
import { ErrorSchema } from "db://assets/Script/Proto/gt2/gt2_pb";

export namespace RESTful {
    export class Command extends CMD.Raw<
            CMD.IType<CMD.RESTfulCommand>,
            CMD.IContent<CMD.RESTfulCommand>,
            CMD.ISerialize<CMD.RESTfulCommand>,
            CMD.IDesc<CMD.RESTfulCommand>
        > implements CMD.RESTfulCommand 
    {
        public static Deserialize(data: CMD.ISerialize<CMD.RESTfulCommand>, reqCommand?: CMD.RESTfulCommand): RESTful.Command {
            return new RESTful.Command(reqCommand.Type, data, reqCommand);
        }

        public get HeaderContentType(): CMD.HeaderContentType { return CMD.HeaderContentType.PROTOBUF; }
        public get ResponseType(): CMD.ResponseType { return CMD.ResponseType.BUFFER; }
        
        public override Reverse(type?:number, message?:string): RESTful.Command {
            return type == null ? null : new RESTful.Command(this.m_type, (ProtoCreate(ErrorSchema, {type: type, message: message}) as Message as Message&CMD.Serializable<CMD.ISerialize<CMD.ProtoCommand>>)?.Serialize?.());
        }
        
        public Parse<Desc extends CMD.IDesc<CMD.RESTfulCommand>>(schema: CMD.ParseParamType<Desc>): CMD.ParseReturnType<Desc> {
            if (ArrayBuffer.isView(this.m_content)) {
                return ProtoParse(this.m_content, schema) as CMD.ParseReturnType<Desc>;
            }
            return null;
        }

        public Serialize(): CMD.ISerialize<CMD.RESTfulCommand> {
            if (ArrayBuffer.isView(this.m_content)) {
                return this.m_content;
            } else {
                return (this.m_content as Message&CMD.Serializable<CMD.ISerialize<CMD.ProtoCommand>>)?.Serialize?.() ?? new Uint8Array();
            }
        }
    }
}