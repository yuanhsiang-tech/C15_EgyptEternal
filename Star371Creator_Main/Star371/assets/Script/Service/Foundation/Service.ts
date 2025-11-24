import { warn } from "cc";
import { Command as CMD } from "../../Net/Command/Command";
import { MicroService, MicroServiceProtocol, FriendAttr } from "../../Net/Service/MicroService";

// 等待逾時時間(單位：毫秒)
const TIMEOUT_TIME:number = 5 * 1000;

type ClassSingleton<U> = { name: string, s_instance: U; };
export function ServiceInstance<T extends Function>(cls:T) {
    Object.defineProperty(cls, "Instance", {
        get: function(): T {
            return (cls as unknown as ClassSingleton<T>).s_instance;
        }
    });
}

export abstract class Service<CommandType extends CMD.Command> extends MicroService<CommandType> {
    private m_classSingleton: ClassSingleton<Service<CommandType>>;

    @FriendAttr
    protected get IsAutoManaged(): boolean {
        return true;
    }
    
    /**
     * 第一次連線建立時觸發，用於一次性的初始化
     */
    protected Start() {
    }
    
    /**
     * 每次連線建立時觸發，不管是第一次建立或是斷線重連建立，用於重複初始化
     * 備註：可利用變數 this.m_isReconnect 來判斷是否為斷線重連
     */
    protected OnEnable() {
    }
    
    /**
     * 連線中斷時觸發
     * 備註：不管後續是否會斷線重連，只要連線關閉就會觸發
     */
    protected OnDisable() {
    }
    
    /**
    * 確定銷毀時觸發
    */
    protected OnDestroy() {
        if (this.m_classSingleton) {
            this.m_classSingleton.s_instance = null;
            this.m_classSingleton = null;
        }
    }
    
    protected override Destroy() {
        super.Destroy();
        this.OnDestroy();
    }
    
    protected override OnConnectionOpen(isReconnect: boolean, event: Event) {
        super.OnConnectionOpen(isReconnect, event);
        if (!isReconnect) {
            this.Start();
        }
        this.OnEnable();
    }
    
    protected override OnConnectionClose(event: CloseEvent) {
        super.OnConnectionClose( event );
        this.OnDisable();
    }

    /**
     * 逾時時間(單位：毫秒)
     */
    protected TimeoutTime(): number {
        return TIMEOUT_TIME;
    }

    /**
     * 收到轉發的訊息
     * @param message 來自其他服務送來的訊息
     */
    private OnRedirectCommand(command: CMD.Command) {
        if (this.UseWebSocket) {
            // [強連線的情形下卻收到轉發 Command]
            warn(`[${this.constructor.name}(${this.Type})] OnRedirectCommand(${command.Type})`);
        }
    }
    
    protected constructor(
        cmdBuilder:(type: CMD.IType<CommandType>, content?: CMD.IContent<CommandType>)=>CommandType, 
        cmdParser:(data: CMD.ISerialize<CommandType>, reqCommand?: CommandType)=>CommandType, 
        type: number, 
        delegate: Partial<MicroServiceProtocol>) 
    {
        super(cmdBuilder, cmdParser, type, delegate);
        this['_onRedirectCommand'] = this.OnRedirectCommand;
        this.m_classSingleton = this.constructor as unknown as ClassSingleton<Service<CommandType>>;
        this.m_classSingleton.s_instance = this;
    }
}