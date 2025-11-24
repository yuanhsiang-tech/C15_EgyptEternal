import { NumberUtils } from "./NumberUtils";
import { warn } from "cc";

const NumberCtor = Number;
const DateCtor = Date;

function isValid(value: any): boolean {
    return value !== null && value !== undefined;
}

/** 字串化工具 */
export namespace StringifyUtils {
    /** 任意型別 */
    export function Encode(value: any): string {
        if (!isValid(value)) {
            return JSON.stringify(value);
        } else if (typeof value === "string") {
            return value;
        } else if (typeof value === "boolean") {
            return StringifyUtils.Boolean.Encode(value);
        } else if (typeof value === "number") {
            return StringifyUtils.Number.Encode(value);
        } else if (value instanceof BigNumber) {
            return StringifyUtils.BigNum.Encode(value);
        } else if (value instanceof DateCtor) {
            return StringifyUtils.Date.Encode(value);
        } else {
            return StringifyUtils.Object.Encode(value);
        }
    }
}

export namespace StringifyUtils {
    /** 布林值 */
    export namespace Boolean {
        export function Encode(value: boolean): string {
            return value ? 'true' : 'false';
        }

        export function Decode(value: string): boolean {
            let str = value?.toLowerCase();
            switch (str) {
                case 'true':
                    return true;
                case 'false':
                    return false;
                default:
                    return null;
            }
        }

        export function EncodeArray(value: boolean[]): string {
            if (Array.isArray(value)) {
                return value.map(v => v ? 'T' : 'F').join('');
            } else {
                return null;
            }
        }

        export function DecodeArray(value: string): boolean[] {
            if (typeof value === "string") {
                return value.split('').map(v => v === 'T');
            } else {
                return null;
            }
        }
    }
}

export namespace StringifyUtils {
    /** 數字 */
    export namespace Number {
        export function Encode(value: number): string {
            if (typeof value === "number" && !isNaN(value)) {
                return value.toString();
            } else {
                return null;
            }
        }

        export function Decode(value: string): number {
            return isValid(value) ? NumberCtor(value) : NaN;
        }

        export function EncodeArray(value: number[]): string {
            if (Array.isArray(value)) {
                return value.map(v => StringifyUtils.Number.Encode(v)).join(',');
            } else {
                return null;
            }
        }

        export function DecodeArray(value: string): number[] {
            if (typeof value === "string") {
                return value.split(',').map(v => StringifyUtils.Number.Decode(v));
            } else {
                return null;
            }
        }
    }
}

export namespace StringifyUtils {
    /** BigNumber */
    export namespace BigNum {
        export function Encode(value: string | number | BigNumber): string {
            let bigNum = NumberUtils.ParseBigNumber(value);
            if (bigNum instanceof BigNumber && !bigNum.isNaN()) {
                return bigNum.toString();
            } else {
                return null;
            }
        }

        export function Decode(value: string): BigNumber {
            if (isValid(value)) {
                return NumberUtils.ParseBigNumber(value);
            } else {
                return new BigNumber(NaN);
            }
        }

        export function EncodeArray(value: BigNumber[]): string {
            if (Array.isArray(value)) {
                return value.map(v => StringifyUtils.BigNum.Encode(v)).join(',');
            } else {
                return null;
            }
        }

        export function DecodeArray(value: string): BigNumber[] {
            if (typeof value === "string") {
                return value.split(',').map(v => StringifyUtils.BigNum.Decode(v));
            } else {
                return null;
            }
        }
    }
}

export namespace StringifyUtils {
    /** 日期 */
    export namespace Date {
        export function Encode(value: Date): string {
            const time = (value instanceof DateCtor) ? value.getTime() : NaN;
            if (!isNaN(time)) {
                return time.toString();
            } else {
                return null;
            }
        }

        export function Decode(value: string): Date {
            let num = isValid(value) ? NumberCtor(value) : NaN;
            if (!isNaN(num)) {
                return new DateCtor(num);
            } else {
                return null;
            }
        }

        export function EncodeArray(value: Date[]): string {
            if (Array.isArray(value)) {
                return value.map(v => StringifyUtils.Date.Encode(v) ?? '?').join(',');
            } else {
                return null;
            }
        }

        export function DecodeArray(value: string): Date[] {
            if (typeof value === "string") {
                return value.split(',').map(v => StringifyUtils.Date.Decode(v));
            } else {
                return null;
            }
        }
    }
}

export namespace StringifyUtils {
    /** 物件 */
    export namespace Object {
        export function Encode<Type>(value: Type): string {
            if (isValid(value)) {
                return JSON.stringify(value);
            } else {
                return null;
            }
        }

        export function Decode<Type>(value: string, jsonParser?: (jsonString: string) => Type): Type {
            try {
                if (typeof jsonParser === "function") {
                    return jsonParser(value);
                } else {
                    return JSON.parse(value);
                }
            } catch(error) {
                warn(`EncoderUtils.Object.Decode: ERROR`, error);
                return null;
            }
        }
    }
}
