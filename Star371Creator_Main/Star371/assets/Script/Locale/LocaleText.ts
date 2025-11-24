import { error, JsonAsset, warn } from "cc"
import { LocaleDefine } from "./LocaleDefine"
import { Bundle } from "../Bundle/Bundle"
import { LocaleVar } from "./LocaleVar"

/**
 * LoadJson 回呼函式
 */
type LoadJsonCallback = (success?: boolean) => void

/**
 * LocaleText 命名空間
 * 提供多語系文字載入與取得功能
 */
export namespace LocaleText {
    /** 檢查指定 Bundle 和分類的 JSON 是否已載入 */
    export function IsJsonLoaded(bundleName: string, category?: string): boolean {
        return TextResourceManager.QueryLoadStatus(bundleName, category)
    }

    /** 載入指定 Bundle 的 JSON 文字檔案 */
    export function LoadJson(bundleName: string, category?: string, callback?: LoadJsonCallback): void {
        TextResourceManager.RequestLoad(bundleName, category, callback)
    }

    /** 清除指定 Bundle 的所有快取 */
    export function PurgeCache(bundleName: string): void {
        TextResourceManager.ClearBundleCache(bundleName)
    }

    /** 取得文字 */
    export function GetString(key: string, bundleName?: string, category?: string, defaultString?: string): string {
        return TextResourceManager.FetchText(key, bundleName, category, defaultString)
    }
}

//================================================================
// 資源描述符
//================================================================

/**
 * 文字資源描述符
 */
class TextResourceDescriptor {
    public readonly bundle: string
    public readonly category: string
    public readonly language: string
    public readonly identifier: string
    public readonly resourcePath: string

    private m_textData: Record<string, string> = null
    private m_loadState: "idle" | "loading" | "loaded" | "failed" = "idle"
    private m_pendingCallbacks: LoadJsonCallback[] = []

    constructor(bundle: string, category: string, language: string, identifier: string, resourcePath: string) {
        this.bundle = bundle
        this.category = category
        this.language = language
        this.identifier = identifier
        this.resourcePath = resourcePath
    }

    public IsLoaded(): boolean {
        return this.m_loadState === "loaded"
    }

    public IsLoading(): boolean {
        return this.m_loadState === "loading"
    }

    public MarkAsLoading(): void {
        this.m_loadState = "loading"
    }

    public CompleteLoad(success: boolean, data?: Record<string, string>): void {
        this.m_loadState = success ? "loaded" : "failed"

        if (success && data) {
            this.m_textData = data
        }

        // 執行所有等待的回調
        const callbacks: LoadJsonCallback[] = this.m_pendingCallbacks.slice()
        this.m_pendingCallbacks.length = 0

        for (let i: number = 0; i < callbacks.length; i++) {
            const cb: LoadJsonCallback = callbacks[i]
            if (typeof cb === "function") {
                cb(success)
            }
        }
    }

    public AddCallback(callback: LoadJsonCallback): void {
        if (callback) {
            this.m_pendingCallbacks.push(callback)
        }
    }

    public LookupText(key: string): string | undefined {
        return this.m_textData?.[key]
    }

    public Clear(): void {
        this.m_textData = null
        this.m_loadState = "idle"
        this.m_pendingCallbacks.length = 0
    }
}

//================================================================
// 文字資源管理器
//================================================================

/**
 * 文字資源管理器 - 單例模式但使用不同的組織方式
 */
class TextResourceManager {
    private static s_cache: Map<string, TextResourceDescriptor> = new Map()
    private static s_bundleIndex: Map<string, string[]> = new Map()

    /**
     * 生成識別符
     */
    private static _generateIdentifier(bundleName: string, category: string, language: string): string {
        return [bundleName, category, language].join(LocaleDefine.CacheConfig.ID_DELIMITER)
    }

    /**
     * 建立資源路徑
     */
    private static _buildResourcePath(language: string, category: string): string {
        const segments: string[] = [LocaleDefine.TextResource.ROOT_FOLDER, language, category]
        return segments.join(LocaleDefine.PathConfig.SEGMENT_DELIMITER)
    }

    /**
     * 獲取或創建資源描述符
     */
    private static _obtainDescriptor(bundleName: string, category: string, language: string): TextResourceDescriptor {
        const id: string = this._generateIdentifier(bundleName, category, language)

        if (!this.s_cache.has(id)) {
            const resourcePath: string = this._buildResourcePath(language, category)
            const newDesc: TextResourceDescriptor = new TextResourceDescriptor(bundleName, category, language, id, resourcePath)
            this.s_cache.set(id, newDesc)
            this._indexBundle(bundleName, id)
        }

        return this.s_cache.get(id)
    }

    /**
     * 建立 Bundle 索引
     */
    private static _indexBundle(bundleName: string, descriptorId: string): void {
        if (!this.s_bundleIndex.has(bundleName)) {
            this.s_bundleIndex.set(bundleName, [])
        }

        const idList: string[] = this.s_bundleIndex.get(bundleName)
        if (idList.indexOf(descriptorId) === -1) {
            idList.push(descriptorId)
        }
    }

    /**
     * 解析分類名稱
     */
    private static _resolveCategory(category?: string): string {
        return (category && category.length > 0)
            ? category
            : LocaleDefine.TextResource.FALLBACK_CATEGORY
    }

    /**
     * 驗證 Bundle 名稱
     */
    private static _validateBundleName(bundleName: string): boolean {
        return typeof bundleName === "string" && bundleName.length > 0
    }

    /**
     * 查詢載入狀態
     */
    public static QueryLoadStatus(bundleName: string, category?: string): boolean {
        if (!this._validateBundleName(bundleName)) {
            return false
        }

        const cat: string = this._resolveCategory(category)
        const lang: string = LocaleVar.GetResLang()
        const desc: TextResourceDescriptor = this._obtainDescriptor(bundleName, cat, lang)

        return desc.IsLoaded()
    }

    /**
     * 請求載入資源
     */
    public static RequestLoad(bundleName: string, category?: string, callback?: LoadJsonCallback): void {
        // 驗證參數
        if (!this._validateBundleName(bundleName)) {
            warn(`[LocaleText] Invalid bundle name provided:`, bundleName)
            callback?.(false)
            return
        }

        const cat: string = this._resolveCategory(category)
        const lang: string = LocaleVar.GetResLang()
        const desc: TextResourceDescriptor = this._obtainDescriptor(bundleName, cat, lang)

        // 已載入完成
        if (desc.IsLoaded()) {
            callback?.(true)
            return
        }

        // 加入回調佇列
        desc.AddCallback(callback)

        // 正在載入中
        if (desc.IsLoading()) {
            return
        }

        // 開始載入
        this._executeLoad(desc)
    }

    /**
     * 執行載入流程
     */
    private static _executeLoad(descriptor: TextResourceDescriptor): void {
        descriptor.MarkAsLoading()

        const bundleName: string = descriptor.bundle
        const resourcePath: string = descriptor.resourcePath

        // 分階段載入：先載入 Bundle，再載入資源
        Bundle.Load(bundleName, (bundleErr: Error | null, bundle: Bundle) => {
            if (bundleErr || !bundle) {
                error(`[LocaleText] Bundle loading error (${bundleName}):`, bundleErr?.message || bundleErr)
                descriptor.CompleteLoad(false)
                return
            }

            // 載入 JSON 資源
            bundle.Load(resourcePath, JsonAsset, (assetErr: Error | null, asset: JsonAsset) => {
                if (assetErr || !asset) {
                    error(`[LocaleText] Asset loading error (${bundleName}/${resourcePath}):`, assetErr?.message || assetErr)
                    descriptor.CompleteLoad(false)
                    return
                }

                // 解析 JSON 數據
                const jsonData: any = asset.json
                const textData: Record<string, string> = {}

                // 提取所有文字項目
                const keys: string[] = Object.keys(jsonData)
                for (let i: number = 0; i < keys.length; i++) {
                    const k: string = keys[i]
                    textData[k] = jsonData[k]
                }

                descriptor.CompleteLoad(true, textData)
            })
        })
    }

    /**
     * 清除 Bundle 快取
     */
    public static ClearBundleCache(bundleName: string): void {
        if (!this._validateBundleName(bundleName)) {
            warn(`[LocaleText] Cannot clear cache for invalid bundle:`, bundleName)
            return
        }

        const idList: string[] = this.s_bundleIndex.get(bundleName)
        if (!idList || idList.length === 0) {
            return
        }

        // 清除所有相關的描述符
        for (let i: number = 0; i < idList.length; i++) {
            const id: string = idList[i]
            const desc: TextResourceDescriptor = this.s_cache.get(id)

            if (desc) {
                desc.Clear()
                this.s_cache.delete(id)
            }
        }

        // 清除索引
        this.s_bundleIndex.delete(bundleName)
    }

    /**
     * 取得文字內容
     */
    public static FetchText(key: string, bundleName?: string, category?: string, fallback?: string): string {
        let foundText: string | undefined = undefined

        // 優先從指定的 Bundle 和分類中查找
        if (this._validateBundleName(bundleName)) {
            const cat: string = this._resolveCategory(category)
            const lang: string = LocaleVar.GetResLang()
            const desc: TextResourceDescriptor = this._obtainDescriptor(bundleName, cat, lang)

            if (desc.IsLoaded()) {
                foundText = desc.LookupText(key)
            }
        }

        // 從所有已載入的資源中搜尋
        if (foundText === undefined) {
            foundText = this._searchAllDescriptors(key)
        }

        // 處理結果
        return this._processTextResult(foundText, key, fallback)
    }

    /**
     * 搜尋所有描述符
     */
    private static _searchAllDescriptors(key: string): string | undefined {
        const descriptors: TextResourceDescriptor[] = Array.from(this.s_cache.values())

        for (let i: number = 0; i < descriptors.length; i++) {
            const desc: TextResourceDescriptor = descriptors[i]
            if (desc.IsLoaded()) {
                const text: string | undefined = desc.LookupText(key)
                if (text !== undefined) {
                    return text
                }
            }
        }

        return undefined
    }

    /**
     * 處理文字結果
     */
    private static _processTextResult(text: string | undefined, key: string, fallback?: string): string {
        if (typeof text === "string") {
            // 處理轉義字元
            return this._unescapeText(text)
        }

        if (typeof fallback === "string") {
            return fallback
        }

        // 找不到文字
        warn(`[LocaleText] Text not found for key: ${key}`)
        return `${LocaleDefine.TextResource.MISSING_TEXT_MARKER} [${key}]`
    }

    /**
     * 反轉義文字
     */
    private static _unescapeText(text: string): string {
        let result: string = text

        // 處理換行符號
        if (result.indexOf("\\n") !== -1) {
            result = result.replace(/\\n/g, '\n')
        }

        return result
    }
}
