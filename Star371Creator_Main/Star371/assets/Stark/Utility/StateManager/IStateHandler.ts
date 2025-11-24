/**
 * 狀態處理器接口
 */
export interface IStateHandler {
    /**
     * 進入狀態時呼叫
     * @param prevState 前一個狀態
     */
    OnEnter?: (prevState: number) => void

    /**
     * 離開狀態時呼叫
     * @param nextState 下一個狀態
     */
    OnLeave?: (nextState: number) => void

    /**
     * 處理狀態時呼叫
     * @param dt Delta time (單位：秒)
     */
    OnProcess?: (dt: number) => void
}

