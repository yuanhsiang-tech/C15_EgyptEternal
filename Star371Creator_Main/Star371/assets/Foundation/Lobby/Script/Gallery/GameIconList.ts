import { _decorator, Color, Component, instantiate, Node, Prefab, Size, Sprite, UITransform } from 'cc';
import { GameIconCell } from './GameIconCell';
import { GameIconDefine } from './GameIconDefine';
import { GameIconSource } from './GameIconSource';
import { GameIconStatus } from '../../../../Script/Proto/service/lobby/lobby_pb';
import { ThemeType } from '../../../../Script/Proto/gt2/basicTypes/basicTypes_pb';
import { TableView, TableViewDataSource, TableViewDelegate } from '../../../../Stark/TableView/Script/TableView';
const { ccclass, property } = _decorator;

// footer 寬度
const FOOTER_WIDTH:number = 30;

// 小尺寸 Cell 寬度縮減量
const SMALL_CELL_WIDTH_REDUCE:number = 20;
// 一般尺寸 Cell 寬度縮減量
const NORMAL_CELL_WIDTH_REDUCE:number = 15;

export interface GameIconListDataSource {
    IconSource(): GameIconSource[][];
    TableViewHeaderView(tableView: TableView): Node;
    TableViewHeaderSize(tableView: TableView): Size;
}

@ccclass('GameIconList')
export class GameIconList extends Component implements Partial<TableViewDataSource>, Partial<TableViewDelegate> {
    /**
     * 依據佔用格數分組
     * @param coreData 遊戲圖示原始資料
     */
    public static GroupByOccupied(coreData:GameIconStatus[]): GameIconSource[][] {
        let grouped: GameIconSource[][] = [];
        let group:GameIconSource[];

        coreData.forEach(d => {
            const source: GameIconSource = new GameIconSource();
            source.Setup(d);

            let occupied:number = 0;
            group = group || [];
            group.forEach(each=> occupied += each.TypeOccupied);

            if (occupied + source.TypeOccupied > GameIconDefine.TypeOccupied[GameIconDefine.Type.REGULAR]) {
                grouped.push(group);
                group = [];
            }
            group.push(source);
        });

        if (group && group.length > 0) {
            grouped.push(group);
        }

        return grouped;
    }

    private m_delegate: Partial<GameIconListDataSource>;
    private m_footerSize: Size;
    private m_normalCellSize: Size;
    private m_smallCellSize: Size;
    private m_themeType: ThemeType;

    public set ThemeType(type:ThemeType) { this.m_themeType = type; }

    @property({
        type: TableView,
        displayName: "TableView",
        tooltip: "遊戲列表"
    })
    private m_tableView: TableView = null;

    protected onLoad(): void {
        const talbeViewSize: Size = this.m_tableView.getComponent(UITransform).contentSize;
        this.m_footerSize = new Size(FOOTER_WIDTH, talbeViewSize.height);
    }

    protected start(): void {
        this.m_normalCellSize = this.m_tableView.GetDefaultCellSize().clone();
        this.m_smallCellSize = this.m_normalCellSize.clone();
        this.m_smallCellSize.width -= SMALL_CELL_WIDTH_REDUCE;
        this.m_normalCellSize.width -= this.m_themeType == 0 ? 0 : NORMAL_CELL_WIDTH_REDUCE;
    }

    public SetTableViewProtocol(delegate: Partial<GameIconListDataSource>): void {
        this.m_tableView.DataSource = this;
        this.m_tableView.Delegate = this;
        this.m_delegate = delegate;
    }

    public ReloadData(): void {
        this.m_tableView.ReloadData();
        this.UpdateGameIconImage();
    }

    public NumberOfCellsInTableView(tableView: TableView): number {
        return this.m_delegate.IconSource().length;
    }

    public TableCellSizeForIndex(tableView: TableView, index: number): Size {
        const groupedIconSoucre:GameIconSource[][] = this.m_delegate.IconSource();
        const list:GameIconSource[] = groupedIconSoucre[index];
        const useSmall:boolean = list && !!list.find(x=>x.Type == GameIconDefine.Type.SMALL);
        return useSmall ? this.m_smallCellSize : this.m_normalCellSize;
    }

    public TableCellAtIndex(tableView: TableView, index: number): Node {
        const groupedIconSoucre:GameIconSource[][] = this.m_delegate.IconSource();
        const list:GameIconSource[] = groupedIconSoucre[index];
        const useSmall:boolean = list && !!list.find(x=>x.Type == GameIconDefine.Type.SMALL);
        const cell:Node = tableView.DequeueDefaultCell();
        const iconCell:GameIconCell = cell.getComponent(GameIconCell);
        iconCell.getComponent(UITransform).setContentSize(useSmall?this.m_smallCellSize:this.m_normalCellSize);
        iconCell.Layout(groupedIconSoucre[index]);
        return cell;
    }

    public TableViewScrollEnd(tableView: TableView): void {
        this.UpdateGameIconImage();
    }

    public TableViewHeaderSize(tableView: TableView): Size {
        return this.m_delegate?.TableViewHeaderSize?.(tableView);
    }

    public TableViewHeaderView(tableView: TableView): Node {
        return this.m_delegate?.TableViewHeaderView?.(tableView);
    }

    public TableViewFooterSize(tableView: TableView): Size {
        return this.m_footerSize;
    }

    private UpdateGameIconImage(): void {
        this.m_tableView.Container.children.forEach((cell:Node)=>cell.getComponent(GameIconCell)?.LoadIcon());
    }
}


