import CommonNodePool from "./CommonNodePool";
import { Node, warn } from "cc";

/**
 * Manages a collection of CommonNodePool instances.
 */
export default class CabrioNodePoolManager {
    private pools: Map<number|string, CommonNodePool> = new Map<number|string, CommonNodePool>();

    /**
     * 將 CommonNodePool 添加到管理器中。
     * @param key - 與池關聯的鍵。
     * @param pool - 要添加的 CommonNodePool 實例。
     * @returns CabrioNodePoolManager 實例。
     */
    public AddPool(key: number|string, pool: CommonNodePool): CabrioNodePoolManager {
        if (this.pools.has(key)) {
            warn(`[Cabrio-NodePoolMgr] AddPool - Key ${key} already exists in the pool mapping.`);
        }
        this.pools.set(key, pool);
        return this;
    }

    /**
     * 從管理器中檢索 CabrioNodePool。
     * @param key - 與池關聯的鍵。
     * @returns CommonNodePool 實例。
     */
    public GetPool(key: number|string): CommonNodePool {
        if (!this.pools.has(key)) {
            warn(`[Cabrio-NodePoolMgr] GetPool - Key ${key} does not exist in the pool mapping.`);
        }
        return this.pools.get(key);
    }

    /**
     * 從管理器中移除 CabrioNodePool。
     * @param key - 與池關聯的鍵。
     * @param beClear - 是否在移除之前清空池。預設為 false。
     */
    public RemovePool(key: number|string, beClear: boolean = false): void {
        if (this.pools.has(key)) {
            const pool = this.pools.get(key);
            if (beClear) {
                pool.Clear();
            }
            this.pools.delete(key);
        } else {
            warn(`RemovePool - Key ${key} does not exist in the pool mapping.`);
        }
    }

    /**
     * 清空管理器中的所有 CabrioNodePool。
     */
    public ClearAllPools(): void {
        for (const pool of this.pools.values()) {
            pool.Clear();
        }
        this.pools.clear();
    }

    /**
     * 從指定的 CommonNodePool 中檢索節點。
     * @param key - 與池關聯的鍵。
     * @returns 檢索到的節點。
     */
    public Take(key: number|string): Node {
        if (!this.pools.has(key)) {
            warn(`Take - Key ${key} does not exist in the pool mapping.`);
        }
        return this.pools.get(key)?.Take();
    }

    /**
     * 將節點返回到指定的 CabrioNodePool。
     * @param key - 與池關聯的鍵。
     * @param node - 要返回的節點。
     */
    public Back(key: number|string, node: Node): void {
        if (!this.pools.has(key)) {
            warn(`Back - Key ${key} does not exist in the pool mapping.`);
        }
        this.pools.get(key).Back(node);
    }
}
