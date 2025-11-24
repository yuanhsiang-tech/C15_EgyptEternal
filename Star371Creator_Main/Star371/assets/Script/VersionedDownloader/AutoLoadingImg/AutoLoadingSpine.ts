import { _decorator, Component, sp, isValid, Sprite, SpriteFrame } from "cc"
import { VersionedSingleFileDownloader } from "../VersionedSingleFileDownloader"
import { VersionedDownloadCategory } from "../VersionedDownloaderDefine"
import { DownloadResult, StorageOption } from "../../../Stark/ResourceDownloader/ResourceDownloaderDefine"
import { IAutoLoadingData, AutoLoadingHelper } from "./AutoLoadingDefine"

const { ccclass, property, menu, requireComponent } = _decorator

/**
 * 自動加載 Spine 動畫組件
 * 用於動態下載並顯示 Spine 動畫
 * Spine 未準備好時使用 SpriteFrame 顯示靜態圖片
 */
@ccclass("AutoLoadingSpine")
@menu("AutoLoadingImg/AutoLoadingSpine")
@requireComponent(sp.Skeleton)
export class AutoLoadingSpine extends Component {

    //================================================================
    // 属性
    //================================================================

    @property({
        displayName: "自动加载",
        tooltip: "是否在 onLoad 時自动加载 Spine"
    })
    protected m_autoLoad: boolean = true

    @property({
        displayName: "使用預設图片",
        tooltip: "是否使用預設图片顯示（未打勾则使用加载中图片）"
    })
    protected m_useDefaultImg: boolean = false

    @property({
        displayName: "預設图片",
        tooltip: "預設顯示的图片",
        type: SpriteFrame,
        visible: function (this: AutoLoadingSpine) {
            return this.m_useDefaultImg
        }
    })
    protected m_defaultImg: SpriteFrame = null

    @property({
        displayName: "加载中图片",
        tooltip: "加载過程中顯示的图片",
        type: SpriteFrame,
        visible: function (this: AutoLoadingSpine) {
            return !this.m_useDefaultImg
        }
    })
    protected m_loadingImg: SpriteFrame = null

    @property({
        displayName: "加载失败图片",
        tooltip: "加载失败時顯示的图片",
        type: SpriteFrame
    })
    protected m_errorImg: SpriteFrame = null

    //================================================================
    // 内部变量
    //================================================================

    private m_loadingData: IAutoLoadingData = {
        category: VersionedDownloadCategory.DEFAULT,
        directory: "",
        filename: ""
    }
    private m_skeleton: sp.Skeleton = null
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

    /** 取得 Skeleton 组件 */
    public get SkeletonComponent(): sp.Skeleton {
        return this.m_skeleton
    }

    //================================================================
    // 生命周期
    //================================================================

    public onLoad(): void {
        super.onLoad?.()
        this.m_skeleton = this.getComponent(sp.Skeleton)
        this.m_versionedDownloader = VersionedSingleFileDownloader.GetInstance()

        if (!isValid(this.m_skeleton, true)) {
            console.error("[AutoLoadingSpine] 未找到 Skeleton 组件")
            return
        }

        // 查找或创建 Sprite 组件用于顯示静态图片
        this.m_sprite = this.getComponent(Sprite)
        if (!this.m_sprite) {
            this.m_sprite = this.addComponent(Sprite)
        }

        // 初始状态：隐藏 Skeleton，顯示 Sprite
        this.m_skeleton.enabled = false
        this.m_sprite.enabled = true

        // 根据 useDefaultImg 决定顯示預設图片还是加载中图片
        if (this.m_useDefaultImg && this.m_defaultImg) {
            this.m_sprite.spriteFrame = this.m_defaultImg
        } else if (this.m_loadingImg) {
            this.m_sprite.spriteFrame = this.m_loadingImg
        }

        // 如果设置了自动加载且有文件名，则自动加载
        if (this.m_autoLoad && this.m_loadingData.filename) {
            this.LoadSpine()
        }
    }

    public onEnable(): void {
        super.onEnable?.()
        // 如果之前加载失败或未加载，重新尝试加载
        if (this.m_autoLoad && this.m_loadingData.filename && !this.m_isLoaded && !this.m_isLoading) {
            this.LoadSpine()
        }
    }

    //================================================================
    // 公共方法
    //================================================================

    /**
     * 设置 Spine 數据
     * @param data 自動加載資料
     */
    public SetSpineData(data: IAutoLoadingData): void {
        if (!AutoLoadingHelper.ValidateData(data)) {
            console.error("[AutoLoadingSpine] 無效的加載資料")
            return
        }
        this.m_loadingData = AutoLoadingHelper.CloneData(data)
        this.m_isLoaded = false
        this.LoadSpine()
    }

    /**
     * 加载 Spine 动画
     */
    public LoadSpine(): void {
        if (!isValid(this.m_skeleton, true)) {
            console.error("[AutoLoadingSpine] Skeleton 组件无效")
            return
        }

        if (!this.m_loadingData.filename) {
            console.warn("[AutoLoadingSpine] 文件名為空，无法加载 Spine")
            return
        }

        if (this.m_isLoading) {
            console.log("[AutoLoadingSpine] 正在加载中，跳過重复加载")
            return
        }

        // 顯示加载中图片
        if (!this.m_useDefaultImg && this.m_loadingImg && this.m_sprite) {
            this.m_sprite.spriteFrame = this.m_loadingImg
            this.m_sprite.enabled = true
            this.m_skeleton.enabled = false
        }

        this.m_isLoading = true

        // 构建文件路径（Spine 通常需要 .json 和 .atlas 文件）
        const filePath = AutoLoadingHelper.BuildFilePath(this.m_loadingData)
        const baseURL = this._getBaseURL()

        console.log(`🔽 [AutoLoadingSpine] 开始加载 Spine: ${filePath}`)

        // 下载 Spine 數据文件
        this.m_versionedDownloader.DownloadFileWithVersionCheck(
            baseURL,
            `${filePath}.json`,
            {
                category: this.m_loadingData.category,
                storageOption: StorageOption.FILE_ONLY,
                onSuccess: (result: DownloadResult, wasUpdated: boolean) => {
                    // Spine 加载需要更複雜的處理，這裡先提供基本框架
                    // 實際使用時需要處理 .json, .atlas, .png 等文件
                    this.m_isLoading = false
                    
                    // TODO: 實現 Spine 資源的完整加載邏輯
                    // 1. 加載 .json 文件
                    // 2. 加載 .atlas 文件
                    // 3. 加載紋理圖片
                    // 4. 創建 SkeletonData
                    // 5. 設置給 skeleton.skeletonData
                    // 6. 隱藏 Sprite，顯示 Skeleton
                    
                    console.log(`✅ [AutoLoadingSpine] Spine 數据下载成功: ${filePath}`)
                    this.m_isLoaded = true
                    
                    // 臨時處理：顯示錯誤提示
                    console.warn("[AutoLoadingSpine] Spine 完整加載邏輯待實現")
                    
                    // 當 Spine 加載成功後：
                    // this.m_sprite.enabled = false
                    // this.m_skeleton.enabled = true
                },
                onError: (error) => {
                    this.m_isLoading = false
                    // 加载失败，顯示错误图片
                    if (this.m_errorImg && this.m_sprite) {
                        this.m_sprite.spriteFrame = this.m_errorImg
                        this.m_sprite.enabled = true
                        this.m_skeleton.enabled = false
                    }
                    console.error(`❌ [AutoLoadingSpine] Spine 下载失败: ${filePath} - ${error.message}`)
                }
            }
        )
    }

    /**
     * 清除 Spine
     */
    public Clear(): void {
        if (isValid(this.m_skeleton, true)) {
            this.m_skeleton.skeletonData = null
            this.m_skeleton.enabled = false
        }
        
        if (isValid(this.m_sprite, true)) {
            if (this.m_useDefaultImg && this.m_defaultImg) {
                this.m_sprite.spriteFrame = this.m_defaultImg
            } else {
                this.m_sprite.spriteFrame = null
            }
            this.m_sprite.enabled = true
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
     * 重新加载 Spine
     */
    public Reload(): void {
        this.m_isLoaded = false
        this.LoadSpine()
    }

    /**
     * 设置 SkeletonData
     * @param skeletonData SkeletonData 目標
     */
    public SetSkeletonData(skeletonData: sp.SkeletonData): void {
        if (isValid(this.m_skeleton, true)) {
            this.m_skeleton.skeletonData = skeletonData
            if (skeletonData) {
                // 有 Spine 數据時，隐藏 Sprite，顯示 Skeleton
                this.m_skeleton.enabled = true
                if (this.m_sprite) {
                    this.m_sprite.enabled = false
                }
            }
        }
    }

    /**
     * 取得目前 SkeletonData
     */
    public GetSkeletonData(): sp.SkeletonData | null {
        return this.m_skeleton?.skeletonData ?? null
    }

    /**
     * 设置 SpriteFrame（用于顯示静态图片）
     * @param spriteFrame SpriteFrame 目標
     */
    public SetSpriteFrame(spriteFrame: SpriteFrame): void {
        if (isValid(this.m_sprite, true)) {
            this.m_sprite.spriteFrame = spriteFrame
            this.m_sprite.enabled = true
            if (this.m_skeleton) {
                this.m_skeleton.enabled = false
            }
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
     * 取得基础 URL（可以根据实际需求修改）
     */
    private _getBaseURL(): string {
        // TODO: 根据实际需求配置基础 URL
        return "https://igs.com.tw/"
    }
}

