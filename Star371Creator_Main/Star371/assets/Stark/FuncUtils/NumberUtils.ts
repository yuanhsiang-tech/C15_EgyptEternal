
//================================================================================================
// 基本數字工具
//================================================================================================

namespace NU
{
    /**
     * 判斷輸入值是否為合法數字
     */
    export function IsValidNum(value: any): value is number {
        return typeof value === "number" && !isNaN( value );
    }

    /** 將輸入值轉型成 `BigNumber` */
    export function ParseBigNumber(input: BigValuable): BigNumber
    {
        if (input instanceof BigNumber) {
            return input;
        } else if (typeof input === 'string' || typeof input === 'number') {
            return new BigNumber(input);
        } else {
            return new BigNumber(0);
        }
    }

    /** 取得輸入值的整數部分 */
    export function BigInt(value: BigValuable): BigNumber {
        return NU.ParseBigNumber( value ).integerValue( BigNumber.ROUND_DOWN );
    }

    /**
     * `BigNumber` 次方運算
     * @param base      底數
     * @param exponent  指數
     */
    export function BigPow(base: BigValuable, exponent: BigValuable): BigNumber {
        return NU.ParseBigNumber( base ).pow( exponent );
    }
}



//================================================================================================
// 數字取整工具
//================================================================================================

namespace NU
{
    //----------------------------------------------------------------
    // 無條件捨去、無條件進位、四捨五入
    export type RoundingMode = 'floor' | 'ceil' | 'round' ;

    //----------------------------------------------------------------
    /**
     * 取整數
     * @param value 輸入值
     * @param mode  取整模式 (floor: 無條件捨去, ceil: 無條件進位, round: 四捨五入)
     */
    export function Round(value: number, mode: RoundingMode): number;
    export function Round(value: BigNumber, mode: RoundingMode): BigNumber;
    export function Round(value: BigValuable, mode: RoundingMode): number | BigNumber
    {
        if (typeof value === "number") {
            switch (mode) {
                case 'floor':   return Math.floor(value);
                case 'ceil':    return Math.ceil(value);
                case 'round':   return Math.round(value);
                default:        return Math.floor(value);
            }
        }
        else {
            const bigNum = NU.ParseBigNumber( value );
            switch (mode) {
                case 'floor':   return bigNum.integerValue( BigNumber.ROUND_DOWN );
                case 'ceil':    return bigNum.integerValue( BigNumber.ROUND_UP );
                case 'round':   return bigNum.integerValue( BigNumber.ROUND_HALF_UP );
                default:        return bigNum.integerValue( BigNumber.ROUND_DOWN );
            }
        }
    }
}



//================================================================================================
// 數字指數值工具
//================================================================================================

namespace NU
{
    /**
     * 數字指數值
     */
    export enum EXPONENT
    {
        NONE    = 0,
        KILO    = 3,
        MEGA    = 6,
        GIGA    = 9,
        TERA    = 12,
        PETA    = 15,
        EXA     = 18,
        ZETTA   = 21,
        YOTTA   = 24,
    }

    /**
     * 數字指數列表 (升冪)
     */
    export const EXPONENT_ASC: Readonly<NU.EXPONENT[]> = Object.freeze(
    [
        NU.EXPONENT.KILO,
        NU.EXPONENT.MEGA,
        NU.EXPONENT.GIGA,
        NU.EXPONENT.TERA,
        NU.EXPONENT.PETA,
        NU.EXPONENT.EXA,
        NU.EXPONENT.ZETTA,
        NU.EXPONENT.YOTTA,
    ]);

    /**
     * 數字指數列表 (降冪)
     */
    export const EXPONENT_DESC = Object.freeze([...NU.EXPONENT_ASC].reverse());

    /**
     * 數字對應指數後綴 MAP (EXPONENT -> KMBTPEZY)
     */
    const EXPONENT_SUFFIX: Readonly<{[key in NU.EXPONENT]: string}> = Object.freeze(
    {
        [ NU.EXPONENT.NONE  ]: '',
        [ NU.EXPONENT.KILO  ]: 'K',
        [ NU.EXPONENT.MEGA  ]: 'M',
        [ NU.EXPONENT.GIGA  ]: 'B',
        [ NU.EXPONENT.TERA  ]: 'T',
        [ NU.EXPONENT.PETA  ]: 'P',
        [ NU.EXPONENT.EXA   ]: 'E',
        [ NU.EXPONENT.ZETTA ]: 'Z',
        [ NU.EXPONENT.YOTTA ]: 'Y',
    });

    /**
     * 指數後綴對應數字 MAP (KMBTPEZY -> EXPONENT)
     */
    const SUFFIX_EXPONENT: Readonly<{[key: string]: NU.EXPONENT}> = Object.freeze(
    {
        'K':    NU.EXPONENT.KILO,
        'M':    NU.EXPONENT.MEGA,
        'B':    NU.EXPONENT.GIGA,
        'T':    NU.EXPONENT.TERA,
        'P':    NU.EXPONENT.PETA,
        'E':    NU.EXPONENT.EXA,
        'Z':    NU.EXPONENT.ZETTA,
        'Y':    NU.EXPONENT.YOTTA,
    });

    /**
     * 取得數字指數後綴 (KMBTPEZY)
     * @param exponent 指數值 (EXPONENT)
     */
    export function ExponentSuffix(exponent: NU.EXPONENT): string {
        return EXPONENT_SUFFIX[ exponent ] ?? '';
    }

    /**
     * 取得數字指數值 (EXPONENT)
     * @param suffix 指數後綴 (KMBTPEZY)
     */
    export function SuffixToExpo(suffix: string): NU.EXPONENT
    {
        return SUFFIX_EXPONENT[ suffix ] ?? NU.EXPONENT.NONE;
    }

    /**
     * 解析數字指數值
     * @param input 輸入值
     * @param roundingMode 取整模式 (floor: 無條件捨去, ceil: 無條件進位, round: 四捨五入)
     * @returns 數字指數值
     */
    export function ParseExponent(input: number, roundingMode: NU.RoundingMode = 'floor'): NU.EXPONENT
    {
        const value = NU.ClampPositive( input );
        const expo  = NU.Round( value / 3, roundingMode ) * 3;
        return NU.ClampBelow( expo, NU.EXPONENT.YOTTA );
    }
}



//================================================================================================
// 數字格式化工具
//================================================================================================

const FORMAT_MIN_LENGTH = 4;

namespace NU
{
    //----------------------------------------------------------------
    /**
     * @deprecated 依照需求改用 `FormatTiny` 、 `FormatFill` 或 `FormatEasy`
     * - 格式化數字，並加上指數後綴
     * @param value 輸入值
     * @param maxLength 最大長度 (0 或未指定表示無上限，不會有 KMBTPEZY 後綴)
     * @param allowDecimal 是否允許小數點 (位數為一位，若小數為 0 則不顯示)
     */
    export function Format(value: BigValuable, maxLength?: number, allowDecimal?: boolean): string;

    /**
     * @deprecated 依照需求改用 `FormatTiny` 、 `FormatFill` 或 `FormatEasy`
     * - 格式化數字，並加上指數後綴
     * @param value 輸入值
     * @param maxLength 最大長度 (0 或未指定表示無上限，不會有 KMBTPEZY 後綴)
     * @param decimalPlace 小數點位數
     */
    export function Format(value: BigValuable, maxLength?: number, decimalPlace?: number): string;

    // 實作
    /** @deprecated */
    export function Format(value: BigValuable, maxLength?: number, arg3: number | boolean = false): string
    {
        const input         = NU.ParseBigNumber( value );
        const intLength     = NU.BigInt(input).abs().toString().length;
        const decimalPlace  = (typeof arg3 === 'number' && arg3 > 0) ? arg3 : (typeof arg3 === 'boolean' && arg3) ? 1 : 0;

        // 若 maxLength 不大於 0，則直接回傳格式化後的數字，沒有指數後綴
        if (!(maxLength > 0)) {
            return input.toFormat( decimalPlace , BigNumber.ROUND_DOWN );
        }

        const maxLen        = NU.ClampAbove( maxLength , FORMAT_MIN_LENGTH );
        const expo          = (intLength <= maxLen) ? 0 : NU.EXPONENT_ASC.find(e => ((intLength + 1) <= (maxLen + e))) ?? NU.EXPONENT.YOTTA;
        const suffix        = NU.ExponentSuffix( expo );
        const quotient      = input.div( NU.BigPow( 10, expo ) );
        const formatStr     = quotient.toFormat( decimalPlace , BigNumber.ROUND_DOWN );

        // 如果指定小數位數為一位，去除小數點後的零
        if (decimalPlace == 1) {
            return formatStr.replace( /\.0+$/ , '' ) + suffix;
        }

        return formatStr + suffix;
    }

    //----------------------------------------------------------------
    /**
     * 簡易格式化數字，加上千分位
     * @param value                 輸入值
     * @param decimalPlace          小數點位數 (未指定或負數表示無限制)
     * @param bigNumRoundingMode    BigNumber 捨入模式
     */
    export function FormatEasy( value:              BigValuable,
                                decimalPlace?:      number,
                                bigNumRoundingMode: BigNumber.RoundingMode = BigNumber.ROUND_DOWN
                                ): string
    {
        if (decimalPlace >= 0) {
            return NU.ParseBigNumber( value ).toFormat( decimalPlace, bigNumRoundingMode );
        } else {
            return NU.ParseBigNumber( value ).toFormat();
        }
    }

    //----------------------------------------------------------------
    /**
     * 格式化數字，並加上指數後綴，盡可能不顯示小數部分
     * @param value         輸入值
     * @param maxLength     最大長度 (0 或未指定表示無上限，不會有 KMBTPEZY 後綴)
     * @param maxDecimal    最大小數位數 (預設為 3)
     */
    export function FormatTiny(value: BigValuable, maxLength?: number, maxDecimal: number = 3): string
    {
        const input         = NU.ParseBigNumber( value );
        const maxDec        = NU.ClampPositive( maxDecimal );

        let quotient        = input;
        let decPlace        = maxDec;
        let suffix          = '';

        // 有指定最大長度時，計算指數後綴
        if (maxLength > 0)
        {
            const maxLen    = NU.ClampAbove( maxLength , FORMAT_MIN_LENGTH );
            const rawIntLen = NU.BigInt(input).abs().toFormat(0).length;
            const expo      = (rawIntLen > maxLen) ? (NU.EXPONENT_DESC.find(e => (rawIntLen > e*4/3)) ?? 0) : 0;   // 找到整數最短的指數後綴
            quotient        = input.div( NU.BigPow( 10, expo ) );
            suffix          = NU.ExponentSuffix( expo );

            // 整數 + 逗點 + 小數 + 小數點 + 指數後綴 的長度不得超過 maxLength
            const maxNumLen = maxLen - (expo > 0 ? 1 : 0);
            const quoIntLen = NU.BigInt(quotient).abs().toFormat(0).length;
            decPlace        = NU.Clamp( maxNumLen - quoIntLen - 1, 0, maxDec );
        }

        // 沒有小數部分時去除小數點，有小數部分時去除尾部零
        const [intStr, decStr] = quotient.toFormat( decPlace, BigNumber.ROUND_DOWN ).split('.');
        const _decStr = (decStr?.length > 0) ? `.${decStr}`.replace(/0+$/, '').replace(/\.$/, '') : '';
        return intStr + _decStr + suffix;
    }

    //----------------------------------------------------------------
    /**
     * 格式化數字，並加上指數後綴，盡可能用小數填滿最大長度
     * @param value                 輸入值
     * @param maxLength             最大長度 (0 或未指定表示無上限，不會有 KMBTPEZY 後綴)
     * @param maxDecimalWithExpo    有指數後綴時的最大小數位數 (預設為 3，若為負數則無限制)
     * @param maxDecimalWithoutExpo 無指數後綴時的最大小數位數 (預設為 0，若為負數則無限制)
     */
    export function FormatFill( value:                  BigValuable,
                                maxLength?:             number,
                                maxDecimalWithExpo:     number = 3,
                                maxDecimalWithoutExpo:  number = 0,
                                ): string
    {
        const input         = NU.ParseBigNumber( value );

        // 若 maxLength 不大於 0，則直接回傳格式化後的數字，沒有指數後綴
        if (!(maxLength > 0)) {
            if (maxDecimalWithoutExpo >= 0) {
                return input.toFormat( maxDecimalWithoutExpo , BigNumber.ROUND_DOWN );
            } else {
                return input.toFormat();
            }
        }

        const maxLen        = NU.ClampAbove( maxLength , FORMAT_MIN_LENGTH );
        const rawIntLen     = NU.BigInt(input).abs().toFormat(0).length;
        const expo          = (rawIntLen > maxLen) ? (NU.EXPONENT_DESC.find(e => (rawIntLen > e*4/3)) ?? 0) : 0;   // 找到整數最短的指數後綴
        const quotient      = input.div( NU.BigPow( 10, expo ) );
        const suffix        = NU.ExponentSuffix( expo );

        // 整數 + 逗點 + 小數 + 小數點 + 指數後綴 的長度不得超過 maxLength
        const maxNumLen     = maxLen - (expo > 0 ? 1 : 0);
        const quoIntLen     = NU.BigInt(quotient).abs().toFormat(0).length;
        const maxDecimal    = (expo > 0) ? maxDecimalWithExpo : maxDecimalWithoutExpo;
        const maxDec        = (maxDecimal >= 0) ? maxDecimal : maxNumLen;
        const decPlace      = NU.Clamp( maxNumLen - quoIntLen - 1, 0, maxDec );
        const formatStr     = quotient.toFormat( decPlace, BigNumber.ROUND_DOWN );

        return formatStr + suffix;
    }

    //----------------------------------------------------------------
    /**
     * 格式化數字，並加上指定的指數後綴，盡可能不顯示小數部分
     * @param value         輸入值
     * @param exponent      指數 (詳見 `EXPONENT`，數值為 3 的倍數)
     * @param maxLength     最大長度 (所有字元的總長度，0 或未指定表示無上限)
     * @param maxDecimal    最大小數位數 (預設為 3)
     */
    export function ExpoFormatTiny( value:      BigValuable,
                                    exponent:   NU.EXPONENT,
                                    maxLength?: number,
                                    maxDecimal: number = 3
                                    ): string
    {
        const input         = NU.ParseBigNumber( value );
        const expo          = NU.ParseExponent( exponent );
        const quotient      = input.div( NU.BigPow( 10, expo ) );
        const suffix        = NU.ExponentSuffix( expo );
        const maxDec        = NU.ClampPositive( maxDecimal );
        let decPlace        = maxDec;

        // 整數 + 逗點 + 小數 + 小數點 + 指數後綴 的長度不得超過 maxLength
        if (maxLength > 0)
        {
            const maxNumLen = NU.ClampAbove( maxLength, FORMAT_MIN_LENGTH ) - (expo > 0 ? 1 : 0);
            const quoIntLen = NU.BigInt(quotient).abs().toFormat(0).length;
            decPlace        = NU.Clamp( maxNumLen - quoIntLen - 1, 0, maxDec );
        }

        // 沒有小數部分時去除小數點，有小數部分時去除尾部零
        const [intStr, decStr] = quotient.toFormat( decPlace, BigNumber.ROUND_DOWN ).split('.');
        const _decStr = (decStr?.length > 0) ? `.${decStr}`.replace(/0+$/, '').replace(/\.$/, '') : '';
        return intStr + _decStr + suffix;
    }

    //----------------------------------------------------------------
    /**
     * 格式化數字，並加上指定的指數後綴，盡可能用小數填滿最大長度
     * @param value                 輸入值
     * @param exponent              指數 (詳見 `EXPONENT`，數值為 3 的倍數)
     * @param maxLength             最大長度 (所有字元的總長度，0 或未指定表示無上限)
     * @param maxDecimalWithExpo    有指數後綴時的最大小數位數 (預設為 3，若為負數則無限制)
     * @param maxDecimalWithoutExpo 無指數後綴時的最大小數位數 (預設為 0，若為負數則無限制)
     */
    export function ExpoFormatFill( value:                  BigValuable,
                                    exponent:               NU.EXPONENT,
                                    maxLength?:             number,
                                    maxDecimalWithExpo:     number = 3,
                                    maxDecimalWithoutExpo:  number = 0,
                                    ): string
    {
        const input         = NU.ParseBigNumber( value );
        const expo          = NU.ParseExponent( exponent );
        const suffix        = NU.ExponentSuffix( expo );
        const quotient      = input.div( NU.BigPow( 10, expo ) );
        const maxDecimal    = (expo > 0) ? maxDecimalWithExpo : maxDecimalWithoutExpo;

        // 若 maxLength 不大於 0，則直接回傳格式化後的數字，沒有指數後綴
        if (!(maxLength > 0)) {
            if (maxDecimal >= 0) {
                return quotient.toFormat( maxDecimal, BigNumber.ROUND_DOWN ) + suffix;
            } else {
                return quotient.toFormat() + suffix;
            }
        }

        // 整數 + 逗點 + 小數 + 小數點 + 指數後綴 的長度不得超過 maxLength
        const maxNumLen     = NU.ClampAbove( maxLength , FORMAT_MIN_LENGTH ) - (expo > 0 ? 1 : 0);
        const quoIntLen     = NU.BigInt(quotient).abs().toFormat(0).length;
        const maxDec        = (maxDecimal >= 0) ? maxDecimal : maxNumLen;
        const decPlaces     = NU.Clamp( maxNumLen - quoIntLen - 1, 0, maxDec );
        const formatStr     = quotient.toFormat( decPlaces, BigNumber.ROUND_DOWN );

        return formatStr + suffix;
    }

    //----------------------------------------------------------------
    /**
     * 格式化數字，並加上前綴
     * @param value 補位數的數字
     * @param digit 補滿的位數
     * @param radix 幾進位(2~36)
     * @returns 
     */
    export function PrefixFormat(value: number, digit?: number, radix?: number): string {
        return value.toString( radix ?? 10 ).padStart( digit ?? 2, '0' );
    };

    //----------------------------------------------------------------
    /**
     * 移除數字字串前後的零
     * @param numStr 數字字串
     */
    export function TrimZero(numStr: string): string
    {
        if (typeof numStr !== 'string') {
            return numStr;
        }

        if (isNaN(Number(numStr))) {
            return numStr;
        }

        // 移除前面的零，但保留最後一個零
        numStr = numStr.replace(/^(-|\+)?0+(?=\d)/, '$1');

        // 移除小數部分的尾部零
        numStr = numStr.replace(/(\.\d*?[1-9])0+$/g, '$1');

        // 移除整數部分的小數點
        numStr = numStr.replace(/\.0+$/, '');

        // 如果沒有留下任何數字，則回傳 0
        if (/\d/.test(numStr) === false) {
            return '0';
        } else {
            return numStr;
        }
    }

    //----------------------------------------------------------------
    /**
     * 將數值轉換成百分比字串
     * @param value 目標值
     * @param decimal 小數點位數
     * @param mode 捨入模式
     */
    export function ToPercentages(value: number, decimal: number, mode: NU.RoundingMode = 'floor'): string
    {
        let factor :number = Math.pow(10, decimal);
        let adjustedValue: number = NU.Round(value * factor, mode) / factor;
        return `${adjustedValue.toFixed(decimal)}%`;
    }


    /**
     * 格式化數字為 KMBT 縮寫格式或千分位格式
     * @param val - 要格式化的數字，接受 number 或 BigNumber
     * @param MaxCount - 最大允許的數字總位數（不包含小數點後的位數）
     * @returns 格式化後的數字字串
     */
    export function FormatNumberKMBTv3(val: number | BigNumber, MaxCount: number): string {
        // 定義縮寫單位
        const units = ['K', 'M', 'B', 'T', 'Q', 'P', 'E', 'Z', 'Y'];
        const threshold = new BigNumber(1000); // 每級縮放的門檻值

        // 將輸入值轉換為 BigNumber 型別
        let value = new BigNumber(val);

        // 計算整數部分的總位數（不包含小數點後的位數）
        const integerPart = value.toFixed(0); // 無條件捨去小數點後的位數
        const totalDigits = integerPart.length; // 計算整數部分的長度

        // 如果總位數小於或等於 MaxCount，直接顯示原始整數，並加上千分位格式
        if (totalDigits <= MaxCount) {
            return AddThousandSeparator(integerPart); // 整數部分加上千分位
        }

        // 如果總位數超過 MaxCount，進行縮放格式化
        let unitIndex = -1; // 紀錄縮放的單位索引
        let reducedValue = value;

        // 不斷將數值除以 1000，直到小於 1000 或達到最大單位
        while (reducedValue.isGreaterThanOrEqualTo(threshold) && unitIndex < units.length - 1) {
            reducedValue = reducedValue.div(threshold); // 縮小數值
            unitIndex++; // 增加單位索引
        }

        // 將縮放後的數值無條件捨去至小數點後三位
        const formattedValue = reducedValue.toFixed(3, BigNumber.ROUND_DOWN);

        // 如果縮放後的數值未能匹配任何單位，返回原始數字
        if (unitIndex === -1 || unitIndex >= units.length) {
            return value.toString();
        }

        // 返回格式化結果，包含縮寫單位
        return `${formattedValue}${units[unitIndex]}`;

        /**
         * 千分位格式化輔助函式
         * @param numStr - 要格式化的數字字串
         * @returns 加上千分位的數字字串
         */
        function AddThousandSeparator(numStr: string): string {
            // 使用正則表達式，每三位數插入一個逗號
            return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }
    }

    
}



//================================================================================================
// 位元運算工具
//================================================================================================

namespace NU
{
    /**
     * 取得整數以二進位表示時 bit 為 1 的數量
     * - 如: 23 -> 0b10111 -> 4
     * @see https://en.wikipedia.org/wiki/Hamming_weight
     */
    export function BitCounts(value: number): number
    {
        value = (value | 0) - ((value >> 1) & 0x55555555);
        value = (value & 0x33333333) + ((value >> 2) & 0x33333333);
        return (((value + (value >> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
    }

    /** 位元比較相等 */
    export function BitEquals(value1: number, value2: number): boolean {
        return (value1 & value2) == value2;
    }
}



//================================================================================================
// 數值限制工具
//================================================================================================

namespace NU
{
    /**
     * 限制數值在範圍內
     * @param value 目標值
     * @param min 最小值
     * @param max 最大值
     */
    export function Clamp(value: number, min: number, max: number): number;
    export function Clamp(value: BigValuable, min: BigValuable, max: BigValuable): BigNumber;
    export function Clamp(value: BigValuable, min: BigValuable, max: BigValuable): number | BigNumber
    {
        if (typeof value === "number" && typeof min === "number" && typeof max === "number") {
            return value < min ? min : value > max ? max : value;
        } else {
            const bigNum = NU.ParseBigNumber( value );
            const minNum = NU.ParseBigNumber( min );
            const maxNum = NU.ParseBigNumber( max );
            return (bigNum.lt( minNum ) && min !== null && min !== undefined) ? minNum : ( (bigNum.gt( maxNum ) && max !== null && max !== undefined) ? maxNum : bigNum);
        }
    }

    /**
     * 限制數值在 0 ~ 1 之間
     */
    export function Clamp01(value: number): number;
    export function Clamp01(value: BigValuable): BigNumber;
    export function Clamp01(value: BigValuable): number | BigNumber {
        return NU.Clamp( value , 0 , 1 );
    }

    /**
     * 限制數值大於等於 min
     */
    export function ClampAbove(value: number, min: number): number;
    export function ClampAbove(value: BigValuable, min: BigValuable): BigNumber;
    export function ClampAbove(value: BigValuable, min: BigValuable): number | BigNumber
    {
        if (typeof value === "number" && typeof min === "number") {
            return value >= min ? value : min;
        } else {
            const bigNum = NU.ParseBigNumber( value );
            const minNum = NU.ParseBigNumber( min );
            return bigNum.lt( minNum ) ? minNum : bigNum;
        }
    }

    /**
     * 限制數值小於等於 max
     */
    export function ClampBelow(value: number, max: number): number;
    export function ClampBelow(value: BigValuable, max: BigValuable): BigNumber;
    export function ClampBelow(value: BigValuable, max: BigValuable): number | BigNumber
    {
        if (typeof value === "number" && typeof max === "number") {
            return value <= max ? value : max;
        } else {
            const bigNum = NU.ParseBigNumber( value );
            const maxNum = NU.ParseBigNumber( max );
            return bigNum.gt( maxNum ) ? maxNum : bigNum;
        }
    }

    /**
     * 限制數值大於等於 0
     */
    export function ClampPositive(value: number): number;
    export function ClampPositive(value: BigValuable): BigNumber;
    export function ClampPositive(value: BigValuable): number | BigNumber {
        return NU.ClampAbove( value , 0 );
    }

    /**
     * 限制數值小於等於 0
     */
    export function ClampNegative(value: number): number;
    export function ClampNegative(value: BigValuable): BigNumber;
    export function ClampNegative(value: BigValuable): number | BigNumber {
        return NU.ClampBelow( value , 0 );
    }
}



//================================================================================================
// 插值工具
//================================================================================================

namespace NU
{
    /**
     * 線性插值
     * @param from 起始值
     * @param to 結束值
     * @param r 插值比例
     */
    export function Lerp(from: number, to: number, r: number): number;
    export function Lerp(from: BigValuable, to: BigValuable, r: BigValuable): BigNumber;
    export function Lerp(from: BigValuable, to: BigValuable, r: BigValuable): number | BigNumber
    {
        if (typeof from === "number" && typeof to === "number" && typeof r === "number") {
            return from + (to - from) * r;
        } else {
            const fromNum   = NU.ParseBigNumber( from );
            const toNum     = NU.ParseBigNumber( to );
            const rNum      = NU.ParseBigNumber( r );
            return fromNum.plus( toNum.minus( fromNum ).times( rNum ) );
        }
    }

    // ... 其他插值函式
}










//================================================================================================

export { NU as NumberUtils };

//================================================================================================
