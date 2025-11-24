
declare interface FileDescriptor {
    url: string;
    type: 'image'|'music'|'json';
    key: string;
    priority: number;
    retryCount: number;
    saveToLocal: boolean;
    useComp: any; // Consider specifying a more detailed type for component usage
    callBack: (error?: Error, data?: any) => void;
}

declare enum Environment {
    /** 內部環境 */
    INTERNAL,
    /** 二測環境 */
    EXTERNAL_TEST,
    /** 正式環境 */
    EXTERNAL,
    /** 送審環境 */
    APPLE_TEST,
}

declare namespace AppDefine {
    // 當前環境
    export const EnvType: Environment;
    
    // 當前版本
    export const Version: string
}

/**
 * 玩家資訊
 */
declare const UserProfile: {
    /**
     * 帳號編號
     */
    readonly AccountId: number;

    /**
     * 帳號
     */
    readonly Account: string

    /**
     * 帳號綁定資訊
     */
    readonly Binding: import("../assets/Script/Proto/service/appLife/appLife_pb").UserAccountBindingData[]

    /**
     * 暱稱
     */
    readonly NickName: string

    /**
     * 性別
     */
    readonly Sexual: number

    /**
     * 國家
     */
    readonly Country: string

    /**
     * Vip 等級
     */
    readonly Vip: number

    /**
     * 註冊區碼
     */
    readonly RegAreaCode: string

    /**
     * 歷史登入資訊
     */
    readonly HistoryLoginInfo: import("../assets/Script/Proto/service/appLife/appLife_pb").UserHistoryLoginInfo

    /**
     * 是否已通過認證
     */
    readonly IsVerified: boolean

    /**
     * 是否曾經儲值
     */
    readonly IsDeposit: boolean
}

/**
 * 介面開啟失敗原因
 */
declare enum ViewPresentFailReason {
    LOADING = 0,    // 資源載入失敗
    TIMEOUT = 1     // 介面準備逾時
}

/**
 * 介面事件
 */
declare interface IViewEvent<T extends ViewEventNotifier = ViewEventNotifier> {
    /**
     * bundle 名稱
     */
    readonly Bundle:string;
    /**
     * 唯一識別名稱
     */
    readonly Identifier:string;
    /**
     * 是否需要網路
     */
    readonly NeedNet:boolean;
    /**
     * 唯一雜湊值
     */
    readonly Hash:string;
    /**
     * 額外參數
     */
    readonly Tag:any;
    /**
     * 介面嘗試開啟次數
     */
    readonly Visists:number;
    /**
     * 介面成功開啟次數
     */
    readonly DidVisists:number;
    /**
     * 是否隱藏預設的載入提示
     */
    readonly SilentLoading:boolean;
    /**
     * 是否使用多點觸控
     */
    readonly MultiTouch:boolean;

    /**
     * 指定於特定的圖層中開啟
     * @param name 圖層名稱
     * 備註：這是執行期間動態指定使用
     */
    SetLayer(name:string): IViewEvent<T>;

    /**
     * 設定狀態轉換通知對象
     * @param notifier 通知對象
     * 備註：這是執行期間動態指定使用
     */
    SetNotifier(notifier:Partial<T>): IViewEvent<T>;
}

/**
 * 被觀察的介面狀態通知事件
 */
declare interface ViewEventNotifier {
    /**
     * 介面完成開啟顯示
     * @param event 介面事件
     * 備註：這裡表示介面顯示於場上且正確開啟完成
     */
    OnViewPresent(event:IViewEvent):void;
    /**
     * 介面顯示失敗
     * @param event 介面事件
     * @param reason 失敗原因
     * @param error 錯誤訊息
     * 備註：error 物件只有當 reason 是 LOADING 時才會有值
     */
    OnViewPresentFail(event:IViewEvent, reason:ViewPresentFailReason, error?:Error):void;
    /**
     * 介面確認關閉
     * @param event 介面事件
     */
    OnViewDismiss(event:IViewEvent):void;
}

////////////////////////////////////////////////////////////////////////////////
// Module: ...( another module )
////////////////////////////////////////////////////////////////////////////////
