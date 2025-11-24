import { game } from "cc";

export default class FiniteState<T extends number = number> {
    private m_current: T;
    private m_next: T;
    private m_prev: T;
    private m_transitTime: number;
    private m_toTransit: boolean;
    private m_entering: boolean;
    private m_timeout: number;
    private m_isTimeout: boolean;
    private m_forced: boolean;

    /**
     * 目前所在階段
     */
    public get Current(): T {
        return this.m_current;
    }

    /**
     * 接下來要進入的階段
     * 注意：如果是 FiniteState.INVALID_STATE 表示沒有下一個階段
     */
    public get Next(): T {
        return this.m_next;
    }

    /**
     * 前一個所在階段
     * 注意：如果是 FiniteState.INVALID_STATE 表示沒有前一個階段
     */
    public get Prev(): T {
        return this.m_prev;
    }

    /**
     * 是否階段停留逾時
     */
    public get IsTimeout(): boolean {
        return this.m_isTimeout;
    }

    /**
     * 是否為首次進入此階段
     */
    public get IsEntering(): boolean {
        return this.m_entering;
    }

    /**
     * 指定初始階段，可額外指定進入該階段後若多少時間內未切換階段被認定為逾時
     * @param init 初始階段
     * @param timeout 逾時時間(單位：毫秒)，0 表示不會逾時
     */
    constructor(init:T, timeout:number=0) {
        this.m_current = null;
        this.m_next = null;
        this.m_prev = null;
        this.m_transitTime = 0;
        this.m_toTransit = true;
        this.m_entering = false;
        this.m_timeout = 0;
        this.m_isTimeout = false;
        this.Transit(init, timeout);
    }

    /**
     * Tick
     */
    public Tick(): T {
        if (!this.m_toTransit) {
            this.m_entering = false;
            if (this.m_timeout > 0 && this.m_isTimeout == false) {
                this.m_transitTime += game.deltaTime;
                if (this.m_transitTime >= this.m_timeout) {
                    this.m_isTimeout = true;
                }
            }
        } else {
            this.m_prev = this.m_current;
            this.m_current = this.m_next;
            this.m_next = null;
            this.m_transitTime = 0;
            this.m_toTransit = false;
            this.m_entering = true;
            this.m_isTimeout = false;
            this.m_forced = false;
        }
        
        return this.m_current;
    }

    /**
     * 指定下一個轉換的階段，可額外指定進入該階段後若多少時間內未切換階段被認定為逾時
     * @param newState 要轉入的階段
     * @param timeout 逾時時間(單位：毫秒)，0 表示不會逾時
     */
    public Transit(newState:T, timeout:number=0): this {
        if (!this.m_forced) {
            this.m_next = newState;
            this.m_toTransit = true;
            this.m_timeout = timeout / 1000.0;
        }
        return this;
    }

    /**
     * 自前次階段轉換後至目前為止所經過的時間(單位：毫秒)
     */
    public Elapsed(): number {
        return this.m_transitTime * 1000;
    }

    /**
     * 強制階段轉換
     * @param newState 要轉入的階段
     */
    public ForceTransit(newState: T): this {
        this.m_next = newState
        this.m_toTransit = true
        this.m_forced = true
        return this;
    }
}
