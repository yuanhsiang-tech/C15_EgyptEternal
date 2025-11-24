import { EventDispatcher } from "../../Stark/Utility/EventDispatcher"
import { EventDefine } from "../Define/EventDefine";

export namespace SwipeGesture {
    export enum Direction {
        LEFT_TO_RIGHT = 0,  // 左往右
        RIGHT_TO_LEFT = 1,  // 右往左
        TOP_TO_BOTTOM = 2,  // 上往下
        BOTTOM_TO_TOP = 3,  // 下往上
    }
}

window['SwipeGesture'] = (direction:SwipeGesture.Direction)=>EventDispatcher.Shared.Dispatch(EventDefine.System.TWO_FINGERS_SWIPE, direction);