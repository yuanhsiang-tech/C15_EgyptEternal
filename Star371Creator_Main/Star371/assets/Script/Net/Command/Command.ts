import { DescMessage, Message, MessageShape } from "@bufbuild/protobuf";

type Branding<K, T> = K & { __brand?: T };
type Path = Branding<string,"Path">

export namespace Command {
    /**
     * WebApi Command
     */
    export type RESTfulCommand = Command<Path,Message,Uint8Array,DescMessage>;

    /**
     * Proto Command
     */
    export type ProtoCommand = Command<number,Message,Uint8Array,DescMessage>;

    /**
     * Json Command
     */
    export type JsonCommand = Command<number,number|string|any[]|CarriarParser.AliasDefine,Uint8Array,CarriarParser.AliasDefine>
}

export namespace Command {
    export type Type = number | Path;
    export type Content = Uint8Array | string | Message | CarriarParser.AliasDefine | number | any[];
    export type Serialize = Uint8Array | string;
    export type Desc = DescMessage | CarriarParser.AliasDefine;

    export type IType<CMD> = CMD extends Command<infer T, any, any, any> ? T : never;
    export type IContent<CMD> = CMD extends Command<any, infer C, any, any> ? C : never;
    export type ISerialize<CMD> = CMD extends Command<any, any, infer S, any> ? S : never;
    export type IDesc<CMD> = CMD extends Command<any, any, any, infer D> ? D : never;

    export type ParseParamType<D> = D extends DescMessage ? D : Constructor<D>;
    export type ParseReturnType<D> = D extends DescMessage ? MessageShape<D> : any;

    /**
     * 一般通用型 Command
     */
    export interface Command<
            T extends Type=Type, 
            C extends Content=Content, 
            S extends Serialize=Serialize,
            D extends Desc=Desc
    > {
        readonly Type: T;
        readonly Content: C|S;
        Parse<Desc extends D>(schema: ParseParamType<Desc>): ParseReturnType<Desc>;
    }

    /**
     * 具有特定類型的 Command
     */
    export interface TypeCommand<
        T extends Type=Type, 
        C extends Content=Content, 
        S extends Serialize=Serialize,
        D extends Desc=Desc
    > extends Command<T,C,S,D>, Serializable<S> {
        readonly HeaderContentType: Command.HeaderContentType;
        readonly ResponseType: Command.ResponseType;
        readonly ReqCommand: Command<T,C,S,D>;
        Reverse(type?:number, message?:string): TypeCommand<T,C,S,D>;
    }

    export interface MarkableCommand<
        T extends Type=Type, 
        C extends Content=Content, 
        S extends Serialize=Serialize,
        D extends Desc=Desc
    > extends TypeCommand<T,C,S,D> {
        readonly Marked: boolean;
        Mark(): void;
    }
}

export namespace Command {
    export interface Serializable<S extends Serialize=Serialize> {
        Serialize(): S;
    }
    export enum HeaderContentType {
        JSON        = "application/json",
        PROTOBUF    = "application/x-protobuf",
        FORM        = "application/x-www-form-urlencoded"
    }
    export enum ResponseType {
        BUFFER      = "arraybuffer",
        TEXT        = "text",
    }
}

export namespace Command {
    export abstract class Raw<
        T extends Type, 
        C extends Content, 
        S extends Serialize,
        D extends Desc
    > implements MarkableCommand<T,C,S,D> {
        private m_marked: boolean;

        protected m_type: T;
        protected m_content: C|S;
        protected m_reqCommand: Command<T,C,S>;

        public abstract get HeaderContentType(): HeaderContentType;
        public abstract get ResponseType(): ResponseType;

        public get Type(): T { return this.m_type; }
        public get Content(): C|S { return this.m_content; }
        public get Marked(): boolean { return this.m_marked; }
        public get ReqCommand(): Command<T,C,S> { return this.m_reqCommand; }
        
        constructor(type: T, content: C)
        constructor(type: T, content: C, reqCommand: Command<T,C,S>)
        constructor(type: T, content: S)
        constructor(type: T, content: S, reqCommand: Command<T,C,S>)
        constructor(type: T, content: C|S) 
        constructor(type: T, content: C|S, reqCommand: Command<T,C,S>)
        constructor(type: T, content: C|S, reqCommand?: Command<T,C,S>)
        {
            this.m_reqCommand = reqCommand;
            this.m_type = type;
            this.m_content = content;
            this.m_marked = false;
        }
        
        public Mark(): void { 
            this.m_marked = true;
        }

        public abstract Reverse(type?:number, message?:string): Raw<T,C,S,D>;
        public abstract Parse<Desc extends D>(schema: ParseParamType<Desc>): ParseReturnType<Desc>;
        public abstract Serialize(): S;
    }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * 此區段為 VF Json Command 相容處理，一般情形下應保持區段 2 啟用的狀態，表示不使用 Json Command
 * 如需測試使用，需執行以下步驟：
 * 1. 從 VF 複製 assets/Script/Core/Akismin/Carriar 資料夾並貼到 assets/Script/Net/Command/Type/Json 資料夾下
 * 2. 將 [區段1] 的註解移除，並將 [區段2] 的部分註解
 * 3. 將對應的 Service 改繼承 JsonService
 */

//#region [區段1]
// import { CarriarParser } from "./Type/Json/Carriar/CarriarParser";
// export { JsonCarriar } from "./Type/Json/Carriar/Carriar";
// export { CarriarParser, CarriarDecorator } from "./Type/Json/Carriar/CarriarParser"
//#endregion

//#region [區段2]
export class JsonCarriar { constructor(...args){}; public Generate(): Uint8Array{return null;} }
export namespace CarriarParser {
    export class AliasDefine { constructor(...args){};ToAliasJsonObj():any{};ToJson():string{return""} }
    export function ParseString(...args):any {}
    export function ToJson(...args):string{return null;}
}
export namespace CarriarDecorator {
   export function ClassName(name: string){return function (ctor: Function){ctor.prototype._cname_ = name}}
   export function CustomToJson(ctor:Function) {}
}
//#endregion

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////