import type { Timestamp } from "@bufbuild/protobuf/wkt"

/**
 * 時間格式化系統常量
 */
export namespace TimeFormatConstants {
    /**
     * 預設使用的時區
     */
    export const DEFAULT_TIMEZONE: number = +8

    /**
     * 時間單位轉換（秒）
     */
    export const enum TimeUnit {
        MIN = 60,
        HR = 3600,
        D = 86400,
    }

    export const TIMER_SCHEDULER_KEY: string = "TimeManager_ProcessTasks"

    export const DEBUG_TIME: boolean = false
}

/**
 * 時間轉換工具函數
 */
export namespace TimeConverter {
    /** 將 Protobuf Timestamp 轉換為 Date 物件 */
    export function TimestampToDate(timestamp: Timestamp): Date {
        if (!timestamp) {
            return new Date()
        }

        // Timestamp.seconds 是 bigint 類型，需要轉換為 number
        const seconds: number = Number(timestamp.seconds)
        const nanos: number = timestamp.nanos || 0

        // 將納秒轉換為毫秒並與秒數相加
        const milliseconds: number = seconds * 1000 + Math.floor(nanos / 1000000)

        return new Date(milliseconds)
    }

    /** 將 Date 物件轉換為 Protobuf Timestamp */
    export function DateToTimestamp(date: Date): Timestamp {
        const milliseconds: number = date.getTime()
        const seconds: bigint = BigInt(Math.floor(milliseconds / 1000))
        const nanos: number = (milliseconds % 1000) * 1000000

        return {
            seconds: seconds,
            nanos: nanos
        } as Timestamp
    }
}

/**
 * 任務配置接口
 */
export interface ITimerTask {
    /** 任務唯一標識 */
    name: string
    /** 觸發間隔（秒） */
    triggerInterval: number
    /** 任務持續時間（秒） */
    duration: number
    /** 觸發回調 */
    onTrigger?: (remainingTime?: number) => void
    /** 結束回調 */
    onEnd?: () => void
    /** 下次觸發時間（內部使用） */
    nextTriggerTime?: number
    /** 任務結束時間（內部使用） */
    endTime?: number
}

/**
 * 倒計時回調接口
 */
export interface ICountdownCallback {
    /** 更新回調，每幀呼叫 */
    onUpdate?: (remainingSeconds: number) => void
    /** 結束回調 */
    onComplete?: () => void
}

/**
 * 重置事件接口
 */
export interface IResetCallback {
    /** 事件唯一標識 */
    id: string
    /** 重置回調 */
    onReset: () => void
}
