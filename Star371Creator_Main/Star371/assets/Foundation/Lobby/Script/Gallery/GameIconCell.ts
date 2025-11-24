import { _decorator, Component, instantiate, Layout, Node, Prefab } from 'cc';
import { GameIconSource } from './GameIconSource';
import { GameIconDefine } from './GameIconDefine';
import { GameIcon } from './GameIcon';
const { ccclass, property } = _decorator;

@ccclass('GameIconCell')
export class GameIconCell extends Component {
    private static s_iconMap: Map<GameIconDefine.Type, Node[]> = new Map<GameIconDefine.Type, Node[]>();

    @property({
        type: Layout,
        displayName: "Layout"
    })
    private m_layout: Layout = null;

    @property({
        type: Prefab,
        displayName: "Icon Prefab"
    })
    private m_iconPrefab: Prefab[] = [];

    protected onDisable(): void {
        this.m_layout.node.children.forEach(child=>{
            const map: Map<GameIconDefine.Type, Node[]> = GameIconCell.s_iconMap;
            const gameIcon:GameIcon = child.getComponent(GameIcon);
            const type:GameIconDefine.Type = gameIcon.Type;
            const list:Node[] = map.get(type) || [];
            list.push(child);
            map.set(type, list);
        });
        this.m_layout.node.removeAllChildren();
    }

    protected onDestroy(): void {
        const map: Map<GameIconDefine.Type, Node[]> = GameIconCell.s_iconMap;
        map.forEach((list, type) => {
            list.forEach(node=>node.destroy());
            list.length = 0;
        });
        map.clear();
    }

    /**
     * 配置位置
     */
    public Layout(list:GameIconSource[]): void {
        const count:number = list.length;
        let layoutInfo:GameIconDefine.LayoutInfo = GameIconDefine.CellLayout[count==1 ? list[0].Type : GameIconDefine.Type.TINY];

        if (count == 2) {
            // [當一個 Cell 中出現兩個 icon]
            const first:GameIconDefine.Type  = list[0].Type;
            const second:GameIconDefine.Type = list[1].Type;

            if (first == GameIconDefine.Type.COMPACT || second == GameIconDefine.Type.COMPACT) {
                layoutInfo = GameIconDefine.CellLayout[GameIconDefine.Type.COMPACT];
            } else if (first == GameIconDefine.Type.SMALL && second == GameIconDefine.Type.SMALL) {
                layoutInfo = GameIconDefine.CellLayout[GameIconDefine.Type.SMALL];
            }
        }

        list.forEach((source, index) => {
            const map: Map<GameIconDefine.Type, Node[]> = GameIconCell.s_iconMap;
            const type:GameIconDefine.Type = source.Type;
            const prefab: Prefab = this.m_iconPrefab[type];
            const gameIconNode: Node = map.get(type)?.pop() || instantiate(prefab);
            const gameIcon: GameIcon = gameIconNode.getComponent(GameIcon);
            gameIcon.Setup(source);
            this.m_layout.node.addChild(gameIconNode);
        });

        this.m_layout.paddingTop = layoutInfo.Top;
        this.m_layout.spacingY = layoutInfo.SpaceY;
        this.m_layout.updateLayout();
    }

    public LoadIcon(): void {
        this.m_layout.node.children.forEach(child=>child.getComponent(GameIcon)?.LoadIcon());
    }
}


