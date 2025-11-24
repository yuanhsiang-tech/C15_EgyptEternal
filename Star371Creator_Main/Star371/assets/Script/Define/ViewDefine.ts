import { EDITOR } from "cc/env"
import { IViewEvent, ViewConfig, ViewElement, ViewGenericElement } from "../ViewManage/Foundation/ViewTypes"
import { BundleDefine as BD } from "./BundleDefine"
import { MechanismType as MT } from "./MechanismDefine"

const BDM = BD.Module

// Tab 介面
export namespace ViewDefine {
    export const TAB_VIEW_STORE_EXCHANGE_STAR_WELFARE: IViewEvent = ViewConfig.CreateBuild()
}

/**
 * 定義介面事件
 */
export namespace ViewDefine {
    // 訊息窗
    export const MESSAGE: IViewEvent = ViewConfig.CreateBuild()
    // Webview  
    export const WEBVIEW: IViewEvent = ViewConfig.Create().Dispose().Build()
    // 明星舞台 
    export const STAR_STAGE: IViewEvent = ViewConfig.CreateBuild(BDM.STAR_STAGE)
    // 明星動作預覽 
    export const STAR_ACTION_PREVIEW: IViewEvent = ViewConfig.CreateBuild(BDM.STAR_STAGE)
    // 免費機制 
    export const FREE_MECHANISM: IViewEvent = ViewConfig.CreateBuild(BDM.FREE_MECHANISM, MT.FREE_BONUS)
    // 神送寶 
    export const GOD_SEND: IViewEvent = ViewConfig.CreateBuild(BDM.GOD_SEND, MT.BATTLE_PASS)
    // 更多設定
    export const MORE_SETTING: IViewEvent = ViewConfig.CreateBuild(BDM.MORE_SETTING)
    // 週一狂歡
    export const MONDAY_ORGY: IViewEvent = ViewConfig.CreateBuild(BDM.MONDAY_ORGY)
    // 黃金豬
    export const GOLDEN_PIG: IViewEvent = ViewConfig.CreateBuild(BDM.FREE_MECHANISM)
    // 開獎視窗
    export const OPEN_PRIZE: IViewEvent = ViewConfig.CreateBuild(BDM.OPEN_PRIZE)
}

/**
 * bundle resources 的 ViewElement 定義
 */
export const ResourcesViewElements: Map<IViewEvent, ViewElement> = new Map([
    [ViewDefine.MESSAGE, new ViewGenericElement("Prefab/View/MessageView")],
    [ViewDefine.WEBVIEW, new ViewGenericElement("Prefab/View/Webview")],
]);

// 頁籤介面設定
function RegisterTabBarView(viewEvent: IViewEvent, ...tabs: IViewEvent[]): void {
    ResourcesViewElements.set(viewEvent, new ViewGenericElement("Prefab/View/ViewTabBar").BindLaunchArgs(tabs))
}
RegisterTabBarView(ViewDefine.TAB_VIEW_STORE_EXCHANGE_STAR_WELFARE, ViewDefine.STAR_STAGE)













































































/**
 * 自動補上 Identifier
 */
!EDITOR && Object.keys(ViewDefine).forEach((key) => {
    const view: IViewEvent = ViewDefine[key];
    (view as any).m_config.Identifier = key;
});