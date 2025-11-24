import { _decorator, Component, Node, UIOpacity } from 'cc';
import { GameIconList, GameIconListDataSource } from '../Gallery/GameIconList';
import { GameIconSource } from '../Gallery/GameIconSource';
const { ccclass, property } = _decorator;

@ccclass('BaseLobbyViewController')
export class BaseLobbyViewController extends Component implements Partial<GameIconListDataSource> {
    protected m_groupedIconSoucre: GameIconSource[][];

    @property({
        type: UIOpacity,
        displayName: "BG"
    })
    private m_bg: UIOpacity = null;

    @property({
        type: GameIconList,
        displayName: "Icon List"
    })
    protected m_gameIconList: GameIconList = null;

    protected onLoad(): void {
        this.m_groupedIconSoucre = [];
        this.m_gameIconList.SetTableViewProtocol(this);
    }

    public IconSource(): GameIconSource[][] {
        return this.m_groupedIconSoucre;
    }

    /**
     * 介面進入全畫面顯示
     */
    public OnViewEnterFullScreen(): void {
        this.m_bg.opacity = 0;
        this.m_gameIconList.getComponent(UIOpacity).opacity = 0;
    }

    /**
     * 介面離開全畫面顯示
     */
    public OnViewExitFullScreen(): void {
        this.m_bg.opacity = 255;
        this.m_gameIconList.getComponent(UIOpacity).opacity = 255;
    }
}


