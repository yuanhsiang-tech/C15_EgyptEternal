import { _decorator, Component, EventTouch } from 'cc';
import { SlotGameOption } from './Data/SlotGameOption';
import { GameBarDefine } from '../../Platform/GameBar/GameBarDefine';
import { GameCommonCommand } from '../GameCommonCommand';
import { AudioMacro } from '../../../Audio/Foundation/AudioMacro';
import { Command } from '../../../Net/Command/Command';
import { GameService } from '../../../Service/GameService';

const { ccclass } = _decorator;

@ccclass
export default abstract class SlotGameBase extends Component {

    /** 回傳遊戲設定 */
    public abstract GameOption(): SlotGameOption;

    /** 回傳目前的押注清單 */
    public BetList(): number[] {
        return null;
    }

    /** 回傳目前的押注 */
    public CurrentBet(): number {
        return undefined;
    }

    /** 目前是否為最小押注 */
    public IsMinimumBet(): boolean {
        return undefined;
    }

    /** 目前是否為最大押注 */
    public IsMaximumBet(): boolean {
        return undefined;
    }

    /** 是否正在自動玩 */
    public IsAutoSpinning(): boolean {
        return undefined;
    }

    /** 遊戲連線準備就緒 */
    public abstract OnGameSessionReady(): void;

    /** 收到遊戲連線回應 */
    public abstract OnSessionResponse(type: number, content: Uint8Array): void;

    /** 平台是否準備就緒 */
    public OnPlatformReady?(): void;

    /** 轉場畫面開始隱藏 */
    public OnTransitionHide?(): void;

    /** 轉場畫面已經隱藏 */
    public OnTransitionHideEnded?(): void;

    /** 語系文字已經準備就緒 */
    public OnLocaleTextLoaded?(directory: string, success?: boolean): void;

    /** 音效資源已經準備就緒 */
    public OnAudioAssetsReady?(err: Error, result: AudioMacro.AssetsLoadResult): void;

    /** GameBar 按鈕點擊事件 */
    public OnGameBarEventTouch?(event: EventTouch): void;

    /** GameBar Spin 按鈕點擊事件 */
    public OnGameBarSpinButtonClicked?(state: GameBarDefine.SpinButtonState): void;

    /** 遊戲Bet設定收到更新封包 */
    public OnBetInfoUpdate?(): void;

    /** 遊戲客製用到的UnlockTypes */
    public UnlockTypes(): GameCommonCommand.UNLOCK_TYPE[] {
        return [];
    }

}
