import { _decorator, isValid, instantiate, Enum, CCBoolean, Node, Component, Prefab } from "cc";
import { EDITOR } from "cc/env";

const { ccclass, property } = _decorator;

//------------------------------------------------------------------------------------------------

export enum PrefabBondInstStrategy {
    ON_LOAD,
    ON_ENABLE,
    ON_GET_INSTANCE,
}

//------------------------------------------------------------------------------------------------

@ccclass
export class PrefabBond extends Component
{
    //================================================================
    // [ 屬性 ]
    //================================================================

    //----------------------------------------------------------------

    @property({
        type: Enum(PrefabBondInstStrategy),
        displayName: "實例化策略",
    })
    protected m_instStrategy: PrefabBondInstStrategy = PrefabBondInstStrategy.ON_LOAD;

    //----------------------------------------------------------------

    @property({
        type: CCBoolean,
        displayName: "實例化時是否啟用節點"
    })
    protected m_activeOnInst: boolean = true;

    //----------------------------------------------------------------

    @property({
        type: Prefab,
        displayName: "Prefab"
    })
    protected m_prefab: Prefab = null;

    //----------------------------------------------------------------

    @property({
        type: Node,
        displayName: "實例",
        readonly: true
    })
    protected m_instance: Node = null;

    //----------------------------------------------------------------

    @property({
        type: CCBoolean,
        displayName: "已實例化",
        visible: false,
    })
    protected m_isInstantiated: boolean = false;

    //----------------------------------------------------------------

    //================================================================
    // [ 編輯器 ]
    //================================================================

    //----------------------------------------------------------------

    @property({
        type: CCBoolean,
        displayName: "產生實例",
        group: { name: "編輯器" }
    })
    protected get InstantiateInEditor(): boolean { return false; }
    protected set InstantiateInEditor(value: boolean) {
        if (EDITOR) {
            this.Instantiate();
        }
    }

    //----------------------------------------------------------------

    @property({
        type: CCBoolean,
        displayName: "重建實例",
        group: { name: "編輯器" },
        visible: function() { return isValid(this.m_instance, true); }
    })
    protected get RebuildInEditor(): boolean { return false; }
    protected set RebuildInEditor(value: boolean) {
        if (EDITOR) {
            this.Destroy();
            this.Instantiate();
        }
    }

    //----------------------------------------------------------------

    @property({
        type: CCBoolean,
        displayName: "銷毀實例",
        group: { name: "編輯器" },
        visible: function() { return isValid(this.m_instance, true); }
    })
    protected get DestroyInEditor(): boolean { return false; }
    protected set DestroyInEditor(value: boolean) {
        if (EDITOR) {
            this.Destroy();
        }
    }

    //----------------------------------------------------------------

    //================================================================
    // [ 方法 ]
    //================================================================

    //----------------------------------------------------------------
    /** 實例 */
    public get Instance(): Node {
        if (!this.m_isInstantiated) {
            this.Instantiate();
        }
        return this.m_instance;
    }

    //----------------------------------------------------------------

    protected onLoad(): void {
        if (!this.m_isInstantiated && this.m_instStrategy === PrefabBondInstStrategy.ON_LOAD) {
            this.Instantiate();
        }
    }

    //----------------------------------------------------------------

    protected onEnable(): void {
        if (!this.m_isInstantiated && this.m_instStrategy === PrefabBondInstStrategy.ON_ENABLE) {
            this.Instantiate();
        }
    }

    //----------------------------------------------------------------
    /** 實例化 */
    public Instantiate(): void {
        if (!isValid(this.m_instance, true) && isValid(this.m_prefab, true)) {
            this.m_instance = instantiate( this.m_prefab );
            this.m_instance.parent = this.node;
            this.m_instance.active = this.m_activeOnInst;
            this.m_isInstantiated = true;
        }
    }

    //----------------------------------------------------------------
    /** 銷毀 */
    public Destroy(): void {
        if (isValid(this.m_instance, true)) {
            this.m_instance.destroy();
            this.m_instance = null;
            this.m_isInstantiated = false;
        }
    }

    //----------------------------------------------------------------

}