import { Command as CMD, CarriarParser, JsonCarriar } from "../../Command";

export namespace Json {
    const decoder:TextDecoder = new TextDecoder();
    function ClassName(name: string) { return function (ctor: Function) { ctor.prototype._cname_ = name; };}

    @ClassName("CoreData")
    class CoreData extends CarriarParser.AliasDefine {
        private m_type: number = 0;
        private m_content: any = "";

        get type (): number { return this.m_type; }
        get content (): any { return this.m_content; }

        constructor(cmdType: number = 0, cmdContent: any = null) {
            super(["m_type", "type"],["m_content", "content"]);
            this.m_type = cmdType;
            this.m_content = cmdContent;
        }
    }

    @ClassName("CoreData")
    export class Error extends CarriarParser.AliasDefine {
        private m_type: number = 0;
        private m_message: string = "";

        get type (): number { return this.m_type; }
        get message (): string { return this.m_message; }

        constructor(type: number, message: string) {
            super(["m_type", "type"],["m_content", "content"]);
            this.m_type = type;
            this.m_message = message;
        }
    }

    export class Command extends CMD.Raw<
        CMD.IType<CMD.JsonCommand>,
        CMD.IContent<CMD.JsonCommand>,
        CMD.ISerialize<CMD.JsonCommand>,
        CMD.IDesc<CMD.JsonCommand>
    > implements CMD.JsonCommand {
        public static Deserialize(data: CMD.ISerialize<CMD.JsonCommand>, reqCommand?: CMD.JsonCommand): Json.Command {
            const cmd:CoreData = CarriarParser.ParseString(decoder.decode(data), CoreData);
            return new Json.Command(cmd.type, cmd.content, reqCommand);
        }

        public get HeaderContentType(): CMD.HeaderContentType { return CMD.HeaderContentType.JSON; }
        public get ResponseType(): CMD.ResponseType { return CMD.ResponseType.BUFFER; }

        public override Reverse(type?:number, message?:string): Json.Command {
            return type == null ? null : new Json.Command(this.m_type, new TextEncoder().encode(CarriarParser.ToJson(new Json.Error(type, message))));
        }
        
        public Parse<Desc extends CarriarParser.AliasDefine>(schema: CMD.ParseParamType<Desc>): CMD.ParseReturnType<Desc> {
            if (typeof this.m_content == "string") {
                return CarriarParser.ParseString(this.m_content, schema) as CMD.ParseReturnType<Desc>;
            }
            return null;
        }

        public Serialize(): Uint8Array {
            if (this.m_content == null) {
                return new JsonCarriar(this.m_type, "" ).Generate();
            } else if ((this.m_content instanceof CarriarParser.AliasDefine)) {
                return new JsonCarriar(this.m_type, JSON.stringify({[ " " ]: this.m_content.ToAliasJsonObj()})).Generate();
            } else if (Array.isArray(this.m_content)) {
                return new JsonCarriar(this.m_type, CarriarParser.ToJson(this.m_content, " ")).Generate();
            } else {
                return new JsonCarriar(this.m_type, JSON.stringify({[ " " ]: this.m_content })).Generate();
            }
        }
    }
}