/**
 * 玉如意通知系統定義文件
 * 包含所有類型定義、枚舉和常量
 */

import { Color, SpriteFrame } from "cc"
import { IAutoLoadingData } from "../VersionedDownloader/AutoLoadingImg/AutoLoadingDefine"
import { BundleDefine } from "../Define/BundleDefine"
import { VersionedDownloadCategory } from "../VersionedDownloader/VersionedDownloaderDefine"
import { Prize } from "../Proto/gt2/prize/prize_pb"
import { PrizeManager } from "../Prize/PrizeManager"
import { SHOW_PRIZE_STRING_MODE } from "../Prize/PrizeDefine"

/**
 * 消息類型枚舉
 */
export enum YuruyiMessageType {
    NONE_DEFINE = 0,
    PRIZE_ACTIVITY = 1,
    BOX_MISSION = 2,
    MISSION_COMPLETE = 3,
    STAR_ITEM_TIMEOUT = 4,
    EMOTION_ITEM_TIMEOUT = 5,
    GET_I_COINS = 6,
    GET_DIAMOND = 7,
    GET_V_ITEM = 8,
    GET_GOLDEN_POINT = 9,
    TITLE_NOTIFY = 10,
    CLOTH_NOTIFY = 11,
    NORMAL = 16,
    STONE = 17,
    WARHEAD = 18,
    TITLE_NOTIFY_V2 = 19,
    LOTTERY = 20,
    WORD_COLLECTION = 21,
    CLUB_COIN = 22,
    FREE_GAME_CARD = 23,
    SHINY_CARD = 24,
    SHINY_CARD_TICKET = 25,
    SERVANT_COIN = 26,
    LUCKY_SHIBA = 27
}

/**
 * 圖標類型枚舉
 */
export enum IconType {
    LEFT_ICON = 0,
    RIGHT_ICON = 1,
    ALL_ICON = 2,
    OTHER_ICON = 3
}

/**
 * 玉如意通知數據接口
 */
export interface YuruyiData {
    type: YuruyiMessageType      // 消息類型
    message: string              // 通知消息內容
    state?: string               // 狀態文字（右側顯示）

    // 圖片資料結構（優先級：prize > imgSourceData > imgSourceBundle）
    prize?: Prize                // 獎勵數據（用於 Prize 系統）
    imgSourceData?: IAutoLoadingData    // 圖片來源資料（用於遠端下載）
    imgSourceBundle?: BundleDefine.Module | 'resources'  // 圖片來源 Bundle（用於本地資源）

    delayTime?: number           // 顯示延遲時間（秒）
    offsetX?: number             // X軸偏移
    offsetY?: number             // Y軸偏移
    scale?: number               // 縮放比例
}

/**
 * 玉如意資料輔助函數
 */
export namespace YuruyiDataHelper {
    /**
     * 檢查是否使用 Prize 格式
     * @param data 玉如意資料
     * @returns 是否使用 Prize 格式
     */
    export function IsUsingPrize(data: YuruyiData): boolean {
        return !!data.prize
    }

    /**
     * 取得圖片路徑
     * @param data 玉如意資料
     * @returns 圖片路徑
     */
    export function GetImagePath(data: YuruyiData): string {
        if (IsUsingPrize(data)) {
            return PrizeManager.Instance.GetPrizeImagePath(data.prize!)
        }
        return data.imgSourceData?.filename || ""
    }

    /**
     * 取得圖片 URL
     * @param data 玉如意資料
     * @returns 圖片 URL
     */
    export function GetImageUrl(data: YuruyiData): string {
        if (IsUsingPrize(data)) {
            return PrizeManager.Instance.GetPrizeImageUrl(data.prize!)
        }
        return ""
    }

    /**
     * 檢查是否使用 Bundle 內的圖片
     * @param data 玉如意資料
     * @returns 是否使用 Bundle
     */
    export function IsUsingBundle(data: YuruyiData): boolean {
        return !IsUsingPrize(data) && !!data.imgSourceBundle
    }

    /**
     * 取得 Bundle 模組
     * @param data 玉如意資料
     * @returns Bundle 模組
     */
    export function GetBundle(data: YuruyiData): BundleDefine.Module | 'resources' | undefined {
        return data.imgSourceBundle
    }

    /**
     * 取得 AutoLoading 資料
     * @param data 玉如意資料
     * @returns AutoLoading 資料
     */
    export function GetAutoLoadingData(data: YuruyiData): IAutoLoadingData | undefined {
        return data.imgSourceData
    }

    /**
     * 取得 Prize 資料設置
     * @param data 玉如意資料
     * @returns Prize 資料設置
     */
    export function GetPrizeDataSettings(data: YuruyiData) {
        if (IsUsingPrize(data)) {
            return PrizeManager.Instance.RetrievePrizeDataSettings(data.prize!)
        }
        return undefined
    }

    /**
     * 取得 Prize 名稱
     * @param data 玉如意資料
     * @returns Prize 名稱
     */
    export function GetPrizeName(data: YuruyiData): string {
        if (IsUsingPrize(data)) {
            return PrizeManager.Instance.RetrievePrizeDataName(data.prize!)
        }
        return ""
    }

    /**
     * 取得 Prize 數量字符串
     * @param data 玉如意資料
     * @param mode 顯示模式
     * @returns Prize 數量字符串
     */
    export function GetPrizeAmountString(
        data: YuruyiData,
        mode?: SHOW_PRIZE_STRING_MODE
    ): string {
        if (IsUsingPrize(data)) {
            return PrizeManager.Instance.GetPrizeItemString(
                data.prize!,
                mode
            )
        }
        return ""
    }

    /**
     * 建立 WORD_COLLECTION 的圖片資料
     * @param itemId 道具ID
     * @returns AutoLoading 資料
     */
    export function CreateWordCollectionData(itemId: number): IAutoLoadingData {
        return {
            category: VersionedDownloadCategory.WORDCOLLECTION,
            directory: "WordCollection",
            filename: `word_${itemId.toString().padStart(3, '0')}.png`
        }
    }

    /**
     * 建立 Prize 格式的玉如意資料
     * @param type 消息類型
     * @param message 消息內容
     * @param prize 獎勵數據
     * @param options 其他選項
     * @returns 玉如意資料
     */
    export function CreatePrizeData(
        type: YuruyiMessageType,
        message: string,
        prize: Prize,
        options?: {
            state?: string
            delayTime?: number
            offsetX?: number
            offsetY?: number
            scale?: number
        }
    ): YuruyiData {
        return {
            type,
            message,
            prize,
            state: options?.state,
            delayTime: options?.delayTime,
            offsetX: options?.offsetX,
            offsetY: options?.offsetY,
            scale: options?.scale,
        }
    }
}

/**
 * 玉如意通知系統常量
 */
export const YURUYI_CONSTANTS = {
    /** 預設延遲顯示時間（秒） */
    DEFAULT_DELAY_TIME: 0.1,

    /** 動畫持續時間（秒） */
    ANIMATION_DURATION: 0.3,

    /** 隱藏顏色 */
    HIDE_COLOR: new Color(0xFF, 0xFF, 0xFF, 0),

    /** 顯示顏色 */
    SHOW_COLOR: Color.WHITE,
} as const