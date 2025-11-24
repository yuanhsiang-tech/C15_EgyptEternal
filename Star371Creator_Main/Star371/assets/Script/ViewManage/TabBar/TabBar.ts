import { _decorator, ccenum, Component, instantiate, Node, Prefab } from 'cc';
import { Tab } from './Tab';
import { TouchableEvent } from '../../../Stark/Interactive/Touchable';
const { ccclass, property } = _decorator;

/**
 * TabBar 事件
 */
export interface TabBarDelegate {
    TabBarDidSelectTab(tabBar: TabBar, index: number, from: number): void;
}

/**
 * TabBar 資料來源
 */
export interface TabBarDataSource {
    TabBarNumberOfTabs(tabBar: TabBar): number;
    TabBarTitleForTab(tabBar: TabBar, index: number): string;
}

// TabBar ReloadData 時的頁籤選取模式
export enum TabBarReloadMode {
    NONE  = 0,   // 維持原有位置
    FIRST = 1,   // 回到初始位置
    LAST  = 2    // 移置最後位置
 }

 enum Mode {
    STATIC,
    DYNAMIC
 }
 ccenum(Mode)

@ccclass('TabBar')
export class TabBar<Delegate=TabBarDelegate> extends Component {
    private m_queue:Tab[] = [];
    private m_current:number = 0;
    private m_delegate:Partial<Delegate>;
    private m_dataSource:Partial<TabBarDataSource>;

    public set Delegate(delegate:Delegate) { this.m_delegate = delegate; }
    public get Delegate():Delegate { return this.m_delegate as Delegate; }

    public set DataSource(dataSource:TabBarDataSource) { this.m_dataSource = dataSource; }
    
    @property({
        type: Mode,
        displayName: 'Mode'
    })
    private m_mode:Mode = Mode.DYNAMIC;

    @property({
        type: Prefab,
        displayName: 'Tab Prefab',
        visible: function() { return this.m_mode == Mode.DYNAMIC; }
    })
    private m_tabPrefab:Prefab;

    @property({
        type: Node,
        displayName: 'Tab Area'
    })
    private m_tabArea:Node;

    /**
     * 取得目前選取的頁籤索引
     */
    public get Current(): number {
        return this.m_current;
    }

    /**
     * 取得所有頁籤
     */
    public get Tabs(): Tab[] {
        return this.m_tabArea.children.map((tabNode:Node, index:number) => {
            return tabNode.getComponent(Tab);
        });
    }

    protected onLoad(): void {
        if (this.m_mode == Mode.STATIC) {
            this.m_tabArea.children.forEach((tabNode:Node, index:number) => {
                const tab:Tab = tabNode.getComponent(Tab);
                tab?.Setup(index, this.m_dataSource?.TabBarTitleForTab?.(this as TabBar, index));
                tab?.On(TouchableEvent.Clicked, this.OnTabClicked, this);
            });
        }
    }

    protected onDestroy(): void {
        super.onDestroy?.();
        this.m_queue.forEach(tab => {
            tab.node.destroy();
        });
        this.m_queue.length = 0;
    }

    /**
     * 選取指定頁籤
     */
    public SelectTab(index:number): void {
        const selectIndex:number = index >= 0 && index < this.m_tabArea.children.length ? index : 0;
        this.TriigerSelect(selectIndex);
    }

    /**
     * 重新載入頁籤
     * @param mode 頁籤選取模式
     */
    public ReloadData(mode:TabBarReloadMode=TabBarReloadMode.NONE): void {
        if (this.m_mode == Mode.STATIC) {
            return;
        }

        if (!(this.m_dataSource?.TabBarNumberOfTabs)) {
            throw new Error("TabBar doesn't have a data source");
        }

        // 清空原有的所有頁籤
        if (this.m_tabArea.children.length > 0) {
            for (let i = 0; i < this.m_tabArea.children.length; i++) {
                const tab:Tab = this.m_tabArea.children[i].getComponent(Tab);
                tab.Deselect();
                tab.Off(TouchableEvent.Clicked, this.OnTabClicked, this);
                this.m_queue.push(tab);
            }
        }
        this.m_tabArea.removeAllChildren();

        // 重新生成頁籤
        const count:number = this.m_dataSource.TabBarNumberOfTabs(this as TabBar);
        for (let i = 0; i < count; i++) {
            const tab:Tab = this.m_queue.pop() || instantiate(this.m_tabPrefab).getComponent(Tab);
            if (!tab) {
                throw new Error("Tab prefab doesn't have Tab component");
            }
            tab.node.name = "Tab_" + i;
            tab.node.parent = this.m_tabArea;
            tab.Setup(i, this.m_dataSource?.TabBarTitleForTab?.(this as TabBar, i));
            tab.On(TouchableEvent.Clicked, this.OnTabClicked, this);
        }

        if (mode == TabBarReloadMode.FIRST) {
            this.TriigerSelect(0);
        } else if (mode == TabBarReloadMode.LAST) {
            this.TriigerSelect(this.m_tabArea.children.length - 1);
        } else if (this.m_current >= this.m_tabArea.children.length) {
            this.TriigerSelect(this.m_tabArea.children.length - 1);
        }
    }

    /**
     * 頁籤點擊事件
     * @param tab 點擊的頁籤
     */
    private OnTabClicked(tab:Tab): void {
        const index:number = this.m_tabArea.children.indexOf(tab.node);

        // 如果頁籤相同則不觸發
        this.m_current != index && this.TriigerSelect(index);
    }

    /**
     * 觸發頁籤選取
     * @param index 選取的頁籤索引
     */
    private TriigerSelect(index:number): void {
        const from:number = this.m_current;
        this.m_current = index;
        this.m_tabArea.children[from].getComponent(Tab).Deselect();
        this.m_tabArea.children[index].getComponent(Tab).Select();
        (this.m_delegate as unknown as TabBarDelegate)?.TabBarDidSelectTab?.(this as TabBar, index, from);
    }
}


