import { _decorator, Node } from 'cc';
import { UISystem } from './UISystem';
import CommonButton from '../Interactive/CommonButton';
const { ccclass, property, disallowMultiple } = _decorator;

@ccclass('UIButton')
@disallowMultiple
export class UIButton<T extends number = number> extends CommonButton implements UISystem.UI {
    @property({ visible: false })
    private m_host: T = 0 as T;

    @property({ visible: false })
    private m_Id: T = 0 as T;

    @property({
        type: Node,
        displayName: "Center Alias",
        tooltip: "可訂製的中心節點"
    })
    private m_centerAlias: Node = null;

    /**
     * 取得唯一識別 ID
     */
    public get Id(): T {
        return this.m_Id;
    }

    /**
     * 取得父(主)目標對象
     */
    public get Host(): T {
        return this.m_host;
    }

    /**
     * 取得中心節點
     */
    public get Center(): Node {
        return this.m_centerAlias || this.node;
    }

    /**
     * 設定唯一識別 ID
     * @param id 唯一識別 ID
     */
    public SetId(id: T) {
        UISystem.Helper.SetId(this, id);
    }

    /**
     * 連結父(主)目標對象
     * @param host 父(主)目標對象
     */
    public LinkHost(host: T);
    public LinkHost(host: UISystem.UI);
    public LinkHost(host: UISystem.UI|T) {
        UISystem.Helper.LinkHost(this, host);
    }

    /**
     * 設定中心節點
     * @param center 中心節點
     */
    public SetCenter(center: Node) {
        this.m_centerAlias = center;
    }

    protected override onLoad(): void {
        super.onLoad?.();
        UISystem.Helper.OnLoad(this);
    }

    protected override onDestroy(): void {
        super.onDestroy?.();
        UISystem.Helper.OnDestroy(this);
    }
}