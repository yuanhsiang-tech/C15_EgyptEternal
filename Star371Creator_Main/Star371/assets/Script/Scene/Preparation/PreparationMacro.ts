
export namespace Preparations {

    /**
     * 準備工作的結果
     */
    export enum RESULT_TYPE {
        UNKNOWN,    // 未知
        MISSING,    // 遺失
        FAIL,       // 失敗
        TIMEOUT,    // 逾時
        SUCCESS,    // 成功
        CANCEL,     // 取消
    }

    /**
     * 工作完成的回呼
     */
    export type ResolveCallback<T> = (result: RESULT_TYPE, data?: T) => void;

}
