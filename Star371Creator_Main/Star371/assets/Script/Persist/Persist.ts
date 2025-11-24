import { JSB } from "cc/env";
import { sys, warn } from "cc";
import { LiteStorageBase } from "./LiteStorageBase";


/**
 * 這是在原生模式下才會有的物件
 */
declare namespace Star371 {
    export class StorageMemory {
        public static Read ( key: string ): string;
        public static Write ( key: string, value: string ): boolean;
        public static Delete ( key: string ): boolean;
    }

    export class StorageDevice {
        public static Read ( key: string ): string;
        public static Write ( key: string, value: string ): boolean;
        public static Delete ( key: string ): boolean;
    }
}



//================================================================================================
/** 儲存實體基底 */
//================================================================================================
abstract class StorageEntityBase extends LiteStorageBase {
    /**
     * 寫入資料
     * - 與 SetData 相同
     */
    public Set(key: string, value: any): boolean {
        return this.SetData(key, value);
    }

    /**
     * 讀取資料
     * - 與 GetData 相同
     */
    public Get(key: string): string {
        return this.GetData(key);
    }
}



//================================================================================================
/** 儲存實體: Memory */
//================================================================================================
class MemoryStorageEntity extends StorageEntityBase {
    private readonly m_map: Map<string, any> = new Map();
    protected readonly DebugLogPrefix: string = "Persist.Memory";

    //----------------------------------------------------------------

    protected SetStorageItem(key: string, value: string): void {
        if (typeof key !== "string" || !(key.length > 0)) {
            warn(`[Persist.Memory] Set: Invalid key`, key);
        } else if (!JSB) {
            this.m_map.set(key, value);
        } else {
            Star371.StorageMemory.Write(key, value);
        }
    }

    protected GetStorageItem(key: string): string {
        if (typeof key !== "string" || !(key.length > 0)) {
            warn(`[Persist.Memory] Get: Invalid key`, key);
            return undefined;
        } else if (!JSB) {
            return this.m_map.get(key);
        } else {
            return Star371.StorageMemory.Read(key) ?? undefined;
        }
    }

    protected RemoveStorageItem(key: string): void {
        if (typeof key !== "string" || !(key.length > 0)) {
            warn(`[Persist.Memory] Remove: Invalid key`, key);
        } else if (!JSB) {
            this.m_map.delete(key);
        } else {
            Star371.StorageMemory.Delete(key);
        }
    }

    //----------------------------------------------------------------

}



//================================================================================================
/** 儲存實體: App */
//================================================================================================
class AppStorageEntity extends StorageEntityBase {
    protected readonly DebugLogPrefix: string = "Persist.App";

    //----------------------------------------------------------------

    protected SetStorageItem(key: string, value: string): void {
        sys.localStorage.setItem(key, value);
    }

    protected GetStorageItem(key: string): string {
        return sys.localStorage.getItem(key);
    }

    protected RemoveStorageItem(key: string): void {
        sys.localStorage.removeItem(key);
    }

    //----------------------------------------------------------------

}



//================================================================================================
/** 儲存實體: Device */
//================================================================================================
class DeviceStorageEntity extends StorageEntityBase {
    protected readonly DebugLogPrefix: string = "Persist.Device";

    //----------------------------------------------------------------

    protected SetStorageItem(key: string, value: string): void {
        if (!JSB || sys.os == sys.OS.ANDROID) {
            Persist.App.Set(key, value);
        } else {
            Star371.StorageDevice.Write(key, value);
        }
    }

    protected GetStorageItem(key: string): string {
        if (!JSB || sys.os == sys.OS.ANDROID) {
            return Persist.App.Get(key);
        } else {
            return Star371.StorageDevice.Read(key);
        }
    }

    protected RemoveStorageItem(key: string): void {
        if (!JSB || sys.os == sys.OS.ANDROID) {
            Persist.App.Remove(key);
        } else {
            Star371.StorageDevice.Delete(key);
        }
    }

    //----------------------------------------------------------------

}



//================================================================================================
/**
 * 提供各類儲存實體的 API
 */
//================================================================================================
export namespace Persist {
    //----------------------------------------------------------------
    /**
     * 記憶體，App 關閉時才會被清除，重啟後仍會保留
     */
    export const Memory = new MemoryStorageEntity;

    //----------------------------------------------------------------
    /**
     * App Persistence，App 移除時會被清除
     */
    export const App = new AppStorageEntity;

    //----------------------------------------------------------------
    /**
     * 寫入裝置，App 移除時不會被清除
     * - 僅在原生 iOS 有作用 (Android 使用 App Persist)
     */
    export const Device = new DeviceStorageEntity;

    //----------------------------------------------------------------

}
