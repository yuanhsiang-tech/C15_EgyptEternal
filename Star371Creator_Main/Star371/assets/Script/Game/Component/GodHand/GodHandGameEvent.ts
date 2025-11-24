import { _decorator, Color, Label, log, Node, UITransform } from 'cc';
import { EventDefine } from '../../../Define/EventDefine';
import { GodHandSetting } from './GodHandSetting';
import { GOD_HAND } from './GodHandDefine';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
const { ccclass, property } = _decorator;

@ccclass('GodHandGameEvent')
export class GodHandGameEvent extends GodHandSetting {

    protected onLoad(): void {
        super.onLoad && super.onLoad();
    }

    protected onEnable(): void {
        super.onEnable && super.onEnable();
        EventDispatcher.Shared.Dispatch(GOD_HAND.CONFIRM_HIDE);
    }

    protected onDisable(): void {
        super.onDisable && super.onDisable();
    }

    protected onDestroy(): void {
        this.OffGameEvent()
        super.onDestroy && super.onDestroy();
    }

    /** 初始化設定頁面 */
    public Init(pageIndex: number, title: string = null): void {
        super.Init && super.Init(pageIndex, "遊戲事件");
        this.OnGameEvent()
    }

    /** 重設當前頁面為預設值 */
    protected ResetPageSettings(): void {
        this.m_contentNode?.removeAllChildren()
    }

    private CreateLabel( labelString:string, color:Color = new Color(255, 255, 255) ){
        // 動態創建一個新的 Node 節點
        let labelNode = new Node();

        // 創建一個 Label 組件並將其附加到 Node 上
        let label = labelNode.addComponent(Label);

        // 設置 Label 的文字
        label.string = labelString

        // 設置文字顏色
        label.color = color;

        // 設置文字字體大小
        label.fontSize = 25;
        label.lineHeight = 25
      
        let uiTransform = labelNode.addComponent(UITransform);
        uiTransform.setContentSize(200, 25)
        

        // 將創建的 Label 節點加入到場景的父節點（例如 Canvas）
        this.m_contentNode.addChild(labelNode);
    }

    //================================================================
    // 遊戲階段事件
    //================================================================

    private OnGameEvent(){
        log("[GameHandGameEvent][OnGameEvent]")
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

    private OffGameEvent(){
        log("[GameHandGameEvent][OffGameEvent]")
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
    }

    //----------------------------------------------------------------
    /** 遊戲階段: 遊戲開始，前導動畫後，只送一次 */
    protected OnGameStart(): void
    {
       this.CreateLabel( "GAME_START", new Color(255, 0, 0) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 進入 Idle 狀態 (可以進行下一次 Spin) */
    protected OnGameEnterIdle(): void
    {
        this.CreateLabel( "ENTER_IDLE", new Color(255, 255, 255) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 開始 Spin (按下 Spin 按鈕) */
    protected OnGameSpinStart(): void
    {
        this.CreateLabel( "SPIN_START", new Color(0, 255, 0) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 收到 Server 停輪回應的時候發送即將停輪的事件，並帶入參數通知本局是否將進入 Free Game 或 Bonus Game */
    protected OnGameSpinWillFinish(willEnterFeature: boolean = false): void
    {
        this.CreateLabel( "SPIN_WILL_FINISH", new Color(0, 255, 0) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 停輪後檢查有無大獎特效結束後 (不管 MG, FG, BG) */
    protected OnGameSpinFinish(): void
    {
        this.CreateLabel( "SPIN_FINISH", new Color(0, 255, 0 ))
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 進入 Free Game (斷線重連回 FreeGame 也要發) (宣告面板按下 Button 後) */
    protected OnGameEnterFreeGame(): void
    {
        this.CreateLabel( "ENTER_FREE_GAME", new Color(65, 163, 252) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 離開 Free Game (宣告面板按下 Button 後，且在結算大獎宣告前) */
    protected OnGameLeaveFreeGame(): void
    {
        this.CreateLabel( "LEAVE_FREE_GAME", new Color(65, 163, 252) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 進入 Bonus Game (斷線重連回 BonusGame 也要發) (宣告面板按下 Button 後) */
    protected OnGameEnterBonusGame(): void
    {
        this.CreateLabel( "ENTER_BONUS_GAME", new Color(255, 255, 0) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 離開 Bonus Game (宣告面板按下 Button 後，且在結算大獎宣告前) */
    protected OnGameLeaveBonusGame(): void
    {
        this.CreateLabel( "LEAVE_BONUS_GAME" , new Color(255, 255, 0) )
    }
    //----------------------------------------------------------------
    /** 遊戲階段: 離開 FreeGame 或 BonusGame 後，回到 MainGame 的 Idle (要準備開始MainGame了) */
    protected OnGameLeaveFeatureToMainIdle(): void
    {
        this.CreateLabel( "LEAVE_FEATURE_TO_MAIN_IDLE", new Color(255, 0, 255) )
    }
    //================================================================
    // 特色遊戲事件
    //================================================================
    //----------------------------------------------------------------
 
}