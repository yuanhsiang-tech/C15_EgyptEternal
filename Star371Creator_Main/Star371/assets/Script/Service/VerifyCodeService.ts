import Sha256 from "../../Stark/Sha256/Sha256";
import { Command } from "../Net/Command/Command";
import { ServiceInstance } from "./Foundation/Service";
import { RESTfulService } from "./Foundation/RESTfulService";
import { PicAck, PicAckSchema, PicRequestSchema } from "../Proto/service/verifyCode/verifyCode_pb";

enum ApiPath {
    GET_PIC = "/getPic",
}

function VirtualId(): string {
    let id: string = Sha256(performance.now().toString());

    if (typeof id == "string" && id != "") {
        /* 
            Id 是包含 dash(-) 在內總共 36 字元格式為 8-4-4-4-12 的型式(如：dd13272b-3c31-4c6a-dd13-272b3c314c6a)，
            在此將使用 32 字元長度的字串後於特定索引位置插入共計 4 個 dash 字元以組合出 36 字元格式
        */

        // 不包含 dash 的字元總長度
        const numberOfChars: number = 32;

        // 4 個 dash 所在位置索引
        const dashAtIndice: number[] = [8, 13, 18, 23];

        // 分離字串成字元陣列後於特定索引位置插入 dash(-) 字元
        const splitId: string[] = id.substring(0, numberOfChars).split('');
        for (let index of dashAtIndice) {
            splitId.splice(index, 0, '-');
        }

        return splitId.join('');
    }

    return "";
}

@ServiceInstance
export class VerifyCodeService extends RESTfulService {
    public static readonly Instance: VerifyCodeService;

    private m_uuid:string;
    private m_pickData:PicAck;

    protected OnCommand(cmd: Command.RESTfulCommand): void {
        switch (cmd.Type) {
            case ApiPath.GET_PIC: {
                this.m_pickData = cmd.Parse(PicAckSchema);
                break;
            }
        }
    }

    /**
     * 請求驗證碼圖片資料
     */
    public FetchPic(): void {
        this.m_uuid = this.m_uuid || VirtualId();
        this.m_pickData = null;
        this.SendCommand(ApiPath.GET_PIC, ProtoCreate(PicRequestSchema, { Uuid: this.m_uuid }));
    }

    /**
     * 取得驗證碼圖片資料
     */
    public GetPic(): Uint8Array[] {
        return this.m_pickData?.Pic?.Pic?.map((x)=>x.Data);
    }
}


