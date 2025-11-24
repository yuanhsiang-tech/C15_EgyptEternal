import { JSB } from "cc/env";
import { js, log, warn } from "cc";
import * as Currency from "../Proto/gt2/currency/currency_pb";
import { Type as LogCoinType } from "../Proto/gt2/lct/lct_pb";
import { CurrencyNotif_Change } from "../Proto/service/statement/statement_pb";

// 數字 0
const ZERO = 0;

// Log 紀錄最大上限檢查次數
const MAX_LOG_CHECK_COUNT = 10;

// 最大成功匹配的金流變動紀錄保留筆數
const MAX_MATCH_LOG_COUNT = MAX_LOG_CHECK_COUNT * 3;

function IsValid(value:any): boolean {
    return value !== null && value !== undefined;
}

function TimeNow(): string {
    let time = new Date().toTimeString()
    return time.substring(0, time.indexOf(" "));
}

function StackFormat(stack:string): string {
    return stack ? stack.replace("Error", "Stack") : stack;
}

function NumberGroup(value/*number|string|BigNumber*/) {
    let tmpValue = value;
    if (typeof(tmpValue) == "string") {
        tmpValue = new BigNumber(tmpValue);
    }

    if (typeof(tmpValue) == "number") {
        return tmpValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } else if (tmpValue instanceof BigNumber) {
        return tmpValue.toFormat();
    }
    return "";
};

const SERVER_DIV_ID = "ServerCurrency"
let DivServerCurrency = null;

function InitWidget() {
    if (!JSB && !document.getElementById(SERVER_DIV_ID)) {
        let body = document.getElementById("_left_");
        DivServerCurrency = document.createElement("div");
        DivServerCurrency.id = SERVER_DIV_ID;
        DivServerCurrency.setAttribute("style", "color:red;text-align:left;");
        body.appendChild(DivServerCurrency);
    }
}

export class CurrencyFlowLog {
    ByRevert:boolean;               // 是否為退還
    Reason:string;                  // 變動原因
    ValueBeforeChange:BigNumber;    // 變動前的值
    ChangeValue:BigNumber;          // 變動差值
    Value:BigNumber;                // 變動後的值
    RequestTime:string;             // 請求變動的時間
    ReasonE:LogCoinType;            // 變動原因(純 enum 型別)
    Stack?:string;                  // 變動的呼叫堆疊
    Count:number;                   // 檢查次數
    Option?:any;                    // 額外可選參數

    constructor(byRevert:boolean, reason:LogCoinType, valueBeforeChange:BigNumber|string|number, changeValue:BigNumber|string|number, value:BigNumber|number|string, stack:string=null, option?:any) {
        this.ByRevert = byRevert;
        this.Reason = LogCoinType[reason]+"("+reason+")";
        this.ReasonE = reason;
        this.ValueBeforeChange = new BigNumber(valueBeforeChange);
        this.ChangeValue = new BigNumber(changeValue);
        this.Value = new BigNumber(value);
        this.Stack = StackFormat(stack);
        this.RequestTime = TimeNow();
        this.Count = 0;
        this.Option = option;
    }
}

class CurrencyRevertLog {
    RevertLog:CurrencyFlowLog;      // 退還的變動紀錄
    ValueBeforeChange:BigNumber;    // 變動前的值
    ChangeValue:BigNumber;          // 變動差值
    Value:BigNumber;                // 變動後的值
    RevertTime:string;              // 退還的時間
    Stack?:string;                  // 變動的呼叫堆疊

    constructor(revertLog:CurrencyFlowLog, valueBeforeChange:BigNumber|string|number, changeValue:BigNumber|string|number, value:BigNumber|number|string, stack:string=null) {
        this.RevertLog = revertLog;
        this.ValueBeforeChange = new BigNumber(valueBeforeChange);
        this.ChangeValue = new BigNumber(changeValue);
        this.Value = new BigNumber(value);
        this.Stack = StackFormat(stack);
        this.RevertTime = TimeNow();
    }
}

class CurrencyBundle {
    CurrentValue:BigNumber;
    SumPositive:BigNumber;
    ChangeLog:CurrencyFlowLog[];
    RevertLog:CurrencyRevertLog[];

    constructor() {
        this.CurrentValue = new BigNumber(ZERO);
        this.SumPositive = new BigNumber(ZERO);
        this.ChangeLog = [];
        this.RevertLog = [];
    }

    /**
     * 試著加上一筆正值的數值
     * @param value 試著加上得數值
     */
    public TrySumPositive(value:BigNumber) {
        if (value.isPositive()) {
            this.SumPositive = this.SumPositive.plus(value);
        }
    }

    /**
     * 增加一筆紀錄
     * @param log 變動紀錄
     */
    public AddLog(log:CurrencyFlowLog) {
        this.ChangeLog.push(log);
    }

    /**
     * 取得最後一筆變動紀錄
     */
    public LastLog(): CurrencyFlowLog {
        return this.ChangeLog.length > 0 ? this.ChangeLog[this.ChangeLog.length-1] : null;
    }
}

class CurrencyMatchLog {
    Server:CurrencyFlowLog|CurrencyFlowLog[];
    Client:CurrencyFlowLog|CurrencyFlowLog[];
    FromClient:boolean;
    constructor(client:CurrencyFlowLog|CurrencyFlowLog[], server:CurrencyFlowLog|CurrencyFlowLog[], fromClient:boolean) {
        this.Client = client;
        this.Server = server;
        this.FromClient = fromClient;
    }
}

export interface CurrencyFlowDelegate {
    CurrencyFlowNotifyNegative(reason:LogCoinType, type:Currency.Type, changeValue:BigNumber);
    OnCurrencyFlowing(reason:LogCoinType, type:Currency.Type, fromValue:BigNumber, toValue:BigNumber, changeValue:BigNumber, isSafe:boolean, option?:any);
    OnCurrencyFlowSyncCheckFail(type:Currency.Type, clientChangeLogList:CurrencyFlowLog[], serverChangeLogList:CurrencyFlowLog[]);
    CurrencyFlowCheckLogOverCount(log:CurrencyFlowLog);
}

export interface CurrencyFlowSecurityDelegate {    
    ShouldLogCurrencyFlowStack():boolean;
    UnsafeCurrencyFlowUpdate(type:Currency.Type):boolean;
    CurrencyFlowLogMaxCheckCount():number;
    CurrencyFlowMatchLogMaxCount():number;
    ShouldSyncCurrencyOnServerChanged(type:Currency.Type):boolean;
}

export default class CurrencyFlow {
    private m_screenLog:boolean = true;
    get ScreenLog(): boolean {
        return this.m_screenLog;
    }
    set ScreenLog(value:boolean) {
        this.m_screenLog = value;
        if (!JSB && DivServerCurrency) {
            if (value == true) {
                DivServerCurrency.removeAttribute("hidden");
            } else {
                DivServerCurrency.setAttribute("hidden", true);
            }
        }
    }

    private m_delegate:Partial<CurrencyFlowDelegate>;
    private m_securityDelegate:Partial<CurrencyFlowSecurityDelegate>;

    private m_clientCurrencyMap:Map<Currency.Type,CurrencyBundle> = null;
    private m_serverCurrencyMap:Map<Currency.Type,CurrencyBundle> = null;
    private m_matchLog:Map<Currency.Type, CurrencyMatchLog[]> = null;

    get Delegate(): Partial<CurrencyFlowDelegate> {
        return this.m_delegate;
    }
    set Delegate(value:Partial<CurrencyFlowDelegate>) {
        this.m_delegate = value;
    }

    get SecurityDelegate(): Partial<CurrencyFlowSecurityDelegate> {
        return this.m_securityDelegate;
    }
    set SecurityDelegate(value:Partial<CurrencyFlowSecurityDelegate>) {
        this.m_securityDelegate = value;
    }

    constructor() {
        this.m_clientCurrencyMap = new Map();
        this.m_serverCurrencyMap = new Map();
        this.m_matchLog = new Map();
    }

    /**
     * 請求財產變動
     * @param reason 變動原因
     * @param changeValue 變動差值
     * @param currencyType 幣別
     */
    public ChangeRequest(reason:LogCoinType, currencyType:Currency.Type, changeValue:BigNumber, option?:any): boolean {
        return this.ProcessRequest(false, reason, changeValue, currencyType, option);
    }

    /**
     * 請求退還最後一筆符合條件的財產變動
     * @param reason 當時請求變動的原因
     * @param currencyType 當時請求變動的幣別
     * @param changeValue 當時請求變動的差值(非必要，若有值則納入比對的條件中)
     */
    public RevertRequest(reason:LogCoinType, currencyType:Currency.Type, changeValue?:BigNumber): boolean {
        let isSuccess = false;

        if (!IsValid(reason)) {
            warn("CurrencyFlow RevertRequest fail: Can't revert without reason.", reason, currencyType);
        } else if (!IsValid(currencyType)) {
            warn("CurrencyFlow RevertRequest fail: Can't revert without specific currencyType.", reason, currencyType);
        } else if (currencyType == Currency.Type.INVALID) {
            warn("CurrencyFlow RevertRequest fail: Can't revert with invalid currencyType.", reason, currencyType);
        } else {
            let clientCurrencyBundle:CurrencyBundle = this.m_clientCurrencyMap.get(currencyType);

            if (IsValid(clientCurrencyBundle)) {
                let valueBeforeChange:BigNumber = new BigNumber(clientCurrencyBundle.CurrentValue);
                let stack:string = this.ShouldLogStack() ? new Error().stack : "";
                let targetChangeLog:CurrencyFlowLog;
                let removeIndex:number = null;

                for (let i = clientCurrencyBundle.ChangeLog.length - 1; i >= 0; i--) {
                    let eachChangeLog:CurrencyFlowLog = clientCurrencyBundle.ChangeLog[i];
                    if (eachChangeLog.ReasonE == reason && (!changeValue || changeValue.eq(eachChangeLog.ChangeValue))) {
                        // [找到符合條件的變動紀錄]
                        targetChangeLog = eachChangeLog;
                        removeIndex = i;
                        break;
                    }
                }

                if (targetChangeLog) {
                    // [確認找到符合條件的變動紀錄]

                    // 檢查是否有指定當時變動的差值
                    if (!IsValid(changeValue)) {
                        // [未指定當時變動的差值] => 改使用變動紀錄裡的差值
                        changeValue = targetChangeLog.ChangeValue;
                    }

                    // 將變動差值反向
                    changeValue = changeValue.negated();

                    // 處理財產變動
                    if (this.ProcessRequest(true, reason, changeValue, currencyType)) {
                        // [財產變動成功]
                        js.array.removeAt(clientCurrencyBundle.ChangeLog, removeIndex);

                        // 紀錄退還的變動紀錄
                        clientCurrencyBundle.RevertLog.push(
                            new CurrencyRevertLog(
                                targetChangeLog,
                                valueBeforeChange,
                                changeValue,
                                clientCurrencyBundle.CurrentValue,
                                stack
                            ));

                        isSuccess = true;
                    }
                }
            }
        }

        return isSuccess;
    }

    /**
     * Server 來的財產變動通知
     * @param reason 變動原因
     * @param changeValue 變動差值
     * @param valueAfterChanged 變動後的總值
     * @param currencyType 幣別
     */
    public OnMoneyChange(notifyList:CurrencyNotif_Change[]) {
        for (let eachChange of notifyList) {
            let changeValue = new BigNumber(eachChange.diff);
            if (!changeValue.eq(ZERO)) {
                let reason:LogCoinType = eachChange.reason; 
                let currencyType = eachChange.balance.type;
                let valueAfterChanged = new BigNumber(eachChange.balance.amount);
                let shouldSyncOnChanged:boolean = this.ShouldSyncOnServerCurrencyChanged(currencyType);
                let serverCurrencyBundle:CurrencyBundle = this.m_serverCurrencyMap.get(currencyType) || new CurrencyBundle();
                let valueBeforeChanged:BigNumber = new BigNumber(serverCurrencyBundle.CurrentValue);
                serverCurrencyBundle.CurrentValue = new BigNumber(valueAfterChanged);
                serverCurrencyBundle.TrySumPositive(changeValue);
                let serverCurrencyFlowLog:CurrencyFlowLog = new CurrencyFlowLog(
                                                                false,
                                                                reason, 
                                                                valueBeforeChanged, 
                                                                changeValue, 
                                                                valueAfterChanged);

                if (shouldSyncOnChanged) {
                    this.SyncCurrency(true, currencyType);
                } else {
                    let matchClientLog:CurrencyFlowLog|CurrencyFlowLog[] = this.LateChangeRequest(reason, changeValue, currencyType);
                    if (matchClientLog != null) {
                        this.ConnectChangeLog(currencyType, matchClientLog, serverCurrencyFlowLog, false);
                    } else {
                        serverCurrencyBundle.AddLog(serverCurrencyFlowLog);
                        this.m_serverCurrencyMap.set(currencyType, serverCurrencyBundle);
                    }
                }
            }
        }
        this.ScreenLogUpdate();
    }

    /**
     * 強制同步財產成 Server 的值
     * @param force 是否強制
     * @param currencyType 幣別
     */
    public ForceSync(force:boolean=true, currencyType:Currency.Type=null) {
        let didSync:boolean = false;

        if (IsValid(currencyType)) {
            // [指定特定幣別強制更新]
            didSync = this.SyncCurrency(force, currencyType);
        } else {
            // [未指定特定幣別強制更新] => 同步所有幣別
            for (let currencyType of this.m_serverCurrencyMap.keys()) {
                let isSync = this.SyncCurrency(force, currencyType);
                didSync = didSync && isSync;
            }
        }

        return didSync;
    }
    
    /**
     * 同步檢查
     * @param currencyType 幣別
     */
    public SyncCheck(currencyType:Currency.Type=null): boolean {
        let isSame:boolean = false;
        
        if (IsValid(currencyType)) {
            isSame = this.CheckCurrency(currencyType);
        } else {
            // [未指定特定幣別強制更新] => 同步所有幣別
            for (let currencyType of this.m_clientCurrencyMap.keys()) {
                let result = this.CheckCurrency(currencyType);
                isSame = isSame && result;
            }
        }

        return isSame;
    }

    /**
     * 直接設定 Server 給的財產值
     * @param currencyList 幣別列表
     */
    public SetServerCurrency(currencyList: Currency.Balance[]) {
        InitWidget();
        for (let eachCurrency of currencyList) {
            let currencyType = eachCurrency.type;
            let valueAfterChanged = eachCurrency.amount;
            let serverCurrencyBundle:CurrencyBundle = new CurrencyBundle();
            serverCurrencyBundle.CurrentValue = new BigNumber(valueAfterChanged);
            this.m_serverCurrencyMap.set(currencyType, serverCurrencyBundle);
        }
        this.ScreenLogUpdate();
    }

    /**
     * 取得財產
     * @param currencyType 幣別
     * @param realValue 是否取出真正的值，預設取回顯示用的值(必定大於等於0)
     */
    public GetCurrency(currencyType:Currency.Type, realValue:boolean=false): BigNumber {
        let clientCurrencyBundle:CurrencyBundle = this.m_clientCurrencyMap.get(currencyType) || new CurrencyBundle();
        return new BigNumber((realValue == false && clientCurrencyBundle.CurrentValue.isNegative()) ? ZERO : clientCurrencyBundle.CurrentValue);
    }

    /**
     * 取得 Server 財產
     * @param currencyType 幣別
     */
    public ServerCurrency(currencyType:Currency.Type): BigNumber {
        let serverCurrencyBundle:CurrencyBundle = this.m_serverCurrencyMap.get(currencyType) || new CurrencyBundle();
        return new BigNumber(serverCurrencyBundle.CurrentValue);
    }

    /**
     * 傾印變動紀錄
     * currencyType 指定幣別
     */
    public Dump(currencyType?:Currency.Type) {
        if (IsValid(currencyType)) {
            // [指定特定幣別]
            this.DumpLog(currencyType);
        } else {
            // [未指定特定幣別]
            for (let currencyType of this.m_clientCurrencyMap.keys()) {
                this.DumpLog(currencyType);
            }
        }
    }

    private ProcessRequest(revert:boolean, reason:LogCoinType, changeValue:BigNumber, currencyType:Currency.Type, option?:any) {
        changeValue = new BigNumber(changeValue);

        let isSuccess = false;
        let shouldSyncOnChanged:boolean = this.ShouldSyncOnServerCurrencyChanged(currencyType);

        if (!IsValid(reason)) {
            warn("CurrencyFlow ChangeRequest fail: Can't change value without reason.", reason, changeValue, currencyType);
        } else if (!IsValid(changeValue)) {
            warn("CurrencyFlow ChangeRequest fail: Can't change value without changeValue.", reason, changeValue, currencyType);
        } else if (changeValue.isNaN()) {
            warn("CurrencyFlow ChangeRequest fail: Can't change value with NaN type.", reason, changeValue, currencyType);
        } else if (!IsValid(currencyType)) {
            warn("CurrencyFlow ChangeRequest fail: Can't change value without specific currencyType.", reason, changeValue, currencyType);
        } else if (currencyType == Currency.Type.INVALID) {
            warn("CurrencyFlow ChangeRequest fail: Can't change value with invalid currencyType.", reason, changeValue, currencyType);
        } else if (changeValue.eq(ZERO)) {
            // [更新 0 變化] => 不處理
        } else if (shouldSyncOnChanged) {
            // [開啟 Server 變動就同步的旗標] => 不處理，直接等 Server 通知
        } else {
            let update = false;
            let writeLog = false;
            let permit = true;
            let safe = true;
            let isSafeUpdate = this.IsSafeUpdate(currencyType);
            let clientCurrencyBundle:CurrencyBundle = this.m_clientCurrencyMap.get(currencyType) || new CurrencyBundle();
            let serverCurrencyBundle:CurrencyBundle = this.m_serverCurrencyMap.get(currencyType) || new CurrencyBundle();
            let stack:string = this.ShouldLogStack() ? new Error().stack : "";
            let tmpValueAfterChanged = clientCurrencyBundle.CurrentValue.plus(changeValue);
            let tmpSumPositive = clientCurrencyBundle.SumPositive.plus(changeValue);
            let valueBeforeChange:BigNumber = new BigNumber(clientCurrencyBundle.CurrentValue);
            let matchServerLog:CurrencyFlowLog|CurrencyFlowLog[];

            if (revert) {
                // [退還變動]
                update = true;
            } else if (changeValue.isPositive()) {
                // [加錢]
                if (!isSafeUpdate) {
                    // [非安全型加錢] => 直接允許更新但仍需寫紀錄
                    matchServerLog = this.FindMatchChangeLog(currencyType, serverCurrencyBundle.ChangeLog, reason, changeValue);
                    update = true;
                    writeLog = !IsValid(matchServerLog);
                } else if (tmpSumPositive.gt(serverCurrencyBundle.SumPositive)) {
                    // [安全型加錢，但加錢後會超過 server 的值] => 延後檢查處理
                    writeLog = true;
                    update = false;
                } else {
                    matchServerLog = this.FindMatchChangeLog(currencyType, serverCurrencyBundle.ChangeLog, reason, changeValue);

                    if (IsValid(matchServerLog)) {
                        // [安全型加錢，而且有找到配對]
                        writeLog = false;
                        update = true;
                    } else {
                        // [安全型加錢，但沒找到配對]
                        writeLog = true;
                        update = false;
                    }
                }

                safe = isSafeUpdate;
            } else {
                // [扣錢]
                if (tmpValueAfterChanged.isNegative() && isSafeUpdate == true) {
                    // [扣錢，但扣完後會小於 0] => 通知警示
                    writeLog = false;
                    permit = false;
                    warn("CurrencyFlow ChangeRequest fail: got negative property", LogCoinType[reason], currencyType, changeValue.toString());
                    this.m_delegate && typeof this.m_delegate.CurrencyFlowNotifyNegative == "function" && this.m_delegate.CurrencyFlowNotifyNegative(reason, currencyType, new BigNumber(changeValue));
                } else {
                    // [扣錢，扣完後仍介於正常範圍]

                    // 扣錢是即時性的，不管有沒有拿到 server 的變動都需要立即更新
                    update = true;

                    matchServerLog = this.FindMatchChangeLog(currencyType, serverCurrencyBundle.ChangeLog, reason, changeValue) as CurrencyFlowLog;
                    if (!IsValid(matchServerLog)) {
                        // [找不到匹配的紀錄] => 仍可更新顯示，但後續追蹤核銷
                        writeLog = true;
                        safe = false;
                    } else {
                        // [找到匹配的紀錄] => 不寫紀錄
                        writeLog = false;
                        safe = true;
                    }
                }
            }

            // 檢查是否是核可的操作
            if (permit) {
                // [核可的操作]

                // 檢查是否可以更新
                if (update) {
                    // [可以更新]
                    clientCurrencyBundle.CurrentValue = clientCurrencyBundle.CurrentValue.plus(changeValue);
                    clientCurrencyBundle.TrySumPositive(changeValue);
                    this.CurrencyFlowing(reason, currencyType, valueBeforeChange, clientCurrencyBundle.CurrentValue, changeValue, safe, [option]);
                }

                // 檢查是否有要寫紀錄或有成功匹配 server 變動紀錄
                if (writeLog || matchServerLog || revert) {
                    // client 變動紀錄
                    let clientCurrencyFlowLog = new CurrencyFlowLog(
                                                    revert,
                                                    reason,
                                                    valueBeforeChange,
                                                    changeValue,
                                                    clientCurrencyBundle.CurrentValue,
                                                    stack,
                                                    option
                                                )

                    // 檢查是否有要寫紀錄
                    if (writeLog) {
                        // [有要寫紀錄]
                        clientCurrencyBundle.AddLog(clientCurrencyFlowLog);
                    }

                    // 檢查是否有找到匹配的 Server 紀錄
                    if (matchServerLog || revert) {
                        // [有找到匹配 Server 的紀錄]
                        this.ConnectChangeLog(currencyType, clientCurrencyFlowLog, matchServerLog, true);
                    }
                }

                // 更新紀錄
                this.m_clientCurrencyMap.set(currencyType, clientCurrencyBundle);

                isSuccess = true;
            }
        }

        return isSuccess;
    }

    /**
     * 延遲的財產變動
     * @param currencyType 變動備忘錄
     */
    private LateChangeRequest(reason:LogCoinType, changeValue:BigNumber, currencyType:Currency.Type): CurrencyFlowLog|CurrencyFlowLog[] {
        let isSafeUpdate:boolean = this.IsSafeUpdate(currencyType);
        let clientCurrencyBundle:CurrencyBundle = this.m_clientCurrencyMap.get(currencyType);
        let matchClientLog:CurrencyFlowLog|CurrencyFlowLog[] = null;

        if (IsValid(clientCurrencyBundle)) {
            matchClientLog = this.FindMatchChangeLog(currencyType, clientCurrencyBundle.ChangeLog, reason, changeValue);
            if (matchClientLog) {
                // 檢查是否是加錢
                if (isSafeUpdate && changeValue.isPositive()) {
                    // [加錢]
                    // 1. 非安全型的加錢早在 client 發請求更新的時候就已經加上，所以也不需要處理
                    // 2. 只有加錢需要在核銷的時候把錢加上，扣錢不需要處理
                    let valueBeforeChange:BigNumber = new BigNumber(clientCurrencyBundle.CurrentValue);
                    let options = [];
                    if (Array.isArray(matchClientLog)) {
                        for (let log of matchClientLog) {
                            IsValid(log.Option) && options.push(log.Option);
                        }
                    } else {
                        IsValid(matchClientLog.Option) && options.push(matchClientLog.Option);
                    }
                    clientCurrencyBundle.CurrentValue = clientCurrencyBundle.CurrentValue.plus(changeValue);
                    this.CurrencyFlowing(reason, currencyType, valueBeforeChange, clientCurrencyBundle.CurrentValue, changeValue, true, options);
                }

                clientCurrencyBundle.TrySumPositive(changeValue);
            }
        }

        return matchClientLog;
    }

    /**
     * 強制同步財產成 Server 的值
     * @param force 是否強制
     * @param currencyType 幣別
     * 注意：強制模式會清除等待中的更新項目並強制更新成 Server 的值；
     * 　　　非強制模式則會先檢查是否有等待中的更新項目，若有等待中的更新項目則停止強制更新，若沒有等待中的更新項目則強制同步成 Server 的值
     */
    private SyncCurrency(force:boolean, currencyType:Currency.Type) {
        let shouldSync:boolean = false;
        let serverCurrencyBundle:CurrencyBundle = this.m_serverCurrencyMap.get(currencyType) || new CurrencyBundle();
        let clientCurrencyBundle:CurrencyBundle = this.m_clientCurrencyMap.get(currencyType) || new CurrencyBundle();

        if (force) {
            shouldSync = true;
        } else {
            shouldSync = !(serverCurrencyBundle.ChangeLog.length > 0 || clientCurrencyBundle.ChangeLog.length > 0);
        }

        if (shouldSync) {
            let valueBeforeChange:BigNumber = clientCurrencyBundle.CurrentValue;
            let changeValue:BigNumber = serverCurrencyBundle.CurrentValue.minus(valueBeforeChange);

            serverCurrencyBundle.ChangeLog = [];
            serverCurrencyBundle.SumPositive = new BigNumber(ZERO);

            clientCurrencyBundle = new CurrencyBundle();
            clientCurrencyBundle.CurrentValue = new BigNumber(serverCurrencyBundle.CurrentValue);

            this.m_serverCurrencyMap.set(currencyType, serverCurrencyBundle);
            this.m_clientCurrencyMap.set(currencyType, clientCurrencyBundle);
            this.m_matchLog.set(currencyType, []);

            // ＊＊＊＊＊ 利用 TYPE_UNKNOWN 當作強制同步 ＊＊＊＊＊
            this.CurrencyFlowing(LogCoinType.TYPE_UNKNOWN, currencyType, valueBeforeChange, clientCurrencyBundle.CurrentValue, changeValue, true);
        }

        return shouldSync;
    }

    /**
     * 同步檢查
     * @param currencyType 幣別
     * 注意：嚴格檢查是 Client 和 Server 必須完全相等；非嚴格檢查是 Server >= Client 也算正常
     */
    private CheckCurrency(currencyType:Currency.Type): boolean {
        let serverCurrencyBundle:CurrencyBundle = this.m_serverCurrencyMap.get(currencyType) || new CurrencyBundle();
        let clientCurrencyBundle:CurrencyBundle = this.m_clientCurrencyMap.get(currencyType) || new CurrencyBundle();
        let isSame:boolean = clientCurrencyBundle.CurrentValue.eq(serverCurrencyBundle.CurrentValue);

        if (!isSame) {
            // [本地金流和 Server 有差]
            warn("CurrencyFlow CheckCurrency CurrencyType "+Currency.Type[currencyType]+" fail warning!!!!! Value not match");
            warn("ClientChangeLog", clientCurrencyBundle.ChangeLog);
            warn("ServerChangeLog", serverCurrencyBundle.ChangeLog);
            this.m_delegate && typeof(this.m_delegate.OnCurrencyFlowSyncCheckFail)=="function" && this.m_delegate.OnCurrencyFlowSyncCheckFail(currencyType, clientCurrencyBundle.ChangeLog, serverCurrencyBundle.ChangeLog);
        }

        return isSame;
    }

    /**
     * 是否要記錄堆疊資訊
     */
    private ShouldLogStack(): boolean {
        let shouldLog:boolean = false;

        if (this.m_securityDelegate && typeof(this.m_securityDelegate.ShouldLogCurrencyFlowStack) == "function") {
            shouldLog = !!this.m_securityDelegate.ShouldLogCurrencyFlowStack();
        }

        return shouldLog;
    }

    /**
     * 傾印變動紀錄(內部使用)
     * currencyType 指定幣別
     */
    private DumpLog(currencyType:Currency.Type) {
        let clientCurrencyBundle:CurrencyBundle = this.m_clientCurrencyMap.get(currencyType);
        let serverCurrencyBundle:CurrencyBundle = this.m_serverCurrencyMap.get(currencyType);
        if (clientCurrencyBundle && serverCurrencyBundle) {
            log("[CurrencyUpdate] Client:", clientCurrencyBundle.ChangeLog);
            clientCurrencyBundle.ChangeLog.forEach((c)=>{
                warn(`[CurrencyUpdate]: ${c.ChangeValue.toNumber()}, ${c.Value.toNumber()}, ${c.Stack}`)
            })
            warn("[CurrencyUpdate] Server:", serverCurrencyBundle.ChangeLog);
            serverCurrencyBundle.ChangeLog.forEach((c)=>{
                warn(`[CurrencyUpdate]: ${c.ChangeValue.toNumber()}, ${c.Value.toNumber()}, ${c.Stack}`)
            })
        }
    }

    /**
     * 從 Server 變動紀錄中找出符合的變動項目序號
     * @param currencyType 幣別
     * @param changeLogList 要比對的紀錄列表
     * @param reason 變動原因
     * @param changeValue 變動差值
     */
    private FindMatchChangeLog(currencyType:Currency.Type, changeLogList:CurrencyFlowLog[], reason:LogCoinType, changeValue:BigNumber):CurrencyFlowLog|CurrencyFlowLog[] {
        let matchChangeLog:CurrencyFlowLog|CurrencyFlowLog[] = null;

        if (changeLogList) {
            let isSafeUpdate = this.IsSafeUpdate(currencyType);
            let removeIndice:number[] = [];
            let sum:BigNumber = new BigNumber(ZERO);
            let tmpMatchChangeLog:CurrencyFlowLog[] = [];
            let tmpRemoveIndice = [];
            let tmpOfHalt = false;

            for (let i = 0; i < changeLogList.length; i++) {
                let eachChangeLog:CurrencyFlowLog = changeLogList[i];
                
                // 檢查是否是相同變動原因
                if (eachChangeLog.ReasonE == reason) {
                    // [相同變動原因]

                    // 增加該紀錄的檢查次數
                    eachChangeLog.Count++;

                    // 檢查是暫停累加紀錄
                    if (!tmpOfHalt) {
                        // [要累加紀錄]
                        sum = sum.plus(eachChangeLog.ChangeValue);
                        tmpRemoveIndice.push(i);
                        tmpMatchChangeLog.push(eachChangeLog);
                    }

                    // 檢查單筆紀錄是否有符合目標項目
                    if (eachChangeLog.ChangeValue.eq(changeValue)) {
                        // [單筆紀錄剛好符合目標項目] => 中斷查找
                        matchChangeLog = eachChangeLog;
                        removeIndice.push(i);
                        break;    
                    }

                    // 檢查累加到目前為止是否剛好等於目標項目
                    if (!tmpOfHalt && sum.eq(changeValue)) {
                        // [多筆紀錄累加剛好符合目標項目] => 還不能立即中斷，須等到整個列表巡查一遍後若沒有符合的單筆項目才能使用累加的紀錄來核銷
                        tmpOfHalt = true;
                    }
                }

                if (isSafeUpdate) {
                    let maxCount = MAX_LOG_CHECK_COUNT;
                    if (this.m_securityDelegate && typeof this.m_securityDelegate.CurrencyFlowLogMaxCheckCount == "function") {
                        maxCount = this.m_securityDelegate.CurrencyFlowLogMaxCheckCount() || MAX_LOG_CHECK_COUNT;
                    }
                    if (maxCount > 0 && eachChangeLog.Count >= maxCount) {
                        warn("CurrencyFlow FindMatchChangeLog: " + LogCoinType[reason] + " Log reaches max check count.", eachChangeLog);
                        removeIndice.push(i);
                        this.m_delegate && typeof this.m_delegate.CurrencyFlowCheckLogOverCount == "function" && this.m_delegate.CurrencyFlowCheckLogOverCount(eachChangeLog);
                    }
                }
            }

            if (!IsValid(matchChangeLog) && sum.eq(changeValue)) {
                removeIndice = tmpRemoveIndice;
                matchChangeLog = tmpMatchChangeLog;
            }

            for (let i = removeIndice.length-1; i >= 0; i--) {
                let eachIndex = removeIndice[i];
                js.array.removeAt(changeLogList, eachIndex);
            }
        }

        return matchChangeLog;
    }

    /**
     * 核銷紀錄保留
     * @param currencyType 幣別
     * @param client client 的紀錄
     * @param server server 的紀錄
     * @param fromClient 是否是由 client 發起
     */
    private ConnectChangeLog(currencyType:Currency.Type, client:CurrencyFlowLog|CurrencyFlowLog[], server:CurrencyFlowLog|CurrencyFlowLog[], fromClient:boolean) {
        let maxCount:number = MAX_MATCH_LOG_COUNT;

        if (this.m_securityDelegate && typeof this.m_securityDelegate.CurrencyFlowMatchLogMaxCount == "function") {
            maxCount = this.m_securityDelegate.CurrencyFlowMatchLogMaxCount();
        }

        if (maxCount > 0) {
            let matchLogList:CurrencyMatchLog[] = this.m_matchLog.get(currencyType) || [];
            matchLogList.push(new CurrencyMatchLog(client, server, fromClient));

            if (matchLogList.length > maxCount) {
                matchLogList.shift();
            }
    
            this.m_matchLog.set(currencyType, matchLogList);
        }
    }

    /**
     * 在 Web 畫面上顯示 Server 相關紀錄
     */
    private ScreenLogUpdate() {
        if (DivServerCurrency) {
            let content = "";
            for (let it of this.m_serverCurrencyMap) {
                const currencyType:Currency.Type = it[0];
                const serverCurrencyBundle:CurrencyBundle = it[1];
                content += `${Currency.Type[currencyType]}(${currencyType}): ${NumberGroup(serverCurrencyBundle.CurrentValue)}<br/>`
            }
            DivServerCurrency.innerHTML = content;
        }
    }

    /**
     * 檢查特定幣別是否使用安全型更新
     * @param currencyType 幣別
     */
    private IsSafeUpdate(currencyType:Currency.Type): boolean {
        let isSafeUpdate = true;
        if (this.m_securityDelegate && typeof(this.m_securityDelegate.UnsafeCurrencyFlowUpdate) == "function") {
            isSafeUpdate = !this.m_securityDelegate.UnsafeCurrencyFlowUpdate(currencyType);
        }
        return isSafeUpdate;
    }

    /**
     * 金流變動通知
     * @param reason 變動原因
     * @param currencyType 幣別
     * @param fromValue 變動前的值
     * @param toValue 變動後的值
     * @param changeValue 本次的變動值
     * @param isSafe 是否為安全更新
     */
    private CurrencyFlowing(reason:LogCoinType, currencyType:Currency.Type, fromValue:BigNumber, toValue:BigNumber, changeValue:BigNumber, isSafe:boolean, option:any[] = []) {
        let displayFromValue:BigNumber = fromValue.isNegative() ? new BigNumber(ZERO) : fromValue;
        let displayToValue:BigNumber = toValue.isNegative() ? new BigNumber(ZERO) : toValue;
        let displayChangeValue:BigNumber = displayToValue.minus(displayFromValue);
        this.m_delegate && typeof this.m_delegate.OnCurrencyFlowing == "function" && this.m_delegate.OnCurrencyFlowing(reason, currencyType, displayFromValue, displayToValue, displayChangeValue, isSafe, option);
    }

    /**
     * 檢查特定幣別是否當收到 Server 變動通知時就直接更新
     * @param currencyType 幣別
     */
    private ShouldSyncOnServerCurrencyChanged(currencyType:Currency.Type):boolean {
        let shouldSync = false;
        if (this.m_securityDelegate && typeof(this.m_securityDelegate.ShouldSyncCurrencyOnServerChanged) == "function") {
            shouldSync = !this.m_securityDelegate.ShouldSyncCurrencyOnServerChanged(currencyType);
        }
        return shouldSync;   
    }
}
