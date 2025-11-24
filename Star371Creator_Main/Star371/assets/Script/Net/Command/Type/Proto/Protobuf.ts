import { Command as CMD } from "../../Command";
import { Error, ErrorSchema, ProtoCommand, ProtoCommandSchema } from "../../../../Proto/gt2/gt2_pb";
import { create, DescMessage, fromBinary, Message, MessageInitShape, MessageShape, toBinary } from "@bufbuild/protobuf";

/**
 * 擴展 Message 物件，加入 Serialize 方法
 * @param protoObj Protobuf Message 物件
 * @param schema Protobuf Scheme
 */
function Extend<Desc extends DescMessage>(protoObj:MessageShape<Desc>, schema:Desc): MessageShape<Desc> {
    Object.defineProperties(protoObj,{Serialize:{enumerable:false,writable:false,configurable:false,value:():Uint8Array=>toBinary(schema,protoObj)}});
    return protoObj;
}

/**
 * 從 Protobuf Descriptor 建立 Message 物件
 * @param schema Protobuf Scheme
 * @param init 可選用的初始化物件
 * @example
 * 範例：
 *      const result:ClientConnectionResult = Protobuf.Create(ClientConnectionResultSchema);
 *      result.result = ConnectionResult.INVALID_TOKEN;
 */
function Create<Desc extends DescMessage>(schema: Desc, init?: MessageInitShape<Desc>): MessageShape<Desc> {
    return Extend(create(schema, init), schema);
}
globalThis.ProtoCreate = Create;

/**
 * 將 Uint8Array 的資料轉換成對應的結構
 * @param message 資料內容
 * @param schema Protobuf Scheme
 * @example
 * 範例：
 *      const result:ClientConnectionResult = ProtoParse(content, ClientConnectionResultSchema);
 */
function Parse<Desc extends DescMessage>(message:Uint8Array, schema:Desc): MessageShape<Desc> {
    return Extend(fromBinary(schema, message), schema);
}
globalThis.ProtoParse = Parse;

/**
 * 數值與 byte 陣列轉換處理
 */
namespace Converter {
    /**
     * 數值轉換成 byte 陣列
     * @param num 要轉換的數值
     */
    export function NumberToBytes2(num: number): Uint8Array {
        const buffer: ArrayBuffer = new ArrayBuffer(2);
        new DataView(buffer).setInt16(0, num);
        return new Uint8Array(buffer);
    }
    
    /**
     * byte 陣列轉換成數值
     * @param bytes 要轉換的 byte 陣列
     */
    export function Bytes2ToNumber(bytes: Uint8Array): number {
        return new DataView(bytes.buffer).getInt16(0);
    }
}

export namespace Protobuf {
    export class Command extends CMD.Raw<
        CMD.IType<CMD.ProtoCommand>,
        CMD.IContent<CMD.ProtoCommand>,
        CMD.ISerialize<CMD.ProtoCommand>,
        CMD.IDesc<CMD.ProtoCommand>
    > implements CMD.ProtoCommand {
        public static Deserialize(data: CMD.ISerialize<CMD.ProtoCommand>, reqCommand?: CMD.ProtoCommand): Protobuf.Command {
            const cmd:ProtoCommand = fromBinary(ProtoCommandSchema, data);
            return new Protobuf.Command(cmd.type, cmd.content, reqCommand);
        }

        public get HeaderContentType(): CMD.HeaderContentType { return CMD.HeaderContentType.PROTOBUF; }
        public get ResponseType(): CMD.ResponseType { return CMD.ResponseType.BUFFER; }
        
        public override Reverse(type?:number, message?:string): Protobuf.Command {
            return type == null ? null : new Protobuf.Command(this.m_type, (ProtoCreate(ErrorSchema, {type: type, message: message}) as Message as Message&CMD.Serializable<CMD.ISerialize<CMD.ProtoCommand>>)?.Serialize?.());
        }
        
        public Parse<Desc extends CMD.IDesc<CMD.ProtoCommand>>(schema: CMD.ParseParamType<Desc>): CMD.ParseReturnType<Desc> {
            if (ArrayBuffer.isView(this.m_content)) {
                return Parse(this.m_content, schema) as CMD.ParseReturnType<Desc>;
            }
            return null;
        }

        public Serialize(): CMD.ISerialize<CMD.ProtoCommand> {
            if (ArrayBuffer.isView(this.m_content)) {
                return this.m_content;
            } else {          
                return toBinary(ProtoCommandSchema, create(ProtoCommandSchema, {
                    type: this.Type,
                    content: this.m_content != null ? (this.m_content as Message&CMD.Serializable<CMD.ISerialize<CMD.ProtoCommand>>)?.Serialize?.() : new Uint8Array()
                }));
            }
        }
    }
}