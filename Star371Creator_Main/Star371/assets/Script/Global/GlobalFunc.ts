import { _decorator, log, director, ISchedulable, Scheduler, isValid, warn } from 'cc'
import { EventDispatcher, EventHandler } from '../../Stark/Utility/EventDispatcher'


/**
 * Global utility functions
 */

export namespace GlobalFunc {

    // 事件監聽器的句柄，用於追蹤和移除監聽器
    export interface EventListenerHandle {
        eventName: string
        handler: EventHandler
        target: any
        handlerKey: string
    }

    // 靜態代理物件，作為 EventDispatcher 的 target
    class EventProxy {
        // 存儲原始回調函數的映射，使用唯一 key
        private callbackMap: Map<string, EventHandler> = new Map()

        // 註冊回調函數映射
        public registerCallback(key: string, originalCallback: EventHandler): void {
            this.callbackMap.set(key, originalCallback)
        }

        // 移除回調函數映射
        public unregisterCallback(key: string): void {
            this.callbackMap.delete(key)
        }

        // 執行指定的回調函數
        public executeCallback(key: string, ...args: any[]): void {
            const originalCallback = this.callbackMap.get(key)
            if (originalCallback) {
                originalCallback(...args)
            }
        }
    }

    // 全域共用的事件代理實例
    const s_eventProxy = new EventProxy()

    // 用於生成唯一 key 的計數器
    let s_handlerKeyCounter = 0

    /**
     * 發送事件
     * @param eventName 事件名稱
     * @param content 事件內容
     * @param dontPrint 是否不打印日誌
     */
    export function DispatchEvent(eventName: string, content?: any, dontPrint?: boolean): void {
        if (!dontPrint) {
            log(`[DispatchEvent] 事件名稱：${eventName}`)
        }

        if (eventName) {
            EventDispatcher.Shared.Dispatch(eventName, content)
        } else {
            log(`[DispatchEvent] 未正確填入事件名稱：${eventName}`)
        }
    }

    /**
     * 添加自定義事件監聽器
     * @param listenTableEvent 要監聽的事件名稱陣列
     * @param onReceiveAck 事件回調函數
     * @returns 返回監聽器句柄陣列，用於後續移除
     */
    export function AddCustomEventListener(
        listenTableEvent: string[],
        onReceiveAck: EventHandler
    ): EventListenerHandle[] {
        const registeredListeners: EventListenerHandle[] = []

        for (let i = 0; i < listenTableEvent.length; i++) {
            const eventName = listenTableEvent[i]
            log(`[AddCustomEventListener] 加入事件監聽 i:${i} 事件名稱：${eventName}`)

            // 生成唯一的 handler key
            const handlerKey = `handler_${s_handlerKeyCounter++}`

            // 創建包裝函數，該函數會在 EventProxy 的上下文中執行
            const wrappedHandler = function (this: EventProxy, content?: any) {
                // 透過 EventProxy 來執行原始回調
                this.executeCallback(handlerKey, content)
            }

            // 註冊回調函數映射
            s_eventProxy.registerCallback(handlerKey, onReceiveAck)

            // 註冊事件監聽器
            EventDispatcher.Shared.On(eventName, wrappedHandler, s_eventProxy)

            // 記錄監聽器句柄
            const handle: EventListenerHandle = {
                eventName: eventName,
                handler: wrappedHandler,
                target: s_eventProxy,
                handlerKey: handlerKey
            }
            registeredListeners.push(handle)
        }

        return registeredListeners
    }

    /**
     * 移除自定義事件監聽器
     * @param registeredListeners 要移除的監聽器句柄陣列
     */
    export function RemoveCustomEventListener(registeredListeners: EventListenerHandle[]): void {
        if (!registeredListeners) {
            return
        }

        for (let i = 0; i < registeredListeners.length; i++) {
            const listener = registeredListeners[i]

            // 從 EventDispatcher 移除監聽器
            EventDispatcher.Shared.Off(listener.eventName, listener.handler, listener.target)

            // 從 EventProxy 移除回調函數映射
            s_eventProxy.unregisterCallback(listener.handlerKey)
        }
    }

    // 定時器句柄，用於取消定時器
    export interface TimeoutHandle {
        id: number
        target: ISchedulable
        callback: Function
        isValid: boolean
    }

    // 定時器目標類別，用於 Scheduler
    class TimeoutTarget implements ISchedulable {
        public id?: string
        public callback: Function
        public timeoutId: number

        constructor(callback: Function, timeoutId: number) {
            this.callback = callback
            this.timeoutId = timeoutId
        }

        // Scheduler 會呼叫這個方法
        public executeTimeout(): void {
            if (this.callback) {
                try {
                    this.callback()
                } catch (error) {
                    error(`[SetTimeOut] 執行回調時發生錯誤:`, error)
                }

                // 標記該定時器句柄為無效
                const handle = s_timeoutHandles.get(this.timeoutId)
                if (handle) {
                    handle.isValid = false
                    s_timeoutHandles.delete(this.timeoutId)
                }
            }
        }
    }

    // 存儲所有活動的定時器句柄
    const s_timeoutHandles: Map<number, TimeoutHandle> = new Map()

    // 用於生成唯一定時器 ID
    let s_timeoutIdCounter = 0

    /**
     * 設定延遲執行的定時器（類似於 setTimeout）
     * @param callback 要執行的回調函數
     * @param delay 延遲時間（毫秒）
     * @returns 返回定時器句柄，可用於取消定時器
     */
    export function SetTimeOut(callback: Function, delay: number): TimeoutHandle {
        // 生成唯一的定時器 ID
        const timeoutId = ++s_timeoutIdCounter

        // 創建定時器目標
        const timeoutTarget = new TimeoutTarget(callback, timeoutId)

        // 啟用 Scheduler 目標（使用靜態方法）
        Scheduler.enableForTarget(timeoutTarget)

        // 創建定時器句柄
        const handle: TimeoutHandle = {
            id: timeoutId,
            target: timeoutTarget,
            callback: callback,
            isValid: true
        }

        // 存儲句柄
        s_timeoutHandles.set(timeoutId, handle)

        // 使用 Scheduler 排程定時器
        // delay 從毫秒轉換為秒，repeat = 0 表示只執行一次
        const delayInSeconds = delay / 1000
        director.getScheduler().schedule(
            timeoutTarget.executeTimeout,   // 回調函數
            timeoutTarget,                  // 目標目標
            0,                              // interval (0 = 每幀檢查，但會在 delay 後執行)
            1,                              // repeat (1 = 只執行一次)
            delayInSeconds,                 // delay (延遲時間，秒)
            false                           // paused (是否暫停)
        )

        log(`[SetTimeOut] 設定定時器 ID: ${timeoutId}, 延遲: ${delay}ms`)
        return handle
    }

    /**
     * 取消延遲執行的定時器（類似於 clearTimeout）
     * @param handle 要取消的定時器句柄
     */
    export function ClearTimeOut(handle: TimeoutHandle | null | undefined): void {
        if (!handle || !handle.isValid) {
            return
        }

        try {
            // 從 Scheduler 中取消定時器
            director.getScheduler().unscheduleAllForTarget(handle.target)

            // 標記句柄為無效
            handle.isValid = false

            // 從存儲中移除
            s_timeoutHandles.delete(handle.id)

            log(`[ClearTimeOut] 取消定時器 ID: ${handle.id}`)
        } catch (error) {
            error(`[ClearTimeOut] 取消定時器時發生錯誤:`, error)
        }
    }

    /**
     * 清除所有活動的定時器
     */
    export function ClearAllTimeouts(): void {
        const activeCount = s_timeoutHandles.size

        s_timeoutHandles.forEach(handle => {
            if (handle.isValid) {
                try {
                    director.getScheduler().unscheduleAllForTarget(handle.target)
                    handle.isValid = false
                } catch (error) {
                    error(`[ClearAllTimeouts] 取消定時器 ${handle.id} 時發生錯誤:`, error)
                }
            }
        })

        s_timeoutHandles.clear()
        log(`[ClearAllTimeouts] 已清除 ${activeCount} 個活動定時器`)
    }
}

namespace Gt2 {
    export function _FUNCTION_(obj: any): string {
        if (!isValid(obj))
            return ""

        if (isValid(obj.construtctor))
            return '[' + obj.constructor.name + ']'

        if (isValid(obj.__classname__))
            return '[' + obj.__classname__ + ']'

        if (isValid(obj.name))
            return '[' + obj.name + ']'

        return ""
    }

    export function namespace(NS_String: string): any {
        let parts = NS_String.split('.')
        let parent = Gt2;

        if (parts[0] == "Gt2")   //去掉最前面的Gt2全域名稱
        {
            parts = parts.slice(1)
        }

        for (let i = 0; i < parts.length; i++) {
            // 如果屬性不存在則建立
            if (typeof parent[parts[i]] == "undefined") {
                parent[parts[i]] = {}
            }
            parent = parent[parts[i]]
        }
        return parent
    }

    export const INVALID_GAME_ID = -1
    export const INVALID_THEME_ID = -1
    export const INVALID_GAME_KIND = -3
    export const INVALID_ROOM_INDEX = -1
    export const INVALID_ACCOUNT_ID = 0
    export const MAX_ACCOUNT_ID = 0xffffffff

    export function Assert(condition: boolean, msg: string): void {
        if (!condition)
            throw new Error(msg)
    }

    export function Clone(obj: any): any {
        // Handle simple types, and null or undefined
        if (null === obj || "object" != typeof obj) return obj
        // Handle Date
        if (obj instanceof Date) {
            const copy = new Date()
            copy.setTime(obj.getTime())
            return copy
        }

        if (obj instanceof Map) {
            const copy = new Map(obj)
            return copy
        }

        if (obj instanceof Set) {
            const copy = new Set(obj)
            return copy;
        }

        // Handle Array
        if (obj instanceof Array) {
            const copy = [];
            for (let i = 0, len = obj.length; i < len; ++i) {
                copy[i] = Clone(obj[i])
            }
            return copy
        }

        // Handle RegExp
        if (obj instanceof RegExp) {
            let flags = ""
            flags += obj.global ? 'g' : ''
            flags += obj.ignoreCase ? 'i' : ''
            flags += obj.multiline ? 'm' : ''
            return new RegExp(obj.source, flags)
        }

        // Handle Number / Boolean / String
        if (obj instanceof Number || obj instanceof Boolean || obj instanceof String) {
            const copy = obj.valueOf();
            return copy
        }

        // Handle Object
        if (obj instanceof Object) {
            const copy = {}
            for (const attr in obj) {
                if (obj.hasOwnProperty(attr))
                    copy[attr] = Clone(obj[attr])
            }
            return copy
        }
        throw new Error("Unable to copy obj! Its type isn't supported.")
    }

    /**
     * IsFunction 可以判斷某個變數名稱 是否為function
     * 這版本目前有個問題,如果該變數名稱根本不存在 會當掉
     * 但如果存在,則可以正確判斷是否為function,及使名稱內的東西是 undefined 或者 null都可以正確判斷出來
     * 附上範例程式
     * 
     *  var foo
     *  cc.log(foo)  		///undefined
     *  Gt2.IsFunction(foo);	///false
     *  foo = null;
     *  cc.log(foo);		///null
     *  Gt2.IsFunction(foo);	///false
     *  foo = function(){};
     *  Gt2.IsFunction(foo);	///true
     *  但如果對於根本沒宣告過的名稱測試 則
     *  IsFunction(foo2);		///throw exception (簡稱 當機)
     */
    export function IsFunction(target: any): boolean {
        if (typeof (target) === undefined || target === null) {
            return false
        }
        return Object.prototype.toString.call(target) === '[object Function]'
    }

    /**
     * 淺層拷貝,為物漸增加參數
     * target: 要增加參數的物件
     * data: 參數來源物件
     */
    export function Assign(target, data) {
        for (const prop in data) {
            target[prop] = data[prop]
        }
    }

    export const JSON =
    {
        parse: function (str: string): any {
            try {
                return JSON.parse(str)
            } catch (err) {
                warn(err)
                return undefined
            }
        }
    }
}

export default Gt2