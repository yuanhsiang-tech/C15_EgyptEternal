import { _decorator, Component, Node } from 'cc';
import { EgyptEternalBind } from './EgyptEternalBind';
const { ccclass, property } = _decorator;


enum WheelState {
    IDLE,
    GOTO_HIGH_SPEED,
    HIGH_SPEED,
    GOTO_MID_SPEED,
    MID_SPEED,
    PRE_STOP,
    STOPPING,
    LOW_SPEED,
    ROLL,
    NONE,
}
const WheelSetting = {
    HighSpeed: 6,                 // 高轉速（度 / frame）
    MidSpeed: 3,                  // 中轉速（度 / frame）
    PreStopSpeed: 1,              // 準備停止轉速（度 / frame）
    StoppingSpeed: 0.2,           // 最低停止前的轉速（度 / frame）
    LowSpeed: 0.05,               // 無限自轉用低速（度 / frame）

    GotoHighSpeedTime: 0.8,       // 切到高轉速需要時間（秒）
    KeepHighSpeedTime: 0.8,       // 高轉速維持時間（秒）

    GotoMidSpeedTime: 0.7,        // 切換到中轉速所需時間（秒）
    KeepMidSpeedTime: 1,          // 中速維持時間（秒）

    DecreaseSpeedTime: 2,         // 減速到停止所需最短時間（秒）
    DecreaseVar: 0.5,             // 減速變化量，越大低速維持越久

    PreStopAngleThresholdMin: 200, // PRE_STOP 狀態時：與目標角最小距離
    PreStopAngleThresholdMax: 250, // PRE_STOP 狀態時：與目標角最大距離

    StoppingSpeedVar: 0.2         // PreStopSpeed → StoppingSpeed 變化量
}
@ccclass('EgyptEternalMGWheel')
export class EgyptEternalMGWheel extends Component {

    @property({ type: Node, tooltip: "轉輪盤面" })
    private m_wheelNode: Node = null;

    /** 累計時間 */
    private m_wheelTime: number = 0;
    /** 狀態 */
    private m_wheelState: WheelState = WheelState.IDLE;

    private m_bind: EgyptEternalBind = null;


    public InitBind(bind: EgyptEternalBind) {
        this.m_bind = bind;
        this.m_wheelTime = 0;
        this.m_wheelState = WheelState.IDLE;
    }

    //=========================================================================================================
    public MainProcess(dt: number) {
        let ang = this.m_wheelNode.angle;
        let half_PI = 0.5 * Math.PI;
        let ccAngle = 0
        ang = ang % 360
        this.m_wheelTime += dt;

        switch (this.m_wheelState) {
            case WheelState.IDLE:
                ang -= WheelSetting.LowSpeed;
                this.m_wheelNode.angle = ang;
                break;
        }
    }
}

