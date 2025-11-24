import { _decorator, isValid, Node, Vec3, Component, UIOpacity, js } from 'cc';
import { EDITOR } from 'cc/env';

export namespace UISystem {
    export interface UI extends Component {
        /**
         * 取得唯一識別 ID
         */
        readonly Id: number;

        /**
         * 取得父(主)目標對象
         */
        readonly Host: number;

        /**
         * 取得中心節點
         */
        readonly Center: Node;
    }

    export namespace Helper {
        /**
         * 設定唯一識別 ID
         * @param target 套用對象
         * @param id 唯一識別 ID
         */
        export function SetId(target:any, id: number) {
            if (target.m_Id != 0) {
                UISystem.Remove(target);
            }

            target.m_Id = id;
            if (target.m_Id != 0) {
                UISystem.Add(target);
            }
        }

        /**
         * 連結父(主)目標對象
         * @param target 套用對象
         * @param host 父(主)目標對象
         */
        export function LinkHost(target:any, host: UISystem.UI|number) {
            target.m_host = typeof host != "number" ? host?.Id || 0 : host;
        }

        /**
         * Creator OnLoad
         * @param target 套用對象
         */
        export function OnLoad(target:any): void {
            if (target.m_Id != 0) {
                UISystem.Add(target);
            }
        }

        /**
         * Creator OnDestroy
         * @param target 套用對象
         */
        export function OnDestroy(target:any): void {
            target.m_host = null;
            if (target.m_Id != 0) {
                UISystem.Remove(target); 
            }
        }
    }
}

const map: Map<number, UISystem.UI[]> = new Map<number, UISystem.UI[]>();

export namespace UISystem {
    /**
     * 添加 UI 目標對象
     * @param target 目標對象
     */
    export function Add(target: UISystem.UI) {
        if (!EDITOR) {
            const list: UISystem.UI[] = map.get(target.Id) || [];
            list.push(target);
            map.set(target.Id, list);
        }
    }

    /**
     * 移除 UI 目標對象
     * @param target 目標對象
     */
    export function Remove(target: UISystem.UI) {
        if (!EDITOR) {
            const list: UISystem.UI[] = map.get(target.Id);
            list && js.array.remove(list, target);
        }
    }

    /**
     * 清空所有 UI 目標對象
     */
    export function Clear() {
        if (!EDITOR) {
            map.clear();
        }
    }

    /**
     * 獲取目標 UI
     * @param id 目標對象 ID
     * @param useHost 當目標對象不可見時是否改使用父(主)目標對象
     */
    export function Find<T extends UISystem.UI = UISystem.UI>(id: number, useHost: boolean = true): T {
        const list: UISystem.UI[] = map.get(id);
        const ui: UISystem.UI = list?.[list.length-1];
        
        if (!ui || !isValid(ui, true)) {
            // [目標對象不存在或已銷毀]
            return null;
        } else if (!useHost || ui.node.activeInHierarchy || ui.getComponent(UIOpacity)?.opacity > 0) {
            // [強制不使用父(主)目標對象] 或 [目標對象可見]
            return ui as T;
        } else {
            // [目標對象不可見]
            let host: UISystem.UI;

            // 如果有超過 1 個以上相同編號的按鈕，優先尋找同編號可見的按鈕
            if (list.length > 1) {
                for (let i = list.length - 1; i >= 0; --i) {
                    const next: UISystem.UI = list[i];
                    if (ui != next && isValid(next, true) && next.node.activeInHierarchy) {
                        host = next;
                        break;
                    }
                }
            }

            // 沒有找到同編號可見的按鈕，改尋找父(主)目標對象
            if (!host) {
                host = UISystem.Find(ui.Host);
                while (host && !host.node.activeInHierarchy) {
                    host = UISystem.Find(host.Host);
                }
            }

            return host as T;
        }
    }

    /**
     * 獲取目標 UI 的世界位置
     * @param id 目標對象 ID
     * @param useHost 當目標對象不可見時是否改使用父(主)目標對象
     */
    export function GetWorldLocation(id: number, useHost: boolean = true): Vec3 {
        return UISystem.Find(id, useHost)?.node?.getWorldPosition();
    }
}



























































Object.defineProperty(UISystem, "_map", { get: () => map });
eval(`window.UISystem = UISystem;`);