import { DEBUG } from "cc/env";
import { error, js } from "cc";
import { Network } from "../Network/Network";
import { Command as CMD } from "../Command/Command";

function SafeCallImpl(target: Object, func: Function, ...args): any {
    if (target && typeof func == "function") {
        if (DEBUG) {
            return func.apply( target, args );
        } else {
            try {
                return func.apply( target, args );
            } catch {}
        }    
    }
}

class PromiseCommand<CommandType extends CMD.Command> { constructor(public Header: Network.HeaderMap, public Command: CommandType){}}

class ScheduleSendInfo<Type, Content> {
   Interval: number = 0;
   CommandType: Type = null;
   ContentOrHandler: ScheduleScnedContentOrHandler<Type,Content> = null;
   Tick: number = 0;
}

// 取得序號
const SerialNo: ()=>number = (gen=>{let counter:number = 0; return ():number=>gen+counter++;} )(Date.now());

type ScheduleScnedContentOrHandler<Type,Content> = Content | ((type: Type)=>Content|void);

export interface MicroServiceProtocol {
    OnCommand(id: number, command: CMD.Command);
    OnCommandFail(id: number, command: CMD.Command, reqCommand: CMD.Command);
    OnConnectionOpen(id: number, isReconnect: boolean, event: Event);
    OnConnectionError(id: number, event: Event);
    OnConnectionClose(id: number, event: CloseEvent);
    CustomHttpHeaderMap(id: number): Network.HeaderMap;
    OnResendCommandFail(id: number, reqCommand: CMD.Command);
}

export function FriendAttr(target: any, key: string, descriptor: PropertyDescriptor) {}

export abstract class MicroService<CommandType extends CMD.Command> {
    // 避免變數名稱容易重複造成後續繼承上的困擾，在此直接改用底線開頭
    private _promiseCommandQueue: PromiseCommand<CommandType>[];
    private _connectCount: number;
    private _transport: Network.Transport;
    private _scheduleSendMap: Map<CMD.IType<CommandType>, ScheduleSendInfo<CMD.IType<CommandType>,CMD.IContent<CommandType>>>;
    private _delegate: Partial<MicroServiceProtocol>;
    private _type: number;
    private _destroyed: boolean;
    private _onRedirectCommand: (command: CMD.Command)=>void;
    private _cmdBuilder: (type: CMD.IType<CommandType>, content?: CMD.IContent<CommandType>)=>CommandType;
    private _cmdParse: (data: CMD.ISerialize<CommandType>, reqCommand?: CommandType)=>CommandType;

    protected get m_type(): number { return this._type; }
    protected get m_isReconnect(): boolean { return this._connectCount > 1; }
    protected get m_sharedDelegate(): Partial<MicroServiceProtocol> { return this._delegate; }
    protected get UseWebSocket(): boolean { return this._transport.IsWebSocket }

    @FriendAttr
    protected get Type(): number { return this.m_type; }
    @FriendAttr
    protected get IsConnected(): boolean { return this._transport?.Status == Network.Status.OPENED || false; }
    @FriendAttr
    protected get Status(): Network.Status { return this._transport?.Status || Network.Status.UNOPENED; }
    @FriendAttr
    protected get Url(): string { return this._transport?.Url || ""; }

    /**
     * 收到 Command 的通知處理
     * @param command 收到的 Command
     */
    protected OnCommand?(command: CommandType);

    /**
     * 以弱連方式發送 Command 後收到不正常的 HttpStatusCode(如：400、404...等)
     * @param command server 回應帶有錯誤代碼的 Command
     * @param reqCommand 發送出去的 Command
     * 備註：這是有收到回應的錯誤；強連線不會有這個錯誤
     */
    protected OnCommandFail?(command: CommandType, reqCommand: CommandType);

    constructor(
        cmdBuilder:(type: CMD.IType<CommandType>, content?: CMD.IContent<CommandType>)=>CommandType, 
        cmdParser:(data: CMD.ISerialize<CommandType>, reqCommand?: CommandType)=>CommandType, 
        type: number, 
        delegate: Partial<MicroServiceProtocol>) 
    {
        this._cmdBuilder = cmdBuilder;
        this._cmdParse = cmdParser;
        this._connectCount = 0;
        this._delegate = delegate;
        this._type = type;
        this._destroyed = false;
    }

    @FriendAttr
    protected Connect(url: string): boolean {
        if (this._connectCount > 0) {
            error( "除了首次物件建立時可使用 Connect 外其餘時機請改用 Reconnect。" );
            return false;
        }
        return this.DoConnect(url);
    }

    @FriendAttr
    protected Reconnect(): boolean {
        if (!this._transport) {
            error( "至少須先經過一次 Connect 後才能執行 Reconnect。" );
            return false;
        }
        return this.DoConnect(this._transport.Url);
    }

    @FriendAttr
    protected Close(code: number): boolean {
        return this._transport?.Close(code) || false;
    }

    @FriendAttr
    protected Destroy() {
        this._destroyed = true;
    }

    public SendCommand(type: CMD.IType<CommandType>, content?: CMD.IContent<CommandType>): boolean {
        let isSuccess: boolean = false;

        const command: CommandType = this._cmdBuilder(type, content);
        if (this.DoSendCommand(command)) {
            isSuccess = true;
        } else if (!this._destroyed) {
            // [網路還沒接通就要送] => 暫存起來
            this._promiseCommandQueue = this._promiseCommandQueue || [];
            this._promiseCommandQueue.push(new PromiseCommand(null, command));
        }

        return isSuccess;
    }

    /**
     * 定時發送 Command
     * @param interval 間隔多少時間後再次發送(單位：毫秒)
     * @param type Command.Command<Type,Content,Serialize>
     * @param contentOrHandler 固定的 Content 或是可動態回傳 Content 的 function(會有一個參數 Command.Command<Type,Content,Serialize>)
     * @returns 是否建立成功
     * (1) 只帶入一個數字 Command.Command<Type,Content,Serialize>
     * (2) 數字 Command.Command<Type,Content,Serialize> + 固定 Content
     * (3) 數字 Command.Command<Type,Content,Serialize> + 動態回傳 Content 的 function
     */
    protected ScheduleSendCommand(interval: number, type: CMD.IType<CommandType>, contentOrHandler?: ScheduleScnedContentOrHandler<CMD.IType<CommandType>,CMD.IContent<CommandType>>): boolean {
        if (this._scheduleSendMap?.get(type)) {
            return false;
        }

        const scheduleSendInfo: ScheduleSendInfo<CMD.IType<CommandType>,CMD.IContent<CommandType>> = new ScheduleSendInfo();
        scheduleSendInfo.Interval = scheduleSendInfo.Tick = interval / 1000;
        scheduleSendInfo.CommandType = type;
        scheduleSendInfo.ContentOrHandler = contentOrHandler;
        this._scheduleSendMap = this._scheduleSendMap || new Map();
        this._scheduleSendMap.set(type, scheduleSendInfo);

        return true;
    }

    /**
     * 取消定時發送 Command 給 Server
     * @param type 停止的 type
     */
    protected UnscheduleSendCommand(type: CMD.IType<CommandType>): boolean {
        if (!this._scheduleSendMap?.get(type)) {
            return false;
        } else {
            this._scheduleSendMap?.delete(type);
            return true;
        }
    }

    @FriendAttr
    protected GetCloseCode(): number {
        return this._transport?.CloseCode || null;
    }

    @FriendAttr
    protected GetSocketError(): ErrorEvent {
        return this._transport ? this._transport.SocketError : null;
    }

//#region MicroServiceProtocol
    private OnMessage(redirect:boolean, data: CMD.ISerialize<CommandType>, reqCommand?: CommandType) {
        const command: CommandType = this._cmdParse(data, reqCommand);
        SafeCallImpl(this._delegate, this._delegate?.OnCommand, this.m_type, command, reqCommand);
        redirect && this._onRedirectCommand?.(command);
        this.OnCommand?.(command);
    }

    private OnMessageFail(data: CMD.ISerialize<CommandType>, reqCommand: CommandType) {
        const command: CommandType = this._cmdParse(data, reqCommand);
        SafeCallImpl(this._delegate, this._delegate?.OnCommandFail, this.m_type, command, reqCommand);
        this.OnCommandFail?.(command, reqCommand);
    }

    /**
     * 連線沒有中斷的情形下觸發等待逾時
     * @param header 
     * @param reqCommand 
     * 備註：這是在連線沒有斷掉的情形下等待時間超時；如果連線中斷會觸發 OnCommandError；強連不會發生
     */
    protected OnCommandTimeout(header: Network.HeaderMap, reqCommand: CommandType) {
        this.PromisingCommand(header, reqCommand);
    }

    /**
     * 連線上發生中斷或問題而導致的錯誤
     */
    protected OnCommandError(header: Network.HeaderMap, reqCommand: CommandType) {
    }

    protected OnConnectionOpen(isReconnect: boolean, event: Event) {
        SafeCallImpl(this._delegate, this._delegate?.OnConnectionOpen, this.m_type, isReconnect, event);

        if (this._promiseCommandQueue && this._promiseCommandQueue.length > 0) {
            // 斷線重連完成後發現有前次沒有送成功的 Command，在此直接補送沒送成功的 Command
            // 這裡可能要考慮到無限重送的可能，應該要加上 retry 上限？但如果仿造 C++ 強連思維或許無限 retry 是對的？！
            // ＊＊＊有 retry 的 service 遇到 4XX 或 5XX 的時候也要 retry，但這個 retry 會有個上限
            const queue: PromiseCommand<CommandType>[] = this._promiseCommandQueue.slice();
            for (let command of queue) {
                this.DoSendCommand(command.Command);
            }
        }
    }

    protected OnConnectionError(event: Event) {
        SafeCallImpl(this._delegate, this._delegate?.OnConnectionError, this.m_type, event);
    }

    protected OnConnectionClose(event: CloseEvent) {
        SafeCallImpl(this._delegate, this._delegate?.OnConnectionClose, this.m_type, event);
    }

    protected CustomRequestHeaderMap(command: CommandType): Network.HeaderMap {
        let headerMap: Network.HeaderMap;

        if (this._promiseCommandQueue && this._promiseCommandQueue.length > 0) {
            for (let i = 0; i < this._promiseCommandQueue.length; i++) {
                const bundle: PromiseCommand<CommandType> = this._promiseCommandQueue[i];
                if (command == bundle.Command) {
                    headerMap = bundle.Header;
                    js.array.removeAt(this._promiseCommandQueue, i);
                    break;
                }
            }
        }

        if (headerMap) {
            // [header 存在]

            // 累計重送次數
            const retryCount: number = headerMap.get(Network.HeaderKey.RETRY);
            headerMap.set(Network.HeaderKey.RETRY, retryCount + 1);
        } else {
            // [header 不存在]

            // 寫入初始重送值
            headerMap = new Map();
            headerMap.set(Network.HeaderKey.RETRY, 0);
            headerMap.set(Network.HeaderKey.SERIAL_NO, SerialNo());

            const customHeaderMap: Network.HeaderMap = SafeCallImpl(this._delegate, this._delegate?.CustomHttpHeaderMap, this.m_type);
            customHeaderMap?.forEach((value: any, key: string) => headerMap.set(key, value));
        }

        return headerMap;
    }

    /**
     * 逾時時間(單位：毫秒)
     */
    protected abstract TimeoutTime(): number;
//#endregion

    @FriendAttr
    protected MainProcess(dt: number) {
        if (this.Status == Network.Status.OPENED && this._scheduleSendMap?.size > 0) {
            this._scheduleSendMap.forEach((scheduleSendInfo: ScheduleSendInfo<CMD.IType<CommandType>,CMD.IContent<CommandType>>) => {
                scheduleSendInfo.Tick += dt;
                if (scheduleSendInfo.Tick >= scheduleSendInfo.Interval) {
                    scheduleSendInfo.Tick = 0;
                    this.SendCommand(scheduleSendInfo.CommandType,
                        (typeof scheduleSendInfo.ContentOrHandler != "function" ?
                            scheduleSendInfo.ContentOrHandler :
                            scheduleSendInfo.ContentOrHandler(scheduleSendInfo.CommandType) as CMD.IContent<CommandType>));
                }
            });
        }
    }

    protected ShouldPromiseSend(reqCommand: CommandType): boolean {
        return false;
    }

    private DoConnect(url: string): boolean {
        let isSuccess: boolean = false;

        if (!this._transport || !this.IsConnected) {
            this._connectCount++;
            this._transport = this.CreateTransport(url);
            this._transport.Connect();
            isSuccess = true;
        }

        return isSuccess;
    }

    private CreateTransport(url: string): Network.Transport {
        if (!(typeof url == "string" && url.length > 0)) {
            return null;
        } else {
            const TransportClass = Network.IsSocketUrl(url) ? Network.Socket : Network.Http;
            return new TransportClass(url, {
                OnMessage: this.OnMessage.bind(this, false),
                OnMessageFail: this.OnMessageFail.bind(this),
                OnCommandTimeout: this.OnCommandTimeout.bind(this),
                OnCommandError: this.OnCommandError.bind(this),
                OnConnectionClose: this.OnConnectionClose.bind(this),
                OnConnectionError: this.OnConnectionError.bind(this),
                OnConnectionOpen: (event: Event) => this.OnConnectionOpen(this.m_isReconnect, event),
                CustomRequestHeaderMap: this.CustomRequestHeaderMap.bind(this),
                TimeoutTime: this.TimeoutTime.bind(this)
            } );
        }
    }

    private DoSendCommand(command: CommandType) {
        let isSuccess: boolean = false;

        if (this.Status == Network.Status.OPENED) {
            isSuccess = this._transport.SendCommand(command);
        }

        return isSuccess;
    }

    private PromisingCommand(header: Network.HeaderMap, reqCommand: CommandType) {
        if (!this._destroyed && this.ShouldPromiseSend(reqCommand)) {
            const command: PromiseCommand<CommandType> = new PromiseCommand(header, reqCommand);
            this._promiseCommandQueue = this._promiseCommandQueue || [];
            this._promiseCommandQueue.push(command);
            if (!this.DoSendCommand(command.Command)) {
                // [發送失敗]
                SafeCallImpl(this._delegate, this._delegate?.OnResendCommandFail, this.m_type, reqCommand);
            }
        }
    }

    /**
     * 收到轉發的訊息
     * @param message 來自其他服務送來的訊息
     * 備註：此方法由外界使用 OnRedirectMessage 的方式直接呼叫
     */
    @FriendAttr
    private OnRedirectMessage(message: CMD.ISerialize<CommandType>) {
        this.OnMessage(true, message);
    }
}


