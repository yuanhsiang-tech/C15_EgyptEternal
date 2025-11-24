import { _decorator, Component, instantiate, Node, Prefab, UIOpacity, Vec3 } from 'cc';
import { GameApp } from '../../../../Script/App/GameApp';
import { GameIconSource } from '../Gallery/GameIconSource';
import { GameIconDefine } from '../Gallery/GameIconDefine';
import { GameId } from '../../../../Script/Define/GameDefine';
import { StageId } from '../../../../Script/Define/StageDefine';
import { ViewDefine } from '../../../../Script/Define/ViewDefine';
import { EventDefine } from '../../../../Script/Define/EventDefine';
import { ViewManager } from '../../../../Script/ViewManage/ViewManager';
import { BaseLobbyStage } from '../../../../Script/Stage/BaseLobbyStage';
import { EventDispatcher } from '../../../../Stark/Utility/EventDispatcher';
import { BaseLobbyViewController } from '../ViewController/BaseLobbyViewController';
const { ccclass, property } = _decorator;

@ccclass('LobbyStage')
export abstract class LobbyStage extends BaseLobbyStage {
    protected m_viewController:BaseLobbyViewController;

    protected override onEnable(): void {
        super.onEnable();
        EventDispatcher.Shared.On(EventDefine.System.GAME_ICON_CLICK, this.OnGameIconClick, this);
        this.OnLobbyEnter();
    }

    protected override onDisable(): void {
        super.onDisable();
        EventDispatcher.Shared.Off(EventDefine.System.GAME_ICON_CLICK, this.OnGameIconClick, this);
        this.OnLobbyExit();
    }

    protected OnLobbyEnter(): void {}
    protected OnLobbyExit(): void {}

    protected OnGameIconClick(gameSource:GameIconSource): void {
        switch (gameSource.Action) {
            case GameIconDefine.Action.UI_PRESENT: {
                // [開啟遊戲內的機制介面]
                const viewEvent:IViewEvent = ViewDefine[gameSource.ActionParam[0]];
                const params:any[] = gameSource.ActionParam.slice(1);
                ViewManager.Open(viewEvent, ...params);
                break;
            }
            case GameIconDefine.Action.WEB_BROWSING: {
                // [瀏覽器開啟網頁]
                const url:string = gameSource.ActionParam[0];
                GameApp.Shared.OpenUrl(url);
                break;
            }
            case GameIconDefine.Action.JOIN_GAME: {
                // [加入指定的遊戲廳館]
                const themeName:string = gameSource.ActionParam[0];
                EventDispatcher.Shared.Dispatch(EventDefine.System.ENTER_GAME, gameSource.GameId, gameSource.ThemeType, themeName);
                break;
            }
            case GameIconDefine.Action.GO_TO_STAGE: {
                // [前往指定的場景]
                GameApp.Shared.StageManager.Push(parseInt(gameSource.ActionParam[0]) as StageId);
                break;
            }
            default: {
                if (gameSource.GameId != GameId.UNDEF) {
                    // [明確的要進入遊戲]
                    if (gameSource.HasSubLobby) {
                        // [有子大廳] => 進入子大廳
                        EventDispatcher.Shared.Dispatch(EventDefine.System.ENTER_GAME_LOBBY, gameSource.GameId, gameSource.ThemeType, gameSource.SubLobby);
                    } else {
                        // [沒有子大廳] => 直接進入遊戲
                        EventDispatcher.Shared.Dispatch(EventDefine.System.ENTER_GAME, gameSource.GameId, gameSource.ThemeType);
                    }
                }
                break;
            }
        }
    }
}