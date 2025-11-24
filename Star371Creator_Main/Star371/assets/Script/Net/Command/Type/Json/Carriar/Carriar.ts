import { CarriarDecorator, CarriarParser } from "./CarriarParser";

enum JSON_ENCODE
{
   LEFT_CURLY_BRACKET = 123,
   RIGHT_CURLY_BRACKET = 125
}
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();


interface Parser
{
   Type (): number;
   GetContent (): any;
   Parse<T extends CarriarParser.AliasDefine> ( target?: T | T[] ): T | undefined;
   Generate (): Uint8Array;

}

export class PBufCarriar implements Parser 
{
   public _type: number = 0;
   public _content: Uint8Array = null;
   constructor ( type: number, content: any = null )
   {
      this._type = type;
      this._content = content;
   }
   Type (): number
   {
      return this._type;
   }
   GetContent (): Uint8Array
   {
      return this._content;
   }
   Parse<T extends CarriarParser.AliasDefine> ( target?: T | T[] ): T | undefined
   {
      return CarriarParser.ParseObject( this._content, target as any ) as any;
   }

   public Generate (): Uint8Array
   {
      return new Uint8Array( 0 );
   }

   public static ReadCarriar ( bytes: string | Uint8Array ): PBufCarriar
   {
      let carriar: Parser = null;

      return !carriar ? null : new PBufCarriar( null, carriar );
   }
}

export class JsonCarriar implements Parser
{
   private _type: number = 0;
   private _content: string = null;
   private _jsonData: JsonData = null;
   constructor ( type: number, content: any = null )
   {
      if ( !type && content._cname_ && content._cname_ == 'JsonData' )
      {
         this._jsonData = content;
         this._type = this._jsonData.m_type;
         this._content = this._jsonData.m_content;
      }
      else 
      {
         this._type = type;
         this._content = content;

         this._jsonData = this._jsonData || new JsonData( type, content );
      }
   }
   Type (): number
   {
      return this._type;
   }
   GetContent ()
   {
      return this._content;
   }
   Parse<T extends CarriarParser.AliasDefine> ( target?: T | T[] ): T | undefined
   {
      return CarriarParser.ParseString( this._content, target as any );
   }

   public Generate (): Uint8Array
   {
      let content = this._jsonData.ToJson();
      return textEncoder ? textEncoder.encode( content ) : new Uint8Array( 0 );
   }

   public static ReadCarriar ( bytes: string | Uint8Array ): JsonCarriar
   {
      let carriar: Parser = null;

      if ( !bytes || bytes.length == 0 )
      {
         // [無效的資料]
      } else if ( textDecoder && ArrayBuffer.isView( bytes ) && bytes[ 0 ] == JSON_ENCODE.LEFT_CURLY_BRACKET && bytes[ bytes.length - 1 ] == JSON_ENCODE.RIGHT_CURLY_BRACKET )
      {
         // [未壓縮 Uint8Array 型 json 內容]
         const jsonString: string = textDecoder.decode( bytes );
         carriar = CarriarParser.ParseString( jsonString, JsonData );
      } else if ( typeof bytes == "string" && bytes.charCodeAt( 0 ) == JSON_ENCODE.LEFT_CURLY_BRACKET && bytes.charCodeAt( bytes.length - 1 ) == JSON_ENCODE.RIGHT_CURLY_BRACKET )
      {
         // [未壓縮字串型 json 內容]
         carriar = CarriarParser.ParseString( bytes, JsonData );
      }

      return !carriar ? null : new JsonCarriar( null, carriar );
   }
}


@CarriarDecorator.ClassName( "JsonData" )
export class JsonData extends CarriarParser.AliasDefine
{
   m_type: number = 0;
   m_content: any = "";
   get type (): number { return this.m_type; }
   get content (): any { return this.m_content; }
   constructor ( cmdType: number = 0, cmdContent: any = null )
   {
      super( [ "m_type", "type" ], [ "m_content", "content" ] );
      this.m_type = cmdType;
      this.m_content = cmdContent;
   }
   BatchWrite<T extends CarriarParser.AliasDefine> ( field: string, data: T ){
      let batchContent = "";
      if ( data === undefined || data === null ){
         console.warn( "BatchWrite: data is null" );
         return;
      }
      else if(data.ToJson != undefined && typeof data.ToJson == "function"){
         batchContent = data.ToJson();
      }else{
         batchContent = CarriarParser.ToJson(data, field);
      }

      let found = this.m_content.lastIndexOf( field );
      let isFirst = found == -1;  
      isFirst && (this.m_content = "{\"\":{}}");
      for( let i = 0; i < 2; ++i ){
         this.m_content = this.m_content.substring(0, found);
         found = this.m_content.lastIndexOf( field );
      }

      found = batchContent.indexOf("{");
      batchContent = batchContent.substring(found+1);
      this.m_content = this.m_content + ( isFirst ? batchContent + "}" : "," + batchContent + "}" );

   }

}

export namespace Carriar
{
   export type Carriar = Parser;
   export function Create ( type: number, content: any = null ): Parser
   {
      if ( content && content._isProtoBuf )
         return;
      else 
      {
         if ( content == null )
            return new JsonCarriar( type, "" );
         else if ( content.ToAliasJsonObj )
            return new JsonCarriar( type, JSON.stringify( { [ " " ]: content.ToAliasJsonObj() } ) );
         else if ( Array.isArray(content) )
            return new JsonCarriar( type, CarriarParser.ToJson(content, " ") );
         else
            return new JsonCarriar( type, JSON.stringify( { [ " " ]: content } ) );
      }
   }
   export function Generate ( carriar: Parser ): Uint8Array
   {
      return carriar.Generate();
   }
   export function ParseCarriar ( bytes: string | Uint8Array ): Parser
   {
      // 先試解析json資料再試 protoBuf 資料
      return JsonCarriar.ReadCarriar( bytes ) || PBufCarriar.ReadCarriar( bytes );
   }
}
