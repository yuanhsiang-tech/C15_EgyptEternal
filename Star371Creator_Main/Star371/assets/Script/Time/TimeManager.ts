import { error, log } from "cc"
import { ServerTime as ServerTimeInstance } from "./ServerTimeCore"
import { StarkScheduler } from "../../Stark/Scheduler/StarkScheduler"
import { ITimerTask, TimeFormatConstants, ICountdownCallback, IResetCallback } from "./TimeDefine"

/**
 * 任務存储项
 */
class TimerTaskEntry {
    m_primaryTask: ITimerTask
    m_additionalTasks: Map<string, ITimerTask>

    constructor(task: ITimerTask) {
        this.m_primaryTask = task
        this.m_additionalTasks = new Map<string, ITimerTask>()
    }
}

/**
 * 倒計時存储项
 */
class CountdownEntry {
    m_targetTimeMs: number
    m_callback: ICountdownCallback
    m_completed: boolean = false

    constructor(targetTimeMs: number, callback: ICountdownCallback) {
        this.m_targetTimeMs = targetTimeMs
        this.m_callback = callback
    }
}

/**
 * 任務計時器管理器（單例模式）
 */
export class TimeManager {
    private static s_singleton: TimeManager
    private m_taskRegistry: Map<string, TimerTaskEntry>
    private m_resetCallbacks: Map<string, IResetCallback>
    private m_countdowns: Map<string, CountdownEntry>
    private static readonly SCHEDULER_KEY: string = TimeFormatConstants.TIMER_SCHEDULER_KEY

    private m_deubgCD: number = 0

    private constructor() {
        this.m_taskRegistry = new Map<string, TimerTaskEntry>()
        this.m_resetCallbacks = new Map<string, IResetCallback>()
        this.m_countdowns = new Map<string, CountdownEntry>()
        StarkScheduler.Schedule(TimeManager.SCHEDULER_KEY, this._processTasks.bind(this), {
            priority: 0
            // interval 使用預設值 1/60 秒
        })
        this.m_deubgCD = 0
    }

    /**
     * 取得單例實例
     */
    public static GetInstance(): TimeManager {
        if (!this.s_singleton) {
            this.s_singleton = new TimeManager()
        }
        return this.s_singleton
    }

    public static get Instance(): TimeManager {
        return this.GetInstance()
    }

    /**
     * 初始化伺服器時間同步
     */
    public InitializeServerTimeSync(): void {
        try {
            // 註冊時間同步完成事件監聽
            ServerTimeInstance.RegisterSyncHandler(this._onServerTimeSynced.bind(this), TimeManager.Instance)

            // 執行時間同步
            ServerTimeInstance.PerformSync()

            log("TimeManager: 伺服器時間同步已啟動")
        } catch (err) {
            error("TimeManager.InitializeServerTimeSync: 初始化失敗", err)
        }
    }

    /**
     * 添加重置事件監聽
     */
    public AddResetCallback(id: string, callback: IResetCallback): void {
        this.m_resetCallbacks.set(id, callback)
    }

    /**
     * 移除重置事件監聽
     */
    public RemoveResetCallback(id: string): void {
        if (this.m_resetCallbacks.has(id)) {
            this.m_resetCallbacks.delete(id)
        }
    }

    /**
     * 註冊或更新任務
     */
    public RegisterTask(task: ITimerTask): void {
        const currentTimeInSeconds: number = ServerTimeInstance.CurrentTimeMs / 1000

        if (!this.m_taskRegistry.has(task.name)) {
            // 新任務
            task.nextTriggerTime = currentTimeInSeconds + task.triggerInterval
            task.endTime = currentTimeInSeconds + task.duration

            const entry: TimerTaskEntry = new TimerTaskEntry(task)
            this.m_taskRegistry.set(task.name, entry)
        } else {
            // 更新現有任務
            task.nextTriggerTime = currentTimeInSeconds + task.triggerInterval
            task.endTime = currentTimeInSeconds + task.duration
            this.ModifyTask(task.name, task)
        }
    }

    /**
     * 修改任務属性
     */
    public ModifyTask(name: string, updates: Partial<ITimerTask>): void {
        if (this.m_taskRegistry.has(name)) {
            const entry: TimerTaskEntry = this.m_taskRegistry.get(name)
            Object.assign(entry.m_primaryTask, updates)
            this.m_taskRegistry.set(name, entry)
        }
    }

    /**
     * 移除任務
     */
    public RemoveTask(name: string): void {
        if (this.m_taskRegistry.has(name)) {
            this.m_taskRegistry.delete(name)
        }
    }

    /**
     * 為主任務添加附加任務
     */
    public AttachSideTask(mainTaskName: string, sideTask: ITimerTask): string {
        if (this.m_taskRegistry.has(mainTaskName)) {
            const taskId: string = this._createUniqueId()
            const entry: TimerTaskEntry = this.m_taskRegistry.get(mainTaskName)
            entry.m_additionalTasks.set(taskId, sideTask)
            this.m_taskRegistry.set(mainTaskName, entry)
            return taskId
        }
        return null
    }

    /**
     * 移除附加任務
     */
    public DetachSideTask(mainTaskName: string, identifier: ITimerTask | string): void {
        if (this.m_taskRegistry.has(mainTaskName)) {
            const entry: TimerTaskEntry = this.m_taskRegistry.get(mainTaskName)

            if (typeof identifier === 'string') {
                // 通過 ID 移除
                entry.m_additionalTasks.delete(identifier)
            } else if (identifier.name === mainTaskName) {
                // 通過任務目標移除
                entry.m_additionalTasks.forEach((task: ITimerTask, taskId: string) => {
                    if (task === identifier) {
                        entry.m_additionalTasks.delete(taskId)
                    }
                })
            }

            this.m_taskRegistry.set(mainTaskName, entry)
        }
    }

    /**
     * 註冊倒計時
     * @param targetTimeMs 目標時間（毫秒時間戳）
     * @param callback 倒計時回調
     * @returns 倒計時ID，用于後續移除
     */
    public RegisterCountdown(targetTimeMs: number, callback: ICountdownCallback): string {
        const countdownId: string = this._createUniqueId()
        const entry: CountdownEntry = new CountdownEntry(targetTimeMs, callback)
        this.m_countdowns.set(countdownId, entry)
        return countdownId
    }

    /**
     * 移除倒計時
     * @param countdownId 倒計時ID
     */
    public RemoveCountdown(countdownId: string): void {
        if (this.m_countdowns.has(countdownId)) {
            this.m_countdowns.delete(countdownId)
        }
    }

    /**
     * 更新倒計時目標時間
     * @param countdownId 倒計時ID
     * @param targetTimeMs 新的目標時間（毫秒時間戳）
     */
    public UpdateCountdownTarget(countdownId: string, targetTimeMs: number): void {
        if (this.m_countdowns.has(countdownId)) {
            const entry: CountdownEntry = this.m_countdowns.get(countdownId)
            entry.m_targetTimeMs = targetTimeMs
            entry.m_completed = false
            this.m_countdowns.set(countdownId, entry)
        }
    }

    /**
     * 取得目前伺服器時間（毫秒）
     */
    public GetCurrentTimeMs(): number {
        return ServerTimeInstance.CurrentTimeMs
    }

    /**
     * 計算剩餘秒數
     * @param targetTimeMs 目標時間（毫秒時間戳）
     * @returns 剩餘秒數
     */
    public GetRemainingSeconds(targetTimeMs: number): number {
        const remainingMs: number = targetTimeMs - ServerTimeInstance.CurrentTimeMs
        return Math.max(0, Math.ceil(remainingMs / 1000))
    }

    /**
     * @deprecated 請直接導入並使用 ServerTime 模組
     * import { ServerTime } from "../Time/ServerTimeCore"
     * ServerTime.CurrentTimeMs 或 ServerTime.Now
     */
    public GetTime(): number {
        return ServerTimeInstance.CurrentTimeMs
    }
    /**
     * 處理所有任務（每幀呼叫）
     */
    private _processTasks(deltaTime?: number): void {
        const currentTimestamp: number = ServerTimeInstance.CurrentTimeMs / 1000

        // 處理定時任務
        this.m_taskRegistry.forEach((entry: TimerTaskEntry, taskName: string) => {
            try {
                const mainTask: ITimerTask = entry.m_primaryTask

                // 檢查是否到達處發時間
                if (currentTimestamp >= mainTask.nextTriggerTime) {
                    const remainingTime: number = Math.ceil(Math.max(0, mainTask.endTime - currentTimestamp))

                    // 處發主任務
                    if (mainTask.onTrigger && typeof mainTask.onTrigger === 'function') {
                        mainTask.onTrigger(remainingTime)
                    }

                    // 處發所有附加任務
                    entry.m_additionalTasks.forEach((sideTask: ITimerTask, id: string) => {
                        if (sideTask !== null &&
                            sideTask !== undefined &&
                            typeof sideTask.onTrigger === 'function') {
                            sideTask.onTrigger(remainingTime)
                        }
                    })

                    // 更新下次處發時間
                    mainTask.nextTriggerTime += mainTask.triggerInterval
                }

                // 檢查是否到達结束時間
                if (currentTimestamp >= mainTask.endTime) {
                    // 執行主任務結束回調
                    if (mainTask.onEnd && typeof mainTask.onEnd === 'function') {
                        mainTask.onEnd()
                    }

                    // 執行所有附加任務的結束回調
                    entry.m_additionalTasks.forEach((sideTask: ITimerTask, id: string) => {
                        if (sideTask !== null &&
                            sideTask !== undefined &&
                            typeof sideTask.onEnd === 'function') {
                            sideTask.onEnd()
                        }
                    })

                    // 移除已完成的任務
                    this.RemoveTask(taskName)
                }
            } catch (err) {
                error(err)
            }
        })

        // 處理倒計時
        const currentTimeMs: number = ServerTimeInstance.CurrentTimeMs
        this.m_countdowns.forEach((countdown: CountdownEntry, id: string) => {
            try {
                const remainingMs: number = countdown.m_targetTimeMs - currentTimeMs
                const remainingSeconds: number = Math.max(0, Math.ceil(remainingMs / 1000))

                // 呼叫更新回調
                if (countdown.m_callback?.onUpdate && typeof countdown.m_callback.onUpdate === 'function') {
                    countdown.m_callback.onUpdate(remainingSeconds)
                }

                // 檢查是否完成
                if (remainingMs <= 0 && !countdown.m_completed) {
                    countdown.m_completed = true
                    if (countdown.m_callback?.onComplete && typeof countdown.m_callback.onComplete === 'function') {
                        countdown.m_callback.onComplete()
                    }
                }
            } catch (err) {
                error(err)
            }
        })

        if(TimeFormatConstants.DEBUG_TIME) {
            this.m_deubgCD += deltaTime
            if(this.m_deubgCD >= 1) {
                this.m_deubgCD = 0
                log("TimeManager: 每幀呼叫", {
                    currentTimestamp: currentTimestamp,
                    currentTimeMs: currentTimeMs,
                    currentTime: ServerTimeInstance.Now.toISOString(),
                    nowTime: new Date().toISOString(),
                    nowTimeMs: Date.now(),
                    timeOffsetMs: ServerTimeInstance.TimeOffsetMs,
                })
            }
        }
    }

    /**
     * 生成唯一UID
     */
    private _createUniqueId(): string {
        const timestamp: string = Date.now().toString(36)
        const randomPart: string = Math.random().toString(36).substring(2, 15)
        const randomPart2: string = Math.random().toString(36).substring(2, 15)
        return `${timestamp}-${randomPart}-${randomPart2}`
    }

    /**
     * 伺服器時間同步完成回調
     */
    private _onServerTimeSynced(serverDate: Date): void {
        log("TimeManager: 伺服器時間同步完成", {
            serverTime: serverDate.toISOString(),
            localTime: new Date().toISOString(),
            offset: ServerTimeInstance.CurrentTimeMs - Date.now()
        })

        // 可以在這裡觸發其他需要在時間同步後執行的邏輯
        this._onTimeSystemReady()
    }

    /**
     * 時間系統就緒後的處理
     */
    private _onTimeSystemReady(): void {
        // 觸發所有重置回調，通知系統時間已就緒
        this.m_resetCallbacks.forEach((callback: IResetCallback) => {
            try {
                if (callback.onReset && typeof callback.onReset === 'function') {
                    callback.onReset()
                }
            } catch (err) {
                error("TimeManager.OnTimeSystemReady: 回調執行失敗", err)
            }
        })
    }
}


