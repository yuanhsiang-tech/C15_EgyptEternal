import { math, Node } from "cc";
import { IGameChief } from "./IGameChief";
import GameBar from "../../Platform/GameBar/GameBar";
import { GameCommonCommand } from "../GameCommonCommand";
import ProclaimButton from "../../Component/ProclaimButton";
import { RollingCbAttribute } from "../../Platform/GameBar/GameBarWinView";
import { GameBarWinEffectDefine } from "../../Platform/GameBar/GameBarWinEffectDefine";

export interface ISlotGameChief extends IGameChief
{
    /** 通用押注設定是否準備就緒 */
    readonly IsCommonGameInfoReady: boolean;

    /** 取得 GameBar 元件 */
    readonly GameBar: GameBar;

    /** 取得 ProclaimButton 元件 */
    readonly ProclaimButton: ProclaimButton;

    /** 測試大獎類型 */
    TestBigWinType( bet: BigValuable, win: BigValuable ): number;

    /** 宣告大獎 */
    DeclareBigWin( bet: BigValuable, win: BigValuable, callback?: Function ): boolean;

    /**
     * 主要的播放贏分特效接口
     * @param win       贏分值
     * @param callback  結束回調
     * @param winEffect 贏分特效設定
     * @param rollingCb 跑分中回調，用來更新跑分數值
     */
    ShowNormalWin(
        win:        BigValuable,
        callback?:  Function,
        winEffect?: GameBarWinEffectDefine.ReadableWinEffectSetting,
        rollingCb?: RollingCbAttribute[] | Function
    ): void;

    /**
     * 歸零贏分
     * @param remain 延遲時間(單位:毫秒) 預設為 10 毫秒，設定為 0 時立即歸零
     */
    ClearNormalWin(delay: number): void;

    /** 顯示最後贏分 */
    FinalizeNormalWin(): void;

    /** 取得遊戲最後記憶的bet */
    GetSavedBet(defaultBet?: number): number;

    /** 設定遊戲最後記憶的bet */
    SetSaveBetValue(betValue: number): void;

    /** 檢查並更新GameBar押注列表 */
    CheckAndUpdateBetList(): void;

    /** 取得遊戲的基本設定 */
    GetCommonGameInfo(): GameCommonCommand.CommonGameInfo;

    /** 使用特色遊戲斷線重連的押注設定 */
    ApplyReconnectGameInfo(jpList: GameCommonCommand.JpSetting[], UnlockLust: GameCommonCommand.UnLockInfo[]): void;

 
    /** 是否使用KMBT V3版本 000.000K */
    readonly IsUsingKMBTv3: boolean;
    SetIsUsingKMBTv3(val:boolean):void
    
    /** 平台共用層 SpinAck */
    SubmitCommonSpinAck(common: any): void;
}
