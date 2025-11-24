所有的生命週期function不用宣告public、private、protect
把所有的成員變量改為以下規範 1.使用`m_` 前綴 2.前綴後使用 camelCase
console.log跟dump換成log並新增import {log} from from 'cc';
cc.UserDefault:getInstance():set改為Persist.App.Set
sys.localStorage.setItem改為Persist.App.Set
cc.UserDefault:getInstance():get改為Persist.App.Get
sys.localStorage.getItem改為Persist.App.Get
Persist.App有用到的話import { Persist } from 'db://assets/Script/Persist/Persist';
DEVICE_SIZE改為Define.DesignSize.REGULAR並新增import { Define } from 'db://assets/Script/Define/GeneralDefine';
event相關function改為GlobalFunc.DispatchEvent、GlobalFunc.AddCustomEventListener、GlobalFunc.RemoveCustomEventListener，並新增import { GlobalFunc } from 'db://assets/Games/StarMJ/Script/GlobalFunc';
MsgBoxMgr.GetInstance:RequestMsgBox改為ViewManager.Alert並新增import { ViewManager } from 'db://assets/Script/ViewManage/ViewManager';
LoadingView:Loading()改為LoadingView.Instance.Loading()並新增import { LoadingView } from 'db://assets/Modules/Loading/Script/LoadingView';
LoadingView:AlphaLoading()改為AlphaLoading.Instance.Show()並新增import { LoadingView } from 'db://assets/Modules/Loading/Script/LoadingView';
