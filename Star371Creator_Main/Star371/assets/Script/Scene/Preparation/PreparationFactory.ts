import { warn } from "cc";
import { Preparation } from "./Preparation";
import { Preparations } from "./PreparationMacro";

let _map: Map<string, Constructable<Preparation<any, any>>>;

/**
 * 準備工作管理器
 */
export namespace PreparationFactory {

    /**
     * 註冊準備工作
     */
    export function Register<T, U>(key: string, preparationCtor: Constructable<Preparation<T, U>>) {
        (_map || (_map = new Map())).set(key, preparationCtor);
    }

    /**
     * 建立準備工作
     */
    export function Create<T, U>(key: string, initConfig?: T, resolvedCb?: Preparations.ResolveCallback<U>): Preparation<T, U> {
        if (key?.length > 0) {
            const ctor = _map?.get(key);
            if (ctor) {
                return new ctor(initConfig, resolvedCb);
            }
        }

        warn(`[PreparationManager] Missing preparation: ${key}`);
        resolvedCb?.(Preparations.RESULT_TYPE.MISSING);
        return null;
    }

}
