import type { DescMessage, MessageInitShape, MessageShape } from "@bufbuild/protobuf";

declare global {

/**
 * 從 Protobuf Descriptor 建立 Message 物件
 * @param schema Protobuf Scheme
 * @param init 可選用的初始化物件
 * @example
 * 範例：
 *      const result:ClientConnectionResult = ProtoCreate(ClientConnectionResultSchema);
 *      result.result = ConnectionResult.INVALID_TOKEN;
 */
function ProtoCreate<Desc extends DescMessage>(schema: Desc, init?: MessageInitShape<Desc>): MessageShape<Desc>;

// /**
//  * 將 Uint8Array 的資料轉換成對應的結構
//  * @param message 資料內容
//  * @param schema Protobuf Scheme
//  * @deprecated 建議直接使用 Command 物件上的 Parse 方法
//  * @example
//  * 範例：
//  *      const result:ClientConnectionResult = ProtoParse(content, ClientConnectionResultSchema);
//  */
function ProtoParse<Desc extends DescMessage>(message:Uint8Array, schema:Desc): MessageShape<Desc>;

}
export{}