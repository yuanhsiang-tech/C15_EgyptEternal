import { path } from "cc";
import { DEBUG } from "cc/env";
import HttpStatusCode from "./HttpStatusCode";
import { Command as CMD } from "../Command/Command";

const DATA_TRANSMISSION_TYPE                            = "arraybuffer";
const OFFICIAL_VALID_WEBSOCKET_BEGIN_CLOSE_CODE: number = 1000;
const AVAILABLE_SOCKET_CLOSE_CODE_BEGIN: number         = 3000;
const UNKNOWN_ERROR: number                             = 4999;

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

/**
 * 需要做 error code shift 的理由是 close code 不得小於 1000，所有小於 1000 的值必須先位移成高值後在轉回低值
 */
function SocketCloseCodeShift ( code: number ): number {
    if (code >= OFFICIAL_VALID_WEBSOCKET_BEGIN_CLOSE_CODE && code < AVAILABLE_SOCKET_CLOSE_CODE_BEGIN) {
        // [官方 websocket 事件]
        return code;
    } else if (code >= AVAILABLE_SOCKET_CLOSE_CODE_BEGIN) {
        // [有效的使用範圍]
        return code;
    }
}

export namespace Network {
    export type HeaderMap = Map<string, any>;
    export namespace HeaderKey {
        export const SEQUENCE: string   = "Gt2-Sequence";
        export const ACCOUNT: string    = "Gt2-AccountId";
        export const SERIAL_NO: string  = "Gt2-SerialNo";
        export const TOKEN: string      = "Token";
        export const RETRY: string      = "Retry-Count";
    }
}

export namespace Network {
    enum Protocol {
        HTTP    = "http",
        HTTPS   = "https",
        WS      = "ws",
        WSS     = "wss"
    }
    
    function IsTypeOfUrl(regExp: RegExp, url: string): boolean { return typeof url != "string" ? false : regExp.test( url ); }
    function ConvertProtocol(url: string, regExpReplacer: RegExp, checkProtocol: Protocol, successProtocol: Protocol, failProtocol: Protocol): string { return typeof url != "string" ? url : url.replace( regExpReplacer, ( protocol: string ) => protocol == checkProtocol ? successProtocol : failProtocol ); }
    function BuildProtocolReg(protocol_0: string, protocol_1: string): RegExp { return new RegExp( `^(?:${ protocol_0 }|${ protocol_1 })(?=:\/\/)` ); }
    
    const IPV4_REG:             RegExp = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(?::\d{2,4})?/;
    const PROTOCOL_HTTP_REG:    RegExp = BuildProtocolReg(Protocol.HTTPS, Protocol.HTTP);
    const PROTOCOL_SOCKET_REG:  RegExp = BuildProtocolReg(Protocol.WSS, Protocol.WS);
    const PROTOCOL_SECURE:      RegExp = BuildProtocolReg(Protocol.HTTPS, Protocol.WSS);
    
    export function ConvertHttpToWS(url: string): string { return ConvertProtocol(url, PROTOCOL_HTTP_REG, Protocol.HTTPS, Protocol.WSS, Protocol.WS); }
    export function ConvertWStoHttp(url: string): string { return ConvertProtocol(url, PROTOCOL_SOCKET_REG, Protocol.WSS, Protocol.HTTPS, Protocol.HTTP); }
    
    export function IsIpDomain(url: string): boolean { return IPV4_REG.test(url); }
    export function IsSocketUrl(url: string): boolean { return IsTypeOfUrl(PROTOCOL_SOCKET_REG, url); }
    export function IsHttpUrl(url: string): boolean { return IsTypeOfUrl(PROTOCOL_HTTP_REG, url); }
    export function IsSecureUrl(url: string): boolean { return IsTypeOfUrl(PROTOCOL_SECURE, url) || !IsIpDomain(url); }
    
    export function SelectProtocol(isHttp: boolean, isSecure: boolean): string { return (isHttp ? isSecure ? Protocol.HTTPS : Protocol.HTTP : isSecure ? Protocol.WSS : Protocol.WS) + "://"; }
    export function HasProtocol(url: string): boolean { return IsSocketUrl(url) || IsHttpUrl(url); }
}

export namespace Network {
    interface ISender {
        send(data?: string | ArrayBufferLike | Blob | ArrayBufferView | Document | XMLHttpRequestBodyInit | null);
    }
    
    export enum Status {
        UNOPENED,
        OPENED,
        CLOSING,
        CLOSED
    }

    export interface TransportCallback {
        OnMessage(statusCode:number, command: CMD.Serialize, reqCommand?: CMD.Command);
        OnMessageFail(statusCode:number, command: CMD.Serialize, reqCommand: CMD.Command);
        OnCommandTimeout(header: Network.HeaderMap, reqCommand: CMD.Command);
        OnCommandError(header: Network.HeaderMap, reqCommand: CMD.Command);
        OnConnectionOpen(event: Event);
        OnConnectionError(event: Event);
        OnConnectionClose(event: CloseEvent);
        CustomRequestHeaderMap(command: CMD.Command): HeaderMap;
        TimeoutTime(): number;
    }

    export abstract class Transport {
        private m_remoteUrl: string;
        
        public get Url (): string { return this.m_remoteUrl; }
        public get Status (): Status { return this.m_status; }
        public get CloseCode (): number { return this.m_closeCode; }
        public get SocketError (): ErrorEvent { return this.m_socketError; }
        public abstract get IsWebSocket (): boolean;
        
        protected get m_url (): string { return this.m_remoteUrl; }
        protected m_callback: Partial<TransportCallback>;
        protected m_closeCode: number;
        protected m_socketError: ErrorEvent;
        protected m_status: Status;
        
        constructor(url: string, callback: Partial<TransportCallback>) {
            this.m_remoteUrl = url;
            this.m_callback = callback;
            this.m_status = Status.UNOPENED;
        }
        
        public abstract Connect(): boolean;
        public abstract Close(code?: number): boolean;
        public abstract SendCommand(command: CMD.Command): boolean;
        
        protected SendMessage(sender: ISender, command: CMD.MarkableCommand): boolean {
            return this.m_status == Status.OPENED ? sender.send(command.Serialize()) || true : false;
        }
        
        protected OnOpen(event: Event) {
            this.m_status = Status.OPENED;
            SafeCallImpl(this.m_callback, this.m_callback?.OnConnectionOpen, event);
        }
        
        protected OnMessage(message: CMD.Serialize, reqCommand?: CMD.Command) {
            SafeCallImpl(this.m_callback, this.m_callback?.OnMessage, this.EnsureData(message), reqCommand);
        }

        protected OnMessageFail(message: CMD.Serialize, reqCommand: CMD.Command) {
            SafeCallImpl(this.m_callback, this.m_callback?.OnMessageFail, this.EnsureData(message), reqCommand);
        }
        
        protected OnMessageTimeout(header: Network.HeaderMap, reqCommand: CMD.Command) {
            SafeCallImpl(this.m_callback, this.m_callback?.OnCommandTimeout, header, reqCommand);
        }
        
        protected OnMessageError(header: Network.HeaderMap, reqCommand: CMD.Command) {
            SafeCallImpl(this.m_callback, this.m_callback?.OnCommandError, header, reqCommand);
        }
        
        protected OnError(event: ErrorEvent) {
            SafeCallImpl(this.m_callback, this.m_callback?.OnConnectionError, event);
        }
        
        protected OnClose(event: CloseEvent) {
            this.m_status = Status.CLOSED;
            SafeCallImpl(this.m_callback, this.m_callback?.OnConnectionClose, event);
        }

        private EnsureData(message: CMD.Serialize): CMD.Serialize {
            return typeof message == "string" ? message : ArrayBuffer.isView(message) ? message : new Uint8Array(message);
        }
    }
}

export namespace Network {
    interface ErrorEventExt extends ErrorEvent {
        code: number;
    }
    
    interface CloseEventExt extends CloseEvent {
        code: number;
    }
    
    export class Socket extends Network.Transport {
        private m_socket: WebSocket;

        public get IsWebSocket (): boolean { return true; }
        
        constructor(url: string, delegate?: Partial<TransportCallback>) {
            super(url, delegate);
        }

        public Connect(): boolean {
            if (this.m_socket) return false;
            
            this.m_socket = new WebSocket(this.m_url, DATA_TRANSMISSION_TYPE);
            this.m_socket.binaryType = DATA_TRANSMISSION_TYPE;
            this.m_socket.onopen = this.OnOpen.bind(this);
            this.m_socket.onmessage = (event: MessageEvent) => this.OnMessage(event.data);
            this.m_socket.onerror = this.OnError.bind(this);
            this.m_socket.onclose = this.OnClose.bind(this);
            this.m_closeCode = null;

            return true;
        }

        public Close(code: number): boolean {
            let isSuccess: boolean = false;
            
            this.m_closeCode == null && (this.m_closeCode = code);
            if (this.m_socket && this.m_status == Network.Status.OPENED) {
                this.m_status = Network.Status.CLOSING;
                this.m_closeCode = code;
                this.m_socket.close(SocketCloseCodeShift(code));
                isSuccess = true;
            }

            return isSuccess;
        }

        public SendCommand(command: CMD.MarkableCommand): boolean {
            if (!this.m_socket) return false;
            return this.SendMessage(this.m_socket, command);
        }

        protected OnError(event: ErrorEventExt) {
            this.m_socketError = event;
            this.m_closeCode = event.code;
            super.OnError(event);
        }

        protected OnClose(event: CloseEventExt) {
            this.m_closeCode == null && (this.m_closeCode = event.code != null ? event.code : OFFICIAL_VALID_WEBSOCKET_BEGIN_CLOSE_CODE);
            this.m_socket.onopen = null;
            this.m_socket.onmessage = null;
            this.m_socket.onerror = null;
            this.m_socket.onclose = null;
            this.m_socket = null;
            super.OnClose(event);
        }
    }
}

export namespace Network {
    class XMLHttpRequestExt extends XMLHttpRequest {
        header: HeaderMap = null;
        isTimeout: boolean = false;
        isError: boolean = false;
    }
    
    export class Http extends Network.Transport {
        private static Decoder: TextDecoder;

        public get IsWebSocket (): boolean { return false; }

        public Connect(): boolean {
            this.m_closeCode = null;
            this.OnOpen(new Event("open", { bubbles: false, cancelable: false, composed: false }));
            return true;
        }
        
        public Close(code?: number): boolean {
            this.m_closeCode == null && ( this.m_closeCode = code );
            this.OnClose(new Event("close", { code: code, reason: "", wasClean: true, bubbles: false, cancelable: false, composed: false } as any ) as CloseEvent);
            return true;
        }
        
        public SendCommand(command: CMD.MarkableCommand): boolean {
            const url:string = typeof command.Type == "string" ? path.join(this.m_url, command.Type) : this.m_url;
            const request: XMLHttpRequestExt = new XMLHttpRequestExt();
            request.open("post", url, true);
            request.responseType = command.ResponseType;
            request.timeout = this.m_callback?.TimeoutTime ? SafeCallImpl(this.m_callback, this.m_callback.TimeoutTime) : 0;
            request.setRequestHeader("content-type", command.HeaderContentType);

            request.ontimeout = () => request.isTimeout = true;
            request.onerror = () => request.isError = true;
            request.onloadend = () => {
                if (!command.Marked) {
                    if (request.isError === true) {
                        // [連線上發生錯誤]
                        this.OnMessageError(request.header, command);
                    } else if (request.isTimeout === true) {
                        // [逾時]
                        this.OnMessageTimeout(request.header, command);
                    } else if (request.readyState == 4) {
                        // [有回應]
                        command.Mark();
                        this.HandleMessage(request, command);
                    }
                }
            };
            
            // 加入額外指定的客製化 header 參數
            const customHeaderMap: HeaderMap = SafeCallImpl(this.m_callback, this.m_callback?.CustomRequestHeaderMap, command);
            if (customHeaderMap && typeof customHeaderMap == "object") {
                request.header = customHeaderMap;
                customHeaderMap.forEach((value: any, key: string) => request.setRequestHeader(key, typeof value != "string" ? JSON.stringify(value) : value));
            }
            
            return this.SendMessage(request, command);
        }

        private HandleMessage(request:XMLHttpRequestExt, reqCommand:CMD.MarkableCommand) {
            const data:CMD.Serialize = reqCommand.ResponseType == CMD.ResponseType.TEXT ? request.response : new Uint8Array(request.response);
            const bytesSectionHint:string = request.getResponseHeader(Network.HeaderKey.SEQUENCE);
            const bytesSection:number[] = typeof bytesSectionHint == "string" && bytesSectionHint != "-1" ? bytesSectionHint.split(",").map(x=>parseInt(x)) : null;

            if (bytesSection != null) {
                // LEGACY: [如果有 section 必定表示成功]
                let offset:number = 0;
                bytesSection.forEach((length:number)=>{
                    const sectionData:Uint8Array = new Uint8Array(request.response, offset, length);
                    this.OnMessage(sectionData, reqCommand);
                    offset += length;
                });
            } else {
                // [如果沒有 section 則需檢查各種情形]
                switch (request.status) {
                    case HttpStatusCode.NO_CONTENT: {
                        // [server 正確處理，但沒有回應內容]
                        break;
                    }
                    case HttpStatusCode.OK: {
                        // [server 正確處理，且有回應內容]
                        this.OnMessage(data, reqCommand);
                        break;
                    }
                    case HttpStatusCode.BAD_REQUEST:
                    case HttpStatusCode.UNAUTHORIZED: {
                        // [錯誤回應] => server 解析失敗(4XX系列，可能是漏參數或是驗證失敗)
                        this.OnMessageFail(data, reqCommand);
                        break;
                    }
                    default: {
                        // [其餘回應] => 理論上應該會是純文字內容
                        Http.Decoder = Http.Decoder || new TextDecoder;
                        const message:string = reqCommand.ResponseType == CMD.ResponseType.TEXT ? request.response : Http.Decoder.decode(request.response);
                        this.OnMessageFail(reqCommand.Reverse(request.status, message).Serialize(), reqCommand);
                        break;
                    }
                }
            }
        }
    }
}
