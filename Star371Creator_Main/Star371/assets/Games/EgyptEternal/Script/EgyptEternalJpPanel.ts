import { _decorator, Component, Node } from 'cc';
import GameBar from "../../../Script/Game/Platform/GameBar/GameBar";
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { EgyptEternalBind } from './EgyptEternalBind';
const { ccclass, property } = _decorator;

@ccclass('EgyptEternalJpPanel')
export class EgyptEternalJpPanel extends Component {
    @property({ type: Touchable, tooltip: "Mini JP觸碰" })
    private m_miniTouch: Touchable = null;
    @property({ type: Touchable, tooltip: "Minor JP觸碰" })
    private m_minorTouch: Touchable = null;
    @property({ type: Touchable, tooltip: "Major JP觸碰" })
    private m_majorTouch: Touchable = null;
    @property({ type: Touchable, tooltip: "Grand JP觸碰" })
    private m_grandTouch: Touchable = null;

    private m_bind: EgyptEternalBind = null;

    /**地bar */
    private m_gameBar: GameBar = null;
    set GameBar(gameBar: GameBar) {
        this.m_gameBar = gameBar;
    }
    public InitBind(bind: EgyptEternalBind) {
        this.m_bind = bind;
    }

    public Init() {
        this.m_gameBar = GamesChief.SlotGame.GameBar;
        this.m_miniTouch.node.on(TouchableEvent.Clicked, this.ForceUnlockMini, this);
        this.m_minorTouch.node.on(TouchableEvent.Clicked, this.ForceUnlockMinor, this);
        this.m_majorTouch.node.on(TouchableEvent.Clicked, this.ForceUnlockMajor, this);
        this.m_grandTouch.node.on(TouchableEvent.Clicked, this.ForceUnlockGrand, this);
    }
    onDestroy() {
        this.m_miniTouch.node.off(TouchableEvent.Clicked, this.ForceUnlockMini, this);
        this.m_minorTouch.node.off(TouchableEvent.Clicked, this.ForceUnlockMinor, this);
        this.m_majorTouch.node.off(TouchableEvent.Clicked, this.ForceUnlockMajor, this);
        this.m_grandTouch.node.off(TouchableEvent.Clicked, this.ForceUnlockGrand, this);
        super.onDestroy && super.onDestroy();
    }
    /**強制解鎖Mini面板 */
    private ForceUnlockMini() {
        // if (!this.m_isInFg && !this.m_isInBg && !this.m_slotGameView.IsBetBtnDisable) {
        //     let forceSetBetValue: number = this.m_gameBar.BetTable[0];
        //     for (let i = 0; i < this.m_gameBar.BetTable.length; i++) {
        //         if (this.m_gameBar.BetTable[i] >= this.m_jpMinLimitBet[FrankensteinProtocol.JpType.MAJOR]) {
        //             forceSetBetValue = this.m_gameBar.BetTable[i];
        //             break;
        //         }
        //     }
        //     if (forceSetBetValue > this.m_gameBar.BetValue) {
        //         this.m_gameBar.BetValue = forceSetBetValue;
        //     }
        // }
    }
    /**強制解鎖Minor面板 */
    private ForceUnlockMinor() {
        // if (!this.m_isInFg && !this.m_isInBg && !this.m_slotGameView.IsBetBtnDisable) {
        //     let forceSetBetValue: number = this.m_gameBar.BetTable[0];
        //     for (let i = 0; i < this.m_gameBar.BetTable.length; i++) {
        //         if (this.m_gameBar.BetTable[i] >= this.m_jpMinLimitBet[FrankensteinProtocol.JpType.MAJOR]) {
        //             forceSetBetValue = this.m_gameBar.BetTable[i];
        //             break;
        //         }
        //     }
        //     if (forceSetBetValue > this.m_gameBar.BetValue) {
        //         this.m_gameBar.BetValue = forceSetBetValue;
        //     }
        // }
    }
    /**強制解鎖Major面板 */
    private ForceUnlockMajor() {
        // if (!this.m_isInFg && !this.m_isInBg && !this.m_slotGameView.IsBetBtnDisable) {
        //     let forceSetBetValue: number = this.m_gameBar.BetTable[0];
        //     for (let i = 0; i < this.m_gameBar.BetTable.length; i++) {
        //         if (this.m_gameBar.BetTable[i] >= this.m_jpMinLimitBet[FrankensteinProtocol.JpType.MEGA]) {
        //             forceSetBetValue = this.m_gameBar.BetTable[i];
        //             break;
        //         }
        //     }
        //     if (forceSetBetValue > this.m_gameBar.BetValue) {
        //         this.m_gameBar.BetValue = forceSetBetValue;
        //     }
        // }
    }
    /**強制解鎖Grand面板 */
    private ForceUnlockGrand() {
        // if (!this.m_isInFg && !this.m_isInBg && !this.m_slotGameView.IsBetBtnDisable) {
        //     let forceSetBetValue: number = this.m_gameBar.BetTable[0];
        //     for (let i = 0; i < this.m_gameBar.BetTable.length; i++) {
        //         if (this.m_gameBar.BetTable[i] >= this.m_jpMinLimitBet[FrankensteinProtocol.JpType.GRAND]) {
        //             forceSetBetValue = this.m_gameBar.BetTable[i];
        //             break;
        //         }
        //     }
        //     if (forceSetBetValue > this.m_gameBar.BetValue) {
        //         this.m_gameBar.BetValue = forceSetBetValue;
        //     }
        // }
    }
}

