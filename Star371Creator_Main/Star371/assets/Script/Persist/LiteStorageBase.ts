import { isValid, warn } from "cc";
import { StringifyUtils } from "../../Stark/FuncUtils/StringifyUtils";



//================================================================================================
/**
 * 基本儲存的基底類別
 * - 提供基本的讀取、寫入、移除功能
 * - 具體的儲存方式由子類別實作
 */
//================================================================================================

export abstract class LiteStorageBase
{
    //----------------------------------------------------------------
    /** 除錯訊息前綴 */
    protected readonly DebugLogPrefix: string = "LiteStorageBase";

    //----------------------------------------------------------------



    //================================================================
    // 需要由子類別實作的抽象方法
    //================================================================

    //----------------------------------------------------------------
    /** 將字串型別的資料寫入儲存空間 */
    protected abstract SetStorageItem(key: string, value: string): void;

    /** 讀取字串型別的資料 */
    protected abstract GetStorageItem(key: string): string;

    /** 移除儲存空間的資料 */
    protected abstract RemoveStorageItem(key: string): void;

    //----------------------------------------------------------------



    //================================================================
    // 提供給外部使用的 API
    //================================================================

    //----------------------------------------------------------------
    /**
     * 寫入資料
     * @param key       儲存的 key
     * @param data      資料的內容
     * @returns         是否成功寫入資料
     */
    public SetData(key: string, data: any): boolean
    {
        // 檢查 key 是否有效
        if (typeof key !== "string" || !(key.length > 0)) {
            warn(`[${this.DebugLogPrefix}] SetData: Invalid key`, key);
            return false;
        }

        const str = StringifyUtils.Encode(data);
        this.SetStorageItem(key, str);
        return true;
    }

    /**
     * 讀取資料
     */
    public GetData(key: string): string
    {
        // 檢查 key 是否有效
        if (typeof key !== "string" || !(key.length > 0)) {
            warn(`[${this.DebugLogPrefix}] GetData: Invalid key`, key);
            return undefined;
        }

        return this.GetStorageItem(key);
    }

    /**
     * 移除資料
     */
    public Remove(key: string): void
    {
        // 檢查 key 是否有效
        if (typeof key !== "string" || !(key.length > 0)) {
            warn(`[${this.DebugLogPrefix}] Remove: Invalid key`, key);
            return;
        }

        this.RemoveStorageItem(key);
    }

    //----------------------------------------------------------------


    //----------------------------------------------------------------
    /**
     * 寫入布林值
     * @param key   儲存的 key
     * @param value 布林值
     * @returns     是否成功寫入資料
     */
    public SetBoolean(key: string, value: boolean): boolean
    {
        const data = StringifyUtils.Boolean.Encode(value);
        return this.SetData(key, data);
    }

    /**
     * 讀取布林值
     */
    public GetBoolean(key: string): boolean
    {
        const data = this.GetData(key);
        if (typeof data === "string") {
            return StringifyUtils.Boolean.Decode(data);
        } else {
            return undefined;
        }
    }

    //----------------------------------------------------------------


    //----------------------------------------------------------------
    /**
     * 寫入數字
     * @param key   儲存的 key
     * @param value 數字
     * @returns     是否成功寫入資料
     */
    public SetNumber(key: string, value: number): boolean
    {
        const data = StringifyUtils.Number.Encode(value);
        return this.SetData(key, data);
    }

    /**
     * 讀取數字
     */
    public GetNumber(key: string): number
    {
        const data = this.GetData(key);
        const num = StringifyUtils.Number.Decode(data);
        return (isValid(num) && !isNaN(num)) ? num : undefined;
    }

    //----------------------------------------------------------------


    //----------------------------------------------------------------
    /**
     * 寫入 BigNumber
     * @param key       儲存的 key
     * @param value     可轉換成 BigNumber 的參數
     * @returns         是否成功寫入資料
     */
    public SetBigNumber(key: string, value: BigValuable): boolean
    {
        const data = StringifyUtils.BigNum.Encode(value);
        return isValid(data) && this.SetData(key, data);
    }

    /**
     * 讀取 BigNumber
     */
    public GetBigNumber(key: string): BigNumber
    {
        const data = this.GetData(key);
        if (typeof data === "string") {
            return StringifyUtils.BigNum.Decode(data);
        } else {
            return undefined;
        }
    }

    //----------------------------------------------------------------


    //----------------------------------------------------------------
    /**
     * 寫入日期
     * @param key       儲存的 key
     * @param date      日期
     * @param args      其他參數
     * @returns         是否成功寫入資料
     */
    public SetDate(key: string, date: Date): boolean 
    {
        const data = StringifyUtils.Date.Encode(date);
        return isValid(data) && this.SetData(key, data);
    }

    /**
     * 讀取日期
     */
    public GetDate(key: string): Date
    {
        const data = this.GetData(key);
        if (typeof data === "string") {
            return StringifyUtils.Date.Decode(data);
        } else {
            return undefined;
        }
    }

    //----------------------------------------------------------------


    //----------------------------------------------------------------
    /**
     * 寫入物件
     * @param key       儲存的 key
     * @param value     物件
     * @returns         是否成功寫入資料
     */
    public SetObject<Type>(key: string, value: Type): boolean
    {
        const data = StringifyUtils.Object.Encode(value);
        return this.SetData(key, data);
    }

    /**
     * 讀取物件
     */
    public GetObject<Type>(key: string, jsonParser?: (jsonString: string) => Type): Type
    {
        const data = this.GetData(key);
        if (typeof data === "string") {
            return StringifyUtils.Object.Decode(data, jsonParser);
        } else {
            return undefined;
        }
    }

    //----------------------------------------------------------------

}
