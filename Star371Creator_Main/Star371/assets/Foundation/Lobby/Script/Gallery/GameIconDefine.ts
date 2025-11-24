import { ccenum, Size } from "cc";

export namespace GameIconDefine {
    /**
     * 尺寸類型
     */
    export enum Type {
        REGULAR             = 0,    // 正常尺寸，佔用 4/4 格
        COMPACT             = 1,    // 偏窄尺寸，佔用 3/4 格
        SMALL               = 2,    // 篇小尺寸，佔用 2/4 格
        TINY                = 3,    // 最小尺寸，佔用 1/4 格
    }
    ccenum(Type);

    /**
     * 尺寸對應佔用格數
     */
    export const TypeOccupied = {
        [Type.REGULAR]:     4,
        [Type.COMPACT]:     3,
        [Type.SMALL]:       2,
        [Type.TINY]:        1,
    }

    /**
     * 配置資訊
     */
    export class LayoutInfo { public constructor(public Top:number, public SpaceY:number){}}
    /**
     * Cell 內部版位配置
     */
    export const CellLayout = {
        [Type.REGULAR]:     new LayoutInfo(54.5,    0),
        [Type.COMPACT]:     new LayoutInfo(54.5,  1.5),
        [Type.SMALL]:       new LayoutInfo(54,   10.9),
        [Type.TINY]:        new LayoutInfo(56,   13.6),
    }

    /**
     * Icon 尺寸縮放比例
     */
    export const IconScale = {
        [0]: {
            [Type.REGULAR]:     1.0,
            [Type.SMALL]:       1.0,
        },
        [1]: {
            [Type.REGULAR]:     0.9,
            [Type.SMALL]:       0.89,
        }
    }

    /**
     * 動作類型
     */
    export enum Action {
        NONE                = 0,      // 預設動作：可能是前往子大廳(如果有子大廳)，可能是直接加入遊戲(如果沒有子大廳則直接從列表中挑選廳館加入)
        UI_PRESENT          = 1,      // 開啟遊戲內的機制介面(如：Webview、商城、名片...等)
        WEB_BROWSING        = 2,      // 瀏覽器開啟網頁(如：Safari 或 Chrome 開啟網頁)
        JOIN_GAME           = 3,      // 加入指定的遊戲廳館(如：捕魚特定島嶼、麻將特定館別)
        GO_TO_STAGE         = 4,      // 前往指定的場景(如：鑽石大廳)
        AD                  = 5,      // 廣告靜態圖
    }

    /**
     * 子大廳資訊所在位移（Status.SUBLOBBY）
     */
    const SUBLOBBY_SHIFT    = 16;

    /**
     * 活動資訊所在位移（Status.ACTIVITY）
     */
    const ACTIVITY_SHIFT    = 20;

    /**
     * 狀態類型（可組合）
     */
    export enum Status {
        HOT                 = 0b0001 << 0,                  // 是否顯示[熱門]提示
        NEW                 = 0b0001 << 1,                  // 是否顯示[最新]提示
        JACKPOT             = 0b0001 << 2,                  // 是否有 Jackpot
        SPINE               = 0b0001 << 3,                  // 是否使用 Spine 動畫
        MAINTAINANCE        = 0b0001 << 4,                  // 是否維護中

        SUBLOBBY            = 0b1111 << SUBLOBBY_SHIFT,     // 是否為子大廳
        ACTIVITY            = 0b1111 << ACTIVITY_SHIFT,     // 是否有活動
    }

    /**
     * 取得子大廳編號
     * @param input 複合型狀態碼
     */
    export function ExtractSubLobby(input:number): number {
        return ExtractValue(input, Status.SUBLOBBY, SUBLOBBY_SHIFT);
    }

    /**
     * 取得活動編號
     * @param input 複合型狀態碼
     */
    export function ExtractActivity(input:number): number {
        return ExtractValue(input, Status.ACTIVITY, ACTIVITY_SHIFT);
    }

    /**
     * 取得對應 bit 位置值
     * @param input 複合型狀態碼
     * @param status 目標萃取狀態佔用的 bit 值
     * @param shift 目標萃取狀態的位移值
     */
    function ExtractValue(input:number, status:number, shift:number): number {
        if (typeof input != 'number') return -1;
        const value:number = input&status>>shift;
        return value <= 0 ? -1 : Math.log2(value);
    }
}