import { _decorator, Component, isValid } from "cc"
import { Prize } from "../Proto/gt2/prize/prize_pb"
import { VersionedDownloadCategory } from "../VersionedDownloader/VersionedDownloaderDefine"
import { AutoLoadingImg } from "../VersionedDownloader/AutoLoadingImg/AutoLoadingImg"
import { IAutoLoadingData, AutoLoadingHelper } from "../VersionedDownloader/AutoLoadingImg/AutoLoadingDefine"

const { ccclass, menu, requireComponent } = _decorator

@ccclass("PrizeItem")
@menu("Prize/PrizeItem")
@requireComponent(AutoLoadingImg)
export class PrizeItem extends Component {

    //================================================================
    // 內部變數
    //================================================================

    private m_prize: Prize = null
    private m_category: VersionedDownloadCategory = VersionedDownloadCategory.DEFAULT
    private m_autoLoadingImg: AutoLoadingImg = null

    //================================================================
    // 屬性訪問器
    //================================================================

    /** 取得獎勵數據 */
    public get Prize(): Prize {
        return this.m_prize
    }

    /** 下載分類 */
    public get Category(): VersionedDownloadCategory {
        return this.m_category
    }
    public set Category(value: VersionedDownloadCategory) {
        if (this.m_category !== value) {
            this.m_category = value
        }
    }

    /** 是否正在載入 */
    public get IsLoading(): boolean {
        return this.m_autoLoadingImg?.IsLoading ?? false
    }

    /** 是否已載入 */
    public get IsLoaded(): boolean {
        return this.m_autoLoadingImg?.IsLoaded ?? false
    }

    /** 取得 AutoLoadingImg 組件 */
    public get AutoLoadingImgComponent(): AutoLoadingImg {
        return this.m_autoLoadingImg
    }

    //================================================================
    // 生命週期
    //================================================================

    public onLoad(): void {
        super.onLoad?.()
        this.m_autoLoadingImg = this.getComponent(AutoLoadingImg)

        if (!isValid(this.m_autoLoadingImg, true)) {
            console.error("[PrizeItem] 未找到 AutoLoadingImg 組件")
            return
        }
    }

    //================================================================
    // 公共方法
    //================================================================

    /**
     * 設置獎勵數據
     * @param prize 獎勵數據
     */
    public SetPrize(prize: Prize): void {
        this.m_prize = prize
        this.LoadPrizeImage()
    }

    /**
     * 設置獎勵數據（帶分類）
     * @param prize 獎勵數據
     * @param category 下載分類
     */
    public SetPrizeWithCategory(prize: Prize, category: VersionedDownloadCategory = VersionedDownloadCategory.DEFAULT): void {
        this.m_prize = prize
        this.m_category = category
        this.LoadPrizeImage()
    }

    /**
     * 載入獎勵圖片
     */
    public LoadPrizeImage(): void {
        if (!isValid(this.m_autoLoadingImg, true)) {
            console.error("[PrizeItem] AutoLoadingImg 組件無效")
            return
        }

        if (!this.m_prize) {
            console.warn("[PrizeItem] 獎勵數據為空，無法載入圖片")
            return
        }

        // 根據 category 構建路徑
        const loadingData = this._buildPathFromCategory(
            this.m_category,
            this.m_prize.code,
            this.m_prize.extraNo
        )

        // 使用 AutoLoadingImg 加载图片
        this.m_autoLoadingImg.SetImageData(loadingData)
    }

    /**
     * 根據 category 構建路徑
     * @param category 下載分類
     * @param itemIndex 獎勵索引
     * @param extraNo 額外編號
     */
    private _buildPathFromCategory(
        category: VersionedDownloadCategory,
        itemIndex: string,
        extraNo: number
    ): IAutoLoadingData {
        let directory = ""
        let filename = `${itemIndex}_${extraNo}.png`

        // 根據不同的 category 設置不同的目錄結構
        switch (category) {
            case VersionedDownloadCategory.SHINYCARD:
                directory = "ShinyCard"
                break

            case VersionedDownloadCategory.PROFILE_PIC:
                directory = "ProfilePic"
                break

            case VersionedDownloadCategory.UNION_PIC:
                directory = "UnionPic"
                break

            case VersionedDownloadCategory.WORDCOLLECTION:
                directory = "WordCollection"
                break

            case VersionedDownloadCategory.NEWSAD:
                directory = "NewsAd"
                break

            case VersionedDownloadCategory.SCRATCHTICKET:
                directory = "ScratchTicket"
                break

            case VersionedDownloadCategory.STARROLE:
                directory = "StarRole"
                break

            case VersionedDownloadCategory.DEFAULT:
            default:
                directory = "Prize"
                break
        }

        return AutoLoadingHelper.CreateData(filename, category, directory)
    }

    /**
     * 清除圖片
     */
    public Clear(): void {
        if (isValid(this.m_autoLoadingImg, true)) {
            this.m_autoLoadingImg.Clear()
        }
        this.m_prize = null
    }

    /**
     * 重新載入圖片
     */
    public Reload(): void {
        if (isValid(this.m_autoLoadingImg, true)) {
            this.m_autoLoadingImg.Reload()
        }
    }
}

