import { _decorator, isValid, instantiate, Director, Node, Component, error, warn, Prefab } from "cc";
import { EpisodeEntityDelegate } from "./EpisodeEntityDelegate";
import EpisodeEntityBase from "./EpisodeEntityBase";
import { EpisodeMacro } from "./EpisodeMacro";
import { EpisodeEntityConfig } from "./EpisodeEntityConfig";
import { PersistLayers } from "../PersistLayers/PersistLayers";
import { EpisodeCommanderDelegate } from "./EpisodeCommanderDelegate";
import { EventDefine } from "../../Define/EventDefine";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
import { EventDispatcher } from "db://assets/Stark/Utility/EventDispatcher";
import { NodeUtils } from "db://assets/Stark/FuncUtils/NodeUtils";
import { EpisodeDefine } from "../../Define/EpisodeDefine";
import { LazyUpdating } from "db://assets/Stark/Utility/LazyUpdating";
import { Bundle } from "../../Bundle/Bundle";
import { Identifier } from "../../Define/IdentifierDefine";
import { Define } from "../../Define/GeneralDefine";

const { ccclass } = _decorator;

//================================================================================================
/** 載入演出實體回呼 */
type LoadEpisodeCallback = (err: Error, entity: EpisodeEntityBase<any>)=>void;

//================================================================================================
/** 演出實體資訊 */
interface EpisodeEntityPack {
    key         :EpisodeMacro.Keys;
    type        :EpisodeMacro.TYPE;
    entity      :EpisodeEntityBase<any>;
    config     ?:EpisodeEntityConfig;
    initData   ?:any;
}

//================================================================================================
/** 提交演出資訊 */
interface EpisodeSubmission {
    key          :EpisodeMacro.Keys;
    type         :EpisodeMacro.TYPE;
    id           :number;
    data        ?:any;
    priority    ?:number;
}

//================================================================================================
/**
 * 全畫面演出指揮官
 */
//================================================================================================

@ccclass
export default class EpisodeCommander extends Component {

    //----------------------------------------------------------------

    private m_commanderDelegate :EpisodeCommanderDelegate = null;
    private m_entityDelegate    :EpisodeEntityDelegate = null;
    private m_isPortraitScene   :boolean = false;
    private m_lazyNextEpisode   :LazyUpdating = null;
    private m_episodeRootNode   :Node = null;

    private m_episodeIdCounter  :number = 0;
    private m_episodeEntityMap  :Map<EpisodeMacro.Keys, EpisodeEntityPack> = null;
    private m_typeBlockIdMap    :Map<EpisodeMacro.TYPE, Set<string>> = null;
    private m_blockedTypeSet    :Set<EpisodeMacro.TYPE> = null;
    private m_blockAllIdSet     :Set<string> = null;
    private m_pauseSceneIdSet   :Set<number> = null;

    private m_assetLoadingSet   :Set<EpisodeMacro.Keys> = null;
    private m_loadCallbackMap   :Map<EpisodeMacro.Keys, LoadEpisodeCallback[]> = null;

    private m_submissionNow     :EpisodeSubmission = null;
    private m_submissionQueue   :EpisodeSubmission[] = [];
    private m_submissionStash   :EpisodeSubmission[] = [];
    private m_episodeEntityNow  :EpisodeEntityBase<any> = null;
    private m_timeoutTimer      :number = 0;

    //----------------------------------------------------------------

    public get Delegate(): EpisodeCommanderDelegate {
        return this.m_commanderDelegate;
    }
    public set Delegate(value: EpisodeCommanderDelegate) {
        this.m_commanderDelegate = value;
    }

    //----------------------------------------------------------------

    public get IsPortraitScene(): boolean {
        return this.m_isPortraitScene;
    }
    public set IsPortraitScene(value: boolean) {
        this.m_isPortraitScene = value;
    }

    //----------------------------------------------------------------

    protected onLoad(): void {
        this.m_entityDelegate = {
            PauseScene      : this.PauseScene.bind(this),
            ResumeScene     : this.ResumeScene.bind(this),
            FinishEpisode   : this.FinishEpisode.bind(this),
            PostponeEpisode : this.PostponeEpisode.bind(this),
        };
        this.m_lazyNextEpisode  = new LazyUpdating(()=>this.NextEpisode(), false, Director.EVENT_BEFORE_UPDATE);

        this.m_episodeRootNode  = new Node("episode.root");
        this.m_episodeRootNode.parent = PersistLayers.Layer( Define.ZIndex.Global.GAME_SUPERIOR );
        this.m_episodeRootNode.setSiblingIndex( Define.ZIndex.GameSuperiors.EPISODE );
        this.m_episodeRootNode.active = true;

        this.m_episodeIdCounter = 0;
        this.m_episodeEntityMap = new Map<EpisodeMacro.Keys, EpisodeEntityPack>();
        this.m_typeBlockIdMap   = new Map<EpisodeMacro.TYPE, Set<string>>();
        this.m_blockedTypeSet   = new Set<EpisodeMacro.TYPE>();
        this.m_blockAllIdSet    = new Set<string>();
        this.m_pauseSceneIdSet  = new Set<number>();

        this.m_assetLoadingSet  = new Set<EpisodeMacro.Keys>();
        this.m_loadCallbackMap  = new Map<EpisodeMacro.Keys, LoadEpisodeCallback[]>();

        this.m_submissionNow    = null;
        this.m_submissionQueue  = [];
        this.m_submissionStash  = [];
        this.m_episodeEntityNow = null;
        this.m_timeoutTimer     = 0;
    }

    //----------------------------------------------------------------

    protected onDestroy(): void {
        this.m_lazyNextEpisode?.Cancel();
    }

    //----------------------------------------------------------------

    protected update(dt: number): void {
        if (this.m_episodeEntityNow && this.m_timeoutTimer > 0) {
            this.m_timeoutTimer -= dt;
            if (this.m_timeoutTimer <= 0) {
                this.m_timeoutTimer = 0;

                const submission = this.m_submissionNow;
                const entity = this.m_episodeEntityNow;
                const finish = entity.OnEpisodeTimeout?.() ?? true;
                this.OnEpisodeFatal( submission.key, submission.id, submission.data, EpisodeMacro.FATAL_CODE.TIMEOUT );
                finish && this.FinishEpisode( this.m_episodeEntityNow.EpisodeId );
            }
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 演出實體綁定
    //================================================================

    //----------------------------------------------------------------
    /**
     * 綁定演出實體
     * @param key 演出 Key
     * @param initCb 演出初始化回呼
     */
    public AttachEntity(key: EpisodeMacro.Keys, initData?: any): void;

    /**
     * 綁定演出實體
     * @param key 演出 Key
     * @param config 演出設定檔
     * @param initCb 演出初始化回呼
     */
    public AttachEntity(key: EpisodeMacro.Keys, config: EpisodeEntityConfig, initData?: any): void;

    /**
     * 綁定演出實體
     * @param key 演出 Key
     * @param entity 演出實體
     * @param type 演出類型
     */
    public AttachEntity(key: EpisodeMacro.Keys, entity: EpisodeEntityBase<any>, type?: EpisodeMacro.TYPE): void;

    // 實作 Overload
    public AttachEntity(key   : EpisodeMacro.Keys,
                        arg1 ?: EpisodeEntityConfig | EpisodeEntityBase<any> | any,
                        arg2 ?: EpisodeMacro.TYPE | any,
                        ): void
    {
        if (arg1 instanceof EpisodeEntityBase) {
            const entity = arg1;
            const type = NumberUtils.IsValidNum(arg2) ? arg2 : EpisodeMacro.DEFAULT_TYPE;
            this.m_episodeEntityMap.set(key, { key, type, entity });
            return;
        }

        const config = (arg1 instanceof EpisodeEntityConfig ? arg1 : null) ?? EpisodeDefine.GetConfig( key );
        const initData = (arg1 instanceof EpisodeEntityConfig ? arg2 : arg1) ?? null;

        if (config instanceof EpisodeEntityConfig) {
            this.m_episodeEntityMap.set(key, { key, type: config.episodeType, entity: null, config, initData });
            if (config.initStrategy === EpisodeMacro.INIT_STRATEGY.INIT_ON_ATTACH) {
                this.LoadEpisodeEntity(key, config);
            }
        } else {
            error(`[Episode-Cmd] Attach: Invalid episode config for key '${key}'`);
        }
    }

    //----------------------------------------------------------------
    /** 解除演出實體 */
    public DetachEntity(key: EpisodeMacro.Keys): void {
        this.m_episodeEntityMap.delete(key);
    }

    //----------------------------------------------------------------

    //================================================================
    // 演出控制
    //================================================================

    //----------------------------------------------------------------
    /**
     * 提交演出
     * @param key 
     * @param data 
     * @param priority 
     * @returns 
     */
    public SubmitEpisode(key: EpisodeMacro.Keys, data?: any, priority?: number): number {
        const entityPack = this.m_episodeEntityMap.get( key );
        if (!entityPack) {
            warn(`[Episode-Cmd] Submit: No attached entity for key '${key}'`);
            return EpisodeMacro.INVALID_ID;
        }

        const type  = entityPack.type;
        const id    = ++this.m_episodeIdCounter;
        priority    = priority ?? EpisodeDefine.Priority( key );

        if (entityPack.config?.initStrategy === EpisodeMacro.INIT_STRATEGY.INIT_ON_SUBMIT) {
            this.LoadEpisodeEntity( key, entityPack.config );
        }

        this.m_submissionQueue.push({ key, type, id, data, priority });
        this.SortSubmissionQueue();
        this.m_lazyNextEpisode.Update();
        return id;
    }

    //----------------------------------------------------------------
    /**
     * 取消演出 (若演出已在執行中，則無法取消)
     * @param episodeId 演出 ID
     * @returns 是否成功取消演出
     */
    public CancelEpisode(episodeId: number): boolean {
        // 移除佇列中的演出
        for (let i = 0; i < this.m_submissionQueue.length; ++i) {
            if (this.m_submissionQueue[i].id === episodeId) {
                this.m_submissionQueue.splice(i, 1);
                return true;
            }
        }

        // 移除暫存區中的演出
        for (let i = 0; i < this.m_submissionStash.length; ++i) {
            if (this.m_submissionStash[i].id === episodeId) {
                this.m_submissionStash.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    //----------------------------------------------------------------
    /**
     * 結束演出
     * @param episodeId 演出 ID
     */
    public FinishEpisode(episodeId: number): void {
        if (this.m_submissionNow?.id === episodeId) {
            // 通知演出結束
            this.OnEpisodeFinish( this.m_submissionNow.key, episodeId, this.m_submissionNow.data, this.m_episodeEntityNow );
            this.m_submissionNow = null;

            // 釋放演出實體
            if (this.m_episodeEntityNow) {
                this.m_episodeEntityNow.OnEpisodeFinish?.();
                this.m_episodeEntityNow.node.active = false;
                EpisodeEntityBase.Release( this.m_episodeEntityNow );
                this.m_episodeEntityNow = null;
            }

            // 恢復場景並執行下一個演出
            this.ResumeScene( episodeId );
            this.m_lazyNextEpisode.Update();
        }
    }

    //----------------------------------------------------------------
    /**
     * 延後演出逾時時間
     * @param timeoutTime 從現在開始延後的時間 (秒) (預設為原本的逾時時間)
     */
    public PostponeEpisode(episodeId: number, timeoutTime?: number): void {
        if (this.m_episodeEntityNow?.EpisodeId === episodeId) {
            const episodeEntity = this.m_episodeEntityNow;
            timeoutTime         = timeoutTime ?? episodeEntity.EpisodeTimeoutTime ?? EpisodeDefine.Timeout( episodeEntity.EpisodeKey );
            this.m_timeoutTimer = timeoutTime > 0 ? timeoutTime : 0;
        }
    }

    //----------------------------------------------------------------
    /** 排序演出佇列 */
    private SortSubmissionQueue(): void {
        this.m_submissionQueue.sort((a, b) => {
            return a.priority - b.priority;
        });
    }

    //----------------------------------------------------------------
    /** 執行下一個演出 */
    private NextEpisode(): void {
        // 若有演出正在進行中 OR 沒有演出要執行 OR 全部演出被阻擋，則不執行
        if (this.m_submissionNow || this.m_submissionQueue.length <= 0 || this.m_blockAllIdSet.size > 0) {
            return;
        }

        // 從佇列中取出下一個演出
        const submission = this.m_submissionNow = this.m_submissionQueue.shift();
        const episodeKey = submission.key;
        const entityPack = this.m_episodeEntityMap.get( episodeKey );

        // 尚未註冊的演出，直接跳過
        if (!entityPack) {
            warn(`[Episode-Cmd] Next: No attached entity for key '${episodeKey}'`);
            this.OnEpisodeFatal( episodeKey, submission.id, submission.data, EpisodeMacro.FATAL_CODE.NOT_ATTACHED );
            this.NextEpisode();
            return;
        }

        // 沒有實體也沒有設定檔，直接跳過
        if (!entityPack.entity && !entityPack.config) {
            error(`[Episode-Cmd] Next: Invalid episode entity or config for key '${episodeKey}'`);
            this.OnEpisodeFatal( episodeKey, submission.id, submission.data, EpisodeMacro.FATAL_CODE.BAD_ATTACHED );
            this.NextEpisode();
            return;
        }

        // 已經有實體 => 直接開始演出
        if (entityPack.entity) {
            this.OnEpisodeStart( episodeKey, submission.id, submission.data, entityPack.entity );
            this.LaunchEpisode( submission, entityPack.entity );
            return;
        }

        // 尚未有實體，需要先載入實體
        if (entityPack.config) {
            this.OnEpisodeStart( episodeKey, submission.id, submission.data );

            // 開始時暫停場景
            if (entityPack.config.pauseOnStart) {
                this.PauseScene( submission.id );
            }

            // 載入實體後開始演出
            this.LoadEpisodeEntity( episodeKey, entityPack.config, (err, entity)=>
            {
                // 載入失敗，直接跳過
                if (err) {
                    error(`[Episode-Cmd] Next: Failed to load episode entity for key '${episodeKey}'`, err);
                    this.OnEpisodeFatal( episodeKey, submission.id, submission.data, EpisodeMacro.FATAL_CODE.LOAD_ASSET_FAIL );
                    this.ResumeScene( submission.id );
                    this.NextEpisode();
                    return;
                }

                // 提交過時，直接跳過
                if (submission.id !== this.m_submissionNow?.id) {
                    warn(`[Episode-Cmd] Next: Episode submission '${submission.id}' is outdated`);
                    this.OnEpisodeFatal( episodeKey, submission.id, submission.data, EpisodeMacro.FATAL_CODE.SUMMIT_OUTDATED );
                    this.ResumeScene( submission.id );
                    this.NextEpisode();
                    return;
                }

                // 啟動演出
                this.LaunchEpisode( submission, entity );
            });

            return;
        }

        // 不應該執行到這裡
        this.NextEpisode();
    }

    //----------------------------------------------------------------
    /** 啟動演出 */
    private LaunchEpisode(submission: EpisodeSubmission, episodeEntity: EpisodeEntityBase<any>): void {
        // 紀錄當前演出實體
        this.m_episodeEntityNow = episodeEntity;

        // 取得演出相關資訊
        const episodeKey    = submission.key;
        const episodeId     = submission.id;
        const episodeData   = submission.data;
        const pauseOnLaunch = episodeEntity.ShouldPauseSceneOnLaunch ?? true;
        const timeoutTime   = episodeEntity.EpisodeTimeoutTime ?? EpisodeDefine.Timeout( episodeKey );
        this.m_timeoutTimer = timeoutTime > 0 ? timeoutTime : 0;

        // 若要求暫停場景，則暫停場景
        pauseOnLaunch && this.PauseScene( episodeId );

        // 準備並開始演出
        EpisodeEntityBase.Prepare( episodeEntity, this.m_entityDelegate, episodeId, episodeKey, episodeData );
        episodeEntity.node.active = true;
        episodeEntity.OnEpisodeLaunch( episodeData );

        // 通知演出開始
        this.OnEpisodeLaunch( episodeKey, episodeId, episodeData, episodeEntity );
    }

    //----------------------------------------------------------------

    //================================================================
    // 暫停與恢復場景
    //================================================================

    //----------------------------------------------------------------
    /** 暫停當前場景 */
    private PauseScene(episodeId: number): void {
        if (this.m_pauseSceneIdSet.has( episodeId ) === false) {
            this.m_pauseSceneIdSet.add( episodeId );
            EventDispatcher.Shared.Dispatch( EventDefine.Game.PAUSE_GAME, `${Identifier.BLOCK_KEY.EPISODE_PAUSE_GAME}_${episodeId}` );
        }
    }

    //----------------------------------------------------------------
    /** 恢復當前場景 */
    private ResumeScene(episodeId: number): void {
        if (this.m_pauseSceneIdSet.has( episodeId )) {
            this.m_pauseSceneIdSet.delete( episodeId );
            EventDispatcher.Shared.Dispatch( EventDefine.Game.RESUME_GAME, `${Identifier.BLOCK_KEY.EPISODE_PAUSE_GAME}_${episodeId}` );
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 阻擋演出
    //================================================================

    //----------------------------------------------------------------
    /**
     * 阻擋所有演出
     * @param identifier 阻擋識別碼
     */
    public BlockAll(identifier: string = Identifier.BLOCK_KEY.EPISODE_DEFAULT): void {
        this.m_blockAllIdSet.add( identifier );
    }

    //----------------------------------------------------------------
    /**
     * 解除阻擋所有演出
     * @param identifier 阻擋識別碼
     */
    public UnblockAll(identifier: string = Identifier.BLOCK_KEY.EPISODE_DEFAULT): void {
        this.m_blockAllIdSet.delete( identifier );
    }

    //----------------------------------------------------------------
    /** 阻擋指定演出類型 */
    public BlockType(...types: EpisodeMacro.TYPE[]): void;

    /**
     * 阻擋指定演出類型
     * @param identifier 阻擋識別碼
     */
    public BlockType(identifier: string, ...types: EpisodeMacro.TYPE[]): void;

    // 實作 Overload
    public BlockType(arg0: string | EpisodeMacro.TYPE, ...types: EpisodeMacro.TYPE[]): void {
        this.UpdateBlockTypes(true, arg0, types);
    }

    //----------------------------------------------------------------
    /** 解除阻擋指定演出類型 */
    public UnblockType(...types: EpisodeMacro.TYPE[]): void;

    /**
     * 解除阻擋指定演出類型
     * @param identifier 阻擋識別碼
     */
    public UnblockType(identifier: string, ...types: EpisodeMacro.TYPE[]): void;

    // 實作 Overload
    public UnblockType(arg0: string | EpisodeMacro.TYPE, ...types: EpisodeMacro.TYPE[]): void {
        this.UpdateBlockTypes(false, arg0, types);
    }

    //----------------------------------------------------------------
    /**
     * 刷新阻擋演出類型
     * @param enabled   是否啟用阻擋
     * @param idOrType  阻擋識別碼或演出類型
     * @param types     演出類型
     */
    private UpdateBlockTypes(enabled: boolean, idOrType: string | EpisodeMacro.TYPE, types: EpisodeMacro.TYPE[]): void {
        // 參數解析
        const blockId = typeof idOrType === "string" ? idOrType : Identifier.BLOCK_KEY.EPISODE_DEFAULT;
        const typeArr = typeof idOrType === "string" ? types : [idOrType, ...types];

        // 新增或刪除阻擋識別碼
        for (const type of typeArr) {
            if (enabled) {
                if (this.m_typeBlockIdMap.has( type ) === false) {
                    this.m_typeBlockIdMap.set( type, new Set<string>() );
                }
                this.m_typeBlockIdMap.get( type ).add( blockId );
            } else {
                if (this.m_typeBlockIdMap.has( type )) {
                    this.m_typeBlockIdMap.get( type ).delete( blockId );
                }
            }
        }

        // 更新被阻擋的演出類型
        for (const [type, blockIdSet] of this.m_typeBlockIdMap) {
            if (blockIdSet.size > 0) {
                this.m_blockedTypeSet.add( type );
            } else {
                this.m_blockedTypeSet.delete( type );
            }
        }

        // 將被阻擋的演出移除到暫存區
        for (let i = 0; i < this.m_submissionQueue.length; ++i) {
            const submission = this.m_submissionQueue[i];
            if (this.m_blockedTypeSet.has( submission.type )) {
                this.m_submissionStash.push( this.m_submissionQueue.splice(i--, 1)[0] );
            }
        }

        // 將不再被阻擋的演出從暫存區移回到佇列
        for (let i = 0; i < this.m_submissionStash.length; ++i) {
            const submission = this.m_submissionStash[i];
            if (this.m_blockedTypeSet.has( submission.type ) === false) {
                this.m_submissionQueue.push( this.m_submissionStash.splice(i--, 1)[0] );
            }
        }

        // 排序並嘗試執行下一個演出
        this.SortSubmissionQueue();
        this.m_lazyNextEpisode.Update();
    }

    //----------------------------------------------------------------

    //================================================================
    // 資源載入
    //================================================================

    //----------------------------------------------------------------
    /** 載入演出實體 */
    private LoadEpisodeEntity(key: EpisodeMacro.Keys, config: EpisodeEntityConfig, callback?: LoadEpisodeCallback): void {
        // 若已經在載入中，則等待載入完成
        if (this.m_assetLoadingSet.has( key )) {
            this.RegisterLoadCallback( key, callback );
            return;
        }

        // 參數檢查 : 資源設定檔
        if (!config) {
            callback?.( new Error(`[EpisodeCommander] load entity with invalid config`), null );
            return;
        }

        // 參數檢查 : Bundle 名稱
        if (config.bundleName?.length <= 0) {
            callback?.( new Error("[EpisodeCommander] load entity with invalid bundle name"), null );
            return;
        }

        // 參數檢查 : Prefab 資源路徑
        const assetPath = this.m_isPortraitScene
                        ? config.portraitAssetPath
                        : config.assetPath;
        if (assetPath?.length <= 0) {
            callback?.( new Error("[EpisodeCommander] load entity with invalid asset path"), null );
            return;
        }

        // TODO: 顯示載入中 UI

        // 註冊載入回呼
        this.RegisterLoadCallback( key, callback );

        // 開始載入資源
        this.m_assetLoadingSet.add( key );
        Bundle.Load(config.bundleName, (err, bundle:Bundle)=>{
            bundle.Load(assetPath, Prefab, (err, prefab) => {
                // TODO: 隱藏載入中 UI
    
                if (!isValid(this, true)) {
                    return;
                }
    
                // 載入完成後的處理
                let entity: EpisodeEntityBase<any> = null;
                if (!err) {
                    const node = instantiate(prefab);
                    node.parent = this.m_episodeRootNode;
                    node.setSiblingIndex( config.zIndex );
                    node.active = false;
    
                    entity = NodeUtils.SearchComponent( node, EpisodeEntityBase );
                    if (isValid(entity, true)) {
                        const pack = this.m_episodeEntityMap.get( key );
                        pack && (pack.entity = entity);
                        entity.OnEpisodeInitiate?.( pack.initData ?? null );
                    } else {
                        err = new Error(`[EpisodeCommander] prefab loaded but has no valid entity component`);
                    }
                }
    
                this.m_assetLoadingSet.delete( key );
                this.ResolveLoadCallback( key, err, entity );
            });
        })
    }

    //----------------------------------------------------------------
    /** 註冊載入回呼 */
    private RegisterLoadCallback(key: EpisodeMacro.Keys, callback: LoadEpisodeCallback): void {
        if (typeof callback === "function") {
            if (this.m_loadCallbackMap.has( key ) === false ) {
                this.m_loadCallbackMap.set( key, [] );
            }
            this.m_loadCallbackMap.get( key ).push( callback );
        }
    }

    //----------------------------------------------------------------
    /** 完成載入回呼 */
    private ResolveLoadCallback(key: EpisodeMacro.Keys, err: Error, entity: EpisodeEntityBase<any>): void {
        if (this.m_loadCallbackMap.has( key )) {
            const callbacks = this.m_loadCallbackMap.get( key );
            this.m_loadCallbackMap.delete( key );
            callbacks?.forEach?.( callback => callback( err, entity ) );
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // 事件通知
    //================================================================

    //----------------------------------------------------------------
    private OnEpisodeStart(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity?: EpisodeEntityBase<any>): void {
        this.m_commanderDelegate?.OnEpisodeStart(key, episodeId, episodeData, entity);
    }

    //----------------------------------------------------------------
    private OnEpisodeFatal(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, code: EpisodeMacro.FATAL_CODE): void {
        this.m_commanderDelegate?.OnEpisodeFatal(key, episodeId, episodeData, code);
    }

    //----------------------------------------------------------------
    private OnEpisodeLaunch(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity: EpisodeEntityBase<any>): void {
        this.m_commanderDelegate?.OnEpisodeLaunch(key, episodeId, episodeData, entity);
    }

    //----------------------------------------------------------------
    private OnEpisodeFinish(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity: EpisodeEntityBase<any>): void {
        this.m_commanderDelegate?.OnEpisodeFinish(key, episodeId, episodeData, entity);
    }

    //----------------------------------------------------------------

}
