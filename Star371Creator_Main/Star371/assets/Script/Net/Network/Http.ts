import { Director, director, ISchedulable, js, Scheduler, warn } from "cc";
import { NATIVE } from "cc/env";
import HttpStatusCode from "./HttpStatusCode";


if (NATIVE && typeof XMLHttpRequest["enablePhaseLog"] == "function") {
    XMLHttpRequest["enablePhaseLog"](true);
}

/**
 * 預設逾時時間(單位：毫秒)
 */
const kDEFAULT_TIMEOUT_TIME = 10000;

/**
 * 預設重試次數
 */
const kDEFAULT_RETRY_TIMES = 2;

/**
 * 開始下一次重試的延遲時間(單位：毫秒)
 */
const kDEFER_NEXT_RETRY = 100;

/**
 * Http 請求方式
 */
enum Method {
    GET     = "GET",
    POST    = "POST",
    HEAD    = "HEAD"
}

class XMLHttpRequestExt extends XMLHttpRequest {
    isTimeout: boolean = false;
    isError: boolean = false;
    url:string = null;
    get phaseLog():string { return NATIVE ? this["phaseLog"] : ""; }
    public getErrorMessage():string {
        const funcGetErrorMessage = this["getErrorMessage"];
        return NATIVE && typeof funcGetErrorMessage == "function" ? funcGetErrorMessage() : "[Not support getErrorMessage]";
    }
}

interface TaskLike<T> {
    /**
     * 請求網址
     */
    readonly Url: string;

    /**
     * 所有請求網址
     */
    readonly Urls: string[];

    /**
     * 附加額外的輪替網址
     * @param urls 輪替網址
     */
    Append(...urls:string[]): T;

    /**
     * 設定請求發出通知對象
     * @param func 通知對象
     */
    OnStart(func:(retryCount:number, request:XMLHttpRequest, url:string)=>void): T

    /**
     * 設定進度處理通知對象
     * @param func 通知對象
     */
    OnProgress(func:(event:ProgressEvent, request:XMLHttpRequest, url:string)=>void): T;

    /**
     * 設定 status 200 的請求回應通知對象
     * @param func 通知對象
     */
    OnResponse(func:(response:any, request:XMLHttpRequest, url:string)=>void): T

    /**
     * 設定原始請求回應通知對象
     * @param func 通知對象
     */
    OnRawResponse(func:(request:XMLHttpRequest, url:string)=>void): T

    /**
     * 設定請求失敗通知對象
     * @param func 通知對象
     */
    OnFail(func:(requestTimes:number, isLastTime:boolean, isError:boolean, request:XMLHttpRequest, url:string)=>boolean|void): T

    /**
     * 設定請求完成通知對象
     * @param func 通知對象
     */
    OnFinish(func:(isSuccess:boolean, request:XMLHttpRequest, url:string)=>void): T

    /**
     * 設定重試次數
     * @param retry 重試次數
     * @description 未指定時預設 retry 2 次，包含第一次的發送總共會發出 3 次；完全不要 retry 請帶入 0
     */
    Retry(retry:number): T

    /**
     * 設定等待逾時時間(單位：毫秒)
     * @param time 逾時時間
     * @description 未指定時預設 10 秒；永遠不會逾時請帶入 0
     */
    Timeout(time:number): T

    /**
     * 設定回應內容的類型
     * @param type 內容類型
     * @description 未指定時預設 Http.ResponseType.TEXT
     */
    ResponseType(type:Http.ResponseType): T

    /**
     * 指定 post 要發送的 body 資料
     * @param body post 要發送的 body 資料
     * 備註：可以直接在 Resume 帶入，若 Post 和 Resume 同時有指定的時候以 Resume 的參數為主
     */
    Body(body: Document | XMLHttpRequestBodyInit | null): T;

    /**
     * 發送請求
     * @param body post 發送的 body 資料
     * 備註：所有設定應該在 Resume 前設定完成，避免資料回來後來不及回呼指定的方法
     */
    Resume(body?: Document | XMLHttpRequestBodyInit | null): T
}

class Task implements TaskLike<Task> {
    public static Create(method:Method, url:string, contentType?:Http.ContentType): Task {
        const task:Task = new Task(method, url, contentType);
        HttpKit.TaskPrepareProcess?.(task);
        return task;
    }

    private m_didResume:boolean;

    private m_method:Method;
    private m_urls:string[];
    private m_retryTimes:number;
    private m_timeoutTime:number;
    private m_responseType:Http.ResponseType;
    private m_contentType:Http.ContentType;
    private m_isFinished:boolean;
    private m_postBody:Document | XMLHttpRequestBodyInit | null;

    private m_onStart:(retryCount:number, request:XMLHttpRequest, url:string)=>void;
    private m_onProgress:(event:ProgressEvent, request:XMLHttpRequest, url:string)=>void;
    private m_onResponse:(response:any, request:XMLHttpRequest, url:string)=>void;
    private m_onRawResponse:(request:XMLHttpRequest, url:string)=>void;
    private m_onFail:(requestTimes:number, isLastTime:boolean, isError:boolean, request:XMLHttpRequest, url:string)=>boolean|void;
    private m_onFinish:(isSuccess:boolean, request:XMLHttpRequest, url:string)=>void;

    /**
     * 請求網址
     */
    public get Url(): string {
        return this.m_urls[0];
    }

    /**
     * 所有請求網址
     */
    public get Urls(): string[] {
        return this.m_urls;
    }

    /**
     * 是否執行完成
     */
    public get IsFinished(): boolean {
        return this.m_isFinished == true;
    }

    private constructor(method:Method, url:string, contentType?:Http.ContentType) {
        this.m_didResume = false;
        this.m_method = method;
        this.m_urls = [HttpKit.UrlInspector?.(url)||url];
        this.m_contentType = contentType;
        this.m_responseType = Http.ResponseType.TEXT;
        this.m_retryTimes = kDEFAULT_RETRY_TIMES;
        this.m_timeoutTime = kDEFAULT_TIMEOUT_TIME;
    }

    /**
     * 附加額外的輪替網址
     * @param urls 輪替網址
     */
    public Append(...urls:string[]): Task {
        if (HttpKit.UrlInspector && Array.isArray(urls) && urls.length > 0) {
            for (let eachUrl of urls) {
                const url = HttpKit.UrlInspector(eachUrl);
                this.m_urls.push(url);
            }
        }
        return this;
    }

    /**
     * 設定請求發出通知對象
     * @param func 通知對象
     */
    public OnStart(func:(retryCount:number, request:XMLHttpRequest, url:string)=>void): Task {
        this.m_onStart = func;
        return this;
    }

    /**
     * 設定進度處理通知對象
     * @param func 通知對象
     */
    public OnProgress(func:(event:ProgressEvent, request:XMLHttpRequest, url:string)=>void): Task {
        this.m_onProgress = func;
        return this;
    }

    /**
     * 設定 status 200 的請求回應通知對象
     * @param func 通知對象
     */
    public OnResponse(func:(response:any, request:XMLHttpRequest, url:string)=>void): Task {
        this.m_onResponse = func;
        return this;
    }

    /**
     * 設定原始請求回應通知對象
     * @param func 通知對象
     */
    public OnRawResponse(func:(request:XMLHttpRequest, url:string)=>void): Task {
        this.m_onRawResponse = func;
        return this;
    }

    /**
     * 設定請求失敗通知對象
     * @param func 通知對象
     */
    public OnFail(func:(requestTimes:number, isLastTime:boolean, isError:boolean, request:XMLHttpRequest, url:string)=>boolean|void): Task {
        this.m_onFail = func;
        return this;
    }

    /**
     * 設定請求完成通知對象
     * @param func 通知對象
     */
    public OnFinish(func:(isSuccess:boolean, request:XMLHttpRequest, url:string)=>void): Task {
        this.m_onFinish = func;
        return this;
    }

    /**
     * 設定重試次數
     * @param retry 重試次數
     * @description 未指定時預設 retry 2 次，包含第一次的發送總共會發出 3 次；完全不要 retry 請帶入 0
     */
    public Retry(retry:number): Task {
        this.m_retryTimes = typeof retry != "number" || retry < 0 ? kDEFAULT_RETRY_TIMES : retry;
        return this;
    }

    /**
     * 設定等待逾時時間(單位：毫秒)
     * @param time 逾時時間
     * @description 未指定時預設 10 秒；永遠不會逾時請帶入 0
     */
    public Timeout(time:number): Task {
        this.m_timeoutTime = typeof time != "number" || time < 0 ? kDEFAULT_TIMEOUT_TIME : time;
        return this;
    }

    /**
     * 設定回應內容的類型
     * @param type 內容類型
     * @description 未指定時預設 Http.ResponseType.TEXT
     */
    public ResponseType(type:Http.ResponseType): Task {
        this.m_responseType = type || Http.ResponseType.TEXT;
        return this;
    }

    /**
     * 指定 post 要發送的 body 資料
     * @param body post 要發送的 body 資料
     * 備註：可以直接在 Resume 帶入，若 Post 和 Resume 同時有指定的時候以 Resume 的參數為主
     */
    public Body(body: Document | XMLHttpRequestBodyInit): Task {
        this.m_postBody = body;
        return this;
    }

    /**
     * 發送請求
     * @param body post 要發送的 body 資料
     * 備註：所有設定應該在 Resume 前設定完成，避免資料回來後來不及回呼指定的方法
     */
    public Resume(body?: Document | XMLHttpRequestBodyInit | null): Task {
        if (this.m_didResume) return;
        this.m_didResume = true;
        body = body || this.m_postBody;

        let retryCount:number = 0;
        let index:number = -1;

        let localRequest:Function = () => {
            index = ++index >= this.m_urls.length ? 0 : index;
    
            let url:string = this.m_urls[index];
            let xhr = new XMLHttpRequestExt();
            
            let retry = (isError:boolean=false) => {
                let shouldRetry:boolean = true;
                !isError && (xhr.isTimeout = true);
                isError && (xhr.isError = true);
                retryCount++;
                
                if (typeof this.m_onFail == "function") {
                    let goRetry:any = this.m_onFail(retryCount, retryCount>this.m_retryTimes, isError, xhr, url);
                    shouldRetry = typeof goRetry == "boolean" ? goRetry : shouldRetry;
                }
    
                // 檢查是否重送
                if (shouldRetry && retryCount <= this.m_retryTimes) {
                    // [重送]
                    const self:ISchedulable = this as ISchedulable;
                    Scheduler.enableForTarget(self);
                    director.getScheduler().schedule(()=>{
                        warn(`[重送開始]: ${url} ${retryCount}`);
                        localRequest();
                    }, self, 0, 0, kDEFER_NEXT_RETRY/1000, false);
                } else {
                    this.m_isFinished = true;
                    this.m_onFinish?.(false, xhr, url);
                }
            }
            
            xhr.url = url;
            xhr.onloadstart = () => {
                this.m_onStart?.(retryCount, xhr, url);
            }
            xhr.onprogress = (e:ProgressEvent) => {
                this.m_onProgress?.(e, xhr, url);
            }
            xhr.onerror = () => {
                retry(true);
            }
            xhr.ontimeout = () => {
                retry();
            }
            xhr.onloadend = () => {
                const prefix:string = `Http.${this.m_method}(${url})"`;
                if (xhr.isTimeout == true) {
                    // [被判定逾時] => 直接丟棄本次處理，等待 ontimeout 的 retry 結果
                    // ＊＊＊＊＊ 暫時不作處理 ＊＊＊＊＊
                    warn(`${prefix} timeout 錯誤"`);
                } else if (xhr.isError == true) {
                    // [被判定發生錯誤] => 直接丟棄本次處理，等待 onerror 的 retry 結果
                    // ＊＊＊＊＊ 暫時不作處理 ＊＊＊＊＊
                    warn(`${prefix} error 錯誤"`);
                } else if (xhr.readyState == 4 && xhr.status == 0) {
                    // [可能發生了跨域存取的錯誤] => 這個應該只有網頁版會發生
                    warn(`${prefix} 跨域存取 錯誤"`);
                    retry();
                } else if (xhr.readyState < 0 || xhr.readyState > 4) {
                    // [異常的 readyState] => 當作失敗
                    warn(`${prefix} readyState 錯誤: ${xhr.readyState}"`);
                    retry();
                } else if (xhr.status < Http.Status.CONTINUE || xhr.status > Http.Status.NETWORK_AUTHENTICATION_REQUIRED) {
                    // [異常的 http status code] => 當作失敗
                    warn(`${prefix} http status 錯誤: ${xhr.status}"`);
                    retry();
                } else if (xhr.readyState == 4) {
                    // [處理結束] => 無論成功或失敗
                    this.m_isFinished = true;
                    xhr.status == Http.Status.OK && this.m_onResponse?.(xhr.response, xhr, url);
                    this.m_onRawResponse?.(xhr, url);
                    this.m_onFinish?.(true, xhr, url);
                }
            }

            xhr.timeout = this.m_timeoutTime;
            xhr.responseType = this.m_responseType;
            xhr.open(this.m_method, url, true);

            this.m_method == Method.GET  && xhr.setRequestHeader("cache-control", "no-cache");
            this.m_method == Method.POST && xhr.setRequestHeader("Content-Type" , this.m_contentType);

            xhr.send(body);
        }
        localRequest();

        return this;
    }
}

export namespace Http {
    /**
     * Http Status 狀態碼
     */    
    export const Status:typeof HttpStatusCode = HttpStatusCode;

    /**
     * XMLHttpResponseType
     */
    export enum ResponseType {
        BUFFER          =   'arraybuffer',
        BLOB            =   'blob',
        DOCUMENT        =   'document',
        JSON            =   'json',
        TEXT            =   'text'
    }

    /**
     * Header ContentType
     */
    export enum ContentType {
        JSON            = "application/json",
        PROTOBUF        = "application/x-protobuf",
        FORM            = "application/x-www-form-urlencoded",
        MULTIPART       = "multipart/form-data",
    }
}

export class HttpKit {
    /**
     * 進行 Url 網址檢視的對象
     */
    static UrlInspector:(url:string)=>string;

    /**
     * 網址發送任務前置處理
     */
    static TaskPrepareProcess:(task:Http.ITaskInfo)=>void;
}

export namespace Http {
    /**
     * 受管理式的請求
     */
    export namespace Managed {
        /**
         * 管理元件基礎類別
         */
        abstract class Container {
            protected static kDEFAULT_CONCURRENT_REQUESTS:number = 8;
            protected static kDEFAULT_IDENTIFIER:string = "default";    
            private   static s_managedMap:{[identifier:string]: Container} = {};

            protected static Build<T extends Container>(Creator:(new (...args: any[])=>T), identifier:string, concurrentRequests:number): T {
                if (typeof identifier != "string" || identifier.trim() == "") {
                    return null;
                } else if (isNaN(concurrentRequests) || concurrentRequests < 1) {
                    return null;
                } else {
                    identifier = identifier.trim();
                    let targetContainer:T = this.s_managedMap[identifier] as T;
                    if (!targetContainer) {
                        targetContainer = new Creator(identifier, concurrentRequests);
                        this.s_managedMap[identifier] = targetContainer;
                    }
                    return targetContainer;
                }
            }
            protected static Use<T extends Container>(identifier:string): T {
                return this.s_managedMap[identifier] as T;
            }

            private m_concurrentRequests:number;
            private m_identifier:string;
            private m_waiting:Task[];
            private m_processing:Task[];
            private m_operation:string;

            /**
             * 最大並行處理的請求數量
             */
            public get ConcurrentRequests(): number { return this.m_concurrentRequests; }

            /**
             * 目前並行處理的請求數量
             */
            public get Requests(): number { return this.m_processing.length; }

            /**
             * 識別名稱
             */
            public get Identifier(): string { return this.m_identifier; }

            protected constructor(identifier:string, concurrentRequests:number, operation:string) {
                this.m_identifier = identifier;
                this.m_concurrentRequests = concurrentRequests;
                this.m_operation = operation;
                this.m_waiting = [];
                this.m_processing = [];
                director.on(Director.EVENT_AFTER_UPDATE, this.Process, this);
            }

            /**
             * 清空等待請求的貯列
             */
            public Clear() {
                this.m_waiting.length = 0;
            }

            /**
             * Http Get 請求
             * @param url 請求網址
             */
            public Get(url:string): Http.IManagedTask {
                return this.m_waiting.push(Task.Create(Method.GET, url)), this.m_waiting[this.m_waiting.length-1];
            }
            /**
             * Http Post 請求
             * @param url 請求網址
             * @param contentType body 類型，預設為表單
             */
            public Post(url:string, contentType:Http.ContentType=Http.ContentType.FORM): Http.IManagedTask {
                return this.m_waiting.push(Task.Create(Method.POST, url, contentType)), this.m_waiting[this.m_waiting.length-1];
            }

            /**
             * Http Get 請求，回應的內容為 JSON
             * @param url 請求網址
             */
            public JsonGet(url:string): Http.IManagedTask {
                return this.Get(url).ResponseType(Http.ResponseType.JSON);
            }
            /**
             * Http Post 請求，回應的內容為 JSON
             * @param url 請求網址
             * @param contentType body 類型，預設為表單
             */
            public JsonPost(url:string, contentType:Http.ContentType=Http.ContentType.FORM): Http.IManagedTask {
                return this.Post(url, contentType).ResponseType(Http.ResponseType.JSON);
            }

            /**
             * 處理、監控 Http 請求狀況
             */
            private Process() {
                // 移除已經處理完成的項目
                for (let index = this.m_processing.length-1; index >= 0; index--) {
                    const task:Task = this.m_processing[index];
                    if (task.IsFinished) {
                        js.array.removeAt(this.m_processing, index);
                    }
                }

                // 接續取出尚未處理的項目
                while (this.m_waiting.length > 0 && 
                    this.m_processing.length < this.m_concurrentRequests) {
                    const task:Task = this.m_waiting[this.m_operation]();
                    if (task.Resume()) {
                        this.m_processing.push(task);
                    }
                }
            }
        }

        /**
         * 採先進先出模式的請求管理元件
         */
        export class Queue extends Container {
            private static kIDENTIFIER_PREFIX:string = "q_";
            private static kOPERATION:string = "shift";

            /**
             * 取得預設的管理元件
             */
            public static get Default(): Queue {
                return Queue.Fetch(Container.kDEFAULT_IDENTIFIER) || Queue.Create(Container.kDEFAULT_IDENTIFIER);
            }
            /**
             * 創建新管理元件
             * @param identifier 管理元件識別名稱
             * @param concurrentRequests 最大同時請求數量
             */
            public static Create(identifier:string, concurrentRequests:number=Container.kDEFAULT_CONCURRENT_REQUESTS): Queue {
                return Container.Build<Queue>(Queue as any, Queue.kIDENTIFIER_PREFIX + identifier, concurrentRequests);
            }
            /**
             * 取得指定識別名稱的管理元件
             * @param identifier 管理元件識別名稱
             */
            public static Fetch(identifier:string): Queue {
                return Container.Use<Queue>(Queue.kIDENTIFIER_PREFIX + identifier);
            }

            protected constructor(identifier:string, concurrentRequests:number) {
                super(identifier, concurrentRequests, Queue.kOPERATION);
            }
        }

        /**
         * 採後進先出模式的請求管理元件
         */
        export class Stack extends Container {
            private static kIDENTIFIER_PREFIX:string = "s_";
            private static kOPERATION:string = "pop";

            /**
             * 取得預設的管理元件
             */
            public static get Default(): Stack {
                return Stack.Fetch(Container.kDEFAULT_IDENTIFIER) || Stack.Create(Container.kDEFAULT_IDENTIFIER);
            }
            /**
             * 創建新管理元件
             * @param identifier 管理元件識別名稱
             * @param concurrentRequests 最大同時請求數量
             */
            public static Create(identifier:string, concurrentRequests:number=Container.kDEFAULT_CONCURRENT_REQUESTS): Stack {
                return Container.Build<Stack>(Stack as any, Stack.kIDENTIFIER_PREFIX + identifier, concurrentRequests);
            }
            /**
             * 取得指定識別名稱的管理元件
             * @param identifier 管理元件識別名稱
             */
            public static Fetch(identifier:string): Stack {
                return Container.Use<Stack>(Stack.kIDENTIFIER_PREFIX + identifier);
            }

            protected constructor(identifier:string, concurrentRequests:number) {
                super(identifier, concurrentRequests, Stack.kOPERATION);
            }
        }
    }
}

export namespace Http {
    /**
     * 任務資訊
     */
    export interface ITaskInfo extends Omit<TaskLike<ITask>, "OnStart"|"OnProgress"|"OnResponse"|"OnRawResponse"|"OnFail"|"Retry"|"Timeout"|"ResponseType"|"Body"|"Resume">{}

    /**
     * 請求任務
     */
    export interface ITask extends Omit<TaskLike<ITask>, "Urls"|"Append"|"Body">{}

    /**
     * 管理型請求任務
     */
    export interface IManagedTask extends Omit<TaskLike<IManagedTask>, "Urls"|"Append"|"Resume"> {}

    /**
     * Http Get 請求
     * @param url 請求網址
     */
    export function Get(url:string): ITask {
        return Task.Create(Method.GET, url);
    }

    /**
     * Http Post 請求
     * @param url 請求網址
     * @param contentType body 類型，預設為表單
     */
    export function Post(url:string, contentType:Http.ContentType=Http.ContentType.FORM): ITask {
        return Task.Create(Method.POST, url, contentType);
    }

    /**
     * Http Get 請求，回應的內容為 JSON
     * @param url 請求網址
     */
    export function JsonGet(url:string): ITask {
        return Http.Get(url).ResponseType(Http.ResponseType.JSON);
    }

    /**
     * Http Post 請求，回應的內容為 JSON
     * @param url 請求網址
     * @param contentType body 類型，預設為表單
     */
    export function JsonPost(url:string, contentType:Http.ContentType=Http.ContentType.FORM): ITask {
        return Http.Post(url, contentType).ResponseType(Http.ResponseType.JSON);
    }
}