import { math, isValid, Node, Component, UITransform, UIOpacity, UIRenderer, Sprite, warn, Label, Vec2 } from "cc"
import { BuiltinResUtils } from "./BuiltinResUtils"

//------------------------------------------------------------------------------------------------
/**
 * 節點工具
 */
//------------------------------------------------------------------------------------------------

export const OPACITY_MAX = 0xFF
export const OPACITY_MIN = 0x00
export class NodeUtils
{
    //----------------------------------------------------------------
    /**
     * 預設尺寸 (0, 0)
     */
    public static get DEFAULT_SIZE(): math.Size {
        return math.Size.ZERO;
    }

    //----------------------------------------------------------------
    /**
     * 預設錨點 (0.5, 0.5)
     */
    public static get DEFAULT_ANCHOR(): math.Vec2 {
        return math.v2(0.5, 0.5);
    }

    //----------------------------------------------------------------
    /**
     * 預設不透明度 (255)
     */
    public static get DEFAULT_OPACITY(): number {
        return OPACITY_MAX;
    }

    //----------------------------------------------------------------
    /**
     * 預設顏色 (白色)
     */
    public static get DEFAULT_COLOR(): math.Color {
        return math.Color.WHITE;
    }
    //----------------------------------------------------------------
}



//================================================================================================
// Node 基本功能
//================================================================================================

export namespace NodeUtils
{
    //----------------------------------------------------------------
    /**
     * 透過路徑尋找節點
     * @param root 根節點
     * @param path 路徑
     */
    export function Find(root: Node, path: string): Node {
        return root?.getChildByPath?.(path) ?? null;
    }

    export function GET_UI(node: Node, name: string): Node {
        return NodeUtils.GetUI(node, name)
    }

    //----------------------------------------------------------------
    /**
     * 透過名稱尋找節點 (帶快取)
     * @param node 根節點
     * @param name 節點名稱
     */
    export function GET_UI_CACHED(node: Node, name: string): Node {
        return NodeUtils.GetUI(node, name, true)
    }

    //----------------------------------------------------------------
    /**
     * 透過名稱尋找節點
     * @param node 根節點
     * @param name 節點名稱
     * @param autoCache 是否自動快取查找結果
     * @param findChildFirst 是否優先使用 getChildByName 直接查找
     */
    export function GetUI(node: Node, name: string, autoCache: boolean = false, findChildFirst: boolean = false): Node {
        if (!isValid(node, true)) {
            return null
        }

        if (node.name == name) {
            return node
        }

        // 快取機制
        if (autoCache) {
            const cache = node['__uiCache'] as Record<string, Node>
            if (!cache) {
                node['__uiCache'] = {}
            } else if (cache[name]) {
                // 驗證快取的節點是否仍然有效且名稱正確
                if (!isValid(cache[name], true) || cache[name].name !== name) {
                    cache[name] = null
                } else {
                    return cache[name]
                }
            }
        }

        // 優先使用 getChildByName 直接查找
        if (findChildFirst && name && name !== "") {
            const directFind = node.getChildByName(name)
            if (isValid(directFind, true)) {
                if (autoCache) {
                    node['__uiCache'][name] = directFind
                }
                return directFind
            }
        }

        // 遞迴查找子節點
        for (const child of node.children) {
            const find = NodeUtils.GetUI(child, name, false, false)
            if (isValid(find, true)) {
                if (autoCache) {
                    node['__uiCache'][name] = find
                }
                return find;
            }
        }

        return null;
    }

    //----------------------------------------------------------------
    /**
     * 刪除節點底下的所有子節點
     * @param node 目標節點
     */
    export function DestroyChildren(node: Node): void {
        if (!isValid(node, true)) {
            return;
        }

        for (let i = (node.children?.length ?? 0) - 1; i >= 0; --i) {
            const child = node.children[ i ];
            isValid(child, true) && child.destroy();
        }
    }

    //----------------------------------------------------------------
    /**
     * 搜尋節點底下的 Component (包含子節點)
     * @param target 目標節點/組件
     * @param type Component 類型
     */
    export function SearchComponent<T extends Component>(target: Node | Component, type: string | AbstractCtor<T>): T {
        if (!isValid(target, true)) {
            return null;
        }

        const comp = target.getComponent(type as any) || target.getComponentInChildren(type as any);
        return isValid(comp, true) ? comp as T : null;
    }

    //----------------------------------------------------------------
    /**
     * 安裝 Component，先 get，若不存在則 add
     * @param target 目標節點/組件
     * @param type Component 類型
     */
    export function InstallComponent<T extends Component>(target: Node | Component, type: string | AbstractCtor<T>): T {
        if (!isValid(target, true)) {
            return null;
        }

        const comp = target.getComponent(type as any) || target.addComponent(type as any);
        return comp as T;
    }

    //----------------------------------------------------------------
}



//================================================================================================
// Position 相關功能
//================================================================================================

export namespace NodeUtils
{
    //----------------------------------------------------------------
    /** 設定節點 X 座標 */
    export function SetPosX(node: Node, x: number): void {
        node?.setPosition(x, node.position.y, node.position.z);
    }

    /** 設定節點 Y 座標 */
    export function SetPosY(node: Node, y: number): void {
        node?.setPosition(node.position.x, y, node.position.z);
    }

    /** 設定節點 Z 座標 */
    export function SetPosZ(node: Node, z: number): void {
        node?.setPosition(node.position.x, node.position.y, z);
    }

    //----------------------------------------------------------------
    /**
     * 將世界座標轉換為節點座標
     */
    export function ConvertToNodeSpaceAR(node: Node, worldPos: math.Vec3): math.Vec3
    {
        const uiTrans = node?.getComponent?.(UITransform);
        if (isValid(uiTrans, true) && isValid(worldPos)) {
            return uiTrans.convertToNodeSpaceAR(worldPos);
        } else {
            return worldPos ?? math.Vec3.ZERO;
        }
    }

    //----------------------------------------------------------------
    /**
     * 計算節點在目標節點座標系的位置
     * @param node 節點
     * @param targetParent 目標節點
     */
    export function ConvertNodeSpacePosition(node: Node, targetParent: Node): math.Vec3
    {
        const worldPos = node?.worldPosition ?? math.Vec3.ZERO;
        return NodeUtils.ConvertToNodeSpaceAR(targetParent, worldPos);
    }

    //----------------------------------------------------------------

}



//================================================================================================
// Size 相關功能
//================================================================================================

export namespace NodeUtils
{
    //----------------------------------------------------------------
    /**
     * 取得節點尺寸
     * @param node 目標節點
     */
    export function GetSize(node: Node): math.Size {
        if (!isValid(node, true)) {
            return NodeUtils.DEFAULT_SIZE;
        }

        const uiTrans = node.getComponent(UITransform);
        return uiTrans?.contentSize ?? NodeUtils.DEFAULT_SIZE;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點尺寸
     * @param node 目標節點
     * @param size 尺寸
     */
    export function SetSize(node: Node, size: math.Size): void;

    /**
     * 設定節點尺寸
     * @param node 目標節點
     * @param refNode 參考節點
     */
    export function SetSize(node: Node, refNode: Node): void;

    /**
     * 設定節點尺寸
     * @param node 目標節點
     * @param width 寬度
     * @param height 高度
     */
    export function SetSize(node: Node, width: number, height: number): void;

    /** 設定節點尺寸 - 實作 */
    export function SetSize(node: Node, arg1: math.Size | Node | number, arg2?: number): void {
        if (!isValid(node, true)) {
            return;
        }

        const uiTrans = NodeUtils.InstallComponent(node, UITransform);

        if (arg1 instanceof math.Size) {
            uiTrans.setContentSize(arg1);
        } else if (arg1 instanceof Node) {
            uiTrans.setContentSize(NodeUtils.GetSize(arg1));
        } else {
            uiTrans.setContentSize(arg1 ?? 0, arg2 ?? 0);
        }
    }

    //----------------------------------------------------------------
    /**
     * 取得節點寬度
     * @param node 目標節點
     */
    export function GetWidth(node: Node): number {
        return NodeUtils.GetSize(node).width;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點寬度
     * @param node 目標節點
     * @param width 寬度 (px)
     */
    export function SetWidth(node: Node, width: number): void {
        if (!isValid(node, true)) {
            return;
        }

        const uiTrans = NodeUtils.InstallComponent(node, UITransform);
        uiTrans.width = width;
    }

    //----------------------------------------------------------------
    /**
     * 取得節點高度
     * @param node 目標節點
     */
    export function GetHeight(node: Node): number {
        return NodeUtils.GetSize(node).height;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點高度
     * @param node 目標節點
     * @param height 高度 (px)
     */
    export function SetHeight(node: Node, height: number): void {
        if (!isValid(node, true)) {
            return;
        }

        const uiTrans = NodeUtils.InstallComponent(node, UITransform);
        uiTrans.height = height;
    }

    //----------------------------------------------------------------
    /**
     * 判斷兩個尺寸是否相等
     */
    export function SizeEquals(a: math.Size, b: math.Size): boolean
    {
        return a?.width === b?.width && a?.height === b?.height;
    }

    //----------------------------------------------------------------
}



//================================================================================================
// Anchor 相關功能
//================================================================================================

export namespace NodeUtils
{
    //----------------------------------------------------------------
    /**
     * 取得節點錨點
     * @param node 目標節點
     */
    export function GetAnchor(node: Node): math.Vec2 {
        if (!isValid(node, true)) {
            return NodeUtils.DEFAULT_ANCHOR;
        }

        const uiTrans = node.getComponent(UITransform);
        return uiTrans?.anchorPoint ?? NodeUtils.DEFAULT_ANCHOR;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點錨點
     * @param node 目標節點
     * @param anchor 錨點
     */
    export function SetAnchor(node: Node, anchor: math.Vec2): void {
        if (!isValid(node, true)) {
            return;
        }

        const uiTrans = NodeUtils.InstallComponent(node, UITransform);
        uiTrans.anchorPoint = anchor ?? math.v2(0.5, 0.5);
    }

    //----------------------------------------------------------------
    /**
     * 取得節點 anchorX
     * @param node 目標節點
     */
    export function GetAnchorX(node: Node): number {
        return NodeUtils.GetAnchor(node).x;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點 anchorX
     * @param node 目標節點
     * @param x anchorX
     */
    export function SetAnchorX(node: Node, x: number): void {
        if (!isValid(node, true)) {
            return;
        }

        const uiTrans = NodeUtils.InstallComponent(node, UITransform);
        uiTrans.anchorX = x;
    }

    //----------------------------------------------------------------
    /**
     * 取得節點 anchorY
     * @param node 目標節點
     */
    export function GetAnchorY(node: Node): number {
        return NodeUtils.GetAnchor(node).y;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點 anchorY
     * @param node 目標節點
     * @param y anchorY
     */
    export function SetAnchorY(node: Node, y: number): void {
        if (!isValid(node, true)) {
            return;
        }

        const uiTrans = NodeUtils.InstallComponent(node, UITransform);
        uiTrans.anchorY = y;
    }

    //----------------------------------------------------------------
}



//================================================================================================
// Opacity & Color 相關功能
//================================================================================================

export namespace NodeUtils
{
    //----------------------------------------------------------------
    /**
     * 取得節點不透明度
     * @param node 目標節點
     */
    export function GetOpacity(node: Node): number {
        if (!isValid(node, true)) {
            return NodeUtils.DEFAULT_OPACITY;
        }

        const uiOpacity = node.getComponent(UIOpacity);
        return uiOpacity?.opacity ?? NodeUtils.DEFAULT_OPACITY;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點不透明度
     * @param node 目標節點
     * @param opacity 不透明度
     */
    export function SetOpacity(node: Node, opacity: number): void {
        if (!isValid(node, true)) {
            return;
        }

        const uiOpacity = NodeUtils.InstallComponent(node, UIOpacity);
        uiOpacity.opacity = Math.max(OPACITY_MIN, Math.min(OPACITY_MAX, Math.round(opacity)));
    }

    //----------------------------------------------------------------
    /**
     * 取得節點顏色
     * @param node 目標節點
     * @returns 顏色 (沒有 UIRenderer 則預設為白色)
     */
    export function GetColor(node: Node): math.Color {
        if (!isValid(node, true)) {
            return NodeUtils.DEFAULT_COLOR;
        }

        const uiRenderer = node.getComponent(UIRenderer);
        return uiRenderer?.color ?? NodeUtils.DEFAULT_COLOR;
    }

    //----------------------------------------------------------------
    /**
     * 設定節點顏色
     * @param node 目標節點
     * @param color 顏色
     */
    export function SetColor(node: Node, color: math.Color, recursively: boolean = false): void {
        if (!isValid(node, true)) {
            return
        }

        if (recursively) {
            const uiRenderers = node.getComponentsInChildren(UIRenderer)
            uiRenderers.forEach(renderer => renderer.color = color)
        } else {
            const uiRenderer = node.getComponent(UIRenderer)
            isValid(uiRenderer, true) && (uiRenderer.color = color)
        }
    }

    //----------------------------------------------------------------
    /**
     * 將節點及其子節點的渲染器設置為灰階或正常顏色
     * @param target 目標節點 或 組件(對象為組件所在的節點)
     * @param isGrayscale 是否設置為灰階
     * @param recursively 是否遞迴設置子節點
     * @param filter 過濾函數，若返回 false 則不處理該渲染器
     */
    export function SetGrayscale(   target:         Node | Component,
                                    isGrayscale:    boolean,
                                    recursively:    boolean = true,
                                    filter?:        (uiRenderer: UIRenderer)=>boolean
                                    ): void
    {
        const targetNode = target instanceof Node ? target : target?.node;
        if (!isValid(targetNode, true)) {
            return;
        }

        // 獲取節點的 UIRenderer 組件
        let uiRenderers = targetNode.getComponents(UIRenderer) ?? [];

        // 如果需要遞迴，則獲取所有子節點的 UIRenderer 組件
        if (recursively) {
            const childRenderers = targetNode.getComponentsInChildren(UIRenderer);
            childRenderers?.forEach(renderer => uiRenderers.push(renderer));
        }

        // 過濾不需要處理的渲染器
        if (typeof filter === "function") {
            uiRenderers = uiRenderers.filter(renderer => filter(renderer));
        }

        // 依序設置每個渲染器的材質 (或灰階屬性)
        const CUSTOM_MTL_CACHE_KEY = "_node_utils_custom_mtl_cache";
        uiRenderers.forEach(renderer=>
        {
            if (!isValid(renderer, true)) {
                warn(`Invalid renderer found in node: ${targetNode.name}`);
            } else if (renderer instanceof Sprite) {
                renderer.grayscale = isGrayscale;
            } else {
                if (isGrayscale) {
                    const customMtl = renderer.customMaterial;
                    isValid(customMtl, true) && renderer[CUSTOM_MTL_CACHE_KEY] === customMtl;
                    renderer.customMaterial = BuiltinResUtils.GetMaterial.UISpriteGray;
                } else {
                    const customMtl = renderer[CUSTOM_MTL_CACHE_KEY];
                    isValid(customMtl, true) && (delete renderer[CUSTOM_MTL_CACHE_KEY]);
                    renderer.customMaterial = isValid(customMtl, true) ? customMtl : null;
                }
            }
        });
    }

    //----------------------------------------------------------------

}

//================================================================================================
// Position & Scale 相關功能
//================================================================================================

export namespace NodeUtils {
    //----------------------------------------------------------------
    /**
     * 設定節點位置
     * @param node 目標節點
     * @param position 位置
     */
    export function PERCENT_CHILD_FIX(node: Node, parent: Node = null, percentX: number = 0.5, percentY: number = 0.5): void {
        if (!isValid(node, true)) {
            return
        }
        if (!isValid(parent, true)) {
            parent = node.parent
            if (!isValid(parent, true)) {
                return
            }
        }
        const parentSize = parent.getComponent(UITransform)?.contentSize ?? math.Size.ZERO
        // 必須參考parent的錨點來計算位置
        const parentAnchor = parent.getComponent(UITransform)?.anchorPoint ?? Vec2.ZERO
        const position = node.position.clone()
        position.x = parentSize.width * percentX - parentAnchor.x * parentSize.width
        position.y = parentSize.height * percentY - parentAnchor.y * parentSize.height
        node.position = position
    }
}