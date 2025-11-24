import { _decorator, Color, Label, log, Node } from 'cc';
import GameIntro from '../GameIntro';
import { GodHandSetting } from './GodHandSetting';
const { ccclass } = _decorator;

@ccclass('GodHandGameSetting')
export class GodHandGameSetting extends GodHandSetting {

    private m_functionList:Function[] = []

    protected onLoad(): void {
        super.onLoad && super.onLoad();
        this.CreateGameSetting()
    }

    protected onEnable(): void {
        super.onEnable && super.onEnable();
        for(let i = 0; i < this.m_functionList.length; i++){
            let labelNode = this.m_contentNode.getChildByName(i.toString())
            let clickedCb = this.m_functionList[i]
            labelNode.on(Node.EventType.TOUCH_END, clickedCb, this);
        }
    }

    protected onDisable(): void {
        super.onDisable && super.onDisable();
        this.m_contentNode?.children.forEach((child) => {
            child?.targetOff(Node.EventType.TOUCH_END);
        })
    }

    protected onDestroy(): void {
        super.onDestroy && super.onDestroy();
    }

    /** 初始化設定頁面 */
    public Init(pageIndex: number, title: string = null): void {
        super.Init && super.Init(pageIndex,  "遊戲設定");
    }

    private CreateGameSetting(){
        log("[GodHandGameSetting][CreateInit]")
        this.CreateLabel("清除開場動畫", ()=>{
            GameIntro.ClearGameIntroData();
        } )

        // if (EnvConfig.IS_DEV && !EnvConfig.IS_HAPPY)
        // {
        //     this.CreateLabel("隱藏作弊框", ()=>{
        //         VegasApp.Instance.SwitchGameQATest( false );
        //     } )

        //     this.CreateLabel("顯示作弊框", ()=>{
        //         VegasApp.Instance.SwitchGameQATest( true );
        //     } )
        // }

        // this.CreateLabel("顯示性能統計資訊", ()=>{
        //     VegasApp.Instance.SwitchProfilerStats( true );
        // } )

        // this.CreateLabel("隱藏性能統計資訊", ()=>{
        //     VegasApp.Instance.SwitchProfilerStats( false );
        // } )

    }

    private CreateLabel( labelString:string, clickedCb:Function ){

        let name:number = this.m_functionList.length

        // 動態創建一個新的 Node 節點
        let labelNode = new Node(name.toString());

        // 創建一個 Label 組件並將其附加到 Node 上
        let label = labelNode.addComponent(Label);

        // 設置 Label 的文字
        label.string = labelString

        // 設置文字顏色
        label.color = new Color(255, 255, 255);  // 白色

        // 設置文字字體大小
        label.fontSize = 30;

        // 將創建的 Label 節點加入到場景的父節點（例如 Canvas）
        this.m_contentNode.addChild(labelNode);
        
        // 綁定觸摸事件
        labelNode.on(Node.EventType.TOUCH_END, clickedCb, this);

        this.m_functionList.push( clickedCb )
    }
}