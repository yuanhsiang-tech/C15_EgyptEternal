import { Director } from "cc";

// 應該是照執行順序排列的 (上面的先，網頁版測起來是這樣，但裝置可能不同)
declare type UpdateEvents = (
    typeof Director.EVENT_BEFORE_UPDATE |
    typeof Director.EVENT_AFTER_UPDATE |
    typeof Director.EVENT_BEFORE_PHYSICS |
    typeof Director.EVENT_AFTER_PHYSICS |
    typeof Director.EVENT_BEFORE_DRAW |
    typeof Director.EVENT_BEFORE_COMMIT |
    typeof Director.EVENT_BEFORE_RENDER |
    typeof Director.EVENT_AFTER_RENDER |
    typeof Director.EVENT_AFTER_DRAW
);

//================================================================================================
/**
 * - 功能
 * > 讓更新函數延遲觸發，避免過於頻繁的更新
 * 
 * - 使用方式
 * > 1. 創建 `LazyUpdating` 實例
 * > 2. 使用 `UpdateFunc` 更換與設定更新函數
 * > 3. 使用 `UpdateEvent` 更換與設定更新事件
 * > 4. 使用 `Update(force?)` 觸發更新，若強制更新會立即執行更新函數並取消延遲
 * > 5. 使用 `Cancel` 取消更新
 * 
 * - 範例
 * ```typescript
 * let lazyUpdate = new LazyUpdating( () => log("reload data...") );
 * lazyUpdate.Update(); // 觸發更新
 * lazyUpdate.Cancel(); // 取消更新
 * ```
 */
//================================================================================================

export class LazyUpdating {

    //----------------------------------------------------------------

    private m_updateFunc    :Function       = null;
    private m_updateEvent   :UpdateEvents   = null;
    private m_shouldUpdate  :boolean        = false;

    //----------------------------------------------------------------
    /**
     * @param updateFunc  更新函數
     * @param firstUpdate 是否立即更新，預設為 `false`
     * @param updateEvent 更新事件，預設為引擎渲染前觸發 (`Director.EVENT_BEFORE_DRAW`)
     */
    constructor(updateFunc?: Function, firstUpdate?: boolean, updateEvent?: UpdateEvents) {
        this.m_updateFunc   = updateFunc;
        this.m_updateEvent  = updateEvent ?? Director.EVENT_BEFORE_DRAW;
        this.ShouldUpdate   = firstUpdate ?? false;
    }

    //----------------------------------------------------------------
    /** 更新函數 */
    public get UpdateFunc(): Function {
        return this.m_updateFunc;
    }
    public set UpdateFunc(func: Function) {
        this.m_updateFunc = func;
    }

    //----------------------------------------------------------------
    /** 更新事件 (請參考 `Director.EVENT_...`) */
    public get UpdateEvent(): UpdateEvents {
        return this.m_updateEvent;
    }
    public set UpdateEvent(event: UpdateEvents) {
        if (this.m_updateEvent !== event) {
            this.m_shouldUpdate && Director.instance.off( this.m_updateEvent, this.OnUpdateEvent, this );
            this.m_updateEvent = event;
            this.m_shouldUpdate && Director.instance.once( this.m_updateEvent, this.OnUpdateEvent, this );
        }
    }

    //----------------------------------------------------------------
    /** 是否將要更新 */
    public get WillUpdate(): boolean {
        return this.m_shouldUpdate;
    }

    //----------------------------------------------------------------
    /** 是否應該更新 */
    private set ShouldUpdate(bool: boolean) {
        if (this.m_shouldUpdate !== bool) {
            this.m_shouldUpdate = bool;
            if (this.m_shouldUpdate) {
                Director.instance.once( this.m_updateEvent, this.OnUpdateEvent, this );
            } else {
                Director.instance.off( this.m_updateEvent, this.OnUpdateEvent, this );
            }
        }
    }

    //----------------------------------------------------------------
    /**
     * 觸發更新
     * @param force 是否強制更新
     */
    public Update(force: boolean = false): void {
        if (force) {
            this.DoUpdate();
        } else {
            this.ShouldUpdate = true;
        }
    }

    //----------------------------------------------------------------
    /** 取消更新 */
    public Cancel(): void {
        this.ShouldUpdate = false;
    }

    //----------------------------------------------------------------
    /** 收到更新事件 */
    private OnUpdateEvent(): void {
        this.DoUpdate();
    }

    //----------------------------------------------------------------
    /** 執行更新 */
    private DoUpdate(): void {
        this.ShouldUpdate = false;
        this.m_updateFunc?.();
    }

    //----------------------------------------------------------------

}
