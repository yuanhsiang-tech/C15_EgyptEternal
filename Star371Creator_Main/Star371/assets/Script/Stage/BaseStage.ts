import { _decorator, error, instantiate, log, Node, Prefab } from 'cc';
import Stage from './Stage';
import { GameApp } from '../App/GameApp';
import { GameId } from '../Define/GameDefine';
import { GameInfo } from '../Define/GameInfoDefine';
import { Resource } from '../Define/ResourceDefine';
import { EventDefine } from '../Define/EventDefine';
import { StageInfoMap } from '../Define/StageDefine';
import { Bundle, GameBundle } from '../Bundle/Bundle';
import { UIButtonItem } from '../UISystem/UIButtonItem';
import { TopBarMode } from '../Define/TopBarModeDefine';
import FiniteState from '../../Stark/Utility/FiniteState';
import { MechanismType } from '../Define/MechanismDefine';
import { EventDispatcher } from '../../Stark/Utility/EventDispatcher';
import { TopBarController, TopBarDataSource } from '../Feature/TopBar/TopBarController';
import { ViewManager } from '../ViewManage/ViewManager';
import { PersistLayers } from '../Feature/PersistLayers/PersistLayers';
import { Define } from '../Define/GeneralDefine';
import { EasyPreparation } from '../Scene/Preparation/EasyPreparation';
import { Identifier } from '../Define/IdentifierDefine';
import { Preparations } from '../Scene/Preparation/PreparationMacro';
import { Type as LogCoinType } from "../Proto/gt2/lct/lct_pb";
import { CurrencyFlowLog } from '../CurrencyFlow/CurrencyFlow';
import * as Currency from "../Proto/gt2/currency/currency_pb";

const { ccclass } = _decorator;

enum State {
    NONE,
}

@ccclass('BaseStage')
export class BaseStage extends Stage {
    private m_stageBaseState:FiniteState<State>;
    private m_topBarDataSource:TopBarDataSource;

    protected override onLoad(): void {
        super.onLoad();

        this.m_stageBaseState = new FiniteState(State.NONE);
        this.m_topBarDataSource = {
            TopBarLeftView: (mode:TopBarMode)=>this.TopBarLeftView(mode),
            TopBarRightView: (mode:TopBarMode)=>this.TopBarRightView(mode),
        };

        GameApp.Shared.CurrencyFlow.Delegate = this;
        GameApp.Shared.CurrencyFlow.ForceSync(true);

        if (this.CameFromLogin) {
            // TopBar 初始化
            TopBarController.Instance;
        }
    }

    protected override onEnable(): void {
        super.onEnable?.();
        EventDispatcher.Shared.On(EventDefine.System.UI_ITEM_EVENT_CLICKED, this.OnUIItemClicked, this);
        EventDispatcher.Shared.On(EventDefine.System.ENTER_GAME, this.OnEnterGame, this);
        EventDispatcher.Shared.On(EventDefine.System.ENTER_GAME_LOBBY, this.OnEnterGameLobby, this);
    }

    protected override onDisable(): void {
        super.onDisable?.();
        TopBarController.Instance.SetView(null);
        EventDispatcher.Shared.Off(EventDefine.System.UI_ITEM_EVENT_CLICKED, this.OnUIItemClicked, this);
        EventDispatcher.Shared.Off(EventDefine.System.ENTER_GAME, this.OnEnterGame, this);
        EventDispatcher.Shared.Off(EventDefine.System.ENTER_GAME_LOBBY, this.OnEnterGameLobby, this);

        PersistLayers.Clear(Define.ZIndex.Global.SUPERIOR_LAYER);
        PersistLayers.Clear(Define.ZIndex.Global.TOP_BAR);
    }

    protected override WillBeginPreparations(): void {
        super.WillBeginPreparations();

        if (this.NeedTopBar()) {
            const topBarPreparation:EasyPreparation.Core = this.AddEasyPreparation(Identifier.PREPARATION.TOP_BAR);
            Bundle.Resources.Load(
                !this.IsPortrait ? Resource.Prefab.TOP_BAR_L : Resource.Prefab.TOP_BAR_P, 
                (err:Error|null, prefab:Prefab) => {
                    if (err) {
                        topBarPreparation.Resolve(Preparations.RESULT_TYPE.FAIL, null, err.message);
                    } else {
                        const topBar:Node = instantiate(prefab);
                        PersistLayers.Layer(Define.ZIndex.Global.TOP_BAR).addChild(topBar);
                        TopBarController.Instance.DataSource = this.m_topBarDataSource;
                        TopBarController.Instance.SetView(topBar);
                        TopBarController.Instance.SetMode(this.TopBarMode());
                        topBarPreparation.Resolve(Preparations.RESULT_TYPE.SUCCESS);
                    }
            });
        }
    }

    /**
     * 按鈕點擊事件
     * @param item 按鈕
     */
    protected OnUIItemClicked(item: UIButtonItem): void {
        switch (item.Id) {
            case MechanismType.BACK: {
                this.OnTopBarBackClicked();
                break;
            }
        }
    }

    /**
     * 返回按鈕點擊事件
     */
    protected OnTopBarBackClicked(): void {
        GameApp.Shared.StageManager.Pop();
    }

    /**
     * 設定左側附加顯示內容
     * @param view 附加顯示內容
     */
    protected TopBarLeftView(mode: TopBarMode): Node {
        return null;
    }

    /**
     * 設定右側附加顯示內容
     * @param view 附加顯示內容
     */
    protected TopBarRightView(mode: TopBarMode): Node {
        return null;
    }

    /**
     * 是否需要 TopBar
     */
    protected NeedTopBar(): boolean {
        return true;
    }

    /**
     * 指定 TopBar 模試
     */
    protected TopBarMode(): TopBarMode {
        return TopBarMode.LOBBY;
    }

    /**
     * 進入遊戲大廳
     * @param gameId 遊戲 Id
     * @param themeType 廳館類型
     * @param subLobby 子大廳編號
     */
    protected OnEnterGameLobby(gameId:GameId, themeType:number, subLobby:number): void {
        this.PrepareEnterGame(gameId, ()=>{
            GameApp.Shared.StageManager.Push(-gameId, themeType, subLobby);
        })
    }

    /**
     * 進入遊戲
     * @param gameId 遊戲 Id
     * @param themeType 廳館類型
     * @param themeName 廳館名稱
     */
    protected OnEnterGame(gameId:GameId, themeType:number, themeName?:string): void {
        if (themeName == null) {
            // [自動挑選廳館]
        }

        this.PrepareEnterGame(gameId, ()=>{
            GameApp.Shared.StageManager.Push(gameId, themeType, /* themeName */);
        });
    }

//#region  CurrencyFlowDelegate
    public OnCurrencyFlowing(reason:LogCoinType, type:Currency.Type, fromValue:BigNumber, toValue:BigNumber, changeValue:BigNumber, isSafe:boolean, option?:any) {
        EventDispatcher.Shared.Dispatch.call(EventDispatcher.Shared, EventDefine.System.CURRENCY_FLOWING, ...arguments);
    }

    public OnCurrencyFlowSyncCheckFail(type:Currency.Type, clientChangeLogList:CurrencyFlowLog[], serverChangeLogList:CurrencyFlowLog[]) {

    }

    public CurrencyFlowNotifyNegative(reason:LogCoinType, type:Currency.Type, changeValue:BigNumber) {

    }

    public CurrencyFlowCheckLogOverCount(log:CurrencyFlowLog) {

    }
//#endregion CurrencyFlowDelegate

    /**
     * 進入遊戲前的準備處理
     * @param bundles 要載入的 bundle
     * @param callback 載入完成通知
     */
    private PrepareEnterGame(gameId:GameId, callback:()=>void): void {
        const gameInfo:GameInfo = StageInfoMap.get(gameId) as GameInfo;
        if (!gameInfo) {
            ViewManager.Alert("查無對應遊戲設定資料");
        } else if (!GameApp.Shared.Connection.JoinGame(gameId)) {
            ViewManager.Alert("無法同時加入多款遊戲");
        } else {
            GameBundle.Load(gameInfo.Bundles, (err:Error)=>{
                if (err) {
                    error(err);
                } else {
                    callback?.();
                }
            })
        }
    }
}