import { JsonData } from "./Carriar";
import { CarriarDecorator, CarriarParser } from "./CarriarParser";

function toWJson ( itemList: Array<any> )
{
   let arrJson = "";
   let firstItem: any = itemList[ 0 ];
   if ( firstItem.ToJson === undefined || firstItem.ToJson === null )
   {
      arrJson += JSON.stringify( itemList );
   }
   else
   {
      arrJson = "[";
      for ( let i = 0; i < itemList.length; ++i )
      {
         arrJson += ( itemList[ i ] as any ).ToJson();
         if ( ( i + 1 ) < itemList.length )
         {
            arrJson += ",";
         }
      }
      arrJson += "]";
   }
   return arrJson;
}

@CarriarDecorator.ClassName( "BatchTitle" )
export class BatchTitle extends CarriarParser.AliasDefine
{
    serialNumber: number = 0;
    ended: boolean = false;
    data: string = "";

    constructor ( serialNumber?: number, ended?: boolean, data?: string)
    {
        super(
            [ "serialNumber" ],
            [ "ended" ],
            [ "data" ]
        );
        serialNumber && ( this.serialNumber = serialNumber );
        ended && ( this.ended = ended );
        data && ( this.data = data );
    }
    Init( serialNumber: number, ended: boolean, data: string )
    {
        this.serialNumber = serialNumber;
        this.ended = ended;
        this.data = data; 
    }
}

@CarriarDecorator.ClassName( "ExtendType" )
class ExtendType extends CarriarParser.AliasDefine {
   constructor ()
   {
      super();
   }
}


class BatchSender {
    constructor (sender: Function = null, sendingCmdType: number = 0, serialNumber: number = 0){
        this.sender = sender;
        this.sendingCommandType = sendingCmdType;
        this.serialNumber = serialNumber;
    }
   sender: Function = null;
   sendingCommandType: number = 0;
   serialNumber: number = 0;
}

export class BatchCarriarSender<ItemType extends CarriarParser.AliasDefine | number, ExtendItemType extends CarriarParser.AliasDefine = ExtendType> {
    MAX_PIECE_LENGTH: number = 0;
    m_handle: BatchSender = null;
    m_extendItem: ExtendItemType | ExtendType = null;

    constructor ( cmdSender: Function, sendingCmdType: number )
    {
        this.MAX_PIECE_LENGTH = 1024 / 2;
        this.m_handle = new BatchSender( cmdSender, sendingCmdType, 0);
    }
    SessionQuery( itemList: Array<ItemType>, extendItem?: ExtendItemType )
    {
        this.m_extendItem = extendItem || new ExtendType();
        this.__queryPices( itemList, 0 );
    }

    __queryPices( itemList: Array<ItemType>, start: number = 0 )
    {
        let wjson = toWJson( itemList );
        let index: number = start;
        let count: number = wjson.length;
        while ( index < count )
        {
           let temp: string;
           let finish = wjson.length - index <= this.MAX_PIECE_LENGTH;
           if ( finish )
           {
              temp = wjson.substring( index );
              index = count;
           }
           else
           {
              temp = wjson.substring( index, index + this.MAX_PIECE_LENGTH );
              index += this.MAX_PIECE_LENGTH;
           }
           this._query( temp, finish );
        }
    }
    private _query ( picesData: string, isEnded: boolean )
    {
        let header: BatchTitle = new BatchTitle();
        header.Init( this.m_handle.serialNumber, isEnded, picesData );

        let command: JsonData = new JsonData( this.m_handle.sendingCommandType, header );
        if ( isEnded )
        {
            command.BatchWrite( "extends", this.m_extendItem );
        }
        if ( typeof this.m_handle.sender  == "function" ){
            this.m_handle.sender( command );
        }
    }
}

class BatchReceviver {

    serialNumber: number = 0;
    receiving: boolean = false;
    data: any[] = [];
    items: any = []; // {} | []
    extendItem: any = null;
    public Reset() {
        this.serialNumber = 0;
        this.receiving = false;
        this.data = [];
        this.items = [];
        this.extendItem = null;
    }
}
/**
 * SequenceCommandReceiver
 * 使用方式:
 * @example
 * //1. 宣告一個Revciver
 *   private m_recv: BatchCarriarRecevier<GameInfoAck>;
 * //2. 把他new出來
 *   this.m_recv = new BatchCarriarRecevier<GameInfoAck>();
 * //3. 收封包的地方 呼叫Receive
 *      case PROTOCOL_U2S.INFO_ACK:{
            if ( this.m_recv.Receive(content, GameInfoAck) )
            {
                let ack:GameInfoAck[] = this.m_recv.Data();
                log("GameInfoAck", ack);
            }
        }
 */
export class BatchCarriarRecevier<T extends CarriarParser.AliasDefine> {
    protected _recv: BatchReceviver = null;
    public get Receiving() : boolean { return this._recv ? this._recv.receiving : false; }
    public GetCount(header) : number { return this._recv ? this._recv.data.length : 0; }
    public get Extend():any { return this._recv ? this._recv.extendItem : null; }
    /**
     * 
     * @returns 根據Server回傳的資料 決定泛型回傳的資料是 T物件 或 T陣列 (T extends CarriarParser.AliasDefine)
     * @example 
     * let ack:GameInfoAck[] = this.m_recv.Data();
     * // or
     * let ack:GameInfoAck = this.m_recv.Data();
     */
    public Data(): any { return this._recv ? this._recv.items : null; }

    constructor() {
        this._recv = new BatchReceviver();
    }
    /**
     * Clear
     */
    Reset() {
        this._recv?.Reset();
    }
    /**
     * GetItemAt
     * @param idx 
     * @returns 
     */
    GetItem ( idx: number ): any
    {
        let length = this.Data ? this.Data.length : 0;
        if ( idx >= length )
        {
        return undefined;
        }
        return this._recv.items[ idx ];
    }
    
    Receive( jsonString: string, itemAllocator:(new () => T), extendItemAllocator?: any, jsonKey: string = "" ) {

        this._recv.receiving = true;

        let originalJsonObj: Object = JSON.parse( jsonString );
        jsonKey = originalJsonObj[ jsonKey ] != null ? jsonKey : " ";
        let jsonObj = originalJsonObj[ jsonKey ];
        let header;
        
        if ( jsonObj == null ) {
            header = new BatchTitle();
        }
        else if (jsonObj.serialNumber != null ) {  /// 不使用 !== 是因為 要同時排除 null 和 undefined，要用 != null
            header = CarriarParser.ParseToClassObj( jsonObj, new BatchTitle());
        } 
        else { // serialNumber == undefined 的時候 是單一封包 這邊處理是為了兼容舊單一封包
            header = new BatchTitle(0, true, jsonString);
        }

        if ( this._recv.serialNumber == 0 )
        {
        this._recv.serialNumber = header.serialNumber;
        }
        else if ( ( header.serialNumber - this._recv.serialNumber ) > 0x80000000 )
        {
        return false;
        }
        else if ( ( this._recv.serialNumber - header.serialNumber ) > 0x80000000 )
        {
        this._recv.serialNumber = header.serialNumber;
        this._recv.items = [];
        }

        this._recv.data.push( header.data );

        // extents
        if ( header.ended )
        {
            if ( jsonObj.extends != null )
            {
                // let extType = typeof ( jsonObj.extends );
                if ( typeof jsonObj.extends == "number" || typeof jsonObj.extends  == "string" || typeof jsonObj.extends == "boolean" )
                {
                    this._recv.extendItem = jsonObj.extends;
                } else if ( typeof extendItemAllocator === "function" )
                {
                    let extendTargetObj = new extendItemAllocator();
                    if ( Array.isArray( jsonObj.extends ) )
                    {
                        extendTargetObj = Array.isArray( extendTargetObj ) ? extendTargetObj : [];
                    }
                    this._recv.extendItem = CarriarParser.ParseToClassObj( jsonObj.extends, extendTargetObj, extendItemAllocator, "extends" );
                }
            }
            let count = this.GetCount( header );

            this.ParseAllItemData( itemAllocator, jsonKey, count );
            this._recv.receiving = false;
        }
        return header.ended;
    }
    private ParseAllItemData ( itemAllocator: any, jsonKey: string, count?: number ) {
        
        let rawStrData: string = "";
        for ( let idx in this._recv.data )
        {
            rawStrData += this._recv.data[ idx ];
        }
        let content = null;
        try
        {
            content = JSON.parse( rawStrData );
        }
        catch ( e )
        {
            e.message = `${e.message},[${itemAllocator.name}]=>${rawStrData}`;
            throw e;
        }
        // let content = JSON.parse( rawStrData );
        content = content[ " " ] || content;

        if ( typeof itemAllocator == "number" || typeof itemAllocator  == "string" || typeof itemAllocator == "boolean" )
        {
            this._recv.items = content;
        }

        else if ( typeof itemAllocator  === "function" )
        {
            CarriarParser.ParseToClassObj( content,this._recv.items, itemAllocator);
        }
    }
}