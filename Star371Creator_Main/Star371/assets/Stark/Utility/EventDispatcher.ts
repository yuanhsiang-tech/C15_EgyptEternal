import { error, isValid } from "cc"

export type EventHandler = ((...args: any[]) => void) | Function

// 定義事件監聽器的結構，包括處理函數和其關聯的目標。
type EventListener = {
    handler: Function | EventHandler
    target: any
}

/**
 * 事件調度器，用於訂閱和派發事件。
 * - 可以自行創建事件調度器`new EventDispatcher()`管理局部事件。
 * - `EventDispatcher.Shared` 是全域共用的事件調度器。
 */
export class EventDispatcher {

    //----------------------------------------------------------------

    private static s_shared: EventDispatcher = null

    /** 全域共用的事件調度器 */
    public static get Shared(): EventDispatcher {
        return this.s_shared || (this.s_shared = new EventDispatcher())
    }

    //----------------------------------------------------------------

    // 為每個事件保存事件監聽器。事件作為這個記錄的鍵。
    private m_events: Record<string, EventListener[]> = {}

    // 保存一次性事件監聽器，與_events類似，但用於只觸發一次的事件。
    private m_onceEvents: Record<string, EventListener[]> = {}

    //----------------------------------------------------------------

    /**
     * 將處理器訂閱到具有可選目標上下文的事件。
     * @param event 要訂閱的事件名稱。
     * @param handler 當事件被派發時要調用的函數。
     * @param target 執行處理器應該在其中的上下文（在類中使用時通常是`this`）。
     */
    public On(event: string, handler: EventHandler, target: any): void {
        if (!isValid(target, true)) {
            error("Invalid target for event: " + event)
            return
        }
        const listener: EventListener = { handler, target }
        if (!this.m_events[event]) {
            this.m_events[event] = []
        }
        this.m_events[event].push(listener)
    }

    //----------------------------------------------------------------

    /**
     * 將處理器訂閱到事件上，用於單一執行。執行一次後，處理器自動被移除。
     * @param event 要訂閱的事件名稱。
     * @param handler 當事件被派發時要調用一次的函數。
     * @param target 執行處理器應該在其中的上下文（在類中使用時通常是`this`）。
     */
    public Once(event: string, handler: EventHandler, target: any): void {
        if (!isValid(target, true)) {
            error("Invalid target for event: " + event)
            return
        }
        const listener: EventListener = { handler, target }
        if (!this.m_onceEvents[event]) {
            this.m_onceEvents[event] = []
        }
        this.m_onceEvents[event].push(listener)
    }

    //----------------------------------------------------------------

    /**
     * 從事件中移除一個處理器。如果沒有指定處理器和目標，則移除該事件的所有處理器。
     * @param event 要取消訂閱的事件名稱。
     * @param handler 要從事件中移除的處理函數（可選）。
     * @param target 要移除的處理器的上下文（可選）。當涉及到多個實例時，用於確保正確的處理器被移除。
     */
    public Off(event: string, handler?: EventHandler, target?: any): void {
        if (!handler && !target) {
            // 移除該事件的所有處理器
            delete this.m_events[event]
            delete this.m_onceEvents[event]
        } else if (handler && target) {
            // 移除匹配 handler 和 target 的
            let filteredEvents = this.m_events[event]?.filter(listener =>
                !(listener.handler === handler && listener.target === target)
            ) || []
            if (filteredEvents.length > 0) {
                this.m_events[event] = filteredEvents
            } else {
                delete this.m_events[event]
            }
            let filteredOnce = this.m_onceEvents[event]?.filter(listener =>
                !(listener.handler === handler && listener.target === target)
            ) || []
            if (filteredOnce.length > 0) {
                this.m_onceEvents[event] = filteredOnce
            } else {
                delete this.m_onceEvents[event]
            }
        } else if (handler) {
            // 移除匹配 handler 的
            let filteredEvents = this.m_events[event]?.filter(listener =>
                listener.handler !== handler
            ) || []
            if (filteredEvents.length > 0) {
                this.m_events[event] = filteredEvents
            } else {
                delete this.m_events[event]
            }
            let filteredOnce = this.m_onceEvents[event]?.filter(listener =>
                listener.handler !== handler
            ) || []
            if (filteredOnce.length > 0) {
                this.m_onceEvents[event] = filteredOnce
            } else {
                delete this.m_onceEvents[event]
            }
        } else if (target) {
            // 移除匹配 target 的
            let filteredEvents = this.m_events[event]?.filter(listener =>
                listener.target !== target
            ) || []
            if (filteredEvents.length > 0) {
                this.m_events[event] = filteredEvents
            } else {
                delete this.m_events[event]
            }
            let filteredOnce = this.m_onceEvents[event]?.filter(listener =>
                listener.target !== target
            ) || []
            if (filteredOnce.length > 0) {
                this.m_onceEvents[event] = filteredOnce
            } else {
                delete this.m_onceEvents[event]
            }
        }
    }

    //----------------------------------------------------------------

    /**
     * 派發一個事件，導致所有訂閱該事件的處理器運行。
     * 用`Once`訂閱的處理器在執行後被移除。
     * @param event 要派發的事件名稱。
     * @param args 傳遞給事件處理器的參數。
     */
    public Dispatch(event: string, ...args: any[]): void {
        // Dispatch to regular event handlers, removing invalid ones
        if (this.m_events[event]) {
            const listeners = this.m_events[event]
            const invalidIndices: number[] = []
            listeners.forEach((listener, index) => {
                if (isValid(listener.target, true)) {
                    listener.handler.apply(listener.target, args)
                } else {
                    invalidIndices.push(index)
                }
            })
            // Remove invalid listeners in reverse order to preserve indices
            for (let i = invalidIndices.length - 1; i >= 0; i--) {
                listeners.splice(invalidIndices[i], 1)
            }
            if (listeners.length === 0) {
                delete this.m_events[event]
            }
        }

        // Dispatch to one-time event handlers, calling valid ones, then remove
        if (this.m_onceEvents[event]) {
            this.m_onceEvents[event].forEach(listener => {
                if (isValid(listener.target, true)) {
                    listener.handler.apply(listener.target, args)
                }
            })
            delete this.m_onceEvents[event]
        }
    }

    //----------------------------------------------------------------
    /**
     * 清除所有事件監聽器。
     */
    public Clear(): void {
        this.m_events = {}
        this.m_onceEvents = {}
    }

    //----------------------------------------------------------------

}