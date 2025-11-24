import { _decorator, Component, Tween } from "cc";
const {ccclass, menu} = _decorator;

@ccclass
export default class SafetyTweener extends Component {

    //--------------------------------------------------------------------------------------------

    protected m_tweenMap:Tween<any>[] = [];
    protected m_callback:Function[] = [];

    //--------------------------------------------------------------------------------------------
    onDestroy () {
        for (let key in this.m_tweenMap) {
            this.StopTween( key );
        }
    }

    //--------------------------------------------------------------------------------------------
    /** 播放 Tween */
    public PlayTween (key:string|number, tween:Tween<any>, callback?:Function) {
        this.m_callback[ key ] = callback;
        this.m_tweenMap[ key ] = tween.call(() => {
            delete this.m_tweenMap[ key ];
            this.ClearCallback(key, true);
        }).start();
    }

    //--------------------------------------------------------------------------------------------
    /** 停止 Tween */
    public StopTween (key:string|number, executeCallback:boolean=false) {
        let tween = this.m_tweenMap[ key ];
        (tween instanceof Tween) && tween.stop();
        delete this.m_tweenMap[ key ];
        this.ClearCallback(key, executeCallback);
    }

    //--------------------------------------------------------------------------------------------
    /** 清除 Callback
     * @param execute 清除並執行
     */
    protected ClearCallback (key:string|number, execute:boolean=true):Function {
        let cb = this.m_callback[ key ];
        delete this.m_callback[ key ];
        execute && typeof cb == 'function' && cb();
        return cb;
    }
    //--------------------------------------------------------------------------------------------
}