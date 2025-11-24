import SlotGameBase from "./SlotGameBase";
import { _decorator } from "cc";

const { ccclass, property } = _decorator;

export namespace GameMock {
    /** 原版GameStage*/
    @ccclass
    export abstract class SlotGameBaseMock extends SlotGameBase {

        protected SetSideBarPositionY(posY: number) {
            // 尚未實作
        }

        protected CustomSideBarButtonPositionY() {
            // 尚未實作
        }

        FeatureGameEnd(BetValue: number, TotalWin: BigNumber, arg2: () => void, isJp: boolean = false): boolean {
            // 2.4.6額外處理extraBet的判斷 這邊先導進BigWinEffect
            return GamesChief.SlotGame.DeclareBigWin(BetValue, TotalWin, arg2)
        }
    }
}