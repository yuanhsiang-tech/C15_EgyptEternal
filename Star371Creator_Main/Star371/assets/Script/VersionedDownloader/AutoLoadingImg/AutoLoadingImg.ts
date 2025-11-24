import { _decorator, Component, Sprite, SpriteFrame, isValid, Texture2D, js } from "cc"
import { VersionedSingleFileDownloader } from "../VersionedSingleFileDownloader"
import { VersionedDownloadCategory } from "../VersionedDownloaderDefine"
import { DownloadResult, StorageOption } from "../../../Stark/ResourceDownloader/ResourceDownloaderDefine"
import { Resource } from "../../Define/ResourceDefine"
import { Bundle } from "../../Bundle/Bundle"
import { IAutoLoadingData, AutoLoadingHelper } from "./AutoLoadingDefine"

const { ccclass, property, menu, requireComponent } = _decorator

/**
 * 自動加載圖片組件
 * 用於動態下載並顯示圖片
 */
@ccclass("AutoLoadingImg")
@menu("AutoLoadingImg/AutoLoadingImg")
@requireComponent(Sprite)
export class AutoLoadingImg extends Component {

    //================================================================
    // 属性
    //================================================================

    @property({
        displayName: "自动加载",
        tooltip: "是否在 onLoad 時自动加载图片"
    })
    protected m_autoLoad: boolean = true

    @property({
        displayName: "預設图片",
        tooltip: "預設顯示的图片"
    })
    protected m_defaultSprite: SpriteFrame = null

    @property({
        displayName: "加载中图片",
        tooltip: "加载過程中顯示的临時图片"
    })
    protected m_loadingSprite: SpriteFrame = null

    @property({
        displayName: "加载失败图片",
        tooltip: "加载失败時顯示的图片"
    })
    protected m_errorSprite: SpriteFrame = null

    //================================================================
    // 内部变量
    //================================================================

    private m_loadingData: IAutoLoadingData = {
        category: VersionedDownloadCategory.DEFAULT,
        directory: "",
        filename: ""
    }
    private m_sprite: Sprite = null
    private m_versionedDownloader: VersionedSingleFileDownloader = null
    private m_isLoading: boolean = false
    private m_isLoaded: boolean = false

    //================================================================
    // 属性访问器
    //================================================================

    /** 下载分类 */
    public get Category(): VersionedDownloadCategory {
        return this.m_loadingData.category
    }
    public set Category(value: VersionedDownloadCategory) {
        if (this.m_loadingData.category !== value) {
            this.m_loadingData.category = value
        }
    }

    /** 目录路径 */
    public get Directory(): string {
        return this.m_loadingData.directory
    }
    public set Directory(value: string) {
        if (this.m_loadingData.directory !== value) {
            this.m_loadingData.directory = value
        }
    }

    /** 文件名 */
    public get Filename(): string {
        return this.m_loadingData.filename
    }
    public set Filename(value: string) {
        if (this.m_loadingData.filename !== value) {
            this.m_loadingData.filename = value
        }
    }

    /** 取得加載資料 */
    public get LoadingData(): IAutoLoadingData {
        return AutoLoadingHelper.CloneData(this.m_loadingData)
    }

    /** 是否正在加载 */
    public get IsLoading(): boolean {
        return this.m_isLoading
    }

    /** 是否已加载 */
    public get IsLoaded(): boolean {
        return this.m_isLoaded
    }

    /** 取得 Sprite 组件 */
    public get SpriteComponent(): Sprite {
        return this.m_sprite
    }

    //================================================================
    // 生命周期
    //================================================================

    public onLoad(): void {
        super.onLoad?.()
        this.m_sprite = this.getComponent(Sprite)
        this.m_versionedDownloader = VersionedSingleFileDownloader.GetInstance()

        if (!isValid(this.m_sprite, true)) {
            console.error("[AutoLoadingImg] 未找到 Sprite 组件")
            return
        }

        // 顯示預設图片
        if (this.m_defaultSprite) {
            this.m_sprite.spriteFrame = this.m_defaultSprite
        }

        // 如果设置了自动加载且有文件名，则自动加载
        if (this.m_autoLoad && this.m_loadingData.filename) {
            this.LoadImage()
        }
    }

    public onEnable(): void {
        super.onEnable?.()
        // 如果之前加载失败或未加载，重新尝试加载
        if (this.m_autoLoad && this.m_loadingData.filename && !this.m_isLoaded && !this.m_isLoading) {
            this.LoadImage()
        }
    }

    //================================================================
    // 公共方法
    //================================================================

    /**
     * 设置图片數据
     * @param data 自動加載資料
     */
    public SetImageData(data: IAutoLoadingData): void {
        // 先這樣快速 debug
        this.SetLocalImage()
        return
        if (!AutoLoadingHelper.ValidateData(data)) {
            console.error("[AutoLoadingImg] 無效的加載資料")
            return
        }
        this.m_loadingData = AutoLoadingHelper.CloneData(data)
        this.m_isLoaded = false
        this.LoadImage()
    }

    /**
     * 加载图片
     */
    public LoadImage(): void {
        if (!isValid(this.m_sprite, true)) {
            console.error("[AutoLoadingImg] Sprite 组件无效")
            return
        }

        if (!this.m_loadingData.filename) {
            console.warn("[AutoLoadingImg] 文件名為空，无法加载图片")
            return
        }

        if (this.m_isLoading) {
            console.log("[AutoLoadingImg] 正在加载中，跳過重复加载")
            return
        }

        // 顯示加载中图片
        if (this.m_loadingSprite) {
            this.m_sprite.spriteFrame = this.m_loadingSprite
        }

        this.m_isLoading = true

        // 构建文件路径
        const filePath = AutoLoadingHelper.BuildFilePath(this.m_loadingData)
        const baseURL = this._getBaseURL()

        console.log(`🔽 [AutoLoadingImg] 开始加载图片: ${filePath}`)

        // 下载图片
        this.m_versionedDownloader.DownloadFileWithVersionCheck(
            baseURL,
            filePath,
            {
                category: this.m_loadingData.category,
                storageOption: StorageOption.FILE_ONLY,
                onSuccess: (result: DownloadResult, wasUpdated: boolean) => {
                    this.m_isLoading = false

                    // 优先使用 spriteFrame（直接可用，避免手动创建）
                    if (result.spriteFrame) {
                        this.m_sprite.spriteFrame = result.spriteFrame
                        this.m_isLoaded = true
                        console.log(`✅ [AutoLoadingImg] 图片加载成功: ${filePath}`)
                    } else if (result.texture) {
                        // 如果只有 texture，创建 SpriteFrame
                        const spriteFrame = new SpriteFrame()
                        spriteFrame.texture = result.texture
                        this.m_sprite.spriteFrame = spriteFrame
                        this.m_isLoaded = true
                        console.log(`✅ [AutoLoadingImg] 图片加载成功 (从 Texture): ${filePath}`)
                    } else if (result.imageAsset) {
                        // 如果只有 imageAsset，创建 Texture2D 和 SpriteFrame
                        const texture = new Texture2D()
                        texture.image = result.imageAsset
                        const spriteFrame = new SpriteFrame()
                        spriteFrame.texture = texture
                        this.m_sprite.spriteFrame = spriteFrame
                        this.m_isLoaded = true
                        console.log(`✅ [AutoLoadingImg] 图片加载成功 (从 ImageAsset): ${filePath}`)
                    } else {
                        // 加载失败，顯示错误图片
                        if (this.m_errorSprite) {
                            this.m_sprite.spriteFrame = this.m_errorSprite
                        }
                        console.error(`❌ [AutoLoadingImg] 图片加载失败: ${filePath} - 未找到图片资源`)
                    }
                },
                onError: (error) => {
                    this.m_isLoading = false
                    // 加载失败，顯示错误图片
                    if (this.m_errorSprite) {
                        this.m_sprite.spriteFrame = this.m_errorSprite
                    }
                    console.error(`❌ [AutoLoadingImg] 图片下载失败: ${filePath} - ${error.message}`)
                }
            }
        )
    }

    /**
     * 設置本地圖片
     * @param fileName 本地圖片文件名
     */
    public SetLocalImage(fileName: string = js.formatStr(Resource.Img.Deposit.DIAMOND, "03")): void {
        if (!isValid(this.m_sprite, true)) {
            console.error("[AutoLoadingImg] Sprite 組件無效")
            return
        }

        if (!fileName || fileName === "") {
            console.warn("[AutoLoadingImg] 文件名為空，無法加載本地圖片")
            return
        }

        if (this.m_isLoading) {
            console.log("[AutoLoadingImg] 正在加載中，跳過重複加載")
            return
        }

        // 顯示加載中圖片
        if (this.m_loadingSprite) {
            this.m_sprite.spriteFrame = this.m_loadingSprite
        }

        this.m_isLoading = true
        console.log(`🔽 [AutoLoadingImg] 開始加載本地圖片: ${fileName}`)

        // 使用 Bundle.Resources.Load 加載本地圖片
        Bundle.Resources.Load(fileName, SpriteFrame, this._onLoadLocalSprite.bind(this, fileName))
    }

    /**
     * 清除图片
     */
    public Clear(): void {
        if (isValid(this.m_sprite, true)) {
            this.m_sprite.spriteFrame = this.m_defaultSprite
        }
        this.m_loadingData = {
            category: VersionedDownloadCategory.DEFAULT,
            directory: "",
            filename: ""
        }
        this.m_isLoaded = false
        this.m_isLoading = false
    }

    /**
     * 重新加载图片
     */
    public Reload(): void {
        this.m_isLoaded = false
        this.LoadImage()
    }

    /**
     * 设置 SpriteFrame
     * @param spriteFrame SpriteFrame 目標
     */
    public SetSpriteFrame(spriteFrame: SpriteFrame): void {
        if (isValid(this.m_sprite, true)) {
            this.m_sprite.spriteFrame = spriteFrame
        }
    }

    /**
     * 取得目前 SpriteFrame
     */
    public GetSpriteFrame(): SpriteFrame | null {
        return this.m_sprite?.spriteFrame ?? null
    }

    //================================================================
    // 私有方法
    //================================================================

    /**
     * 本地圖片加載回調
     * @param fileName 文件名
     * @param err 錯誤信息
     * @param spriteFrame 加載的 SpriteFrame
     */
    private _onLoadLocalSprite(fileName: string, err?: Error, spriteFrame?: SpriteFrame): void {
        this.m_isLoading = false

        if (err) {
            console.error(`❌ [AutoLoadingImg] 載入本地圖片失敗: ${fileName}, 錯誤: ${err.message}`)
            // 加載失敗，顯示錯誤圖片
            if (this.m_errorSprite) {
                this.m_sprite.spriteFrame = this.m_errorSprite
            }
            return
        }

        if (isValid(this.m_sprite, true) && spriteFrame) {
            this.m_sprite.spriteFrame = spriteFrame
            this.m_isLoaded = true
            console.log(`✅ [AutoLoadingImg] 本地圖片加載成功: ${fileName}`)
        } else {
            console.error(`❌ [AutoLoadingImg] 本地圖片加載失敗: ${fileName} - Sprite 組件無效或 SpriteFrame 為空`)
            // 加載失敗，顯示錯誤圖片
            if (this.m_errorSprite) {
                this.m_sprite.spriteFrame = this.m_errorSprite
            }
        }
    }


    /**
     * 取得基础 URL（可以根据实际需求修改）
     */
    private _getBaseURL(): string {
        // TODO: 根据实际需求配置基础 URL
        return "https://igs.com.tw/"
    }
}

