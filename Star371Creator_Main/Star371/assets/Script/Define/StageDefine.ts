import { BundleDefine } from "./BundleDefine";
import { IStageInfo, StageInfo } from "./StageInfoDefine";

/**
 * 場景 ID 列舉
 */
export enum StageId {
    LOADING     = 1,
    LOGIN       = 2,
    LOBBY       = 3,
    CRYSTAL     = 4,

    GAME        = 1000,             // 遊戲 Stage 起始 ID
}

/**
 * 場景資訊設定表
 * 備註：需手動設定
 */
const InfoList:IStageInfo[] = [
    StageInfo.New(StageId.LOADING,  BundleDefine.Foundation.LOADING),
    StageInfo.New(StageId.LOGIN,    BundleDefine.Foundation.LOGIN),
    StageInfo.New(StageId.LOBBY,    BundleDefine.Foundation.LOBBY),
    StageInfo.New(StageId.CRYSTAL,  BundleDefine.Foundation.LOBBY).Scene("CrystalLobby"),
];





/**
 * 場景資訊對應表
 * 備註：自動產生不用設定
 */
export const StageInfoMap:Map<number, StageInfo> = (()=>{
    const map = new Map<number, StageInfo>();
    for (const each of InfoList) {
        const info:StageInfo = each as StageInfo;
        map.set(info.Id, info);
    }
    return map;
})();