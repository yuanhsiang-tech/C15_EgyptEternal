import { _decorator, Component, Node } from 'cc';
import { GameIconDefine } from './GameIconDefine';
import { GameId } from '../../../../Script/Define/GameDefine';
import { GameIconStatus } from '../../../../Script/Proto/service/lobby/lobby_pb';
import { ThemeType } from '../../../../Script/Proto/gt2/basicTypes/basicTypes_pb';
const { ccclass, property } = _decorator;

export class GameIconSource {
    private m_core: GameIconStatus;

    /**
     * 排序
     */
    public get Order(): number { return this.m_core.order; }

    /**
     * 遊戲編號
     */
    public get GameId(): GameId { return this.m_core.gameId; }

    /**
     * 廳管類型
     */
    public get ThemeType(): ThemeType { return this.m_core.themeType; }

    /**
     * Icon 類型
     */
    public get Type(): GameIconDefine.Type { return this.m_core.iconType as GameIconDefine.Type; }

    /**
     * Icon 類型佔用格數
     */
    public get TypeOccupied(): number { return GameIconDefine.TypeOccupied[this.Type]; }

    /**
     * 資源路徑
     */
    public get Res(): string { return this.m_core.res; }

    /**
     * 開始時間
     */
    public get StartTime(): string { return this.m_core.startTime; }

    /**
     * 結束時間
     */
    public get EndTime(): string { return this.m_core.endTime; }

    /**
     * 子大廳編號
     */
    public get SubLobby(): number { return GameIconDefine.ExtractSubLobby(Number(this.m_core.status)); }
    /**
     * 是否有子大廳
     */
    public get HasSubLobby(): boolean { return this.SubLobby >= 0; }

    /**
     * 活動編號
     */
    public get Activity(): number { return GameIconDefine.ExtractActivity(Number(this.m_core.status)); }
    /**
     * 是否有活動
     */
    public get HasActivity(): boolean { return this.Activity >= 0; }

    /**
     * 是否為熱門項目
     */
    public get Hot(): boolean { return (Number(this.m_core.status) & GameIconDefine.Status.HOT) != 0; }

    /**
     * 是否為最新項目
     */
    public get New(): boolean { return (Number(this.m_core.status) & GameIconDefine.Status.NEW) != 0; }

    /**
     * 是否有 Jackpot
     */
    public get Jackpot(): boolean { return (Number(this.m_core.status) & GameIconDefine.Status.JACKPOT) != 0; }

    /**
     * 是否使用 Spine 動畫
     */
    public get Spine(): boolean { return (Number(this.m_core.status) & GameIconDefine.Status.SPINE) != 0; }

    /**
     * 是否維護中
     */
    public get Maintainance(): boolean { return (Number(this.m_core.status) & GameIconDefine.Status.MAINTAINANCE) != 0; }

    /**
     * 動作類型
     */
    public get Action(): GameIconDefine.Action { return this.m_core.action as GameIconDefine.Action; }

    /**
     * 動作參數
     */
    public get ActionParam(): string[] { return this.m_core.actionParam?.split(","); }

    /**
     * 設定核心資料物件
     * @param coreData 核心資料物件
     */
    public Setup(coreData:GameIconStatus) {
        this.m_core = coreData;
    }
}


