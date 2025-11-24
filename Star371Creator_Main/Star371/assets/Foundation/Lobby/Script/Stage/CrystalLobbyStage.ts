import { _decorator, Component, Node, UIOpacity } from 'cc';
import { LobbyStage } from './LobbyStage';
import { TopBarMode } from '../../../../Script/Define/TopBarModeDefine';
import { TopBarController } from '../../../../Script/Feature/TopBar/TopBarController';
import { CrystalLobbyViewController } from '../ViewController/CrystalLobbyViewController';
const { ccclass, property } = _decorator;

@ccclass('CrystalLobbyStage')
export class CrystalLobbyStage extends LobbyStage {
    protected override onLoad(): void {
        super.onLoad();
        this.m_viewController = this.node.getComponent(CrystalLobbyViewController);
    }

    /**
     * 指定 TopBar 模試
     */
    protected TopBarMode(): TopBarMode {
        return TopBarMode.SUB_LOBBY;
    }
}


