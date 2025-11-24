import { _decorator, Component, Node } from 'cc';
import { BaseStage } from './BaseStage';
import { GameBundle } from '../Bundle/Bundle';
const { ccclass, property } = _decorator;

@ccclass('BaseLobbyStage')
export class BaseLobbyStage extends BaseStage {
    /**
     * 準備工作完成通知(無論成功或失敗)
     * @param success 是否成功
     */
    protected override OnPreparationsFinish(success:boolean): void {
        super.OnPreparationsFinish(success);
        if (success) {
            GameBundle.Current?.Destroy();
        }
    }
}


