import { _decorator, Component, Node, log, isValid } from 'cc'
import FiniteState from '../../Stark/Utility/FiniteState'
const { ccclass } = _decorator

function getNowTime(): number {
    return Date.now() / 1000
}

@ccclass('StepUpdateLayer')
export class StepUpdateLayer extends Component {
    // 成員變數宣告
    public m_uiInited: boolean = false
    public m_uiInitState: any = {}
    public m_uiInitStateMap: any = {}
    public m_curMaxState: number = 0
    public m_uiInitHandler: any = {}
    public m_uiStateDescription: any = {}
    public m_uiStateTime: any = {}
    public m_uiFiniteState: any
    public m_uiErrorMsg: any
    public m___StepUpdateLayer__StartTime__: number = 0
    public m___StepUpdateLayer__NowTime__: number = 0
    public m___StepUpdateLayer__errorListener__: any

    public SetUp(...args: any[]): StepUpdateLayer {
        const node = new Node()
        const extendedNode = node.addComponent(StepUpdateLayer)
        extendedNode.__StepUpdateLayer__uiCtor__(...args)
        return extendedNode
    }

    public __StepUpdateLayer__uiCtor__(...args: any[]): void {
        this.m_uiInited = false

        this.m_uiInitState = {}
        this.m_uiInitStateMap = {}
        this.m_curMaxState = 0
        this.m_uiInitHandler = {}
        this.m_uiStateDescription = {}
        this.m_uiStateTime = {}

        this.m_uiFiniteState = new FiniteState(1);

        // ============================= 插入初始化分階段處理 ===========================
        // 此處時做理念：
        // 盡量讓Client在初始化資源時減少卡頓與不連貫的感覺，所以使用分階段的處理模式
        // 每一個處理階段將在Update時呼叫，意思是，不管你塞入多少工作內容，每個階段至少需要 1/60秒 ( 1 frame )
        // 最好的情況為每個階段均只需要一個Frame為設計理念
        // 每個階段做的事情如果有等待Server回應相關，那麼最好在中間塞入一些與Server相關資料完全無關之初始化
        // 或是有關也可以先建立，後補資料
        // Error為第-1階段，Start為第0階段開始

        this.InsertNewUiStep("Error",
            () => {
                this.__StepUpdateLayer__OnInitUIError__("ERROR STATE: " + String(this.m_uiErrorMsg), "ERROR STATE")
            }
        , "錯誤", true, -1)

        if (this.ctor) {
            this.ctor(...args)
        }

        // ====== 最後的步驟 ======
        // 這裡請放一些，需要完全做完初始化後才做的事情
        // 通常是一些玩家進場要看的表演
        this.InsertNewUiStep("Final", this.OnFinishUISteps.bind(this), "完成初始化事件")

        // ====== 最後的步驟2 ======
        // 上面的表演太滿了。
        // 某些事件可以早一點點設置沒關係的就放上面，其餘依舊放下面(有層級問題/表演楨事件問題)
        this.InsertNewUiStep("Final2", this.__StepUpdateLayer__OnFinishUISteps__.bind(this), "完成初始化事件", true)

        this.node.on(Node.EventType.NODE_DESTROYED, () => {
            this.__StepUpdateLayer__OnExit__()
            this.unschedule(this.__StepUpdateLayer__OnInitUiUpdate__)
        })

        this.m___StepUpdateLayer__StartTime__ = getNowTime()
        this.m___StepUpdateLayer__NowTime__ = getNowTime() - this.m___StepUpdateLayer__StartTime__
        this.schedule(this.__StepUpdateLayer__OnInitUiUpdate__.bind(this), 0)

        this.m_uiInited = false
        this.node.active = false
    }

    public start(): void {
        this.__StepUpdateLayer__OnEnter__()
    }

    public __StepUpdateLayer__OnEnter__(): void {
        this.m_uiStateTime[0] = {
            StartTime: 0,
            StateName: "Init",
        }

        // this.m___StepUpdateLayer__errorListener__ = AddCustomEventListener(
        //     [
        //         "AIO_EVENT_ON_LUA_ERROR",       // lua error
        //     ],
        //     (event: any) => {
        //         const name = event.getEventName()
        //         if (name === "AIO_EVENT_ON_LUA_ERROR") {
        //             if (!this.m_uiInited) {
        //                 const errorStateStr = this.m_uiStateDescription[this.m_uiInitStateMap[this.m_uiFiniteState.Current()]]
        //                 const errorMsg = event._usedata
        //                 this.__StepUpdateLayer__OnInitUIError__(errorStateStr, errorMsg)
        //             }
        //         }
        //     }
        // )

        this.OnEnter()
    }

    public OnEnter(): void {
        // 覆寫 OnEnter
    }

    public __StepUpdateLayer__OnExit__(): void {
        if (this.m___StepUpdateLayer__errorListener__) {
            // RemoveCustomEventListener(this.m___StepUpdateLayer__errorListener__)
        }
        this.OnExit()
    }

    public OnExit(): void {
        // 覆寫 OnExit
    }

    public ProcessToNextStep(): void {
        this.m_uiFiniteState.Transit(this.m_uiFiniteState.Current + 1)
    }

    public KeepLoopingThisStep(): void {
        this.m_uiFiniteState.Transit(this.m_uiFiniteState.Current)
    }

    public ChangeToErrorState(): void {
        this.m_uiFiniteState.Transit(this.m_uiInitState.Error)
    }

    // 加入新的初始化Function
    // @param name      用於區隔的名稱，主要用來對應Map使用 - string
    // @param handler   實際的執行Function
    // @param descript  顯示於 print/ShowDebugMsg 的名稱
    // @param noTransit 是否要自動的在執行完此事件後前往下一個階段
    // @param state     強制的設定為第幾階段(預設為每呼叫一次+1)
    public InsertNewUiStep(name: string, handler: Function, descript: string, noTransit?: boolean, state?: number): void {
        if (!state) {
            this.m_curMaxState = this.m_curMaxState + 1
            state = this.m_curMaxState
        }
        if (!noTransit) {
            const _handler = handler
            handler = () => {
                _handler()
                if (this.m_uiFiniteState.m_nextState !== this.m_uiInitState.Error) {
                    this.ProcessToNextStep()
                }
            }
        }
        this.m_uiInitState[name] = state
        this.m_uiInitStateMap[state] = name
        this.m_uiInitHandler[name] = handler
        this.m_uiStateDescription[name] = descript
    }

    public __StepUpdateLayer__OnInitUiUpdate__(dt: number): void {
        this.OnUpdate(dt)
        this.m___StepUpdateLayer__NowTime__ = getNowTime() - this.m___StepUpdateLayer__StartTime__
        if (!this.m_uiInited) {
            this.m_uiFiniteState.Tick()
            if (this.m_uiFiniteState.IsEntering()) {
                const stateName = this.m_uiInitStateMap[this.m_uiFiniteState.Current()]
                const percent = this.m_uiFiniteState.Current() * 100.0 / this.m_curMaxState
                this.OnLoadingPercent(percent)
                // console.log(`現在進行到 ${stateName}:${this.m_uiStateDescription[stateName]}, ${percent.toFixed(1)}%, 已耗時: ${this.m___StepUpdateLayer__NowTime__.toFixed(3)}秒`)
                this.m_uiInitHandler[stateName]()
                if (this.m_uiFiniteState.Current() !== -1) {
                    this.m_uiStateTime[this.m_uiFiniteState.Current() - 1].CostTime = this.m___StepUpdateLayer__NowTime__ - this.m_uiStateTime[this.m_uiFiniteState.Current() - 1].StartTime
                    this.m_uiStateTime[this.m_uiFiniteState.Current()] = {
                        StartTime: this.m___StepUpdateLayer__NowTime__,
                        StateName: stateName,
                    }
                }
            }
        } else {
            this.m_uiStateTime[this.m_uiFiniteState.Current()].CostTime = this.m___StepUpdateLayer__NowTime__ - this.m_uiStateTime[this.m_uiFiniteState.Current()].StartTime
            this.unschedule(this.__StepUpdateLayer__OnInitUiUpdate__)
            this.schedule(this.OnUpdate.bind(this), 0)
        }
    }

    public OnFinishUISteps(): void {
        // 覆寫這個 function 來實作結束Loading
        // 通常放一些最後收到的同步資訊用封包
    }

    public OnFinishUIStepsFinal(): void {
        // 覆寫這個 function 來實作真正的結束Loading，下一個frame就會進入正常遊玩流程
    }

    public __StepUpdateLayer__OnFinishUISteps__(): void {
        this.OnFinishUIStepsFinal()

        this.node.active = true
        this.m_uiInited = true
    }

    public OnLoadingPercent(percent: number): void {
        // 實作當loading達到某percent
    }

    public __StepUpdateLayer__OnInitUIError__(errorStateDescription: string, errorMsg: string): void {
        if (!this.OnInitUIError(errorStateDescription, errorMsg)) {
            this.unschedule(this.__StepUpdateLayer__OnInitUiUpdate__)
        }
    }

    // return true 時代表確實發生問題
    public OnInitUIError(errorStateDescription: string, errorMsg: string): boolean {
        // 實作當loading時發生錯誤
        return false
    }

    public OnUpdate(dt: number): void {
        // 實作每個Frame的事件，藉由 self.uiInited 來確認是否已完成
    }

    public ctor(...args: any[]): void {
        // 可覆寫的建構函數
    }
}
