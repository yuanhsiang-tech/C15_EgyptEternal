// @description ( new (...args: any[]) => T ) 這裡的new可以將此函數視為類構造函式
type ClassCtor<T> = ( new ( ...args: any[] ) => T );

/**
 * 把時間裡的 T 和 Z 取代，避免 Server 解時間會失敗
 * 原本的格式："2020-10-10T07:00:00.000Z"
 * 取代的格式："2020-10-10 07:00:00.000"
 */ 
(function(){
   let oldToJson = Date.prototype.toJSON;
   Date.prototype.toJSON = function () {
       let year    = this.getFullYear() < 10 ? "0" + this.getFullYear() : this.getFullYear();
       let month   = this.getMonth() < 9 ? "0" + (this.getMonth()+1) : (this.getMonth()+1);
       let date    = this.getDate() < 10 ? "0" + this.getDate() : this.getDate();
       let hour    = this.getHours() < 10 ? "0" + this.getHours() : this.getHours();
       let minute  = this.getMinutes() < 10 ? "0" + this.getMinutes() : this.getMinutes();
       let second  = this.getSeconds() < 10 ? "0" + this.getSeconds() : this.getSeconds();
       if (isNaN(year) || isNaN(month) || isNaN(date) || isNaN(hour) || isNaN(minute) || isNaN(second)) {
           console.warn("Date toJSON fail: got NaN", year, month, date, hour, minute, second);
           return oldToJson.apply(this, arguments);
       }
       return year + "-" + month + "-" + date + " " + hour + ":" + minute + ":" + second;
   }
})()

export namespace CarriarDecorator
{
   export function ClassName ( name: string )
   {
      return function ( ctor: Function )
      {
         ctor.prototype._cname_ = name;
      };
   }
   /**
    * CustomToJson Decorator
    * @param customToJson 是否使用自定義的ToJson()
    */
   export function CustomToJson(ctor:Function) {
      ctor.prototype._customToJson_ = true;
   }
}


/**
 *  Json解析時, 將別名轉成實際參數的流程實作
 * __JSON_ParseObj
 */
function  UnNormalizeAlias<T extends CarriarParser.AliasDefine> ( jsonObj:any, jsonTarget: T ): T
{
   if (jsonObj == undefined || jsonObj == null) {
      return jsonTarget
   }
   
   let jsonObjProps = Object.getOwnPropertyNames( jsonObj );
   for ( let jsonPropName of jsonObjProps )
   {
      let aliasName: ( string | undefined ) = undefined;
      if ( jsonTarget._getParseName === undefined )
         aliasName = jsonPropName;
      else
         aliasName = jsonTarget._getParseName( jsonPropName );

      if (  aliasName  == undefined )
      {
         continue;
      }

      let jsonValue: any = jsonObj[ jsonPropName ];
      let objAllocator: any = jsonTarget._getAliasCtor( aliasName );
      let target: any = jsonTarget[ aliasName ];
      if ( jsonValue === undefined ||  jsonValue === null)
      {
         continue;
      }
      else if ( typeof jsonValue  == "object" )
      {
         if ( Array.isArray( jsonValue ) )
         {
            // jsonObj是Array的話, target也必須是Array
            if ( target === null || target === undefined || Array.isArray( target ) == false )
            {
               target = [];
               jsonTarget[ aliasName ] = target;
            }
            // 解析Json Array
            if ( CarriarParser.ParseAliasArray( jsonValue, target, objAllocator, aliasName ) == false )
            {
            }
         }
         else if ( Array.isArray( target ) )
         {
            // target是Array的話, jsonObj也必須是Array
            // 如果 jsonObj 不是 array，那有可能表示結構屬性定義的地方沒有指定成 array，只是 typescript 的型別上給了 array 型別
            if ( target === null ||  target === undefined || Array.isArray( target ) == false )
            {
               target = [];
               jsonTarget[ aliasName ] = target;
            }
            // 解析Json Array
            if ( CarriarParser.ParseAliasArray( [], target, objAllocator, aliasName ) == false )
            {
            }
         }
         else
         {
            if ( objAllocator === undefined || objAllocator === null )
            {
               continue;
            }

            // jsonObj是一般的obj
            if ( target === undefined || target === null )
            {
               target = new objAllocator();
               jsonTarget[ aliasName ] = target;
            }

            if ( CarriarParser.ParseObjAlias( jsonValue, target ) == false )
            {
            }
         }
      }
      else
      {
         // jsonValue is primitive type( number / string / boolean )
         let targetVal: any = undefined;
         if ( objAllocator === null || objAllocator  === undefined )
            targetVal = jsonValue;
         else
         {
            // 如果有objAllocator帶進constructor()裡

            if ( objAllocator == Date )
            {
               targetVal = new CarriarParser.DateConstructor( jsonValue )
               // targetVal = new Date( jsonValue );
            } else
            {
               targetVal = new objAllocator( jsonValue );
            }
         }

         jsonTarget[ aliasName ] = targetVal;
      }
   }
   return jsonTarget;
}

/**
 * __JSON_Replacer__
 * Json化時, 實際參數轉成別名的流程實作
 * 於 JSON.stringify()時帶入
 */
const NormalizeAlias = ( key, value ) =>
{
   if (typeof value._customToJson_ == "boolean" && value._customToJson_ == true) {
      return value.ToJson()
   } else {
      let replacement: any = {};
      let bReplaced: boolean = false;
      if ( key === "_aliasNameMap" )
         return replacement;

      for ( let k in value ) 
      {
         if ( !value._getAliasName )
            return value;

         let aliasName = value._getAliasName( k );
         if ( !aliasName )
            continue;

         if ( Object.hasOwnProperty.call( value, k ) )
         {
            if ( value[ k ] == null )
            {
               replacement[ aliasName ] = "";
            }
            else
            {
               replacement[ aliasName ] = value[ k ];
            }
            bReplaced = true;
         }
      }
      return bReplaced ? replacement : value;
   }
}
export class CarriarParser {
   /**
     * 預設的日期時間物件建構式
     */
 	static DateConstructor:ClassCtor<Date> = Date;
}

export namespace CarriarParser
{
   const NormalizeEmpty = ( target ) =>{ return JSON.stringify(target, NormalizeAlias ); }
   const NormalizeRoot = ( target, root  ) =>{ return JSON.stringify({ [root]: target }, NormalizeAlias ) }

   export const ToJson = (target, root) =>{
      
      let isEmpty = root === undefined || root === null;

      return isEmpty ? NormalizeEmpty(target) : NormalizeRoot(target, root);
   }

   export interface IAliasDefine
   {
      name: string,
      alias?: string,
      ctor?: any;
   }
   type typeAlias = [ string, string?, any?];

   export class AliasDefine
   {
      public _aliasNameMap: IAliasDefine[] = [];

      constructor ( ...aliasArray: typeAlias[] )
      {
         for ( let aliasData of aliasArray )
         {
            if ( !aliasData[ 1 ] )
               aliasData[ 1 ] = aliasData[ 0 ];
            this._aliasNameMap.push( { name: aliasData[ 0 ], alias: aliasData[ 1 ], ctor: aliasData[ 2 ] } );
         }
      }

      /**
       * _findParseJsonAliasName
       * @param key 
       * @returns 
       */
      _getParseName ( key: string ): string
      {
         for ( let aliasData of this._aliasNameMap )
         {
            if ( aliasData.alias === key )
               return aliasData.name ;
         }
         return null;
      }


      /**
       * _findToJsonAliasName
       * @param key 
       * @returns 
       */
      _getAliasName ( key: string ): string
      {
         for ( let aliasData of this._aliasNameMap )
         {
            if ( aliasData.name === key )
               return aliasData.alias;
         }
         return null;
      }
      _getAliasCtor ( key: string ): any
      {
         for ( let aliasData of this._aliasNameMap )
         {
            if ( aliasData.name === key )
               return aliasData.ctor;
         }
         return null;
      }
      /**
       * ToJson
       * @returns 
       */
      ToAliasJsonObj (): any
      {
         let jsonStr = this.ToJson();
         return JSON.parse( jsonStr );
      }

      ToJson (): string
      {
         return NormalizeEmpty(this);
      }
      /**
       * __JSON_ParseObj
       * @param jsonObj 
       * @returns 
       */
      ToClassObj(jsonObj:any){
         return UnNormalizeAlias(jsonObj, this);
      }
   }

   function createTarget ( target )
   {
      if ( typeof target === "function" )
      {
         return new target();
      }
   }
   /**
    * _ParseJsonString
    * @param src 
    * @param target 
    * @returns 
    */
   export function ParseObject<T extends AliasDefine> ( src: any, target: ClassCtor<T>|any ): T | T[]
   {
      if (src == null)
         return src;

      src = src[ " " ] ?? src;
      if ( target == undefined )
         return src;
      let tarObj :T|T[]|any = createTarget( target ) as T;
      if ( tarObj._aliasNameMap == null || tarObj._aliasNameMap.length == 0 )
      {
         // 可能是BigNumber
         if (Array.isArray(src))
         {
            tarObj = ParseArray( src, target );
         }
         else if ( target == Date ){
            tarObj = new CarriarParser.DateConstructor( src );
         }
         else
            tarObj = new target( src );
      }
      else
      {
         if ( !Array.isArray(src) )
         {
            for ( let aliasData of tarObj._aliasNameMap )
            {
               if ( src[ aliasData.alias ] != null )
               {
                  if ( !aliasData.ctor || typeof aliasData.ctor === "number" || typeof aliasData.ctor === "string" || typeof aliasData.ctor === "boolean" )
                  {
                     tarObj[ aliasData.name ] = src[ aliasData.alias ];
                  }
                  else if ( aliasData.ctor )
                  {
                     if ( !Array.isArray( src[ aliasData.alias ] ) )
                     {
                        tarObj[ aliasData.name ] = ParseObject( src[ aliasData.alias ], aliasData.ctor );
                     }
                     else if ( Array.isArray( src[ aliasData.alias ] ) )
                     {
                        tarObj[ aliasData.name ] = ParseArray( src[ aliasData.alias ], aliasData.ctor );
                     }
                  }
               }
            }
         }
         else 
         {
            tarObj = ParseArray( src, target );
         }
      }
      return tarObj;
   }

   export function ParseArray<T extends AliasDefine> ( arr: any[], alias: ClassCtor<T> ): T[]
   {
      let result = [];
      if ( Array.isArray(arr) ) {
         for ( let item of arr )
         {
            result.push( ParseObject( item, alias ) );
         }
      }
      else {
         console.warn("ParseArray failed, input is not array");
         result = [arr];
      }
      return result;
   }

   /**
    * ParseJsonString
    * @param jsonString 
    * @param alias 
    * @returns 
    */
   export function ParseString<T extends AliasDefine> ( jsonString: string, alias?: ClassCtor<T> ): T | undefined | any
   {
      if (jsonString == undefined || jsonString == null) {
         
         let error  = new Error("jsonString is undefined or null");
         console.log( `%c${error.stack}`, "color:#ff0000")
         jsonString = "{}";
      }
      let obj = {}
      try
      {
         obj = JSON.parse( jsonString );
      }
      catch ( e )
      { 
          e.message = `${e.message},[${alias?alias.name:''}]=>${jsonString}`;
          throw e;
      }
      return ParseObject( obj, alias );
   }


   /// ------------------- ParseJson -------------------
   /**
    * Jsonizable.ParseJson
    */
   export function ParseToClassObj<T extends AliasDefine> ( jsonObj: any, targetObj: T, arrElemAllocator?: ClassCtor<T>, targetObjVarName?: string, isDebug?: boolean ): ( T | undefined )
   {
      if ( jsonObj === undefined || jsonObj === null )
      {
         console.error( "[ParseJson] - Failed! Reason : [jsonObj is undefined / null]" );
         return undefined;
      }

      if ( Array.isArray( jsonObj ) )
         return ParseAliasArray( jsonObj, targetObj, arrElemAllocator, targetObjVarName ) ? targetObj : undefined;

      return ParseObjAlias( jsonObj, targetObj ) ? targetObj : undefined;
   }

   /**
    * __ParseJsonArray__
    */
   export function ParseAliasArray( jsonArrObj: any, targetArrObj: any, arrElemAllocator?: any, targetObjVarName?: string )
   {
      let parseResult: boolean = true;

      if ( targetArrObj.length > 0 )
         targetArrObj.splice( 0, targetArrObj.length ); // clear array

      for ( let idx = 0; idx < jsonArrObj.length; idx++ )
      {
         let jsonElemObj: any = jsonArrObj[ idx ];
         if (  typeof jsonElemObj === "string" )
         {
            let tmpObj = null
            try 
            {
               tmpObj = JSON.parse( jsonElemObj )
               if ( typeof tmpObj == "number" || typeof tmpObj == "boolean") {
                  tmpObj = jsonElemObj;
               }
            }
            catch(e)
            {

            }
            finally{
               if ( tmpObj !== undefined && tmpObj !== null )
                  jsonElemObj = tmpObj;
            }
         }

         let arrayElem: any = undefined;
         if ( typeof jsonElemObj == "object" )
         {
            if ( Array.isArray( jsonElemObj ) )
            {
               // jsonElemObj是Array的話, arrayElem也必須是Array
               arrayElem = [];
               if ( ParseAliasArray( jsonElemObj, arrayElem, arrElemAllocator ) == false )
               {
                  continue;
               }
            }
            else
            {
               if ( arrElemAllocator === undefined || arrElemAllocator === null )
               {
                  parseResult = false;
                  break;
               }

               // jsonElemObj是一般的obj
               arrayElem = new arrElemAllocator();
               if ( ParseObjAlias( jsonElemObj, arrayElem ) == false )
               {
                  continue;
               }
            }
         }
         else
         {
            // jsonElemObj is primitive type( number / string / boolean )
            if ( arrElemAllocator === undefined || arrElemAllocator === null )
               arrayElem = jsonElemObj;
            else
            {
               // 如果有arrElemAllocator帶進constructor()裡
               arrayElem = new arrElemAllocator( jsonElemObj );
            }
         }

         targetArrObj.push( arrayElem );
      }

      return parseResult;
   }

   /**
    * __ParseJsonObj__
    * @param jsonObj 
    * @param targetObj 
    * @returns 
    */
   export function ParseObjAlias<T extends AliasDefine> ( jsonObj: any, targetObj: T ): boolean
   {
      let parseResult = true;

      if ( targetObj.ToClassObj == undefined || targetObj.ToClassObj === null )
      {
         parseResult = false;
      }
      else
      {
         targetObj.ToClassObj( jsonObj );
      }

      return parseResult;
   }
   
   
}
