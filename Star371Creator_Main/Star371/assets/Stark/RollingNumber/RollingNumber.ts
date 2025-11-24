import * as cc from "cc"

// 數值相關事件
export enum RollingEvent {
    NumberRolling = "RollingEvent.NumberRolling", // 數值滾動中
    RollingFinish = "RollingEvent.RollingFinish"  // 滾動結束
}

// 數值滾動類型
export enum RollingType {
    INTEGER,    // 去除小數後的整數部分數值
    POINT,      // 包含整數及小數的數值
}

const { ccclass, property } = cc._decorator;

@ccclass
export class RollingNumber extends cc.Component {
	protected m_tag:number = 0;
    protected m_emitEventOnSet:boolean = true;

    // 數值滾動類型
    protected m_rollingType:RollingType = RollingType.INTEGER;

    // 目標數值與目前數值的差距
    protected m_deltaValue: BigNumber = null;
    
    // 目標數值
    protected m_targetValue: BigNumber = null;

    // 目前數值
    protected m_currentValue: BigNumber = null;

	@property({
        type:cc.CCInteger,
        range:[1, 999999999999999999],
        tooltip:"數值變動所需時間(單位：毫秒)",
        displayName:"Duration"
        //visible: false
    })
    protected m_duration:number = 5000; 

    @property({
        type:cc.CCInteger,
        range:[0, 999999999999999999],
        tooltip:"數值每次更新所需時間(單位：毫秒)",
        displayName:"RefreshTime"
        //visible: false
    })
    protected m_refreshTime: number = 0; 

    @property({
        type:cc.Enum(RollingType),
        tooltip:"滾動類型",
        visible: false
    })
    get Type(): RollingType {
        return this.m_rollingType;
    }
    set Type(value:RollingType) {
        this.m_rollingType = value;
    }

    get Current(): BigNumber {
        let outCurrent = this.m_currentValue;
        if (this.m_rollingType == RollingType.INTEGER) {
            outCurrent = outCurrent.decimalPlaces(0, BigNumber.ROUND_DOWN);
        }
        return outCurrent;
    }
    set Current(value: BigNumber) {
        this.m_currentValue = value;
    }

    @property({
        type:cc.CCFloat,
        tooltip:"目標數值",
        visible: false
    })
    get Target(): number | BigNumber {
        return this.m_targetValue;
    }
    
    get Duration(): number {
        return this.m_duration;
    }
    set Duration(value:number) {
        this.m_duration = value < 0 ? 1 : value;
    }

    @property({
        type:cc.CCInteger,
        visible:false
    })
    set Tag(value:number) {
        this.m_tag = value;
    }
    get Tag() {
        return this.m_tag;
    }

    @property({
        type:cc.CCBoolean,
        visible:false
    })
    set EmitEventOnSet(value:boolean) {
        this.m_emitEventOnSet = value;
    }
    get EmitEventOnSet(): boolean {
        return this.m_emitEventOnSet;
    }

    protected __preload(): void {
        this.m_currentValue = new BigNumber(0)
    }

	// 停止跑動
    public Stop() {
        this.Clear();
    }

	// 數值開始滾動至目標值
    // @from        起始數值
    // @to          目標數值
    // @continual   目前有數值正在滾動的情況下，是否強制修改目前的值成起始值，或是接續目前的值跑至目標值
    // @duration    客製的滾動時間(單位：毫秒)，若沒帶入則會使用物件內設定的滾動時間
    public RollNumber(from:number | BigNumber, to:number | BigNumber, duration?:number, continual:boolean=false): boolean {
        let shouldStart = true;

        to = new BigNumber(to)
        from = new BigNumber(from)

        this.unschedule(this.RollingNumber);

        let rollingDuration = this.m_duration;
        if (typeof(duration) == "number" && duration > 0) {
            rollingDuration = duration;
        }
        rollingDuration = rollingDuration <= 0 ? 1 : rollingDuration;

        this.m_currentValue = from;
        
        this.m_targetValue = to;
        const time = rollingDuration * 0.001
        this.m_deltaValue = this.m_targetValue.minus(this.m_currentValue).dividedBy(time)

        
        shouldStart = !(this.m_deltaValue.eq(0));
        
        if (!shouldStart) {
            this.EmitEvent(true);
        } else {
            if (this.m_emitEventOnSet) {
                this.EmitEvent();
            }
            
            this.schedule(this.RollingNumber, (this.m_refreshTime / 1000) , cc.macro.REPEAT_FOREVER);
        }

        return shouldStart;
    }

	// 數值開始滾動至目標值(簡化版的 RollNumber 方法，直接從目前數值滾至目標數值)
    // @to          目標數值
    // @duration    客製的滾動時間(單位：毫秒)，若沒帶入則會使用物件內設定的滾動時間
    public RollNumberTo(to:number, duration?:number): boolean {
        return this.RollNumber(this.m_currentValue, to, duration, true);
    }

    // 回傳目前是否滾動中
    public IsRolling(): boolean {
        return this.m_deltaValue ? !this.m_deltaValue.eq(0) : false;
    }

    // 清除事件
    public onDestroy() {
        this.Clear();
    }

    // 清除所有相關數據
    private Clear() {
        this.unschedule(this.RollingNumber);
        this.m_deltaValue = new BigNumber(0);
    }

    // 主要數值滾動處理
    private RollingNumber(dt:number) {
        if (this.m_currentValue.eq(this.m_targetValue)) {
            return
        }

        let frameDeltaValue: BigNumber = this.m_deltaValue.multipliedBy(dt);
        this.m_currentValue =  this.m_currentValue.plus(frameDeltaValue);

        let isFinished: boolean = (frameDeltaValue.gt(0) && this.m_currentValue.gte(this.m_targetValue) || (frameDeltaValue.lt(0) && this.m_currentValue.lte(this.m_targetValue)));

        if (isFinished) {
            this.m_currentValue = this.m_targetValue;
        }
        this.EmitEvent();
        if (isFinished) {
            this.Clear();
        }
    }

    // 數值滾動通知
    protected onRollingNumber(numberRolling:RollingNumber, current:number | BigNumber, target:number | BigNumber) {
    }

    // 滾動結束
    protected onRollingFinish(numberRolling:RollingNumber, target:number | BigNumber) {
    }

    // 發出事件
    private EmitEvent(skipRollingEvent:boolean=false) {
        let isFinish = this.m_currentValue == this.m_targetValue;

        if (skipRollingEvent == false) {
            if (typeof(this.onRollingNumber) == "function") {
                this.onRollingNumber(this, this.Current, this.m_targetValue);
            }
            this.node.emit(RollingEvent.NumberRolling, this, this.Current, this.m_targetValue);
        }

        if (isFinish) {
            if (typeof(this.onRollingFinish) == "function") {
                this.onRollingFinish(this, this.m_targetValue);
            }
            this.node.emit(RollingEvent.RollingFinish, this, this.m_targetValue);
        }
    }
}