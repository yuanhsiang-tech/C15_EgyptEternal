import { _decorator, Component, js, Node } from 'cc';
import { EDITOR } from 'cc/env';

export namespace BadgeIconSystem {
    export interface Icon {
        /**
         * 取得唯一識別 ID
         */
        readonly Id: number;

        /**
         * 啟用控制
         * @param active 是否啟用
         */
        SetActive(active: boolean): void;
    }
}

const map: Map<number, BadgeIconSystem.Icon[]> = new Map<number, BadgeIconSystem.Icon[]>();

export namespace BadgeIconSystem {
    /**
     * 添加目標對象
     * @param target 目標對象
     */
    export function Add(target: BadgeIconSystem.Icon) {
        if (!EDITOR) {
            const list: BadgeIconSystem.Icon[] = map.get(target.Id) || [];
            list.push(target);
            map.set(target.Id, list);
        }
    }

    /**
     * 移除目標對象
     * @param target 目標對象
     */
    export function Remove(target: BadgeIconSystem.Icon) {
        if (!EDITOR) {
            const list: BadgeIconSystem.Icon[] = map.get(target.Id);
            list && js.array.remove(list, target);
        }
    }

    /**
     * 清空所有目標對象
     */
    export function Clear() {
        if (!EDITOR) {
            map.clear();
        }
    }

    /**
     * 獲取目標
     * @param id 目標對象 ID
     */
    export function Find(id: number): BadgeIconSystem.Icon {
        return !map.get(id) ? null : map.get(id)[map.get(id).length-1];
    }
}






































Object.defineProperty(BadgeIconSystem, "_map", { get: () => map });
eval(`window.BadgeIconSystem = BadgeIconSystem;`);