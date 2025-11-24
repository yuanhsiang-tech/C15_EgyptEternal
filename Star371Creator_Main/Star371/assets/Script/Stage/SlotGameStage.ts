import { _decorator, AssetManager, Component, director, error, EventTouch, instantiate, isValid, log, math, Node, Prefab, Sprite, tween, warn } from 'cc';
import { BaseGameStage } from './BaseGameStage';
import GameBar from '../Game/Platform/GameBar/GameBar';
import ProclaimButton from '../Game/Component/ProclaimButton';
import SlotGameBase from '../Game/Common/SlotGame/SlotGameBase';
import { GameCommonCommand } from '../Game/Common/GameCommonCommand';
import { EventDispatcher } from '../../Stark/Utility/EventDispatcher';
import { EventDefine } from '../Define/EventDefine';
import AudioManager from '../Audio/Foundation/AudioManager';
import { NodeUtils } from '../../Stark/FuncUtils/NodeUtils';
import { SlotGameOption } from '../Game/Common/SlotGame/Data/SlotGameOption';
import { EpisodeMacro } from '../Feature/Episode/EpisodeMacro';
import { NumberUtils } from '../../Stark/FuncUtils/NumberUtils';
import { BigWinDefine } from '../Game/Platform/WinView/BigWinDefine';
import { GameBarWinEffectDefine } from '../Game/Platform/GameBar/GameBarWinEffectDefine';
import { RollingCbAttribute } from '../Game/Platform/GameBar/GameBarWinView';
import BetManager from '../Game/Platform/Bet/BetManager';
import { GameBarDefine } from '../Game/Platform/GameBar/GameBarDefine';
import { ViewManager } from '../ViewManage/ViewManager';
import EpisodeCommander from '../Feature/Episode/EpisodeCommander';
import EpisodeEntityBase from '../Feature/Episode/EpisodeEntityBase';
import { AudiosDefine } from '../Define/AudiosDefine';
import { GameService } from '../Service/GameService';
import { ISlotGameChief } from '../Game/Common/Chief/ISlotGameChief';
import { ThemeType } from '../Proto/gt2/basicTypes/basicTypes_pb';
import { PersistLayers } from '../Feature/PersistLayers/PersistLayers';
import { Define } from '../Define/GeneralDefine';
import { StageInfoMap } from '../Define/StageDefine';
import { GameBundle } from '../Bundle/Bundle';
import { AlphaLoading } from '../Loading/AlphaLoadingView';
import * as Currency from '../Proto/gt2/currency/currency_pb';
import GameAudioControl from '../Game/Platform/Audio/GameAudioControl';
import { IGameAudioPlayer } from '../Game/Platform/Audio/IGameAudioPlayer';
import { CarriarParser, Command } from '../Net/Command/Command';
import { Identifier } from '../Define/IdentifierDefine';
import { CommonCmdBetSettingSchema } from '../Proto/common/common_pb';
import type { CommonCmdBetSetting } from '../Proto/common/common_pb';
import { GamesChiefProxy } from '../Game/Common/Chief/GamesChiefProxy';
import { GameBarPreparations } from '../Game/Platform/GameBar/Preparation/GameBarPreparationTypes';
import { Preparations } from '../Scene/Preparation/PreparationMacro';
import { PreparationFactory } from '../Scene/Preparation/PreparationFactory';
import { StateManager } from '../../Stark/Utility/StateManager/StateManager';
import { Preparation } from '../Scene/Preparation/Preparation';
import { IGameStatus } from '../Game/Common/Chief/IGameStatus';
import { ScreenDialogButtonPreparations } from '../Game/Component/Preparation/ProclaimButtonPreparationTypes';
import { AudioMacro } from '../Audio/Foundation/AudioMacro';
const { ccclass, property } = _decorator;


enum FEATURE_GAME_FLAG {
    FREE_GAME = (1 << 0),
    BONUS_GAME = (1 << 1),
}

@ccclass('SlotGameStage')
export class SlotGameStage extends BaseGameStage implements ISlotGameChief, IGameStatus {
    private m_canShowGameSceneStart: boolean;
    private m_isGameSceneStartShowed: boolean;
    private m_isAudioAssetsReady: boolean = false;

    //#region IGameChief
    /** 取得遊戲Bundle */
    public get Bundle(): AssetManager.Bundle {
        return GameBundle.Current.Raw;
    }

    /** 取得遊戲Bundle名稱 */
    public get BundleName(): string {
        return StageInfoMap.get(this.Id).Name;
    }

    /** 遊戲 ID */
    public get GameId(): number {
        return this.Id;
    }

    /** 廳館名稱 */
    public get ThemeName(): string {
        return GameService.Instance.ThemeName;
    }

    /** 廳館類型 */
    public get ThemeType(): ThemeType {
        return GameService.Instance.ThemeType
    }

    /** 遊戲連線準備就緒 */
    public get IsGameSessionReady(): boolean {
        return true || GameService.Instance.IsJoined();
    }

    /** 平台是否準備就緒 */
    public get IsPlatformReady(): boolean {
        return !!this.m_preparationReady && !!this.m_pendingCommonGameInfo;
    }

    /** 語系文字是否準備就緒 */
    public get IsLocaleTextReady(): boolean {
        return true;
    }

    /** 音效資源是否準備就緒 */
    public get IsAudioAssetsReady(): boolean {
        return this.m_isAudioAssetsReady;
    }

    /** 遊戲內部圖層 (在 TopBar 之下) */
    public get GameInteriorLayer(): Node {
        return PersistLayers.Layer(Define.ZIndex.Global.GAME_INTERIOR);
    }

    /** 遊戲外部圖層 (在 TopBar 之上) */
    public get GameExteriorLayer(): Node {
        return PersistLayers.Layer(Define.ZIndex.Global.GAME_EXTERIOR);
    }

    /** 最上層圖層 */
    public get SuperiorLayer(): Node {
        return PersistLayers.Layer(Define.ZIndex.Global.SUPERIOR_LAYER);
    }

    /** 遊戲音效播放器 */
    public get GameAudio(): IGameAudioPlayer {
        return this.m_gameAudioCtrl;
    }

    /** 提供遊戲準備就緒時通知平台 */
    public GameReady(): void {
        this.m_confirmReady = true;
    }

    /**
     * 發送請求
     * @param type 請求類型
     * @param content 請求內容
     */
    public SessionQuery(type: number, content?: Command.Content): void {
        //TODO Ide
        if (GameService.Instance) {
            GameService.Instance.SendCommand(type, content);
        }
    }

    /** 檢查目前財產是否足夠下注 */
    public CanBet(bet: number | BigNumber): boolean {
        if (this.m_isInFeatureGame) {
            return true;
        } else {
            return super.CanBet(bet);
        }
    }

    /** 提交金流: 贏分 */
    SubmitValutaByWin(value: number | BigNumber): void {
        let valuta = {
            changeValue: new BigNumber(value),
            type: this.ThemeType == ThemeType.NORMAL ? Currency.Type.ICOIN : Currency.Type.DIAMOND,
            reason: 502
        };
        EventDispatcher.Shared.Dispatch(EventDefine.System.CURRENCY_UPDATE, valuta);
    }

    /** 提交金流: 押注 */
    SubmitValutaByBet(value: number | BigNumber): void {
        let valuta = {
            changeValue: new BigNumber(value).multipliedBy(-1),
            type: this.ThemeType == ThemeType.NORMAL ? Currency.Type.ICOIN : Currency.Type.DIAMOND,
            reason: 503
        };
        EventDispatcher.Shared.Dispatch(EventDefine.System.CURRENCY_UPDATE, valuta);
    }

    /** 取消金流: 押注 */
    CancelValutaByBet(value?: number | BigNumber): void {
        let valuta = {
            changeValue: new BigNumber(value).multipliedBy(-1),
            type: this.ThemeType == ThemeType.NORMAL ? Currency.Type.ICOIN : Currency.Type.DIAMOND,
            reason: 503
        };
        EventDispatcher.Shared.Dispatch(EventDefine.System.CANCEL_PROPERTY_CHANGE, valuta);
    }

    /** 設定返回按鈕是否啟用 */
    SetBackButtonEnabled(enabled: boolean): void {
        EventDispatcher.Shared.Dispatch(EventDefine.System.BACK_BUTTON_CONTROL, director.getScene().name, enabled);
    }

    //----------------------------------------------------------------
    /**
     * 阻擋平台UI演出
     */
    BlockPlatformUI(): void {
        this.PlatformUiBlockControl(Identifier.BLOCK_KEY.PLATFORM_UI_BY_GAME, true);
    }

    /**
     * 解除阻擋平台UI演出
     */
    UnblockPlatformUI(): void {
        this.PlatformUiBlockControl(Identifier.BLOCK_KEY.PLATFORM_UI_BY_GAME, false);
    }

    /**
     * 附加演出
     * @param key       演出 Key
     * @param entity    演出實體
     * @param type      演出類型
     */
    public AttachEpisode(key: EpisodeMacro.Keys, entity: EpisodeEntityBase<any>, type: EpisodeMacro.TYPE): void {
        this.m_episodeCommander.AttachEntity(key, entity, type);
    }

    /**
     * 提交演出
     * @param key           演出 Key
     * @param episodeData   演出資料
     * @param priority      優先權
     */
    public SubmitEpisode<T>(key: EpisodeMacro.Keys, episodeData: T, priority?: number): void {
        this.m_episodeCommander.SubmitEpisode(key, episodeData, priority);
    }
    //#endregion


    //#region  ISlotGameChief
    /** 通用押注設定是否準備就緒 */
    public get IsCommonGameInfoReady(): boolean {
        return this.m_isCommonBetInfoReady;
    }

    /** 是否使用KMBT V3版本 000.000K */
    protected m_isUsingKMBTv3: boolean = false;
    public get IsUsingKMBTv3(): boolean {
        return this.m_isUsingKMBTv3;
    }

    /** 取得 GameBar 元件 */
    public get GameBar(): GameBar {
        return this.m_gameBar;
    }

    /** 取得 ProclaimButton 元件 */
    public get ProclaimButton(): ProclaimButton {
        return this.m_screenDialogButton;
    }

    /** 測試大獎類型 */
    public TestBigWinType(bet: BigValuable, win: BigValuable): number {
        const betBN = NumberUtils.ParseBigNumber(bet);
        const winBN = NumberUtils.ParseBigNumber(win);
        const winRatio = betBN.gt(0) ? winBN.div(betBN) : new BigNumber(0);
        return BigWinDefine.CheckBigWinType(winRatio);
    }

    /** 宣告大獎 */
    public DeclareBigWin(bet: BigValuable, win: BigValuable, callback?: Function): boolean {
        let winType = this.SendBigAwardEffectNotify(bet, win);
        if (winType === BigWinDefine.BigWinType.NONE) {
            callback?.();
            return false;
        }

        const onEpisodeEnd = () => {
            callback?.();
            EventDispatcher.Shared.Dispatch(EventDefine.Game.BIG_WIN_END);
        };

        this.SubmitEpisode<BigWinDefine.WinEpisodeData>(EpisodeMacro.KEY.BIG_WIN,
            {
                betValue: bet,
                finalWinValue: win,
                endCallback: onEpisodeEnd,
                rollingDuration: BigWinDefine.DEFAULT_ROLLING_DURATION[winType],
                themeType: this.ThemeType,
            });

        return true;
    }

    /**
     * 主要的播放贏分特效接口
     * @param win       贏分值
     * @param callback  結束回調
     * @param winEffect 贏分特效設定
     * @param rollingCb 跑分中回調，用來更新跑分數值
     */
    public ShowNormalWin(
        win: BigValuable,
        callback?: Function,
        winEffect?: GameBarWinEffectDefine.ReadableWinEffectSetting,
        rollingCb?: RollingCbAttribute[] | Function
    ): void {
        if (this.m_gameBar) {
            this.m_gameBar.SetWinEffect(win, callback, winEffect, rollingCb);
        } else {
            warn(`[SlotGameScene] ShowNormalWin, 需要 GameBar 才可以使用的功能`, this.m_gameBar);
            callback?.();
        }
    }

    /**
     * 歸零贏分
     * @param remain 延遲時間(單位:毫秒) 預設為 10 毫秒，設定為 0 時立即歸零
     */
    public ClearNormalWin(delay: number): void {
        if (this.m_gameBar) {
            this.m_gameBar.WinValueSkip(delay);
        } else {
            warn(`[SlotGameStage] ClearNormalWin, 需要 GameBar 才可以使用的功能`, this.m_gameBar);
        }
    }

    /** 顯示最後贏分 */
    public FinalizeNormalWin(): void {
        if (this.m_gameBar) {
            this.m_gameBar.TryEndWinEffect();
        } else {
            warn(`[SlotGameStage] FinalizeNormalWin, 需要 GameBar 才可以使用的功能`, this.m_gameBar);
        }
    }

    /** 取得遊戲最後記憶的bet */
    public GetSavedBet(defaultBet?: number): number {
        let selectedBet = 0;

        // 讀取上一次存的押注
        const lastSavedBet = BetManager.Instance.GetSavedGameBet(this.GameId, this.ThemeType);
        (lastSavedBet > 0) && (selectedBet = lastSavedBet);

        //------------------------------------------------
        // 進入遊戲廳館時選擇押注的規則 (2025-03-13 版本)
        // - 參閱 redmine#179339 自動Bet優化
        //------------------------------------------------
        // * X = 可解鎖最大 JP 的最低 Bet
        // * Y = 上次記憶的 Bet
        // 給玩家的押注值為以上兩者中最大的: max( X , Y )
        //------------------------------------------------

        // if (GameJoinTracker.GetBeforeLastJoinList()?.includes(this.GameId)) {
        //     // [確認是最後幾款遊玩的遊戲] => 不做 bet 挑選
        //     this.m_shouldFindChosenBet = false;
        // }

        if (this.m_shouldFindChosenBet || lastSavedBet == 0) {
            this.m_shouldFindChosenBet = false;

            log(`[SlotGameScene] GetSavedBet: 第一次取得記憶 Bet, 將會挑選可解鎖最大 JP 的最低 Bet`);
            //log(`[SlotGameScene] GetSavedBet: 最後一次記憶的 Bet ->`, lastSavedBet);

            const chosenBet = this.FindTheChosenBet();
            if (chosenBet > 0 && isValid(this.m_commonGameInfo, true)) {
                let info: GameCommonCommand.BetInfo = null

                if (isValid(info, true) && info.Bet > chosenBet) {
                    selectedBet = info.Bet;
                    log(`[SlotGameScene] GetSavedBet: 使用Bolt Power對應的押注 ->`, selectedBet);
                } else {
                    selectedBet = chosenBet;
                    log(`[SlotGameScene] GetSavedBet: 使用可解鎖 JP 的押注 ->`, chosenBet);
                }

                BetManager.Instance.SetBoltPowerBet(selectedBet, this.GameId, this.ThemeType);
            } else {
                warn(`[SlotGameScene] GetSavedBet: 第一次取得記憶 Bet 時無法找到可解鎖最大 JP 的最低 Bet ->`, chosenBet);
            }
        }

        // 最後檢查，若都沒有則取預設值
        if (selectedBet > 0) {
            return selectedBet;
        } else if (defaultBet > 0) {
            return defaultBet;
        } else if (isValid(this.m_gameBar, true)) {
            return this.m_gameBar.BetValue;
        } else if (this.m_validBetList?.[0] > 0) {
            return this.m_validBetList[0];
        } else {
            warn(`[SlotGameScene] GetSavedBet: 無法取得有效的押注值`);
            return 0;
        }
    }

    //----------------------------------------------------------------
    /**
     * 找出天選押注
     *
     * - 2025-03-13 版本的規則: 參閱 redmine#179339 自動Bet優化
     * > 進入遊戲廳館時會是解鎖該遊戲最大JP的最低Bet
     */
    protected FindTheChosenBet(): number {
        const validBetList = this.m_gameBar?.BetTable ?? this.m_validBetList ?? [];
        const unlockInfoList = this.m_commonGameInfo?.UnlockList ?? this.m_pendingCommonGameInfo?.UnlockList;

        let unlockJpMaxBet: number = BetManager.Instance.FindUnlockJackpotBet(validBetList, unlockInfoList);
        if (unlockJpMaxBet > 0) {
            log(`[SlotGameScene] FindTheChosenBet: 可解鎖最大JP的最低Bet: ${unlockJpMaxBet}`);
            return unlockJpMaxBet;
        }

        error(`[SlotGameScene] FindTheChosenBet: 無法找到可解鎖最大JP的最低Bet`);
        warn(`[SlotGameScene] FindTheChosenBet: 可用的押注列表 ->`, validBetList);
        warn(`[SlotGameScene] FindTheChosenBet: 解鎖資訊列表 ->`, unlockInfoList);
        warn(`[SlotGameScene] FindTheChosenBet: 找到的押注值 ->`, unlockJpMaxBet);

        error(`[SlotGameScene] FindTheChosenBet: 必須先收到 [CMD-201] CommonGameInfo 才能找到天選押注`);
        warn(`[SlotGameScene] FindTheChosenBet: CommonGameInfo ->`, this.m_commonGameInfo);
        warn(`[SlotGameScene] FindTheChosenBet: PendingCommonGameInfo ->`, this.m_pendingCommonGameInfo);

        return 0;
    }

    /** 設定遊戲最後記憶的bet */
    public SetSaveBetValue(betValue: number): void {
        // 有機會在EventDefine.GAME.CURRENCY_UPDATE_BY_BET自動呼叫 這樣遊戲就可以無需處理
        //TODO Ide
        if (GameService.Instance) {
            // 各遊戲獨立存檔
            BetManager.Instance.SetSavedGameBet(betValue, GameService.Instance.GameId, GameService.Instance.ThemeType);

            // 共用存檔
            BetManager.Instance.SetCommonSavedGameBet(betValue, GameService.Instance.ThemeType);
        }

    }

    /** 檢查並更新GameBar押注列表 */
    public CheckAndUpdateBetList(): void {
        if (isValid(this.m_pendingCommonGameInfo)) {
            this.m_commonGameInfo = this.m_pendingCommonGameInfo;
            this.m_pendingCommonGameInfo = null;

            if (this.m_gameBar) {
                this.m_gameBar.CommonGameInfo = this.m_commonGameInfo;
            }

            // 更新可用押注列表
            this.m_validBetList = BetManager.Instance.CreateValidBetList(this.m_commonGameInfo);

            EventDispatcher.Shared.Dispatch(EventDefine.Game.BET_INFO_UPDATE_APPLY, this.m_commonGameInfo);
        }
    }

    /** 取得遊戲的基本設定 */
    public GetCommonGameInfo(): GameCommonCommand.CommonGameInfo {
        return this.m_commonGameInfo;
    }

    /** 使用特色遊戲斷線重連的押注設定 */
    public ApplyReconnectGameInfo(jpList: GameCommonCommand.JpSetting[], UnlockList: GameCommonCommand.UnLockInfo[]): void {
        this.m_pendingCommonGameInfo = this.m_commonGameInfo.Clone();
        this.m_commonGameInfo.UnlockList = UnlockList;
        this.m_commonGameInfo.JpList = jpList;

        if (this.m_gameBar) {
            this.m_gameBar.UpdateUnLockInfo(UnlockList);
        }

        EventDispatcher.Shared.Dispatch(EventDefine.Game.BET_INFO_UPDATE_APPLY, this.m_commonGameInfo);
    }

    public SetIsUsingKMBTv3(val: boolean): void {
        this.m_isUsingKMBTv3 = val
    }

    /** 平台共用層 SpinAck */
    public SubmitCommonSpinAck(common: any): void {
    }

    //#endregion


    //================================================================
    // Implements IGameStatus
    //================================================================

    //----------------------------------------------------------------
    /** 回傳遊戲是否在最低押注 */
    public GameAtMinimumBet(): boolean {
        return this.m_slotGameBase?.IsMinimumBet() ?? this.m_gameBar?.IsMinimumBet() ?? false;
    }

    //----------------------------------------------------------------
    /** 回傳遊戲是否在最高押注 */
    public GameAtMaximumBet(): boolean {
        return this.m_slotGameBase?.IsMaximumBet() ?? this.m_gameBar?.IsMaximumBet() ?? false;
    }

    //----------------------------------------------------------------
    /** 回傳遊戲當前押注 */
    public GameCurrentBet(): number {
        return this.m_slotGameBase?.CurrentBet() ?? this.m_gameBar?.BetValue ?? 0;
    }

    //----------------------------------------------------------------
    /** 回傳遊戲是否在自動玩 */
    public GameAutoSpinning(): boolean {
        return this.m_slotGameBase?.IsAutoSpinning() ?? this.m_gameBar?.IsInAutoPlay() ?? false;
    }

    //----------------------------------------------------------------
    /** 回傳遊戲是否在特色遊戲中 */
    public GameIsInFeature(): boolean {
        return this.m_isInFeatureGame;
    }

    //----------------------------------------------------------------
    /** 回傳遊戲是否在Turbo模式中 */
    public GameIsTurboMode(): boolean {
        const isAutoSpinning = this.GameAutoSpinning();
        const isInFeatureGame = this.GameIsInFeature();
        const isTurboMode = isAutoSpinning && !isInFeatureGame;
        // 2025-07-10 想看 log 的時候才開啟
        // log(`[SlotGameScene] GameIsTurboMode:${isTurboMode ? '🟢' : '🔴'} | isAutoSpinning:${isAutoSpinning ? '🟢' : '🔴'} | isInFeatureGame:${isInFeatureGame ? '🟢' : '🔴'}`);
        return isTurboMode;
    }

    //----------------------------------------------------------------
    /** 遊戲押注表是否更新 */
    public GameIsBetListUpdated(): boolean {
        return this.m_gameBar?.IsBetTableUpdate ?? false;
    }

    //----------------------------------------------------------------
    /** 重置遊戲押注表是否更新狀態 */
    public GameResetBetListUpdated(): void {
        this.m_gameBar?.ResetBetTableUpdate();
    }

    //----------------------------------------------------------------
    /** 回傳遊戲的 JpRolling 資料儲存前綴 */
    public GameJpRollingRecordKeyPrefix(): string {
        return `${this.GameId}_${this.ThemeType}`;
    }

    //----------------------------------------------------------------
    /** 目前是否是 Quest Game 遊戲廳館 */
    public get IsQuestGameTheme(): boolean {
        return false;
    }











































































































    //----------------------------------------------------------------
    /** 若遊戲沒有繼承 SlotGameBase, 這個值會是 null */
    protected m_slotGameBase: SlotGameBase = null;

    /** 遊戲有可能使用 `DisableGameBar` 這個選項, 所以可能為 `null` */
    protected m_gameBar: GameBar = null;

    /** 遊戲有可能使用 `DisableScreenDialogButton` 這個選項, 所以可能為 `null` */
    protected m_screenDialogButton: ProclaimButton = null;

    /** 遊戲指定的 PayTable 資源目錄 */
    protected m_payTableResDir: string = null;

    //----------------------------------------------------------------
    // BET 相關

    protected m_shouldFindChosenBet: boolean = true;
    protected m_isCommonBetInfoReady: boolean = false;
    private m_pendingCommonGameInfo: GameCommonCommand.CommonGameInfo = null;
    private m_commonGameInfo: GameCommonCommand.CommonGameInfo = null;
    private m_validBetList: number[] = [];

    //----------------------------------------------------------------
    // 特色遊戲相關

    protected m_hasGameStarted: boolean = false;
    protected m_featureGameFlag: number = 0x0;
    protected m_isInFeatureGame: boolean = false;

    //----------------------------------------------------------------
    // Tournament 相關

    protected m_tournamentItem: Prefab = null;
    protected m_pendingTournamentCallbacks: ((item: Node) => void)[] = [];
    //----------------------------------------------------------------



    //----------------------------------------------------------------
    /** 是否在特色遊戲中 */
    public get IsInFeatureGame(): boolean {
        return this.m_isInFeatureGame;
    }

    //----------------------------------------------------------------

    protected onLoad(): void {
        super.onLoad?.();

        // GameService.Instance.Connect("https://test-vegasfrenzy.towergame.com/game/2185/1/001/client")
        //TODO Ide
        this.SetId(2179, 3);

        GamesChiefProxy.SlotGame.Assign(this);
        GamesChiefProxy.Status.Assign(this);

        // 初始化 Episode 指揮官
        const commanderNode = new Node(`episode-commander`);
        commanderNode.parent = this.SuperiorLayer;
        this.m_episodeCommander = NodeUtils.InstallComponent(commanderNode, EpisodeCommander);
        this.m_episodeCommander.Delegate = this;

        // 初始化遊戲音效控制器
        this.m_gameAudioCtrl = NodeUtils.InstallComponent(this.node, GameAudioControl);
        this.m_gameAudioCtrl.Initialize(this.BundleName);

        // 設定 Episode 指揮官當前場景是否為直版
        this.m_episodeCommander.IsPortraitScene = this.IsPortrait;

        this.InitPrepareState();
    }

    //----------------------------------------------------------------

    protected onEnable(): void {
        super.onEnable?.();
        EventDispatcher.Shared.On(EventDefine.Game.SPIN_INVALID, this.OnSpinBetInValid, this)

        EventDispatcher.Shared.On(EventDefine.Game.GAME_START, this.OnGameStart, this);
        EventDispatcher.Shared.On(EventDefine.Game.ENTER_IDLE, this.OnGameEnterIdle, this);
        EventDispatcher.Shared.On(EventDefine.Game.SPIN_START, this.OnGameSpinStart, this);
        EventDispatcher.Shared.On(EventDefine.Game.SPIN_WILL_FINISH, this.OnGameSpinWillFinish, this);
        EventDispatcher.Shared.On(EventDefine.Game.SPIN_FINISH, this.OnGameSpinFinish, this);
        EventDispatcher.Shared.On(EventDefine.Game.ENTER_FREE_GAME, this.OnGameEnterFreeGame, this);
        EventDispatcher.Shared.On(EventDefine.Game.LEAVE_FREE_GAME, this.OnGameLeaveFreeGame, this);
        EventDispatcher.Shared.On(EventDefine.Game.ENTER_BONUS_GAME, this.OnGameEnterBonusGame, this);
        EventDispatcher.Shared.On(EventDefine.Game.LEAVE_BONUS_GAME, this.OnGameLeaveBonusGame, this);
        EventDispatcher.Shared.On(EventDefine.Game.LEAVE_FEATURE_TO_MAIN_IDLE, this.OnGameLeaveFeatureToMainIdle, this);
    }

    //----------------------------------------------------------------

    protected onDisable(): void {
        super.onDisable?.();
        EventDispatcher.Shared.Off(EventDefine.Game.SPIN_INVALID, this.OnSpinBetInValid, this)

        EventDispatcher.Shared.Off(EventDefine.Game.GAME_START, this.OnGameStart, this);
        EventDispatcher.Shared.Off(EventDefine.Game.ENTER_IDLE, this.OnGameEnterIdle, this);
        EventDispatcher.Shared.Off(EventDefine.Game.SPIN_START, this.OnGameSpinStart, this);
        EventDispatcher.Shared.Off(EventDefine.Game.SPIN_WILL_FINISH, this.OnGameSpinWillFinish, this);
        EventDispatcher.Shared.Off(EventDefine.Game.SPIN_FINISH, this.OnGameSpinFinish, this);
        EventDispatcher.Shared.Off(EventDefine.Game.ENTER_FREE_GAME, this.OnGameEnterFreeGame, this);
        EventDispatcher.Shared.Off(EventDefine.Game.LEAVE_FREE_GAME, this.OnGameLeaveFreeGame, this);
        EventDispatcher.Shared.Off(EventDefine.Game.ENTER_BONUS_GAME, this.OnGameEnterBonusGame, this);
        EventDispatcher.Shared.Off(EventDefine.Game.LEAVE_BONUS_GAME, this.OnGameLeaveBonusGame, this);
        EventDispatcher.Shared.Off(EventDefine.Game.LEAVE_FEATURE_TO_MAIN_IDLE, this.OnGameLeaveFeatureToMainIdle, this);

        AudioManager.Instance.ReleaseAssets(AudiosDefine.Bundles.FRAMEWORK_SLOT, true);

        GamesChiefProxy.SlotGame.Resign(this);
        GamesChiefProxy.Status.Resign(this);
    }

    //----------------------------------------------------------------

    //================================================================
    // 平台 UI 阻擋功能
    //----------------------------------------------------------------
    protected m_isPlatformUiBlocking: boolean = false;
    protected m_platformUiBlockKeys: Set<string> = null;

    /**
     * 控制平台 UI 阻擋
     * @param identifier 阻擋識別碼
     * @param isBlock 是否阻擋
     */
    protected PlatformUiBlockControl(identifier: string, isBlock: boolean): void {
        this.m_platformUiBlockKeys = this.m_platformUiBlockKeys || new Set();

        isBlock ? this.m_platformUiBlockKeys.add(identifier)
            : this.m_platformUiBlockKeys.delete(identifier);

        const wasPlatformUiBlocking = this.m_isPlatformUiBlocking;
        this.m_isPlatformUiBlocking = this.m_platformUiBlockKeys.size > 0;

        if (this.m_isPlatformUiBlocking !== wasPlatformUiBlocking) {
            this.m_isPlatformUiBlocking ? this.OnPlatformUiBlocking()
                : this.OnPlatformUiUnblocking();
        }
    }

    //----------------------------------------------------------------
    /** 平台 UI 阻擋 */
    protected OnPlatformUiBlocking(): void {
        // 暫停 View 處理
        ViewManager.Instance.Pause();

        // 阻擋 Episode
        this.m_episodeCommander.BlockType(Identifier.BLOCK_KEY.PLATFORM_UI_SYSTEM, EpisodeMacro.TYPE.NORMAL);
    }

    //----------------------------------------------------------------
    /** 平台 UI 解除阻擋 */
    protected OnPlatformUiUnblocking(): void {
        // 恢復 View 處理
        ViewManager.Instance.Resume();

        // 解除 Episode 阻擋
        this.m_episodeCommander.UnblockType(Identifier.BLOCK_KEY.PLATFORM_UI_SYSTEM, EpisodeMacro.TYPE.NORMAL);
    }


    //GameScene的變數
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////
    protected m_episodeCommander: EpisodeCommander = null;
    protected m_gameAudioCtrl: GameAudioControl = null;
    protected m_confirmReady: boolean = false;
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////





    //原先SlotGameScene的函式，遊戲層有用到的
    //===============================================================================================================================================//
    public GameOption(): SlotGameOption {
        return this.m_slotGameBase?.GameOption();
    }

    public OnCommand(cmd: GameService.TypeCommand): void {
        super.OnCommand(cmd);

        switch (cmd.Type) {
            case GameCommonCommand.G2U.G2U_COMMON_COMMAND_BET_SETTING_ACK: {
                // 這個封包應有兩個時機點收到, 一個是在遊戲JoinGame之後, 一個是設定突然有reload並且玩家spin發生錯誤之後
                const protoData: CommonCmdBetSetting = cmd.Parse(CommonCmdBetSettingSchema)
                const result = GameCommonCommand.CommonGameInfo.FromProto(protoData)
                this.m_pendingCommonGameInfo = result
                //this.m_pendingCommonGameInfo = CarriarParser.ParseString(cmd.Content as string, GameCommonCommand.CommonGameInfo);
                log(`[SlotGameScene] [CMD-201] 收到bet設定:`, this.m_pendingCommonGameInfo);
                this.m_slotGameBase?.OnBetInfoUpdate?.();
                AlphaLoading.Instance.Hide();
                this.m_isCommonBetInfoReady = true;

                break;
            }
            default: {
                this.m_slotGameBase?.OnSessionResponse(cmd.Type, cmd.Content as any);
                break;
            }
        }
    }

    //================================================================
    // Implementation of ISlotGameChief
    //================================================================












    /**
     * 發送大獎特效通知
     * @param bet 使用的押注
     * @param win 獲得的贏分
     */
    protected SendBigAwardEffectNotify(bet: BigValuable, win: BigValuable): BigWinDefine.BigWinType {
        const betBN = NumberUtils.ParseBigNumber(bet);
        const winBN = NumberUtils.ParseBigNumber(win);
        const winRatio = betBN.gt(0) ? winBN.div(betBN) : new BigNumber(0);
        const winType = BigWinDefine.CheckBigWinType(winRatio);

        // 有大獎類型時才發送通知給伺服器
        if (winType > BigWinDefine.BigWinType.NONE) {
            const betValue = betBN.toNumber();
            const isInFeatureGame = this.m_isInFeatureGame;
            const isUsedGameCard = false;    // 遊戲卡尚未製作
            const notify = new GameCommonCommand.BigAwardEffectNotify(winType, isInFeatureGame, isUsedGameCard, betValue, winBN);
            // this.SessionQuery( GameCommonCommand.U2G.U2G_COMMON_COMMAND_BIGAWARD_EFFECT_NOTIFY, notify );
        }

        return winType;
    }

    private OnGameBarSpinStateHandler(btnName: string) {
        switch (btnName) {
            case GameBarDefine.UI_NAME.BTN_SPIN: {
                this.m_slotGameBase?.OnGameBarSpinButtonClicked?.(GameBarDefine.SpinButtonState.SPIN);
                break;
            }
            case GameBarDefine.UI_NAME.AUTOPLAY: {
                this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.CANCEL_AUTO;
                this.m_slotGameBase?.OnGameBarSpinButtonClicked?.(GameBarDefine.SpinButtonState.SPIN); // 假設遊戲層要處理音效問題就要多傳資訊過去
                break
            }
            case GameBarDefine.UI_NAME.BTN_AUTOSTOP: {
                this.m_gameBar.SpinButtonState = GameBarDefine.SpinButtonState.STOP_DISABLE;
                this.m_gameBar.StopAutoPlay();
                this.m_slotGameBase?.OnGameBarSpinButtonClicked?.(GameBarDefine.SpinButtonState.CANCEL_AUTO);
                break
            }
            case GameBarDefine.UI_NAME.BTN_SPINSTOP: {
                this.m_slotGameBase?.OnGameBarSpinButtonClicked?.(GameBarDefine.SpinButtonState.STOP);
                break
            }
        }
    }

    protected override HideLoading(): void {
        // tween(this)
        // .delay(0.3)
        // .call(()=>{
        this.OnTransitionViewHideBegan();
        super.HideLoading();
        this.OnTransitionViewHideEnded();
        // })
        // .start();
    }

    /**
     * Spin無效押注時的處理
     */
    protected OnSpinBetInValid(): void {
        ViewManager.Alert(`[A]無效的 Bet`);
        this.SessionQuery(GameCommonCommand.U2G.U2G_COMMON_COMMAND_BET_SETTING_REQ);
        AlphaLoading.Instance.Show();
    }

    private OnTransitionViewHideBegan(): void {
        this.m_slotGameBase?.OnTransitionHide?.();
    }

    private OnTransitionViewHideEnded(): void {
        this.m_canShowGameSceneStart = true;
        if (this.ApproveGameSceneStartShowOnTransitionHideEnded()) {
            this.PresentGameSceneStartShow();
        }

        this.m_slotGameBase?.OnTransitionHideEnded?.();
    }







    //================================================================
    // 遊戲階段事件
    //================================================================

    //----------------------------------------------------------------
    /** 遊戲階段: 遊戲開始，前導動畫後，只送一次 */
    protected OnGameStart(): void {
        this.m_hasGameStarted = true;
        this.PresentGameSceneStartShow();
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 進入 Idle 狀態 (可以進行下一次 Spin) */
    protected OnGameEnterIdle(): void {
        // 理論上要先 GameStart 才會進入 Idle，在這邊確定一定有呼叫過 PresentGameSceneStartShow()
        if (!this.m_hasGameStarted && !this.m_isGameSceneStartShowed) {
            this.PresentGameSceneStartShow();
        }
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 開始 Spin (按下 Spin 按鈕) */
    protected OnGameSpinStart(): void {
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 收到 Server 停輪回應的時候發送即將停輪的事件，並帶入參數通知本局是否將進入 Free Game 或 Bonus Game */
    protected OnGameSpinWillFinish(willEnterFeature: boolean = false): void {

    }

    //----------------------------------------------------------------
    /** 遊戲階段: 停輪後檢查有無大獎特效結束後 (不管 MG, FG, BG) */
    protected OnGameSpinFinish(): void {

    }

    //----------------------------------------------------------------
    /** 遊戲階段: 進入 Free Game (斷線重連回 FreeGame 也要發) (宣告面板按下 Button 後) */
    protected OnGameEnterFreeGame(): void {
        this.m_featureGameFlag |= FEATURE_GAME_FLAG.FREE_GAME;
        this.CheckFeatureGameStatus();
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 離開 Free Game (宣告面板按下 Button 後，且在結算大獎宣告前) */
    protected OnGameLeaveFreeGame(): void {
        this.m_featureGameFlag &= ~FEATURE_GAME_FLAG.FREE_GAME;
        this.CheckFeatureGameStatus();
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 進入 Bonus Game (斷線重連回 BonusGame 也要發) (宣告面板按下 Button 後) */
    protected OnGameEnterBonusGame(): void {
        this.m_featureGameFlag |= FEATURE_GAME_FLAG.BONUS_GAME;
        this.CheckFeatureGameStatus();
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 離開 Bonus Game (宣告面板按下 Button 後，且在結算大獎宣告前) */
    protected OnGameLeaveBonusGame(): void {
        this.m_featureGameFlag &= ~FEATURE_GAME_FLAG.BONUS_GAME;
        this.CheckFeatureGameStatus();
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 離開 FreeGame 或 BonusGame 後，回到 MainGame 的 Idle (要準備開始MainGame了) */
    protected OnGameLeaveFeatureToMainIdle(): void {

    }


    //================================================================
    // 特色遊戲事件
    //================================================================

    //----------------------------------------------------------------
    /**
     * 檢查特色遊戲狀態
     */
    protected CheckFeatureGameStatus(): void {
        const wasInFeatureGame = this.m_isInFeatureGame;
        this.m_isInFeatureGame = this.m_featureGameFlag > 0;

        if (this.m_isInFeatureGame && !wasInFeatureGame) {
            this.OnFeatureGameBegin();
        } else if (!this.m_isInFeatureGame && wasInFeatureGame) {
            this.OnFeatureGameEnded();
        }
    }

    //----------------------------------------------------------------
    /**
     * 特色遊戲開始
     */
    protected OnFeatureGameBegin(): void {
        // 阻擋左側功能按鈕 / 返回鍵
        // EventDispatcher.Shared.Dispatch( EventDefine.System.HIGHLIGHT_LEFT_PORT_SEALED, Identifier.BLOCK_KEY.FEATURE_GAME, true );
        // EventDispatcher.Shared.Dispatch( EventDefine.System.BACK_BUTTON_CONTROL, Identifier.BLOCK_KEY.FEATURE_GAME, false );
    }

    //----------------------------------------------------------------
    /**
     * 特色遊戲結束
     */
    protected OnFeatureGameEnded(): void {
        // 解除左側功能按鈕阻擋 / 返回鍵
        // EventDispatcher.Shared.Dispatch( EventDefine.System.HIGHLIGHT_LEFT_PORT_SEALED, Identifier.BLOCK_KEY.FEATURE_GAME, false );
        // EventDispatcher.Shared.Dispatch( EventDefine.System.BACK_BUTTON_CONTROL, Identifier.BLOCK_KEY.FEATURE_GAME, true );
    }



    //================================================================
    // Audio
    //----------------------------------------------------------------

    /**
     * 載入音樂音效資源
     * @param profile 音效清單設定檔
     * @param options 音效載入選項
     */
    private LoadAudioAssets(profile: AudioMacro.AssetsLoadProfile,
        cbOrOption?: AudioMacro.LoadedCallback<AudioMacro.AssetsLoadResult> | Readonly<AudioMacro.AssetsLoadOptions>
    ): void {
        // 設定載入選項
        const options = (typeof cbOrOption === "function") ? { loadedCallback: cbOrOption } : cbOrOption;

        // 載入音效資源
        const prep = this.AddEasyPreparation(Identifier.PREPARATION.GAME_AUDIO);
        this.m_gameAudioCtrl.LoadAssets(profile, options, (err, result) => {
            if (!isValid(this, true)) {
                warn(`[GameScene] Audio assets loaded but scene has been destroyed.`, this);
                prep.Resolve(Preparations.RESULT_TYPE.FAIL, null, "Self destroyed");
                return;
            }

            if (err) {
                error(`[GameScene] Load audio assets failed in ${this.SceneName}`, err);
                prep.Resolve(Preparations.RESULT_TYPE.FAIL, null, err.message);
            }

            prep.Resolve(Preparations.RESULT_TYPE.SUCCESS);
            this.m_isAudioAssetsReady = true;
        });
    }



















































    //原先GameScene的函式，在SlotGameScene遊戲層會呼叫到的函式中需要用到的函式
    //===============================================================================================================================================//




    OnEpisodeStart(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity?: EpisodeEntityBase<any>): void {
        // 暫停 View 處理
        ViewManager.Instance.Pause();
    }

    //----------------------------------------------------------------

    OnEpisodeFatal(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, code: EpisodeMacro.FATAL_CODE): void {

    }

    //----------------------------------------------------------------

    OnEpisodeLaunch(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity: EpisodeEntityBase<any>): void {

    }

    //----------------------------------------------------------------

    OnEpisodeFinish(key: EpisodeMacro.Keys, episodeId: number, episodeData: any, entity: EpisodeEntityBase<any>): void {
        // 恢復 View 處理
        ViewManager.Instance.Resume();
    }

    /**
     * 執行進入遊戲場景的表演流程
     * @returns 是否成功執行
     */
    protected PresentGameSceneStartShow(): boolean {
        this.SetSaveBetValue(this.m_gameBar.BetValue);

        if (!this.m_canShowGameSceneStart) {
            warn(`[GameScene] OnGameSceneStartShow: not ready`);
            return false;
        }

        if (this.m_isGameSceneStartShowed) {
            warn(`[GameScene] OnGameSceneStartShow: already showed`);
            return false;
        }

        this.m_isGameSceneStartShowed = true;

        return true;
    }

    /**
     * 是否允許在轉場畫面結束後 執行進入遊戲場景的表演流程
     * - 如果需要更晚顯示，請回傳 false 並且一定要記得呼叫 PresentGameSceneStartShow()
     */
    protected ApproveGameSceneStartShowOnTransitionHideEnded(): boolean {
        return this.m_hasGameStarted;
    }





    ////////////////////////////////////////////////////////////////////////////////////
    private m_preparationReady: boolean;

    protected GameInitiate(): void {
        const option: SlotGameOption = this.GameOption();

        this.AddPreparation<GameBarPreparations.InitConfig, GameBarPreparations.ResultData>(
            Identifier.PREPARATION.GAME_BAR,
            { RootNode: option?.GameBarRootNode ?? null, BundleName: option?.CustomGameBar ? this.BundleName : null },
            (result, data) => {
                if (isValid(this, true) && result === Preparations.RESULT_TYPE.SUCCESS) {
                    this.m_gameBar = data.GameBar;
                    this.m_gameBar.SetTouchEvent(this.OnGameBarSpinStateHandler.bind(this), this.OnGameBarTouchHandler.bind(this));

                    // 設定 GameBarDelegate
                    const self = this;
                    this.m_gameBar.Delegate =
                    {
                        get IsUsingKMBTv3(): boolean { return self.IsUsingKMBTv3; },
                        SendBigAwardEffectNotify: self.SendBigAwardEffectNotify.bind(self),
                    };
                }
            },
        );

        // 初始化 ProclaimButton
        if (!(option?.DisableScreenDialogButton ?? false)) {
            this.AddPreparation<ScreenDialogButtonPreparations.InitConfig, ScreenDialogButtonPreparations.ResultData>(
                Identifier.PREPARATION.PROCLAIM_BUTTON,
                { RootNode: null },
                (result, data) => {
                    if (isValid(this, true) && result === Preparations.RESULT_TYPE.SUCCESS) {
                        this.m_screenDialogButton = data.proclaimButton;
                        this.m_screenDialogButton.node.active = false
                    }
                },
            );
        }

        // 載入 Slot 通用音效
        {
            const prep = this.AddEasyPreparation(Identifier.PREPARATION.SLOT_COMMON_AUDIO);
            AudioManager.Instance.LoadAssets(
                AudiosDefine.Bundles.FRAMEWORK_SLOT,
                AudiosDefine.FRAMEWORK_SLOT,
                {
                    gamePausable: true,
                    loadedCallback: (err, result) => {
                        if (err) {
                            warn("[SlotGameScene] Load slot common audio failed.", err);
                        }

                        if (isValid(this, true)) {
                            if (err) {
                                prep.Resolve(Preparations.RESULT_TYPE.FAIL, null, err?.message)
                            } else {
                                prep.Resolve(Preparations.RESULT_TYPE.SUCCESS)
                            }
                        }
                    },
                });
        }

        // 自動載入音效資源
        {
            if (option?.AudioLoadingProfile) {
                this.LoadAudioAssets(option.AudioLoadingProfile, option.AudioLoadingOptions);
            } else {
                this.m_isAudioAssetsReady = true;
            }
        }

        this.m_episodeCommander.AttachEntity(EpisodeMacro.KEY.BIG_WIN, this);
    }

    private OnGameBarTouchHandler(event: EventTouch) {
        this.m_slotGameBase?.OnGameBarEventTouch?.(event);
    }

    protected override WillBeginPreparations(): void {
        super.WillBeginPreparations?.();

        const slotGameBase = NodeUtils.SearchComponent(this.node, SlotGameBase);
        if (isValid(slotGameBase, true) && slotGameBase instanceof SlotGameBase) {
            this.m_slotGameBase = slotGameBase;
        } else {
            error(`[SlotGameStage] WillBeginPreparations: SlotGameBase not found on scene [ ${this.SceneName} ]`);
        }

        this.GameInitiate();
    }

    /** 
     * 準備工作成功通知 
     * 注意：這個通知僅表示使用 Preparation 的項目都準備完成，但不代表其餘載入(例如自行手動載入，未使用 Preparation 的項目)準備完畢。
     *      如果是要接收全部準備完畢的通知請改於 OnPreparationsFinish 參數為 true 的時候進行處理。
     */
    protected override OnPreparationsSuccess(): void {
        this.m_preparationReady = true;
        //TODO Ide
        if (GameService.Instance) {
            GameService.Instance.SendCommand(GameCommonCommand.U2G.U2G_COMMON_COMMAND_BET_SETTING_REQ);
        }

        this.m_slotGameBase?.OnPlatformReady?.();

        {
            // const content = '{"bl":[{"bi":4,"b":1200000,"nl":10,"xl":0},{"bi":5,"b":1600000,"nl":20,"xl":0},{"bi":6,"b":2400000,"nl":20,"xl":0},{"bi":7,"b":4000000,"nl":30,"xl":0},{"bi":8,"b":6000000,"nl":40,"xl":0},{"bi":9,"b":8000000,"nl":50,"xl":0},{"bi":10,"b":12000000,"nl":65,"xl":0},{"bi":11,"b":20000000,"nl":80,"xl":0},{"bi":12,"b":40000000,"nl":100,"xl":0},{"bi":13,"b":60000000,"nl":130,"xl":0},{"bi":14,"b":80000000,"nl":150,"xl":0},{"bi":15,"b":120000000,"nl":180,"xl":0},{"bi":16,"b":200000000,"nl":200,"xl":0},{"bi":17,"b":300000000,"nl":250,"xl":0},{"bi":18,"b":400000000,"nl":300,"xl":0},{"bi":19,"b":600000000,"nl":350,"xl":0},{"bi":20,"b":800000000,"nl":400,"xl":0},{"bi":21,"b":1200000000,"nl":600,"xl":0},{"bi":22,"b":2000000000,"nl":1100,"xl":0},{"bi":23,"b":4000000000,"nl":1600,"xl":0},{"bi":24,"b":6000000000,"nl":1900,"xl":0},{"bi":25,"b":8000000000,"nl":2100,"xl":0},{"bi":26,"b":14000000000,"nl":2600,"xl":0},{"bi":27,"b":20000000000,"nl":2900,"xl":0},{"bi":28,"b":40000000000,"nl":3400,"xl":0},{"bi":29,"b":60000000000,"nl":3700,"xl":0},{"bi":30,"b":80000000000,"nl":4000,"xl":0},{"bi":31,"b":160000000000,"nl":4500,"xl":0},{"bi":32,"b":240000000000,"nl":4800,"xl":0},{"bi":33,"b":320000000000,"nl":5000,"xl":0}],"jl":[{"type":0,"baseOdds":10},{"type":1,"baseOdds":20},{"type":2,"baseOdds":50},{"type":3,"baseOdds":100},{"type":4,"baseOdds":250}],"ul":[{"ut":3,"b":2400000,"ul":20},{"ut":4,"b":6000000,"ul":40},{"ut":6,"b":8000000,"ul":50}],"bt":1744266674}';
            // this.m_pendingCommonGameInfo = CarriarParser.ParseString(content as string, GameCommonCommand.CommonGameInfo);
            // log(`[SlotGameScene] [CMD-201] 收到bet設定:`, this.m_pendingCommonGameInfo);
            this.m_slotGameBase?.OnBetInfoUpdate?.();
            //TODO Ide
            if (AlphaLoading.Instance) {
                AlphaLoading.Instance.Hide();
            }

            this.m_isCommonBetInfoReady = true;
        }
    }

    public override OnGameJoined(): void {
        super.OnGameJoined();
        //TODO Ide
        if (GameService.Instance) {
            GameService.Instance.SendCommand(GameCommonCommand.U2G.U2G_COMMON_COMMAND_BET_SETTING_REQ);
        }
    }

    protected override IsPreparationFinished(): boolean {
        return super.IsPreparationFinished() && (!!this.m_pendingCommonGameInfo || !!this.m_commonGameInfo) && !!this.m_confirmReady;
    }

    /**
     * 是否需要 TopBar
     */
    protected override NeedTopBar(): boolean {
        return true;
    }
}


