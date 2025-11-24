import { _decorator, Component, Sprite, sp, AudioClip, JsonAsset, ImageAsset, Texture2D, SpriteFrame, log, warn, error } from 'cc'
import { ResourceLoader } from './ResourceLoader'
import { EnvConfig } from '../../Script/Define/ConfigDefine'

// CDN 路徑類型定義（移到 ResourceManager 中管理）
export enum CDNPathType {
    GodsendNew = "GodsendNew",
    MjContestIcon = "MjContestIcon"
}

/**
 * 資源管理器 - 負責業務邏輯、網址拼湊和對外提供下載API
 * 利用 ResourceLoader 現有的重試機制、快取管理、檔案處理功能
 */
export class ResourceManager {
    private static s_instance: ResourceManager = null
    
    // CDN 子路徑配置
    private static readonly CDN_SUB_PATHS = {
        [CDNPathType.GodsendNew]: "GodsendNew/",
        [CDNPathType.MjContestIcon]: "MjContestIcon/"
    }
    
    static get Instance(): ResourceManager {
        if (!ResourceManager.s_instance) {
            ResourceManager.s_instance = new ResourceManager()
        }
        return ResourceManager.s_instance
    }
    
    /**
     * 拼接完整的下載 URL
     * @param fileName 檔案名稱
     * @param cdnType CDN 類型
     * @returns 完整的下載 URL
     */
    private static BuildFullURL(fileName: string, cdnType: CDNPathType): string {
        const baseURL: string = EnvConfig.Config.COMMON
        const subPath: string = ResourceManager.CDN_SUB_PATHS[cdnType]
        return baseURL + subPath + fileName
    }
    
    /**
     * 載入 CDN 版本資料（使用 ResourceLoader 內建版本系統）
     * @param cdnType CDN 類型
     * @param callback 回調函數
     */
    private static LoadVersionData(cdnType: CDNPathType, callback: (success: boolean) => void): void {
        const versionKey: string = `version_${cdnType}.json`
        
        // 先檢查是否已經載入過這個 CDN 的版本資料
        const cachedVersionData: any = ResourceLoader.Instance.GetCachedAsset(versionKey)
        if (cachedVersionData) {
            log(`💾 使用已快取的版本資料: ${cdnType}`)
            ResourceLoader.Instance.SetVersionInfo(cachedVersionData)
            callback(true)
            return
        }
        
        const fullURL: string = ResourceManager.BuildFullURL('version.json', cdnType)
        
        // 載入版本資料，使用 CDN 特定的 key 避免覆蓋
        ResourceLoader.Instance.Enqueue(
            ResourceLoader.CreateSimpleFileDescriptor(
                versionKey, // 使用 CDN 特定的 key
                fullURL,
                'json',
                null,
                (errorMsg: string, asset: JsonAsset) => {
                    if (!errorMsg && asset) {
                        // 設置版本資料到 ResourceLoader
                        ResourceLoader.Instance.SetVersionInfo(asset)
                        log(`✅ 版本資料載入成功: ${cdnType}`)
                        callback(true)
                    } else {
                        error(`❌ 載入版本資料失敗 [${cdnType}]: ${errorMsg}`)
                        callback(false)
                    }
                },
                true // 保存到本地
            )
        )
    }
    
    /**
     * 分析資源來源資訊
     * @param asset 資源物件
     * @param fileName 檔案名稱
     * @returns 來源資訊物件
     */
    private GetAssetSourceInfo(asset: any, fileName: string): { source: string; message: string; details: any } {
        try {
            // 檢查是否為本地檔案資產
            if (asset && asset.isLocalFile) {
                return {
                    source: 'local_file',
                    message: `📁 從本地檔案載入: ${fileName} (${asset.filePath})`,
                    details: {
                        type: 'local_file',
                        path: asset.filePath,
                        size: asset.dataSize,
                        native: true
                    }
                }
            }
            
            // 檢查是否剛從快取獲取（通常 ResourceLoader 會設置一些標記）
            // 由於我們無法直接知道是網路下載還是快取，需要基於一些線索判斷
            
            // 如果資源物件有特定的屬性，可能表示是從不同來源載入的
            if (asset && typeof asset === 'object') {
                // 檢查是否有 spriteFrame（圖片資源）
                if (asset.spriteFrame) {
                    return {
                        source: 'processed',
                        message: `🖼️ 圖片資源載入完成: ${fileName} (已處理為 SpriteFrame)`,
                        details: {
                            type: 'image',
                            hasSprite: true,
                            processed: true
                        }
                    }
                }
                
                // 檢查是否有 json 屬性（JSON 資源）
                if (asset.json) {
                    return {
                        source: 'processed',
                        message: `📄 JSON 資源載入完成: ${fileName} (已解析)`,
                        details: {
                            type: 'json',
                            parsed: true,
                            keys: Object.keys(asset.json).length
                        }
                    }
                }
                
                // 檢查是否有 audioClip（音樂資源）
                if (asset.clip || (asset.constructor && asset.constructor.name === 'AudioClip')) {
                    return {
                        source: 'processed',
                        message: `🎵 音樂資源載入完成: ${fileName} (AudioClip)`,
                        details: {
                            type: 'audio',
                            hasClip: true,
                            processed: true
                        }
                    }
                }
                
                // 檢查是否有 skeletonData（Spine 資源）
                if (asset.skeletonData || asset._skeletonCache) {
                    return {
                        source: 'processed',
                        message: `🦴 Spine 資源載入完成: ${fileName} (SkeletonData)`,
                        details: {
                            type: 'spine',
                            hasSkeleton: true,
                            processed: true
                        }
                    }
                }
                
                // 預設情況：可能是網路下載後處理的資源
                return {
                    source: 'network_processed',
                    message: `🌐 資源載入完成: ${fileName} (網路下載並處理)`,
                    details: {
                        type: 'unknown',
                        processed: true,
                        fromNetwork: true
                    }
                }
            }
            
            // 如果無法判斷，回傳預設資訊
            return {
                source: 'unknown',
                message: `✅ 資源載入完成: ${fileName} (來源未知)`,
                details: {
                    type: 'unknown',
                    asset: asset
                }
            }
        } catch (errorMsg) {
            warn(`⚠️ 分析資源來源時發生錯誤: ${errorMsg}`)
            return {
                source: 'error',
                message: `✅ 資源載入完成: ${fileName} (來源分析失敗)`,
                details: {
                    error: errorMsg
                }
            }
        }
    }
    
    /**
     * 下載檔案（使用 ResourceLoader 內建的重試機制、版本檢查、快取管理）
     */
    private DownloadFile(
        fileName: string,
        fileType: string,
        cdnType: CDNPathType,
        component: Component,
        callback: (success: boolean, asset?: any, error?: string, sourceInfo?: { source: string; message: string; details: any }) => void
    ): void {
        try {
            log(`🎯 ResourceManager: 下載請求 - ${fileName} (${cdnType})`)
            
            // 先載入版本資料，然後讓 ResourceLoader 自動處理版本檢查、快取、重試等
            ResourceManager.LoadVersionData(cdnType, (versionLoaded: boolean) => {
                // 不管版本是否載入成功，都繼續下載（ResourceLoader 會自行判斷）
                const fullURL: string = ResourceManager.BuildFullURL(fileName, cdnType)
                
                // 直接使用 ResourceLoader.Enqueue，讓 ResourceLoader 處理所有邏輯
                ResourceLoader.Instance.Enqueue(
                    ResourceLoader.CreateSimpleFileDescriptor(
                        fileName,
                        fullURL,
                        fileType as 'image'|'music'|'json'|'spine',
                        component,
                        (errorMsg: string, asset: any) => {
                            if (!errorMsg && asset) {
                                // 判斷資源來源並記錄詳細資訊
                                const sourceInfo = this.GetAssetSourceInfo(asset, fileName)
                                log(`✅ ResourceManager: ${sourceInfo.message}`)
                                callback(true, asset, null, sourceInfo)
                            } else {
                                error(`❌ ResourceManager: 下載失敗 ${fileName} - ${errorMsg}`)
                                callback(false, null, errorMsg)
                            }
                        },
                        true // 儲存到本地
                    )
                )
            })
        } catch (errorMsg) {
            error(`❌ 下載流程錯誤: ${errorMsg}`)
            callback(false, null, `下載流程錯誤: ${errorMsg}`)
        }
    }
    
    
    /**
     * 天降好禮圖片下載
     * @param imageName 圖片名稱
     * @param sprite Sprite 元件
     * @param callback 回調函數，新增 sourceInfo 參數提供來源資訊
     */
    public static DownloadGodsendImage(imageName: string, sprite: Sprite, callback: (success: boolean, asset?: any, error?: string, sourceInfo?: { source: string; message: string; details: any }) => void): void {
        log(`🎯 ResourceManager: 天降好禮圖片下載請求 - ${imageName}`)
        ResourceManager.Instance.DownloadFile(imageName, 'image', CDNPathType.GodsendNew, sprite, callback)
    }
    
    /**
     * 競賽圖標下載
     * @param iconName 圖標名稱
     * @param sprite Sprite 元件
     * @param callback 回調函數，新增 sourceInfo 參數提供來源資訊
     */
    public static DownloadMjContestIcon(iconName: string, sprite: Sprite, callback: (success: boolean, asset?: any, error?: string, sourceInfo?: { source: string; message: string; details: any }) => void): void {
        log(`🎯 ResourceManager: 競賽圖標下載請求 - ${iconName}`)
        ResourceManager.Instance.DownloadFile(iconName, 'image', CDNPathType.MjContestIcon, sprite, callback)
    }
    

}