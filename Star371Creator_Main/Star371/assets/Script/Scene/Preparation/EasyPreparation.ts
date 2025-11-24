import { Preparation } from "./Preparation";
import { Preparations } from "./PreparationMacro";
import { Device } from "../../Device/Device";
import { error } from "cc";


//----------------------------------------------------------------


interface EasyInitOption
{
    /** Timeout 的時間 (秒) */
    TimeoutTime: number;

    /** true 表示此準備工作只要有 Resolve 就算完成，預設為 true */
    IsLenient: boolean;

    /** 準備工作開始時的回呼 */
    OnPrepareStart: Function;

    /** 準備工作結束時的回呼 */
    OnPrepareResolved: Preparations.ResolveCallback<any>;
}

interface EasyInitConfig extends Partial<EasyInitOption>
{
    /** 準備工作的 Key */
    Key: string;
}

abstract class EasyPreparationCore extends Preparation< EasyInitConfig, any >
{
    /** 簡易完成準備工作 */
    public abstract EasyResolve(result: boolean | Preparations.RESULT_TYPE, message?: string): void;
}


//----------------------------------------------------------------


class EasyPreparationImpl extends EasyPreparationCore
{
    public readonly Key:            string;
    public readonly TimeoutTime:    number;
    public readonly IsLenient:      boolean;

    constructor( initConfig: EasyInitConfig, resolvedCb?: Preparations.ResolveCallback<any> )
    {
        super( initConfig, resolvedCb );

        this.Key            = initConfig?.Key;
        this.IsLenient      = initConfig?.IsLenient ?? true;
        this.TimeoutTime    = initConfig?.TimeoutTime;
    }

    public Prepare(sceneOrientation: Device.Orientation): void
    {
        try {
            this.InitConfig?.OnPrepareStart?.();
        } catch (err) {
            error( `EasyPreparation: ${this.Key} Prepare failed`, err?.message || err );
        }
    }

    public EasyResolve(result: boolean | Preparations.RESULT_TYPE, message?: string): void
    {
        let resultType: Preparations.RESULT_TYPE;
        if (typeof result === 'number') {
            resultType = result;
        } else if (typeof result === 'boolean' && result !== true) {
            resultType = Preparations.RESULT_TYPE.FAIL;
        } else {
            resultType = Preparations.RESULT_TYPE.SUCCESS;
        }

        this.Resolve( resultType, null, message );
    }
}


//----------------------------------------------------------------


export namespace EasyPreparation
{
    /**
     * @param {number} TimeoutTime - Timeout 的時間 (秒)
     * @param {boolean} IsLenient - true 表示此準備工作只要有 Resolve 就算完成，預設為 true
     * @param {Function} OnPrepareStart - 準備工作開始時的回呼
     * @param {Preparations.ResolveCallback<any>} OnPrepareResolved - 準備工作結束時的回呼
     */
    export interface CreateOption extends Partial<EasyInitOption>{}

    /**
     * EasyPreparation 的核心類別
     * - 這個類別是用來簡化準備工作的流程
     */
    export interface Core extends EasyPreparationCore {}

    /**
     * 建立一個簡易的準備工作
     * @param key - 準備工作的 Key
     * @param option - 初始化選項
     */
    export function Create( key: string, option?: EasyPreparation.CreateOption ): EasyPreparation.Core
    {
        const initConfig    = { Key: key };
        option && Object.assign( initConfig, option );
        const resolvedCb    = option?.OnPrepareResolved;
        const preparation   = new EasyPreparationImpl( initConfig, resolvedCb );
        return preparation;
    }
}


//----------------------------------------------------------------


export type AnyEasyPreperation = EasyPreparation.Core