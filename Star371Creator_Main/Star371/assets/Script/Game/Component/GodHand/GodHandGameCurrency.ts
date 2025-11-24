import { _decorator, Color, Label, log, Node, Tween, tween, UITransform } from 'cc';
import { EventDefine } from '../../../Define/EventDefine';
import { GodHandSetting } from './GodHandSetting';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import { NumberUtils } from 'db://assets/Stark/FuncUtils/NumberUtils';
const { ccclass, property } = _decorator;

@ccclass('GodHandGameCurrency')
export class GodHandGameCurrency extends GodHandSetting {

    private m_tween:Tween<Node>= null

    private m_currency:BigNumber = new BigNumber(0)

    protected onLoad(): void {
        super.onLoad && super.onLoad();
    }

    protected onEnable(): void {
        super.onEnable && super.onEnable();
    }

    protected onDisable(): void {
        super.onDisable && super.onDisable();

    }

    protected onDestroy(): void {
        if(this.m_tween)
            this.m_tween.stop()
        this.OffGameEvent()
        super.onDestroy && super.onDestroy();
    }

    /** 初始化設定頁面 */
    public Init(pageIndex: number, title: string = null): void {
        super.Init && super.Init(pageIndex, "遊戲財產變化");
        this.OnGameEvent()
        this.Memo()
        this.ShowReelCurrency(false)
    }

    /** 重設當前頁面為預設值 */
    protected ResetPageSettings(): void {
        this.m_contentNode?.removeAllChildren()
    }

    protected ConfirmSettings(): void {
        this.ShowReelCurrency(true)
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
        log("[GodHandGameCurrency][OnGameEvent]")
        EventDispatcher.Shared.On(EventDefine.Game.CURRENCY_UPDATE_BY_BET, this.SubmitValutaByBet, this);
        EventDispatcher.Shared.On(EventDefine.Game.CURRENCY_UPDATE_BY_REWARD, this.SubmitValutaByWin, this);
    }

    private OffGameEvent(){
        log("[GodHandGameCurrency][OffGameEvent]")
        EventDispatcher.Shared.Off(EventDefine.Game.CURRENCY_UPDATE_BY_BET, this.SubmitValutaByBet, this);
        EventDispatcher.Shared.Off(EventDefine.Game.CURRENCY_UPDATE_BY_REWARD, this.SubmitValutaByWin, this);
    }
   
    private SubmitValutaByWin(value: number | BigNumber): void {
        let str =  "贏分 > " + NumberUtils.FormatEasy(value)
        this.CreateLabel(str, new Color(255, 0, 50) )
        let newCurrency = this.m_currency.plus(value)
        this.ShowNowCurrency( newCurrency)
    }

    private SubmitValutaByBet(value: number | BigNumber): void {
        let str =  "押注 > " + NumberUtils.FormatEasy(value)
        this.CreateLabel(str, new Color(0, 255, 50) )
        let newCurrency = this.m_currency.plus(-value)
        this.ShowNowCurrency( newCurrency )
    }

    private ShowReelCurrency(checkCurrency:boolean = false) {

        let nowCurrency = UserProfile.GetProperty();
        if( checkCurrency && (this.m_currency.toString() != nowCurrency.toString()) ){
            this.CreateLabel("財產對不起來")
            this.CreateLabel(this.m_currency.toString())
            this.CreateLabel(nowCurrency.toString())
        }
        
        this.m_currency = new BigNumber(nowCurrency);
        let str2 =  "實際財產 > " + NumberUtils.FormatEasy(this.m_currency)
        this.CreateLabel(str2, new Color(255, 255, 255))
    }

    private ShowNowCurrency( newCurrency:BigNumber, color:Color = new Color(255, 255, 255) ) {
        this.m_currency = newCurrency
        let str2 =  "財產變化 > " + NumberUtils.FormatEasy(newCurrency)
        this.CreateLabel(str2, color)
    }

    private Memo(){
        this.CreateLabel("重置鍵清除當前資料 / V鍵刷新當前真實財產")
    }
}