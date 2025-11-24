import { isValid, SpriteFrame, Texture2D } from "cc"
import { VersionedSingleFileDownloader } from "../VersionedDownloader/VersionedSingleFileDownloader"
import { DownloadResult, StorageOption } from "../../Stark/ResourceDownloader/ResourceDownloaderDefine"
import { VersionedDownloadCategory } from "../VersionedDownloader/VersionedDownloaderDefine"
import { Prize } from "../Proto/gt2/prize/prize_pb"
import {
    PrizeDataSettings,
    DefaultPrizeDataSettings,
    PRIZE_PATH_SETTING,
    PRIZE_UNIT_TYPE,
    SHOW_PRIZE_STRING_MODE,
} from "./PrizeDefine"

/**
 * 獎勵管理器
 * 負責管理獎勵數據的下載、緩存和訪問
 */
export class PrizeManager {
    private prizeDataSettingsCache: Map<string, PrizeDataSettings> = new Map()
    private playerPrizes: Map<string, Prize> = new Map()
    private m_versionedDownloader: VersionedSingleFileDownloader = null

    private static _instance: PrizeManager = null

    /**
     * 取得單例實例
     */
    static get Instance(): PrizeManager {
        if (!this._instance) this._instance = new PrizeManager()
        return this._instance
    }

    private constructor() {
        this.m_versionedDownloader = VersionedSingleFileDownloader.GetInstance()
    }

    //================================================================
    // 私用輔助方法
    //================================================================

    /**
     * 取得獎勵的唯一鍵值
     * @param prize 獎勵物件
     * @returns 唯一鍵值
     */
    private GetPrizeKey(prize: Prize): string {
        return `${prize.code}_${prize.extraNo}`
    }

    /**
     * 取得獎勵的下載分類
     * @param prize 獎勵物件
     * @returns 下載分類
     */
    public GetPrizeCategory(prize: Prize): VersionedDownloadCategory {
        // 根據獎勵代碼判斷分類，可以根據需要擴展
        if (prize.code.startsWith("word_")) {
            return VersionedDownloadCategory.WORDCOLLECTION
        }
        // 預設分類
        return VersionedDownloadCategory.DEFAULT
    }

    //================================================================
    // 玩家獎勵管理方法
    //================================================================

    /**
     * 插入或更新獎勵到 Map 中
     * @param prizes 獎勵陣列
     */
    public InsertOrUpdatePrizes(prizes: Prize[]): void {
        for (const prize of prizes) {
            const key = this.GetPrizeKey(prize)
            this.playerPrizes.set(key, { ...prize })
        }
    }

    /**
     * 清除所有玩家獎勵
     */
    public ClearPlayerPrizes(): void {
        this.playerPrizes.clear()
    }

    /**
     * 取得玩家獎勵
     * @param prize 獎勵物件（用於查找）
     * @returns 獎勵物件或 null
     */
    public GetPlayerPrize(prize: Prize): Prize | null {
        const key = this.GetPrizeKey(prize)
        return this.playerPrizes.get(key) || null
    }

    /**
     * 下載獎勵圖片
     * @param prize 獎勵物件
     * @param callback 回調函數
     * @param category 下載分類（可選，如未提供將自動判斷）
     */
    public DownloadPrizeImage(
        prize: Prize,
        callback?: (spriteFrame: SpriteFrame | null) => void
    ): void {
        const filePath = this.GetPrizeImagePath(prize)
        const downloadCategory = this.GetPrizeCategory(prize)

        this.m_versionedDownloader.DownloadFileWithVersionCheck(
            PRIZE_PATH_SETTING.BASE_URL,
            filePath,
            {
                category: downloadCategory,
                storageOption: StorageOption.FILE_ONLY,
                onSuccess: (result: DownloadResult, wasUpdated: boolean) => {
                    // 从 texture 创建 SpriteFrame
                    if (result.texture) {
                        const spriteFrame = new SpriteFrame()
                        spriteFrame.texture = result.texture as Texture2D
                        callback && callback(spriteFrame)
                    } else if (result.imageAsset) {
                        // 如果有 imageAsset，也可以创建 texture
                        const texture = new Texture2D()
                        texture.image = result.imageAsset
                        const spriteFrame = new SpriteFrame()
                        spriteFrame.texture = texture
                        callback && callback(spriteFrame)
                    } else {
                        console.warn(`⚠️ PrizeManager: 圖片載入成功但無法轉換為 SpriteFrame - ${filePath}`)
                        callback && callback(null)
                    }
                },
                onError: (error) => {
                    console.error(`❌ PrizeManager: 下載獎勵圖片失敗 - ${filePath} - ${error.message}`)
                    callback && callback(null)
                }
            }
        )
    }

    /**
     * 批量下載獎勵圖片
     * @param prizes 獎勵列表
     * @param callback 回調函數，返回 SpriteFrame 數組
     * @param category 下載分類（可選，如未提供將自動判斷）
     */
    public DownloadPrizeImages(
        prizes: Prize[],
        callback?: (spriteFrames: (SpriteFrame | null)[]) => void
    ): void {
        const spriteFrames: (SpriteFrame | null)[] = new Array(prizes.length).fill(null)
        let loadedCount = 0

        for (let i = 0; i < prizes.length; i++) {
            const prize = prizes[i]
            this.DownloadPrizeImage(prize, (spriteFrame) => {
                spriteFrames[i] = spriteFrame
                loadedCount++

                if (loadedCount >= prizes.length) {
                    callback && callback(spriteFrames)
                }
            })
        }
    }

    /**
     * 取得獎勵數據設置
     * @param prize 獎勵物件
     */
    public RetrievePrizeDataSettings(prize: Prize): PrizeDataSettings {
        let data = this.prizeDataSettingsCache.get(prize.code)
        return data ?? DefaultPrizeDataSettings
    }

    /**
     * 取得獎勵數據名稱
     * @param prize 獎勵物件
     */
    public RetrievePrizeDataName(prize: Prize): string {
        let data = this.RetrievePrizeDataSettings(prize)
        return isValid(data) ? data.Name : ""
    }

    /**
     * 取得獎勵圖片 URL
     * @param prize 獎勵物件
     */
    public GetPrizeImageUrl(prize: Prize): string {
        return `${PRIZE_PATH_SETTING.BASE_URL}${prize.code}_${prize.extraNo}${PRIZE_PATH_SETTING.FILE_EXTENSION}`
    }

    /**
     * 取得獎勵圖片路徑（用於存儲）
     * @param prize 獎勵物件
     */
    public GetPrizeImagePath(prize: Prize): string {
        return `${prize.code}_${prize.extraNo}${PRIZE_PATH_SETTING.FILE_EXTENSION}`
    }

    /**
     * 取得獎勵項目字符串
     * @param prize 獎勵物件
     * @param mode 顯示模式
     */
    public GetPrizeItemString(
        prize: Prize,
        mode: SHOW_PRIZE_STRING_MODE = SHOW_PRIZE_STRING_MODE.MODE_OUTSIDE_VIEW
    ): string {
        let setting: { maxCount?: bigint } = {}
        if (mode == SHOW_PRIZE_STRING_MODE.MODE_OUTSIDE_VIEW) {
            setting = { maxCount: 6n }
        }
        return this.GetPrizeItemStringWithSettings(prize, mode, setting)
    }

    /**
     * 判斷是否使用特殊時間單位
     * @param unit 單位類型
     */
    private UsePrizeTimeUnit(unit: number): boolean {
        return unit === PRIZE_UNIT_TYPE.PRIZE_UNIT_HOURS ||
            unit === PRIZE_UNIT_TYPE.PRIZE_UNIT_DAY
    }

    /**
     * 取得數量單位字符串
     * @param profile 獎勵數據設置
     * @param amount 數量
     */
    private GetAmountUnitString(profile: PrizeDataSettings, amount: number): string {
        let res = ""
        switch (profile.Unit) {
            case PRIZE_UNIT_TYPE.PRIZE_UNIT_HOURS: {
                let hours = Math.max(1, Math.floor(amount))
                res = `${hours} 小時`
                break
            }
            case PRIZE_UNIT_TYPE.PRIZE_UNIT_DAY: {
                let days = Math.max(1, Math.floor(amount))
                res = `${days} 天`
                break
            }
        }
        return res
    }

    /**
     * 取得獎勵項目字符串（帶設置）
     * @param prize 獎勵物件
     * @param mode 顯示模式
     * @param settings 設置
     */
    public GetPrizeItemStringWithSettings(
        prize: Prize,
        mode: SHOW_PRIZE_STRING_MODE,
        settings: { maxCount?: bigint }
    ): string {
        let profile: PrizeDataSettings = this.RetrievePrizeDataSettings(prize)
        let res = ""
        let amountNum: number = typeof prize.amount === 'bigint' ? Number(prize.amount) : Number(prize.amount)

        if (isValid(profile)) {
            if (mode == SHOW_PRIZE_STRING_MODE.MODE_OUTSIDE_VIEW) {
                res = this.FormatNumber(amountNum, settings.maxCount)
                if (this.UsePrizeTimeUnit(profile.Unit)) {
                    res = this.GetAmountUnitString(profile, amountNum)
                }
            } else if (mode == SHOW_PRIZE_STRING_MODE.MODE_TIP) {
                res = "x " + this.FormatNumber(amountNum, 6n)
                if (this.UsePrizeTimeUnit(profile.Unit)) {
                    res = this.GetAmountUnitString(profile, amountNum)
                }
            } else if (mode == SHOW_PRIZE_STRING_MODE.MODE_ONE_LINE_WITH_PRIZE_NAME) {
                let itemName = profile.Name.replace("\n", " ")
                res = itemName + " x " + this.FormatNumber(amountNum, 6n)
                if (this.UsePrizeTimeUnit(profile.Unit)) {
                    res = itemName + " - " + this.GetAmountUnitString(profile, amountNum)
                }
            } else if (mode == SHOW_PRIZE_STRING_MODE.MODE_TIP_WITH_MAX_COUNT) {
                res = "x " + this.FormatNumber(amountNum, settings.maxCount)
                if (this.UsePrizeTimeUnit(profile.Unit)) {
                    res = this.GetAmountUnitString(profile, amountNum)
                }
            }
        }
        return res
    }

    /**
     * 格式化數字
     * @param num 數字
     * @param maxCount 最大顯示位數
     */
    private FormatNumber(num: number, maxCount?: bigint): string {
        // 簡單的數字格式化，可以根據需要擴展
        let maxCountNum = maxCount ? Number(maxCount) : undefined
        if (maxCountNum && num.toString().length > maxCountNum) {
            return num.toExponential(2)
        }
        return num.toString()
    }

    /**
     * 取得圖標首個數據
     * @param prize 獎勵物件
     */
    public GetIconFirstData(prize: Prize): string {
        let profile: PrizeDataSettings = this.RetrievePrizeDataSettings(prize)
        if (profile.Icon.indexOf("_") > 0) {
            let firstData = profile.Icon.split("_")[0]
            return firstData
        }
        return profile.Icon
    }

    /**
     * 將伺服器縮寫轉換成客戶端使用的名稱
     * @param abbr 伺服器縮寫數據
     */
    private ConvertServerAbbrToClient(abbr: any): PrizeDataSettings {
        return {
            Description: abbr?.["d"] ?? "",
            Name: abbr?.["n"] ?? "",
            MaxCount: typeof abbr?.["mc"] === 'number' ? BigInt(abbr["mc"]) : (abbr?.["mc"] ?? 0n),
            Star: abbr?.["s"] ?? 0,
            IsSendable: abbr?.["is"] ?? false,
            Icon: abbr?.["i"] ?? "",
            Unit: abbr?.["u"] ?? 0,
        }
    }

    /**
     * 清除獎勵數據緩存
     */
    public ClearCache(): void {
        this.prizeDataSettingsCache.clear()
    }
}

