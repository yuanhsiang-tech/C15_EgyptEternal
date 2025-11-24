import { director, error, Scheduler, warn } from "cc"

//----------------------------------------------------------------

type ProcessFunction = (dt?: number) => void | boolean

export type StarkSchedulable = (
    Function |
    ProcessFunction |
    { update(dt?: number): void | boolean } |
    { ProcessLoop(dt?: number): void | boolean }
)

/**
 * 調度器选项配置
 */
export interface SchedulerOption {
    /** 优先级 (越小越先執行) */
    priority?: number
    /** 執行間隔（秒），預設 1/60 秒 */
    interval?: number
    /** 是否自处理模式（返回 true 表示完成並自动移除） */
    isSelfHandle?: boolean
}

//----------------------------------------------------------------

/**
 * Stark 調度系统
 */
export namespace StarkScheduler {
    /**
     * 檢查目標是否已調度
     */
    export function IsScheduled(key: string): boolean {
        return StarkSchedulerImpl.GetInstance().IsScheduled(key)
    }

    /**
     * 調度一个目標
     * @param key 唯一標識
     * @param target 目標目標或函數
     * @param option 調度选项
     */
    export function Schedule(key: string, target: StarkSchedulable, option?: SchedulerOption): void {
        StarkSchedulerImpl.GetInstance().AddItem(key, target, option)
    }

    /**
     * 取消調度
     * @param key 唯一標識
     */
    export function Unschedule(key: string): void {
        StarkSchedulerImpl.GetInstance().RemoveItem(key)
    }

    /**
     * 清空所有調度
     */
    export function Clear(): void {
        StarkSchedulerImpl.GetInstance().ClearAll()
    }
}

//----------------------------------------------------------------

interface ScheduleItem {
    Id: number
    Key: string
    Priority: number
    Interval: number
    IsSelfHandle: boolean
    Target: StarkSchedulable
    Process: ProcessFunction
    NextTime: number  // 下次執行時間戳（秒）
}

/**
 * 主調度器实現（單例模式）
 */
class StarkSchedulerImpl {
    //----------------------------------------------------------------

    private static instance: StarkSchedulerImpl = null

    private m_idCounter: number = 0
    private m_itemMap: Map<string, ScheduleItem> = null
    private m_itemList: ScheduleItem[] = null
    private m_processQueue: ScheduleItem[] = null
    private m_processDirty: boolean = false
    private m_isScheduling: boolean = false
    private m_removeQueue: string[] = null

    //----------------------------------------------------------------

    private constructor() {
        Scheduler.enableForTarget(this)
        this.m_itemMap = new Map<string, ScheduleItem>()
        this.m_itemList = []
        this.m_processQueue = []
        this.m_removeQueue = []
    }

    //----------------------------------------------------------------
    // Singleton instance getter
    public static GetInstance(): StarkSchedulerImpl {
        if (!StarkSchedulerImpl.instance) {
            StarkSchedulerImpl.instance = new StarkSchedulerImpl()
        }
        return StarkSchedulerImpl.instance
    }

    //----------------------------------------------------------------
    // Implementation of cc.ISchedulable
    public update(dt: number): void {
        this.m_processDirty && this.RefreshQueue()

        // 取得目前時間戳（秒）
        const now = Date.now() / 1000

        this.m_processQueue.forEach(item => {
            try {
                // 檢查是否到達執行時間
                if (now >= item.NextTime) {
                    // 執行处理函數
                    const result = item.Process(dt)

                    // 計算下次執行時間
                    item.NextTime = now + item.Interval

                    // 如果是自处理模式且返回 true，则標记為需要移除
                    if (item.IsSelfHandle && result === true) {
                        this.m_removeQueue.push(item.Key)
                    }
                }
            } catch (err) {
                error("[Stark-Scheduler] update: Error in process function.", err)
            }
        })

        // 处理需要移除的项目
        if (this.m_removeQueue.length > 0) {
            this.m_removeQueue.forEach(key => {
                this.RemoveItem(key)
            })
            this.m_removeQueue = []
        }
    }

    //----------------------------------------------------------------
    // Check if the target is scheduled
    public IsScheduled(key: string): boolean {
        return this.m_itemMap.has(key)
    }

    //----------------------------------------------------------------
    // Add or update a target
    public AddItem(key: string, target: StarkSchedulable, option?: SchedulerOption): void {
        const priority = option?.priority ?? 0
        const interval = option?.interval ?? (1 / 60)  // 預設 1/60 秒
        const isSelfHandle = option?.isSelfHandle ?? false

        // 取得目前時間戳（秒）
        const now = Date.now() / 1000

        // 如果 key 已存在，更新整个项目
        if (this.m_itemMap.has(key)) {
            const oldItem = this.m_itemMap.get(key)

            // 创建新的处理函數
            const processFunc = this.CreateProcessFunction(target)

            if (processFunc) {
                // 更新所有属性
                oldItem.Priority = priority
                oldItem.Interval = interval
                oldItem.IsSelfHandle = isSelfHandle
                oldItem.Target = target
                oldItem.Process = processFunc
                oldItem.NextTime = now + interval  // 計算下次執行時間

                this.m_processDirty = true
            } else {
                warn("[Stark-Scheduler] AddItem: Invalid target for existing key.", key)
            }
        }
        // 添加新目標
        else {
            const processFunc = this.CreateProcessFunction(target)

            if (processFunc) {
                const item: ScheduleItem = {
                    Id: ++this.m_idCounter,
                    Key: key,
                    Priority: priority,
                    Interval: interval,
                    IsSelfHandle: isSelfHandle,
                    Target: target,
                    Process: processFunc,
                    NextTime: now + interval,  // 計算下次執行時間
                }
                this.m_itemMap.set(key, item)
                this.m_itemList.push(item)
                this.m_processDirty = true
            } else {
                warn("[Stark-Scheduler] AddItem: Invalid target.", target)
            }
        }

        !this.m_isScheduling && this.m_processDirty && this.RefreshQueue()
    }

    //----------------------------------------------------------------
    // Create process function from target
    private CreateProcessFunction(target: StarkSchedulable): ProcessFunction | null {
        if (target === undefined || target === null) {
            return null
        } else if (typeof target === "function") {
            return (dt?: number) => target(dt)
        } else if (typeof target === "object" && "update" in target && typeof target.update === "function") {
            return (dt?: number) => target.update(dt)
        } else if (typeof target === "object" && "ProcessLoop" in target && typeof target.ProcessLoop === "function") {
            return (dt?: number) => target.ProcessLoop(dt)
        }
        return null
    }

    //----------------------------------------------------------------
    // Remove a target
    public RemoveItem(key: string): void {
        if (this.m_itemMap.has(key)) {
            this.m_itemMap.delete(key)
            this.m_itemList = this.m_itemList.filter(item => item.Key !== key)
            this.m_processDirty = true
        }
    }

    //----------------------------------------------------------------
    // Clear all items
    public ClearAll(): void {
        this.m_itemMap.clear()
        this.m_itemList = []
        this.m_processDirty = true
        this.RefreshQueue()
    }

    //----------------------------------------------------------------
    // Refresh the process queue
    private RefreshQueue(): void {
        // 排序列表
        if (this.m_itemList.length > 0) {
            this.m_itemList.sort((a, b) => {
                if (a.Priority == b.Priority) {
                    return a.Id - b.Id
                } else {
                    return a.Priority - b.Priority
                }
            })
        }

        // 刷新处理队列
        this.m_processQueue = this.m_itemList.slice()
        const wasScheduling = this.m_isScheduling
        this.m_isScheduling = this.m_processQueue.length > 0

        // 調度或取消調度更新
        if (this.m_isScheduling && !wasScheduling) {
            director.getScheduler().scheduleUpdate(this, 0, false)
        } else if (!this.m_isScheduling && wasScheduling) {
            director.getScheduler().unscheduleUpdate(this)
        }

        // 清除脏標志
        this.m_processDirty = false
    }

    //----------------------------------------------------------------
}

