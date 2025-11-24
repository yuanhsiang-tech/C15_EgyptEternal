// GodHand 
// 頁面建立編號順序 0 開始，依序建立以下頁面
// 各遊戲自定義頁面（輪帶堆疊設定, 遊戲各字設定相關測試按鈕）
// 輪帶設定頁頁面(Noramal, Fast, Trubo)
// 公用頁面(基本按鈕, 遊戲事件發送監聽, 財產押注贏分變化紀錄)
// 起始顯示頁面為公用頁面基本按鈕頁

import { _decorator, Component, instantiate, log, Node, Prefab, tween, Tween, UITransform, v3 } from 'cc';
import { Device } from '../../../Device/Device';
import { GodHandReelSetting } from './GodHandReelSetting';
import { GodHandSetting } from './GodHandSetting';
import { GodHandGameSetting } from './GodHandGameSetting';
import { GodHandGameEvent } from './GodHandGameEvent';
import { GodHandGameCurrency } from './GodHandGameCurrency';
import { GOD_HAND } from './GodHandDefine';
import Touchable, { TouchableEvent } from 'db://assets/Stark/Interactive/Touchable';
import { EventDispatcher } from 'db://assets/Stark/Utility/EventDispatcher';
import { CommonSpinnerSpeedConfig } from '../../Common/SlotSpinner/Utility/CommonSpinnerSpeedConfig';
import { GameApp } from '../../../App/GameApp';
const { ccclass, property } = _decorator;


@ccclass('GodHandView')
export class GodHandView extends Component {

    @property({ type: Node, displayName: "Content Node" })
    private m_contentNode: Node = null; 

    @property({ type: Node, displayName: "Page Node" })
    private m_pageNode: Node = null; // 儲存頁面內容的容器節點
  
    @property({ type: Prefab, displayName: "PageBasePrefab" })
    private m_basePagePrefab: Prefab = null; // 頁面內容的Prefab

    @property({ type: Prefab, displayName: "Reel Prefab" })
    private m_reelPrefab: Prefab = null; // 輪帶設定的 Prefab

    @property({ type: Touchable, displayName: "Last Page Button" })
    private m_lastPageButton: Touchable = null; // 上一頁按鈕

    @property({ type: Touchable, displayName: "Next Page Button" })
    private m_nextPageButton: Touchable = null; // 下一頁按鈕

    @property({ type: Touchable, displayName: "Slide Out Button" })
    private m_slideOutButton: Touchable = null; // 收合按鈕

    @property({ type: Touchable, displayName: "Slide In Button" })
    private m_slideInButton: Touchable = null; // 展開按鈕

    @property({ type: Touchable, displayName: "Reset Button" })
    private m_resetButton: Touchable = null; // 重置按鈕

    @property({ type: Touchable, displayName: "Close Button" })
    private m_closeButton: Touchable = null; // 關閉按鈕

    @property({ type: Touchable, displayName: "Confirm Button" })
    private m_confirmButton: Touchable = null; // 確認按鈕

    /** 當前頁面編號 */
    private m_currentPageIndex: number = 0;

    /** 面板是否已收合 */
    private m_isPanelCollapsed: boolean = true;

    /** 總頁數 */
    private m_totalPages: number = 0;

    /** 遊戲自定義的Prefab列表 */
    private m_gamePagePrefabs: Prefab[] = [];

    /** 輪帶配置列表 */
    private m_reelConfigurations: CommonSpinnerSpeedConfig[] = [];

    private m_tween:Tween<Node>= null

    /** 共用設定頁數(當作起始頁面) */
    private m_gameCommonPageIdx:number = 0

    protected onDisable(): void {
        log("[GodHandView][onDisable]");

        // 監聽事件
        EventDispatcher.Shared.Off(GOD_HAND.RESET_SHOW, this.OnShowBtnReset, this);
        EventDispatcher.Shared.Off(GOD_HAND.RESET_HIDE, this.OnHideBtnReset, this);
        EventDispatcher.Shared.Off(GOD_HAND.CONFIRM_SHOW, this.OnShowBtnConfirm, this);
        EventDispatcher.Shared.Off(GOD_HAND.CONFIRM_HIDE, this.OnHideBtnConfirm, this);

        // 按鈕事件
        this.m_slideInButton.Off(TouchableEvent.Clicked, this.OnSlideInButtonClick, this);
        this.m_slideOutButton.Off(TouchableEvent.Clicked, this.OnSlideOutButtonClick, this);
        this.m_lastPageButton.Off(TouchableEvent.Clicked, this.OnLastPageButtonClick, this);
        this.m_nextPageButton.Off(TouchableEvent.Clicked, this.OnNextPageButtonClick, this);
        this.m_closeButton.Off(TouchableEvent.Clicked, this.OnCloseButtonClick, this);
        this.m_resetButton.Off(TouchableEvent.Clicked, this.OnResetButtonClick, this);
        this.m_confirmButton.Off(TouchableEvent.Clicked, this.OnConfirmButtonClick, this);
    }

    protected onEnable(): void {
        log("[GodHandView][onEnable]");

        // 監聽事件
        EventDispatcher.Shared.On(GOD_HAND.RESET_SHOW, this.OnShowBtnReset, this);
        EventDispatcher.Shared.On(GOD_HAND.RESET_HIDE, this.OnHideBtnReset, this);
        EventDispatcher.Shared.On(GOD_HAND.CONFIRM_SHOW, this.OnShowBtnConfirm, this);
        EventDispatcher.Shared.On(GOD_HAND.CONFIRM_HIDE, this.OnHideBtnConfirm, this);
        
        // 按鈕事件
        this.m_slideInButton.On(TouchableEvent.Clicked, this.OnSlideInButtonClick, this);
        this.m_slideOutButton.On(TouchableEvent.Clicked, this.OnSlideOutButtonClick, this);
        this.m_lastPageButton.On(TouchableEvent.Clicked, this.OnLastPageButtonClick, this);
        this.m_nextPageButton.On(TouchableEvent.Clicked, this.OnNextPageButtonClick, this);
        this.m_closeButton.On(TouchableEvent.Clicked, this.OnCloseButtonClick, this);
        this.m_resetButton.On(TouchableEvent.Clicked, this.OnResetButtonClick, this);
        this.m_confirmButton.On(TouchableEvent.Clicked, this.OnConfirmButtonClick, this);
    }

    protected onDestroy(): void {
        log("[GameHandView][onDestroy]")
    }

    /** 事件 - 重置按鈕 - 顯示 */
    private OnShowBtnReset(){
        this.m_resetButton.node.active = true
    }
    
    /** 事件 - 重置按鈕 - 隱藏 */
    private OnHideBtnReset(){
        this.m_resetButton.node.active = false
    }

    /** 事件 - 確認按鈕 - 顯示 */
    private OnShowBtnConfirm(){
        this.m_confirmButton.node.active = true
    }

    /** 事件 - 確認按鈕 - 隱藏 */
    private OnHideBtnConfirm(){
        this.m_confirmButton.node.active = false
    }

    /** 確認按鈕點擊事件 */
    private OnConfirmButtonClick(sender: Touchable): void {
        this.BtnScale(sender.node)
        EventDispatcher.Shared.Dispatch(GOD_HAND.CONFIRM);
    }

    /** 重置按鈕點擊事件 */
    private OnResetButtonClick(sender: Touchable): void {
        this.BtnScale(sender.node)
        EventDispatcher.Shared.Dispatch(GOD_HAND.RESET);
    }

    /** 下一頁按鈕點擊事件 */
    private OnNextPageButtonClick(sender: Touchable): void {
        // log("[GodHandView][OnNextPageButtonClick] Current Page Index:", this.m_currentPageIndex);
        this.BtnScale(sender.node)
        this.OnShowBtnReset()
        this.OnShowBtnConfirm()
        let currentPageIndex:number = (this.m_currentPageIndex + 1) % this.m_totalPages;
        this.ShowPage( currentPageIndex )
    }

    /** 上一頁按鈕點擊事件 */
    private OnLastPageButtonClick(sender: Touchable): void {
        // log("[GodHandView][OnLastPageButtonClick] Current Page Index:", this.m_currentPageIndex);
        this.BtnScale(sender.node)
        this.OnShowBtnReset()
        this.OnShowBtnConfirm()
        let currentPageIndex:number = (this.m_currentPageIndex - 1 + this.m_totalPages) % this.m_totalPages;
        this.ShowPage( currentPageIndex )
    }

    /** 收合面板按鈕點擊事件 */
    private OnSlideOutButtonClick(sender: Touchable): void {
        // log("[GodHandView][OnSlideOutButtonClick] Collapse Panel");
        this.m_isPanelCollapsed = true;
        this.UpdateSlideButtons();
        Tween.stopAllByTarget(this.node);
        const targetX = -this.m_contentNode.getComponent(UITransform).contentSize.x;
        tween(this.m_contentNode)
            .to(0.5, { position: v3(targetX, this.m_contentNode.position.y) })
            .start();
    }

    /** 展開面板按鈕點擊事件 */
    private OnSlideInButtonClick(sender: Touchable): void {
        // log("[GodHandView][OnSlideInButtonClick] Expand Panel");
        this.m_isPanelCollapsed = false;
        this.UpdateSlideButtons();
        Tween.stopAllByTarget(this.node);
        tween(this.m_contentNode)
            .to(0.5, { position: v3(0, this.m_contentNode.position.y) })
            .start();
    }

    /** 關閉面板 */
    public OnCloseButtonClick(sender: Touchable): void {
        this.BtnScale(sender.node)
        this.node.active = false;
    }

    /** 更新 收合/展開 按鈕狀態 */
    private UpdateSlideButtons(): void {
        this.m_slideInButton.node.active = this.m_isPanelCollapsed;
        this.m_slideOutButton.node.active = !this.m_isPanelCollapsed;
    }

    /**
     * 顯示頁面
     * @param currentPageIndex 當前頁數
     */
    private ShowPage( currentPageIndex:number ){
        log("[GodHandView][ShowPage] currentPageIndex:", currentPageIndex)
        this.m_currentPageIndex = currentPageIndex
        this.m_pageNode.children.forEach((page, idx) => {
            page.active = this.m_currentPageIndex === idx;
        });
    }

    /**
     * 初始化頁面和配置
     * @param gamePrefabList 遊戲自定義的Prefab 
     * @param reelConfigs 輪帶速度設定值
     */
    public CreatePages( gamePrefabList: Prefab[] = null , reelConfigs: CommonSpinnerSpeedConfig[] = null ): void {
        log("[GodHandView][CreatePages]");
        
        this.m_gamePagePrefabs = gamePrefabList
        this.m_reelConfigurations = reelConfigs;

        // 設定直橫版位置
        let uITransform:UITransform = this.m_contentNode.getComponent(UITransform)
        if( GameApp.Shared.StageManager.Current.Orientation == Device.Orientation.PORTRAIT ){
            uITransform.setContentSize( GOD_HAND.PORTRAIT_SIZE, uITransform.height )
            this.m_contentNode.setPosition(v3(-GOD_HAND.PORTRAIT_SIZE,0,0))
        }
        this.InstantiateNodes();
    }

    private InstantiateNodes(){

        let pageIdx:number = 0

        const CreatePageNode = (pageIndex: number, pagePrefab: Prefab): Node => {
            const pageNode = instantiate(pagePrefab);
            pageNode.name = pageIndex.toString();
            this.m_pageNode.addChild(pageNode);
            pageNode.active = pageIndex === 0;
            return pageNode;
        };

        // 遊戲自定義的頁面
        this.m_gamePagePrefabs?.forEach((pagePrefab) => {
            let pageChild: Node = CreatePageNode(pageIdx, pagePrefab);
            let godHandSetting:GodHandSetting = pageChild.getComponent(GodHandSetting)
            log("[GodHandView] godHandSetting:", pageChild, godHandSetting)
            godHandSetting?.Init( pageIdx )
            pageIdx++;
        });

        // 輪帶速度
        for (const key in this.m_reelConfigurations) {
            let pageChild: Node = CreatePageNode(pageIdx, this.m_reelPrefab)
            let godHandReelSetting = pageChild.getComponent(GodHandReelSetting)
            godHandReelSetting.Init( pageIdx, key.toString())
            godHandReelSetting.OnReelSettings(this.m_reelConfigurations[key])
            pageIdx++
        }

        // 取得公用設定的頁數編號
        this.m_gameCommonPageIdx = pageIdx

        // 公用的頁面
        let list = [GodHandGameSetting, GodHandGameEvent, GodHandGameCurrency]
        const CreatePageNodeByclass = (pageIndex: number, classCompent:any): Node => {
            const pageNode = instantiate(this.m_basePagePrefab);
            const pageComent = pageNode.addComponent(classCompent) as GodHandSetting
            pageNode.name = pageIndex.toString();
            this.m_pageNode.addChild(pageNode);
            pageNode.active = pageIndex === 0;
            pageComent?.Init( pageIndex )
            return pageNode;
        };

        list.forEach((classNameCompent) => {
            CreatePageNodeByclass(pageIdx, classNameCompent)
            pageIdx++
        });

        // 頁數確認
        this.m_totalPages = pageIdx
        if( this.m_totalPages == 1 ){
            this.m_nextPageButton.node.active = false
            this.m_lastPageButton.node.active = false
        }
        
        this.ShowPage( this.m_gameCommonPageIdx )
        log("[GodHandView] Total Pages:", this.m_totalPages);
        log("[GodHandView] this.m_pageNode:", this.m_pageNode);
    }

    private BtnScale( node:Node ){
        if(this.m_tween)
            this.m_tween.stop()
        
        this.m_tween = tween(node)
        .to(0.05, { scale: v3(1.1, 1.1, 1.1) }) // 放大到1.2倍
        .to(0.01, { scale: v3(1, 1, 1) })       // 回到原尺寸
        .start();
    }
}
