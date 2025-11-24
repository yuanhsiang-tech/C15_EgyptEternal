import { ViewDefine } from "../../Script/Define/ViewDefine";
import { BundleDefine } from "../../Script/Define/BundleDefine";
import { ViewElement } from "../../Script/ViewManage/Foundation/ViewTypes";



/**
 * 請勿將變數寫出此 function 外，避免全域同名變數衝突
 */
((name=BundleDefine.Module.MORE_SETTING)=>{
    const VIEW_MAP:Map<IViewEvent, ViewElement> = new Map();

    
    {
        // 在這裡定義介面事件對應的 ViewElement，範例如下：
        // VIEW_MAP.set(ViewDefine.PERSONAL_PROFILE, new ViewElement("Prefab/profile_panel_pop"));
        VIEW_MAP.set(ViewDefine.MORE_SETTING, new ViewElement("Prefab/MoreSettingView"));
    }


    if (typeof name != "string" || name.length <= 0) { throw new Error("===== Bundle 註冊失敗 ====="); }
    else window[name] = ()=>(event:IViewEvent)=>VIEW_MAP.get(event);
})();