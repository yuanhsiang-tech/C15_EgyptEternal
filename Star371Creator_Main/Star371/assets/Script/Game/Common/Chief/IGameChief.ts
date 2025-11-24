import { AssetManager, Node } from "cc";
import { Command } from "../../../Net/Command/Command";
import { ThemeType } from "../../../Proto/gt2/basicTypes/basicTypes_pb";
import { IGameAudioPlayer } from "../../Platform/Audio/IGameAudioPlayer";
import { EpisodeMacro } from "../../../Feature/Episode/EpisodeMacro";
import EpisodeEntityBase from "../../../Feature/Episode/EpisodeEntityBase";

export interface IGameChief
{
    /** 取得遊戲Bundle */
    readonly Bundle: AssetManager.Bundle;

    /** 取得遊戲Bundle名稱 */
    readonly BundleName: string;

    /** 遊戲 ID */
    readonly GameId: number;

    /** 廳館名稱 */
    readonly ThemeName: string;

    /** 廳館類型 */
    readonly ThemeType: ThemeType;

    /** 遊戲連線準備就緒 */
    readonly IsGameSessionReady: boolean;

    /** 平台是否準備就緒 */
    readonly IsPlatformReady: boolean;

    /** 語系文字是否準備就緒 */
    readonly IsLocaleTextReady: boolean;

    /** 音效資源是否準備就緒 */
    readonly IsAudioAssetsReady: boolean;

    /** 遊戲內部圖層 (在 TopBar 之下) */
    readonly GameInteriorLayer: Node;

    /** 遊戲外部圖層 (在 TopBar 之上) */
    readonly GameExteriorLayer: Node;

    /** 最上層圖層 */
    readonly SuperiorLayer: Node;

    /** 遊戲音效播放器 */
    readonly GameAudio: IGameAudioPlayer;

    /** 提供遊戲準備就緒時通知平台 */
    GameReady(): void;


    /** 取得遊戲用的 Storage Key */
    LocalStorageKey(key: string, option?: {}): string;

    /** 取得語系文字 */
    GetString(key: string, defaultString?: string): string;

    /* @param type 請求類型
     * @param content 請求內容
     */
    SessionQuery(type: number, content?: Command.Content): void;

    /** 檢查目前財產是否足夠下注 */
    CanBet(bet: number|BigNumber): boolean;

    /** 提交金流: 贏分 */
    SubmitValutaByWin(value: number|BigNumber): void;

    /** 提交金流: 押注 */
    SubmitValutaByBet(value: number|BigNumber): void;

    /** 取消金流: 押注 */
    CancelValutaByBet(value?: number|BigNumber): void;

    /** 顯示轉場畫面 */
    ShowTransitionView(identifier?: string): void;

    /** 隱藏轉場畫面 */
    HideTransitionView(identifier?: string): void;

    /** 設定返回按鈕是否啟用 */
    SetBackButtonEnabled(enabled: boolean): void;

    /**
     * 附加演出
     */
    AttachEpisode( key: EpisodeMacro.Keys, entity: EpisodeEntityBase<any>, type: EpisodeMacro.TYPE ): void;

    /**
     * 提交演出
     */
    SubmitEpisode<T>( key: EpisodeMacro.Keys, episodeData: T, priority?: number ): void;

    /**
     * 阻擋平台UI演出
     */
    BlockPlatformUI(): void;

    /**
     * 解除阻擋平台UI演出
     */
    UnblockPlatformUI(): void;

    /**
     * 附加演出
     */
    AttachEpisode(key: EpisodeMacro.Keys, entity: EpisodeEntityBase<any>, type: EpisodeMacro.TYPE): void;

    /**
     * 提交演出
     */
    SubmitEpisode<T>(key: EpisodeMacro.Keys, episodeData: T, priority?: number): void;
}
