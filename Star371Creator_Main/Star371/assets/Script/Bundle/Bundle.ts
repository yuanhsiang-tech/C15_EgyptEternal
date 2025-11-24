import { Asset, AssetManager, assetManager, path, __private, Constructor, native, js, SceneAsset } from 'cc';
import { JSB } from 'cc/env';

type AssetInfo = __private._cocos_asset_asset_manager_config__IAddressableInfo;
const bundleMap: Map<string, Bundle> = new Map();

function LoadBundle(nameOrUrl: string|string[], onComplete: ((err:Error|null, bundle:Bundle, nameOrUrl:string, finish:boolean)=>void), bundleCreator: (rawBundle: AssetManager.Bundle, finish:boolean)=>Bundle): void {
    const tmpNameOrUrl:string[] = typeof nameOrUrl == "string" ? [nameOrUrl] : nameOrUrl;
    let count:number = 0;

    tmpNameOrUrl.forEach((x:string)=>{
        if (typeof x !== 'string' || x.length <= 0) {
            onComplete?.(new Error('invalid bundle name or url'), null, x, ++count==tmpNameOrUrl.length);
        } else {
            const name:string = path.basename(x);
            if (bundleMap.has(name)) {
                onComplete?.(null, bundleMap.get(name), x, ++count==tmpNameOrUrl.length);
            } else {
                assetManager.loadBundle(x, (err: Error | null, rawBundle: AssetManager.Bundle) => {
                    const finish:boolean = ++count==tmpNameOrUrl.length;
                    if (err) {
                        onComplete?.(err, null, x, finish);
                    } else {
                        const bundle:Bundle = bundleCreator(rawBundle, finish);
                        bundleMap.set(name, bundle);
                        onComplete?.(null, bundle, x, finish);
                    }
                });
            }
        }
    });
}

/**
 * 基礎型通用 bundle
 */
export class Bundle {
    /**
     * 取得內建的 resources bundle
     */
    public static get Resources(): Bundle {
        return Bundle.InnerBundle(assetManager.resources);
    }

    /**
     * 取得內建的 main bundle
     */
    public static get Main(): Bundle {
        return Bundle.InnerBundle(assetManager.main);
    }

    /**
     * 取得內建的 internal bundle
     */
    public static get Internal(): Bundle {
        return Bundle.InnerBundle(assetManager.getBundle('internal'));
    }

    /**
     * 取得 bundle
     * @param nameOrUrl 名稱或路徑
     */
    public static Find<T extends Bundle>(nameOrUrl: string): T | null {
        return bundleMap.get(path.basename(nameOrUrl)) as T;
    }

    /**
     * 載入 bundle
     * @param nameOrUrl 名稱或路徑
     * @param onComplete 載入完成通知
     */
    public static Load(nameOrUrl: string, onComplete?: ((err: Error | null, bundle: Bundle) => void) | null): void {
        LoadBundle(nameOrUrl, onComplete, (rawBundle:AssetManager.Bundle)=>new Bundle(rawBundle));
    }

    /**
     * 釋放未使用的資源
     */
    public static Drain(): void {
        bundleMap.forEach((bundle:Bundle)=>{
            bundle.ReleaseUnused();
        });
    }

    /**
     * 創建並取得內建的 bundle
     * @param innerBundle 內建的 bundle
     */
    private static InnerBundle(innerBundle:AssetManager.Bundle): Bundle {
        let bundle:Bundle = bundleMap.get(innerBundle.name);
        if (!bundle) {
            bundle = new Bundle(innerBundle);
            bundleMap.set(innerBundle.name, bundle);
        }
        return bundle;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    protected m_bundle: AssetManager.Bundle;
    protected m_searchPaths: string[];
    protected m_classList: string[];
    protected m_sublobby: string;

    /**
     * 名稱
     */
    public get Name(): string {
        return this.m_bundle?.name;
    }

    /**
     * 根目錄
     */
    public get Root(): string {
        return this.m_bundle?.base;
    }

    /**
     * 取得原始的 AssetManager.Bundle
     */
    public get Raw(): AssetManager.Bundle {
        return this.m_bundle;
    }

    /**
     * 子大廳識名稱
     */
    public get SubLobby(): string { 
        return this.m_sublobby; 
    }

    protected constructor(bundle: AssetManager.Bundle) {
        this.m_bundle = bundle;
        this.m_searchPaths = [];
        this.m_classList = [];

        // 找出子大廳場景名稱(理論上遊戲 Bundle 最多只會有兩個場景，一個是遊戲場景，另一個則必定為子大廳場景)
        this.m_bundle.getDirWithPath('/Scene', SceneAsset)
            .forEach((info:AssetInfo)=>{
                const sceneName:string = path.basename(info.path);
                if (sceneName != this.m_bundle.name) {
                    this.m_sublobby = sceneName;
                }
            });
    }

    /**
     * @en
     * Loads the asset within this bundle by the path which is relative to bundle's path.
     *
     * @zh
     * 通过相对路径加载分包中的资源。路径是相对分包文件夹路径的相对路径。
     *
     * @param paths
     * @en Paths of the target assets.These paths are relative to the bundle's folder, extension name must be omitted.
     * @zh 需要加载的资源的路径。此路径为工程中相对于 bundle 文件夹的相对路径，路径中请不要带扩展名。
     * @param type
     * @en Asset type, if this parameter is passed, the asset of the corresponding type will be found in the assets of the corresponding path to finish loading.
     * @zh 资源类型，如果传入此参数，则会在对应路径的资源中找到对应类型的资源完成加载。
     * @param onProgress
     * @en Callback invoked when the loading progress change.
     * @zh 加载进度发生变化时执行的回调。
     * @param onProgress.finish
     * @en The number of request items that have been loaded.
     * @zh 已经完成加载的资源数量。
     * @param onProgress.total
     * @en The number of all request items to be loaded.
     * @zh 所有待加载的资源数量。
     * @param onProgress.item @en The finished request item. @zh 当前完成的加载项。
     * @param onComplete @en Callback invoked when all assets loaded. @zh 所有资源加载完成后的回调。
     * @param onComplete.error @en Error message during loading, or null if loaded successfully. @zh 加载过程中的错误信息，如果加载成功则为 null。
     * @param onComplete.assets @en The loaded asset, or null if an error occurred during loading. @zh 已加载的资源，如果加载过程中有错误发生，则为 null。
     *
     * @example
     *
     * // load the prefab (${project}/assets/bundle1/misc/character/cocos) from bundle1 folder
     * bundle1.Load('misc/character/cocos', Prefab, (err, prefab) => log(err));
     *
     * // load the sprite frame (${project}/assets/some/xxx/bundle2/imgs/cocos.png) from bundle2 folder
     * bundle2.Load('imgs/cocos', SpriteFrame, null, (err, spriteFrame) => log(err));
     *
     */
    public Load<T extends Asset> (
        paths: string,
        type: Constructor<T> | null,
        onProgress: ((finished: number, total: number, item: AssetManager.RequestItem) => void) | null,
        onComplete: ((err: Error | null, data: T) => void) | null): void;
    public Load<T extends Asset> (
        paths: string[], type: Constructor<T> | null,
        onProgress: ((finished: number, total: number, item: AssetManager.RequestItem) => void) | null,
        onComplete: ((err: Error | null, data: T[]) => void) | null): void;
    public Load<T extends Asset> (paths: string, onProgress: ((finished: number, total: number, item: AssetManager.RequestItem) => void) | null, onComplete: ((err: Error | null, data: T) => void) | null): void;
    public Load<T extends Asset> (paths: string[], onProgress: ((finished: number, total: number, item: AssetManager.RequestItem) => void) | null, onComplete: ((err: Error | null, data: T[]) => void) | null): void;
    public Load<T extends Asset> (paths: string, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public Load<T extends Asset> (paths: string[], onComplete?: ((err: Error | null, data: T[]) => void) | null): void;
    public Load<T extends Asset> (paths: string, type: Constructor<T> | null, onComplete?: ((err: Error | null, data: T) => void) | null): void;
    public Load<T extends Asset> (paths: string[], type: Constructor<T> | null, onComplete?: ((err: Error | null, data: T[]) => void) | null): void;
    public Load<T extends Asset> (
        paths: string|string[],
        type?: Constructor<T> | ((finished: number, total: number, item: AssetManager.RequestItem) => void) | ((err: Error | null, data: T|T[]) => void) | null,
        onProgress?: ((finished: number, total: number, item: AssetManager.RequestItem) => void) | ((err: Error | null, data: T|T[]) => void) | null,
        onComplete?: ((err: Error | null, data: T|T[]) => void) | null,
    ): void {
        const { type: _type, onProgress: onProg, onComplete: onComp } = ParseLoadResArgs(type, onProgress, onComplete);

        // in cache check
        let allLoaded: boolean = false
        let bundle: AssetManager.Bundle = assetManager.getBundle(this.m_bundle.name)
        if (bundle) {
            let data: T|T[] = null
            if (typeof paths === 'string') {
                let asset: Asset = bundle.get(paths, _type)
                if (asset) {
                    allLoaded = true
                    data = asset as T
                }
            } else {
                allLoaded = true
                let tempData: T[] = []
                for (const path of paths) {
                    let asset: Asset = bundle.get(path, _type)
                    if (!asset) {
                        allLoaded = false
                        break
                    }
                    tempData.push(asset as T)
                }
                data = tempData
            }
            if (allLoaded) {
                // all loaded, return data
                if (data) {
                    onComp?.(null, data, true)
                    return
                }
            }
        }

        const options = { __requestType__: 'path', type: _type, bundle: this.m_bundle.name, __outputAsArray__: Array.isArray(paths) };
        assetManager.loadAny(paths, options, onProg, (err: Error | null, data: T|T[])=>{
            if (data) {
                const loader:any = cc['loader'];
                if (!Array.isArray(data)) {
                    loader.setAutoReleaseRecursively(data, true);
                } else {
                    for (const item of data) {
                        loader.setAutoReleaseRecursively(item, true);
                    }
                }
            }
            onComp?.(err, data);
        });
    }

    /**
     * @en
     * Gets cached asset within this bundle by path and type. <br>
     * After you load asset with [[load]] or [[loadDir]],
     * you can acquire them by passing the path to this API.
     *
     * NOTE：When there are multiple asset with the same name, you can get the specific asset by specifying the type.
     * Otherwise the first asset matching that name will be returned.
     *
     * @zh
     * 通过路径与类型获取已缓存资源。在你使用 [[load]] 或者 [[loadDir]] 之后，
     * 你能通过传路径通过这个 API 获取到这些资源。
     *
     * 注意：当有多个同名的资产时，你可以通过指定类型来获得具体的资产。
     * 否则将返回与该名称相匹配的第一个资产。
     *
     * @param path @en The path of asset. @zh 资源的路径。
     * @param type @en The asset type. Only specify type asset will be returned if this argument is supplied. @zh 资源类型，指定后只会返回该类型的资源。
     * @returns @en The asset has been cached. @zh 已缓存的资源。
     *
     * @example
     * bundle1.Get('music/hit', AudioClip);
     */
    public Get<T extends Asset>(path: string, type?: __private._types_globals__Constructor<T> | null): T | null {
        return this.m_bundle?.get(path, type) as T;
    }

    /**
     * 釋放未使用的資源
     */
    public ReleaseUnused(): void {
        this.m_bundle?.['releaseUnusedAssets']();
    }

    /**
     * 添加搜索路徑
     * @param path 搜索路徑
     */
    public AddSearchPath(...paths:string[]): void {
        this.m_searchPaths.push(...paths);
        if (JSB) {
            for (const path of paths) {
                native.fileUtils.addSearchPath(path, true);
            }
        }
    }

    /**
     * 銷毀
     */
    public Destroy(): void {
        if (JSB && this.m_searchPaths?.length > 0) {
            const paths:string[] = native.fileUtils.getSearchPaths();
            this.m_searchPaths.forEach((path:string)=>{
                const index:number = paths.findIndex((value:string)=>value==path);
                js.array.removeAt(paths, index);
            });
            native.fileUtils.setSearchPaths(paths);
        }

        if (this.m_bundle) {
            this.m_bundle.releaseAll();
            assetManager.removeBundle(this.m_bundle);
            bundleMap.delete(this.m_bundle.name);
        }

        this.m_bundle = null;
    }
}

/**
 * 遊戲 bundle
 */
export class GameBundle extends Bundle {
    private static s_gameBundle: GameBundle;

    /**
     * 取得當前唯一的遊戲 bundle
     */
    public static get Current(): GameBundle {
        return GameBundle.s_gameBundle;
    }

    /**
     * 載入遊戲 bundle
     * @param nameOrUrl 名稱或路徑
     * @param onComplete 載入完成通知
     */
    public static Load(nameOrUrl: string, onComplete?: ((err: Error | null, bundle: GameBundle) => void) | null): void;
    public static Load(nameOrUrl: string[], onComplete?: ((err: Error | null, bundle: GameBundle) => void) | null): void;
    public static Load(nameOrUrl: string|string[], onComplete?: ((err: Error | null, bundle: GameBundle) => void) | null): void {
        const errorMap: Map<string, Error> = new Map();
        const tmpNameOrUrl:string[] = (typeof nameOrUrl == "string" ? [nameOrUrl] : nameOrUrl);

        LoadBundle(nameOrUrl, 
            (err: Error | null, _, urlOrName:string, finish:boolean)=>{
                if (err) {
                    // [記錄發生錯誤的 Bundle]
                    errorMap.set(urlOrName, err);
                }

                if (finish) {
                    // [全部載入完成]
                    if (errorMap.size > 0) {
                        // [曾經發生錯誤]

                        // 釋放所有已經載入的 Bundle
                        tmpNameOrUrl.forEach((x:string)=>Bundle.Find<GameBundle>(x)?.Destroy());
                            
                        // 回報錯誤（只回報第一個錯誤）
                        onComplete?.(errorMap.values().next().value, null);
                    } else {
                        // [全部載入成功] => 設定主遊戲 Bundle
                        tmpNameOrUrl.forEach((x:string, index:number)=>{
                            const bundle:GameBundle = Bundle.Find<GameBundle>(x);
                            if (index == 0) {
                                // [主遊戲 Bundle]
                                GameBundle.s_gameBundle = bundle;
                            } else {
                                // [依賴的 Bundle]
                                GameBundle.s_gameBundle.m_dependencies.set(bundle.Name, bundle);
                            }
                        });
                        onComplete?.(null, GameBundle.s_gameBundle);
                    }
                }
            }, 
            (rawBundle:AssetManager.Bundle)=>new GameBundle(rawBundle)
        );
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private m_dependencies: Map<string, GameBundle>;
    

    /**
     * 依賴的 Bundle 列表
     */
    public get Dependencies(): Map<string, Bundle> { return this.m_dependencies; }

    protected constructor(bundle: AssetManager.Bundle) {
        super(bundle);
        this.m_dependencies = new Map();
    }

    /**
     * 銷毀
     */
    public override Destroy(): void {
        super.Destroy();
        if (this == GameBundle.s_gameBundle) GameBundle.s_gameBundle = null;
        this.m_dependencies.forEach((bundle:GameBundle)=>bundle.Destroy());
    }
}












function ParseLoadResArgs<T extends (...args) => void> (
    type: Constructor<Asset> | ((finished: number, total: number, item: AssetManager.RequestItem) => void) | T | null | undefined,
    onProgress: ((finished: number, total: number, item: AssetManager.RequestItem) => void) | T | null | undefined,
    onComplete: T | null | undefined): any {
    let typeOut: any = type;
    let onProgressOut: any = onProgress;
    let onCompleteOut: any = onComplete;
    if (onComplete === undefined) {
        const isValidType = js.isChildClassOf(type as Constructor<Asset>, Asset);
        if (onProgress) {
            onCompleteOut = onProgress as T;
            if (isValidType) {
                onProgressOut = null;
            }
        } else if (onProgress === undefined && !isValidType) {
            onCompleteOut = type as T;
            onProgressOut = null;
            typeOut = null;
        }
        if (onProgress !== undefined && !isValidType) {
            onProgressOut = type as ((finished: number, total: number, item: AssetManager.RequestItem) => void);
            typeOut = null;
        }
    }

    return { type: typeOut, onProgress: onProgressOut || null, onComplete: onCompleteOut };
}



eval("window.Bundle=Bundle;Bundle._cache = bundleMap;");
eval("window.GameBundle=GameBundle;");