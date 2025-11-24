import { _decorator, Component, Node } from 'cc';
import { BaseLobbyStage } from './BaseLobbyStage';
import { TopBarMode } from '../Define/TopBarModeDefine';
const { ccclass, property } = _decorator;

@ccclass('SubLobbyStage')
export class SubLobbyStage extends BaseLobbyStage {
    /**
     * 指定 TopBar 模試
     */
    protected TopBarMode(): TopBarMode {
        return TopBarMode.SUB_LOBBY;
    }
}


