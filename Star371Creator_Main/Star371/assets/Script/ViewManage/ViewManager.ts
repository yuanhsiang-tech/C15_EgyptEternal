import { game } from 'cc';
import { ViewDefine } from '../Define/ViewDefine';
import { ViewSystem } from './Foundation/ViewSystem';
import { ViewSection } from './Foundation/ViewSection';
import { MessageViewTypes, MVT } from '../Feature/MessageView/MessageViewTypes';
import { IViewEvent, ViewEvent, ViewEventNotifier } from './Foundation/ViewTypes';

export enum ViewSectionId {
    DEFER   = 0,    // 延緩顯示層級，優先級最低，轉場時會被清除
    USER    = 1,    // 玩家操作層級，優先級中等，轉場時會被清除
    DIALOG  = 2,    // 提示說明層級，優先級較高，轉場時會被清除
    ALERT   = 3     // 警告顯示層級，優先級最高，轉場時不會被清除
}

// DEFER 層級的延遲啟動顯示時間(單位：秒)
const DEFER_UI_DELAY_START_TIME:number = 0.5;

// DEFER 層級的名稱
const DEFER_LAYER_NAME:string = "DEFER_LAYER";

export class ViewManager extends ViewSystem {
    public static readonly Instance:ViewManager = new ViewManager;

    private m_deferUIDelayTime:number = 0;

    /**
     * 使用者 - 強行插入貯列式介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static InjectPush(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionInjectPush(ViewSectionId.USER, event, ...args);
    }

    /**
     * 使用者 - 貯列式開啟介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static Push(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionPush(ViewSectionId.USER, event, ...args);
    }

    /**
     * 使用者 - 堆疊式開啟介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static Open(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionOpen(ViewSectionId.USER, event, ...args);
    }

    /**
     * 系統 - 強行插入貯列式介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static InjectPushDefer(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionInjectPush(ViewSectionId.DEFER, event.SetLayer(DEFER_LAYER_NAME), ...args);
    }

    /**
     * 系統 - 貯列式開啟介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static PushDefer(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionPush(ViewSectionId.DEFER, event.SetLayer(DEFER_LAYER_NAME), ...args);
    }

    /**
     * 提示 - 強行插入貯列式介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static InjectPushDialog(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionInjectPush(ViewSectionId.DIALOG, event, ...args);
    }

    /**
     * 提示 - 貯列式開啟介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static PushDialog(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionPush(ViewSectionId.DIALOG, event, ...args);
    }

    /**
     * 提示 - 堆疊式開啟介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static OpenDialog(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionOpen(ViewSectionId.DIALOG, event, ...args);
    }

    /**
     * 提示 - 簡短版貯列式開啟介面
     * @param content 文字內容
     * 備註：與警告(Alert)的差異為，提示(Dialog)會在轉場時被清除並關閉，Alert 則會跨場景保留
     */
    public static Dialog(content:string): MessageViewTypes.Config {
        return ViewManager.HandleDialogAlert(ViewSectionId.DIALOG, ViewManager.Instance.SectionPush, content);
    }

    /**
     * 警告 - 強行插入貯列式介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static InjectPushAlert(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionInjectPush(ViewSectionId.ALERT, event, ...args);
    }

    /**
     * 警告 - 貯列式開啟介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static PushAlert(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionPush(ViewSectionId.ALERT, event, ...args);
    }

    /**
     * 警告 - 堆疊式開啟介面
     * @param event 介面事件
     * @param args 介面開啟參數
     */
    public static OpenAlert(event:IViewEvent<ViewEventNotifier>, ...args:any): boolean {
        return ViewManager.Instance.SectionOpen(ViewSectionId.ALERT, event, ...args);
    }

    /**
     * 警告 - 簡短版堆疊式開啟介面
     * @param content 文字內容
     * 備註：與警告(Alert)的差異為，提示(Dialog)會在轉場時被清除並關閉，Alert 則會跨場景保留
     */
    public static Alert(content:string): MessageViewTypes.Config {
        return ViewManager.HandleDialogAlert(ViewSectionId.ALERT, ViewManager.Instance.SectionPush, content);
    }

    /**
     * 處理提示/警告介面
     * @param handler 處理函數
     * @param content 文字內容
     */
    private static HandleDialogAlert(sectionId:number, handler:(sectionId:number, iEvent:IViewEvent<ViewEventNotifier>, ...args:any)=>boolean, content:string): MessageViewTypes.Config {
        const config:MessageViewTypes.Config = MVT.Config;
        const result:boolean = handler.call(
                                    ViewManager.Instance, 
                                    ViewSectionId.ALERT, 
                                    ViewDefine.MESSAGE.SetLayer(ViewDefine.MESSAGE.Identifier), 
                                    content, 
                                    config);
        return result ? config : null;
    }

    /**
     * 清除設定
     * 備註：轉場前應先執行此方法避免錯誤釋放
     */
    public override Clear() {
        super.Clear();
        this.m_deferUIDelayTime = 0;
    }

    /**
     * 取得當前最上層的介面
     * @param userInterfaceOnly 是否僅回傳使用者介面(跳過提示與警告)
     */
    public GetTopView(userInterfaceOnly:boolean=true): IViewEvent {
        let topView:IViewEvent;
        this.SectionIterate((viewSection:ViewSection)=>{
            const shouldCheck:boolean = !userInterfaceOnly ? true : viewSection.Id != ViewSectionId.DIALOG && viewSection.Id != ViewSectionId.ALERT;
            if (shouldCheck) {
                topView = viewSection.GetTopView();
                if (topView) {
                    return true;
                }
            }
        });
        return topView;
    }

    /**
     * 客製化清除處理
     * @param section ViewSection 對象 
     */
    protected override ClearFunc(section:ViewSection) {
        section.Id != ViewSectionId.ALERT && section.Clear();
    }

    /**
     * 介面載入失敗
     * @param section 介面所屬 ViewSection
     * @param event 介面事件
     * @param inBackground 是否為背景載入
     */
    protected override OnViewSectionLoadView(section:ViewSection, event:ViewEvent, inBackground:boolean): void|boolean {
        return super.OnViewSectionLoadView(section, event, inBackground);
    }

    /**
     * 回傳 ViewSection 是否為暫停中
     * @param section 檢查是否暫停的 ViewSection
     */
    protected override IsViewSectionPending(section:ViewSection): boolean {
        if (section.Id != ViewSectionId.DEFER) {
            this.m_deferUIDelayTime = 0;
        }

        switch (section.Id) {
            case ViewSectionId.ALERT:
                return false;
            case ViewSectionId.DIALOG:
                return false;
            case ViewSectionId.USER:
                return this.IsPaused;
            case ViewSectionId.DEFER: {
                this.m_deferUIDelayTime += game.deltaTime;
                if (!this.GetSection(ViewSectionId.USER).IsEmpty  ||
                    !this.GetSection(ViewSectionId.ALERT).IsEmpty ||
                    !this.GetSection(ViewSectionId.DIALOG).IsEmpty) {
                    this.m_deferUIDelayTime = 0;
                }
                return this.IsPaused || this.m_deferUIDelayTime < DEFER_UI_DELAY_START_TIME;
            }
        }
    }
}