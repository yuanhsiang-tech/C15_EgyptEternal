import { log } from "cc";
import { Define } from "../../Define/GeneralDefine";
import { Device } from "../../Device/Device";
import { Preparations } from "./PreparationMacro";

/**
 * 準備工作
 * - {@link Prepare}: 進入點，從這裡開始執行準備工作
 * - {@link Resolve}: 完成準備工作，一定要呼叫並設定結果
 */
export abstract class Preparation<T, U> {

    //----------------------------------------------------------------
    /** 準備工作的 Key */
    public abstract readonly Key: string;

    /** 執行準備工作 */
    public abstract Prepare(sceneOrientation?: Device.Orientation): void;

    //----------------------------------------------------------------
    /** 每幀處理 */
    public Process?(dt: number): void;

    /** 準備工作完成時的處理 */
    protected OnResolved?(type: Preparations.RESULT_TYPE, data?: U): U;

    /** Timeout 的時間 (秒) */
    public readonly TimeoutTime?: number;

    /** 回傳 true 表示此準備工作只要有 Resolve 就算完成 */
    public readonly IsLenient?: boolean;

    //----------------------------------------------------------------

    constructor( initConfig?: T, resolvedCb?: Preparations.ResolveCallback<U> ) {
        this.m_initConfig = initConfig;
        this.m_resolvedCb = resolvedCb;
    }

    //----------------------------------------------------------------

    private m_initConfig: T = null;
    private m_isResolved: boolean = false;
    private m_resultType: Preparations.RESULT_TYPE = Preparations.RESULT_TYPE.UNKNOWN;
    private m_resultData: U = null;
    private m_resolveMsg: string = '';
    private m_resolvedCb: Preparations.ResolveCallback<U> = null;

    //----------------------------------------------------------------
    /** 初始化設定檔 */
    public get InitConfig(): T {
        return this.m_initConfig;
    }

    /** 是否已完成準備工作 */
    public get IsResolved(): boolean {
        return this.m_isResolved;
    }

    /** 準備工作的結果 */
    public get ResultType(): Preparations.RESULT_TYPE {
        return this.m_resultType;
    }

    /** 準備工作的結果資料 */
    public get ResultData(): U {
        return this.m_resultData;
    }

    /** 是否已準備就緒 */
    public get IsReady(): boolean {
        return this.m_isResolved && (this.IsLenient || this.ResultType >= Preparations.RESULT_TYPE.SUCCESS);
    }

    /** 準備工作的訊息 */
    public get Message(): string {
        return this.m_resolveMsg;
    }

    //----------------------------------------------------------------
    /**
     * 完成準備工作
     * @param type 結果
     */
    public Resolve( type: Preparations.RESULT_TYPE, data?: U, message?: string ): void {
        if (this.m_isResolved || type == Preparations.RESULT_TYPE.UNKNOWN) {
            return;
        }

        this.m_isResolved = true;
        this.m_resultType = type;
        this.m_resolveMsg = message || '';
        this.m_resultData = this.OnResolved?.(type, data) ?? data;
        this.m_resolvedCb?.(this.m_resultType, this.m_resultData);
    }

    //----------------------------------------------------------------
    /**
     * 檢查是否逾時
     * @param elapsedTime 已過時間 (秒)
     */
    public IsTimeout( elapsedTime: number ): boolean {
        if (this.TimeoutTime > 0) {
            return elapsedTime >= this.TimeoutTime;
        } else {
            return elapsedTime >= Define.Timeout.PREPARATION;
        }
    }

    //----------------------------------------------------------------
    /** 印出 Log */
    public PrintLog(): void {
        log(`Preparation[ ${this.Key} ]: {` +
            `  IsResolved: ${this.IsResolved}, ` +
            `  Result: ${Preparations.RESULT_TYPE[this.ResultType]}, ` +
            `  Message: ${this.m_resolveMsg}` +
            `}`);
    }

    //----------------------------------------------------------------

}
export type AnyPreparation = Preparation<any,any>;