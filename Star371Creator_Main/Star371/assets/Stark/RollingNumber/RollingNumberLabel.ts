import { log } from "cc";
import { _decorator, Color, Component, CCInteger, Label, isValid} from 'cc';
import { RollingEvent, RollingNumber } from "./RollingNumber";
import { NumberUtils } from "db://assets/Stark/FuncUtils/NumberUtils";
const {ccclass, property, requireComponent} = _decorator;

export enum RollingLabelEvent {
    RollingNumber = "RollingLabelEvent.RollingNumber", // 數值滾動中
    RollingFinish = "RollingLabelEvent.RollingFinish"  // 滾動結束
}


@ccclass
@requireComponent(RollingNumber)
export class RollingNumberLabel extends Component {
    protected m_shouldStart:boolean = false;
    protected m_tmpCurrent:BigNumber|number;
    protected m_tmpTarget:BigNumber|number;
    protected m_oriColor: Color = Color.WHITE;
    /**
     * NumberGroup 數字位數上限
     */
    protected m_MaxCount:number = 19;
    set MaxCount(value:number){
        this.m_MaxCount=value
    }
    get MaxCount(){
        return this.m_MaxCount;
    }
    /**
     * floorCount: KMBT前面的整數位數(不含千分位、小數點、小數位)
     * KCount: 換算成單位K的最小整數位數(不含千分位、小數點、小數位)
     * color?: 縮寫變色處理
     * runInColor?: 指定色跑分
     */
    protected m_NumberOption: { floorCount?: number; KCount: number; color?:Color; runInColor?:Color} =  null;
    get NumberGroupOption(){ return this.m_NumberOption; }
    set NumberGroupOption( option:{floorCount?:number, KCount:number, color?:Color, runInColor?:Color} ){ 
        this.m_NumberOption = option;
    }
    
    /**
     * NumberGroup m_KMBTbool
     */
    protected m_KMBTbool:boolean=false;
    set KMBTBool(value:boolean){
        this.m_KMBTbool=value;
    }
    get KMBTBool(){
        return this.m_KMBTbool;
    }

    /**
     * 數字格式化函式
     */
    protected m_formatter: (value: number|BigNumber) => string = null;
    set Formatter(formatFunction: (value: number|BigNumber) => string){
        this.m_formatter = formatFunction;
        this.NumberUpdate( this.Number );
    }

    protected m_tag:number = 0;

    // 數字滾動元件
    protected m_RollingNumber:RollingNumber = null;

    @property({
        type:CCInteger,
        visible:false
    })
    set Tag(value:number) {
        this.m_tag = value;
    }
    get Tag() {
        return this.m_tag;
    }

    @property({
        type:Label,
        tooltip:"數字顯示元件",
        displayName:"Number Label"
    })
    protected m_numberLabel:Label = null;
    get Label(): Label {
        return this.m_numberLabel;
    }
    set Label(value:Label) {
        this.m_numberLabel = value;
        if(isValid(this.m_numberLabel, true) && isValid(this.m_numberLabel.node,true)){
            this.m_oriColor = this.m_numberLabel.color;
        }
    }

    set Number(value:any/*number|BigNumber*/) {
        this.ComponentsInit();
        let bigValue = value;
        if (value instanceof BigNumber == false) {
            bigValue = new BigNumber(value);
        }
        this.m_RollingNumber.Current = bigValue;
        this.RollNumberTo(this.m_RollingNumber.Current, false);
    }
    get Number(): any /*number|BigNumber*/ {
        let value:number|BigNumber = 0;
        if (this.m_RollingNumber) {
            value = this.m_RollingNumber.Current;
        }
        return value;
    }

    @property({
        type:CCInteger,
        range:[1, 999999999999999999],
        tooltip:"數值變動所需時間(單位：毫秒)",
        visible: false
    })
    get Duration(): number {
        this.ComponentsInit();
        return this.m_RollingNumber.Duration;
    }
    set Duration(value:number) {
        this.ComponentsInit();
        this.m_RollingNumber.Duration = value;
    }

    protected ComponentsInit() {
        if (this.m_RollingNumber == null) {
            this.m_RollingNumber = this.getComponent(RollingNumber);
            this.m_RollingNumber.Current = new BigNumber(0);
            this.m_RollingNumber.node.on(RollingEvent.NumberRolling, this.OnRollingNumber, this);
            this.m_RollingNumber.node.on(RollingEvent.RollingFinish, this.OnRollingNumberFinish, this);
            if(isValid(this.m_numberLabel, true) && isValid(this.m_numberLabel.node,true)){
                this.m_oriColor = this.m_numberLabel.color;
            }
        }
    }

    public __preload() {
        this.ComponentsInit();
    }

    // 停止跑動
    public Stop() {
        this.m_shouldStart = false;
        this.m_tmpCurrent = null;
        this.m_tmpTarget = null;

        if (this.m_RollingNumber) {
            this.m_RollingNumber.Stop();
        }
    }

    public RollNumber(current:number|BigNumber, target:number|BigNumber, animation:boolean = true): void {
        this.ComponentsInit();
        this.Stop();

        current = new BigNumber(current)
        target = new BigNumber(target)

        if (animation == true) {
            this.m_shouldStart = true;
            this.m_tmpCurrent = current;
            this.m_tmpTarget = target;
            this.NumberUpdate(current);
        } else {
            this.OnRollingNumber(this.m_RollingNumber, this.m_RollingNumber.Current, target);
            this.m_RollingNumber.Current = target;
            this.OnRollingNumber(this.m_RollingNumber, this.m_RollingNumber.Current, target);
            this.OnRollingNumberFinish(this.m_RollingNumber, target);
        }
    }

    public RollNumberTo(target:number|BigNumber, animation:boolean = true): void {
        this.ComponentsInit();
        this.Stop();

        target = new BigNumber(target)

        if (animation == true) {
            this.m_shouldStart = true;
            this.m_tmpCurrent = null;
            this.m_tmpTarget = target;
        } else {
            this.OnRollingNumber(this.m_RollingNumber, this.m_RollingNumber.Current, target);
            this.m_RollingNumber.Current = target;
            this.OnRollingNumber(this.m_RollingNumber, this.m_RollingNumber.Current, target);
            this.OnRollingNumberFinish(this.m_RollingNumber, target);
        }
    }

    public lateUpdate() {
        if (this.m_shouldStart) {
            if (this.m_tmpCurrent != null) {
                this.m_RollingNumber.RollNumber(this.m_tmpCurrent, this.m_tmpTarget);
            } else {
                this.m_RollingNumber.RollNumberTo(this.m_tmpTarget as number);
            }
            this.m_shouldStart = false;
            this.m_tmpCurrent = null;
            this.m_tmpTarget = null;
        }
    }

    public SetVisible(visible:boolean): void {
        this.node.active = visible;
        if (this.m_numberLabel) {
            this.m_numberLabel.node.active = visible;
        }
    }

    public IsVisible(): boolean {
        return this.node.active;
    }

    protected OnRollingNumber(RollingNumber:RollingNumber, current:number|BigNumber, target:number|BigNumber): void {
        this.NumberUpdate(current);
        this.node.emit(RollingLabelEvent.RollingNumber, this, current, target);
    }

    protected OnRollingNumberFinish(RollingNumber:RollingNumber, target:number|BigNumber) {
        this.node.emit(RollingLabelEvent.RollingFinish, this, target);
    }


    public SetFormatterAndValue( formatterFn:(value: number|BigNumber) => string, value:number|BigNumber){
        this.m_formatter = formatterFn
        this.NumberUpdate(value);
    }

    protected NumberUpdate(value:number|BigNumber): void {
        if(this.m_numberLabel) {
            if ( GamesChief?.SlotGame?.IsUsingKMBTv3  ){
                this.m_numberLabel.string = NumberUtils.FormatNumberKMBTv3( value, this.MaxCount )
            } 
            else if (typeof this.m_formatter === "function") {
                // [數字格式化函式]
                this.m_numberLabel.string = this.m_formatter( value ) ?? '';
            }
            else if ( isValid(this.m_NumberOption) )
            {
                
                let floorCount = isValid(this.m_NumberOption.floorCount)?this.m_NumberOption.floorCount : null;
                if ( isValid(floorCount))
                    this.m_numberLabel.string = this.NumberKMBT(value, this.m_NumberOption.KCount, floorCount);
                else
                    this.m_numberLabel.string = this.NumberKMBT(value, this.m_NumberOption.KCount);
                
                let color  = isValid(this.m_NumberOption.color)?this.m_NumberOption.color : null;
                let runInColor = isValid(this.m_NumberOption.runInColor)? this.m_NumberOption.runInColor : null;
                if ( runInColor == null ){
                    if (this.HasKMBT() && isValid(color) )
                        this.m_numberLabel.color = color;
                    else
                        this.m_numberLabel.color = this.m_oriColor;
                }
                else {
                    this.m_numberLabel.color = runInColor;
                }

            }
            else {
                let valueStr:string = value.toString()
                this.m_numberLabel.string = NumberUtils.Format(valueStr, this.m_MaxCount);
            }
        }
    }

    public IsRolling(): boolean {
        return this.m_RollingNumber.IsRolling();
    }

    public HasKMBT():boolean {
        let find = false;
        let obj = this.m_numberLabel.string.match(/K|M|B|T/);
        if ( isValid(obj) )
            find = obj.index > 0;
        return find;
    }

    private NumberKMBT(value : number | BigNumber | string, kCount?, kFloor?) : string { 
        return NumberUtils.Format(value, kCount);
    }

}
