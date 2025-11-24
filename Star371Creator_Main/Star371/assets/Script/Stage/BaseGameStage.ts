import { _decorator, Component, Node } from 'cc';
import { BaseStage } from './BaseStage';
import { GameApp } from '../App/GameApp';
import { GameId } from '../Define/GameDefine';
import { EventDispatcher } from '../../Stark/Utility/EventDispatcher';
import { EventDefine } from '../Define/EventDefine';
import { ViewManager } from '../ViewManage/ViewManager';
import { ViewDefine } from '../Define/ViewDefine';
import { PersistLayers } from '../Feature/PersistLayers/PersistLayers';
import { Define } from '../Define/GeneralDefine';
import { Command } from '../Net/Command/Command';
import { GameService, GameServiceCallback } from '../Service/GameService';
import { UserJoinGameResult, UserLeaveGameResult } from '../Proto/gt2/game/game_pb';
import { TopBarMode } from '../Define/TopBarModeDefine';
const { ccclass, property } = _decorator;

@ccclass('BaseGameStage')
export class BaseGameStage extends BaseStage implements GameServiceCallback {
    protected onLoad(): void {
        super.onLoad?.();
        //TODO Ide
        if (GameService.Instance) {
            GameService.Instance.SetCallback(this);
        }

    }

    /**
     * 返回按鈕點擊事件
     */
    protected override OnTopBarBackClicked(): void {
        GameApp.Shared.StageManager.Pop();
    }

    /**
     * 是否需要 TopBar
     */
    protected override NeedTopBar(): boolean {
        return false;
    }

    /**
     * 指定 TopBar 模試
     */
    protected TopBarMode(): TopBarMode {
        return TopBarMode.GAME;
    }

    protected override onEnable(): void {
        super.onEnable();

        EventDispatcher.Shared.On(EventDefine.Game.INFO_BUTTON_PAYTABLE, this.ShowPayTable, this)
    }

    protected override onDisable(): void {
        super.onDisable();

        EventDispatcher.Shared.Off(EventDefine.Game.INFO_BUTTON_PAYTABLE, this.ShowPayTable, this)

        PersistLayers.Clear(Define.ZIndex.Global.GAME_INTERIOR);
        PersistLayers.Clear(Define.ZIndex.Global.GAME_EXTERIOR);
        PersistLayers.Clear(Define.ZIndex.Global.GAME_SUPERIOR);
    }

    /**
     * 是否仍能下注
     * @param bet 下注籌碼
     */
    public CanBet(bet: number | BigNumber): boolean {
        return true
    }

    private ShowPayTable() {
        //ViewManager.Open(ViewDefine.GAME_PAYTABLE, this.BundleName, this.m_gameVersion, this.m_payTableResDir);
    }

    //#region GameServiceCallback
    public OnGameJoined(): void {

    }

    public OnGameJoinFailed(reason: UserJoinGameResult): void {

    }

    public OnGameLeft(reason: UserLeaveGameResult): void {

    }

    public OnGameExpel(reason: UserLeaveGameResult): void {

    }

    public OnGameNotifiedLeave(reason: UserLeaveGameResult): void {

    }

    public OnCommand(command: GameService.TypeCommand) {

    }
    //#endregion
}


