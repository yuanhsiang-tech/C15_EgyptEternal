import { game, log } from 'cc';
import { DEBUG } from 'cc/env';
import FiniteState from '../FiniteState';
import { IStateHandler } from './IStateHandler';

export class StateManager<T extends number = number> extends FiniteState<T> {
    //----------------------------------------------------------------
    /**
     * 無效的狀態代號
     */
    public static readonly INVALID_STATE: number = -0xff;

    //----------------------------------------------------------------

    private m_debugKey: string = null;
    private m_handlerMap: { [ state: number ]: IStateHandler; } = {};

    /**
     * 取得上一個狀態
     * @deprecated 改使用 Prev
     */
    public get Previous (): T {
       return this.Prev;
    }

    /**
     * 自前次階段轉換後至目前為止所經過的時間(單位：毫秒)
     * @deprecated 改使用 Elapsed()
     */
    public get ElapsedTime(): number {
        return this.Elapsed();
    }
 
    //----------------------------------------------------------------
    /**
     * 建構子
     * @param initState 起始狀態
     */
    constructor (initState: number = 0) {
        super(initState as T);
        this.Init(initState as T);
    }

    //----------------------------------------------------------------
    /**
     * 初始化
     * @param initialState 起始狀態
     * @param timeoutTime 逾時時間(毫秒)，0 表示不會逾時
     * @param handlerMap 狀態處理器 Map
     */
    public Init(initialState: T, timeoutTime: number = 0, handlerMap?: { [ state: number ]: IStateHandler; }): this {
        this.SetHandler(handlerMap);
        this.Transit(initialState, timeoutTime);
        return this;
    }

    //----------------------------------------------------------------
    /**
     * 指定下一個轉換的階段，可額外指定進入該階段後若多少時間內未切換階段被認定為逾時
     * @param newState 要轉入的階段
     * @param timeout 逾時時間(毫秒)，0 表示不會逾時
     */
    public NextState(toState: number, timeoutTime: number = 0): this {
        return this.Transit(toState as T, timeoutTime)
    }

    //----------------------------------------------------------------
    /**
     * 設定狀態處理器
     * @param state 狀態代號
     * @param handler 狀態處理器
     */
    public SetHandler(state: T, handler: IStateHandler): this;
 
    /**
     * 批次設定狀態處理器
     * @param handlerMap 狀態與處理器 Map
     */
    public SetHandler(handlerMap: { [ state: number ]: IStateHandler; }): this;

    // [實作多載]
    public SetHandler(stateOrHandlerMap: T | { [ state: number ]: IStateHandler; }, handler?: IStateHandler): this {
        // [設定狀態處理器]
        if (typeof stateOrHandlerMap == "number" && !isNaN( stateOrHandlerMap ) ) {
            const state = stateOrHandlerMap;
            if (handler) {
                this.m_handlerMap[state] = handler;
            } else if (this.m_handlerMap[state]) {
                delete this.m_handlerMap[state];
            }
        }
        // [批次設定狀態處理器]
        else if (stateOrHandlerMap && typeof stateOrHandlerMap == "object") {
            const handlerMap = stateOrHandlerMap;
            for (const eachState in handlerMap ) {
                const state = parseInt(eachState);
                if (!isNaN(state) && handlerMap[state]) {
                    this.SetHandler(state as T, handlerMap[state]);
                }
            }
        }
    
        return this;
    }

    //----------------------------------------------------------------
    /**
     * 更新狀態
     */
    public override Tick(): T {
        const state:T = super.Tick();

        if (DEBUG && this.IsEntering && this.m_debugKey?.length > 0) {
            log(`[${ this.m_debugKey }] ${ this.Prev } -> ${ this.Current }`);
        }

        // [執行狀態處理器]
        if (this.m_handlerMap) {
            if (this.IsEntering) {
                this.m_handlerMap[this.Prev]?.OnLeave?.(this.Current);
                this.m_handlerMap[this.Current]?.OnEnter?.(this.Prev);
            }

            this.m_handlerMap[this.Current]?.OnProcess?.(game.deltaTime);
        }

        return state;
    }

    //----------------------------------------------------------------
    /**
     * 設定偵錯 Key，切換狀態時會輸出偵錯訊息
     */
    public SetDebugKey(debugKey: string): this {
        this.m_debugKey = debugKey;
        return this;
    }
 
    //----------------------------------------------------------------
}


